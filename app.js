const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const axios = require('axios');
const express = require('express');
const cors = require('cors');
const FormData = require('form-data');

// ========================================
// WEBSOCKET CLIENT PARA MODO FALLA
// ========================================
let modoFallaActivoCache = false;
let modoFallaMensajeCache = "";
let modoFallaZonaCache = "";
let modoFallaActualizadoPorWebsocket = false;
let backendSocket = null;

function conectarWebSocketBackend() {
    try {
        const { io: ioSocket } = require('socket.io-client');
        
        backendSocket = ioSocket('http://localhost:9020', {
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            auth: {}
        });
        
        backendSocket.on('connect', () => {
            console.log('✅ Bot conectado al WebSocket del backend');
        });
        
        backendSocket.on('modo-falla-actualizado', (data) => {
            console.log('📢 Modo falla actualizado vía WebSocket:', data);
            modoFallaActivoCache = data.activo;
            modoFallaMensajeCache = data.mensaje || '';
            modoFallaZonaCache = data.zona || '';
            modoFallaActualizadoPorWebsocket = true;
            console.log(`🔄 Caché actualizada instantáneamente: activo=${modoFallaActivoCache}, zona=${modoFallaZonaCache}`);
        });
        
        backendSocket.on('disconnect', () => {
            console.log('⚠️ Bot desconectado del WebSocket del backend');
        });
        
        backendSocket.on('connect_error', (error) => {
            console.log('❌ Error conectando WebSocket:', error.message);
        });
        
    } catch (error) {
        console.log('⚠️ No se pudo establecer WebSocket:', error.message);
    }
}

conectarWebSocketBackend();

setInterval(async () => {
    try {
        const response = await axios.get(`http://localhost:9020/api/admin/modo-falla`, { timeout: 5000 });
        if (!modoFallaActualizadoPorWebsocket) {
            modoFallaActivoCache = response.data?.activo || false;
            modoFallaMensajeCache = response.data?.mensaje || "";
            modoFallaZonaCache = response.data?.zona || "";
        }
        modoFallaActualizadoPorWebsocket = false;
    } catch (error) {
        console.log("⚠️ No se pudo actualizar caché de modo falla");
    }
}, 30000);

// ─────────────────────────────────────────────
//  CONFIGURACIÓN CENTRAL
// ─────────────────────────────────────────────
const CONFIG = {
    BACKEND_URL: 'http://localhost:9020',
    BOT_PORT: 9019,
    AUTH_DATA_PATH: './.wwebjs_auth',
    INACTIVITY_WARNING_MS: 3 * 60 * 1000,
    INACTIVITY_CLOSE_MS: 2 * 60 * 1000,
    INACTIVITY_CHECK_INTERVAL_MS: 30 * 1000,
};

// ─────────────────────────────────────────────
//  ESTADO Y ARCHIVOS
// ─────────────────────────────────────────────
const STATE_FILE = path.join(__dirname, 'estado-bot.json');

const ESTADOS = {
    ESPERANDO_NAVEGACION: 'esperando_navegacion',
    ESPERANDO_CONTINUIDAD: 'esperando_continuidad',
    ESPERANDO_VALIDACION: 'esperando_validacion',
    ESPERANDO_CEDULA_FACTURA: 'esperando_cedula_factura',
    ESPERANDO_ACCION_FACTURA: 'esperando_accion_factura',
    ESPERANDO_ACCION_PAGO: 'esperando_accion_pago',
    ESPERANDO_COMPROBANTE_PAGO: 'esperando_comprobante_pago',
    ESPERANDO_MEDIO_PAGO: 'esperando_medio_pago',
    ESPERANDO_TITULAR_NEQUI: 'esperando_titular_nequi',
    ESPERANDO_ARCHIVO_COMPROBANTE: 'esperando_archivo_comprobante',
    ESPERANDO_COMPROBANTE_PAGO: 'esperando_comprobante_pago',
    ESPERANDO_MEDIO_PAGO: 'esperando_medio_pago',
    ESPERANDO_TITULAR_NEQUI: 'esperando_titular_nequi',
    ESPERANDO_ARCHIVO_COMPROBANTE: 'esperando_archivo_comprobante',
    ESPERANDO_MEDIO_PAGO: 'esperando_medio_pago',
    ESPERANDO_TITULAR_NEQUI: 'esperando_titular_nequi',
    ESPERANDO_ARCHIVO_COMPROBANTE: 'esperando_archivo_comprobante'
};

let userState = new Map();
let blacklist = new Map();
let lastActivity = new Map();
let inactivityWarningSentAt = new Map();
let messageCache = new Map();

// ─────────────────────────────────────────────
//  MENSAJES
// ─────────────────────────────────────────────
const MENU_NAVEGACION       = '*1.* Regresar al menú principal\n*2.* Finalizar';
const MENU_CONTINUIDAD      = '⏳ ¿Deseas continuar con la conversación?\n\n*1.* Sí\n*2.* Finalizar';
const MENSAJE_POR_DEFECTO   = 'Hola, soy *megabot* de *M@stv Producciones*. Escribe *hola* para iniciar.';
const MENSAJE_DESPEDIDA     = '👋 Gracias por comunicarte con *M@stv Producciones*. ¡Hasta pronto!';
const MENSAJE_DESPEDIDA_INACTIVIDAD = '👋 La conversación ha finalizado por inactividad. Si desea continuar más adelante, escríbenos de nuevo.';
const MENSAJE_ATENCION_FINALIZADA   = '✅ Atención finalizada.';
const MENSAJE_AUDIO_NO_SOPORTADO_CLIENTE = '🎤 No es posible enviar audios. Por favor, escriba su mensaje por texto para que el asesor pueda leerlo.';

// MENSAJE UNIFICADO DE AUSENCIA (UN SOLO MENSAJE COMPLETO)
const MENSAJE_NO_DISPONIBLE = `🔴 En estos momentos no tenemos asesores disponibles.

📞 Horario de atención:
📅 Lunes a Sábados: 7:00 AM - 10:00 PM
📅 Domingos y Festivos: 8:00 AM - 4:00 PM

Por favor, déjenos sus datos y en qué le podemos ayudar, en breve un asesor se comunicará con usted.

- Nombre completo y cédula del titular de la cuenta
- Correo electrónico
- Dirección del servicio
- Valor de su facturación mensual
- Novedad que presenta

Por favor escriba el tipo y número de documento de identificación del titular de la cuenta sin puntos, comas o guiones (ejemplo: cédula 54526205)

*ES OBLIGATORIO DEJAR AL MENOS SU INQUIETUD PARA QUE NUESTROS ASESORES PUEDAN VER SU CHAT Y AYUDARLE*`;

const MENSAJE_VALIDACION = `Con el fin de garantizar la protección de datos personales, realizaremos una validación de seguridad. 

Indíqueme por favor la siguiente información: 
- Nombre completo y cédula del titular de la cuenta
- Correo electrónico
- Dirección del servicio
- Valor de su facturación mensual

Por favor escriba el tipo y número de documento de identificación del titular de la cuenta sin puntos, comas o guiones (ejemplo: cédula 54526205)

*ES OBLIGATORIO DAR SUS DATOS PARA PODER VALIDARLOS E IDENTIFICAR AL TITULAR  Y ASI UNO DE NUESTROS ASESORES PUEDA VER SU CHAT Y AYUDARLE*`;

function getMenuPrincipal() {
    return `¡Bienvenido a *M@stv Producciones!* Soy *megabot*, tu nuevo asistente:

Escoja una de las siguientes opciones:

*1* : Consultar mi estado de cuenta / pagar mi factura.
*2* : Conocer nuestros planes.
*3* : Cobertura.
*4* : Adquirir nuestros servicios.
*5* : Puntos de pago y oficinas.
*6* : Facturación y cartera.
*7* : Soporte aplicación M@STV PLAY o WIN+.
*8* : Calidad de la red.
*9* : Soporte técnico.
*0* : Finalizar.`;
}

