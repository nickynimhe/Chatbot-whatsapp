const express = require('express')
const router = express.Router()
const pool = require('../database/db')
const axios = require('axios')
const bcrypt = require('bcryptjs')
const { signToken, requireAuth } = require('../middleware/auth')

// URL del bot (localhost porque están en el mismo servidor)
const BOT_SERVICE_BASE = (process.env.BOT_SERVICE_URL || 'http://localhost:9019').replace(/\/$/, '')

// Health check del bot
let botHealthStatus = 'unknown'
let lastHealthCheck = null

async function checkBotHealth() {
    try {
        const response = await axios.get(`${BOT_SERVICE_BASE}/health`, { timeout: 5000 })
        botHealthStatus = response.data?.status || 'unknown'
        lastHealthCheck = new Date()
        return botHealthStatus === 'ready'
    } catch (error) {
        botHealthStatus = 'unavailable'
        return false
    }
}

setInterval(() => checkBotHealth(), 30000)
checkBotHealth()

async function postAlBot(ruta, cuerpo, reintentos = 3) {
    const url = `${BOT_SERVICE_BASE}${ruta.startsWith('/') ? ruta : `/${ruta}`}`
    for (let i = 0; i < reintentos; i++) {
        try {
            return await axios.post(url, cuerpo, {
                timeout: 120000,
                headers: { 'Content-Type': 'application/json' }
            })
        } catch (error) {
            if (i === reintentos - 1) throw error
            console.log(`⚠️ Reintento ${i + 1}/${reintentos} para ${url}... Error: ${error.message}`)
            await new Promise(resolve => setTimeout(resolve, 2000))
        }
    }
}

async function mejorAgenteDisponible() {
    const result = await pool.query(`
        SELECT 
            a.id, 
            a.nombre, 
            COUNT(c.id) AS chats_activos,
            a.tiempo_promedio_respuesta,
            a.ultima_actividad,
            a.total_chats_atendidos
        FROM agentes a
        LEFT JOIN chats c ON a.id = c.agente_id AND c.estado = 'abierto'
        WHERE a.estado = 'disponible'
        AND a.rol != 'admin'
        AND a.ultima_actividad > NOW() - INTERVAL '5 minutes'
        GROUP BY a.id, a.nombre, a.tiempo_promedio_respuesta, a.ultima_actividad, a.total_chats_atendidos
        ORDER BY 
            chats_activos ASC,
            a.tiempo_promedio_respuesta ASC,
            a.ultima_actividad DESC
        LIMIT 1
    `)
    console.log(`🔍 mejorAgenteDisponible: Encontrados ${result.rows.length} agentes disponibles`)
    if (result.rows.length > 0) {
        console.log(`🔍 mejorAgenteDisponible: Agente seleccionado - ${result.rows[0].nombre} (ID: ${result.rows[0].id})`)
    }
    return result
}

async function hayAgentesDisponibles() {
    const result = await pool.query(`
        SELECT COUNT(*) as total FROM agentes 
        WHERE estado = 'disponible'
        AND rol != 'admin'
        AND ultima_actividad > NOW() - INTERVAL '5 minutes'
    `);
    return parseInt(result.rows[0]?.total || 0) > 0;
}

async function usuarioEnSoporteHumano(numero) {
    try {
        const chatActivo = await pool.query(`
            SELECT c.id, c.agente_id, c.en_espera
            FROM chats c
            WHERE c.cliente_numero = $1 
            AND c.estado = 'abierto'
            ORDER BY c.ultimo_mensaje_hora DESC
            LIMIT 1
        `, [numero])
        
        if (chatActivo.rows.length > 0 && chatActivo.rows[0].agente_id !== null) {
            console.log(`🔍 ${numero} tiene chat activo con asesor (ID: ${chatActivo.rows[0].agente_id})`)
            return true
        }
        
        const response = await axios.get(`${BOT_SERVICE_BASE}/estado/${numero}`, { timeout: 3000 });
        const enBlacklist = response.data?.en_blacklist === true;
        console.log(`🔍 ${numero} en blacklist del bot: ${enBlacklist}`)
        return enBlacklist;
    } catch (error) {
        console.log(`⚠️ No se pudo verificar blacklist para ${numero}:`, error.message);
        const chatEnEspera = await pool.query(`
            SELECT id FROM chats 
            WHERE cliente_numero = $1 
            AND estado = 'abierto' 
            AND en_espera = true
        `, [numero])
        return chatEnEspera.rows.length > 0;
    }
}

async function agenteParaNuevoChat() {
    const mejor = await mejorAgenteDisponible()
    if (mejor.rows[0]?.id) return mejor.rows[0]
    return null
}

async function actualizarActividadAgente(agenteId) {
    try {
        await pool.query(
            `UPDATE agentes SET ultima_actividad = CURRENT_TIMESTAMP WHERE id = $1`,
            [agenteId]
        )
    } catch (error) {
        console.error('Error actualizando actividad del agente:', error)
    }
}

async function textoBienvenidaDesdePlantilla(nombreAgente) {
    try {
        const result = await pool.query(`SELECT valor FROM configuracion WHERE clave = 'mensaje_bienvenida_general'`)
        if (result.rows.length > 0 && result.rows[0].valor) {
            return result.rows[0].valor.replace('[NOMBRE_AGENTE]', nombreAgente)
        }
    } catch (error) {
        console.error('Error cargando mensaje de bienvenida:', error)
    }
    return `Gracias por comunicarse a M@stv Producciones. Mi nombre es ${nombreAgente}, ¿En qué le puedo ayudar?`
}

const WHATSAPP_MSG_ATENCION_FINALIZADA = process.env.WHATSAPP_MSG_ATENCION_FINALIZADA
    || '✅ Atención finalizada.'
const WHATSAPP_MSG_DESPEDIDA = process.env.WHATSAPP_MSG_DESPEDIDA
    || '👋 Gracias por comunicarte con *M@stv Producciones*. ¡Hasta pronto!'

function numeroParaBot(numeroCliente) {
    const raw = String(numeroCliente || '')
    const limpio = limpiarNumero(raw)
    if (limpio) return limpio
    return raw.replace(/@c\.us|@lid|@s\.whatsapp\.net/gi, '').replace(/\+/g, '').replace(/\s/g, '')
}

async function enviarDespedidaHumanoAlCliente(numeroCliente) {
    const numero = numeroParaBot(numeroCliente)
    if (!numero) {
        console.error('❌ Sin número válido para despedida WhatsApp')
        return
    }
    try {
        await postAlBot('/end-chat', { numero })
        console.log(`📤 end-chat (despedida + reset megabot) → ${numero}`)
        return
    } catch (e0) {
        console.error('⚠️ end-chat no disponible o falló:', e0.response?.status, e0.message)
    }
    try {
        await postAlBot('/send-message', { numero, mensaje: WHATSAPP_MSG_ATENCION_FINALIZADA })
        await postAlBot('/send-message', { numero, mensaje: WHATSAPP_MSG_DESPEDIDA })
        console.log(`📤 Despedida por send-message (fallback) → ${numero}`)
    } catch (e1) {
        console.error('❌ Fallback send-message también falló:', e1.response?.status, e1.message)
    }
}

async function ejecutarCierreHumano({ chat_id, agente_id, detalleSistema }) {
    const agente = await pool.query('SELECT nombre FROM agentes WHERE id = $1', [agente_id])
    if (agente.rows.length === 0) {
        const err = new Error('NO_AGENTE'); err.code = 'NO_AGENTE'; throw err
    }
    const chatData = await pool.query('SELECT cliente_numero, estado FROM chats WHERE id = $1', [chat_id])
    if (chatData.rows.length === 0) {
        const err = new Error('NO_CHAT'); err.code = 'NO_CHAT'; throw err
    }
    if (chatData.rows[0].estado === 'cerrado') {
        const err = new Error('YA_CERRADO'); err.code = 'YA_CERRADO'; throw err
    }
    const nombre = agente.rows[0].nombre
    const numeroCliente = chatData.rows[0].cliente_numero

    await pool.query(
        `UPDATE chats SET estado = 'cerrado', agente_id = NULL, cerrado_por = $1, cerrado_en = CURRENT_TIMESTAMP WHERE id = $2`,
        [agente_id, chat_id]
    )
    await pool.query(
        `INSERT INTO mensajes (chat_id, texto, emisor, tipo, estado) VALUES ($1, $2, 'sistema', 'sistema', 'entregado')`,
        [chat_id, detalleSistema(nombre)]
    )
    
    try {
        await postAlBot('/clear-state', { numero: numeroCliente })
        console.log(`🧹 Estado del bot limpiado para ${numeroCliente}`)
    } catch (err) {
        console.warn('⚠️ No se pudo limpiar estado del bot:', err.message)
    }
    
    await enviarDespedidaHumanoAlCliente(numeroCliente)
}

