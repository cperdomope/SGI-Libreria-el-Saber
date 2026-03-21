// =====================================================
// RUTAS DE MOVIMIENTOS (KARDEX)
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Define las URLs (endpoints) para el módulo de movimientos
//   de inventario. Los movimientos son entradas y salidas
//   manuales de mercancía (el Kardex del negocio).
//
// ¿Cómo se conecta con el sistema?
//   app.js monta estas rutas en /api/movimientos
//   → GET  /api/movimientos     → Ver historial del Kardex
//   → POST /api/movimientos     → Registrar entrada o salida
//
// ¿Quién puede acceder?
//   Solo Administradores. Los ajustes de inventario son
//   operaciones sensibles que requieren supervisión.
//
// =====================================================

// Importamos Express y creamos el enrutador
const express = require('express');
const router = express.Router();

// Importamos el controlador que tiene la lógica del Kardex
const controladorMovimientos = require('../controllers/movimientosControlador');

// Importamos los middlewares de seguridad
const verificarToken = require('../middlewares/verificarToken');       // Verifica que el usuario esté autenticado
const { soloAdministrador } = require('../middlewares/verificarRol');  // Verifica que sea Admin (rol_id = 1)

// ─────────────────────────────────────────────────────
// RUTA GET: Obtener historial de movimientos (Kardex)
// ─────────────────────────────────────────────────────
// Ejemplo: GET /api/movimientos
// Ejemplo con filtro: GET /api/movimientos?libro_id=5
// Cadena de middlewares: verificarToken → soloAdministrador → controlador
router.get('/', verificarToken, soloAdministrador, controladorMovimientos.obtenerMovimientos);

// ─────────────────────────────────────────────────────
// RUTA POST: Registrar nueva entrada o salida
// ─────────────────────────────────────────────────────
// Body esperado: { libro_id, tipo_movimiento, cantidad, observaciones, proveedor_id?, costo_compra? }
// Cadena de middlewares: verificarToken → soloAdministrador → controlador
router.post('/', verificarToken, soloAdministrador, controladorMovimientos.registrarMovimiento);

// Exportamos el router para que app.js lo monte en /api/movimientos
module.exports = router;