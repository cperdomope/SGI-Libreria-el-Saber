const express = require('express');
const router = express.Router();
const categoriaControlador = require('../controllers/categoriaControlador');
const verificarToken = require('../middlewares/verificarToken');
const { soloAdministrador, administradorOVendedor } = require('../middlewares/verificarRol');

// GET: Vendedores pueden ver categorías para información
router.get('/', verificarToken, administradorOVendedor, categoriaControlador.obtenerCategorias);

// POST/PUT/DELETE: Solo Administradores
router.post('/', verificarToken, soloAdministrador, categoriaControlador.crearCategoria);
router.put('/:id', verificarToken, soloAdministrador, categoriaControlador.actualizarCategoria);
router.delete('/:id', verificarToken, soloAdministrador, categoriaControlador.eliminarCategoria);

module.exports = router;