function limpiarNumero(numero) {
    if (!numero) return ''
    let limpio = numero.replace(/@c\.us|@lid|@s\.whatsapp\.net/gi, '')
    limpio = limpio.replace(/\+/g, '').replace(/\s/g, '')
    if (limpio.length === 10) limpio = '57' + limpio
    return limpio
}

function variantesNumeroCliente(raw) {
    const s = String(raw || '')
    const limpio = limpiarNumero(s)
    return [...new Set([s, limpio].filter(Boolean))]
}

async function buscarChatPorClienteNumero(clienteChatId) {
    const vars = variantesNumeroCliente(clienteChatId)
    if (vars.length === 0) return { rows: [] }
    return pool.query(
        `SELECT * FROM chats WHERE cliente_numero = ANY($1::text[])
         ORDER BY ultimo_mensaje_hora DESC NULLS LAST, id DESC LIMIT 1`,
        [vars]
    )
}

async function obtenerChatBasico(chatId) {
    const r = await pool.query(`SELECT id, agente_id, estado, cliente_numero FROM chats WHERE id = $1`, [chatId])
    return r.rows[0] || null
}

function puedeVerChat(agente, chat) {
    if (!agente || !chat) return false
    if (agente.rol === 'admin') return true
    if (Number(chat.agente_id) === Number(agente.id)) return true
    if (chat.estado === 'cerrado') return true
    return false
}

async function requireChatAccess(req, res, next) {
    try {
        const chatId = Number(req.params.chatId || req.params.id || req.body?.chat_id)
        const chat = await obtenerChatBasico(chatId)
        if (!chat) return res.status(404).json({ error: 'Chat no encontrado' })
        if (!puedeVerChat(req.agente, chat)) return res.status(403).json({ error: 'Sin acceso a este chat' })
        req.chat = chat
        next()
    } catch (e) {
        console.error(e)
        res.status(500).json({ error: 'Error validando acceso al chat' })
    }
}

const MENU_PRINCIPAL = `¡Bienvenido a *M@stv Producciones!* Soy *megabot*, tu nuevo asistente:

Escoja una de las siguientes opciones:

*1* : Pagar mi factura.
*2* : Conocer nuestros planes.
*3* : Cobertura.
*4* : Adquirir nuestros servicios.
*5* : Puntos de pago y oficinas.
*6* : Facturación y cartera.
*7* : Soporte aplicación M@STV PLAY.
*8* : Calidad de la red.
*9* : Soporte técnico.
*0* : Finalizar.`

const MENSAJES_AUTOMATICOS = [
    'bienvenido a', 'escoja una de las siguientes opciones', 'pagar mi factura',
    'conocer nuestros planes', 'cobertura', 'adquirir nuestros servicios',
    'puntos de pago y oficinas', 'facturación y cartera', 'soporte aplicación',
    'calidad de la red', 'soporte técnico', 'finalizar', 'regresar al menú',
    'gracias por comunicarse', 'en unos momentos usted será atendido',
    'regresar al menú principal', 'hasta pronto', 'atención humana finalizada'
]

function esMensajeAutomatico(mensaje) {
    if (!mensaje) return false
    const msgLower = mensaje.toLowerCase()
    return MENSAJES_AUTOMATICOS.some(auto => msgLower.includes(auto.toLowerCase()))
}

// ========================================
// VERIFICAR ESTADO DEL CHAT PARA EL BOT
// ========================================
router.get('/chat/estado/:numero', async (req, res) => {
    try {
        const { numero } = req.params;
        const numeroLimpio = numero.replace(/\+/g, '').replace(/\s/g, '');
        
        const result = await pool.query(
            `SELECT id, estado, agente_id, en_espera FROM chats 
             WHERE cliente_numero = $1 
             ORDER BY ultimo_mensaje_hora DESC NULLS LAST, id DESC LIMIT 1`,
            [numeroLimpio]
        );
        
        if (result.rows.length === 0) {
            return res.json({ activo: false, motivo: 'no_chat', con_agente: false });
        }
        
        const chat = result.rows[0];
        const activo = chat.estado === 'abierto';
        const conAgente = chat.agente_id !== null;
        
        res.json({
            activo: activo,
            chat_id: chat.id,
            estado: chat.estado,
            agente_id: chat.agente_id,
            con_agente: conAgente,
            en_espera: chat.en_espera
        });
    } catch (error) {
        console.error('Error verificando estado del chat:', error);
        res.status(500).json({ error: 'Error verificando estado' });
    }
});

