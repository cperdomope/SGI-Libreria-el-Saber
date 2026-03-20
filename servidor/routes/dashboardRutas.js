const express = require('express');
const router = express.Router();
const controladorDashboard = require('../controllers/dashboardControlador');
const verificarToken = require('../middlewares/verificarToken');
const { soloAdministrador } = require('../middlewares/verificarRol');

// Ruta GET: http://localhost:3000/api/dashboard
// RESTRICCIÓN: Solo Administradores (datos sensibles del negocio)
router.get('/', verificarToken, soloAdministrador, controladorDashboard.obtenerEstadisticas);

module.exports = router;
