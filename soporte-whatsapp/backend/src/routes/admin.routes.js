const express = require('express')
const router = express.Router()
const pool = require('../database/db')
const { requireAdmin } = require('../middleware/requireAdmin')
const bcrypt = require('bcryptjs')

router.use(requireAdmin)

// ============================================
// GESTIÓN DE AGENTES
// ============================================

router.get('/agentes', async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT id, usuario, nombre, estado, rol, foto_perfil
            FROM agentes 
            ORDER BY nombre ASC
        `)
        res.json(r.rows)
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: e.message })
    }
})

router.post('/agentes', async (req, res) => {
    try {
        const { usuario, password, nombre, rol } = req.body
        if (!usuario || !password || !nombre) {
            return res.status(400).json({ error: 'usuario, password y nombre son obligatorios' })
        }
        const hash = await bcrypt.hash(String(password), 10)
        const r = await pool.query(
            `INSERT INTO agentes (usuario, password, nombre, rol, estado)
             VALUES ($1, $2, $3, COALESCE($4, 'agente'), 'disponible')
             RETURNING id, usuario, nombre, estado, rol, foto_perfil`,
            [usuario, hash, nombre, rol || 'agente']
        )
        res.json(r.rows[0])
    } catch (e) {
        if (e.code === '23505') {
            return res.status(400).json({ error: 'Ese usuario ya existe' })
        }
        console.error(e)
        res.status(500).json({ error: e.message })
    }
})

router.put('/agentes/:id', async (req, res) => {
    try {
        const { id } = req.params
        const { usuario, password, nombre, rol, estado } = req.body
        
        if (password && String(password).trim()) {
            const hash = await bcrypt.hash(String(password), 10)
            const r = await pool.query(
                `UPDATE agentes SET
                    usuario = COALESCE($1, usuario),
                    password = $2,
                    nombre = COALESCE($3, nombre),
                    rol = COALESCE($4, rol),
                    estado = COALESCE($5, estado)
                 WHERE id = $6
                 RETURNING id, usuario, nombre, estado, rol, foto_perfil`,
                [usuario || null, hash, nombre || null, rol || null, estado || null, id]
            )
            if (!r.rows.length) return res.status(404).json({ error: 'Agente no encontrado' })
            
            const io = req.app.get('io')
            if (io && estado) {
                io.emit('agente-estado-cambio', {
                    agenteId: parseInt(id),
                    estado: estado
                })
            }
            
            return res.json(r.rows[0])
        }
        
        const r = await pool.query(
            `UPDATE agentes SET
                usuario = COALESCE($1, usuario),
                nombre = COALESCE($2, nombre),
                rol = COALESCE($3, rol),
                estado = COALESCE($4, estado)
             WHERE id = $5
             RETURNING id, usuario, nombre, estado, rol, foto_perfil`,
            [usuario || null, nombre || null, rol || null, estado || null, id]
        )
        
        if (!r.rows.length) return res.status(404).json({ error: 'Agente no encontrado' })
        
        const io = req.app.get('io')
        if (io && estado) {
            io.emit('agente-estado-cambio', {
                agenteId: parseInt(id),
                estado: estado
            })
        }
        
        res.json(r.rows[0])
    } catch (e) {
        if (e.code === '23505') {
            return res.status(400).json({ error: 'Ese usuario ya existe' })
        }
        console.error(e)
        res.status(500).json({ error: e.message })
    }
})

router.delete('/agentes/:id', async (req, res) => {
    try {
        const { id } = req.params
        if (Number(id) === req.adminAgenteId) {
            return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' })
        }
        const r = await pool.query(`DELETE FROM agentes WHERE id = $1 RETURNING id`, [id])
        if (!r.rows.length) return res.status(404).json({ error: 'Agente no encontrado' })
        res.json({ success: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: e.message })
    }
})

// ============================================
// ESTADÍSTICAS
// ============================================

router.get('/estadisticas', async (req, res) => {
    try {
        const totalAgentes = await pool.query(`SELECT COUNT(*) as count FROM agentes`)
        const agentesActivos = await pool.query(`SELECT COUNT(*) as count FROM agentes WHERE estado = 'disponible'`)
        const agentesOcupados = await pool.query(`SELECT COUNT(*) as count FROM agentes WHERE estado = 'ocupado'`)
        const chatsActivos = await pool.query(`SELECT COUNT(*) as count FROM chats WHERE estado = 'abierto'`)
        const chatsHoy = await pool.query(`SELECT COUNT(*) as count FROM chats WHERE DATE(created_at) = CURRENT_DATE`)
        const chatsSinAsignar = await pool.query(`SELECT COUNT(*) as count FROM chats WHERE estado = 'abierto' AND agente_id IS NULL AND en_espera = true`)
        
        res.json({
            totalAgentes: parseInt(totalAgentes.rows[0].count),
            agentesActivos: parseInt(agentesActivos.rows[0].count),
            agentesOcupados: parseInt(agentesOcupados.rows[0].count),
            chatsActivos: parseInt(chatsActivos.rows[0].count),
            chatsHoy: parseInt(chatsHoy.rows[0].count),
            chatsSinAsignar: parseInt(chatsSinAsignar.rows[0].count)
        })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: e.message })
    }
})

// ============================================
// CHATS ACTIVOS
// ============================================

router.get('/chats-activos', async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT c.id, c.cliente_nombre, c.cliente_numero, c.ultimo_mensaje, 
                   c.ultimo_mensaje_hora, c.agente_id, a.nombre as agente_nombre
            FROM chats c
            LEFT JOIN agentes a ON a.id = c.agente_id
            WHERE c.estado = 'abierto' AND c.agente_id IS NOT NULL
            ORDER BY c.ultimo_mensaje_hora DESC
        `)
        res.json(r.rows)
    } catch (e) {
        console.error(e)
        res.json([])
    }
})

