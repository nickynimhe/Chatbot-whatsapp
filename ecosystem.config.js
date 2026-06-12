module.exports = {
  apps: [
    {
      name: 'soporte-backend',
      script: './soporte-whatsapp/backend/src/server.js',
      cwd: '/home/chatbot/bot-whatsapp',
      env: {
        NODE_ENV: 'production',
        PORT: 9020
      }
    },
    {
      name: 'soporte-frontend',
      script: 'npx',
      args: 'serve -s /home/chatbot/bot-whatsapp/soporte-whatsapp/frontend/build -l 5173',
      cwd: '/home/chatbot/bot-whatsapp'
    }
  ]
}
