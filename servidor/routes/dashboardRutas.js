// =====================================================
// RUTAS DEL DASHBOARD (PANEL DE CONTROL)
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Define la URL (endpoint) para obtener todas las
//   estadísticas del negocio en una sola petición.
//
// ¿Cómo se conecta con el sistema?
//   app.js monta esta ruta en /api/dashboard
//   → GET /api/dashboard → Devuelve KPIs, gráficas y alertas
//
// ¿Quién puede acceder?
//   Solo Administradores, porque los datos del dashboard
//   son información sensible del negocio (ventas, ingresos, etc.)
//
// =====================================================

// Importamos Express y creamos el enrutador
const express = require('express');
const router = express.Router();

// Importamos el controlador que calcula las estadísticas
const controladorDashboard = require('../controllers/dashboardControlador');

// Importamos los middlewares de seguridad
const verificarToken = require('../middlewares/verificarToken');       // Verifica autenticación JWT
const { soloAdministrador } = require('../middlewares/verificarRol');  // Solo Admin (rol_id = 1)

// ─────────────────────────────────────────────────────
// RUTA GET: Obtener estadísticas del dashboard
// ─────────────────────────────────────────────────────
// URL completa: GET http://localhost:3000/api/dashboard
// Cadena de middlewares: verificarToken → soloAdministrador → controlador
// El controlador ejecuta 15 consultas SQL en paralelo y devuelve
// un objeto JSON con: ventas, inventario, rankings, gráficas y alertas
router.get('/', verificarToken, soloAdministrador, controladorDashboard.obtenerEstadisticas);

// Exportamos el router para que app.js lo monte en /api/dashboard
module.exports = router;