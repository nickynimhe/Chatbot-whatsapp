with open('/home/chatbot/bot-whatsapp/app.js', 'r') as f:
    code = f.read()

bloque = """
        // ========== ESTADO: ESPERANDO_COMPROBANTE_PAGO ==========
        if (userState.get(numeroReal) === ESTADOS.ESPERANDO_COMPROBANTE_PAGO) {
            const nId = await client.getNumberId(numeroReal);

            // Recuperar datos del cliente guardados
            let infoCliente = {};
            try {
                const raw = userState.get(numeroReal + '_clienteInfo');
                if (raw) infoCliente = JSON.parse(raw);
            } catch(e) {}

            const nombreTitular = infoCliente.NOMBRE || nombreReal;
            const contratoCliente = infoCliente.contrato || 'No disponible';

            // Si envió archivo (comprobante)
            if (msg.hasMedia) {
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
                            // Enviar al webhook con datos del cliente
                            const payloadComprobante = {
                                numero: numeroReal,
                                mensaje: `💳 COMPROBANTE DE PAGO\\nTitular: ${nombreTitular}\\nContrato: ${contratoCliente}`,
                                nombre: nombreReal,
                                url_adjunto: uploadResp.data.url,
                                tipo: uploadResp.data.tipo || 'imagen',
                                whatsapp_message_id: msg.id.id,
                                es_flujo_bot: true,
                                metadata_archivo: JSON.stringify({
                                    es_comprobante_pago: true,
                                    titular: nombreTitular,
                                    contrato: contratoCliente
                                })
                            };
                            await axios.post(`${CONFIG.BACKEND_URL}/api/webhook/whatsapp`, payloadComprobante);
                            console.log(`✅ Comprobante recibido de ${numeroReal} - Contrato: ${contratoCliente}`);

                            if (nId) await client.sendMessage(nId._serialized, `✅ *Comprobante recibido correctamente.*\\n\\nUn asesor verificará tu pago a la brevedad.\\n\\n*1.* Volver al menú principal\\n*2.* Finalizar`, { linkPreview: false });
                            setUserState(numeroReal, ESTADOS.ESPERANDO_NAVEGACION);
                            touchActivity(numeroReal);
                            return;
                        }
                    }
                } catch(e) {
                    console.error('❌ Error subiendo comprobante:', e.message);
                }
                if (nId) await client.sendMessage(nId._serialized, `❌ No pudimos recibir el archivo. Por favor intenta de nuevo enviando la foto o PDF.`, { linkPreview: false });
                return;
            }

            // Si envió texto en vez de archivo
            if (texto === '0') {
                deleteUserState(numeroReal);
                userState.delete(numeroReal + '_clienteInfo');
                if (nId) await client.sendMessage(nId._serialized, getMenuPrincipal(), { linkPreview: false });
                touchActivity(numeroReal);
                return;
            }

            if (nId) await client.sendMessage(nId._serialized, `📎 Por favor envía el comprobante como *foto o PDF*.\\n\\nEscribe *0* para volver al menú principal.`, { linkPreview: false });
            return;
        }

"""

code = code.replace(
    '        // ========== ESTADO: ESPERANDO_VALIDACION ==========',
    bloque + '        // ========== ESTADO: ESPERANDO_VALIDACION =========='
)

with open('/home/chatbot/bot-whatsapp/app.js', 'w') as f:
    f.write(code)
print('✅ Estado ESPERANDO_COMPROBANTE_PAGO agregado')
