with open('/home/chatbot/bot-whatsapp/app.js', 'r') as f:
    code = f.read()

viejo = """        // ========== ESTADO: ESPERANDO_COMPROBANTE_PAGO ==========
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
        }"""

nuevo = """        // ========== ESTADO: ESPERANDO_COMPROBANTE_PAGO (inicio flujo) ==========
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
                `💳 ¿Por qué medio realizaste el pago?\\n\\n*1.* Nequi\\n*2.* Bancolombia\\n*3.* Davivienda\\n*4.* Otro\\n\\nEscribe *0* para volver al menú principal.`,
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
                if (nId) await client.sendMessage(nId._serialized, `Opción no válida. Responde *1*, *2*, *3* o *4*.\\n\\nEscribe *0* para volver al menú principal.`, { linkPreview: false });
                return;
            }
            userState.set(numeroReal + '_medio_pago', medios[texto]);
            if (texto === '1') {
                // Nequi: pedir nombre del titular
                if (nId) await client.sendMessage(nId._serialized,
                    `Por favor indícanos el *nombre del titular del Nequi* para poder buscarlo en nuestras cuentas.\\n\\nEscribe *0* para volver al menú principal.`,
                    { linkPreview: false }
                );
                setUserState(numeroReal, ESTADOS.ESPERANDO_TITULAR_NEQUI);
            } else {
                // Otros medios: ir directo al comprobante
                if (nId) await client.sendMessage(nId._serialized,
                    `📎 Por favor envía tu *comprobante de pago* (foto o PDF).\\n\\nEscribe *0* para cancelar.`,
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
                `📎 Gracias. Ahora envía tu *comprobante de pago* (foto o PDF).\\n\\nEscribe *0* para cancelar.`,
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
                    `📎 Por favor envía el comprobante como *foto o PDF*.\\n\\nEscribe *0* para cancelar.`,
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
            let descPago = `💳 *COMPROBANTE DE PAGO*\\n`;
            descPago += `👤 Titular cuenta: ${nombreTitular}\\n`;
            descPago += `🔖 Contrato: ${contratoCliente}\\n`;
            descPago += `💳 Medio de pago: ${medioPago}\\n`;
            if (titularNequi) descPago += `👤 Titular Nequi: ${titularNequi}\\n`;

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

                        // Meter en cola de espera
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
                        }

                        // Limpiar datos temporales y poner en blacklist
                        userState.delete(numeroReal + '_clienteInfo');
                        userState.delete(numeroReal + '_medio_pago');
                        userState.delete(numeroReal + '_titular_nequi');
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
        }"""

if viejo in code:
    code = code.replace(viejo, nuevo)
    with open('/home/chatbot/bot-whatsapp/app.js', 'w') as f:
        f.write(code)
    print('✅ Flujo comprobante completo aplicado')
else:
    print('❌ Texto no encontrado')
