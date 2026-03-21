// =====================================================
// RUTAS DE AUTORES
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Define las URLs (endpoints) para gestionar los autores
//   de los libros. Los autores se asocian a cada libro
//   para poder buscar y organizar el catálogo.
//
// ¿Cómo se conecta con el sistema?
//   app.js monta estas rutas en /api/autores
//   → GET    /api/autores      → Ver todos los autores
//   → POST   /api/autores      → Crear un autor nuevo
//   → PUT    /api/autores/:id  → Actualizar un autor
//   → DELETE /api/autores/:id  → Eliminar un autor
//
// ¿Quién puede acceder?
//   - GET: Admin y Vendedores (necesitan ver autores al registrar libros)
//   - POST/PUT/DELETE: Solo Administradores
//
// =====================================================

// Importamos Express y creamos el enrutador
const express = require('express');
const router = express.Router();

// Importamos el controlador con la lógica de autores
const autorControlador = require('../controllers/autorControlador');

// Importamos los middlewares de seguridad
const verificarToken = require('../middlewares/verificarToken');
const { soloAdministrador, administradorOVendedor } = require('../middlewares/verificarRol');

// ─────────────────────────────────────────────────────
// RUTA GET: Listar todos los autores
// ─────────────────────────────────────────────────────
// Acceso: Admin y Vendedores (ambos necesitan ver la lista)
router.get('/', verificarToken, administradorOVendedor, autorControlador.obtenerAutores);

// ─────────────────────────────────────────────────────
// RUTAS DE ESCRITURA: Solo Administradores
// ─────────────────────────────────────────────────────

// POST: Crear un autor nuevo
// Body esperado: { nombre, nacionalidad? }
router.post('/', verificarToken, soloAdministrador, autorControlador.crearAutor);

// PUT: Actualizar datos de un autor existente
// Params: :id → ID del autor a modificar
router.put('/:id', verificarToken, soloAdministrador, autorControlador.actualizarAutor);

// DELETE: Eliminar un autor
// Params: :id → ID del autor a eliminar
router.delete('/:id', verificarToken, soloAdministrador, autorControlador.eliminarAutor);

// Exportamos el router para que app.js lo monte en /api/autores
module.exports = router;