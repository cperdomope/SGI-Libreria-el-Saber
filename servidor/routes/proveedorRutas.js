// =====================================================
// RUTAS DE PROVEEDORES
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Define las URLs (endpoints) para gestionar los proveedores
//   de libros. Los proveedores son las empresas o personas
//   que nos venden la mercancía que ingresa al inventario.
//
// ¿Cómo se conecta con el sistema?
//   app.js monta estas rutas en /api/proveedores
//   → GET    /api/proveedores      → Ver todos los proveedores
//   → POST   /api/proveedores      → Registrar proveedor nuevo
//   → PUT    /api/proveedores/:id  → Actualizar un proveedor
//   → DELETE /api/proveedores/:id  → Eliminar un proveedor
//
// ¿Quién puede acceder?
//   Solo Administradores. La gestión de proveedores es
//   una operación administrativa (compras, costos, contratos).
//
// =====================================================

// Importamos Express y creamos el enrutador
const express = require('express');
const router = express.Router();

// Importamos el controlador con la lógica de proveedores
const proveedorControlador = require('../controllers/proveedorControlador');

// Importamos los middlewares de seguridad
const verificarToken = require('../middlewares/verificarToken');       // Verifica autenticacion JWT
const { soloAdministrador } = require('../middlewares/verificarRol');  // Solo Admin (rol_id = 1)
const { validarId } = require('../middlewares/validarParametroId'); // Valida que :id sea un numero entero valido

// ─────────────────────────────────────────────────────
// RUTA GET: Listar todos los proveedores
// ─────────────────────────────────────────────────────
router.get('/', verificarToken, soloAdministrador, proveedorControlador.obtenerProveedores);

// ─────────────────────────────────────────────────────
// RUTA POST: Registrar un proveedor nuevo
// ─────────────────────────────────────────────────────
// Body esperado: { nombre_empresa, nit?, nombre_contacto?, email?, telefono?, direccion? }
router.post('/', verificarToken, soloAdministrador, proveedorControlador.crearProveedor);

// ─────────────────────────────────────────────────────
// RUTA PUT: Actualizar datos de un proveedor
// ─────────────────────────────────────────────────────
// Params: :id → ID del proveedor a modificar
router.put('/:id', verificarToken, soloAdministrador, validarId('proveedor'), proveedorControlador.actualizarProveedor);

// ─────────────────────────────────────────────────────
// RUTA DELETE: Eliminar un proveedor
// ─────────────────────────────────────────────────────
// Params: :id → ID del proveedor a eliminar
router.delete('/:id', verificarToken, soloAdministrador, validarId('proveedor'), proveedorControlador.eliminarProveedor);

// Exportamos el router para que app.js lo monte en /api/proveedores
module.exports = router;