with open('/home/chatbot/bot-whatsapp/app.js', 'r') as f:
    lines = f.readlines()

# Eliminar líneas duplicadas consecutivas
cleaned = []
for i, line in enumerate(lines):
    if i == 0:
        cleaned.append(line)
        continue
    if line == lines[i-1]:
        continue  # saltar duplicada
    cleaned.append(line)

with open('/home/chatbot/bot-whatsapp/app.js', 'w') as f:
    f.writelines(cleaned)

print(f'Original: {len(lines)} lineas')
print(f'Limpio: {len(cleaned)} lineas')
