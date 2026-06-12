// middleware/requireAdmin.js
const jwt = require('jsonwebtoken')
const pool = require('../database/db')

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME'

const requireAdmin = async (req, res, next) => {
    try {
        console.log('\n🔐 [requireAdmin] Verificando autenticación...')
        
        // 1. Obtener token del header Authorization
        let token = req.headers.authorization?.split(' ')[1]
        let agenteId = req.headers['x-agente-id']
        
        console.log('📝 Token recibido:', token ? '✅ Sí' : '❌ No')
        console.log('📝 X-Agente-Id:', agenteId || '❌ No')
        
        // Si no hay token pero hay X-Agente-Id (modo legacy)
        if (!token && agenteId) {
            console.log('⚠️ Usando modo legacy con X-Agente-Id')
            const result = await pool.query(
                `SELECT id, usuario, nombre, email, rol FROM agentes WHERE id = $1`,
                [agenteId]
            )
            if (result.rows.length === 0) {
                return res.status(403).json({ error: 'No autorizado', message: 'Agente no encontrado' })
            }
            if (result.rows[0].rol !== 'admin') {
                return res.status(403).json({ error: 'Permiso denegado', message: 'Se requieren permisos de administrador' })
            }
            req.agente = result.rows[0]
            req.adminAgenteId = result.rows[0].id
            console.log(`✅ Admin autorizado (legacy): ${req.agente.usuario}`)
            return next()
        }
        
        // Validar token JWT
        if (!token) {
            console.log('❌ No hay token de autorización')
            return res.status(401).json({ error: 'No autorizado', message: 'Token no proporcionado' })
        }
        
        // Verificar token
        let decoded
        try {
            decoded = jwt.verify(token, JWT_SECRET)
            console.log('✅ Token válido para usuario ID:', decoded.id)
        } catch (err) {
            console.log('❌ Token inválido:', err.message)
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expirado', message: 'La sesión ha expirado. Inicia sesión nuevamente.' })
            }
            return res.status(401).json({ error: 'Token inválido', message: 'El token de autenticación no es válido' })
        }
        
        // Verificar que el usuario existe y es admin
        const result = await pool.query(
            `SELECT id, usuario, nombre, email, rol FROM agentes WHERE id = $1`,
            [decoded.id]
        )
        
        if (result.rows.length === 0) {
            console.log('❌ Usuario no encontrado en BD')
            return res.status(403).json({ error: 'No autorizado', message: 'Usuario no encontrado' })
        }
        
        if (result.rows[0].rol !== 'admin') {
            console.log(`❌ Usuario ${result.rows[0].usuario} NO es administrador (rol: ${result.rows[0].rol})`)
            return res.status(403).json({ error: 'Permiso denegado', message: 'Se requieren permisos de administrador' })
        }
        
        req.agente = result.rows[0]
        req.adminAgenteId = result.rows[0].id
        console.log(`✅ Admin autorizado: ${req.agente.usuario} (ID: ${req.agente.id})`)
        next()
        
    } catch (error) {
        console.error('❌ Error en requireAdmin:', error)
        res.status(500).json({ error: 'Error interno', message: 'Error verificando autenticación' })
    }
}

module.exports = { requireAdmin }