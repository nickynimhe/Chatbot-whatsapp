const express = require('express')
const router = express.Router()
const pool = require('../database/db')
const multer = require('multer')
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')
const jwt = require('jsonwebtoken')

// ============================================
// CONFIGURACIÓN DE SUBIDA DE FOTOS DE PERFIL
// ============================================

const fotosDir = path.join(__dirname, '../../uploads/perfiles')
if (!fs.existsSync(fotosDir)) {
    fs.mkdirSync(fotosDir, { recursive: true })
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, fotosDir),
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, `temp_${uniqueSuffix}_${file.originalname}`)
    }
})

const upload = multer({ 
    storage: storage, 
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true)
        } else {
            cb(new Error('Formato no permitido. Solo imágenes'), false)
        }
    }
})

// Middleware para obtener ID del agente desde el token
const getAgenteIdFromToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        if (!authHeader) {
            return res.status(401).json({ error: 'Token no proporcionado' })
        }
        const token = authHeader.split(' ')[1]
        const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME'
        const decoded = jwt.verify(token, JWT_SECRET)
        req.agenteId = decoded.id
        console.log('✅ Token verificado, agente ID:', req.agenteId)
        next()
    } catch (error) {
        console.error('Error verificando token:', error)
        res.status(401).json({ error: 'Token inválido' })
    }
}

// ============================================
// FUNCIÓN PARA PROCESAR Y GUARDAR IMAGEN
// ============================================

async function procesarYGuardarImagen(filePath, agenteId, req) {
    const outputFilename = `perfil_${agenteId}.jpg`
    const outputPath = path.join(fotosDir, outputFilename)
    
    await sharp(filePath)
        .resize(200, 200, { fit: 'cover' })
        .jpeg({ quality: 80 })
        .toFile(outputPath)
    
    // Eliminar archivo temporal
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
    }
    
    const fotoUrl = `/uploads/perfiles/${outputFilename}`
    
    // Asegurar que la columna existe
    try {
        await pool.query(`ALTER TABLE agentes ADD COLUMN IF NOT EXISTS foto_perfil TEXT`)
    } catch (err) {
        console.log('Columna foto_perfil ya existe o error:', err.message)
    }
    
    // Actualizar base de datos
    await pool.query(
        `UPDATE agentes SET foto_perfil = $1 WHERE id = $2`,
        [fotoUrl, agenteId]
    )
    
    return fotoUrl
}

// ============================================
// ENDPOINTS
// ============================================

// SUBIR foto de perfil (usando el token)
router.post('/foto-perfil', getAgenteIdFromToken, upload.single('foto'), async (req, res) => {
    console.log('=== [SUBIR FOTO] ===')
    console.log('Archivo recibido:', req.file ? 'SÍ' : 'NO')
    console.log('Agente ID:', req.agenteId)
    
    if (!req.file) {
        return res.status(400).json({ error: 'No se recibió el archivo. El campo debe llamarse "foto"' })
    }
    
    try {
        const fotoUrl = await procesarYGuardarImagen(req.file.path, req.agenteId, req)
        
        // Emitir evento WebSocket para actualizar en tiempo real
        const io = req.app.get('io')
        if (io) {
            console.log('📡 Emitiendo evento foto-perfil-actualizada para agente:', req.agenteId)
            io.emit('foto-perfil-actualizada', {
                agente_id: req.agenteId,
                foto_url: fotoUrl
            })
        }
        
        console.log('✅ Foto guardada:', fotoUrl)
        res.json({ 
            success: true, 
            url: fotoUrl,
            message: 'Foto de perfil actualizada correctamente'
        })
        
    } catch (error) {
        console.error('Error procesando imagen:', error)
        if (req.file?.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path)
        }
        res.status(500).json({ error: error.message })
    }
})

// ELIMINAR foto de perfil
router.delete('/foto-perfil', getAgenteIdFromToken, async (req, res) => {
    console.log('=== [ELIMINAR FOTO] ===')
    console.log('Agente ID:', req.agenteId)
    
    try {
        // Obtener la foto actual
        const result = await pool.query(`SELECT foto_perfil FROM agentes WHERE id = $1`, [req.agenteId])
        const fotoActual = result.rows[0]?.foto_perfil
        
        if (fotoActual) {
            // Eliminar archivo del sistema
            const fotoPath = path.join(__dirname, '../../', fotoActual)
            if (fs.existsSync(fotoPath)) {
                fs.unlinkSync(fotoPath)
                console.log('✅ Archivo eliminado:', fotoPath)
            }
            
            // Eliminar referencia en la base de datos
            await pool.query(`UPDATE agentes SET foto_perfil = NULL WHERE id = $1`, [req.agenteId])
            console.log('✅ Referencia eliminada de la base de datos')
        }
        
        // Emitir evento WebSocket para actualizar en tiempo real
        const io = req.app.get('io')
        if (io) {
            io.emit('foto-perfil-actualizada', {
                agente_id: req.agenteId,
                foto_url: null
            })
        }
        
        res.json({ 
            success: true, 
            message: 'Foto eliminada correctamente',
            url: null
        })
        
    } catch (error) {
        console.error('Error eliminando foto:', error)
        res.status(500).json({ error: error.message })
    }
})

// OBTENER foto del agente autenticado (usando token)
router.get('/foto-perfil', getAgenteIdFromToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT foto_perfil FROM agentes WHERE id = $1`,
            [req.agenteId]
        )
        res.json({ url: result.rows[0]?.foto_perfil || null })
    } catch (error) {
        console.error('Error obteniendo foto:', error)
        res.status(500).json({ error: error.message })
    }
})

// OBTENER foto de un agente por ID (sin token, público)
router.get('/:id/foto-perfil', async (req, res) => {
    try {
        const { id } = req.params
        const result = await pool.query(
            `SELECT foto_perfil FROM agentes WHERE id = $1`,
            [id]
        )
        res.json({ url: result.rows[0]?.foto_perfil || null })
    } catch (error) {
        console.error('Error obteniendo foto:', error)
        res.status(500).json({ error: error.message })
    }
})

module.exports = router