function getOpciones() {
    return {
'1': `💳 *Pago de factura:*

Ahora puede realizar sus pagos en línea de forma rápida y segura con PSE, sin necesidad de enviar soporte, ya que el registro es automático: 
https://zonapagos.mastvproducciones.net.co/

*Recuerde que la fecha límite de pagos es hasta el día 18 de cada mes.*
*Despues del 18 CORRE RIESGO DE SUSPENSIÓN*

Otros medios de pago:

- *Cuenta de ahorros davivienda:* 450470295970
O por convenio: 1443399 a nombre de *Mastv Producciones* NIT 900943073

- *Cuenta de ahorros Bancolombia #convenio:* 90307
- *Desde nequi con la opción enviar a bancos:* (cuenta de ahorros Bancolombia) 37200001455

*Recuerde que si utiliza un medio de pago DIFERENTE A ZONAPAGOS(LINK) u OFICINA FISICA es NECESARIO ENVIAR EL SOPORTE a un ASESOR de M@sTV.*

*1.* Regresar al menú principal
*2.* Finalizar`,

'2': `📡 *Planes*: 

Conoce nuestros planes en: 
https://www.mastvproducciones.net.co/nuestros-planes/

*1.* Regresar al menú principal
*2.* Finalizar`,

'3': `🗺️ *Cobertura*: 

Consulta nuestra cobertura en: 
https://www.mastvproducciones.net.co/cobertura/

*1.* Regresar al menú principal
*2.* Finalizar`,

'4': `🛒 *Adquirir nuestros servicios*: 

La afiliación no tiene costo.
La instalación no tiene costo en el casco urbano.
Para afiliarse, necesita:

- Fotocopia de la cédula
- Fotocopia del recibo de agua o luz del domicilio donde se va ainstalar el servicio.
- El valor a cancelar del plan en el cual está interesad@ (paga el primer mes por anticipado).

Tenga en cuenta que el servicio de televisión es para 2 puntos de tv.
Los puntos adicionales de TV tienen un costo adicional que depende directamente de la zona donde se adquiera el servicio.

*La instalación se realiza de 1-4 días hábiles después de realizar la afiliación y el pago.*

Debe acercarse a la oficina o punto autorizado mas cercano, o solicitar la ayuda a un asesor para realizar el proceso de forma virtual.

*1.* Regresar al menú principal
*2.* Finalizar`,

'5': `📍 *OFICINAS M@STV PRODUCCIONES*:

🏢 FACATATIVÁ (Principal)
Calle 11 #7A-04, Diurba

🏢 MADRID
Calle 12 #3-64, Barrio Arrayanes

🏢 BOJACÁ
Carrera 6 #5-144, Barrio Centro

🏢 EL ROSAL
Carrera 8 #8-06, Local 6, Centro

🏢 GIRARDOT
Carrera 10 #18-44, Barrio Centro

🏢 CACHIPAY
Carrera 3 #3-36, Barrio Centro

🏢 SASAIMA
Calle 2 #3-30, Barrio 3 Esquinas

🏢 LA MESA
Calle 8 #16-59, Barrio Santa Bárbara

🏢 ANOLAIMA
Calle 4 #3-25, Barrio Centro

🏢 MESITAS DEL COLEGIO
Calle 10 #6-37, Barrio Centro

🏢 ANAPOIMA
Carrera 2 #7-32, Local 2, Barrio Centro

🏢 TOCAIMA
Calle 4 #9-69/75 Barrio Centro

🏢 VILLETA
Carrera 5 #3-43, Local 6 Barrio Centro

🏢 ACACÍAS
Calle 15 #22-40, Local 12, Edificio Dark Gym

🏢 SAN MARTÍN
Calle 7 #5-34, Barrio Fundadores

🏢 GUAMAL
Transversal 4a # 9-54, Barrio Las Villas

📍 *PUNTOS AUTORIZADOS FACATATIVÁ*:

1. 🎳 Bolos el Tunjo
   Carrera 2 #6-105

2. ✏️ Papeleria Yulieth
   Calle 19 #1A-57 Sur - Prado de Cartagenita

3. 🏠 Portal de María
   Transversal 11 #5-04 Este - Manzana 5 Casa 30

4. 📝 Papelería Exprésate
   Calle 8 #10-05 - Zambrano

5. 📚 Papelería One Books
   Diagonal 5 Este #9E-02 - Juan Pablo II

6. ✏️ Papelería Chico 1
   Carrera 3 #5B-08 Este

7. 🔧 Servitell
   Calle 6 #3-07 - Centro

8. 🚲 Lys bike
   Carrera 2 # 8-94

9. 📡 Papelería Andrea
   Calle 18 # 1a-57 Barrio Girardot.

📌 *PUNTOS AUTORIZADOS OTROS MUNICIPIOS*:

- ZIPACÓN: Carrera 4 #5-57 (Frente al parque)

- EL TRIUNFO: Carrera 3 #2-40 (Frente al coliseo)

- PRADILLA: Calle 2 #2-08, Local 3

- LA GRAN VÍA: Calle 2 #5-03

- ALBÁN: Carrera 2 #2-53

- GUAYABAL DE SÍQUIMA: Calle 3 #3-07

- PANTANILLO: Drogueria y Minimarket Pantanillo

- QUIPILE: Carrera 2 #6-07

- VIOTÁ: Calle 20 #10-36, (Frente al banco agrario)

- VIOTÁ: Calle 17 #10-62, (Al lado de Nueva EPS)

- SAN JOAQUÍN: Carrera 4 N #4-55, Al lado del árbol-Palo de los aburridos

- APULO: Calle 9 # 4-39 Centro, oficina interrapidisimo

*1.* Regresar al menú principal
*2.* Finalizar`,

'6': `👛 *Facturación y cartera*: 

Para consultas sobre su cuenta,deudas, saldos, acuerdos de pago, etc. 
Comuníquiese al whatsapp 3058304072.

*1.* Regresar al menú principal
*2.* Finalizar`,

'7': `📲 *M@STV PLAY*: 

Para soporte de nuestra aplicación M@STV PLAY o WIN+, 
comuníquiese al whatsapp 3107588395.

*SOLO SE ACEPTAN MENSAJES via whatsapp, NO SE ACEPTAN LLAMADAS* 

*1.* Regresar al menú principal
*2.* Finalizar`,

'8': `📶 *Calidad de la red*: 

Conoce el estado de tu red con nuestro test de velocidad. 
Ingresa aquí: https://www.nperf.com

*1.* Regresar al menú principal
*2.* Finalizar`,

'9': `🖥️ En unos momentos usted será atendido por un asesor de soporte técnico, por favor espere en la línea.`
    };
}

function obtenerMensajePago() {
    return `💳 *Medios de pago:*

Pago en línea con PSE (registro automático):
https://zonapagos.mastvproducciones.net.co/

*Fecha límite: día 18 de cada mes.*
*Después del 18 CORRE RIESGO DE SUSPENSIÓN*

- *Davivienda:* 450470295970 (convenio 1443399 - Mastv Producciones NIT 900943073)
- *Bancolombia convenio:* 90307
- *De Nequi a  → bancos (Bancolombia):* 37200001455 cuenta de ahorros

*Si usa medio diferente a ZONAPAGOS u OFICINA FÍSICA, debe enviar soporte a un asesor.*`;
}

// ─────────────────────────────────────────────
//  LIMPIEZA DE SESIÓN
// ─────────────────────────────────────────────
function limpiarSesionBloqueada() {
    try {
        console.log('🧹 Limpiando procesos antiguos...');
        execSync('pkill -f chrome || true', { stdio: 'ignore' });
        execSync('pkill -f chromium || true', { stdio: 'ignore' });
        const tabsLock = path.join(__dirname, CONFIG.AUTH_DATA_PATH, 'session', 'SingletonSocket');
        if (fs.existsSync(tabsLock)) fs.unlinkSync(tabsLock);
        console.log('✅ Limpieza completada');
    } catch (error) {
        console.log('⚠️ No se pudo limpiar (normal si no hay procesos)');
    }
}

limpiarSesionBloqueada();

// ─────────────────────────────────────────────
//  CLIENTE WHATSAPP
// ─────────────────────────────────────────────
let clientReady = false;