// ========================================
// VERIFICAR SI HAY AGENTES DISPONIBLES
// ========================================
router.get('/chat/hay-agentes-disponibles', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT COUNT(*) as total FROM agentes 
            WHERE estado = 'disponible'
            AND rol != 'admin'
            AND ultima_actividad > NOW() - INTERVAL '5 minutes'
        `);
        const hayAgentes = parseInt(result.rows[0]?.total || 0) > 0;
        console.log(`🔍 Verificación disponibilidad: ${hayAgentes ? 'SÍ' : 'NO'} hay agentes (${result.rows[0]?.total || 0})`);
        res.json({ hay_agentes: hayAgentes, total: parseInt(result.rows[0]?.total || 0) });
    } catch (error) {
        console.error('Error verificando disponibilidad:', error);
        res.json({ hay_agentes: false, total: 0 });
    }
});

// ========================================
// MARCAR CHAT EN ESPERA (desde el bot)
// ========================================
router.post('/chat/marcar-espera', async (req, res) => {
    try {
        const { numero, nombre, asignar_ahora } = req.body;
        const numeroLimpio = numero.replace(/\+/g, '').replace(/\s/g, '');
        
        console.log(`📝 Marcando chat para ${numeroLimpio} - asignar_ahora: ${asignar_ahora}`);
        
        let chatResult = await pool.query(
            `SELECT id, en_espera, agente_id, cliente_nombre FROM chats 
             WHERE cliente_numero = $1 
             ORDER BY ultimo_mensaje_hora DESC LIMIT 1`,
            [numeroLimpio]
        );
        
        let chatId;
        let clienteNombre = nombre || numeroLimpio;
        
        if (chatResult.rows.length === 0) {
            const newChat = await pool.query(
                `INSERT INTO chats (cliente_nombre, cliente_numero, estado, en_espera, ultimo_mensaje, created_at)
                 VALUES ($1, $2, 'abierto', false, 'Cliente validado', CURRENT_TIMESTAMP) RETURNING id`,
                [clienteNombre, numeroLimpio]
            );
            chatId = newChat.rows[0].id;
            console.log(`✅ Nuevo chat ${chatId} creado para ${numeroLimpio}`);
        } else {
            chatId = chatResult.rows[0].id;
            clienteNombre = chatResult.rows[0].cliente_nombre || clienteNombre;
            console.log(`ℹ️ Chat existente ${chatId} para ${numeroLimpio}`);
        }
        
        if (asignar_ahora === true) {
            if (chatResult.rows[0].agente_id !== null) {
                const agenteActual = await pool.query(`SELECT nombre FROM agentes WHERE id = $1`, [chatResult.rows[0].agente_id]);
                console.log(`ℹ️ Chat ${chatId} ya tiene agente asignado: ${agenteActual.rows[0]?.nombre || 'Desconocido'}. No se reasignará.`);
                return res.json({ success: true, asignado: false, ya_asignado: true, chat_id: chatId });
            }
            
            const agenteDisponible = await pool.query(`
                SELECT id, nombre FROM agentes 
                WHERE estado = 'disponible'
                AND rol != 'admin'
                AND ultima_actividad > NOW() - INTERVAL '5 minutes'
                ORDER BY (
                    SELECT COUNT(*) FROM chats WHERE agente_id = agentes.id AND estado = 'abierto'
                ) ASC
                LIMIT 1
            `);
            
            if (agenteDisponible.rows.length > 0) {
                const agenteId = agenteDisponible.rows[0].id;
                const agenteNombre = agenteDisponible.rows[0].nombre;
                
                console.log(`✅ Asignando chat ${chatId} a ${agenteNombre} (ID: ${agenteId}) inmediatamente`);
                
                await pool.query(`
                    UPDATE chats SET agente_id = $1, en_espera = false WHERE id = $2
                `, [agenteId, chatId]);
                
                await pool.query(`
                    INSERT INTO mensajes (chat_id, texto, emisor, tipo, estado)
                    VALUES ($1, $2, 'sistema', 'sistema', 'entregado')
                `, [chatId, `👤 Asesor asignado: ${agenteNombre}`]);
                
                const mensajeBienvenida = await textoBienvenidaDesdePlantilla(agenteNombre);
                
                await pool.query(`
                    INSERT INTO mensajes (chat_id, texto, emisor, tipo, estado)
                    VALUES ($1, $2, 'agente', 'asesor', 'entregado')
                `, [chatId, mensajeBienvenida]);
                
                try {
                    await postAlBot('/send-message', { 
                        numero: numeroLimpio, 
                        mensaje: mensajeBienvenida 
                    });
                    console.log(`✅ Saludo enviado a ${numeroLimpio}`);
                } catch (err) {
                    console.warn('⚠️ Error enviando saludo por WhatsApp:', err.message);
                }
                
                try {
                    await postAlBot('/clear-state', { numero: numeroLimpio });
                    console.log(`🧹 Estado del bot limpiado para ${numeroLimpio}`);
                } catch (err) {
                    console.warn('⚠️ Error limpiando estado:', err.message);
                }
                
                const io = req.app.get('io');
                io.to(`agente_${agenteId}`).emit('nuevo-mensaje-cliente', {
                    chat_id: chatId,
                    mensaje: mensajeBienvenida,
                    cliente: clienteNombre,
                    agente_id: agenteId
                });
                io.emit('recargar-chats', { motivo: 'nuevo_chat_asignado', agente_id: agenteId, chat_id: chatId });
                
                return res.json({ success: true, asignado: true, agente: agenteNombre, chat_id: chatId });
            } else {
                console.log(`⏳ No hay asesores disponibles para ${numeroLimpio}, chat en espera`);
                await pool.query(`
                    UPDATE chats SET en_espera = true, agente_id = NULL WHERE id = $1
                `, [chatId]);
                
                await pool.query(`
                    INSERT INTO mensajes (chat_id, texto, emisor, tipo, estado)
                    VALUES ($1, $2, 'sistema', 'sistema', 'entregado')
                `, [chatId, '⏳ Chat en espera. En breve un asesor lo atenderá.']);
            }
        } else {
            await pool.query(`
                UPDATE chats SET en_espera = true, agente_id = NULL WHERE id = $1
            `, [chatId]);
            
            await pool.query(`
                INSERT INTO mensajes (chat_id, texto, emisor, tipo, estado)
                VALUES ($1, $2, 'sistema', 'sistema', 'entregado')
            `, [chatId, '⏳ Chat en espera. En breve un asesor lo atenderá.']);
        }
        
        const io = req.app.get('io');
        io.emit('recargar-chats', { motivo: 'chat_en_espera' });
        
        res.json({ success: true, asignado: false, chat_id: chatId });
    } catch (error) {
        console.error('❌ Error marcando chat en espera:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================
// CONFIGURACIÓN DEL SISTEMA (ADMIN)
// ========================================

router.get('/admin/configuracion', requireAuth, async (req, res) => {
    try {
        if (req.agente.rol !== 'admin') {
            return res.status(403).json({ error: 'Solo administradores' });
        }
        
        const configuraciones = [
            'mensaje_bienvenida_general',
            'mensaje_validacion_datos',
            'mensaje_cierre',
            'mensaje_soporte_tecnico'
        ];
        
        const result = {};
        for (const clave of configuraciones) {
            const dbResult = await pool.query(
                `SELECT valor FROM configuracion WHERE clave = $1`,
                [clave]
            );
            result[clave] = dbResult.rows[0]?.valor || '';
        }
        
        if (!result.mensaje_bienvenida_general) {
            result.mensaje_bienvenida_general = "Hola, gracias por comunicarte. Mi nombre es [NOMBRE_AGENTE]. ¿En qué puedo ayudarte?";
        }
        if (!result.mensaje_validacion_datos) {
            result.mensaje_validacion_datos = "Con el fin de garantizar la protección de datos personales, realizaremos una validación de seguridad.\n\nIndíqueme por favor la siguiente información:\n• Nombre completo y cédula del titular de la cuenta\n• Correo electrónico\n• Dirección del servicio\n• Valor de su facturación mensual";
        }
        if (!result.mensaje_cierre) {
            result.mensaje_cierre = "✅ Atención finalizada. Gracias por contactarnos.";
        }
        if (!result.mensaje_soporte_tecnico) {
            result.mensaje_soporte_tecnico = "🖥️ En unos momentos usted será atendido por un asesor de soporte técnico, por favor espere en la línea.";
        }
        
        res.json(result);
    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        res.status(500).json({ error: 'Error obteniendo configuración' });
    }
});

router.put('/admin/configuracion', requireAuth, async (req, res) => {
    try {
        if (req.agente.rol !== 'admin') {
            return res.status(403).json({ error: 'Solo administradores' });
        }
        
        const { mensaje_bienvenida_general, mensaje_validacion_datos, mensaje_cierre, mensaje_soporte_tecnico } = req.body;
        
        if (mensaje_bienvenida_general !== undefined) {
            await pool.query(
                `INSERT INTO configuracion (clave, valor) VALUES ('mensaje_bienvenida_general', $1) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
                [mensaje_bienvenida_general]
            );
        }
        
        if (mensaje_validacion_datos !== undefined) {
            await pool.query(
                `INSERT INTO configuracion (clave, valor) VALUES ('mensaje_validacion_datos', $1) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
                [mensaje_validacion_datos]
            );
        }
        
        if (mensaje_cierre !== undefined) {
            await pool.query(
                `INSERT INTO configuracion (clave, valor) VALUES ('mensaje_cierre', $1) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
                [mensaje_cierre]
            );
        }
        
        if (mensaje_soporte_tecnico !== undefined) {
            await pool.query(
                `INSERT INTO configuracion (clave, valor) VALUES ('mensaje_soporte_tecnico', $1) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor`,
                [mensaje_soporte_tecnico]
            );
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error guardando configuración:', error);
        res.status(500).json({ error: 'Error guardando configuración' });
    }
});

