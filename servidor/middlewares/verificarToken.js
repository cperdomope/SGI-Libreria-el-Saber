// =====================================================
// MIDDLEWARE: VERIFICACIÓN DE TOKEN JWT
// =====================================================
// Un middleware en Express es una función que se ejecuta
// ANTES de que la petición llegue al controlador final.
// Se encadena en las rutas así:
//   router.get('/ruta', verificarToken, controlador)
//                        ↑ primero esto  ↑ luego esto
//
// ¿Por qué necesitamos este middleware?
// Las rutas del sistema son "protegidas": solo usuarios
// que hayan iniciado sesión pueden acceder a ellas.
// Este middleware actúa como el "portero" que verifica
// que el usuario lleve consigo su "carné digital" (el token JWT)
// antes de dejarlo pasar.
//
// ¿Qué es un token JWT?
// JWT = JSON Web Token. Es una cadena de texto firmada digitalmente
// que contiene datos del usuario (id, rol, nombre).
// El cliente la envía en cada petición en el header Authorization.
// Si alguien intenta falsificarlo, la firma digital lo delata.
//
// FLUJO COMPLETO:
//   1. El cliente envía: Authorization: Bearer eyJhbGci...
//   2. Este middleware extrae y verifica el token
//   3. Si es válido: agrega req.usuario y deja pasar (next())
//   4. Si no es válido: responde con 401 y corta la cadena

// "verificarToken es un middleware de autenticación.
//  Intercepta TODAS las rutas protegidas antes de que
//  lleguen al controlador. Extrae el token JWT del header,
//  lo verifica con la clave secreta JWT_SECRET y,
//  si es válido, agrega los datos del usuario en req.usuario
//  para que los controladores puedan saber quién hace la petición."
// =====================================================

const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────────────────────
// VERIFICACIÓN DE CONFIGURACIÓN AL ARRANCAR EL SERVIDOR
// ─────────────────────────────────────────────────────────
// Si JWT_SECRET no está en el archivo .env, el servidor
// no debería arrancar. Es mejor fallar al inicio que
// en la primera petición real con un error confuso.
// Este "fail-fast" hace más fácil detectar problemas de config.
if (!process.env.JWT_SECRET) {
  throw new Error('[verificarToken] JWT_SECRET no está configurado. Verifica el archivo .env');
}

// ─────────────────────────────────────────────────────────
// LA FUNCIÓN MIDDLEWARE
// ─────────────────────────────────────────────────────────
// Recibe (req, res, next) — la firma estándar de Express:
//   req  = los datos que mandó el cliente (headers, body, params...)
//   res  = el objeto para enviar respuesta al cliente
//   next = función que llama al siguiente middleware o controlador
const verificarToken = (req, res, next) => {

  // ─────────────────────────────────────────────────
  // PASO 1: ¿Hay header de autorización?
  // El cliente debe enviar: Authorization: Bearer <token>
  // Si no viene el header, directamente es un acceso sin sesión.
  // ─────────────────────────────────────────────────
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // 401 = "No autorizado" (no hay credenciales)
    return res.status(401).json({
      error: 'Acceso denegado. Token no proporcionado.',
      exito: false,
      codigo: 'TOKEN_MISSING'
    });
  }

  // ─────────────────────────────────────────────────
  // PASO 2: ¿El header tiene el formato correcto?
  // Debe ser exactamente: "Bearer eyJhbGciOiJIUzI1NiIs..."
  // El split(' ') produce: ['Bearer', 'eyJhbGci...']
  // Si hay otro formato (solo el token, sin "Bearer"), rechazamos.
  // Esto sigue el estándar OAuth 2.0 / RFC 6750.
  // ─────────────────────────────────────────────────
  const partes = authHeader.split(' ');

  if (partes.length !== 2 || partes[0] !== 'Bearer') {
    return res.status(401).json({
      error: 'Formato de token inválido. Use: Bearer <token>',
      exito: false,
      codigo: 'TOKEN_FORMAT_INVALID'
    });
  }

  // La segunda parte del split es el token real
  const token = partes[1];

  // ─────────────────────────────────────────────────
  // PASO 3: Verificar la firma del token
  // jwt.verify() hace dos cosas a la vez:
  //   a) Verifica que el token fue firmado con JWT_SECRET
  //      (si alguien alteró el contenido, la firma no coincide)
  //   b) Decodifica el payload y extrae los datos del usuario
  // Si algo falla, lanza una excepción que capturamos abajo.
  // ─────────────────────────────────────────────────
  try {
    const datosUsuario = jwt.verify(token, process.env.JWT_SECRET);

    // ─────────────────────────────────────────────────
    // PASO 4: Adjuntar datos del usuario al objeto req
    // Al hacer req.usuario = datosUsuario, los controladores
    // que vienen después pueden acceder a:
    //   req.usuario.id    → para saber qué usuario hace la acción
    //   req.usuario.rol   → para verificar permisos adicionales
    //   req.usuario.email → si lo necesitan
    // Esto evita decodificar el token múltiples veces.
    // ─────────────────────────────────────────────────
    req.usuario = datosUsuario;

    // ─────────────────────────────────────────────────
    // PASO 5: next() — dejar pasar al siguiente middleware/controlador
    // Si no se llama a next(), la petición queda colgada
    // (el cliente esperaría respuesta para siempre).
    // ─────────────────────────────────────────────────
    next();

  } catch (error) {
    // ─────────────────────────────────────────────────
    // MANEJO DE ERRORES DE JWT
    // La librería jsonwebtoken lanza distintos tipos de error
    // según el problema. Los diferenciamos para dar mensajes claros.
    // ─────────────────────────────────────────────────

    // TokenExpiredError: el token fue válido pero su tiempo de vida venció.
    // El usuario necesita hacer login de nuevo para obtener uno nuevo.
    // Esto es intencional: los tokens no duran para siempre por seguridad.
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Sesión expirada. Por favor, inicie sesión nuevamente.',
        exito: false,
        codigo: 'TOKEN_EXPIRED'
      });
    }

    // JsonWebTokenError: el token está mal formado o fue alterado.
    // Puede ser un intento de falsificación o simplemente un token corrupto.
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido. Por favor, inicie sesión nuevamente.',
        exito: false,
        codigo: 'TOKEN_INVALID'
      });
    }

    // Cualquier otro error inesperado de verificación
    return res.status(401).json({
      error: 'Error de autenticación',
      exito: false,
      codigo: 'AUTH_ERROR'
    });
  }
};

// Exportamos la función para usarla en los archivos de rutas
module.exports = verificarToken;