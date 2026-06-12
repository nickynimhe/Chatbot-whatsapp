with open('/home/chatbot/bot-whatsapp/app.js', 'r') as f:
    code = f.read()

# ─────────────────────────────────────────────
# 1. Actualizar consultarCuentaSoftv para soportar búsqueda por contrato
#    y retornar periodoPagado
# ─────────────────────────────────────────────
code = code.replace(
    """        // Primero buscar por cédula para obtener el ID interno
        let idInterno = clienteId;
        try {
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
        } catch (buscarErr) {
            // Si falla la búsqueda por cédula, intentar directo con el valor ingresado
            console.log(`⚠️ Búsqueda por cédula falló, intentando con ID directo: ${clienteId}`);
        }""",
    """        // Detectar si es contrato (formato: digitos-digito) o cédula
        let idInterno = clienteId;
        const esContrato = /^\\d+-\\d+$/.test(clienteId.toString().trim());

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
        }"""
)

# ─────────────────────────────────────────────
# 2. Retornar periodoPagado en el resultado
# ─────────────────────────────────────────────
code = code.replace(
    "        return { ok: true, mensaje, clienteInfo };",
    """        const periodoPagado = (fechas.periodoPagadoInicio && fechas.periodoPagadoFin)
            ? `${fechas.periodoPagadoInicio} al ${fechas.periodoPagadoFin}`
            : null;
        return { ok: true, mensaje, clienteInfo, periodoPagado };"""
)

# ─────────────────────────────────────────────
# 3. Guardar periodoPagado en userState
# ─────────────────────────────────────────────
code = code.replace(
    "                if (resultado.clienteInfo) userState.set(numeroReal + '_clienteInfo', JSON.stringify(resultado.clienteInfo));",
    """                if (resultado.clienteInfo) userState.set(numeroReal + '_clienteInfo', JSON.stringify(resultado.clienteInfo));
                if (resultado.periodoPagado) userState.set(numeroReal + '_periodo_pagado', resultado.periodoPagado);"""
)

# ─────────────────────────────────────────────
# 4. Agregar período pagado al descPago del asesor y al mensaje al cliente
#    y poner subtítulos en negrilla solamente
# ─────────────────────────────────────────────
code = code.replace(
    """            // Construir descripción del comprobante
            let descPago = `💳 *COMPROBANTE DE PAGO*\\n`;
            descPago += `👤 Titular cuenta: ${nombreTitular}\\n`;
            descPago += `🔖 Contrato: ${contratoCliente}\\n`;
            descPago += `💳 Medio de pago: ${medioPago}\\n`;
            if (titularNequi) descPago += `👤 Titular Nequi: ${titularNequi}\\n`;""",
    """            // Recuperar período pagado
            const periodoPagado = userState.get(numeroReal + '_periodo_pagado') || 'No disponible';

            // Construir descripción del comprobante (subtítulos en negrilla)
            let descPago = `💳 *COMPROBANTE DE PAGO*\\n`;
            descPago += `*Titular cuenta:* ${nombreTitular}\\n`;
            descPago += `*Contrato:* ${contratoCliente}\\n`;
            descPago += `*Medio de pago:* ${medioPago}\\n`;
            if (titularNequi) descPago += `*Titular Nequi:* ${titularNequi}\\n`;
            descPago += `*Mes que paga:* ${periodoPagado}\\n`;"""
)

# ─────────────────────────────────────────────
# 5. Mostrar mes que paga al cliente en confirmación
# ─────────────────────────────────────────────
code = code.replace(
    """                        // Confirmar al cliente primero
                        if (nId) await client.sendMessage(nId._serialized,
                            `✅ *Comprobante recibido correctamente.*\\n\\nUn asesor verificará tu pago a la brevedad. 🙏`,
                            { linkPreview: false }
                        );""",
    """                        // Confirmar al cliente con período de pago
                        const periodoCliente = userState.get(numeroReal + '_periodo_pagado') || '';
                        const msgConfirmacion = periodoCliente
                            ? `✅ *Comprobante recibido correctamente.*\\n\\n📅 *Mes que estás pagando:* ${periodoCliente}\\n\\nUn asesor verificará tu pago a la brevedad. 🙏`
                            : `✅ *Comprobante recibido correctamente.*\\n\\nUn asesor verificará tu pago a la brevedad. 🙏`;
                        if (nId) await client.sendMessage(nId._serialized, msgConfirmacion, { linkPreview: false });"""
)

# ─────────────────────────────────────────────
# 6. Limpiar _periodo_pagado al finalizar
# ─────────────────────────────────────────────
code = code.replace(
    """                        userState.delete(numeroReal + '_clienteInfo');
                        userState.delete(numeroReal + '_medio_pago');
                        userState.delete(numeroReal + '_titular_nequi');""",
    """                        userState.delete(numeroReal + '_clienteInfo');
                        userState.delete(numeroReal + '_medio_pago');
                        userState.delete(numeroReal + '_titular_nequi');
                        userState.delete(numeroReal + '_periodo_pagado');"""
)

# ─────────────────────────────────────────────
# 7. Validar entrada cédula/contrato — rechazar texto inválido
# ─────────────────────────────────────────────
code = code.replace(
    """        if (cedula === '0') {
                deleteUserState(numeroReal);
                userState.delete(numeroReal + '_intentos');
                const nId = await client.getNumberId(numeroReal);
                if (nId) await client.sendMessage(nId._serialized, getMenuPrincipal(), { linkPreview: false });
                touchActivity(numeroReal);
                return;
            }

            const resultado = await consultarCuentaSoftv(cedula);""",
    """        if (cedula === '0') {
                deleteUserState(numeroReal);
                userState.delete(numeroReal + '_intentos');
                const nId = await client.getNumberId(numeroReal);
                if (nId) await client.sendMessage(nId._serialized, getMenuPrincipal(), { linkPreview: false });
                touchActivity(numeroReal);
                return;
            }

            // Validar que sea cédula (solo números) o contrato (####-#)
            const esCedulaValida = /^\\d{5,12}$/.test(cedula.trim());
            const esContratoValido = /^\\d+-\\d+$/.test(cedula.trim());
            if (!esCedulaValida && !esContratoValido) {
                const nId = await client.getNumberId(numeroReal);
                if (nId) await client.sendMessage(nId._serialized,
                    `⚠️ Por favor ingresa un número de cédula válido (solo números) o número de contrato (ejemplo: 2873-1).\\n\\nEscribe *0* para volver al menú principal.`,
                    { linkPreview: false }
                );
                return;
            }

            const resultado = await consultarCuentaSoftv(cedula);"""
)

# ─────────────────────────────────────────────
# 8. Obligar foto en ESPERANDO_ARCHIVO_COMPROBANTE — mejorar mensaje
# ─────────────────────────────────────────────
code = code.replace(
    """            if (!msg.hasMedia) {
                if (nId) await client.sendMessage(nId._serialized,
                    `📎 Por favor envía el comprobante como *foto o PDF*.\\n\\nEscribe *0* para cancelar.`,
                    { linkPreview: false }
                );
                return;
            }""",
    """            if (!msg.hasMedia) {
                if (nId) await client.sendMessage(nId._serialized,
                    `📎 Necesito que me envíes el *comprobante de pago* como foto o PDF para poder procesarlo.\\n\\nPor favor adjunta la imagen o documento. Escribe *0* para cancelar.`,
                    { linkPreview: false }
                );
                return;
            }"""
)

with open('/home/chatbot/bot-whatsapp/app.js', 'w') as f:
    f.write(code)

print('✅ Todos los fixes aplicados')