router.get('/configuracion/mensaje-soporte-tecnico', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT valor FROM configuracion WHERE clave = 'mensaje_soporte_tecnico'`
        );
        const mensaje = result.rows[0]?.valor || '🖥️ En unos momentos usted será atendido por un asesor de soporte técnico, por favor espere en la línea.';
        res.json({ mensaje });
    } catch (error) {
        console.error('Error obteniendo mensaje soporte técnico:', error);
        res.status(500).json({ error: 'Error obteniendo mensaje' });
    }
});

// ========================================
// MODO FALLA
// ========================================

router.get('/admin/modo-falla', requireAuth, async (req, res) => {
    try {
        if (req.agente.rol !== 'admin') {
            return res.status(403).json({ error: 'Solo administradores' });
        }
        
        const activo = await pool.query(`SELECT valor FROM configuracion WHERE clave = 'modo_falla_activo'`);
        const mensaje = await pool.query(`SELECT valor FROM configuracion WHERE clave = 'modo_falla_mensaje'`);
        const zona = await pool.query(`SELECT valor FROM configuracion WHERE clave = 'modo_falla_zona'`);
        
        res.json({
            activo: activo.rows[0]?.valor === 'true',
            mensaje: mensaje.rows[0]?.valor || '',
            zona: zona.rows[0]?.valor || ''
        });
    } catch (error) {
        console.error('Error obteniendo modo falla:', error);
        res.status(500).json({ error: 'Error obteniendo configuración' });
    }
});

router.post('/admin/modo-falla', requireAuth, async (req, res) => {
    try {
        if (req.agente.rol !== 'admin') {
            return res.status(403).json({ error: 'Solo administradores' });
        }
        
        const { activo, mensaje, zona } = req.body;
        
        await pool.query(
            `UPDATE configuracion SET valor = $1 WHERE clave = 'modo_falla_activo'`,
            [activo ? 'true' : 'false']
        );
        
        if (mensaje !== undefined) {
            await pool.query(
                `UPDATE configuracion SET valor = $1 WHERE clave = 'modo_falla_mensaje'`,
                [mensaje]
            );
        }
        
        if (zona !== undefined) {
            await pool.query(
                `UPDATE configuracion SET valor = $1 WHERE clave = 'modo_falla_zona'`,
                [zona]
            );
        }
        
        if (activo === true) {
            const result = await pool.query(`
                UPDATE chats 
                SET estado = 'cerrado', 
                    cerrado_por = $1, 
                    cerrado_en = CURRENT_TIMESTAMP 
                WHERE estado = 'abierto'
                RETURNING id, cliente_numero
            `, [req.agente.id]);
            
            console.log(`🔒 Modo falla activado: ${result.rowCount} chats cerrados`);
            
            for (const chat of result.rows) {
                try {
                    await postAlBot('/send-message', {
                        numero: chat.cliente_numero,
                        mensaje: `🔴 El sistema ha entrado en modo mantenimiento. Por favor, espere mientras normalizamos el servicio.`
                    });
                } catch (err) {
                    console.log(`⚠️ No se pudo notificar al cliente ${chat.cliente_numero}`);
                }
            }
            
            const io = req.app.get('io');
            io.emit('recargar-chats', { motivo: 'modo_falla_activado' });
        }
        
        const io = req.app.get('io');
        io.emit('modo-falla-actualizado', { activo, mensaje, zona });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error guardando modo falla:', error);
        res.status(500).json({ error: 'Error guardando configuración' });
    }
});

// ========================================
// OBTENER TODOS LOS CHATS
// ========================================
router.get('/chats', requireAuth, async (req, res) => {
    try {
        const agenteId = Number(req.agente.id)
        const esAdmin = req.agente.rol === 'admin'
        
        await actualizarActividadAgente(agenteId)

        let result;
        
        if (esAdmin) {
            result = await pool.query(`
                SELECT 
                    chats.*,
                    agentes.usuario AS agente_usuario,
                    agentes.nombre AS agente_nombre
                FROM chats
                LEFT JOIN agentes ON chats.agente_id = agentes.id
                ORDER BY chats.ultimo_mensaje_hora DESC NULLS LAST, chats.created_at DESC
            `);
        } else {
            result = await pool.query(`
                SELECT 
                    chats.*,
                    agentes.usuario AS agente_usuario,
                    agentes.nombre AS agente_nombre
                FROM chats
                LEFT JOIN agentes ON chats.agente_id = agentes.id
                WHERE chats.agente_id = $1
                ORDER BY chats.ultimo_mensaje_hora DESC NULLS LAST, chats.created_at DESC
            `, [agenteId]);
        }
        
        res.json(result.rows)
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Error obteniendo chats' })
    }
})

// ========================================
// OBTENER CHAT POR ID
// ========================================
router.get('/chats/:id', requireAuth, requireChatAccess, async (req, res) => {
    try {
        const { id } = req.params
        const result = await pool.query(`
            SELECT c.*, 
                   a.usuario AS agente_usuario,
                   a.nombre AS agente_nombre
            FROM chats c
            LEFT JOIN agentes a ON c.agente_id = a.id
            WHERE c.id = $1
        `, [id])
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Chat no encontrado' })
        }
        
        res.json(result.rows[0])
    } catch (error) {
        console.error('Error obteniendo chat por ID:', error)
        res.status(500).json({ error: 'Error obteniendo chat' })
    }
})

// ========================================
// OBTENER MENSAJES DE UN CHAT
// ========================================
router.get('/mensajes/:chatId', requireAuth, requireChatAccess, async (req, res) => {
    try {
        const { chatId } = req.params
        const { page = 1, limit = 50, before_id } = req.query

        let query = `SELECT * FROM mensajes WHERE chat_id = $1`
        const params = [chatId]
        let paramIndex = 2

        if (before_id) {
            query += ` AND id < $${paramIndex}`
            params.push(before_id)
            paramIndex++
        }

        query += ` ORDER BY hora DESC, id DESC LIMIT $${paramIndex}`
        params.push(limit)

        const result = await pool.query(query, params)
        const countResult = await pool.query(
            `SELECT COUNT(*) as total FROM mensajes WHERE chat_id = $1`, [chatId]
        )
        const messages = result.rows.reverse()
        
        for (const msg of messages) {
            if (msg.mensaje_respondido_id) {
                const respondidoResult = await pool.query(
                    `SELECT id, texto, emisor, tipo, url_adjunto FROM mensajes WHERE id = $1`,
                    [msg.mensaje_respondido_id]
                )
                if (respondidoResult.rows.length > 0) {
                    msg.mensaje_respondido = respondidoResult.rows[0]
                }
            }
        }

        res.json({
            messages,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: result.rows.length === parseInt(limit),
                lastId: messages.length > 0 ? messages[0].id : null
            }
        })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Error obteniendo mensajes' })
    }
})

// ========================================
// BUSCAR MENSAJES DENTRO DE UN CHAT
// ========================================
router.get('/mensajes/:chatId/buscar', requireAuth, requireChatAccess, async (req, res) => {
    try {
        const { chatId } = req.params
        const { q, tipo, fecha, page = 1, limit = 20 } = req.query

        const offset = (page - 1) * limit
        let query = `SELECT * FROM mensajes WHERE chat_id = $1`
        const params = [chatId]
        let paramIndex = 2

        if (tipo === 'images') {
            query += ` AND tipo IN ('imagen', 'image')`
        } else if (tipo === 'videos') {
            query += ` AND tipo = 'video'`
        } else if (tipo === 'files') {
            query += ` AND tipo IN ('archivo', 'documento', 'file', 'document')`
        } else if (tipo === 'date' && fecha) {
            query += ` AND DATE(hora) = $${paramIndex}`
            params.push(fecha)
            paramIndex++
        } else if (tipo === 'text' && q && q.trim().length >= 2) {
            const searchTerm = q.trim()
            const tsQuery = searchTerm.split(' ').join(' & ')
            query += ` AND to_tsvector('spanish', texto) @@ to_tsquery('spanish', $${paramIndex})`
            params.push(tsQuery)
            paramIndex++
        } else if (tipo === 'all' && q && q.trim().length >= 2) {
            const searchTerm = q.trim()
            const tsQuery = searchTerm.split(' ').join(' & ')
            query += ` AND (
                to_tsvector('spanish', texto) @@ to_tsquery('spanish', $${paramIndex})
                OR texto ILIKE $${paramIndex + 1}
                OR (metadata_archivo::text ILIKE $${paramIndex + 1})
            )`
            params.push(tsQuery, `%${searchTerm}%`)
            paramIndex += 2
        }

        query += ` ORDER BY hora DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
        params.push(limit, offset)

        const result = await pool.query(query, params)
        
        let countQuery = `SELECT COUNT(*) as total FROM mensajes WHERE chat_id = $1`
        const countParams = [chatId]
        let countIndex = 2
        
        if (tipo === 'images') {
            countQuery += ` AND tipo IN ('imagen', 'image')`
        } else if (tipo === 'videos') {
            countQuery += ` AND tipo = 'video'`
        } else if (tipo === 'files') {
            countQuery += ` AND tipo IN ('archivo', 'documento', 'file', 'document')`
        } else if (tipo === 'date' && fecha) {
            countQuery += ` AND DATE(hora) = $${countIndex}`
            countParams.push(fecha)
            countIndex++
        } else if ((tipo === 'text' || tipo === 'all') && q && q.trim().length >= 2) {
            const searchTerm = q.trim()
            const tsQuery = searchTerm.split(' ').join(' & ')
            countQuery += ` AND to_tsvector('spanish', texto) @@ to_tsquery('spanish', $${countIndex})`
            countParams.push(tsQuery)
        }
        
        const countResult = await pool.query(countQuery, countParams)

        res.json({
            mensajes: result.rows,
            total: parseInt(countResult.rows[0].total),
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        })
    } catch (error) {
        console.error('Error en búsqueda de mensajes:', error)
        res.status(500).json({ error: 'Error buscando mensajes' })
    }
})

