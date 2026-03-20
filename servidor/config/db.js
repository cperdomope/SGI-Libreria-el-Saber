// =====================================================
// CONFIGURACIÓN DE LA BASE DE DATOS (CONNECTION POOL)
// =====================================================
// Este archivo crea y exporta el "pool" de conexiones MySQL
// que usan TODOS los controladores del sistema.
//
// ¿Qué es un pool de conexiones?
// Conectarse a una base de datos es una operación costosa:
// abre un socket TCP, negocia el protocolo, autentica, etc.
// Si cada consulta abriera y cerrara su propia conexión,
// el sistema sería muy lento.
//
// Un pool mantiene un GRUPO de conexiones ya abiertas y listas.
// Cuando un controlador necesita hacer una consulta:
//   1. Toma una conexión libre del pool
//   2. Ejecuta la consulta
//   3. Devuelve la conexión al pool (no la cierra)
// Así las conexiones se reutilizan en lugar de recrearse.
//
// Analogía: es como una gasolinera con 10 surtidores.
// Los autos (consultas) se conectan al surtidor libre
// y cuando terminan lo liberan para el siguiente.
//
// ¿Por qué mysql2 y no mysql?
// mysql2 es la librería moderna: más rápida, soporta Promises
// de forma nativa (con .promise()), y es compatible con ES2017+.
//
// 🔹 En la sustentación puedo decir:
// "Usamos un pool de conexiones MySQL con mysql2/promise.
//  El pool mantiene hasta 10 conexiones abiertas simultáneas,
//  lo que es suficiente para el volumen de una librería pequeña.
//  Las credenciales vienen de variables de entorno (.env)
//  para no exponer datos sensibles en el código fuente."
// =====================================================

const mysql = require('mysql2');
require('dotenv').config();  // Carga las variables del archivo .env

// ─────────────────────────────────────────────────────────
// VALIDACIÓN DE VARIABLES DE ENTORNO
// ─────────────────────────────────────────────────────────
// Verificamos que todas las variables obligatorias estén definidas
// ANTES de intentar conectar. Si falta alguna, el servidor falla
// al arrancar con un mensaje claro en lugar de un error críptico
// al hacer la primera consulta.
// Este es el principio "fail-fast": detectar problemas lo antes posible.
const variablesRequeridas = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const variablesFaltantes = variablesRequeridas.filter(
  v => process.env[v] === undefined || process.env[v] === null
);

if (variablesFaltantes.length > 0) {
  throw new Error(
    `FATAL: Variables de entorno faltantes: ${variablesFaltantes.join(', ')}. ` +
    'Verifica el archivo .env'
  );
}

// ─────────────────────────────────────────────────────────
// SSL CONDICIONAL
// ─────────────────────────────────────────────────────────
// SSL encripta la comunicación entre el servidor Node.js y MySQL.
// En desarrollo local no se necesita (ambos corren en la misma PC).
// En producción (BD en la nube: Aiven, PlanetScale, Railway, etc.)
// el proveedor REQUIERE SSL para que los datos no viajen en claro.
// La variable DB_SSL en el .env controla esto:
//   DB_SSL=false → sin SSL (local)
//   DB_SSL=true  → con SSL (nube)
const usarSSL = process.env.DB_SSL === 'true';

// ─────────────────────────────────────────────────────────
// PARÁMETROS DEL POOL
// ─────────────────────────────────────────────────────────
const configuracionPool = {
  host:     process.env.DB_HOST,      // IP o hostname del servidor MySQL
  user:     process.env.DB_USER,      // Usuario de la BD (ej: 'root')
  password: process.env.DB_PASSWORD,  // Contraseña (nunca hardcodeada)
  database: process.env.DB_NAME,      // Nombre de la BD (ej: 'sgi_libreria')
  port:     process.env.DB_PORT || 3306,  // Puerto MySQL por defecto: 3306

  // utf8mb4 soporta todos los caracteres Unicode incluyendo emojis.
  // utf8 "normal" de MySQL solo soporta 3 bytes, no el rango completo.
  charset: 'utf8mb4',

  // waitForConnections: si todas las conexiones están ocupadas,
  // las nuevas peticiones esperan en cola en lugar de fallar inmediatamente.
  waitForConnections: true,

  // connectionLimit: máximo de conexiones simultáneas en el pool.
  // 10 es suficiente para una librería pequeña/mediana.
  // Si hay más consultas concurrentes que conexiones, esperan en cola.
  connectionLimit: 10,

  // queueLimit: máximo de peticiones esperando en cola.
  // 0 = sin límite (la cola puede crecer indefinidamente).
  queueLimit: 0,

  // idleTimeout: cerrar conexiones que llevan 60 segundos sin uso.
  // Libera recursos en períodos de baja actividad.
  idleTimeout: 60000,

  // Spread condicional: solo agrega la propiedad 'ssl' si usarSSL es true.
  // Sintaxis: ...(condición && { propiedad: valor })
  // rejectUnauthorized: false acepta certificados autofirmados del proveedor.
  ...(usarSSL && { ssl: { rejectUnauthorized: false } })
};

// ─────────────────────────────────────────────────────────
// CREAR EL POOL
// ─────────────────────────────────────────────────────────
const pool = mysql.createPool(configuracionPool);

// ─────────────────────────────────────────────────────────
// VERIFICAR CONEXIÓN AL ARRANCAR
// ─────────────────────────────────────────────────────────
// Intentamos obtener una conexión del pool para confirmar
// que los parámetros son correctos y la BD está accesible.
// Si falla, el mensaje de error indica el código (ej: ER_ACCESS_DENIED_ERROR).
// IMPORTANTE: en caso de error solo logueamos, no detenemos el servidor,
// para que el health check pueda reportar el estado real.
pool.getConnection((error, conexion) => {
  if (error) {
    console.error('[DB] Error de conexión:', error.code, '-', error.message);
    return;
  }
  const modo = usarSSL ? 'nube (SSL)' : 'local';
  console.log(`[DB] Conectado a "${process.env.DB_NAME}" en modo ${modo}`);
  // release() devuelve la conexión al pool para que otros puedan usarla.
  // Sin esto, la conexión quedaría "tomada" indefinidamente.
  conexion.release();
});

// ─────────────────────────────────────────────────────────
// LISTENER DE ERRORES DEL POOL
// ─────────────────────────────────────────────────────────
// Captura errores que ocurren en conexiones ya establecidas
// (por ejemplo, si MySQL se cae después de estar conectado).
// Sin este listener, Node.js lanzaría un "unhandled error" y podría crashear.
pool.on('error', (error) => {
  console.error('[DB] Error en el pool:', error.code);
});

// ─────────────────────────────────────────────────────────
// EXPORTAR EL POOL CON PROMISES
// ─────────────────────────────────────────────────────────
// .promise() convierte el pool a su versión async/await.
// Sin esto, las consultas usarían callbacks (estilo antiguo).
// Con esto, los controladores pueden usar:
//   const [filas] = await db.query('SELECT ...');
// en lugar de:
//   pool.query('SELECT ...', (err, filas) => { ... });
module.exports = pool.promise();