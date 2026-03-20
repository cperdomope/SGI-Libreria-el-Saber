// =====================================================
// RUTAS DE USUARIOS
// =====================================================
// Define los endpoints para la gestión de usuarios del sistema.
// (Usuarios = empleados que usan el SGI, NO clientes de la librería)
//
// BASE URL (definida en app.js): /api/usuarios
//
// ¿Quién puede acceder?
//   - CRUD de usuarios: SOLO Administradores
//   - Cambiar contraseña propia: Cualquier usuario autenticado
//
// DETALLE IMPORTANTE — Orden de las rutas:
// La ruta '/cambiar-password' se define ANTES que '/:id'.
// Esto es crucial: si se definiera después, Express interpretaría
// "cambiar-password" como un valor del parámetro :id,
// lo que causaría un error inesperado.
// Regla general: las rutas específicas van ANTES que las de parámetro.
//
// 🔹 En la sustentación puedo decir:
// "El módulo de usuarios tiene una excepción de acceso:
//  cambiar contraseña está disponible para cualquier usuario autenticado,
//  porque todos necesitan poder actualizar su propia contraseña.
//  El resto de operaciones (crear, listar, editar, activar/desactivar)
//  son exclusivas del administrador."
// =====================================================

const express = require('express');
const router  = express.Router();

// Controlador con la lógica de gestión de usuarios
const usuarioControlador = require('../controllers/usuarioControlador');

// Verifica que el JWT sea válido
const verificarToken = require('../middlewares/verificarToken');

// Solo permite acceso a administradores (rol_id = 1)
const { soloAdministrador } = require('../middlewares/verificarRol');

// ─────────────────────────────────────────────────────────
// PATCH /api/usuarios/cambiar-password
// ─────────────────────────────────────────────────────────
// Permite a CUALQUIER usuario autenticado cambiar su propia contraseña.
// Requiere la contraseña actual como verificación de identidad.
// ⚠️ DEBE estar ANTES de /:id para evitar conflicto de rutas.
router.patch('/cambiar-password', verificarToken, usuarioControlador.cambiarPassword);

// ─────────────────────────────────────────────────────────
// GET /api/usuarios
// ─────────────────────────────────────────────────────────
// Lista todos los usuarios del sistema con su rol y estado.
// Nunca incluye hashes de contraseñas.
// Acceso: SOLO Administradores.
router.get('/', verificarToken, soloAdministrador, usuarioControlador.obtenerUsuarios);

// ─────────────────────────────────────────────────────────
// POST /api/usuarios
// ─────────────────────────────────────────────────────────
// Crea un nuevo usuario (vendedor u otro administrador).
// El administrador asigna el rol al crear la cuenta.
// Acceso: SOLO Administradores.
router.post('/', verificarToken, soloAdministrador, usuarioControlador.crearUsuario);

// ─────────────────────────────────────────────────────────
// PUT /api/usuarios/:id
// ─────────────────────────────────────────────────────────
// Actualiza nombre, email o rol de un usuario.
// No cambia la contraseña (eso va por /cambiar-password).
// Acceso: SOLO Administradores.
router.put('/:id', verificarToken, soloAdministrador, usuarioControlador.actualizarUsuario);

// ─────────────────────────────────────────────────────────
// PATCH /api/usuarios/:id/estado
// ─────────────────────────────────────────────────────────
// Activa o desactiva una cuenta de usuario (toggle).
// Un usuario desactivado no puede iniciar sesión.
// El admin no puede desactivarse a sí mismo (protección en el controlador).
// Acceso: SOLO Administradores.
router.patch('/:id/estado', verificarToken, soloAdministrador, usuarioControlador.cambiarEstado);

module.exports = router;