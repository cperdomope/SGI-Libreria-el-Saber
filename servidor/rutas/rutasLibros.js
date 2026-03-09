const express = require('express');
const router = express.Router();
const controladorLibros = require('../controladores/controladorLibros');
const verificarToken = require('../middlewares/verificarToken');
const { soloAdministrador, administradorOVendedor } = require('../middlewares/verificarRol');
const { validarId } = require('../middlewares/validarParametroId');
const { uploadPortada } = require('../middlewares/uploadImagen');

// 1. Obtener todos (GET) - Vendedores necesitan ver inventario para ventas
router.get('/', verificarToken, administradorOVendedor, controladorLibros.obtenerLibros);

// 2. Crear nuevo (POST) - Solo Administradores
// uploadPortada.single('portada'): acepta multipart/form-data con campo "portada"
// Si el request es application/json (sin imagen), multer lo deja pasar sin error
router.post('/', verificarToken, soloAdministrador, uploadPortada.single('portada'), controladorLibros.crearLibro);

// 3. Editar existente (PUT) - Solo Administradores
router.put('/:id', verificarToken, soloAdministrador, validarId('libro'), uploadPortada.single('portada'), controladorLibros.actualizarLibro);

// 4. Eliminar (DELETE) - Solo Administradores
router.delete('/:id', verificarToken, soloAdministrador, validarId('libro'), controladorLibros.eliminarLibro);

module.exports = router;
