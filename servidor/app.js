// =====================================================
// ARCHIVO PRINCIPAL DE LA APLICACIÓN EXPRESS (app.js)
// =====================================================
// Este archivo configura la aplicación Express:
// define middlewares globales, registra las rutas de la API
// y establece los manejadores de errores.
//
// ¿Cuál es la diferencia entre app.js e index.js?
// app.js  → CONFIGURA la aplicación (qué hace y cómo)
// index.js → ARRANCA el servidor (en qué puerto escucha)
// Separar responsabilidades facilita los tests: los tests
// importan app.js directamente sin arrancar el servidor real.
//
// ¿En qué orden se ejecutan los middlewares?
// Express los ejecuta en el orden en que se registran con app.use().
// El flujo de una petición es:
//   helmet → compression → morgan → cors → static → json →
//   limiterAPI → rutas → notFoundHandler → errorHandler
//
// 🔹 En la sustentación puedo decir:
// "app.js aplica el patrón de separación de responsabilidades:
//  configura la cadena de middlewares y rutas sin iniciar el servidor.
//  Esto permite que los tests usen la aplicación directamente
//  con supertest sin necesidad de puertos reales."
// =====================================================

const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const morgan      = require('morgan');
const path        = require('path');
require('dotenv').config();  // Carga variables del .env antes de usarlas

// Pool de BD — lo importamos aquí para usarlo en el health check
const db = require('./config/db');

// ─────────────────────────────────────────────────────────
// IMPORTAR RUTAS DE CADA MÓDULO
// ─────────────────────────────────────────────────────────
// Cada archivo de rutas maneja un "recurso" de la API.
// Se registran con un prefijo base que se prepende a todas sus rutas internas.
const rutasAuth        = require('./routes/authRutas');        // /api/auth
const rutasLibros      = require('./routes/librosRutas');      // /api/libros
const rutasMovimientos = require('./routes/movimientosRutas'); // /api/movimientos
const rutasDashboard   = require('./routes/dashboardRutas');   // /api/dashboard
const rutasClientes    = require('./routes/clienteRutas');     // /api/clientes
const rutasVentas      = require('./routes/ventaRutas');       // /api/ventas
const rutasProveedores = require('./routes/proveedorRutas');   // /api/proveedores
const rutasAutores     = require('./routes/autorRutas');       // /api/autores
const rutasCategorias  = require('./routes/categoriaRutas');   // /api/categorias
const rutasUsuarios    = require('./routes/usuarioRutas');     // /api/usuarios

// Manejadores de error centralizados
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

// Rate limiter general (500 peticiones/15 min por IP)
const { limiterAPI } = require('./middlewares/rateLimiter');

const app = express();

// ─────────────────────────────────────────────────────────
// MIDDLEWARE 1: HELMET — Headers de seguridad HTTP
// ─────────────────────────────────────────────────────────
// Helmet agrega automáticamente varios headers de seguridad:
//   X-Content-Type-Options: nosniff  → el browser no adivina tipos MIME
//   X-Frame-Options: DENY            → previene clickjacking en iframes
//   Strict-Transport-Security (HSTS) → fuerza HTTPS en producción
//   Content-Security-Policy (CSP)    → limita de dónde se cargan recursos
//
// crossOriginResourcePolicy: 'cross-origin' permite que el frontend
// en http://localhost:5173 cargue las imágenes del servidor (portadas).
// Sin esto, el browser bloquearía las imágenes por política de origen cruzado.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ─────────────────────────────────────────────────────────
// MIDDLEWARE 2: COMPRESSION — Compresión gzip/brotli
// ─────────────────────────────────────────────────────────
// Comprime las respuestas antes de enviarlas al cliente.
// Una respuesta JSON de 50 KB puede quedar en 10 KB después de comprimir.
// Reducción típica del 70-80% en respuestas de texto/JSON.
// Debe ir ANTES de las rutas para comprimir todas las respuestas.
app.use(compression());

// ─────────────────────────────────────────────────────────
// MIDDLEWARE 3: MORGAN — Logging de peticiones HTTP
// ─────────────────────────────────────────────────────────
// Registra en consola cada petición que llega al servidor.
// Ejemplo en modo 'dev': GET /api/libros 200 12.345 ms
// Esto facilita el debug y monitoreo del sistema.
//
// 'dev'      → coloreado, formato compacto, ideal para desarrollo
// 'combined' → formato Apache estándar, compatible con herramientas de análisis
//              como Grafana, Kibana o cualquier agregador de logs
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─────────────────────────────────────────────────────────
// MIDDLEWARE 4: CORS — Control de Acceso de Origen Cruzado
// ─────────────────────────────────────────────────────────
// CORS = Cross-Origin Resource Sharing.
// Por defecto, el browser bloquea peticiones JavaScript de
// http://localhost:5173 (React) a http://localhost:3000 (API)
// porque son "orígenes" distintos (diferente puerto = diferente origen).
//
// Esta configuración CORS permite exactamente ese origen
// y los métodos/headers que usa el frontend.
// En producción, CORS_ORIGIN en el .env sería el dominio real del frontend.
app.use(cors({
  origin:               process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials:          true,  // Permite envío de cookies y headers de auth
  methods:              ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders:       ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200    // Algunos browsers viejos necesitan 200, no 204
}));