// ============================================
// CHATS SIN ASIGNAR
// ============================================

router.get('/chats-sin-asignar', async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT 
                c.id, 
                c.cliente_nombre, 
                c.cliente_numero, 
                c.ultimo_mensaje, 
                c.created_at,
                c.estado,
                (SELECT COUNT(*) FROM mensajes WHERE chat_id = c.id) as total_mensajes,
                EXTRACT(EPOCH FROM (NOW() - c.created_at))/60 as minutos_espera
            FROM chats c
            WHERE c.estado = 'abierto' AND c.agente_id IS NULL AND c.en_espera = true
            ORDER BY c.created_at ASC
        `)
        
        const chats = r.rows.map(chat => ({
            ...chat,
            minutos_espera: Math.round(chat.minutos_espera || 0)
        }))
        
        res.json(chats)
    } catch (e) {
        console.error('Error en chats-sin-asignar:', e)
        res.json([])
    }
})

// ============================================
// CHATS OLVIDADOS
// ============================================

router.get('/chats-olvidados', async (req, res) => {
    try {
        const r = await pool.query(`
            SELECT c.id, c.cliente_nombre, c.cliente_numero, c.ultimo_mensaje,
                   c.ultimo_mensaje_hora, c.agente_id, a.nombre as agente_nombre
            FROM chats c
            LEFT JOIN agentes a ON a.id = c.agente_id
            WHERE c.estado = 'abierto' 
            AND c.agente_id IS NOT NULL
            ORDER BY c.ultimo_mensaje_hora ASC
        `)
        res.json(r.rows)
    } catch (e) {
        console.error(e)
        res.json([])
    }
})

// ============================================
// ASIGNAR CHAT
// ============================================

router.post('/chats/:chatId/asignar', async (req, res) => {
    try {
        const { chatId } = req.params
        const { agente_id } = req.body
        
        await pool.query(
            `UPDATE chats SET agente_id = $1 WHERE id = $2 AND estado = 'abierto'`,
            [agente_id, chatId]
        )
        
        res.json({ success: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: e.message })
    }
})

// ============================================
// REASIGNAR CHAT
// ============================================

router.post('/chats/:chatId/reasignar', async (req, res) => {
    try {
        const { chatId } = req.params
        const { nuevo_agente_id } = req.body
        
        await pool.query(
            `UPDATE chats SET agente_id = $1 WHERE id = $2 AND estado = 'abierto'`,
            [nuevo_agente_id, chatId]
        )
        
        res.json({ success: true })
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: e.message })
    }
})

// ============================================
// VER MENSAJES DE UN CHAT
// ============================================

router.get('/chat/:chatId/mensajes', async (req, res) => {
    try {
        const { chatId } = req.params
        
        const r = await pool.query(`
            SELECT m.*, a.nombre as emisor_nombre
            FROM mensajes m
            LEFT JOIN agentes a ON a.id = m.agente_id
            WHERE m.chat_id = $1
            ORDER BY m.hora ASC
        `, [chatId])
        
        res.json(r.rows)
    } catch (e) {
        console.error(e)
        res.json([])
    }
})

// ============================================
// TODOS LOS CHATS (HISTORIAL) - VERSIÓN CORREGIDA
// ============================================

router.get('/todos-chats', async (req, res) => {
    try {
        console.log('========== NUEVA BÚSQUEDA ==========');
        console.log('Query params:', req.query);
        
        const { 
            estado, 
            fecha_inicio, 
            fecha_fin, 
            telefono, 
            nombre,
            agente_id,
            pagina = 1, 
            limite = 20 
        } = req.query;
        
        console.log('🔍 Teléfono a buscar:', telefono);
        console.log('🔍 Nombre a buscar:', nombre);
        
        const offset = (parseInt(pagina) - 1) * parseInt(limite);
        
        // Construir la consulta base
        let query = `
            SELECT 
                c.*, 
                a.nombre as agente_nombre,
                COUNT(DISTINCT m.id) as total_mensajes
            FROM chats c
            LEFT JOIN agentes a ON a.id = c.agente_id
            LEFT JOIN mensajes m ON c.id = m.chat_id
            WHERE 1=1
        `;
        
        const params = [];
        let paramIndex = 1;
        
        // Filtro por estado
        if (estado && estado !== 'todos') {
            query += ` AND c.estado = $${paramIndex++}`;
            params.push(estado);
        }
        
        // Filtro por número de teléfono - CONVERSIÓN A TEXTO
        if (telefono && telefono.trim()) {
            query += ` AND c.cliente_numero::text ILIKE $${paramIndex++}`;
            params.push(`%${telefono.trim()}%`);
            console.log(`✅ Filtro teléfono aplicado: %${telefono.trim()}%`);
        }
        
        // Filtro por nombre del cliente
        if (nombre && nombre.trim()) {
            query += ` AND c.cliente_nombre ILIKE $${paramIndex++}`;
            params.push(`%${nombre.trim()}%`);
            console.log(`✅ Filtro nombre aplicado: %${nombre.trim()}%`);
        }
        
        // Filtro por agente asignado
        if (agente_id && agente_id !== 'todos') {
            if (agente_id === 'sin_asignar') {
                query += ` AND c.agente_id IS NULL AND c.en_espera = true`;
            } else {
                query += ` AND c.agente_id = $${paramIndex++}`;
                params.push(parseInt(agente_id));
            }
        }
        
        // Filtro por rango de fechas
        if (fecha_inicio) {
            query += ` AND DATE(c.created_at) >= $${paramIndex++}`;
            params.push(fecha_inicio);
        }
        
        if (fecha_fin) {
            query += ` AND DATE(c.created_at) <= $${paramIndex++}`;
            params.push(fecha_fin);
        }
        
        // Agrupar y ordenar
        query += ` GROUP BY c.id, a.nombre ORDER BY c.created_at DESC`;
        
        // Query para contar total
        let countQuery = `
            SELECT COUNT(DISTINCT c.id) as total
            FROM chats c
            WHERE 1=1
        `;
        
        const countParams = [];
        let countIndex = 1;
        
        if (estado && estado !== 'todos') {
            countQuery += ` AND c.estado = $${countIndex++}`;
            countParams.push(estado);
        }
        if (telefono && telefono.trim()) {
            countQuery += ` AND c.cliente_numero::text ILIKE $${countIndex++}`;
            countParams.push(`%${telefono.trim()}%`);
        }
        if (nombre && nombre.trim()) {
            countQuery += ` AND c.cliente_nombre ILIKE $${countIndex++}`;
            countParams.push(`%${nombre.trim()}%`);
        }
        if (agente_id && agente_id !== 'todos') {
            if (agente_id === 'sin_asignar') {
                countQuery += ` AND c.agente_id IS NULL AND c.en_espera = true`;
            } else {
                countQuery += ` AND c.agente_id = $${countIndex++}`;
                countParams.push(parseInt(agente_id));
            }
        }
        if (fecha_inicio) {
            countQuery += ` AND DATE(c.created_at) >= $${countIndex++}`;
            countParams.push(fecha_inicio);
        }
        if (fecha_fin) {
            countQuery += ` AND DATE(c.created_at) <= $${countIndex++}`;
            countParams.push(fecha_fin);
        }
        
        console.log('📝 SQL Query:', query);
        console.log('📝 Parámetros:', params);
        
        const totalResult = await pool.query(countQuery, countParams);
        const total = parseInt(totalResult.rows[0]?.total || 0);
        const totalPages = Math.ceil(total / parseInt(limite));
        
        // Agregar paginación
        query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limite), offset);
        
        const result = await pool.query(query, params);
        
        console.log(`✅ Resultados: ${result.rows.length} chats encontrados de ${total} totales`);
        console.log('=====================================\n');
        
        res.json({
            chats: result.rows,
            total: total,
            pagina: parseInt(pagina),
            limite: parseInt(limite),
            total_paginas: totalPages
        });
    } catch (e) {
        console.error('❌ Error en todos-chats:', e);
        res.status(500).json({ error: e.message });
    }
})

// ============================================
// CONFIGURACIÓN DEL SISTEMA
// ============================================

router.get('/configuracion', async (req, res) => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS configuracion (
                clave VARCHAR(100) PRIMARY KEY,
                valor TEXT,
                actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `)
        
        const r = await pool.query(`SELECT clave, valor FROM configuracion`)
        const config = {}
        r.rows.forEach((row) => { config[row.clave] = row.valor })
        
        if (!config.mensaje_bienvenida_general) {
            config.mensaje_bienvenida_general = 'Hola, gracias por comunicarte. Mi nombre es [NOMBRE_AGENTE]. ¿En qué puedo ayudarte?'
        }
        if (!config.mensaje_validacion_datos) {
            config.mensaje_validacion_datos = `Con el fin de garantizar la protección de datos personales, realizaremos una validación de seguridad.

Indíqueme por favor la siguiente información:
• Nombre completo y cédula del titular de la cuenta
• Correo electrónico
• Dirección del servicio
• Valor de su facturación mensual`
        }
        if (!config.mensaje_cierre) {
            config.mensaje_cierre = '✅ Atención finalizada. Gracias por contactarnos.'
        }
        
        res.json(config)
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: e.message })
    }
})

