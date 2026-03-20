// =====================================================
// RUTAS DE AUTENTICACIÓN
// =====================================================
// Este archivo define qué URLs existen para el módulo de autenticación
// y qué función del controlador ejecutar cuando se accede a cada una.
//
// ¿Qué es un archivo de rutas?
// Es como un directorio telefónico del API:
// "si alguien llama a POST /api/auth/login, conectarlos con el controladorAuth.login"
//
// ¿Qué son los middlewares en las rutas?
// Son funciones que se ejecutan EN ORDEN antes de llegar al controlador.
// Ejemplo: verificarToken → soloAdministrador → controladorAuth.registro
// Si verificarToken falla (token inválido), soloAdministrador nunca se ejecuta.
//
// BASE URL de este módulo (definida en app.js): /api/auth
// Las rutas aquí se agregan a ese prefijo.
//
// 🔹 En la sustentación puedo decir:
// "El sistema tiene dos rutas de autenticación:
//  /login es pública pero con rate limiting para evitar ataques.
//  /registro está protegida — solo un administrador autenticado
//  puede crear nuevos usuarios en el sistema."
// =====================================================

const express = require('express');

// Router: mini-aplicación Express que maneja un grupo de rutas relacionadas
const router = express.Router();

// Importamos el controlador que tiene la lógica de login y registro
const controladorAuth = require('../controllers/authControlador');

// Middleware que verifica que el token JWT sea válido
// Si el token no existe o está expirado, rechaza la petición con 401
const verificarToken = require('../middlewares/verificarToken');

// Middleware que verifica que el usuario sea Administrador (rol_id = 1)
const { soloAdministrador } = require('../middlewares/verificarRol');

// Rate limiter específico para login: máximo 10 intentos por IP cada 15 minutos
// Más estricto que el limitador general para proteger el endpoint de mayor riesgo
const { limiterAuth } = require('../middlewares/rateLimiter');

// ─────────────────────────────────────────────────────────
// RUTA 1: REGISTRO DE NUEVO USUARIO
// ─────────────────────────────────────────────────────────
// Método HTTP: POST
// URL completa: POST /api/auth/registro
//
// Middlewares en cadena:
//   1. verificarToken   → ¿Tiene token válido? (usuario autenticado)
//   2. soloAdministrador → ¿Es administrador? (rol_id = 1)
//   3. controladorAuth.registro → Ejecuta el registro si pasó los dos filtros
//
// Body esperado (JSON):
//   { nombre_completo, email, password, rol_id }
//
// ¿Por qué está protegida?
// No queremos que cualquier persona pueda crear cuentas en el sistema.
// Solo un administrador puede crear nuevos usuarios (vendedores u otros admins).
router.post('/registro', verificarToken, soloAdministrador, controladorAuth.registro);

// ─────────────────────────────────────────────────────────
// RUTA 2: INICIO DE SESIÓN (LOGIN)
// ─────────────────────────────────────────────────────────
// Método HTTP: POST
// URL completa: POST /api/auth/login
//
// Esta ruta es PÚBLICA — no requiere token porque el usuario aún no tiene uno.
// Sin embargo, tiene el limiterAuth que bloquea IPs que hagan demasiados intentos.
//
// Body esperado (JSON):
//   { email, password }
//
// Respuesta exitosa: { token, usuario }
// El frontend guarda el token en localStorage para usarlo en futuras peticiones.
router.post('/login', limiterAuth, controladorAuth.login);

// Exportamos el router para que app.js lo registre en la URL /api/auth
module.exports = router;