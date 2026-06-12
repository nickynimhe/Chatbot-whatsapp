with open('/home/chatbot/bot-whatsapp/app.js', 'r') as f:
    code = f.read()

# 1. Actualizar firma
code = code.replace(
    'async function consultarCuentaSoftv(clienteId) {',
    'async function consultarCuentaSoftv(clienteId, clienteInfo = null) {'
)

# 2. Guardar clienteInfo desde la búsqueda
code = code.replace(
    'idInterno = buscarResp.data[0].cliente_id;',
    'idInterno = buscarResp.data[0].cliente_id;\n                clienteInfo = buscarResp.data[0];'
)

with open('/home/chatbot/bot-whatsapp/app.js', 'w') as f:
    f.write(code)

print('✅ clienteInfo integrado')