router.put('/configuracion', async (req, res) => {
    try {
        const { mensaje_bienvenida_general, mensaje_validacion_datos, mensaje_cierre, mensaje_soporte_tecnico } = req.body
        
        if (mensaje_bienvenida_general !== undefined) {
            await pool.query(
                `INSERT INTO configuracion (clave, valor) VALUES ('mensaje_bienvenida_general', $1)
                 ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
                [mensaje_bienvenida_general]
            )
        }
        if (mensaje_validacion_datos !== undefined) {
            await pool.query(
                `INSERT INTO configuracion (clave, valor) VALUES ('mensaje_validacion_datos', $1)
                 ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
                [mensaje_validacion_datos]
            )
        }
        if (mensaje_cierre !== undefined) {
            await pool.query(
                `INSERT INTO configuracion (clave, valor) VALUES ('mensaje_cierre', $1)
                 ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
                [mensaje_cierre]
            )
        }
        if (mensaje_soporte_tecnico !== undefined) {
            await pool.query(
                `INSERT INTO configuracion (clave, valor) VALUES ('mensaje_soporte_tecnico', $1)
                 ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
                [mensaje_soporte_tecnico]
            )
        }
        
        res.json({ success: true })
    } catch (e) {
        console.error("Error actualizando configuración:", e)
        res.status(500).json({ error: e.message })
    }
})

router.get('/configuracion/mensaje_validacion_datos', async (req, res) => {
    try {
        const result = await pool.query(`SELECT valor FROM configuracion WHERE clave = 'mensaje_validacion_datos'`)
        if (result.rows.length > 0 && result.rows[0].valor) {
            res.json({ mensaje: result.rows[0].valor })
        } else {
            res.json({ mensaje: null })
        }
    } catch (e) {
        console.error("Error obteniendo mensaje de validación:", e)
        res.status(500).json({ error: e.message })
    }
})

router.get('/configuracion/mensaje-soporte-tecnico', async (req, res) => {
    try {
        const result = await pool.query(`SELECT valor FROM configuracion WHERE clave = 'mensaje_soporte_tecnico'`)
        if (result.rows.length > 0 && result.rows[0].valor) {
            res.json({ mensaje: result.rows[0].valor })
        } else {
            res.json({ mensaje: '🖥️ En unos momentos usted será atendido por un asesor de soporte técnico, por favor espere en la línea.' })
        }
    } catch (e) {
        console.error("Error obteniendo mensaje soporte técnico:", e)
        res.json({ mensaje: '🖥️ En unos momentos usted será atendido por un asesor de soporte técnico, por favor espere en la línea.' })
    }
})

module.exports = router
