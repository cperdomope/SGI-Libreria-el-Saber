// =====================================================
// MIDDLEWARE: RATE LIMITING (LÍMITE DE PETICIONES)
// =====================================================
// Rate limiting = control de la tasa de peticiones.
// Limita cuántas veces una IP puede hacer peticiones
// en un período de tiempo determinado.
//
// ¿Por qué es necesario?
// Sin esta protección, un atacante podría:
//   - Ataque de fuerza bruta al login: probar millones de contraseñas
//     hasta encontrar la correcta (un script puede hacer miles/segundo)
//   - Ataque DoS (Denegación de Servicio): saturar el servidor
//     con peticiones para que deje de responder a usuarios reales
//
// ¿Cómo funciona?
// Se lleva un contador por dirección IP.
// Si esa IP supera el máximo de peticiones en la ventana de tiempo,
// las siguientes peticiones reciben un error 429 (Too Many Requests)
// en lugar de procesarse.
//
// Este archivo define DOS limitadores con umbrales diferentes:
//   limiterAuth: muy estricto (10 intentos/15min) → para el login
//   limiterAPI:  permisivo   (500 peticiones/15min) → para todo lo demás

// "Implementamos dos niveles de rate limiting con express-rate-limit.
//  El limitador de autenticación es más estricto porque el login
//  es el punto de entrada a ataques de fuerza bruta:
//  10 intentos fallidos en 15 minutos bloquea la IP automáticamente.
//  El limitador general permite operaciones normales del sistema
//  pero evita que un cliente defectuoso o malicioso sature el servidor."
// =====================================================

const rateLimit = require('express-rate-limit');

// ─────────────────────────────────────────────────────────
// LIMITADOR 1: AUTENTICACIÓN (LOGIN)
// ─────────────────────────────────────────────────────────
// Configuración más estricta porque el endpoint de login
// es el objetivo número 1 de ataques de fuerza bruta.
//
// Parámetros:
//   windowMs: 15 minutos (en milisegundos = 15 × 60 × 1000)
//   max: 10 intentos por IP en esa ventana
//   skipSuccessfulRequests: true → los logins EXITOSOS no cuentan.
//     Solo se cuentan los fallidos. Así un usuario legítimo que
//     hace login correcto no gasta su cuota.
const limiterAuth = rateLimit({
  windowMs: 15 * 60 * 1000,  // Ventana de 15 minutos
  max: 10,                    // Máximo 10 intentos fallidos por IP

  // Mensaje de error que recibe el cliente cuando supera el límite.
  // Usamos el mismo formato JSON que el resto de la API.
  message: {
    exito: false,
    mensaje: 'Demasiados intentos de autenticación. Intente nuevamente en 15 minutos.',
    codigo: 'AUTH_RATE_LIMIT_EXCEEDED'
  },

  // standardHeaders: true → envía los headers estándar RFC 6585:
  //   RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset
  //   El cliente puede leer cuántos intentos le quedan.
  standardHeaders: true,

  // legacyHeaders: false → no enviar los headers deprecados
  //   X-RateLimit-Limit, X-RateLimit-Remaining (formato antiguo)
  legacyHeaders: false,

  // Solo contar peticiones FALLIDAS (status >= 400).
  // Un usuario que inicia sesión correctamente no penaliza su cuota.
  skipSuccessfulRequests: true
});

// ─────────────────────────────────────────────────────────
// LIMITADOR 2: API GENERAL (RUTAS PRIVADAS)
// ─────────────────────────────────────────────────────────
// Configuración permisiva para las rutas normales del sistema.
// 500 peticiones en 15 minutos es suficiente para cualquier
// uso normal, pero detiene scripts o clientes mal programados.
//
// Un vendedor trabajando activamente rara vez supera 100 peticiones
// por hora, así que 500/15min es muy holgado para uso legítimo.
const limiterAPI = rateLimit({
  windowMs: 15 * 60 * 1000,  // Ventana de 15 minutos
  max: 500,                   // 500 peticiones por IP (uso normal del sistema)

  message: {
    exito: false,
    mensaje: 'Ha excedido el límite de peticiones. Intente nuevamente en 15 minutos.',
    codigo: 'API_RATE_LIMIT_EXCEEDED'
  },

  standardHeaders: true,
  legacyHeaders: false
  // Aquí NO usamos skipSuccessfulRequests: contamos todas las peticiones
  // para proteger contra cualquier tipo de abuso, no solo intentos fallidos.
});

// Exportamos ambos para usarlos en los lugares apropiados:
//   limiterAuth → solo en POST /api/auth/login (authRutas.js)
//   limiterAPI  → en app.js para todas las rutas /api/*
module.exports = { limiterAuth, limiterAPI };