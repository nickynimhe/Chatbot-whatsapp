with open('/home/chatbot/bot-whatsapp/app.js', 'r') as f:
    code = f.read()

# 1. Agregar nuevos estados
code = code.replace(
    "ESPERANDO_COMPROBANTE_PAGO: 'esperando_comprobante_pago'",
    """ESPERANDO_COMPROBANTE_PAGO: 'esperando_comprobante_pago',
    ESPERANDO_MEDIO_PAGO: 'esperando_medio_pago',
    ESPERANDO_TITULAR_NEQUI: 'esperando_titular_nequi',
    ESPERANDO_ARCHIVO_COMPROBANTE: 'esperando_archivo_comprobante'"""
)

with open('/home/chatbot/bot-whatsapp/app.js', 'w') as f:
    f.write(code)
print('✅ Estados agregados')