// ========================================
// ENVIAR MENSAJE (AGENTE → CLIENTE)
// ========================================
router.post('/mensajes', requireAuth, requireChatAccess, async (req, res) => {
    try {
        const { chat_id, texto, tipo, url_adjunto, metadata_archivo, mensaje_respondido_id, whatsapp_message_id: whatsapp_message_id_from_frontend } = req.body
        const agente_id = Number(req.agente.id)
        const emisor = 'agente'
        const textoTrim = (texto || '').trim()
        const urlAdj = url_adjunto || null
        const tipoM = tipo || 'texto'
        const mensajeRespondidoId = mensaje_respondido_id || null

        await actualizarActividadAgente(agente_id)

        const tiposPermitidos = ['texto', 'imagen', 'video', 'audio', 'documento', 'archivo', 'location']
        if (tipoM && !tiposPermitidos.includes(tipoM)) {
            return res.status(400).json({ error: `Tipo de archivo no permitido. Tipos válidos: ${tiposPermitidos.join(', ')}` })
        }

        const previewUltimo = textoTrim
            || (tipoM === 'imagen' ? '📷 Imagen'
                : tipoM === 'video' ? '🎥 Video'
                : tipoM === 'audio' ? '🎵 Audio'
                : tipoM === 'documento' ? '📄 Documento'
                : tipoM === 'location' ? '📍 Ubicación'
                : urlAdj ? '📎 Archivo' : '')

        if (/^end$/i.test(textoTrim) && !urlAdj) {
            try {
                await ejecutarCierreHumano({
                    chat_id,
                    agente_id,
                    detalleSistema: (nombre) => `🔒 Chat cerrado por ${nombre} — comando *end* desde el panel`
                })
                return res.json({ comando_end: true, chat_id })
            } catch (e) {
                if (e.code === 'YA_CERRADO') return res.status(400).json({ error: 'El chat ya está cerrado' })
                if (e.code === 'NO_CHAT') return res.status(404).json({ error: 'Chat no encontrado' })
                if (e.code === 'NO_AGENTE') return res.status(400).json({ error: 'Agente no válido' })
                throw e
            }
        }

        if (!textoTrim && !urlAdj) {
            return res.status(400).json({ error: 'Mensaje o archivo requerido' })
        }

        const textoGuardado = textoTrim || previewUltimo
        console.log(`📨 Recibido mensaje de ${emisor}: ${String(textoGuardado).substring(0, 40)}...`)

        if (req.chat.agente_id == null) {
            await pool.query(`UPDATE chats SET agente_id = $1 WHERE id = $2 AND agente_id IS NULL`, [agente_id, chat_id])
            req.chat.agente_id = agente_id
        }

        const result = await pool.query(
            `INSERT INTO mensajes (chat_id, texto, emisor, tipo, url_adjunto, metadata_archivo, estado, mensaje_respondido_id)
             VALUES ($1, $2, $3, $4, $5, $6, 'enviado', $7) RETURNING *`,
            [chat_id, textoGuardado, emisor, tipoM, urlAdj, metadata_archivo || null, mensajeRespondidoId]
        )
        
        let mensajeRespondido = null
        if (mensajeRespondidoId) {
            console.log(`🔍 Buscando mensaje respondido ID: ${mensajeRespondidoId}`)
            const respondidoResult = await pool.query(
                `SELECT id, texto, emisor, tipo, url_adjunto, whatsapp_message_id FROM mensajes WHERE id = $1`,
                [mensajeRespondidoId]
            )
            if (respondidoResult.rows.length > 0) {
                mensajeRespondido = respondidoResult.rows[0]
                console.log(`✅ Mensaje respondido encontrado:`, mensajeRespondido)
            } else {
                console.log(`❌ Mensaje respondido no encontrado para ID: ${mensajeRespondidoId}`)
            }
        }
        
        const mensajeEnviado = result.rows[0]
        if (mensajeRespondido) {
            mensajeEnviado.mensaje_respondido = mensajeRespondido
        }

        await pool.query(
            `UPDATE chats SET ultimo_mensaje = $1, ultimo_mensaje_hora = CURRENT_TIMESTAMP WHERE id = $2`,
            [previewUltimo || textoGuardado, chat_id]
        )

        const chatData = await pool.query(`SELECT cliente_numero FROM chats WHERE id = $1`, [chat_id])
        if (chatData.rows.length > 0) {
            const numeroDestino = numeroParaBot(chatData.rows[0].cliente_numero)
            console.log(`📤 Enviando al bot - Número: ${numeroDestino}, Mensaje: ${textoTrim || '(archivo)'}`)
            try {
                let quotedData = null
                if (mensajeRespondidoId) {
                    const whatsappId = whatsapp_message_id_from_frontend || (mensajeRespondido?.whatsapp_message_id);
                    
                    if (whatsappId) {
                        quotedData = {
                            id: whatsappId,
                            texto: mensajeRespondido?.texto || '',
                            emisor: mensajeRespondido?.emisor || ''
                        }
                        console.log(`📝 Enviando mensaje citado al bot - ID WhatsApp: ${quotedData.id}`)
                    } else {
                        console.log(`⚠️ No hay whatsapp_message_id disponible para citar mensaje ID: ${mensajeRespondidoId}`)
                    }
                }

                if (urlAdj) {
                    await postAlBot('/send-media', {
                        numero: numeroDestino,
                        url: urlAdj,
                        caption: textoTrim || '',
                        quoted_message: quotedData
                    })
                } else {
                    await postAlBot('/send-message', {
                        numero: numeroDestino,
                        mensaje: textoTrim,
                        quoted_message: quotedData
                    })
                }
                console.log(`✅ Mensaje enviado al cliente ${numeroDestino}`)

                try {
                    const lastMsgResponse = await postAlBot('/get-last-message', { numero: numeroDestino })
                    if (lastMsgResponse?.data?.whatsapp_message_id) {
                        await pool.query(
                            `UPDATE mensajes SET whatsapp_message_id = $1 WHERE id = $2`,
                            [lastMsgResponse.data.whatsapp_message_id, mensajeEnviado.id]
                        )
                        console.log(`✅ whatsapp_message_id actualizado: ${lastMsgResponse.data.whatsapp_message_id}`)
                    }
                } catch (e) {
                    console.log(`⚠️ No se pudo obtener whatsapp_message_id del bot: ${e.message}`)
                }
            } catch (err) {
                console.warn('⚠️ Bot no disponible, mensaje guardado en BD pero no enviado a WhatsApp:', err.message)
            }
        }

        const io = req.app.get('io')
        console.log(`📢 Emitiendo socket evento mensaje-recibido para chat_id: ${chat_id}`)
        io.emit('mensaje-recibido', { chat_id, mensaje: mensajeEnviado })

        res.json(mensajeEnviado)
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Error guardando mensaje' })
    }
})

// ========================================
// MARCAR MENSAJES COMO LEÍDOS
// ========================================
router.put('/mensajes/:chatId/leer', requireAuth, requireChatAccess, async (req, res) => {
    try {
        const { chatId } = req.params
        await pool.query(
            `UPDATE mensajes SET leido = true, leido_en = CURRENT_TIMESTAMP, estado = 'leido'
             WHERE chat_id = $1 AND emisor = 'cliente'`,
            [chatId]
        )
        await pool.query(`UPDATE chats SET no_leidos = 0 WHERE id = $1`, [chatId])
        res.json({ success: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Error marcando mensajes' })
    }
})

// ========================================
// OBTENER TODOS LOS AGENTES
// ========================================
router.get('/agentes', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, usuario, nombre, email, avatar, estado, rol, ultima_actividad, total_chats_atendidos, tiempo_promedio_respuesta
            FROM agentes ORDER BY nombre ASC
        `)
        res.json(result.rows)
    } catch (error) {
        console.error('❌ Error en GET /agentes:', error)
        res.status(500).json({ error: 'Error obteniendo agentes' })
    }
})

// ========================================
// OBTENER PERFIL DE ASESOR CON ESTADÍSTICAS
// ========================================
router.get('/agentes/:id/perfil', requireAuth, async (req, res) => {
    try {
        const { id } = req.params
        const { dias = 30 } = req.query

        const agenteInfo = await pool.query(
            `SELECT id, usuario, nombre, email, avatar, estado, rol, ultima_actividad, total_chats_atendidos, tiempo_promedio_respuesta
             FROM agentes WHERE id = $1`,
            [id]
        )
        if (agenteInfo.rows.length === 0) return res.status(404).json({ error: 'Agente no encontrado' })

        const estadisticas = await pool.query(
            `SELECT 
                SUM(chats_atendidos) as total_chats,
                SUM(mensajes_enviados) as total_mensajes_enviados,
                SUM(mensajes_recibidos) as total_mensajes_recibidos,
                AVG(tiempo_promedio_respuesta) as avg_tiempo_respuesta,
                SUM(chats_cerrados) as total_chats_cerrados,
                AVG(valoracion_promedio) as avg_valoracion
             FROM estadisticas_agentes
             WHERE agente_id = $1 AND fecha >= CURRENT_DATE - INTERVAL '1 day' * $2`,
            [id, dias]
        )

        const chatsActivos = await pool.query(
            `SELECT COUNT(*) as total FROM chats WHERE agente_id = $1 AND estado = 'abierto'`, [id]
        )

        const historialReciente = await pool.query(
            `SELECT h.*, c.cliente_nombre, c.cliente_numero
             FROM historial_chats h
             LEFT JOIN chats c ON h.chat_id = c.id
             WHERE h.agente_id = $1
             ORDER BY h.fecha_cierre DESC LIMIT 10`,
            [id]
        )

        res.json({
            agente: agenteInfo.rows[0],
            estadisticas: estadisticas.rows[0] || {},
            chats_activos: parseInt(chatsActivos.rows[0]?.total || 0),
            historial_reciente: historialReciente.rows
        })
    } catch (error) {
        console.error('Error obteniendo perfil de asesor:', error)
        res.status(500).json({ error: 'Error obteniendo perfil de asesor' })
    }
})

// ========================================
// OBTENER HISTORIAL DE CHATS CON PAGINACIÓN
// ========================================
router.get('/historial-chats', requireAuth, async (req, res) => {
    try {
        const agenteId = Number(req.agente.id)
        const esAdmin = req.agente.rol === 'admin'
        const { page = 1, limit = 20, estado, cliente } = req.query
        const offset = (page - 1) * limit

        let whereClause = ''
        let params = []
        let paramIndex = 1

        if (!esAdmin) {
            whereClause = `WHERE h.agente_id = $${paramIndex}`
            params.push(agenteId)
            paramIndex++
        }
        if (estado) {
            whereClause += whereClause ? ` AND h.estado_final = $${paramIndex}` : `WHERE h.estado_final = $${paramIndex}`
            params.push(estado)
            paramIndex++
        }
        if (cliente) {
            whereClause += whereClause
                ? ` AND (h.cliente_nombre ILIKE $${paramIndex} OR h.cliente_numero ILIKE $${paramIndex})`
                : `WHERE (h.cliente_nombre ILIKE $${paramIndex} OR h.cliente_numero ILIKE $${paramIndex})`
            params.push(`%${cliente}%`)
            paramIndex++
        }

        const result = await pool.query(
            `SELECT h.*, a.nombre as agente_nombre
             FROM historial_chats h
             LEFT JOIN agentes a ON h.agente_id = a.id
             ${whereClause}
             ORDER BY h.fecha_cierre DESC
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            [...params, limit, offset]
        )
        const countResult = await pool.query(
            `SELECT COUNT(*) as total FROM historial_chats h ${whereClause}`, params
        )

        res.json({
            chats: result.rows,
            total: parseInt(countResult.rows[0].total),
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(parseInt(countResult.rows[0].total) / limit)
        })
    } catch (error) {
        console.error('Error obteniendo historial de chats:', error)
        res.status(500).json({ error: 'Error obteniendo historial de chats' })
    }
})

