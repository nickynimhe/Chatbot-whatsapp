const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const sharp = require('sharp')

const router = express.Router()

const dir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname) || ''
        const base = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        cb(null, base + ext)
    }
})

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const t = String(file.mimetype || '')
        const ok = t.startsWith('image/')
            || t.startsWith('video/')
            || t.startsWith('audio/')
            || t === 'application/pdf'
            || t.startsWith('text/')
            || t.includes('officedocument')
            || t.includes('msword')
            || t.includes('excel')
            || t.includes('powerpoint')
        cb(ok ? null : new Error('Tipo de archivo no permitido'), ok)
    }
})

function mapTipo(mimetype) {
    if (!mimetype) return 'archivo'
    if (mimetype.startsWith('image/')) return 'imagen'
    if (mimetype.startsWith('video/')) return 'video'
    if (mimetype.startsWith('audio/')) return 'audio'
    if (mimetype === 'application/pdf') return 'documento'
    if (mimetype.startsWith('text/')) return 'documento'
    if (mimetype.includes('officedocument') || mimetype.includes('msword') || mimetype.includes('excel') || mimetype.includes('powerpoint')) return 'documento'
    return 'archivo'
}

// Verificar ffmpeg
let ffmpegAvailable = false
let ffmpegPath = null

try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
    ffmpegPath = ffmpegInstaller.path
    ffmpegAvailable = true
    console.log('✅ ffmpeg detectado - thumbnails de video habilitados')
} catch (e) {
    console.warn('⚠️ ffmpeg no encontrado - thumbnails de video deshabilitados')
}

async function generateVideoThumbnail(videoPath) {
    if (!ffmpegAvailable || !ffmpegPath) return null
    try {
        const thumbnailPath = videoPath.replace(/\.[^/.]+$/, '_thumb.jpg')
        const { exec } = require('child_process')

        return new Promise((resolve) => {
            exec(`"${ffmpegPath}" -i "${videoPath}" -ss 00:00:01 -vframes 1 -vf "scale=320:-1" "${thumbnailPath}"`, (error) => {
                if (error) {
                    console.error('Error generando thumbnail:', error.message)
                    resolve(null)
                } else {
                    const thumbUrl = `/uploads/${path.basename(thumbnailPath)}`
                    resolve(thumbUrl)
                }
            })
        })
    } catch (e) {
        console.error('Error en thumbnail:', e.message)
        return null
    }
}

function getFullUrl(req, publicPath) {
    const baseUrl = process.env.PUBLIC_API_URL || `http://192.168.101.36:3000`
    return `${baseUrl.replace(/\/$/, '')}${publicPath}`
}

// ========================================
// SUBIR ARCHIVO DESDE EL BOT
// ========================================
router.post('/bot/upload', upload.single('archivo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'archivo requerido' })
        }

        let archivoFinal = req.file
        let tipo = mapTipo(req.file.mimetype)
        let thumbnail = null
        let mimetypeFinal = req.file.mimetype

        if (req.file.mimetype.startsWith('image/')) {
            try {
                const extIn = path.extname(req.file.filename) || ''
                const baseIn = path.basename(req.file.filename, extIn)
                let extOut = extIn
                let transformer = sharp(req.file.path)
                    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })

                if (req.file.mimetype === 'image/png') {
                    extOut = '.png'
                    mimetypeFinal = 'image/png'
                    transformer = transformer.png({ compressionLevel: 9 })
                } else if (req.file.mimetype === 'image/webp') {
                    extOut = '.webp'
                    mimetypeFinal = 'image/webp'
                    transformer = transformer.webp({ quality: 80 })
                } else {
                    extOut = '.jpg'
                    mimetypeFinal = 'image/jpeg'
                    transformer = transformer.jpeg({ quality: 80 })
                }

                const outputFilename = `bot-${baseIn}${extOut}`
                const outputPath = path.join(dir, outputFilename)
                
                await transformer.toFile(outputPath)
                
                const newSize = fs.statSync(outputPath).size
                if (newSize > 25 * 1024 * 1024) {
                    fs.unlinkSync(outputPath)
                    throw new Error('Archivo comprimido excede límite de 25MB')
                }
                
                fs.unlinkSync(req.file.path)
                archivoFinal = {
                    ...req.file,
                    path: outputPath,
                    filename: outputFilename,
                    size: newSize
                }
                
            } catch (sharpError) {
                console.error('Error comprimiendo imagen:', sharpError.message)
                if (sharpError.message.includes('excede límite')) {
                    fs.unlinkSync(req.file.path)
                    return res.status(400).json({ error: sharpError.message })
                }
            }
        }
        
        if (req.file.mimetype.startsWith('video/')) {
            thumbnail = await generateVideoThumbnail(archivoFinal.path)
        }
        
        const publicPath = `/uploads/${archivoFinal.filename}`
        const url = getFullUrl(req, publicPath)
        
        const metadata_archivo = JSON.stringify({
            nombre: req.file.originalname || 'archivo_whatsapp',
            size: archivoFinal.size,
            mimetype: mimetypeFinal,
            thumbnail: thumbnail || null,
            compressed: req.file.mimetype.startsWith('image/') && archivoFinal.filename.startsWith('bot-')
        })
        
        res.json({
            url,
            publicPath,
            tipo,
            nombre: req.file.originalname || 'archivo_whatsapp',
            mimetype: mimetypeFinal,
            size: archivoFinal.size,
            thumbnail,
            metadata_archivo
        })
        
    } catch (e) {
        console.error('Error en upload del bot:', e)
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path) } catch (cleanupError) {}
        }
        res.status(500).json({ error: 'Error subiendo archivo: ' + e.message })
    }
})