const client = new Client({
    authStrategy: new LocalAuth({ clientId: 'bot-whatsapp', dataPath: CONFIG.AUTH_DATA_PATH }),
    puppeteer: {
        executablePath: "/home/chatbot/.cache/puppeteer/chrome/linux-146.0.7680.153/chrome-linux64/chrome",
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// ─────────────────────────────────────────────
//  SERVIDOR EXPRESS
// ─────────────────────────────────────────────
const appExpress = express();
appExpress.use(cors());
appExpress.use(express.json({ limit: '50mb' }));

appExpress.get('/health', (req, res) => {
    res.json({
        status: clientReady ? 'ready' : 'not_ready',
        clientInfo: clientReady ? client.info?.wid?.user : null,
        uptime: process.uptime()
    });
});

// MODIFICADO: linkPreview: false para quitar el análisis de links
appExpress.post('/send-message', async (req, res) => {
    try {
        if (!clientReady || !client.info) {
            return res.status(503).json({ error: 'Bot no listo' });
        }
        const { numero, mensaje, quoted_message } = req.body;
        const soloDigitos = numero.replace(/@c\.us|@lid|@s\.whatsapp\.net/gi, '').replace(/\+/g, '').replace(/\s/g, '');
        const numeroId = await client.getNumberId(soloDigitos);
        if (!numeroId) return res.status(404).json({ error: 'Número no válido' });

        let options = { linkPreview: false };
        let mensajeFinal = mensaje;
        
        if (quoted_message && quoted_message.id) {
            const cachedMsg = messageCache.get(quoted_message.id);
            if (cachedMsg) {
                try {
                    await cachedMsg.reply(mensaje);
                    res.json({ success: true });
                    return;
                } catch (e) {
                    mensajeFinal = mensaje;
                }
            } else {
                mensajeFinal = mensaje;
            }
        }

        const sentMessage = await client.sendMessage(numeroId._serialized, mensajeFinal, options);

        if (sentMessage && sentMessage.id) {
            messageCache.set(sentMessage.id.id, sentMessage);
            if (messageCache.size > 1000) {
                const firstKey = messageCache.keys().next().value;
                messageCache.delete(firstKey);
            }
        }

        res.json({ success: true, whatsapp_message_id: sentMessage?.id?.id });
    } catch (error) {
        console.error('❌ Error en send-message:', error.message);
        res.status(500).json({ error: error.message });
    }
});

appExpress.post('/send-media', async (req, res) => {
    try {
        if (!clientReady || !client.info) {
            return res.status(503).json({ error: 'Bot no listo' });
        }
        const { numero, url, caption, quoted_message } = req.body;
        const soloDigitos = numero.replace(/@c\.us|@lid|@s\.whatsapp\.net/gi, '').replace(/\+/g, '').replace(/\s/g, '');
        const numeroId = await client.getNumberId(soloDigitos);
        if (!numeroId) return res.status(404).json({ error: 'Número no válido' });
        
        let options = { caption: caption || '', linkPreview: false };
        
        if (quoted_message && quoted_message.id) {
            const cachedMsg = messageCache.get(quoted_message.id);
            if (cachedMsg) {
                try {
                    const media = await MessageMedia.fromUrl(url);
                    const sentMessage = await cachedMsg.reply(media, caption || '');
                    if (sentMessage && sentMessage.id) {
                        messageCache.set(sentMessage.id.id, sentMessage);
                        if (messageCache.size > 1000) {
                            const firstKey = messageCache.keys().next().value;
                            messageCache.delete(firstKey);
                        }
                    }
                    res.json({ success: true, whatsapp_message_id: sentMessage?.id?.id });
                    return;
                } catch (e) {
                    // Fallback a send normal
                }
            }
        }
        
        const media = await MessageMedia.fromUrl(url);
        const sentMessage = await client.sendMessage(numeroId._serialized, media, options);

        if (sentMessage && sentMessage.id) {
            messageCache.set(sentMessage.id.id, sentMessage);
            if (messageCache.size > 1000) {
                const firstKey = messageCache.keys().next().value;
                messageCache.delete(firstKey);
            }
        }

        res.json({ success: true, whatsapp_message_id: sentMessage?.id?.id });
    } catch (error) {
        console.error('❌ Error en send-media:', error.message);
        res.status(500).json({ error: error.message });
    }
});

appExpress.post('/get-last-message', async (req, res) => {
    try {
        if (!clientReady || !client.info) {
            return res.status(503).json({ error: 'Bot no listo' });
        }
        const { numero } = req.body;
        const soloDigitos = numero.replace(/@c\.us|@lid|@s\.whatsapp\.net/gi, '').replace(/\+/g, '').replace(/\s/g, '');
        const numeroId = await client.getNumberId(soloDigitos);
        if (!numeroId) return res.status(404).json({ error: 'Número no válido' });

        const chat = await client.getChatById(numeroId._serialized);
        const messages = await chat.fetchMessages({ limit: 1 });

        if (messages.length > 0) {
            const lastMessage = messages[0];
            res.json({
                whatsapp_message_id: lastMessage.id?.id,
                fromMe: lastMessage.fromMe
            });
        } else {
            res.json({ whatsapp_message_id: null });
        }
    } catch (error) {
        console.error('❌ Error en get-last-message:', error.message);
        res.status(500).json({ error: error.message });
    }
});

appExpress.post('/end-chat', async (req, res) => {
    try {
        if (!clientReady || !client.info) {
            return res.status(503).json({ error: 'Bot no listo' });
        }
        const { numero } = req.body;
        const soloDigitos = numero.replace(/@c\.us|@lid|@s\.whatsapp\.net/gi, '').replace(/\+/g, '').replace(/\s/g, '');
        limpiarEstadoChat(soloDigitos);
        const numeroId = await client.getNumberId(soloDigitos);
        if (numeroId) {
            await client.sendMessage(numeroId._serialized, MENSAJE_ATENCION_FINALIZADA, { linkPreview: false });
            await client.sendMessage(numeroId._serialized, MENSAJE_DESPEDIDA, { linkPreview: false });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

appExpress.post('/clear-state', async (req, res) => {
    try {
        const { numero } = req.body;
        const soloDigitos = numero.replace(/\+/g, '').replace(/\s/g, '');
        blacklist.delete(soloDigitos);
        userState.delete(soloDigitos);
        lastActivity.delete(soloDigitos);
        inactivityWarningSentAt.delete(soloDigitos);
        saveState();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

appExpress.get('/estado/:numero', async (req, res) => {
    try {
        const { numero } = req.params;
        const soloDigitos = numero.replace(/\+/g, '').replace(/\s/g, '');
        const enBlacklist = blacklist.has(soloDigitos);
        const estado = userState.get(soloDigitos);
        res.json({
            numero: soloDigitos,
            en_blacklist: enBlacklist,
            estado: estado || null,
            en_conversacion: userState.has(soloDigitos) || blacklist.has(soloDigitos)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

appExpress.listen(CONFIG.BOT_PORT, '0.0.0.0', () => {
    console.log(`📡 Servidor corriendo en puerto ${CONFIG.BOT_PORT}`);
});

// ─────────────────────────────────────────────
//  PERSISTENCIA
// ─────────────────────────────────────────────
function saveState() {
    try {
        fs.writeFileSync(STATE_FILE, JSON.stringify({
            userState: Object.fromEntries(userState),
            blacklist: Object.fromEntries(blacklist),
            lastActivity: Object.fromEntries(lastActivity),
            inactivityWarningSentAt: Object.fromEntries(inactivityWarningSentAt)
        }, null, 2));
    } catch (e) {
        console.error('❌ Error guardando estado:', e);
    }
}

function loadState() {
    try {
        if (!fs.existsSync(STATE_FILE)) return;
        const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        userState = new Map(Object.entries(data.userState || {}));
        blacklist = new Map(Object.entries(data.blacklist || {}));
        lastActivity = new Map(Object.entries(data.lastActivity || {}));
        inactivityWarningSentAt = new Map(Object.entries(data.inactivityWarningSentAt || {}));
        console.log(`✅ Estado cargado`);
    } catch (e) {
        console.error('❌ Error cargando estado:', e);
    }
}

function setUserState(n, e) { userState.set(n, e); saveState(); }
function deleteUserState(n) { userState.delete(n); saveState(); }
function setBlacklist(n) { blacklist.set(n, true); saveState(); }
function touchActivity(n) { 
    lastActivity.set(n, Date.now()); 
    inactivityWarningSentAt.delete(n); 
    saveState(); 
}
function limpiarEstadoChat(n) {
    userState.delete(n);
    blacklist.delete(n);
    lastActivity.delete(n);
    inactivityWarningSentAt.delete(n);
    saveState();
    console.log(`🧹 Estado limpiado para ${n}`);
}

loadState();

// ─────────────────────────────────────────────
//  UTILIDADES
// ─────────────────────────────────────────────
function normalizarTexto(texto = '') {
    return texto.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function isSaludo(mensaje) {
    const t = normalizarTexto(mensaje);
    const saludos = ['hola', 'hello', 'hi', 'buenos dias', 'buenas tardes', 'buenas noches', 'buen dia', 'buenas', 'saludos', 'hey'];
    return saludos.some(s => t === s || t.startsWith(`${s} `));
}

async function verificarChatActivo(numeroReal) {
    try {
        const response = await axios.get(`${CONFIG.BACKEND_URL}/api/chat/estado/${numeroReal}`, { timeout: 5000 });
        return response.data?.activo === true;
    } catch (error) {
        return true;
    }
}

async function verificarTieneAgente(numeroReal) {
    try {
        const response = await axios.get(`${CONFIG.BACKEND_URL}/api/chat/estado/${numeroReal}`, { timeout: 5000 });
        return response.data?.con_agente === true;
    } catch (error) {
        return false;
    }
}

async function obtenerMensajeValidacion() {
    try {
        const response = await axios.get(`${CONFIG.BACKEND_URL}/api/configuracion/mensaje_validacion_datos`, { timeout: 5000 });
        return response.data?.mensaje || MENSAJE_VALIDACION;
    } catch (error) {
        return MENSAJE_VALIDACION;
    }
}

// ─────────────────────────────────────────────
//  EVENTOS WHATSAPP
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
//  INTEGRACIÓN SOFTV - CONSULTA DE CUENTA
// ─────────────────────────────────────────────
const SOFTV_BASE = 'http://190.131.226.173:8008';
const SOFTV_TOKEN = 'Bearer 0292ffcf47afd366ea8ca7715c1f262bd5bdb08145e1269c639fb65df1f9c2b5f279a575abad458f038f37b1707e694cc9792d6fdfcb99bfaec29c04103e7ae4';

async function consultarCuentaSoftv(clienteId, clienteInfo = null) {
    try {
        const headers = { Authorization: SOFTV_TOKEN };

        // Detectar si es contrato (formato: digitos-digito) o cédula
        let idInterno = clienteId;
        const esContrato = /^\d+-\d+$/.test(clienteId.toString().trim());

        try {
            if (esContrato) {
                // Buscar por número de contrato
                const buscarResp = await axios.get(`${SOFTV_BASE}/clientes/buscar-contrato`, {
                    headers,
                    data: { numero_contrato: clienteId.toString().trim() },
                    timeout: 8000
                });
                if (buscarResp.data && buscarResp.data.length > 0) {
                    idInterno = buscarResp.data[0].cliente_id;
                    clienteInfo = {
                        ...buscarResp.data[0],
                        contrato: clienteId.toString().trim(),
                        Direccion: buscarResp.data[0].Direccion || ''
                    };
                    console.log(`✅ Cliente encontrado por contrato: ID interno ${idInterno}`);
                }
            } else {
                // Buscar por cédula
                const buscarResp = await axios.get(`${SOFTV_BASE}/clientes/buscar`, {
                    headers,
                    data: { tipo_documento: 'Cédula de Identificación', numero_documento: parseInt(clienteId) || clienteId },
                    timeout: 8000
                });
                if (buscarResp.data && buscarResp.data.length > 0) {
                    idInterno = buscarResp.data[0].cliente_id;
                    clienteInfo = buscarResp.data[0];
                    console.log(`✅ Cliente encontrado por cédula: ID interno ${idInterno}`);
                }
            }
        } catch (buscarErr) {
            console.log(`⚠️ Búsqueda falló, intentando con ID directo: ${clienteId}`);
        }

        const [servicioResp, detalleResp] = await Promise.all([
            axios.get(`${SOFTV_BASE}/clientes/${idInterno}/servicio`, { headers, timeout: 8000 }),
            axios.get(`${SOFTV_BASE}/clientes/${idInterno}/servicios-detalle`, { headers, timeout: 8000 })
        ]);

        const servicio = servicioResp.data;
        const detalle = detalleResp.data;

        // Extraer datos del cliente
        const nombreCliente = clienteInfo ? clienteInfo.NOMBRE || "" : "";
        const contrato = clienteInfo ? clienteInfo.contrato || "" : "";
        const direccion = clienteInfo ? clienteInfo.Direccion || "" : "";

        // Extraer datos del servicio
        const infoP = servicio.InformacionPaquete || {};
        const servicios = servicio.servicios || [];
        const tieneInfo = servicios.length > 0 || infoP.paquete_nombre || infoP.proximo_corte;
        if (!tieneInfo) {
            return { ok: false, tipo: "no_encontrado" };
        }

        // Extraer datos del detalle
        const resumen = detalle.resumenPago || {};
        const fechas = detalle.fechasServicio || {};
        const items = detalle.servicios || [];

        const total = resumen.Total != null ? resumen.Total : resumen.subtotal;
        const paquete = infoP.paquete_nombre || "No disponible";

        // Estado general
        const todosInstalados = servicios.every(s => s.status === "Instalado");
        const estadoEmoji = todosInstalados ? "🟢" : "🔴";
        const estadoTexto = todosInstalados ? "Activo" : "Suspendido";

        // Servicios visibles
        const itemsVisibles = items.filter(s => s.DESCORTA && !(s.Importe === 0 && s.DESCORTA.toLowerCase().includes("renta")));
        const descServicios = itemsVisibles.map(s => `  • ${s.DESCORTA}: *$${Number(s.Importe).toLocaleString("es-CO")}*`).join("\n");

        // Construir mensaje visual
        let mensaje = `━━━━━━━━━━━━━━━━━━━━\n`;
        mensaje += `📋 *ESTADO DE CUENTA*\n`;
        mensaje += `━━━━━━━━━━━━━━━━━━━━\n\n`;
        if (nombreCliente) mensaje += `*Titular:* ${nombreCliente}\n`;
        if (contrato) mensaje += `*Contrato:* ${contrato}\n`;
        if (direccion) mensaje += `*Dirección:* ${direccion}\n`;
        mensaje += `\n`;
        mensaje += `${estadoEmoji} *Estado:* ${estadoTexto}\n`;
        mensaje += `*Plan:* ${paquete}\n\n`;
        if (descServicios) mensaje += `*Detalle de servicios:*\n${descServicios}\n\n`;
        if (total != null) mensaje += `*Total a pagar:* *$${Number(total).toLocaleString("es-CO")}*\n`;

        // Lógica de fechas de pago MASTV (1 al 18 de cada mes)
        const hoy = new Date();
        const diaHoy = hoy.getDate();
        const mes = hoy.toLocaleString("es-CO", { month: "long" });
        const anio = hoy.getFullYear();
        const fechaLimite = `18/${String(hoy.getMonth() + 1).padStart(2, "0")}/${anio}`;

        if (diaHoy <= 18) {
            mensaje += `*Pago oportuno hasta:* ${fechaLimite}\n`;
            mensaje += `*Después del 18 corre riesgo de SUSPENSIÓN*\n`;
        } else {
            mensaje += `🔴 *Fecha límite vencida* - Está en riesgo de SUSPENSIÓN\n`;
        }

        if (fechas.periodoPagadoInicio && fechas.periodoPagadoFin) mensaje += `*Período pagado:* ${fechas.periodoPagadoInicio} al ${fechas.periodoPagadoFin}\n`;
        mensaje += `\n━━━━━━━━━━━━━━━━━━━━`;

        const periodoPagado = (fechas.periodoPagadoInicio && fechas.periodoPagadoFin)
            ? `${fechas.periodoPagadoInicio} al ${fechas.periodoPagadoFin}`
            : null;
        return { ok: true, mensaje, clienteInfo, periodoPagado };

    } catch (error) {
        if (error.response && (error.response.status === 404 || error.response.status === 400)) {
            return { ok: false, tipo: 'no_encontrado' };
        }
        console.error('❌ Error consultando SofTV:', error.message);
        return { ok: false, tipo: 'falla_api' };
    }
}

client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('📱 Escanea el QR');
});

client.on('ready', () => {
    clientReady = true;
    console.log('🚀 *megabot* listo!');
});

client.on('authenticated', () => {
    console.log('🔐 Sesión autenticada');
});

client.on('auth_failure', msg => {
    clientReady = false;
    console.error('❌ Fallo de autenticación:', msg);
    process.exit(1);
});

client.on('disconnected', reason => {
    clientReady = false;
    console.log(`🔴 Cliente desconectado: ${reason}`);
    process.exit(1);
});

// ─────────────────────────────────────────────
//  TEMPORIZADOR INACTIVIDAD
// ─────────────────────────────────────────────
setInterval(async () => {
    if (!clientReady || !client.info?.wid) return;
    const now = Date.now();
    for (const [numeroReal, lastTime] of lastActivity.entries()) {
        let tieneAgenteAsignado = false;
        try {
            const response = await axios.get(`${CONFIG.BACKEND_URL}/api/chat/estado/${numeroReal}`, { timeout: 3000 });
            tieneAgenteAsignado = response.data?.con_agente === true;
        } catch (error) {}
        
        if (tieneAgenteAsignado) {
            continue;
        }
        
        if (blacklist.has(numeroReal)) {
            continue;
        }
        
        const warningTime = inactivityWarningSentAt.get(numeroReal);
        try {
            const numeroId = await client.getNumberId(numeroReal);
            if (!numeroId) { limpiarEstadoChat(numeroReal); continue; }
            const chatId = numeroId._serialized;
            if (!warningTime) {
                if (now - Number(lastTime) >= CONFIG.INACTIVITY_WARNING_MS) {
                    await client.sendMessage(chatId, MENU_CONTINUIDAD, { linkPreview: false });
                    setUserState(numeroReal, ESTADOS.ESPERANDO_CONTINUIDAD);
                    inactivityWarningSentAt.set(numeroReal, now);
                    saveState();
                }
            } else {
                if (now - Number(warningTime) >= CONFIG.INACTIVITY_CLOSE_MS) {
                    await client.sendMessage(chatId, MENSAJE_DESPEDIDA_INACTIVIDAD, { linkPreview: false });
                    
                    try {
                        await axios.post(`${CONFIG.BACKEND_URL}/api/chats/cerrar-por-inactividad`, {
                            numero: numeroReal,
                            motivo: "inactividad"
                        });
                        console.log(`✅ Chat cerrado por inactividad para ${numeroReal}`);
                    } catch (err) {
                        console.log('⚠️ Error cerrando chat por inactividad:', err.message);
                    }
                    
                    limpiarEstadoChat(numeroReal);
                }
            }
        } catch (err) {
            limpiarEstadoChat(numeroReal);
        }
    }
}, CONFIG.INACTIVITY_CHECK_INTERVAL_MS);

// ========================================
// WATCHDOG
// ========================================
let watchdogInterval = null;
let fallosConsecutivos = 0;
const MAX_FALLOS = 3;
let ultimaActividadGlobal = Date.now();

async function verificarSaludBot() {
    try {
        if (!clientReady) {
            fallosConsecutivos++;
            console.log(`⚠️ Watchdog: clientReady=false (fallo ${fallosConsecutivos}/${MAX_FALLOS})`);
            if (fallosConsecutivos >= MAX_FALLOS) {
                console.log('⚠️ Watchdog: Demasiados fallos, forzando reinicio');
                process.exit(1);
            }
            return;
        }
        
        if (!client.info || !client.info.wid) {
            fallosConsecutivos++;
            console.log(`⚠️ Watchdog: client.info inválido (fallo ${fallosConsecutivos}/${MAX_FALLOS})`);
            if (fallosConsecutivos >= MAX_FALLOS) {
                process.exit(1);
            }
            return;
        }
        
        const ahora = Date.now();
        if (ahora - ultimaActividadGlobal < 120000) {
            console.log('✅ Watchdog: Actividad reciente, bot saludable');
            fallosConsecutivos = 0;
            return;
        }
        
        try {
            const state = await client.getState();
            if (state !== 'CONNECTED') {
                fallosConsecutivos++;
                console.log(`⚠️ Watchdog: Estado anormal: ${state} (fallo ${fallosConsecutivos}/${MAX_FALLOS})`);
                if (fallosConsecutivos >= MAX_FALLOS) {
                    process.exit(1);
                }
                return;
            }
        } catch (stateError) {
            fallosConsecutivos++;
            console.log(`⚠️ Watchdog: Error obteniendo estado (fallo ${fallosConsecutivos}/${MAX_FALLOS}): ${stateError.message}`);
            if (fallosConsecutivos >= MAX_FALLOS) {
                process.exit(1);
            }
            return;
        }
        
        fallosConsecutivos = 0;
        console.log('✅ Watchdog: Bot saludable');
        
    } catch (error) {
        fallosConsecutivos++;
        console.log(`⚠️ Watchdog: Error inesperado (fallo ${fallosConsecutivos}/${MAX_FALLOS}): ${error.message}`);
        if (fallosConsecutivos >= MAX_FALLOS) {
            process.exit(1);
        }
    }
}

watchdogInterval = setInterval(verificarSaludBot, 120000);
console.log('🔍 Watchdog iniciado - verificará la salud del bot cada 2 minutos');

// ─────────────────────────────────────────────
//  MENSAJES ENTRANTES
// ─────────────────────────────────────────────
client.on('message', async msg => {
    try {
        if (msg.fromMe) return;

        ultimaActividadGlobal = Date.now();

        messageCache.set(msg.id.id, msg);
        if (messageCache.size > 1000) {
            const firstKey = messageCache.keys().next().value;
            messageCache.delete(firstKey);
        }

        const contacto = await msg.getContact();
        const numeroReal = contacto.number;
        const nombreReal = contacto.pushname || contacto.name || msg._data.notifyName || numeroReal;

        let textoOriginal = msg.body || '';
        let urlAdjunto = null;
        let tipoAdjunto = null;
        
        let esUbicacion = false;
        let latitud = null;
        let longitud = null;
        let nombreUbicacion = null;
        let direccionUbicacion = null;
        
        if (msg.location) {
            esUbicacion = true;
            latitud = msg.location.latitude;
            longitud = msg.location.longitude;
            nombreUbicacion = msg.location.name || null;
            direccionUbicacion = msg.location.address || null;
            console.log(`📍 UBICACIÓN RECIBIDA: ${latitud}, ${longitud}`);
        }
        
        // ========== DETECTAR Y SUBIR AUDIO ==========
        let esAudio = false;
        let audioUrl = null;
        
        if (msg.hasMedia) {
            const mediaType = msg.type;
            if (mediaType === 'audio' || mediaType === 'ptt' ||
                (msg._data && msg._data.mimetype && msg._data.mimetype.startsWith('audio/'))) {
                esAudio = true;
                console.log(`🎤 AUDIO RECIBIDO de ${numeroReal}`);
                
                try {
                    const media = await msg.downloadMedia();
                    if (media) {
                        const formData = new FormData();
                        formData.append('archivo', Buffer.from(media.data, 'base64'), {
                            filename: `audio_${Date.now()}.${media.mimetype.split('/')[1] || 'ogg'}`,
                            contentType: media.mimetype
                        });
                        const uploadResp = await axios.post(
                            `${CONFIG.BACKEND_URL}/api/bot/upload`,
                            formData,
                            { headers: formData.getHeaders(), maxContentLength: Infinity }
                        );
                        if (uploadResp.data.url) {
                            audioUrl = uploadResp.data.url;
                            tipoAdjunto = uploadResp.data.tipo || 'audio';
                            console.log(`✅ Audio subido: ${audioUrl}`);
                        }
                    }
                } catch (e) {
                    console.error('❌ Error subiendo audio:', e.message);
                }
                
                // Avisar al cliente que no se aceptan audios
                await msg.reply(MENSAJE_AUDIO_NO_SOPORTADO_CLIENTE);
                console.log(`✅ Mensaje automático enviado al cliente`);

                const payloadAudio = {
                    numero: numeroReal,
                    mensaje: `🎤 [Audio recibido] El cliente envió un audio.`,
                    nombre: nombreReal,
                    url_adjunto: audioUrl,
                    tipo: 'audio_no_soportado',
                    whatsapp_message_id: msg.id.id,
                    quoted_message_id: null,
                    quoted_message_text: null,
                    es_audio: true,
                    es_flujo_bot: true,
                    metadata_archivo: JSON.stringify({
                        es_respuesta_automatica: true,
                        es_audio_detectado: true,
                        mensaje_auto: MENSAJE_AUDIO_NO_SOPORTADO_CLIENTE
                    })
                };
                axios.post(`${CONFIG.BACKEND_URL}/api/webhook/whatsapp`, payloadAudio)
                    .catch(err => console.error('❌ Error webhook audio:', err.message));
                console.log(`📤 Webhook audio enviado al backend para ${numeroReal}`);

                touchActivity(numeroReal);
                return;
            }
        }

        // Subir otros archivos
        if (msg.hasMedia && !esUbicacion && !esAudio) {
            try {
                const media = await msg.downloadMedia();
                if (media) {
                    const formData = new FormData();
                    formData.append('archivo', Buffer.from(media.data, 'base64'), {
                        filename: `whatsapp_${Date.now()}.${media.mimetype.split('/')[1]}`,
                        contentType: media.mimetype
                    });
                    const uploadResp = await axios.post(
                        `${CONFIG.BACKEND_URL}/api/bot/upload`,
                        formData,
                        { headers: formData.getHeaders(), maxContentLength: Infinity }
                    );
                    if (uploadResp.data.url) {
                        urlAdjunto = uploadResp.data.url;
                        tipoAdjunto = uploadResp.data.tipo;
                        textoOriginal = textoOriginal || uploadResp.data.nombre;
                    }
                }
            } catch (e) {
                console.error('❌ Error subiendo archivo:', e.message);
            }
        }

        let textoParaProcesar = textoOriginal;
        if (esUbicacion) {
            textoParaProcesar = `📍 Ubicación compartida: ${latitud}, ${longitud}`;
            if (nombreUbicacion) textoParaProcesar += ` - ${nombreUbicacion}`;
        }

        const texto = normalizarTexto(esUbicacion ? '' : textoOriginal);
        
        if (esUbicacion) {
            console.log(`📨 ${nombreReal} (${numeroReal}): 📍 UBICACIÓN`);
        } else if (esAudio) {
            console.log(`📨 ${nombreReal} (${numeroReal}): 🎤 AUDIO`);
        } else {
            console.log(`📨 ${nombreReal} (${numeroReal}): ${textoOriginal.substring(0, 40)}`);
        }

        let quoted_message_id = null;
        let quoted_message_text = null;
        if (msg.hasQuotedMsg) {
            try {
                const quotedMsg = await msg.getQuotedMessage();
                if (quotedMsg) {
                    quoted_message_id = quotedMsg.id.id;
                    quoted_message_text = quotedMsg.body || '';
                }
            } catch (e) {}
        }

        const esOpcionMenuRapida = /^[1-8]$/.test(texto);
        
        if (!esOpcionMenuRapida) {
            const payload = {
                numero: numeroReal,
                mensaje: esUbicacion ? textoParaProcesar : textoOriginal,
                nombre: nombreReal,
                url_adjunto: urlAdjunto,
                tipo: tipoAdjunto || (esUbicacion ? 'location' : 'texto'),
                whatsapp_message_id: msg.id.id,
                quoted_message_id: quoted_message_id,
                quoted_message_text: quoted_message_text,
                es_ubicacion: esUbicacion,
                latitud: latitud,
                longitud: longitud,
                nombre_ubicacion: nombreUbicacion,
                direccion_ubicacion: direccionUbicacion,
                es_audio: false,
                es_flujo_bot: true,
                metadata_archivo: null
            };
            
            axios.post(`${CONFIG.BACKEND_URL}/api/webhook/whatsapp`, payload)
                .catch(err => console.error('❌ Error en webhook:', err.message));
        } else {
            console.log(`⚡ Opción ${texto} - Webhook omitido para velocidad instantánea`);
        }

        const tieneAgente = await verificarTieneAgente(numeroReal);
        if (tieneAgente) {
            console.log(`👤 ${numeroReal} tiene agente asignado, bot ignorará el mensaje`);
            return;
        }

        if (blacklist.has(numeroReal)) {
            const chatActivo = await verificarChatActivo(numeroReal);
            if (!chatActivo) {
                console.log(`🔄 Chat cerrado para ${numeroReal}, reiniciando flujo del bot`);
                limpiarEstadoChat(numeroReal);
            } else {
                console.log(`👤 ${numeroReal} en soporte humano, bot ignorado`);
                return;
            }
        }

        if (esUbicacion) {
            touchActivity(numeroReal);
            return;
        }

        touchActivity(numeroReal);
        const menuPrincipal = getMenuPrincipal();

        // ========== SALUDO CON MODO FALLA ==========
        if (isSaludo(texto)) {
            touchActivity(numeroReal);
            
            if (modoFallaActivoCache && modoFallaZonaCache) {
                const yaValidoZona = userState.get(numeroReal) === 'VALIDADO_ZONA_NO_AFECTADA';
                
                if (!yaValidoZona) {
                    await msg.reply(`⚠️ ESTIMADO CLIENTE: Presentamos una falla técnica en ${modoFallaZonaCache}. ¿Usted se encuentra en esta zona? Por favor responda *SÍ* o *NO*`);
                    setUserState(numeroReal, 'ESPERANDO_CONFIRMACION_ZONA_FALLA');
                    return;
                } else {
                    const numeroIdSaludo = await client.getNumberId(numeroReal);
                    if (numeroIdSaludo) {
                        await client.sendMessage(numeroIdSaludo._serialized, menuPrincipal, { linkPreview: false });
                    }
                    return;
                }
            }
            
            const numeroIdSaludo = await client.getNumberId(numeroReal);
            if (numeroIdSaludo) {
                await client.sendMessage(numeroIdSaludo._serialized, menuPrincipal, { linkPreview: false });
            }
            return;
        }

        // ========== MANEJAR RESPUESTA DE CONFIRMACIÓN DE ZONA ==========
        if (userState.get(numeroReal) === 'ESPERANDO_CONFIRMACION_ZONA_FALLA') {
            const respuesta = texto.toLowerCase();
            
            if (respuesta === 'si' || respuesta === 'sí' || respuesta === '1') {
                const numeroId = await client.getNumberId(numeroReal);
                if (numeroId) {
                    await client.sendMessage(numeroId._serialized, modoFallaMensajeCache, { linkPreview: false });
                    await client.sendMessage(numeroId._serialized, MENSAJE_DESPEDIDA, { linkPreview: false });
                }
                
                try {
                    await axios.post(`${CONFIG.BACKEND_URL}/api/chats/cerrar-por-inactividad`, {
                        numero: numeroReal,
                        motivo: "modo_falla_zona_afectada"
                    });
                    console.log(`✅ Chat cerrado por modo falla para ${numeroReal}`);
                } catch (err) {
                    console.log('⚠️ Error cerrando chat por modo falla:', err.message);
                }
                
                limpiarEstadoChat(numeroReal);
                console.log(`🔴 Cliente ${numeroReal} confirmó estar en zona afectada (${modoFallaZonaCache}), chat cerrado`);
                return;
            } 
            else if (respuesta === 'no' || respuesta === '2') {
                deleteUserState(numeroReal);
                setUserState(numeroReal, 'VALIDADO_ZONA_NO_AFECTADA');
                const numeroId = await client.getNumberId(numeroReal);
                if (numeroId) {
                    await client.sendMessage(numeroId._serialized, `✅ Gracias por confirmar. Al no estar en la zona afectada, continuamos con el servicio normal.\n\n${menuPrincipal}`, { linkPreview: false });
                }
                touchActivity(numeroReal);
                console.log(`🟢 Cliente ${numeroReal} confirmó NO estar en zona afectada, flujo normal`);
                return;
            }
            else {
                await msg.reply(`Opción no válida. Por favor responda *SÍ* si está en ${modoFallaZonaCache}, o *NO* si no lo está.`);
                return;
            }
        }

        // ========== ESTADO: ESPERANDO_CEDULA_FACTURA ==========
        if (userState.get(numeroReal) === ESTADOS.ESPERANDO_CEDULA_FACTURA) {
            const cedula = textoOriginal.trim();
            const intentos = (userState.get(numeroReal + '_intentos') || 0);

            if (cedula === '0') {
                deleteUserState(numeroReal);
                userState.delete(numeroReal + '_intentos');
                const nId = await client.getNumberId(numeroReal);
                if (nId) await client.sendMessage(nId._serialized, getMenuPrincipal(), { linkPreview: false });
                touchActivity(numeroReal);
                return;
            }

            // Validar que sea cédula (solo números) o contrato (####-#)
            const esCedulaValida = /^\d{5,12}$/.test(cedula.trim());
            const esContratoValido = /^\d+-\d+$/.test(cedula.trim());
            if (!esCedulaValida && !esContratoValido) {
                const nId = await client.getNumberId(numeroReal);
                if (nId) await client.sendMessage(nId._serialized,
                    `⚠️ Por favor ingresa un número de cédula válido (solo números) o número de contrato (ejemplo: 2873-1).\n\nEscribe *0* para volver al menú principal.`,
                    { linkPreview: false }
                );
                return;
            }

            const resultado = await consultarCuentaSoftv(cedula);

            if (resultado.ok) {
                userState.delete(numeroReal + '_intentos');
                if (resultado.clienteInfo) userState.set(numeroReal + '_clienteInfo', JSON.stringify(resultado.clienteInfo));
                if (resultado.periodoPagado) userState.set(numeroReal + '_periodo_pagado', resultado.periodoPagado);
                const nId = await client.getNumberId(numeroReal);
                const menuFactura = `\n\n*1.* Ver medios de pago\n*2.* Volver al menú principal\n*3.* Finalizar`;
                if (nId) await client.sendMessage(nId._serialized, resultado.mensaje + menuFactura, { linkPreview: false });
                setUserState(numeroReal, ESTADOS.ESPERANDO_ACCION_FACTURA);
                touchActivity(numeroReal);
                return;
            }

            if (resultado.tipo === 'no_encontrado') {
                const nuevosIntentos = intentos + 1;
                if (nuevosIntentos >= 3) {
                    userState.delete(numeroReal + '_intentos');
                    deleteUserState(numeroReal);
                    const nId = await client.getNumberId(numeroReal);
                    if (nId) await client.sendMessage(nId._serialized, `❌ No encontramos una cuenta con ese documento después de varios intentos.\n\n${getMenuPrincipal()}`, { linkPreview: false });
                    touchActivity(numeroReal);
                    return;
                }
                userState.set(numeroReal + '_intentos', nuevosIntentos);
                const nId = await client.getNumberId(numeroReal);
                if (nId) await client.sendMessage(nId._serialized, `❌ No encontramos una cuenta asociada al documento *${cedula}*.\n\nVerifica que sea la cédula o número de contrato correcto e intenta de nuevo, o escribe *0* para volver al menú principal.`, { linkPreview: false });
                return;
            }

            // Falla API
            const nId = await client.getNumberId(numeroReal);
            deleteUserState(numeroReal);
            userState.delete(numeroReal + '_intentos');
            if (nId) {
                await client.sendMessage(nId._serialized, `⚠️ En este momento no podemos consultar tu estado de cuenta. Por favor intenta más tarde.\n\nSin embargo, puedes realizar tu pago por estos medios:`, { linkPreview: false });
                await client.sendMessage(nId._serialized, obtenerMensajePago(), { linkPreview: false });
                await client.sendMessage(nId._serialized, `*1.* Volver al menú principal\n*2.* Finalizar`, { linkPreview: false });
            }
            setUserState(numeroReal, ESTADOS.ESPERANDO_NAVEGACION);
            touchActivity(numeroReal);
            return;
        }

        // ========== ESTADO: ESPERANDO_ACCION_FACTURA ==========
        if (userState.get(numeroReal) === ESTADOS.ESPERANDO_ACCION_FACTURA) {
            const nId = await client.getNumberId(numeroReal);
            if (texto === '1') {
                const menuPago = `*1.* Volver al menú principal\n*2.* Hablar con un asesor (envío de soporte de pago)\n*3.* Finalizar`;
                if (nId) await client.sendMessage(nId._serialized, obtenerMensajePago() + '\n\n' + menuPago, { linkPreview: false });
                setUserState(numeroReal, ESTADOS.ESPERANDO_ACCION_PAGO);
                touchActivity(numeroReal);
                return;
            }
            if (texto === '2') {
                deleteUserState(numeroReal);
                if (nId) await client.sendMessage(nId._serialized, getMenuPrincipal(), { linkPreview: false });
                touchActivity(numeroReal);
                return;
            }
            if (texto === '3') {
                limpiarEstadoChat(numeroReal);
                if (nId) await client.sendMessage(nId._serialized, MENSAJE_DESPEDIDA, { linkPreview: false });
                return;
            }
            if (nId) await client.sendMessage(nId._serialized, 'Opción no válida. Responda *1*, *2* o *3*.', { linkPreview: false });
            return;
        }

        // ========== ESTADO: ESPERANDO_ACCION_PAGO ==========
        if (userState.get(numeroReal) === ESTADOS.ESPERANDO_ACCION_PAGO) {
            const nId = await client.getNumberId(numeroReal);
            if (texto === '1') {
                deleteUserState(numeroReal);
                if (nId) await client.sendMessage(nId._serialized, getMenuPrincipal(), { linkPreview: false });
                touchActivity(numeroReal);
                return;
            }
            if (texto === '2') {
                if (nId) await client.sendMessage(nId._serialized,
                    `💳 ¿Por qué medio realizo el pago?\n\n*1.* Nequi\n*2.* Bancolombia\n*3.* Davivienda\n*4.* Otro\n\nEscriba *0* para volver al menú principal.`,
                    { linkPreview: false }
                );
                setUserState(numeroReal, ESTADOS.ESPERANDO_MEDIO_PAGO);
                touchActivity(numeroReal);
                return;
            }
            if (texto === '3') {
                limpiarEstadoChat(numeroReal);
                if (nId) await client.sendMessage(nId._serialized, MENSAJE_DESPEDIDA, { linkPreview: false });
                return;
            }
            if (nId) await client.sendMessage(nId._serialized, 'Opción no válida. Responda *1*, *2* o *3*.', { linkPreview: false });
            return;
        }


        // ========== ESTADO: ESPERANDO_COMPROBANTE_PAGO (inicio flujo) ==========
        if (userState.get(numeroReal) === ESTADOS.ESPERANDO_COMPROBANTE_PAGO) {
            const nId = await client.getNumberId(numeroReal);
            if (texto === '0') {
                deleteUserState(numeroReal);
                userState.delete(numeroReal + '_clienteInfo');
                if (nId) await client.sendMessage(nId._serialized, getMenuPrincipal(), { linkPreview: false });
                touchActivity(numeroReal);
                return;
            }
            // Preguntar medio de pago
            if (nId) await client.sendMessage(nId._serialized,
                `💳 ¿Por qué medio realizo el pago?\n\n*1.* Nequi\n*2.* Bancolombia\n*3.* Davivienda\n*4.* Otro\n\nEscriba *0* para volver al menú principal.`,
                { linkPreview: false }
            );
            setUserState(numeroReal, ESTADOS.ESPERANDO_MEDIO_PAGO);
            touchActivity(numeroReal);
            return;
        }

        // ========== ESTADO: ESPERANDO_MEDIO_PAGO ==========
        if (userState.get(numeroReal) === ESTADOS.ESPERANDO_MEDIO_PAGO) {
            const nId = await client.getNumberId(numeroReal);
            if (texto === '0') {
                deleteUserState(numeroReal);
                userState.delete(numeroReal + '_clienteInfo');
                if (nId) await client.sendMessage(nId._serialized, getMenuPrincipal(), { linkPreview: false });
                touchActivity(numeroReal);
                return;
            }
            const medios = { '1': 'Nequi', '2': 'Bancolombia', '3': 'Davivienda', '4': 'Otro' };
            if (!medios[texto]) {
                if (nId) await client.sendMessage(nId._serialized, `Opción no válida. Responde *1*, *2*, *3* o *4*.\n\nEscribe *0* para volver al menú principal.`, { linkPreview: false });
                return;
            }
            userState.set(numeroReal + '_medio_pago', medios[texto]);
            if (texto === '1') {
                // Nequi: pedir nombre del titular
                if (nId) await client.sendMessage(nId._serialized,
                    `Por favor indiquenos el *nombre del titular del Nequi* para poder buscarlo en nuestras cuentas.\n\nEscriba *0* para volver al menú principal.`,
                    { linkPreview: false }
                );
                setUserState(numeroReal, ESTADOS.ESPERANDO_TITULAR_NEQUI);
            } else {
                // Otros medios: ir directo al comprobante
                if (nId) await client.sendMessage(nId._serialized,
                    `📎 Por favor envíe su *comprobante de pago* (foto o PDF).\n\nEscriba *0* para cancelar.`,
                    { linkPreview: false }
                );
                setUserState(numeroReal, ESTADOS.ESPERANDO_ARCHIVO_COMPROBANTE);
            }
            touchActivity(numeroReal);
            return;
        }

        // ========== ESTADO: ESPERANDO_TITULAR_NEQUI ==========
        if (userState.get(numeroReal) === ESTADOS.ESPERANDO_TITULAR_NEQUI) {
            const nId = await client.getNumberId(numeroReal);
            if (texto === '0') {
                deleteUserState(numeroReal);
                userState.delete(numeroReal + '_clienteInfo');
                userState.delete(numeroReal + '_medio_pago');
                if (nId) await client.sendMessage(nId._serialized, getMenuPrincipal(), { linkPreview: false });
                touchActivity(numeroReal);
                return;
            }
            // Guardar nombre titular nequi
            userState.set(numeroReal + '_titular_nequi', textoOriginal.trim());
            if (nId) await client.sendMessage(nId._serialized,
                `📎 Gracias. Ahora envíe su *comprobante de pago* (foto o PDF).\n\nEscriba *0* para cancelar.`,
                { linkPreview: false }
            );
            setUserState(numeroReal, ESTADOS.ESPERANDO_ARCHIVO_COMPROBANTE);
            touchActivity(numeroReal);
            return;
        }

        // ========== ESTADO: ESPERANDO_ARCHIVO_COMPROBANTE ==========
        if (userState.get(numeroReal) === ESTADOS.ESPERANDO_ARCHIVO_COMPROBANTE) {
            const nId = await client.getNumberId(numeroReal);

            if (texto === '0') {
                deleteUserState(numeroReal);
                userState.delete(numeroReal + '_clienteInfo');
                userState.delete(numeroReal + '_medio_pago');
                userState.delete(numeroReal + '_titular_nequi');
                if (nId) await client.sendMessage(nId._serialized, getMenuPrincipal(), { linkPreview: false });
                touchActivity(numeroReal);
                return;
            }

            if (!msg.hasMedia) {
                if (nId) await client.sendMessage(nId._serialized,
                    `📎 Por favor envíe el comprobante como *foto o PDF*.\n\nEscriba *0* para cancelar.`,
                    { linkPreview: false }
                );
                return;
            }

            // Recuperar datos guardados
            let infoCliente = {};
            try {
                const raw = userState.get(numeroReal + '_clienteInfo');
                if (raw) infoCliente = JSON.parse(raw);
            } catch(e) {}

            const nombreTitular = infoCliente.NOMBRE || nombreReal;
            const contratoCliente = infoCliente.contrato || 'No disponible';
            const medioPago = userState.get(numeroReal + '_medio_pago') || 'No especificado';
            const titularNequi = userState.get(numeroReal + '_titular_nequi') || '';

            // Construir descripción del comprobante
            let descPago = `💳 *COMPROBANTE DE PAGO*\n`;
            descPago += `*Titular cuenta:* ${nombreTitular}\n`;
            descPago += `*Contrato:* ${contratoCliente}\n`;
            descPago += `*Medio de pago:* ${medioPago}\n`;
            if (titularNequi) descPago +=`*Titular Nequi:* ${titularNequi}\n`;

            try {
                const media = await msg.downloadMedia();
                if (media) {
                    const formData = new FormData();
                    formData.append('archivo', Buffer.from(media.data, 'base64'), {
                        filename: `comprobante_${numeroReal}_${Date.now()}.${media.mimetype.split('/')[1] || 'jpg'}`,
                        contentType: media.mimetype
                    });
                    const uploadResp = await axios.post(
                        `${CONFIG.BACKEND_URL}/api/bot/upload`,
                        formData,
                        { headers: formData.getHeaders(), maxContentLength: Infinity }
                    );

                    if (uploadResp.data.url) {
                        // Enviar comprobante al webhook
                        const payloadComprobante = {
                            numero: numeroReal,
                            mensaje: descPago,
                            nombre: nombreReal,
                            url_adjunto: uploadResp.data.url,
                            tipo: uploadResp.data.tipo || 'imagen',
                            whatsapp_message_id: msg.id.id,
                            es_flujo_bot: true,
                            metadata_archivo: JSON.stringify({
                                es_comprobante_pago: true,
                                titular: nombreTitular,
                                contrato: contratoCliente,
                                medio_pago: medioPago,
                                titular_nequi: titularNequi
                            })
                        };
                        await axios.post(`${CONFIG.BACKEND_URL}/api/webhook/whatsapp`, payloadComprobante);
                        console.log(`✅ Comprobante recibido de ${numeroReal} - Contrato: ${contratoCliente} - Medio: ${medioPago}`);

                        // Confirmar al cliente primero
                        if (nId) await client.sendMessage(nId._serialized,
                            `✅ *Comprobante recibido correctamente.*\n\nUn asesor verificará tu pago a la brevedad.`,
                            { linkPreview: false }
                        );

                        // Luego meter en cola de espera
                        let hayAsesores = false;
                        try {
                            const resp = await axios.get(`${CONFIG.BACKEND_URL}/api/chat/hay-agentes-disponibles`, { timeout: 5000 });
                            hayAsesores = resp.data?.hay_agentes === true;
                        } catch(e) {}

                        await axios.post(`${CONFIG.BACKEND_URL}/api/chat/marcar-espera`, {
                            numero: numeroReal,
                            nombre: nombreReal,
                            asignar_ahora: hayAsesores,
                            datos: descPago
                        });

                        if (!hayAsesores) {
                            if (nId) await client.sendMessage(nId._serialized,
                                `⏳ En este momento no tenemos asesores disponibles, pero tu comprobante quedó registrado y será atendido en el siguiente horario disponible.\n\n📅 Lunes a Sábados: 7:00 AM - 10:00 PM\n📅 Domingos y Festivos: 8:00 AM - 4:00 PM`,
                                { linkPreview: false }
                            );
                        }

                        // Limpiar datos temporales y poner en blacklist
                        userState.delete(numeroReal + '_clienteInfo');
                        userState.delete(numeroReal + '_medio_pago');
                        userState.delete(numeroReal + '_titular_nequi');
                        userState.delete(numeroReal + '_periodo_pagado');
                        setBlacklist(numeroReal);
                        deleteUserState(numeroReal);
                        return;
                    }
                }
            } catch(e) {
                console.error('❌ Error subiendo comprobante:', e.message);
            }

            if (nId) await client.sendMessage(nId._serialized,
                `❌ No pudimos recibir el archivo. Por favor intenta de nuevo enviando la foto o PDF.`,
                { linkPreview: false }
            );
            return;
        }


        // ========== ESTADO: ESPERANDO_COMPROBANTE_PAGO (inicio flujo) ==========
        if (userState.get(numeroReal) === ESTADOS.ESPERANDO_COMPROBANTE_PAGO) {
            const nId = await client.getNumberId(numeroReal);
            if (texto === '0') {
                deleteUserState(numeroReal);
                userState.delete(numeroReal + '_clienteInfo');
                if (nId) await client.sendMessage(nId._serialized, getMenuPrincipal(), { linkPreview: false });
                touchActivity(numeroReal);
                return;
            }
            // Preguntar medio de pago
            if (nId) await client.sendMessage(nId._serialized,
                `💳 ¿Por qué medio realizo el pago?\n\n*1.* Nequi\n*2.* Bancolombia\n*3.* Davivienda\n*4.* Otro\n\nEscriba *0* para volver al menú principal.`,
                { linkPreview: false }
            );
            setUserState(numeroReal, ESTADOS.ESPERANDO_MEDIO_PAGO);
            touchActivity(numeroReal);
            return;
        }

        // ========== ESTADO: ESPERANDO_MEDIO_PAGO ==========
        if (userState.get(numeroReal) === ESTADOS.ESPERANDO_MEDIO_PAGO) {
            const nId = await client.getNumberId(numeroReal);
            if (texto === '0') {
                deleteUserState(numeroReal);
                userState.delete(numeroReal + '_clienteInfo');
                if (nId) await client.sendMessage(nId._serialized, getMenuPrincipal(), { linkPreview: false });
                touchActivity(numeroReal);
                return;
            }
            const medios = { '1': 'Nequi', '2': 'Bancolombia', '3': 'Davivienda', '4': 'Otro' };
            if (!medios[texto]) {
                if (nId) await client.sendMessage(nId._serialized, `Opción no válida. Responda *1*, *2*, *3* o *4*.\n\nEscriba *0* para volver al menú principal.`, { linkPreview: false });
                return;
            }
            userState.set(numeroReal + '_medio_pago', medios[texto]);
            if (texto === '1') {
                // Nequi: pedir nombre del titular
                if (nId) await client.sendMessage(nId._serialized,
                    `Por favor indíquenos el *nombre del titular del Nequi* para poder buscarlo en nuestras cuentas.\n\nEscriba *0* para volver al menú principal.`,
                    { linkPreview: false }
                );
                setUserState(numeroReal, ESTADOS.ESPERANDO_TITULAR_NEQUI);
            } else {
                // Otros medios: ir directo al comprobante
                if (nId) await client.sendMessage(nId._serialized,
                    `📎 Por favor envíe su *comprobante de pago* (foto o PDF).\n\nEscriba *0* para cancelar.`,
                    { linkPreview: false }
                );
                setUserState(numeroReal, ESTADOS.ESPERANDO_ARCHIVO_COMPROBANTE);
            }
            touchActivity(numeroReal);
            return;
        }

        // ========== ESTADO: ESPERANDO_TITULAR_NEQUI ==========
        if (userState.get(numeroReal) === ESTADOS.ESPERANDO_TITULAR_NEQUI) {
            const nId = await client.getNumberId(numeroReal);
            if (texto === '0') {
                deleteUserState(numeroReal);
                userState.delete(numeroReal + '_clienteInfo');
                userState.delete(numeroReal + '_medio_pago');
                if (nId) await client.sendMessage(nId._serialized, getMenuPrincipal(), { linkPreview: false });
                touchActivity(numeroReal);
                return;
            }
            // Guardar nombre titular nequi
            userState.set(numeroReal + '_titular_nequi', textoOriginal.trim());
            if (nId) await client.sendMessage(nId._serialized,
                `📎 Gracias. Ahora envíe su *comprobante de pago* (foto o PDF).\n\nEscriba *0* para cancelar.`,
                { linkPreview: false }
            );
            setUserState(numeroReal, ESTADOS.ESPERANDO_ARCHIVO_COMPROBANTE);
            touchActivity(numeroReal);
            return;
        }

        // ========== ESTADO: ESPERANDO_ARCHIVO_COMPROBANTE ==========
        if (userState.get(numeroReal) === ESTADOS.ESPERANDO_ARCHIVO_COMPROBANTE) {
            const nId = await client.getNumberId(numeroReal);

            if (texto === '0') {
                deleteUserState(numeroReal);
                userState.delete(numeroReal + '_clienteInfo');
                userState.delete(numeroReal + '_medio_pago');
                userState.delete(numeroReal + '_titular_nequi');
                if (nId) await client.sendMessage(nId._serialized, getMenuPrincipal(), { linkPreview: false });
                touchActivity(numeroReal);
                return;
            }

            if (!msg.hasMedia) {
                if (nId) await client.sendMessage(nId._serialized,
                    `📎 Por favor envíe su comprobante como *foto o PDF*.\n\nEscriba *0* para cancelar.`,
                    { linkPreview: false }
                );
                return;
            }

            // Recuperar datos guardados
            let infoCliente = {};
            try {
                const raw = userState.get(numeroReal + '_clienteInfo');
                if (raw) infoCliente = JSON.parse(raw);
            } catch(e) {}

            const nombreTitular = infoCliente.NOMBRE || nombreReal;
            const contratoCliente = infoCliente.contrato || 'No disponible';
            const medioPago = userState.get(numeroReal + '_medio_pago') || 'No especificado';
            const titularNequi = userState.get(numeroReal + '_titular_nequi') || '';

            // Construir descripción del comprobante
            let descPago = `💳 *COMPROBANTE DE PAGO*\n`;
            descPago += `*Titular cuenta:* ${nombreTitular}\n`;
            descPago += `*Contrato:* ${contratoCliente}\n`;
            descPago += `* Medio de pago:* ${medioPago}\n`;
            if (titularNequi) descPago += `*Titular Nequi:* ${titularNequi}\n`;

            try {
                const media = await msg.downloadMedia();
                if (media) {
                    const formData = new FormData();
                    formData.append('archivo', Buffer.from(media.data, 'base64'), {
                        filename: `comprobante_${numeroReal}_${Date.now()}.${media.mimetype.split('/')[1] || 'jpg'}`,
                        contentType: media.mimetype
                    });
                    const uploadResp = await axios.post(
                        `${CONFIG.BACKEND_URL}/api/bot/upload`,
                        formData,
                        { headers: formData.getHeaders(), maxContentLength: Infinity }
                    );

                    if (uploadResp.data.url) {
                        // Enviar comprobante al webhook
                        const payloadComprobante = {
                            numero: numeroReal,
                            mensaje: descPago,
                            nombre: nombreReal,
                            url_adjunto: uploadResp.data.url,
                            tipo: uploadResp.data.tipo || 'imagen',
                            whatsapp_message_id: msg.id.id,
                            es_flujo_bot: true,
                            metadata_archivo: JSON.stringify({
                                es_comprobante_pago: true,
                                titular: nombreTitular,
                                contrato: contratoCliente,
                                medio_pago: medioPago,
                                titular_nequi: titularNequi
                            })
                        };
                        await axios.post(`${CONFIG.BACKEND_URL}/api/webhook/whatsapp`, payloadComprobante);
                        console.log(`✅ Comprobante recibido de ${numeroReal} - Contrato: ${contratoCliente} - Medio: ${medioPago}`);

                        // Confirmar al cliente primero
                        if (nId) await client.sendMessage(nId._serialized,
                            `✅ *Comprobante recibido correctamente.*\n\nUn asesor verificará su pago a la brevedad.`,
                            { linkPreview: false }
                        );

                        // Luego meter en cola de espera
                        let hayAsesores = false;
                        try {
                            const resp = await axios.get(`${CONFIG.BACKEND_URL}/api/chat/hay-agentes-disponibles`, { timeout: 5000 });
                            hayAsesores = resp.data?.hay_agentes === true;
                        } catch(e) {}

                        await axios.post(`${CONFIG.BACKEND_URL}/api/chat/marcar-espera`, {
                            numero: numeroReal,
                            nombre: nombreReal,
                            asignar_ahora: hayAsesores,
                            datos: descPago
                        });

                        if (!hayAsesores) {
                            if (nId) await client.sendMessage(nId._serialized,
                                `⏳ En este momento no tenemos asesores disponibles, pero su comprobante quedó registrado y será atendido en el siguiente horario disponible.\n\n📅 Lunes a Sábados: 7:00 AM - 10:00 PM\n📅 Domingos y Festivos: 8:00 AM - 4:00 PM`,
                                { linkPreview: false }
                            );
                        }

                        // Limpiar datos temporales y poner en blacklist
                        userState.delete(numeroReal + '_clienteInfo');
                        userState.delete(numeroReal + '_medio_pago');
                        userState.delete(numeroReal + '_titular_nequi');
                        userState.delete(numeroReal + '_periodo_pagado');
                        setBlacklist(numeroReal);
                        deleteUserState(numeroReal);
                        return;
                    }
                }
            } catch(e) {
                console.error('❌ Error subiendo comprobante:', e.message);
            }

            if (nId) await client.sendMessage(nId._serialized,
                `❌ No pudimos recibir el archivo. Por favor intenta de nuevo enviando la foto o PDF.`,
                { linkPreview: false }
            );
            return;
        }

        // ========== ESTADO: ESPERANDO_VALIDACION ==========
        if (userState.get(numeroReal) === ESTADOS.ESPERANDO_VALIDACION) {
            console.log(`📝 ${numeroReal} envió datos de validación: ${textoOriginal.substring(0, 50)}`);
            
            // Guardar los datos en el backend y poner en cola de espera
            try {
                await axios.post(`${CONFIG.BACKEND_URL}/api/chat/guardar-datos-cliente`, {
                    numero: numeroReal,
                    nombre: nombreReal,
                    datos: textoOriginal,
                    estado: 'en_espera'
                });
                console.log(`✅ Datos del cliente ${numeroReal} guardados en backend`);
            } catch (err) {
                console.log('⚠️ Error guardando datos del cliente:', err.message);
            }
            
            setBlacklist(numeroReal);
            deleteUserState(numeroReal);
            
            let hayAsesores = false;
            try {
                const response = await axios.get(`${CONFIG.BACKEND_URL}/api/chat/hay-agentes-disponibles`, { timeout: 5000 });
                hayAsesores = response.data?.hay_agentes === true;
                console.log(`📊 Asesores disponibles: ${hayAsesores ? 'SÍ' : 'NO'}`);
            } catch (err) {
                console.log('⚠️ Error verificando asesores:', err.message);
            }
            
            const numeroId = await client.getNumberId(numeroReal);
            
            if (hayAsesores) {
                if (numeroId) {
                    await client.sendMessage(numeroId._serialized, `✅ Gracias por proporcionar sus datos. En unos momentos un asesor lo atenderá.`, { linkPreview: false });
                }
                
                await axios.post(`${CONFIG.BACKEND_URL}/api/chat/marcar-espera`, {
                    numero: numeroReal,
                    nombre: nombreReal,
                    asignar_ahora: true
                });
                console.log(`✅ Cliente ${numeroReal} validado, será asignado inmediatamente`);
            } else {
                if (numeroId) {
                    await client.sendMessage(numeroId._serialized, `✅ *Sus datos han sido registrados correctamente.*\n\nEn cuanto un asesor esté disponible se comunicará con usted a la brevedad.`, { linkPreview: false });
                }
                
                await axios.post(`${CONFIG.BACKEND_URL}/api/chat/marcar-espera`, {
                    numero: numeroReal,
                    nombre: nombreReal,
                    datos: textoOriginal,
                    asignar_ahora: false
                });
                console.log(`✅ Cliente ${numeroReal} validado, en espera (no hay asesores)`);
            }
            return;
        }

        // ========== ESTADO: ESPERANDO_CONTINUIDAD ==========
        if (userState.get(numeroReal) === ESTADOS.ESPERANDO_CONTINUIDAD) {
            const numeroId = await client.getNumberId(numeroReal);
            
            if (texto === '1') { 
                deleteUserState(numeroReal);
                const tieneAgenteAsignado = await verificarTieneAgente(numeroReal);
                
                if (tieneAgenteAsignado) {
                    if (numeroId) {
                        await client.sendMessage(numeroId._serialized, `✅ Conversación reactivada. Un asesor le atenderá en breve.`, { linkPreview: false });
                    }
                } else {
                    if (numeroId) {
                        await client.sendMessage(numeroId._serialized, `✅ Conversación reactivada. ¿En qué más puedo ayudarle?\n\n${menuPrincipal}`, { linkPreview: false });
                    }
                }
                touchActivity(numeroReal);
                return; 
            }
            if (texto === '2') { 
                if (numeroId) {
                    await client.sendMessage(numeroId._serialized, MENSAJE_DESPEDIDA, { linkPreview: false });
                }
                limpiarEstadoChat(numeroReal); 
                return; 
            }
            if (numeroId) {
                await client.sendMessage(numeroId._serialized, `Opción no válida.\n\n${MENU_CONTINUIDAD}`, { linkPreview: false });
            }
            return;
        }

        // ========== ESTADO: ESPERANDO_NAVEGACION ==========
        if (userState.get(numeroReal) === ESTADOS.ESPERANDO_NAVEGACION) {
            const numeroId = await client.getNumberId(numeroReal);
            
            if (texto === '1') { 
                deleteUserState(numeroReal);
                if (numeroId) {
                    await client.sendMessage(numeroId._serialized, menuPrincipal, { linkPreview: false });
                }
                touchActivity(numeroReal); 
                return; 
            }
            if (texto === '2') { 
                if (numeroId) {
                    await client.sendMessage(numeroId._serialized, MENSAJE_DESPEDIDA, { linkPreview: false });
                }
                limpiarEstadoChat(numeroReal); 
                return; 
            }
            if (numeroId) {
                await client.sendMessage(numeroId._serialized, `Opción no válida.\n\n${MENU_NAVEGACION}`, { linkPreview: false });
            }
            return;
        }

        // ========== FINALIZAR ==========
        if (texto === '0') {
            const numeroId = await client.getNumberId(numeroReal);
            if (numeroId) {
                await client.sendMessage(numeroId._serialized, MENSAJE_DESPEDIDA, { linkPreview: false });
            }
            limpiarEstadoChat(numeroReal);
            return;
        }

        // ========== OPCIONES DEL MENÚ ==========
        if (/^[1-9]$/.test(texto)) {
            const opciones = getOpciones();
            const numeroId = await client.getNumberId(numeroReal);
            
            if (texto === '9') {
                console.log(`🆘 Cliente ${numeroReal} seleccionó SOPORTE TÉCNICO`);
                
                let hayAsesores = false;
                try {
                    const response = await axios.get(`${CONFIG.BACKEND_URL}/api/chat/hay-agentes-disponibles`, { timeout: 5000 });
                    hayAsesores = response.data?.hay_agentes === true;
                    console.log(`📊 Asesores disponibles: ${hayAsesores ? 'SÍ' : 'NO'}`);
                } catch (err) {
                    console.log('⚠️ Error verificando asesores:', err.message);
                }
                
                const mensajeValidacion = await obtenerMensajeValidacion();
                
                if (hayAsesores) {
                    if (numeroId) {
                        await client.sendMessage(numeroId._serialized, mensajeValidacion, { linkPreview: false });
                    }
                    setUserState(numeroReal, ESTADOS.ESPERANDO_VALIDACION);
                    console.log(`✅ Cliente ${numeroReal} en validación (HAY asesores disponibles)`);
                } else {
                    if (numeroId) {
                        await client.sendMessage(numeroId._serialized, MENSAJE_NO_DISPONIBLE, { linkPreview: false });
                    }
                    setUserState(numeroReal, ESTADOS.ESPERANDO_VALIDACION);
                    console.log(`📝 Cliente ${numeroReal} en validación (SIN asesores, irá a cola de espera)`);
                }
                
                touchActivity(numeroReal);
                return;
            } else if (texto === '1') {
                // OPCIÓN 1: Consulta de estado de cuenta vía SofTV
                const nId = await client.getNumberId(numeroReal);
                if (nId) await client.sendMessage(nId._serialized, `💳 *Pago de factura / Estado de cuenta*\n\nPor favor ingrese el *Numero de Cedula del Titular* o *Numero de Contrato* (ejemplo: 12345678 o 45-1):\n\nEscriba *0* para volver al menú principal.`, { linkPreview: false });
                setUserState(numeroReal, ESTADOS.ESPERANDO_CEDULA_FACTURA);
                userState.set(numeroReal + '_intentos', 0);
                touchActivity(numeroReal);
                return;
            } else {
                // RESPUESTA INSTANTÁNEA para opciones 2-8
                if (numeroId) {
                    await client.sendMessage(numeroId._serialized, opciones[texto], { linkPreview: false });
                    console.log(`⚡ Respuesta instantánea enviada para opción ${texto}`);
                }
                setUserState(numeroReal, ESTADOS.ESPERANDO_NAVEGACION);
                touchActivity(numeroReal);
                return;
            }
        }

        const numeroIdDefault = await client.getNumberId(numeroReal);
        if (numeroIdDefault) {
            await client.sendMessage(numeroIdDefault._serialized, MENSAJE_POR_DEFECTO, { linkPreview: false });
        }
        touchActivity(numeroReal);

    } catch (error) {
        console.error('❌ Error en mensaje entrante:', error.message);
    }
});

// ─────────────────────────────────────────────
//  COMANDOS DEL ASESOR
// ─────────────────────────────────────────────
client.on('message_create', async msg => {
    try {
        if (!msg.fromMe) return;
        const texto = normalizarTexto(msg.body || '');
        if (texto !== 'end' && texto !== 'main' && texto !== 'pagook' && texto !== 'pagoerror') return;

        let numeroReal;
        try {
            const chat = await msg.getChat();
            const contacto = await chat.getContact();
            numeroReal = contacto.number;
        } catch (e) {
            numeroReal = msg.to.replace(/@c\.us|@lid|@s\.whatsapp\.net/gi, '').replace(/\+/g, '').replace(/\s/g, '');
        }

        const numeroId = await client.getNumberId(numeroReal);
        if (!numeroId) return;
        const chatId = numeroId._serialized;

        if (texto === 'main') {
            limpiarEstadoChat(numeroReal);
            await client.sendMessage(chatId, MENSAJE_ATENCION_FINALIZADA, { linkPreview: false });
            await client.sendMessage(chatId, getMenuPrincipal(), { linkPreview: false });
            touchActivity(numeroReal);
        }

        if (texto === 'end') {
            limpiarEstadoChat(numeroReal);
            await client.sendMessage(chatId, MENSAJE_ATENCION_FINALIZADA, { linkPreview: false });
            await client.sendMessage(chatId, MENSAJE_DESPEDIDA, { linkPreview: false });
        }

        if (texto === 'pagook') {
            limpiarEstadoChat(numeroReal);
            await client.sendMessage(chatId, `✅ *Su pago ha sido verificado y registrado correctamente.* \n\n¡Gracias por tu pago! Si necesita algo más, escríbenos. `, { linkPreview: false });
            console.log(`💳 Pago confirmado para ${numeroReal} por asesor`);
        }

        if (texto === 'pagoerror') {
            limpiarEstadoChat(numeroReal);
            await client.sendMessage(chatId, `❌ *No pudimos verificar su comprobante de pago.*\n\nPor favor comuníquese con nosotros para aclarar el inconveniente.\n📞 Horario de atención:\n📅 Lunes a Sábados: 7:00 AM - 10:00 PM\n📅 Domingos y Festivos: 8:00 AM - 4:00 PM`, { linkPreview: false });
            console.log(`💳 Pago rechazado para ${numeroReal} por asesor`);
        }

        if (texto === 'pagook') {
            limpiarEstadoChat(numeroReal);
            await client.sendMessage(chatId, `✅ *Su pago ha sido verificado y registrado correctamente.* \n\n¡Gracias por tu pago! Si necesita algo más, escríbenos.`, { linkPreview: false });
            console.log(`💳 Pago confirmado para ${numeroReal} por asesor`);
        }

        if (texto === 'pagoerror') {
            limpiarEstadoChat(numeroReal);
            await client.sendMessage(chatId, `❌ *No pudimos verificar su comprobante de pago.*\n\nPor favor comuníquese con nosotros para aclarar el inconveniente.\n📞 Horario de atención:\n📅 Lunes a Sábados: 7:00 AM - 10:00 PM\n📅 Domingos y Festivos: 8:00 AM - 4:00 PM`, { linkPreview: false });
            console.log(`💳 Pago rechazado para ${numeroReal} por asesor`);
        }
    } catch (error) {
        console.error('❌ Error en comando asesor:', error.message);
    }
});

// ─────────────────────────────────────────────
//  INICIAR
// ─────────────────────────────────────────────
process.on('SIGINT', () => { saveState(); process.exit(); });
process.on('SIGTERM', () => { saveState(); process.exit(); });

client.initialize();
