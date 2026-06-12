with open('/home/chatbot/bot-whatsapp/app.js', 'r') as f:
    code = f.read()

code = code.replace(
    "        if (texto !== 'end' && texto !== 'main') return;",
    "        if (texto !== 'end' && texto !== 'main' && texto !== 'pagook' && texto !== 'pagoerror') return;"
)

code = code.replace(
    """        if (texto === 'end') {
            limpiarEstadoChat(numeroReal);
            await client.sendMessage(chatId, MENSAJE_ATENCION_FINALIZADA, { linkPreview: false });
            await client.sendMessage(chatId, MENSAJE_DESPEDIDA, { linkPreview: false });
        }""",
    """        if (texto === 'end') {
            limpiarEstadoChat(numeroReal);
            await client.sendMessage(chatId, MENSAJE_ATENCION_FINALIZADA, { linkPreview: false });
            await client.sendMessage(chatId, MENSAJE_DESPEDIDA, { linkPreview: false });
        }

        if (texto === 'pagook') {
            limpiarEstadoChat(numeroReal);
            await client.sendMessage(chatId, `✅ *Tu pago ha sido verificado y registrado correctamente.* \\n\\n¡Gracias por tu pago! Si necesitas algo más, escríbenos. 🙏`, { linkPreview: false });
            console.log(`💳 Pago confirmado para ${numeroReal} por asesor`);
        }

        if (texto === 'pagoerror') {
            limpiarEstadoChat(numeroReal);
            await client.sendMessage(chatId, `❌ *No pudimos verificar tu comprobante de pago.*\\n\\nPor favor comunícate con nosotros para aclarar el inconveniente.\\n📞 Horario de atención:\\n📅 Lunes a Sábados: 7:00 AM - 10:00 PM\\n📅 Domingos y Festivos: 8:00 AM - 4:00 PM`, { linkPreview: false });
            console.log(`💳 Pago rechazado para ${numeroReal} por asesor`);
        }"""
)

with open('/home/chatbot/bot-whatsapp/app.js', 'w') as f:
    f.write(code)
print('✅ Comandos pagook y pagoerror agregados')
