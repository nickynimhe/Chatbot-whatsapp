require('dotenv').config()
const path = require('path')
const express = require('express')
const cors = require('cors')
const http = require('http')
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const pool = require('./database/db')
const { ensureSchema } = require('./db/ensureSchema')
const chatsRoutes = require('./routes/chats.routes')
const adminRoutes = require('./routes/admin.routes')
const internalRoutes = require('./routes/internal.routes')
const uploadRoutes = require('./routes/upload.routes')
const uploadPerfilRoutes = require('./routes/uploadPerfil')

pool.connect()
    .then(() => ensureSchema(pool))
    .then(() => console.log('🔥 PostgreSQL conectado'))
    .catch((err) => console.log(err))

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
    cors: { origin: '*' }
})

app.set('io', io)

// ==========================================
// RUTAS QUE USAN MULTIPART/FORM-DATA (VAN PRIMERO)
// ==========================================
app.use('/api', uploadRoutes)
app.use('/api/agentes', uploadPerfilRoutes)

// ==========================================
// RUTAS ESTÁTICAS
// ==========================================
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// ==========================================
// PARSER JSON (SOLO DESPUÉS DE LAS RUTAS MULTIPART)
// ==========================================
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// ==========================================
// RUTAS QUE USAN JSON
// ==========================================
app.use('/api', chatsRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/interno', internalRoutes)

// ==========================================
// MIDDLEWARE DE AUTENTICACIÓN
// ==========================================
app.use((req, res, next) => {
    if (req.path.includes('/api/admin/')) {
        console.log(`📡 ${req.method} ${req.path} - Token: ${req.headers.authorization ? 'Presente' : 'Ausente'}`)
    }
    next()
})

// ==========================================
// SOCKET.IO
// ==========================================
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME'

io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token
        if (!token) {
            console.log('🟢 Conexión WebSocket sin token (modo público)')
            socket.isPublic = true
            return next()
        }
        const payload = jwt.verify(token, JWT_SECRET)
        socket.agente = payload
        console.log(`✅ Agente ${payload.id} autenticado vía WebSocket`)
        next()
    } catch (error) {
        console.log('⚠️ Error de token WebSocket, permitiendo como público')
        socket.isPublic = true
        next()
    }
})

io.on('connection', async (socket) => {
    console.log('🟢 Usuario conectado:', socket.id, socket.isPublic ? '(público)' : '(autenticado)')

    const agenteId = Number(socket.agente?.id)
    if (agenteId) {
        socket.join(`agente_${agenteId}`)
        console.log(`✅ Agente ${agenteId} unido a su sala personal`)

        try {
            await pool.query(
                `UPDATE agentes SET ultima_actividad = CURRENT_TIMESTAMP WHERE id = $1`,
                [agenteId]
            )
            console.log(`✅ Actividad actualizada para agente ${agenteId}`)
        } catch (error) {
            console.error('❌ Error actualizando actividad:', error)
        }
    }

    socket.on('admin-viendo-chat', (data) => {
        if (socket.agente?.rol !== 'admin') return
        console.log(`👁️ Admin ${data.admin_nombre} viendo chat ${data.chat_id} del agente ${data.agente_id}`)
        io.to(`agente_${data.agente_id}`).emit('admin-visualizando', {
            chat_id: data.chat_id,
            admin_nombre: data.admin_nombre
        })
    })

    socket.on('nuevo-mensaje-frontend', async (data) => {
        console.log('📨 Mensaje desde frontend:', data)
        io.emit('mensaje-recibido', data)
    })

    socket.on('escribiendo', (data) => {
        console.log('⌨️ Evento escribiendo recibido:', data)
        io.to(`agente_${data.agente_id}`).emit('usuario-escribiendo', {
            chat_id: data.chat_id,
            nombre: data.nombre
        })
    })

    socket.on('dejando-escribir', (data) => {
        console.log('⌨️ Evento dejando-escribir recibido:', data)
        io.to(`agente_${data.agente_id}`).emit('usuario-dejo-escribir', {
            chat_id: data.chat_id
        })
    })

    socket.on('disconnect', () => {
        console.log('🔴 Usuario desconectado:', socket.id)
    })
})

const PORT = 9020
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`)
})
