# Chatbot-whatsapp
Bot de WhatsApp para atención al cliente con panel administrativo. Incluye menú interactivo, gestión de tickets y chat en tiempo real.

# WhatsApp Bot - Sistema de Atención al Cliente

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Bot-25D366)](https://whatsapp.com)

Bot de WhatsApp desarrollado para M@stv Producciones como parte de un requerimiento técnico.

# Tabla de Contenidos

- [Características](#-características)
- [Menú del Bot](#-menú-del-bot)
- [Arquitectura](#-arquitectura)
- [Tecnologías](#-tecnologías)
- [Instalación](#-instalación)
- [Uso](#-uso)
- [Contacto](#-contacto)

# Características

# Bot de WhatsApp
- Menú interactivo con 9 opciones
- Respuestas automáticas para información común
- Soporte técnico con validación de datos
- Detección de audios con mensaje automático
- Control de inactividad y cierre de chat
- Modo falla para emergencias
- Reconexión automática 24/7

# Panel de Administración
- Gestión de agentes (disponible/ocupado/descanso)
- Asignación automática de tickets
- Chat en tiempo real con WebSockets
- Historial de conversaciones
- Subida y envío de archivos


# Menú del Bot

| 1  Pagar factura 
| 2  Conocer planes 
| 3  Cobertura 
| 4  Adquirir servicios 
| 5  Puntos de pago y oficinas 
| 6  Facturación y cartera 
| 7  Soporte M@STV PLAY 
| 8  Calidad de la red 
| 9  Soporte técnico (atención humana) 
| 0  Finalizar 


# Arquitectura

WhatsApp → Bot (puerto 9019) → Backend (9020) → Frontend (5173) → PostgreSQL

# Tecnologías

- **Bot**: whatsapp-web.js, Puppeteer, Node.js
- **Backend**: Express, Socket.io, PostgreSQL, JWT
- **Frontend**: React, Vite, TailwindCSS
- **Servidor**: PM2, Ubuntu

# Instalación

```bash
git clone https://github.com/tuusuario/bot-whatsapp-mastv.git
cd bot-whatsapp-mastv
npm install
cd soporte-whatsapp/backend && npm install
cd ../frontend && npm install && npm run build

# Uso

```bash
# Iniciar todos los servicios
pm2 start ecosystem.config.js

# Escanear QR con WhatsApp
pm2 logs bot-whatsapp
```

# Desarrollador

**Jarith Nicol Hernandez Moreno**

- GitHub: [@tugithub](https://github.com/tugithub)
- LinkedIn: [tulinkedin](https://linkedin.com/in/tuusuario)
- Portafolio: [tuportafolio.com](https://tuportafolio.com)

# Licencia

MIT License - Copyright (c) 2026 [Jarith Nicol Hernadez Moreno]

Esto significa que puedes usar, modificar y distribuir este proyecto libremente.

# Nota

Este proyecto fue desarrollado como parte de un requerimiento técnico para M@stv Producciones.
El código se comparte con fines educativos y de referencia.
```

```markdown
# Contacto

- 📧 Email: nimhe000@gmail.com
- 💼 LinkedIn: /in/tuusuario
- 🐙 GitHub: @tugithub
- 🌐 Portafolio: tuportafolio.com
```

[![GitHub](https://img.shields.io/badge/GitHub-@tugithub-181717?logo=github)](https://github.com/tugithub)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-tuusuario-0A66C2?logo=linkedin)](https://linkedin.com/in/tuusuario)
[![Email](https://img.shields.io/badge/Email-tuemail@gmail.com-EA4335?logo=gmail)](mailto:tuemail@gmail.com)
```
