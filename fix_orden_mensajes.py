with open('/home/chatbot/bot-whatsapp/app.js', 'r') as f:
    code = f.read()

code = code.replace(
    """                        // Meter en cola de espera
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

                        if (hayAsesores) {
                            if (nId) await client.sendMessage(nId._serialized,
                                `✅ *Comprobante recibido correctamente.*\\n\\nUn asesor verificará tu pago a la brevedad. 🙏`,
                                { linkPreview: false }
                            );
                        } else {
                            if (nId) await client.sendMessage(nId._serialized,
                                `✅ *Comprobante recibido correctamente.*\\n\\n${MENSAJE_NO_DISPONIBLE}`,
                                { linkPreview: false }
                            );
                        }""",
    """                        // Confirmar al cliente primero
                        if (nId) await client.sendMessage(nId._serialized,
                            `✅ *Comprobante recibido correctamente.*\\n\\nUn asesor verificará tu pago a la brevedad. 🙏`,
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
                                `⏳ En este momento no tenemos asesores disponibles, pero tu comprobante quedó registrado y será atendido en el siguiente horario disponible.\\n\\n📅 Lunes a Sábados: 7:00 AM - 10:00 PM\\n📅 Domingos y Festivos: 8:00 AM - 4:00 PM`,
                                { linkPreview: false }
                            );
                        }"""
)

with open('/home/chatbot/bot-whatsapp/app.js', 'w') as f:
    f.write(code)
print('✅ Orden de mensajes corregido')
