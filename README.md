#  WhatsApp Customer Support Bot

<div align="center">

### Sistema de atención al cliente vía WhatsApp

Bot desarrollado en Node.js con panel administrativo en tiempo real para gestión de tickets y soporte técnico.

![Node.js](https://img.shields.io/badge/Node.js-20.x-339933?logo=node.js\&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react\&logoColor=black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql\&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.IO-Realtime-black?logo=socketdotio)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

</div>
<br><br>

<img src="docs/login-demo.gif" width="900" alt="Demo del sistema">

</div>

---

##  Descripción

Proyecto desarrollado como solución de atención al cliente mediante WhatsApp, permitiendo automatizar consultas frecuentes y escalar conversaciones a agentes humanos mediante una plataforma web en tiempo real.

### Objetivos

- Reducir tiempos de respuesta
- Automatizar solicitudes frecuentes
- Gestionar tickets de soporte
- Centralizar la atención al cliente
- Mantener disponibilidad 24/7

---

##  Características Principales

###  Bot Inteligente

* Menú interactivo de servicios
* Flujo conversacional guiado
* Atención automática 24/7
* Validación de datos del usuario
* Reconocimiento de mensajes de audio
* Control de sesiones e inactividad
* Reconexión automática ante fallos

###  Atención Humana

* Transferencia automática a agentes
* Sistema de tickets
* Cola de atención
* Seguimiento de conversaciones
* Historial completo

###  Panel Administrativo

* Gestión de agentes
* Estado disponible / ocupado / descanso
* Chat en tiempo real
* Dashboard operativo
* Envío de archivos
* Historial de conversaciones

---

## Capturas

### Dashboard

![Dashboard](docs/dashboard.png)

### Chat en tiempo real

![Chat](docs/chat.gif)

##  Menú del Bot


| 1     Pagar factura / Ver estado de cuenta             
| 2     Consultar planes          
| 3     Ver cobertura             
| 4     Adquirir servicios        
| 5     Oficinas y puntos de pago

| 6     Facturación y cartera     
| 7     Soporte M@STV PLAY        
| 8     Calidad de la red         
| 9     Soporte técnico           
| 0     Finalizar conversación    

---

##  Arquitectura

```text
┌─────────────┐
│  WhatsApp   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Bot Node.js │
│ Puerto 9019 │
└──────┬──────┘
       │ API
       ▼
┌─────────────┐
│   Backend   │
│ Puerto 9020 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Frontend   │
│ Puerto 5173 │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ PostgreSQL  │
└─────────────┘
```

---

## Stack Tecnológico

### Backend

* Node.js
* Express
* PostgreSQL
* JWT
* Socket.io

### Bot

* whatsapp-web.js
* Puppeteer

### Frontend

* React
* Vite
* TailwindCSS

### Infraestructura

* Ubuntu Server
* PM2
* Nginx

---

## Instalación

### 1. Clonar repositorio

```bash
git clone https://github.com/nickynimhe/Chatbot-whatsapp.git
cd Chatbot-whatsapp
```

### 2. Instalar dependencias

```bash
npm install

cd soporte-whatsapp/backend
npm install

cd ../frontend
npm install
```

### 3. Construir frontend

```bash
npm run build
```

---

## Ejecución

### Iniciar servicios

```bash
pm2 start ecosystem.config.js
```

### Ver logs

```bash
pm2 logs
```

### Escanear QR

```bash
pm2 logs bot-whatsapp
```

---

##  Estructura del Proyecto

```bash
project/
│
├── bot-whatsapp/
│
├── soporte-whatsapp/
│   ├── backend/
│   └── frontend/
│
├── ecosystem.config.js
│
└── README.md
```

---

##  Funcionalidades Destacadas

| Funcionalidad         | Estado |
| --------------------- | ------ |
| Bot WhatsApp          | ✅      |
| Chat Tiempo Real      | ✅      |
| Sistema Tickets       | ✅      |
| Gestión Agentes       | ✅      |
| Historial Chats       | ✅      |
| Archivos Adjuntos     | ✅      |
| Reconexión Automática | ✅      |

---

##  Autor

### Jarith Nicol Hernandez Moreno

Desarrollador Full Stack

 GitHub: https://github.com/tuusuario

 LinkedIn: https://linkedin.com/in/tuusuario

 Portafolio: https://tuportafolio.com

 Email: [tuemail@gmail.com](mailto:tuemail@gmail.com)

---

## Agradecimientos

Este proyecto fue desarrollado como parte de un requerimiento técnico para M@stv Producciones.

La implementación, arquitectura, desarrollo y documentación fueron realizados de forma independiente con fines profesionales y educativos.

---

##  Licencia

MIT License © 2026 Jarith Nicol HernandeZ Moreno
