with open('/home/chatbot/bot-whatsapp/app.js', 'r') as f:
    code = f.read()

viejo = """        if (total != null) mensaje += `💰 *Total a pagar:* *$${Number(total).toLocaleString("es-CO")}*\\n`;
        if (fechas.limiteProntoPago) mensaje += `⚡ *Pronto pago hasta:* ${fechas.limiteProntoPago}\\n`;
        if (fechas.inicioTarifaNormal) mensaje += `📆 *Tarifa normal desde:* ${fechas.inicioTarifaNormal}\\n`;
        if (fechas.proximoCorte) mensaje += `✂️ *Próximo corte:* ${fechas.proximoCorte}\\n`;
        if (fechas.periodoPagadoInicio && fechas.periodoPagadoFin) mensaje += `📅 *Período pagado:* ${fechas.periodoPagadoInicio} al ${fechas.periodoPagadoFin}\\n`;"""

nuevo = """        if (total != null) mensaje += `💰 *Total a pagar:* *$${Number(total).toLocaleString("es-CO")}*\\n`;

        // Lógica de fechas de pago MASTV (1 al 18 de cada mes)
        const hoy = new Date();
        const diaHoy = hoy.getDate();
        const mes = hoy.toLocaleString("es-CO", { month: "long" });
        const anio = hoy.getFullYear();
        const fechaLimite = `18/${String(hoy.getMonth() + 1).padStart(2, "0")}/${anio}`;

        if (diaHoy <= 18) {
            mensaje += `✅ *Pago oportuno hasta:* ${fechaLimite}\\n`;
            mensaje += `⚠️ *Después del 18 corre riesgo de SUSPENSIÓN*\\n`;
        } else {
            mensaje += `🔴 *Fecha límite vencida* - Está en riesgo de SUSPENSIÓN\\n`;
        }

        if (fechas.periodoPagadoInicio && fechas.periodoPagadoFin) mensaje += `📅 *Período pagado:* ${fechas.periodoPagadoInicio} al ${fechas.periodoPagadoFin}\\n`;"""

if viejo in code:
    code = code.replace(viejo, nuevo)
    with open('/home/chatbot/bot-whatsapp/app.js', 'w') as f:
        f.write(code)
    print('✅ Fechas de pago MASTV aplicadas')
else:
    print('❌ Texto no encontrado')
