const express = require('express');
const router = express.Router();
const proveedorControlador = require('../controllers/proveedorControlador');
const verificarToken = require('../middlewares/verificarToken');
const { soloAdministrador } = require('../middlewares/verificarRol');

// PROVEEDORES: Solo Administradores (gestión administrativa)

// GET: Obtener todos los proveedores
router.get('/', verificarToken, soloAdministrador, proveedorControlador.obtenerProveedores);

// POST: Crear nuevo proveedor
router.post('/', verificarToken, soloAdministrador, proveedorControlador.crearProveedor);

// PUT: Actualizar proveedor
router.put('/:id', verificarToken, soloAdministrador, proveedorControlador.actualizarProveedor);

// DELETE: Eliminar proveedor
router.delete('/:id', verificarToken, soloAdministrador, proveedorControlador.eliminarProveedor);

module.exports = router;
