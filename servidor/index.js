// =====================================================
// PUNTO DE ENTRADA DEL SERVIDOR (index.js)
// =====================================================
// Este archivo es el que Node.js ejecuta al correr:
//   node index.js   (o npm start)
//
// Su responsabilidad es única y clara:
//   1. Tomar la aplicación Express ya configurada (app.js)
//   2. Ponerla a escuchar en un puerto
//   3. Manejar el apagado ordenado del servidor
//
// ¿Por qué separar app.js de index.js?
// app.js configura la lógica; index.js arranca el proceso.
// Los tests pueden importar app.js sin abrir un puerto real,
// lo que evita conflictos de puertos y hace los tests más rápidos.
//
// GRACEFUL SHUTDOWN (apagado ordenado):
// Cuando el sistema operativo o PM2 envían una señal para
// detener el servidor (SIGTERM, SIGINT / Ctrl+C), no debemos
// cortarlo abruptamente. Hay que:
//   1. Dejar de aceptar conexiones nuevas
//   2. Esperar a que las peticiones en curso terminen
//   3. Cerrar el pool de la BD para liberar conexiones MySQL
//   4. Salir del proceso limpiamente
// Sin esto, un reinicio rápido puede causar "Too many connections"
// en MySQL porque las conexiones anteriores no se cerraron.
//
// 🔹 En la sustentación puedo decir:
// "Implementamos graceful shutdown para que el servidor se apague
//  ordenadamente ante señales del SO o de PM2. Esto es importante
//  en producción: evita pérdida de datos en peticiones en curso
//  y evita el error 'Too many connections' al reiniciar rápido."
// =====================================================

const app = require('./app');         // Aplicación Express configurada
const db  = require('./config/db');   // Pool de conexiones (para cerrarlo al apagar)

// Leer el puerto del .env o usar 3000 por defecto
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────────────────
// ARRANCAR EL SERVIDOR
// ─────────────────────────────────────────────────────────
// app.listen() inicia el servidor HTTP en el puerto indicado.
// Guardamos la referencia en 'server' para poder cerrarlo
// ordenadamente en el graceful shutdown.
const server = app.listen(PORT, () => {
  console.log(`[SGI] Servidor en puerto ${PORT} | ENV: ${process.env.NODE_ENV || 'development'}`);
});

// ─────────────────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────────────────
// Función que maneja el apagado ordenado.
// Se ejecuta cuando llega una señal del sistema operativo.
const cerrar = (señal) => {
  console.log(`[SGI] ${señal} recibido. Cerrando servidor...`);

  // server.close() deja de aceptar conexiones nuevas
  // y espera a que las peticiones activas terminen.
  // La callback se ejecuta cuando ya no hay peticiones pendientes.
  server.close(async () => {
    try {
      // Cerrar el pool de MySQL libera todas las conexiones.
      // Si no lo cerramos, MySQL puede llegar al límite de conexiones
      // ("max_connections") al reiniciar el servidor rápidamente.
      await db.end();
      console.log('[DB]  Pool de conexiones cerrado correctamente.');
    } catch (err) {
      console.error('[DB]  Error al cerrar el pool:', err.message);
    }
    // Salir con código 0 = éxito (apagado normal)
    process.exit(0);
  });

  // ─────────────────────────────────────────────────
  // FORZAR CIERRE DESPUÉS DE 10 SEGUNDOS
  // ─────────────────────────────────────────────────
  // Si hay peticiones que no terminan (conexiones colgadas),
  // server.close() esperaría indefinidamente.
  // Este timeout fuerza el cierre después de 10 segundos
  // para que PM2 o el SO no queden esperando.
  // process.exit(1) = salida con error (cierre forzado)
  //
  // .unref() evita que este timeout mantenga vivo el proceso
  // si server.close() termina antes del límite.
  setTimeout(() => {
    console.error('[SGI] Cierre forzado por timeout.');
    process.exit(1);
  }, 10_000).unref();
};

// ─────────────────────────────────────────────────────────
// SEÑALES DEL SISTEMA OPERATIVO
// ─────────────────────────────────────────────────────────
// SIGTERM: señal de terminación "educada".
//   - PM2 la envía cuando se hace: pm2 stop / pm2 restart
//   - Docker la envía cuando se detiene un contenedor
//   - Linux systemd la envía al detener un servicio
process.on('SIGTERM', () => cerrar('SIGTERM'));

// SIGINT: señal de interrupción del usuario.
//   - Se genera al presionar Ctrl+C en la terminal
//   - Es la forma de detener el servidor en desarrollo
process.on('SIGINT',  () => cerrar('SIGINT'));