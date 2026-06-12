const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h'

function signToken(agente) {
    return jwt.sign(
        { id: agente.id, rol: agente.rol, nombre: agente.nombre, usuario: agente.usuario },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    )
}

function tokenFromReq(req) {
    const header = req.headers.authorization || ''
    const m = String(header).match(/^Bearer\s+(.+)$/i)
    if (m?.[1]) return m[1].trim()
    return null
}

function requireAuth(req, res, next) {
    try {
        const token = tokenFromReq(req)
        if (!token) return res.status(401).json({ error: 'Falta token' })
        const payload = jwt.verify(token, JWT_SECRET)
        req.agente = payload
        next()
    } catch (_) {
        res.status(401).json({ error: 'Token inválido' })
    }
}

module.exports = { signToken, requireAuth }
