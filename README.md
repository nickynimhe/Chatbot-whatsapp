Aquí tienes un README más natural, personal y con estilo, sin parecer escrito por IA:

```markdown
# 🤖 whatsapp-bot-mastv

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)

> Bot de WhatsApp + panel administrativo que hice para M@stv Producciones.  
> El bot responde automáticamente opciones del menú y puede pasar el chat a un agente real cuando toca.

---

## 📦 ¿Qué hace esto?

Básicamente es un bot que atiende por WhatsApp. La gente escribe `hola`, el bot muestra un menú, y dependiendo de lo que elijan:

- Les da info automática (planes, cobertura, oficinas...)
- O los pasa con un agente si ocupan soporte real

También tiene un panel donde los agentes pueden ver los chats, responder, subir archivos, y ver el historial.

---

## 🧠 Tecnologías que usé

| Capa | Qué usé |
|------|---------|
| Bot | whatsapp-web.js, Puppeteer |
| Backend | Node.js, Express, Socket.io, JWT |
| Frontend | React, Vite, TailwindCSS |
| Base de datos | PostgreSQL |
| Servidor | PM2 en Ubuntu |

---

## 📱 El menú del bot

| Opción | Qué hace |
|--------|----------|
| 1 | Info de pagos |
| 2 | Planes disponibles |
| 3 | Cobertura |
| 4 | Cómo adquirir servicios |
| 5 | Oficinas y puntos de pago |
| 6 | Facturación |
| 7 | Soporte M@STV PLAY |
| 8 | Test de velocidad |
| 9 | Pasar con un asesor humano |
| 0 | Salir |

El bot se desconecta por inactividad y tiene un "modo falla" por si algo se cae.

---

## 🏗️ Cómo está armado

```
WhatsApp → Bot (puerto 9019) → Backend (9020) → Frontend (5173) → BD
```

Todo se maneja con WebSockets, entonces los mensajes llegan en tiempo real al panel.

---

## 🚀 Instalación (por si alguien quiere correrlo)

```bash
git clone https://github.com/JarithHernandez/whatsapp-bot-mastv.git
cd whatsapp-bot-mastv
npm install
cd soporte-whatsapp/backend && npm install
cd ../frontend && npm install && npm run build
```

Después configuras las variables de entorno, tu base de datos, y lo corres con PM2:

```bash
pm2 start ecosystem.config.js
pm2 save
```

Escaneás el QR que aparece en los logs y ya.

---

## 📁 Algo de la estructura

```
bot-whatsapp/
├── app.js
├── ecosystem.config.js
├── soporte-whatsapp/
│   ├── backend/       # API + WebSockets
│   └── frontend/      # Panel de agentes
└── .wwebjs_auth/      # Sesión guardada de WhatsApp
```

---

## 👤 Sobre mí

Soy **Jarith Hernandez** (nick: `nickynimhe`), desarrollador full-stack.  
Este proyecto lo hice como parte de un requerimiento técnico para una empresa de telecomunicaciones.

[![GitHub](https://img.shields.io/badge/GitHub-JarithHernandez-181717?style=flat-square&logo=github)](https://github.com/JarithHernandez)

---

## 📄 Licencia

MIT — libre de usar, modificar y compartir. Solo da crédito.

---

> ¿Preguntas? Abrí un issue o háblame directamente.
```

## También podés agregar imágenes

Si querés que se vea más lindo, podés agregar capturas del bot o del panel:

```markdown
## 🖼️ Capturas

![Menú del bot](https://i.imgur.com/xxxxx.png)
![Panel de agentes](https://i.imgur.com/yyyyy.png)
```

## Y un badge de visitas (opcional)

```markdown
![Visitas](https://komarev.com/ghpvc/?username=JarithHernandez&label=Repo+Views&color=blue&style=flat-square)
```

## Tips para que NO parezca IA:

| Hacer ✅ | Evitar ❌ |
|---------|----------|
| "hice", "usé", "me funcionó" | "se implementó", "se utilizó" |
| "básicamente", "onda", "qué sé yo" | textos demasiado formales |
| Emojis naturales 😅 | Emojis exagerados |
| Explicaciones cortas y directas | Párrafos eternos |

¿Querés que le agregue o le saque algo?
