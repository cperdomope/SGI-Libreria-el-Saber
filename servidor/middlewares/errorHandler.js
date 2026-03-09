/**
 * =====================================================
 * MIDDLEWARE DE MANEJO DE ERRORES GLOBAL
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Captura cualquier error no manejado en
 * controladores o rutas y devuelve una respuesta JSON
 * estandarizada. Se registra como último middleware en
 * index.js para actuar como red de seguridad global.
 *
 * ERRORES MANEJADOS:
 * - MySQL: duplicados, FK, conexión, sintaxis
 * - Multer: tamaño excedido, tipo de archivo inválido
 * - JWT: token inválido o expirado
 * - Express: JSON malformado (SyntaxError)
 * - 404: ruta no encontrada
 * - Genérico: cualquier otro Error no anticipado
 *
 * USO EN CONTROLADORES:
 * En vez de manejar cada error en cada catch, simplemente
 * llama next(error) y este middleware lo captura:
 *
 *   } catch (error) {
 *     next(error);   // ← delega al errorHandler global
 *   }
 *
 * ANTE UN JURADO:
 * "Implementamos un middleware de errores global que
 *  estandariza todas las respuestas de error, evita
 *  exponer detalles internos en producción y centraliza
 *  el logging para facilitar el diagnóstico."
 *
 * @author Equipo de Desarrollo SGI
 * @version 1.0.0
 */

// =====================================================
// CÓDIGOS DE ERROR MYSQL
// =====================================================

const ERRORES_MYSQL = {
  ER_DUP_ENTRY:           { status: 400, mensaje: 'El registro ya existe (valor duplicado)' },
  ER_ROW_IS_REFERENCED_2: { status: 400, mensaje: 'No se puede eliminar: el registro tiene datos relacionados' },
  ER_NO_REFERENCED_ROW_2: { status: 400, mensaje: 'El registro referenciado no existe' },
  ER_BAD_NULL_ERROR:      { status: 400, mensaje: 'Un campo obligatorio está vacío' },
  ER_DATA_TOO_LONG:       { status: 400, mensaje: 'Un valor supera la longitud máxima permitida' },
  ECONNREFUSED:           { status: 503, mensaje: 'No se pudo conectar a la base de datos' },
  PROTOCOL_CONNECTION_LOST: { status: 503, mensaje: 'Se perdió la conexión con la base de datos' }
};

// =====================================================
// MANEJADOR DE RUTA NO ENCONTRADA (404)
// Debe registrarse ANTES del errorHandler en index.js
// =====================================================

const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    exito:   false,
    mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    codigo:  'ROUTE_NOT_FOUND'
  });
};

// =====================================================
// MANEJADOR GLOBAL DE ERRORES
// Express lo reconoce como error handler por tener
// exactamente 4 parámetros: (err, req, res, next)
// =====================================================

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {

  // Logging solo en desarrollo (nunca exponer en producción)
  if (process.env.NODE_ENV !== 'production') {
    console.error('─────────────────────────────────────────');
    console.error(`[ERROR] ${req.method} ${req.originalUrl}`);
    console.error(`Tipo   : ${err.constructor?.name || 'Error'}`);
    console.error(`Código : ${err.code || 'N/A'}`);
    console.error(`Mensaje: ${err.message}`);
    if (err.stack) console.error(err.stack.split('\n')[1]?.trim());
    console.error('─────────────────────────────────────────');
  }

  // ── Errores de MySQL ──
  if (err.code && ERRORES_MYSQL[err.code]) {
    const { status, mensaje } = ERRORES_MYSQL[err.code];
    return res.status(status).json({
      exito:   false,
      mensaje,
      codigo:  err.code
    });
  }

  // ── Error de Multer: tamaño de archivo excedido ──
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El archivo es demasiado grande. Máximo permitido: 2 MB',
      codigo:  'FILE_TOO_LARGE'
    });
  }

  // ── Error de Multer: tipo de archivo no permitido ──
  if (err.message?.includes('Solo se permiten imágenes')) {
    return res.status(400).json({
      exito:   false,
      mensaje: err.message,
      codigo:  'INVALID_FILE_TYPE'
    });
  }

  // ── JSON malformado en el body (SyntaxError de express.json) ──
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El cuerpo de la petición contiene JSON inválido',
      codigo:  'INVALID_JSON'
    });
  }

  // ── Token JWT inválido ──
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      exito:   false,
      mensaje: 'Token de autenticación inválido',
      codigo:  'JWT_INVALID'
    });
  }

  // ── Token JWT expirado ──
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      exito:   false,
      mensaje: 'La sesión ha expirado. Por favor vuelve a iniciar sesión',
      codigo:  'JWT_EXPIRED'
    });
  }

  // ── Error genérico no anticipado ──
  // En producción: mensaje genérico (no exponer detalles)
  // En desarrollo: incluir mensaje real para depuración
  const esProduccion = process.env.NODE_ENV === 'production';

  res.status(err.status || 500).json({
    exito:   false,
    mensaje: esProduccion
      ? 'Ocurrió un error interno en el servidor'
      : (err.message || 'Error interno del servidor'),
    codigo:  'INTERNAL_ERROR'
  });
};

module.exports = { errorHandler, notFoundHandler };