// ========================================
// SUBIR ARCHIVO DESDE MENSAJES
// ========================================
router.post('/mensajes/adjunto', upload.single('archivo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'archivo requerido' })
        }
        
        let archivoFinal = req.file
        let tipo = mapTipo(req.file.mimetype)
        let thumbnail = null
        let mimetypeFinal = req.file.mimetype
        
        if (req.file.mimetype.startsWith('image/')) {
            try {
                const extIn = path.extname(req.file.filename) || ''
                const baseIn = path.basename(req.file.filename, extIn)
                let extOut = extIn
                let transformer = sharp(req.file.path)
                    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })

                if (req.file.mimetype === 'image/png') {
                    extOut = '.png'
                    mimetypeFinal = 'image/png'
                    transformer = transformer.png({ compressionLevel: 9 })
                } else if (req.file.mimetype === 'image/webp') {
                    extOut = '.webp'
                    mimetypeFinal = 'image/webp'
                    transformer = transformer.webp({ quality: 80 })
                } else {
                    extOut = '.jpg'
                    mimetypeFinal = 'image/jpeg'
                    transformer = transformer.jpeg({ quality: 80 })
                }

                const outputFilename = `opt-${baseIn}${extOut}`
                const outputPath = path.join(dir, outputFilename)
                
                await transformer.toFile(outputPath)
                
                const newSize = fs.statSync(outputPath).size
                if (newSize > 25 * 1024 * 1024) {
                    fs.unlinkSync(outputPath)
                    throw new Error('Archivo comprimido excede límite de 25MB')
                }
                
                fs.unlinkSync(req.file.path)
                archivoFinal = {
                    ...req.file,
                    path: outputPath,
                    filename: outputFilename,
                    size: newSize
                }
                
            } catch (sharpError) {
                console.error('Error comprimiendo imagen:', sharpError.message)
                if (sharpError.message.includes('excede límite')) {
                    fs.unlinkSync(req.file.path)
                    return res.status(400).json({ error: sharpError.message })
                }
            }
        }
        
        if (req.file.mimetype.startsWith('video/')) {
            thumbnail = await generateVideoThumbnail(archivoFinal.path)
        }
        
        const publicPath = `/uploads/${archivoFinal.filename}`
        const url = getFullUrl(req, publicPath)
        
        const metadata_archivo = JSON.stringify({
            nombre: req.file.originalname,
            size: archivoFinal.size,
            mimetype: mimetypeFinal,
            thumbnail: thumbnail || null,
            compressed: req.file.mimetype.startsWith('image/') && archivoFinal.filename.startsWith('opt-')
        })
        
        res.json({
            url,
            publicPath,
            tipo,
            nombre: req.file.originalname,
            mimetype: mimetypeFinal,
            size: archivoFinal.size,
            thumbnail,
            metadata_archivo
        })
        
    } catch (e) {
        console.error('Error en upload:', e)
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path) } catch (cleanupError) {}
        }
        res.status(500).json({ error: 'Error subiendo archivo: ' + e.message })
    }
})

// ========================================
// ELIMINAR ARCHIVO
// ========================================
router.delete('/mensajes/adjunto/:filename', async (req, res) => {
    try {
        const { filename } = req.params
        
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            return res.status(400).json({ error: 'Nombre de archivo inválido' })
        }
        
        const filePath = path.join(dir, filename)
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Archivo no encontrado' })
        }
        
        fs.unlinkSync(filePath)
        
        if (filename.match(/\.(mp4|webm|mov|avi|mkv)$/i)) {
            const thumbnailPath = filePath.replace(/\.[^/.]+$/, '_thumb.jpg')
            if (fs.existsSync(thumbnailPath)) {
                fs.unlinkSync(thumbnailPath)
            }
        }
        
        res.json({ success: true, message: 'Archivo eliminado correctamente' })
    } catch (e) {
        console.error('Error eliminando archivo:', e)
        res.status(500).json({ error: 'Error eliminando archivo: ' + e.message })
    }
})

// ========================================
// LIMPIAR ARCHIVOS ANTIGUOS
// ========================================
router.delete('/admin/archivos/limpiar', async (req, res) => {
    try {
        const { dias = 30 } = req.query
        const diasNum = parseInt(dias, 10)
        
        if (isNaN(diasNum) || diasNum < 1) {
            return res.status(400).json({ error: 'Días debe ser un número positivo' })
        }
        
        const cutoffDate = new Date(Date.now() - diasNum * 24 * 60 * 60 * 1000)
        let eliminados = 0
        let errores = 0
        
        const files = fs.readdirSync(dir)
        
        for (const file of files) {
            const filePath = path.join(dir, file)
            const stats = fs.statSync(filePath)
            
            if (stats.mtime < cutoffDate) {
                try {
                    fs.unlinkSync(filePath)
                    eliminados++
                    
                    if (file.match(/\.(mp4|webm|mov|avi|mkv)$/i)) {
                        const thumbnailPath = filePath.replace(/\.[^/.]+$/, '_thumb.jpg')
                        if (fs.existsSync(thumbnailPath)) {
                            fs.unlinkSync(thumbnailPath)
                        }
                    }
                } catch (err) {
                    console.error(`Error eliminando ${file}:`, err.message)
                    errores++
                }
            }
        }
        
        res.json({
            success: true,
            eliminados,
            errores,
            mensaje: `Se eliminaron ${eliminados} archivos antiguos (${diasNum} días)`
        })
    } catch (e) {
        console.error('Error en limpieza de archivos:', e)
        res.status(500).json({ error: 'Error en limpieza: ' + e.message })
    }
})

module.exports = router