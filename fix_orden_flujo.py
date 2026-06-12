with open('/home/chatbot/bot-whatsapp/app.js', 'r') as f:
    code = f.read()

code = code.replace(
    """            if (texto === '2') {
                if (nId) await client.sendMessage(nId._serialized, `📎 Por favor envía tu comprobante de pago (foto o PDF) directamente aquí.\\n\\nLo recibiremos junto con tus datos y un asesor lo verificará a la brevedad. ✅`, { linkPreview: false });
                setUserState(numeroReal, ESTADOS.ESPERANDO_COMPROBANTE_PAGO);
                touchActivity(numeroReal);
                return;
            }""",
    """            if (texto === '2') {
                if (nId) await client.sendMessage(nId._serialized,
                    `💳 ¿Por qué medio realizaste el pago?\\n\\n*1.* Nequi\\n*2.* Bancolombia\\n*3.* Davivienda\\n*4.* Otro\\n\\nEscribe *0* para volver al menú principal.`,
                    { linkPreview: false }
                );
                setUserState(numeroReal, ESTADOS.ESPERANDO_MEDIO_PAGO);
                touchActivity(numeroReal);
                return;
            }"""
)

with open('/home/chatbot/bot-whatsapp/app.js', 'w') as f:
    f.write(code)
print('✅ Flujo corregido')
