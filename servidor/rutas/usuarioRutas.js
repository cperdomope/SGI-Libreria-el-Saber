/**
 * =====================================================
 * RUTAS DE USUARIOS
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 *
 * BASE PATH: /api/usuarios
 *
 * RBAC:
 * - CRUD de usuarios: Solo Administradores
 * - Cambiar contraseña: Cualquier usuario autenticado
 */

const express = require('express');
const router = express.Router();
const usuarioControlador = require('../controladores/usuarioControlador');
const verificarToken = require('../middlewares/verificarToken');
const { soloAdministrador } = require('../middlewares/verificarRol');

// PATCH: Cambiar contraseña (cualquier usuario autenticado)
// Definida ANTES de /:id para evitar conflictos de rutas
router.patch('/cambiar-password', verificarToken, usuarioControlador.cambiarPassword);

// GET: Listar todos los usuarios (solo Admin)
router.get('/', verificarToken, soloAdministrador, usuarioControlador.obtenerUsuarios);

// POST: Crear nuevo usuario (solo Admin)
router.post('/', verificarToken, soloAdministrador, usuarioControlador.crearUsuario);

// PUT: Actualizar datos de usuario (solo Admin)
router.put('/:id', verificarToken, soloAdministrador, usuarioControlador.actualizarUsuario);

// PATCH: Activar/Desactivar usuario (solo Admin)
router.patch('/:id/estado', verificarToken, soloAdministrador, usuarioControlador.cambiarEstado);

module.exports = router;
