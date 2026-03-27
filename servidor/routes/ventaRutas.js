// =====================================================
// RUTAS DE VENTAS
// =====================================================
// Define los endpoints del módulo de ventas.
//
// BASE URL (definida en app.js): /api/ventas
//
// ¿Quién puede acceder?
//   - Crear/Ver ventas: Administradores Y Vendedores
//     (los vendedores son quienes hacen las ventas del día a día)
//   - Anular ventas: SOLO Administradores
//     (es una operación crítica que revierte el stock y el ingreso)

// "Las rutas de ventas implementan RBAC (Control de Acceso Basado en Roles).
//  Cualquier empleado autenticado puede registrar y consultar ventas,
//  pero la anulación — que revierte el inventario y los ingresos —
//  está restringida exclusivamente al administrador."
// =====================================================

const express = require('express');
const router  = express.Router();

// Controlador con toda la lógica de ventas (crear, listar, detalle, anular)
const ventaControlador = require('../controllers/ventaControlador');

// Middleware que verifica que el JWT sea válido y extrae el usuario del token
const verificarToken = require('../middlewares/verificarToken');

// Middlewares de roles:
//   - administradorOVendedor: permite acceso si rol_id es 1 (Admin) o 2 (Vendedor)
//   - soloAdministrador: solo permite acceso si rol_id es 1 (Admin)
const { administradorOVendedor, soloAdministrador } = require('../middlewares/verificarRol');

// Valida que el parametro :id sea un numero entero positivo
// Valida que el parametro :id sea un numero entero positivo
const { validarId } = require('../middlewares/validarParametroId');

// ─────────────────────────────────────────────────────────
// POST /api/ventas
// ─────────────────────────────────────────────────────────
// Registra una nueva venta con todos sus productos.
// Acceso: Administradores y Vendedores.
// Esta es la operación principal del sistema — la que usan los vendedores a diario.
router.post('/', verificarToken, administradorOVendedor, ventaControlador.crearVenta);

// ─────────────────────────────────────────────────────────
// GET /api/ventas
// ─────────────────────────────────────────────────────────
// Obtiene el historial de ventas con filtros opcionales.
// Soporta paginación y filtros por fecha y cliente.
// Acceso: Administradores y Vendedores.
router.get('/', verificarToken, administradorOVendedor, ventaControlador.obtenerVentas);

// ─────────────────────────────────────────────────────────
// GET /api/ventas/:id
// ─────────────────────────────────────────────────────────
// Obtiene el detalle completo de una venta: cabecera + todos los productos.
// Se usa para mostrar el ticket de venta o generar el PDF.
// Acceso: Administradores y Vendedores.
router.get('/:id', verificarToken, administradorOVendedor, validarId('venta'), ventaControlador.obtenerDetalleVenta);

// ─────────────────────────────────────────────────────────
// PATCH /api/ventas/:id/anular
// ─────────────────────────────────────────────────────────
// Anula una venta y revierte el stock de todos los libros involucrados.
// Acceso: SOLO Administradores.
// Es PATCH (modificación parcial) porque no borra la venta, solo cambia su estado.
// PATCH en lugar de DELETE porque la venta sigue existiendo en el historial.
router.patch('/:id/anular', verificarToken, soloAdministrador, validarId('venta'), ventaControlador.anularVenta);

module.exports = router;