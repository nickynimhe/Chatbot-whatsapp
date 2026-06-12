with open('/home/chatbot/bot-whatsapp/app.js', 'r') as f:
    code = f.read()

# 1. Agregar estado ESPERANDO_COMPROBANTE_PAGO
code = code.replace(
    "ESPERANDO_ACCION_PAGO: 'esperando_accion_pago'",
    "ESPERANDO_ACCION_PAGO: 'esperando_accion_pago',\n    ESPERANDO_COMPROBANTE_PAGO: 'esperando_comprobante_pago'"
)

# 2. Guardar clienteInfo en userState cuando se encuentra el cliente
code = code.replace(
    """            if (resultado.ok) {
                userState.delete(numeroReal + '_intentos');
                const nId = await client.getNumberId(numeroReal);
                const menuFactura = `\\n\\n*1.* Ver medios de pago\\n*2.* Volver al menú principal\\n*3.* Finalizar`;
                if (nId) await client.sendMessage(nId._serialized, resultado.mensaje + menuFactura, { linkPreview: false });
                setUserState(numeroReal, ESTADOS.ESPERANDO_ACCION_FACTURA);
                touchActivity(numeroReal);
                return;
            }""",
    """            if (resultado.ok) {
                userState.delete(numeroReal + '_intentos');
                if (resultado.clienteInfo) userState.set(numeroReal + '_clienteInfo', JSON.stringify(resultado.clienteInfo));
                const nId = await client.getNumberId(numeroReal);
                const menuFactura = `\\n\\n*1.* Ver medios de pago\\n*2.* Volver al menú principal\\n*3.* Finalizar`;
                if (nId) await client.sendMessage(nId._serialized, resultado.mensaje + menuFactura, { linkPreview: false });
                setUserState(numeroReal, ESTADOS.ESPERANDO_ACCION_FACTURA);
                touchActivity(numeroReal);
                return;
            }"""
)

# 3. Retornar clienteInfo desde consultarCuentaSoftv
code = code.replace(
    "        return { ok: true, mensaje };",
    "        return { ok: true, mensaje, clienteInfo };"
)

# 4. Cambiar flujo opción 2 en ESPERANDO_ACCION_PAGO
code = code.replace(
    """            if (texto === '2') {
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
            }""",
    """            if (texto === '2') {
                if (nId) await client.sendMessage(nId._serialized, `📎 Por favor envía tu comprobante de pago (foto o PDF) directamente aquí.\\n\\nLo recibiremos junto con tus datos y un asesor lo verificará a la brevedad. ✅`, { linkPreview: false });
                setUserState(numeroReal, ESTADOS.ESPERANDO_COMPROBANTE_PAGO);
                touchActivity(numeroReal);
                return;
            }"""
)

with open('/home/chatbot/bot-whatsapp/app.js', 'w') as f:
    f.write(code)
print('✅ Fix comprobante aplicado')
