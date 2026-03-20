// =====================================================
// CONFIGURACIÓN PM2 — SGI Librería El Saber
// =====================================================
// PM2 es el gestor de procesos estándar para Node.js en producción.
//
// COMANDOS:
//   npm install -g pm2          → instalar PM2 globalmente (una sola vez)
//   pm2 start pm2.config.js     → iniciar con esta configuración
//   pm2 status                  → ver estado de los procesos
//   pm2 logs sgi-backend        → ver logs en tiempo real
//   pm2 restart sgi-backend     → reiniciar sin downtime (reload graceful)
//   pm2 stop sgi-backend        → detener
//   pm2 startup                 → generar script para arranque automático al boot
//   pm2 save                    → guardar lista de procesos activos
// =====================================================

module.exports = {
  apps: [
    {
      // Nombre visible en "pm2 status" y "pm2 logs"
      name: 'sgi-backend',

      // Punto de entrada del servidor
      script: 'index.js',

      // 1 instancia — con MySQL compartido, múltiples instancias necesitarían
      // sticky sessions o un load balancer. Para este proyecto, 1 es correcto.
      instances: 1,

      // Reinicio automático si el proceso cae por un error no capturado
      autorestart: true,

      // No vigilar archivos en producción (eso es para desarrollo con nodemon)
      watch: false,

      // Reinicia si el proceso supera 200 MB de RAM
      // (protege contra memory leaks acumulados)
      max_memory_restart: '200M',

      // Variables de entorno para producción
      // Se activan con: pm2 start pm2.config.js --env production
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },

      // Variables de entorno para desarrollo local con PM2
      // Se activan con: pm2 start pm2.config.js --env development
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },

      // Tiempo máximo de espera para graceful shutdown (ms)
      // Debe ser mayor al timeout en index.js (10000 ms)
      kill_timeout: 12000,

      // Esperar conexiones activas antes de reiniciar (zero-downtime)
      wait_ready: false,

      // Formato de logs
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    }
  ]
};