// ========================================
// ACTUALIZAR ESTADO DE AGENTE
// ========================================
router.put('/agentes/:id/estado', requireAuth, async (req, res) => {
    console.log(`🚨 [ENDPOINT] PUT /agentes/:id/estado llamado - ID: ${req.params.id}, Body: ${JSON.stringify(req.body)}`)
    try {
        const { id } = req.params
        const { estado } = req.body
        const solicitanteId = Number(req.agente.id)
        const esAdmin = req.agente.rol === 'admin'
        const io = req.app.get('io')

        const estadosValidos = ['disponible', 'ocupado', 'descanso']
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ error: `Estado no válido. Estados permitidos: ${estadosValidos.join(', ')}` })
        }

        console.log(`📝 [ESTADO] Actualizando agente ${id} a estado: ${estado} (solicitante: ${solicitanteId}, admin: ${esAdmin})`)

        if (!esAdmin && Number(id) !== solicitanteId) {
            console.log(`❌ [ESTADO] Permiso denegado para agente ${id}`)
            return res.status(403).json({ error: 'Sin permiso' })
        }

        await pool.query(`UPDATE agentes SET estado = $1, ultima_actividad = CURRENT_TIMESTAMP WHERE id = $2`, [estado, id])
        console.log(`✅ [ESTADO] Agente ${id} actualizado a ${estado}`)
        
        if (estado === 'disponible') {
            const agenteInfo = await pool.query(`SELECT nombre FROM agentes WHERE id = $1`, [id])
            const agenteNombre = agenteInfo.rows[0]?.nombre || 'Soporte'
            
            console.log(`🔍 [ASIGNACIÓN] Agente ${agenteNombre} (ID: ${id}) disponible. Buscando chats en espera...`)
            
            const chatsEnEspera = await pool.query(`
                SELECT c.id, c.cliente_nombre, c.cliente_numero, c.created_at
                FROM chats c
                WHERE c.en_espera = true 
                AND c.estado = 'abierto'
                AND c.agente_id IS NULL
                ORDER BY c.created_at ASC
            `)
            
            console.log(`📋 [ASIGNACIÓN] Encontrados ${chatsEnEspera.rows.length} chats en espera`)
            
            for (const chat of chatsEnEspera.rows) {
                console.log(`✅ Asignando chat ${chat.id} a ${agenteNombre}`)
                
                await pool.query(`
                    UPDATE chats SET agente_id = $1, en_espera = false WHERE id = $2
                `, [id, chat.id])
                
                await pool.query(`
                    INSERT INTO mensajes (chat_id, texto, emisor, tipo, estado)
                    VALUES ($1, $2, 'sistema', 'sistema', 'entregado')
                `, [chat.id, `👤 Asesor asignado: ${agenteNombre}`])
                
                const mensajeBienvenida = await textoBienvenidaDesdePlantilla(agenteNombre)
                await pool.query(`
                    INSERT INTO mensajes (chat_id, texto, emisor, tipo, estado)
                    VALUES ($1, $2, 'agente', 'asesor', 'entregado')
                `, [chat.id, mensajeBienvenida])
                
                try {
                    await postAlBot('/send-message', { 
                        numero: chat.cliente_numero, 
                        mensaje: mensajeBienvenida 
                    })
                    console.log(`✅ Saludo enviado a ${chat.cliente_numero}`)
                } catch (err) {
                    console.warn('⚠️ Error enviando saludo:', err.message)
                }
                
                try {
                    await postAlBot('/clear-state', { numero: chat.cliente_numero })
                    console.log(`🧹 Estado del bot limpiado para ${chat.cliente_numero}`)
                } catch (err) {
                    console.warn('⚠️ Error limpiando estado del bot:', err.message)
                }
                
                io.to(`agente_${id}`).emit('nuevo-mensaje-cliente', {
                    chat_id: chat.id,
                    mensaje: mensajeBienvenida,
                    cliente: chat.cliente_nombre || 'Usuario',
                    agente_id: parseInt(id)
                })
                
                io.emit('recargar-chats', { motivo: 'nuevo_chat_asignado', agente_id: parseInt(id) })
                
                console.log(`✅ Chat ${chat.id} asignado a ${agenteNombre}`)
            }
            
            if (chatsEnEspera.rows.length === 0) {
                console.log(`ℹ️ No hay chats en espera para asignar a ${agenteNombre}`)
            }
        } else {
            console.log(`👤 Agente ${id} cambió a estado ${estado} - No se le asignarán chats`)
        }
        
        io.emit('agente-estado-cambiado', { agente_id: parseInt(id), estado: estado })
        
        res.json({ success: true })
    } catch (error) {
        console.error('❌ Error actualizando estado:', error)
        res.status(500).json({ error: 'Error actualizando estado' })
    }
})

// ========================================
// ACTUALIZAR DATOS DE AGENTE
// ========================================
router.put('/agentes/:id', requireAuth, async (req, res) => {
    try {
        const { id } = req.params
        const { nombre, email, mensaje_bienvenida } = req.body
        const solicitanteId = Number(req.agente.id)
        const esAdmin = req.agente.rol === 'admin'

        if (!esAdmin && Number(id) !== solicitanteId) return res.status(403).json({ error: 'Sin permiso' })

        const result = await pool.query(
            `UPDATE agentes SET nombre = COALESCE($1, nombre), email = COALESCE($2, email),
             mensaje_bienvenida = COALESCE($3, mensaje_bienvenida) WHERE id = $4
             RETURNING id, usuario, nombre, email, estado, rol, mensaje_bienvenida`,
            [nombre, email, mensaje_bienvenida, id]
        )
        res.json(result.rows[0])
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Error actualizando agente' })
    }
})

// ========================================
// LOGIN (CORREGIDO - SIN ACTIVACIÓN AUTOMÁTICA)
// ========================================
router.post('/login', async (req, res) => {
    try {
        const { usuario, password } = req.body
        const result = await pool.query(
            `SELECT id, usuario, password, nombre, email, avatar, estado, rol FROM agentes WHERE usuario = $1`,
            [usuario]
        )
        if (result.rows.length === 0) return res.status(401).json({ success: false, error: 'Credenciales incorrectas' })

        const agente = result.rows[0]
        const stored = String(agente.password || '')
        const isHash = stored.startsWith('$2a$') || stored.startsWith('$2b$') || stored.startsWith('$2y$')
        const ok = isHash ? await bcrypt.compare(String(password || ''), stored) : String(password || '') === stored
        if (!ok) return res.status(401).json({ success: false, error: 'Credenciales incorrectas' })

        if (!isHash) {
            const hash = await bcrypt.hash(String(password || ''), 10)
            try { await pool.query(`UPDATE agentes SET password = $1 WHERE id = $2`, [hash, agente.id]) } catch (_) { }
        }

        const agenteSafe = {
            id: agente.id,
            usuario: agente.usuario,
            nombre: agente.nombre,
            email: agente.email,
            avatar: agente.avatar,
            estado: agente.estado,
            rol: agente.rol
        }
        
        console.log(`✅ Agente ${agenteSafe.nombre} (ID: ${agente.id}) inició sesión. Estado actual: ${agente.estado}`);
        
        const token = signToken(agenteSafe)
        res.json({ success: true, agente: agenteSafe, token })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, error: 'Error en el servidor' })
    }
})

// ========================================
// LOGOUT
// ========================================
router.post('/logout', requireAuth, async (req, res) => {
    try {
        const agenteId = Number(req.agente.id)
        await pool.query(`UPDATE agentes SET estado = 'descanso' WHERE id = $1`, [agenteId])
        console.log(`👤 Agente ${agenteId} cerró sesión manualmente`)
        res.json({ success: true })
    } catch (error) {
        console.error('❌ Error en logout:', error)
        res.status(500).json({ error: 'Error cerrando sesión' })
    }
})

