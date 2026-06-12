with open('/home/chatbot/bot-whatsapp/app.js', 'r') as f:
    code = f.read()

# 1. Quitar "¿Qué deseas hacer?" del mensaje de estado
viejo1 = 'const menuFactura = `\\n\\n¿Qué deseas hacer?\\n*1.* Ver medios de pago\\n*2.* Volver al menú principal\\n*3.* Finalizar`;'
nuevo1 = 'const menuFactura = `\\n\\n*1.* Ver medios de pago\\n*2.* Volver al menú principal\\n*3.* Finalizar`;'

# 2. Actualizar el bloque de medios de pago en ESPERANDO_ACCION_FACTURA
viejo2 = """            if (texto === '1') {
                if (nId) await client.sendMessage(nId._serialized, obtenerMensajePago(), { linkPreview: false });
                setUserState(numeroReal, ESTADOS.ESPERANDO_NAVEGACION);
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
            if (nId) await client.sendMessage(nId._serialized, 'Opción no válida. Responde *1*, *2* o *3*.', { linkPreview: false });
            return;
        }"""

nuevo2 = """            if (texto === '1') {
                const menuPago = `*1.* Volver al menú principal\\n*2.* Hablar con un asesor (envío de soporte de pago)\\n*3.* Finalizar`;
                if (nId) await client.sendMessage(nId._serialized, obtenerMensajePago() + '\\n\\n' + menuPago, { linkPreview: false });
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
            if (nId) await client.sendMessage(nId._serialized, 'Opción no válida. Responde *1*, *2* o *3*.', { linkPreview: false });
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
                // Mismo flujo que opción 9 - soporte técnico
                console.log(`💳 Cliente ${numeroReal} quiere hablar con asesor para soporte de pago`);

                let hayAsesores = false;
                try {
                    const response = await axios.get(`${CONFIG.BACKEND_URL}/api/chat/hay-agentes-disponibles`, { timeout: 5000 });
                    hayAsesores = response.data?.hay_agentes === true;
                } catch (err) {}

                const mensajeValidacion = await obtenerMensajeValidacion();

                if (hayAsesores) {
                    if (nId) await client.sendMessage(nId._serialized, mensajeValidacion, { linkPreview: false });
                    setUserState(numeroReal, ESTADOS.ESPERANDO_VALIDACION);
                    console.log(`✅ Cliente ${numeroReal} en validación para soporte de pago (HAY asesores)`);
                } else {
                    if (nId) await client.sendMessage(nId._serialized, MENSAJE_NO_DISPONIBLE, { linkPreview: false });
                    setUserState(numeroReal, ESTADOS.ESPERANDO_VALIDACION);
                    console.log(`📝 Cliente ${numeroReal} en validación para soporte de pago (SIN asesores)`);
                }
                touchActivity(numeroReal);
                return;
            }
            if (texto === '3') {
                limpiarEstadoChat(numeroReal);
                if (nId) await client.sendMessage(nId._serialized, MENSAJE_DESPEDIDA, { linkPreview: false });
                return;
            }
            if (nId) await client.sendMessage(nId._serialized, 'Opción no válida. Responde *1*, *2* o *3*.', { linkPreview: false });
            return;
        }"""

if viejo1 in code:
    code = code.replace(viejo1, nuevo1)
    print('✅ Pregunta quitada')
else:
    print('❌ viejo1 no encontrado')

if viejo2 in code:
    code = code.replace(viejo2, nuevo2)
    print('✅ Menú de pago actualizado')
else:
    print('❌ viejo2 no encontrado')

with open('/home/chatbot/bot-whatsapp/app.js', 'w') as f:
    f.write(code)
