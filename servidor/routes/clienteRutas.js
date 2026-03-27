// =====================================================
// RUTAS DE CLIENTES
// =====================================================
// Define los endpoints del módulo de clientes.
//
// BASE URL (definida en app.js): /api/clientes
//
// ¿Quién puede acceder?
//   - Ver y crear clientes: Administradores Y Vendedores
//     (los vendedores necesitan registrar clientes nuevos al momento de vender)
//   - Editar y eliminar: SOLO Administradores
//     (modificar o borrar clientes existentes es más delicado)

// "El módulo de clientes diferencia permisos por operación.
//  Los vendedores pueden consultar y crear clientes porque lo necesitan
//  para registrar ventas, pero solo el administrador puede modificar
//  o eliminar clientes existentes para evitar errores o fraudes."
// =====================================================

const express = require('express');
const router  = express.Router();

// Controlador con la lógica CRUD de clientes
const clienteControlador = require('../controllers/clienteControlador');

// Verifica que el JWT sea válido
const verificarToken = require('../middlewares/verificarToken');

// Middlewares de control de acceso por rol
const { soloAdministrador, administradorOVendedor } = require('../middlewares/verificarRol');

// Valida que el :id de la URL sea un número entero positivo válido
const { validarId } = require('../middlewares/validarParametroId');

// ─────────────────────────────────────────────────────────
// GET /api/clientes
// ─────────────────────────────────────────────────────────
// Lista todos los clientes ordenados alfabéticamente.
// Soporta paginación opcional.
// Acceso: Administradores y Vendedores.
router.get('/', verificarToken, administradorOVendedor, clienteControlador.obtenerClientes);

// ─────────────────────────────────────────────────────────
// GET /api/clientes/:id
// ─────────────────────────────────────────────────────────
// Obtiene los datos de un cliente específico por su ID.
// Se usa al seleccionar un cliente en el módulo de ventas (POS).
// Acceso: Administradores y Vendedores.
router.get('/:id', verificarToken, administradorOVendedor, validarId('cliente'), clienteControlador.obtenerClientePorId);

// ─────────────────────────────────────────────────────────
// POST /api/clientes
// ─────────────────────────────────────────────────────────
// Registra un nuevo cliente en el sistema.
// El vendedor puede hacer esto en el momento de la venta si el cliente es nuevo.
// Acceso: Administradores y Vendedores.
router.post('/', verificarToken, administradorOVendedor, clienteControlador.crearCliente);

// ─────────────────────────────────────────────────────────
// PUT /api/clientes/:id
// ─────────────────────────────────────────────────────────
// Actualiza todos los datos de un cliente.
// Acceso: SOLO Administradores.
router.put('/:id', verificarToken, soloAdministrador, validarId('cliente'), clienteControlador.actualizarCliente);

// ─────────────────────────────────────────────────────────
// DELETE /api/clientes/:id
// ─────────────────────────────────────────────────────────
// Elimina un cliente. No se puede si tiene ventas registradas.
// Acceso: SOLO Administradores.
router.delete('/:id', verificarToken, soloAdministrador, validarId('cliente'), clienteControlador.eliminarCliente);

module.exports = router;