// ========================================
// OBTENER PLANTILLAS DE RESPUESTA
// ========================================
router.get('/plantillas', requireAuth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id, nombre, texto, categoria FROM plantillas WHERE activa = true ORDER BY categoria ASC, nombre ASC`
        )
        res.json(result.rows)
    } catch (error) {
        console.error('Error obteniendo plantillas:', error)
        res.status(500).json({ error: 'Error obteniendo plantillas' })
    }
})

// ========================================
// CREAR PLANTILLA DE RESPUESTA
// ========================================
router.post('/plantillas', requireAuth, async (req, res) => {
    try {
        const { nombre, texto, categoria } = req.body
        const agenteId = Number(req.agente.id)

        if (req.agente.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden crear plantillas' })

        const result = await pool.query(
            `INSERT INTO plantillas (nombre, texto, categoria, creada_por, activa)
             VALUES ($1, $2, $3, $4, true) RETURNING *`,
            [nombre, texto, categoria || 'general', agenteId]
        )
        res.json(result.rows[0])
    } catch (error) {
        console.error('Error creando plantilla:', error)
        res.status(500).json({ error: 'Error creando plantilla' })
    }
})

// ========================================
// CREAR NUEVO CHAT (PARA AGENTES)
// ========================================
router.post('/chats', requireAuth, async (req, res) => {
    try {
        let { cliente_nombre, cliente_numero } = req.body
        cliente_numero = limpiarNumero(cliente_numero)

        const chatExistente = await pool.query(
            `SELECT * FROM chats WHERE cliente_numero = $1 ORDER BY id DESC LIMIT 1`,
            [cliente_numero]
        )

        if (chatExistente.rows.length > 0) {
            const chat = chatExistente.rows[0]
            if (chat.estado === 'cerrado') {
                await pool.query(
                    `UPDATE chats SET estado = 'abierto', agente_id = $1, en_espera = false WHERE id = $2`,
                    [req.agente.id, chat.id]
                )
                chat.estado = 'abierto'
                chat.agente_id = req.agente.id
                return res.json(chat)
            }
            if (chat.agente_id && chat.agente_id !== req.agente.id) {
                return res.status(400).json({ error: 'Ya existe un chat activo con este número asignado a otro agente' })
            }
            if (!chat.agente_id) {
                await pool.query(
                    `UPDATE chats SET agente_id = $1, en_espera = false WHERE id = $2`,
                    [req.agente.id, chat.id]
                )
                chat.agente_id = req.agente.id
            }
            return res.json(chat)
        }

        const result = await pool.query(
            `INSERT INTO chats (cliente_nombre, cliente_numero, agente_id, estado, ultimo_mensaje)
             VALUES ($1, $2, $3, 'abierto', $4) RETURNING *`,
            [cliente_nombre || 'Cliente', cliente_numero, req.agente.id, '']
        )

        res.json(result.rows[0])
    } catch (error) {
        console.error('Error creando chat:', error)
        res.status(500).json({ error: 'Error al crear chat' })
    }
})

// ========================================
// REABRIR CHAT
// ========================================
router.put('/chats/:id/reabrir', requireAuth, requireChatAccess, async (req, res) => {
    try {
        const { id } = req.params
        const agente_id = Number(req.agente.id)

        const result = await pool.query(
            `UPDATE chats SET estado = 'abierto', agente_id = $1, en_espera = false WHERE id = $2 RETURNING *`,
            [agente_id, id]
        )

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Chat no encontrado' })
        }

        res.json(result.rows[0])
    } catch (error) {
        console.error('Error reabriendo chat:', error)
        res.status(500).json({ error: 'Error al reabrir chat' })
    }
})

// ========================================
// CERRAR CHAT
// ========================================
router.put('/chats/:id/cerrar', requireAuth, requireChatAccess, async (req, res) => {
    try {
        const { id } = req.params
        const agente_id = Number(req.agente.id)

        await ejecutarCierreHumano({
            chat_id: id,
            agente_id,
            detalleSistema: (nombre) => `🔒 Chat cerrado por ${nombre}`
        })
        res.json({ success: true })
    } catch (error) {
        if (error.code === 'YA_CERRADO') return res.status(400).json({ error: 'El chat ya está cerrado' })
        if (error.code === 'NO_AGENTE') return res.status(400).json({ error: 'Agente no válido' })
        if (error.code === 'NO_CHAT') return res.status(404).json({ error: 'Chat no encontrado' })
        console.log(error)
        res.status(500).json({ error: 'Error cerrando chat' })
    }
})

// ========================================
// TRANSFERIR CHAT
// ========================================
router.put('/chats/:id/transferir', requireAuth, requireChatAccess, async (req, res) => {
    try {
        const { id } = req.params
        const { nuevo_agente_id, motivo } = req.body
        const agente_actual_id = Number(req.agente.id)
        if (!nuevo_agente_id) return res.status(400).json({ error: 'nuevo_agente_id requerido' })

        const deAgente = await pool.query('SELECT nombre FROM agentes WHERE id = $1', [agente_actual_id])
        const aAgente = await pool.query('SELECT nombre FROM agentes WHERE id = $1', [nuevo_agente_id])

        await pool.query(
            `INSERT INTO transferencias (chat_id, de_agente_id, a_agente_id, realizado_por, motivo) VALUES ($1, $2, $3, $2, $4)`,
            [id, agente_actual_id, nuevo_agente_id, motivo || null]
        )
        await pool.query(`UPDATE chats SET agente_id = $1 WHERE id = $2`, [nuevo_agente_id, id])
        await pool.query(
            `INSERT INTO mensajes (chat_id, texto, emisor, tipo, estado) VALUES ($1, $2, 'sistema', 'sistema', 'entregado')`,
            [id, `🔄 Transferido de ${deAgente.rows[0].nombre} a ${aAgente.rows[0].nombre}`]
        )
        res.json({ success: true })
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: 'Error transfiriendo chat' })
    }
})

// ========================================
// CERRAR CHAT POR INACTIVIDAD O MODO FALLA
// ========================================
router.post('/chats/cerrar-por-inactividad', async (req, res) => {
    try {
        const { numero, motivo } = req.body;
        
        const result = await pool.query(`
            UPDATE chats 
            SET estado = 'cerrado', 
                cerrado_en = CURRENT_TIMESTAMP,
                motivo_cierre = $2
            WHERE cliente_numero = $1 
            AND estado = 'abierto'
            RETURNING id
        `, [numero, motivo || 'inactividad']);
        
        console.log(`🔒 Chat ${result.rows[0]?.id} cerrado por ${motivo || 'inactividad'} para ${numero}`);
        
        const io = req.app.get('io');
        io.emit('recargar-chats', { motivo: 'chat_cerrado_por_inactividad' });
        
        res.json({ success: true, cerrado: result.rowCount > 0 });
    } catch (error) {
        console.error('Error cerrando chat por inactividad:', error);
        res.status(500).json({ error: 'Error cerrando chat' });
    }
});

// ========================================
// WEBHOOK - RECIBIR MENSAJE DE WHATSAPP
// ========================================
router.post('/webhook/whatsapp', async (req, res) => {
    try {
        const { 
            chatId: waChatId, 
            numero, 
            mensaje, 
            nombre, 
            url_adjunto, 
            tipo: tipoWa, 
            quoted_message_id, 
            quoted_message_text, 
            whatsapp_message_id,
            es_ubicacion,
            latitud,
            longitud,
            nombre_ubicacion,
            direccion_ubicacion,
            es_flujo_bot
        } = req.body

        const clienteChatId = waChatId || numero
        const numeroMostrar = clienteChatId.replace(/@c\.us|@lid|@s\.whatsapp\.net/gi, '')
        const clienteNombre = nombre || numeroMostrar
        const numeroCanonico = numeroParaBot(clienteChatId) || String(clienteChatId).replace(/@c\.us|@lid|@s\.whatsapp\.net/gi, '').replace(/\+/g, '').replace(/\s/g, '')

        let textoCliente = (mensaje || '').trim()

        console.log(`📨 Webhook - ${numeroCanonico}: ${textoCliente.substring(0, 50)} | archivo: ${url_adjunto ? 'SÍ' : 'NO'} | tipo: ${tipoWa} | ubicación: ${es_ubicacion ? 'SÍ' : 'NO'} | es_flujo_bot: ${es_flujo_bot}`)

        let esUbicacion = es_ubicacion === true || (latitud && longitud) || false
        let ubicacionLat = latitud || null
        let ubicacionLng = longitud || null
        let ubicacionNombre = nombre_ubicacion || null
        let ubicacionDireccion = direccion_ubicacion || null

        if (!esUbicacion && textoCliente) {
            const coordRegex = /(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/
            const match = textoCliente.match(coordRegex)
            if (match) {
                const lat = parseFloat(match[1])
                const lng = parseFloat(match[2])
                if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                    esUbicacion = true
                    ubicacionLat = lat
                    ubicacionLng = lng
                    console.log(`📍 Ubicación detectada en texto: ${lat}, ${lng}`)
                }
            }
        }

        const enBlacklist = await usuarioEnSoporteHumano(numeroCanonico);
        console.log(`🔍 Usuario ${numeroCanonico} en blacklist: ${enBlacklist}`);

        let chat = await buscarChatPorClienteNumero(numeroCanonico)
        let chatIdBD
        let esReabierto = false

        if (chat.rows.length === 0) {
            // Solo crear chat si el cliente completó validación (está en blacklist)
            const debeCrearChat = enBlacklist === true;
            if (debeCrearChat) {
                const nuevoChat = await pool.query(
                    `INSERT INTO chats (cliente_nombre, cliente_numero, estado, en_espera, ultimo_mensaje, created_at)
                     VALUES ($1, $2, 'abierto', false, $3, CURRENT_TIMESTAMP) RETURNING id`,
                    [clienteNombre, numeroCanonico, textoCliente || (url_adjunto ? '📎 Archivo' : (esUbicacion ? '📍 Ubicación compartida' : ''))]
                )
                chatIdBD = nuevoChat.rows[0].id
                console.log(`✅ Nuevo chat ${chatIdBD} creado para ${numeroCanonico}`);
            } else {
                console.log(`ℹ️ Cliente ${numeroCanonico} en flujo de bot, no se crea chat`);
                return res.json({ success: true, processedByBot: true });
            }
        } else {
            chatIdBD = chat.rows[0].id
            console.log(`ℹ️ Chat existente: ${chatIdBD}, estado=${chat.rows[0].estado}, agente_id=${chat.rows[0].agente_id}, en_espera=${chat.rows[0].en_espera}`)

            if (chat.rows[0].estado === 'cerrado') {
                await pool.query(`
                    UPDATE chats 
                    SET estado = 'abierto', 
                        en_espera = false, 
                        agente_id = NULL,
                        cerrado_por = NULL, 
                        cerrado_en = NULL 
                    WHERE id = $1
                `, [chatIdBD])
                esReabierto = true
                console.log(`✅ Chat ${chatIdBD} reabierto`)
                
                chat = await pool.query(`SELECT * FROM chats WHERE id = $1`, [chatIdBD])
            }
            
            if (clienteNombre && clienteNombre !== chat.rows[0].cliente_nombre) {
                await pool.query(`UPDATE chats SET cliente_nombre = $1 WHERE id = $2`, [clienteNombre, chatIdBD])
            }
        }
        
        if (!chatIdBD) {
            return res.json({ success: true, processedByBot: true });
        }
        
        let tipoMensaje = 'texto'
        let textoMostrar = textoCliente;
        let mensajeRespondidoIdCliente = null;

        if (esUbicacion) {
            tipoMensaje = 'location'
            textoMostrar = `📍 Ubicación compartida`
            if (ubicacionNombre) textoMostrar += `: ${ubicacionNombre}`
            if (ubicacionDireccion && !ubicacionNombre) textoMostrar += `: ${ubicacionDireccion}`
        }

        if (quoted_message_id || quoted_message_text) {
            if (quoted_message_id) {
                const porWaId = await pool.query(
                    `SELECT id FROM mensajes WHERE chat_id = $1 AND whatsapp_message_id = $2 LIMIT 1`,
                    [chatIdBD, quoted_message_id]
                )
                if (porWaId.rows.length > 0) {
                    mensajeRespondidoIdCliente = porWaId.rows[0].id
                    console.log(`📝 Mensaje citado encontrado por whatsapp_message_id, ID BD: ${mensajeRespondidoIdCliente}`)
                }
            }
            if (!mensajeRespondidoIdCliente && quoted_message_text) {
                const porTexto = await pool.query(
                    `SELECT id FROM mensajes WHERE chat_id = $1 AND texto ILIKE $2 ORDER BY hora DESC LIMIT 1`,
                    [chatIdBD, `%${quoted_message_text}%`]
                )
                if (porTexto.rows.length > 0) {
                    mensajeRespondidoIdCliente = porTexto.rows[0].id
                    console.log(`📝 Mensaje citado encontrado por texto, ID BD: ${mensajeRespondidoIdCliente}`)
                }
            }
        }
        
        if (url_adjunto && url_adjunto !== '' && !esUbicacion) {
            const extension = url_adjunto.split('.').pop().toLowerCase()
            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) {
                tipoMensaje = 'imagen'
                textoMostrar = textoCliente || '📷 Imagen'
            } else if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) {
                tipoMensaje = 'video'
                textoMostrar = textoCliente || '🎥 Video'
            } else if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
                tipoMensaje = 'audio'
                textoMostrar = textoCliente || '🎵 Audio'
            } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(extension)) {
                tipoMensaje = 'documento'
                textoMostrar = textoCliente || '📄 Documento'
            } else {
                tipoMensaje = 'archivo'
                textoMostrar = textoCliente || '📎 Archivo'
            }
        } else if (tipoWa === 'imagen' && !esUbicacion) {
            tipoMensaje = 'imagen'
            textoMostrar = textoCliente || '📷 Imagen'
        } else if (tipoWa === 'video' && !esUbicacion) {
            tipoMensaje = 'video'
            textoMostrar = textoCliente || '🎥 Video'
        } else if (tipoWa === 'audio' && !esUbicacion) {
            tipoMensaje = 'audio'
            textoMostrar = textoCliente || '🎵 Audio'
        } else if (tipoWa === 'documento' && !esUbicacion) {
            tipoMensaje = 'documento'
            textoMostrar = textoCliente || '📄 Documento'
        }

        let metadataArchivo = null
        if (esUbicacion && ubicacionLat && ubicacionLng) {
            metadataArchivo = JSON.stringify({
                latitud: ubicacionLat,
                longitud: ubicacionLng,
                nombre: ubicacionNombre,
                direccion: ubicacionDireccion,
                tipo: 'ubicacion'
            })
        }

        const result = await pool.query(
            `INSERT INTO mensajes (chat_id, texto, emisor, tipo, url_adjunto, metadata_archivo, estado, hora, mensaje_respondido_id, whatsapp_message_id)
             VALUES ($1, $2, 'cliente', $3, $4, $5, 'entregado', CURRENT_TIMESTAMP, $6, $7) RETURNING *`,
            [chatIdBD, textoMostrar, tipoMensaje, url_adjunto || null, metadataArchivo, mensajeRespondidoIdCliente, whatsapp_message_id || null]
        )
        
        let mensajeRespondidoCliente = null
        if (mensajeRespondidoIdCliente) {
            const respondidoResult = await pool.query(
                `SELECT id, texto, emisor, tipo, url_adjunto FROM mensajes WHERE id = $1`,
                [mensajeRespondidoIdCliente]
            )
            if (respondidoResult.rows.length > 0) {
                mensajeRespondidoCliente = respondidoResult.rows[0]
            }
        }
        
        const mensajeGuardado = result.rows[0]
        if (mensajeRespondidoCliente) {
            mensajeGuardado.mensaje_respondido = mensajeRespondidoCliente
        }
        
        console.log(`✅ Mensaje guardado - tipo: ${tipoMensaje}`)
        
        await pool.query(
            `UPDATE chats SET ultimo_mensaje = $1, ultimo_mensaje_hora = CURRENT_TIMESTAMP, no_leidos = no_leidos + 1 WHERE id = $2`,
            [textoMostrar, chatIdBD]
        )
        
        if (enBlacklist && !chat.rows[0]?.agente_id) {
            await pool.query(`
                UPDATE chats SET en_espera = true WHERE id = $1 AND agente_id IS NULL
            `, [chatIdBD]);
            console.log(`📌 Chat ${chatIdBD} marcado como en_espera`);
            
            const io = req.app.get('io');
            io.emit('chat-en-espera', { 
                chat_id: chatIdBD, 
                cliente: clienteNombre,
                numero: numeroCanonico
            });
        }
        
        const asgRow = await pool.query(`SELECT agente_id FROM chats WHERE id = $1`, [chatIdBD])
        const io = req.app.get('io');
        io.emit('nuevo-mensaje-cliente', {
            chat_id: chatIdBD,
            mensaje: textoMostrar,
            cliente: clienteNombre,
            agente_id: asgRow.rows[0]?.agente_id,
            url_adjunto: url_adjunto || null,
            tipo: tipoMensaje,
            es_ubicacion: esUbicacion,
            latitud: ubicacionLat,
            longitud: ubicacionLng,
            nombre_ubicacion: ubicacionNombre,
            direccion_ubicacion: ubicacionDireccion
        })

        res.json({ success: true })
    } catch (error) {
        console.error('❌ Error en webhook:', error)
        res.status(500).json({ error: 'Error procesando mensaje' })
    }
})

module.exports = router