// ─────────────────────────────────────────────────────────
// MIDDLEWARE 5: ARCHIVOS ESTÁTICOS (PORTADAS)
// ─────────────────────────────────────────────────────────
// Sirve los archivos de la carpeta 'uploads/' como URL pública.
// Una imagen guardada en servidor/uploads/portadas/portada-123.jpg
// queda accesible en: http://localhost:3000/uploads/portadas/portada-123.jpg
//
// Va ANTES de express.json() para que las imágenes mantengan
// su MIME type correcto (image/jpeg, image/png) sin interferencia.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─────────────────────────────────────────────────────────
// MIDDLEWARE 6: PARSEO DE JSON
// ─────────────────────────────────────────────────────────
// Permite que los controladores accedan al body de la petición
// como un objeto JavaScript en req.body.
// Sin esto, req.body sería undefined.
//
// limit: '100kb' — rechaza payloads mayores de 100 KB.
// Protege contra ataques de "JSON bomb" o envío masivo de datos
// que podrían agotar la memoria del servidor.
app.use(express.json({ limit: '100kb' }));

// ─────────────────────────────────────────────────────────
// MIDDLEWARE 7: RATE LIMITING GENERAL
// ─────────────────────────────────────────────────────────
// Limita a 500 peticiones por IP cada 15 minutos para todas las rutas /api/*.
// Protege contra scraping, abuso masivo y clientes defectuosos.
// El limiterAuth (más estricto: 10/15min) se aplica adicionalmente
// solo en /api/auth/login (definido en authRutas.js).
app.use('/api', limiterAPI);

// ─────────────────────────────────────────────────────────
// REGISTRO DE RUTAS DE LA API
// ─────────────────────────────────────────────────────────
// Cada módulo funcional del sistema tiene su propio router.
// El prefijo /api/* es convención para distinguir la API
// de otros recursos (archivos estáticos, health check, etc.).
app.use('/api/auth',        rutasAuth);
app.use('/api/libros',      rutasLibros);
app.use('/api/movimientos', rutasMovimientos);
app.use('/api/dashboard',   rutasDashboard);
app.use('/api/ventas',      rutasVentas);
app.use('/api/clientes',    rutasClientes);
app.use('/api/proveedores', rutasProveedores);
app.use('/api/autores',     rutasAutores);
app.use('/api/categorias',  rutasCategorias);
app.use('/api/usuarios',    rutasUsuarios);

// ─────────────────────────────────────────────────────────
// HEALTH CHECK — Ruta de diagnóstico
// ─────────────────────────────────────────────────────────
// Endpoint GET / que verifica el estado real del servidor.
// No solo dice "estoy vivo" sino que prueba la conexión a la BD
// con una consulta real (SELECT 1).
//
// ¿Para qué sirve?
//   - PM2 puede monitorear esta URL para reiniciar si falla
//   - Docker compose usa healthcheck para verificar el servicio
//   - Herramientas de monitoreo externas (UptimeRobot, etc.)
//
// Responde 200 si servidor + BD están bien.
// Responde 503 (Service Unavailable) si la BD no responde.
app.get('/', async (_req, res) => {
  try {
    // SELECT 1 es la consulta más simple posible.
    // Si la BD no responde, lanza excepción y vamos al catch.
    await db.query('SELECT 1');
    res.json({
      estado:   'OK',
      bd:       'conectada',
      sistema:  'SGI Librería El Saber',
      version:  '2.0.0',
      entorno:  process.env.NODE_ENV || 'development',
      tiempo:   new Date().toISOString()
    });
  } catch {
    // 503 = "Service Unavailable" — el servidor existe pero no puede responder
    res.status(503).json({
      estado:  'ERROR',
      bd:      'desconectada',
      sistema: 'SGI Librería El Saber',
      tiempo:  new Date().toISOString()
    });
  }
});

// ─────────────────────────────────────────────────────────
// MANEJADORES DE ERROR (deben ir AL FINAL, después de las rutas)
// ─────────────────────────────────────────────────────────
// notFoundHandler: captura cualquier ruta que no exista → 404
// errorHandler: captura errores no manejados en controladores → 500
// El orden importa: Express los llama solo si ninguna ruta anterior respondió.
app.use(notFoundHandler);
app.use(errorHandler);

// Exportar la app para que index.js la inicie y los tests la usen
module.exports = app;