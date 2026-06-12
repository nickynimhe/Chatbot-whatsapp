with open('/home/chatbot/bot-whatsapp/app.js', 'r') as f:
    code = f.read()

lines = code.split('\n')

nuevo_bloque = [
    '        // Extraer datos del cliente',
    '        const nombreCliente = clienteInfo ? clienteInfo.NOMBRE || "" : "";',
    '        const contrato = clienteInfo ? clienteInfo.contrato || "" : "";',
    '        const direccion = clienteInfo ? clienteInfo.Direccion || "" : "";',
    '',
    '        // Extraer datos del servicio',
    '        const infoP = servicio.InformacionPaquete || {};',
    '        const servicios = servicio.servicios || [];',
    '        const tieneInfo = servicios.length > 0 || infoP.paquete_nombre || infoP.proximo_corte;',
    '        if (!tieneInfo) {',
    '            return { ok: false, tipo: "no_encontrado" };',
    '        }',
    '',
    '        // Extraer datos del detalle',
    '        const resumen = detalle.resumenPago || {};',
    '        const fechas = detalle.fechasServicio || {};',
    '        const items = detalle.servicios || [];',
    '',
    '        const total = resumen.Total != null ? resumen.Total : resumen.subtotal;',
    '        const paquete = infoP.paquete_nombre || "No disponible";',
    '',
    '        // Estado general',
    '        const todosInstalados = servicios.every(s => s.status === "Instalado");',
    '        const estadoEmoji = todosInstalados ? "🟢" : "🔴";',
    '        const estadoTexto = todosInstalados ? "Activo" : "Suspendido";',
    '',
    '        // Servicios visibles',
    '        const itemsVisibles = items.filter(s => s.DESCORTA && !(s.Importe === 0 && s.DESCORTA.toLowerCase().includes("renta")));',
    '        const descServicios = itemsVisibles.map(s => `  • ${s.DESCORTA}: *$${Number(s.Importe).toLocaleString("es-CO")}*`).join("\\n");',
    '',
    '        // Construir mensaje visual',
    '        let mensaje = `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\\n`;',
    '        mensaje += `\U0001f4cb *ESTADO DE CUENTA*\\n`;',
    '        mensaje += `\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\\n\\n`;',
    '        if (nombreCliente) mensaje += `\U0001f464 *Titular:* ${nombreCliente}\\n`;',
    '        if (contrato) mensaje += `\U0001f516 *Contrato:* ${contrato}\\n`;',
    '        if (direccion) mensaje += `\U0001f4cd *Direcci\u00f3n:* ${direccion}\\n`;',
    '        mensaje += `\\n`;',
    '        mensaje += `${estadoEmoji} *Estado:* ${estadoTexto}\\n`;',
    '        mensaje += `\U0001f4e6 *Plan:* ${paquete}\\n\\n`;',
    '        if (descServicios) mensaje += `\U0001f4bc *Detalle de servicios:*\\n${descServicios}\\n\\n`;',
    '        if (total != null) mensaje += `\U0001f4b0 *Total a pagar:* *$${Number(total).toLocaleString("es-CO")}*\\n`;',
    '        if (fechas.limiteProntoPago) mensaje += `\u26a1 *Pronto pago hasta:* ${fechas.limiteProntoPago}\\n`;',
    '        if (fechas.inicioTarifaNormal) mensaje += `\U0001f4c6 *Tarifa normal desde:* ${fechas.inicioTarifaNormal}\\n`;',
    '        if (fechas.proximoCorte) mensaje += `\u2702\ufe0f *Pr\u00f3ximo corte:* ${fechas.proximoCorte}\\n`;',
    '        if (fechas.periodoPagadoInicio && fechas.periodoPagadoFin) mensaje += `\U0001f4c5 *Per\u00edodo pagado:* ${fechas.periodoPagadoInicio} al ${fechas.periodoPagadoFin}\\n`;',
    '        mensaje += `\\n\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501`;',
    '',
    '        return { ok: true, mensaje };',
]

# Reemplazar líneas 703 a 738 (índices 702 a 737)
nuevas_lineas = lines[:702] + nuevo_bloque + lines[738:]

with open('/home/chatbot/bot-whatsapp/app.js', 'w') as f:
    f.write('\n'.join(nuevas_lineas))

print('✅ Bloque reemplazado correctamente')
