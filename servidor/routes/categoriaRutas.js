// =====================================================
// RUTAS DE CATEGORÍAS
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Define las URLs (endpoints) para gestionar las categorías
//   de los libros (Ficción, Ciencia, Historia, etc.).
//   Las categorías ayudan a organizar el catálogo y a generar
//   estadísticas en el dashboard (gráfica de distribución).
//
// ¿Cómo se conecta con el sistema?
//   app.js monta estas rutas en /api/categorias
//   → GET    /api/categorias      → Ver todas las categorías
//   → POST   /api/categorias      → Crear categoría nueva
//   → PUT    /api/categorias/:id  → Actualizar una categoría
//   → DELETE /api/categorias/:id  → Eliminar una categoría
//
// ¿Quién puede acceder?
//   - GET: Admin y Vendedores (necesitan ver categorías al registrar libros)
//   - POST/PUT/DELETE: Solo Administradores
//
// =====================================================

// Importamos Express y creamos el enrutador
const express = require('express');
const router = express.Router();

// Importamos el controlador con la lógica de categorías
const categoriaControlador = require('../controllers/categoriaControlador');

// Importamos los middlewares de seguridad
const verificarToken = require('../middlewares/verificarToken');
const { soloAdministrador, administradorOVendedor } = require('../middlewares/verificarRol');

// Valida que el parametro :id sea un numero entero positivo
const { validarId } = require('../middlewares/validarParametroId');

// ─────────────────────────────────────────────────────
// RUTA GET: Listar todas las categorias
// ─────────────────────────────────────────────────────
// Acceso: Admin y Vendedores (ambos necesitan ver la lista)
router.get('/', verificarToken, administradorOVendedor, categoriaControlador.obtenerCategorias);

// ─────────────────────────────────────────────────────
// RUTAS DE ESCRITURA: Solo Administradores
// ─────────────────────────────────────────────────────

// POST: Crear una categoria nueva
// Body esperado: { nombre }
router.post('/', verificarToken, soloAdministrador, categoriaControlador.crearCategoria);

// PUT: Actualizar nombre de una categoria existente
// Params: :id → ID de la categoria a modificar
router.put('/:id', verificarToken, soloAdministrador, validarId('categoria'), categoriaControlador.actualizarCategoria);

// DELETE: Eliminar una categoria
// Params: :id → ID de la categoria a eliminar
router.delete('/:id', verificarToken, soloAdministrador, validarId('categoria'), categoriaControlador.eliminarCategoria);

// Exportamos el router para que app.js lo monte en /api/categorias
module.exports = router;