with open('/home/chatbot/bot-whatsapp/soporte-whatsapp/backend/src/routes/chats.routes.js', 'r') as f:
    code = f.read()

# Quitar textoCliente === '9' de la condición de crear chat
# y agregar verificación de es_flujo_bot
viejo = """        const enBlacklist = await usuarioEnSoporteHumano(numeroCanonico);
        console.log(`🔍 Usuario ${numeroCanonico} en blacklist: ${enBlacklist}`);
        let chat = await buscarChatPorClienteNumero(numeroCanonico)
        let chatIdBD
        let esReabierto = false
        if (chat.rows.length === 0) {
            const debeCrearChat = enBlacklist === true || (textoCliente === '9');
            if (debeCrearChat) {"""

nuevo = """        const enBlacklist = await usuarioEnSoporteHumano(numeroCanonico);
        console.log(`🔍 Usuario ${numeroCanonico} en blacklist: ${enBlacklist}`);
        let chat = await buscarChatPorClienteNumero(numeroCanonico)
        let chatIdBD
        let esReabierto = false
        if (chat.rows.length === 0) {
            // Solo crear chat si el cliente está en blacklist (pasó validación completa)
            // Nunca crear chat por mensajes del flujo automático del bot
            const debeCrearChat = enBlacklist === true;
            if (debeCrearChat) {"""

if viejo in code:
    code = code.replace(viejo, nuevo)
    with open('/home/chatbot/bot-whatsapp/soporte-whatsapp/backend/src/routes/chats.routes.js', 'w') as f:
        f.write(code)
    print('✅ Fix aplicado')
else:
    print('❌ Texto no encontrado')
