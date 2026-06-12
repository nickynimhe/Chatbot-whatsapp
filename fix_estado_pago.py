with open('/home/chatbot/bot-whatsapp/app.js', 'r') as f:
    code = f.read()

code = code.replace(
    "ESPERANDO_ACCION_FACTURA: 'esperando_accion_factura'",
    "ESPERANDO_ACCION_FACTURA: 'esperando_accion_factura',\n    ESPERANDO_ACCION_PAGO: 'esperando_accion_pago'"
)

with open('/home/chatbot/bot-whatsapp/app.js', 'w') as f:
    f.write(code)
print('✅ Estado ESPERANDO_ACCION_PAGO agregado')
