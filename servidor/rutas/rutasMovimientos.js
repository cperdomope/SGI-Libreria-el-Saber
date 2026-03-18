const express = require('express');
const router = express.Router();
const controladorMovimientos = require('../controladores/controladorMovimientos');
const verificarToken = require('../middlewares/verificarToken');
const { soloAdministrador } = require('../middlewares/verificarRol');

// MOVIMIENTOS: Solo Administradores (ajustes de inventario son sensibles)

// GET: Obtener historial de movimientos (Kardex)
router.get('/', verificarToken, soloAdministrador, controladorMovimientos.obtenerMovimientos);

// POST: Registrar nueva entrada o salida de inventario
router.post('/', verificarToken, soloAdministrador, controladorMovimientos.registrarMovimiento);

module.exports = router;