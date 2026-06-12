const express = require('express')
const router = express.Router()
const pool = require('../database/db')
const jwt = require('jsonwebtoken')

// Middleware para autenticar token
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado' })
    }
    
    const token = authHeader.split(' ')[1]
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'CHANGE_ME')
        req.agente = decoded
        next()
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido' })
    }
}

function parOrdenado(a, b) {
    const x = Number(a)
    const y = Number(b)
    return x < y ? [x, y] : [y, x]
}

async function obtenerOCrearChatInterno(agenteA, agenteB) {
    const [menor, mayor] = parOrdenado(agenteA, agenteB)
    let r = await pool.query(
        `SELECT * FROM chats_internos WHERE agente_menor_id = $1 AND agente_mayor_id = $2`,
        [menor, mayor]
    )
    if (r.rows.length) return r.rows[0]
    const ins = await pool.query(
        `INSERT INTO chats_internos (agente_menor_id, agente_mayor_id, ultimo_mensaje)
         VALUES ($1, $2, $3) RETURNING *`,
        [menor, mayor, '']
    )
    return ins.rows[0]
}

router.use(requireAuth)

// GET /api/interno/chats
router.get('/chats', async (req, res) => {
    try {
        const me = Number(req.agente.id)
        const r = await pool.query(
            `SELECT c.*,
                CASE WHEN c.agente_menor_id = $1 THEN c.agente_mayor_id ELSE c.agente_menor_id END AS otro_id,
                a.nombre AS otro_nombre,
                a.estado AS otro_estado
             FROM chats_internos c
             JOIN agentes a ON a.id = CASE WHEN c.agente_menor_id = $1 THEN c.agente_mayor_id ELSE c.agente_menor_id END
             WHERE c.agente_menor_id = $1 OR c.agente_mayor_id = $1
             ORDER BY c.ultimo_mensaje_hora DESC NULLS LAST`,
            [me]
        )
        res.json(r.rows)
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error listando chats internos' })
    }
})

// GET /api/interno/chats/con/:otroId
router.get('/chats/con/:otroId', async (req, res) => {
    try {
        const otro = Number(req.params.otroId)
        const me = Number(req.agente.id)
        if (otro === me) return res.status(400).json({ error: 'No puedes chatear contigo mismo' })
        const chat = await obtenerOCrearChatInterno(me, otro)
        res.json(chat)
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error obteniendo conversación' })
    }
})

// GET /api/interno/chats/:chatInternoId/mensajes
router.get('/chats/:chatInternoId/mensajes', async (req, res) => {
    try {
        const chatId = Number(req.params.chatInternoId)
        const me = Number(req.agente.id)
        const ok = await pool.query(
            `SELECT 1 FROM chats_internos WHERE id = $1 AND (agente_menor_id = $2 OR agente_mayor_id = $2)`,
            [chatId, me]
        )
        if (!ok.rows.length) return res.status(404).json({ error: 'Chat no encontrado' })
        const r = await pool.query(
            `SELECT m.*, a.nombre AS emisor_nombre
             FROM mensajes_internos m
             JOIN agentes a ON a.id = m.emisor_id
             WHERE m.chat_interno_id = $1
             ORDER BY m.hora ASC`,
            [chatId]
        )
        res.json(r.rows)
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error obteniendo mensajes' })
    }
})

// POST /api/interno/chats/:chatInternoId/mensajes
router.post('/chats/:chatInternoId/mensajes', async (req, res) => {
    try {
        const chatId = Number(req.params.chatInternoId)
        const me = Number(req.agente.id)
        const { texto, tipo, url_adjunto, metadata_archivo } = req.body
        
        const ok = await pool.query(
            `SELECT 1 FROM chats_internos WHERE id = $1 AND (agente_menor_id = $2 OR agente_mayor_id = $2)`,
            [chatId, me]
        )
        if (!ok.rows.length) return res.status(404).json({ error: 'Chat no encontrado' })
        
        let preview = (texto && String(texto).trim()) || 
                      (tipo === 'imagen' ? '📷 Imagen' : 
                       tipo === 'video' ? '🎥 Video' : '📎 Archivo')
        
        // Insertar mensaje
        const ins = await pool.query(
            `INSERT INTO mensajes_internos (chat_interno_id, emisor_id, texto, tipo, url_adjunto, metadata_archivo)
             VALUES ($1, $2, $3, COALESCE($4, 'texto'), $5, $6)
             RETURNING *`,
            [chatId, me, texto || '', tipo || 'texto', url_adjunto || null, metadata_archivo || null]
        )
        
        await pool.query(
            `UPDATE chats_internos SET ultimo_mensaje = $1, ultimo_mensaje_hora = CURRENT_TIMESTAMP WHERE id = $2`,
            [preview, chatId]
        )
        
        const io = req.app.get('io')
        const part = await pool.query(
            `SELECT agente_menor_id, agente_mayor_id FROM chats_internos WHERE id = $1`,
            [chatId]
        )
        const { agente_menor_id: mn, agente_mayor_id: mx } = part.rows[0]
        
        // Obtener el mensaje completo con nombre del emisor
        const mensajeCompleto = await pool.query(
            `SELECT m.*, a.nombre AS emisor_nombre
             FROM mensajes_internos m
             JOIN agentes a ON a.id = m.emisor_id
             WHERE m.id = $1`,
            [ins.rows[0].id]
        )
        
        const payload = { 
            chat_interno_id: chatId, 
            mensaje: mensajeCompleto.rows[0] 
        }
        
        io.to(`agente_${mn}`).emit('mensaje-interno', payload)
        io.to(`agente_${mx}`).emit('mensaje-interno', payload)
        
        res.json(ins.rows[0])
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error enviando mensaje interno: ' + e.message })
    }
})

module.exports = router