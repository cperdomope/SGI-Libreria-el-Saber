// =====================================================
// RUTAS DE LIBROS (INVENTARIO)
// =====================================================
// Define los endpoints del módulo de inventario de libros.
//
// BASE URL (definida en app.js): /api/libros
//
// ¿Quién puede acceder?
//   - Ver libros: Administradores Y Vendedores
//     (los vendedores necesitan ver el catálogo para hacer ventas)
//   - Crear, editar, eliminar: SOLO Administradores
//     (modificar el inventario es responsabilidad del administrador)
//
// Middlewares especiales en estas rutas:
//   - validarId: verifica que el :id en la URL sea un número entero válido
//   - uploadPortada: procesa la imagen de portada si se envía como multipart/form-data
//
// 🔹 En la sustentación puedo decir:
// "Las rutas de libros aplican dos niveles de protección:
//  autenticación (verificarToken) y autorización por rol (verificarRol).
//  Adicionalmente, validarId previene ataques donde se envíen IDs
//  maliciosos como 'undefined', '-1' o scripts en la URL."
// =====================================================

const express = require('express');
const router  = express.Router();

// Controlador con la lógica CRUD del inventario
const controladorLibros = require('../controllers/librosControlador');

// Verifica que el JWT sea válido (quién es el usuario)
const verificarToken = require('../middlewares/verificarToken');

// Roles de acceso
const { soloAdministrador, administradorOVendedor } = require('../middlewares/verificarRol');

// Valida que el parámetro :id de la URL sea un número entero positivo
// Si alguien manda /api/libros/abc o /api/libros/-1, rechaza con 400
const { validarId } = require('../middlewares/validarParametroId');

// Middleware de Multer que procesa la imagen de portada
// Solo acepta imágenes (jpg, png, webp) y limita el tamaño a 2 MB
const { uploadPortada } = require('../middlewares/uploadImagen');

// ─────────────────────────────────────────────────────────
// GET /api/libros
// ─────────────────────────────────────────────────────────
// Devuelve el catálogo completo de libros con autor y categoría.
// Soporta paginación opcional (?pagina=1&limite=20).
// Acceso: Administradores y Vendedores.
router.get('/', verificarToken, administradorOVendedor, controladorLibros.obtenerLibros);

// ─────────────────────────────────────────────────────────
// POST /api/libros
// ─────────────────────────────────────────────────────────
// Crea un nuevo libro en el inventario (stock inicial = 0).
// uploadPortada.single('portada'): procesa el campo "portada" del formulario.
// Si el body es JSON (sin imagen), multer lo deja pasar sin error.
// Acceso: SOLO Administradores.
router.post('/',
  verificarToken,
  soloAdministrador,
  uploadPortada.single('portada'),   // Procesa la imagen antes del controlador
  controladorLibros.crearLibro
);

// ─────────────────────────────────────────────────────────
// PUT /api/libros/:id
// ─────────────────────────────────────────────────────────
// Actualiza los datos de un libro existente.
// validarId('libro'): verifica que :id sea un número válido antes de continuar.
// Si se sube nueva portada, la anterior se elimina del disco automáticamente.
// Acceso: SOLO Administradores.
router.put('/:id',
  verificarToken,
  soloAdministrador,
  validarId('libro'),                // Primero validamos el ID
  uploadPortada.single('portada'),   // Luego procesamos la imagen (si viene)
  controladorLibros.actualizarLibro
);

// ─────────────────────────────────────────────────────────
// DELETE /api/libros/:id
// ─────────────────────────────────────────────────────────
// Elimina un libro del inventario.
// Solo funciona si el libro no tiene ventas ni movimientos registrados.
// Acceso: SOLO Administradores.
router.delete('/:id', verificarToken, soloAdministrador, validarId('libro'), controladorLibros.eliminarLibro);

module.exports = router;