const express = require('express')
const router = express.Router()
const pool = require('../database/db')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME'

// ============================================
// LOGIN
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { usuario, password } = req.body
        
        if (!usuario || !password) {
            return res.status(400).json({ error: 'Usuario y password son requeridos' })
        }
        
        // 🔥 INCLUIR foto_perfil en la consulta
        const result = await pool.query(
            `SELECT id, usuario, nombre, password, rol, estado, foto_perfil FROM agentes WHERE usuario = $1`,
            [usuario]
        )
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' })
        }
        
        const agente = result.rows[0]
        
        const validPassword = await bcrypt.compare(password, agente.password)
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' })
        }
        
        if (agente.estado !== 'disponible' && agente.rol !== 'admin') {
            return res.status(403).json({ error: 'Usuario no disponible' })
        }
        
        const token = jwt.sign(
            { id: agente.id, usuario: agente.usuario, nombre: agente.nombre, rol: agente.rol },
            JWT_SECRET,
            { expiresIn: '24h' }
        )
        
        res.json({
            token,
            agente: {
                id: agente.id,
                usuario: agente.usuario,
                nombre: agente.nombre,
                rol: agente.rol,
                estado: agente.estado,
                foto_perfil: agente.foto_perfil || null  // 🔥 INCLUIR FOTO
            }
        })
    } catch (error) {
        console.error('Error en login:', error)
        res.status(500).json({ error: error.message })
    }
})

module.exports = router

