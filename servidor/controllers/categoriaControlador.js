// =====================================================
// CONTROLADOR DE CATEGORÍAS
// =====================================================
// Este archivo gestiona el catálogo de categorías de libros.
//
// ¿Para qué sirven las categorías?
// Permiten clasificar el inventario por género o tipo:
// Ficción, Ciencia, Historia, Matemáticas, etc.
// Se usan para organizar el catálogo y en la gráfica de torta del dashboard.
//
// Tabla: mdc_categorias
// Campos: id, nombre (UNIQUE — no puede haber dos categorías con el mismo nombre)
//
// Relación: mdc_libros.categoria_id → mdc_categorias.id
//
// 🔹 En la sustentación puedo decir:
// "Las categorías son datos de catálogo que clasifican los libros.
//  El nombre tiene restricción UNIQUE en la base de datos, así que
//  capturamos el error ER_DUP_ENTRY de MySQL para dar un mensaje
//  amigable en lugar de mostrar el error técnico al usuario.
//  Tampoco podemos eliminar una categoría que tenga libros,
//  lo verificamos antes para dar un mensaje descriptivo."
// =====================================================

// Conexión al pool de base de datos MySQL
const db = require('../config/db');

// =====================================================
// CONTROLADOR 1: LISTAR TODAS LAS CATEGORÍAS
// =====================================================
// Ruta: GET /api/categorias
// Devuelve todas las categorías ordenadas alfabéticamente.
// Se usa para llenar el selector de categorías al crear/editar un libro
// y para la gráfica de torta del dashboard.
exports.obtenerCategorias = async (req, res) => {
  try {
    const [categorias] = await db.query(
      'SELECT id, nombre FROM mdc_categorias ORDER BY nombre ASC'
    );

    res.json({
      exito: true,
      datos:  categorias,
      total:  categorias.length
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Categorías] Error al listar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al obtener las categorías',
      codigo:  'CATEGORIAS_LIST_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 2: CREAR UNA NUEVA CATEGORÍA
// =====================================================
// Ruta: POST /api/categorias
// El nombre de la categoría debe ser único.
// Si ya existe una con el mismo nombre, MySQL lanza ER_DUP_ENTRY
// y nosotros lo capturamos para dar un mensaje claro.
exports.crearCategoria = async (req, res) => {
  const { nombre } = req.body;

  // El nombre es el único campo requerido
  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El nombre de la categoría es obligatorio'
    });
  }

  try {
    const [resultado] = await db.query(
      'INSERT INTO mdc_categorias (nombre) VALUES (?)',
      [nombre.trim()]
    );

    res.status(201).json({
      exito:   true,
      mensaje: 'Categoría creada exitosamente',
      datos: {
        id:     resultado.insertId,
        nombre: nombre.trim()
      }
    });

  } catch (error) {
    // ER_DUP_ENTRY: MySQL lanza este error cuando se viola la restricción UNIQUE.
    // En lugar de mostrar el error técnico, damos un mensaje comprensible.
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        exito:   false,
        mensaje: 'Ya existe una categoría con ese nombre',
        codigo:  'CATEGORIA_DUPLICADA'
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('[Categorías] Error al crear:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al crear la categoría',
      codigo:  'CATEGORIA_CREATE_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 3: ACTUALIZAR UNA CATEGORÍA
// =====================================================
// Ruta: PUT /api/categorias/:id
// Al cambiar el nombre de una categoría, todos los libros
// que la tienen asignada reflejan el cambio automáticamente
// (porque usan el ID, no el texto de la categoría).
exports.actualizarCategoria = async (req, res) => {
  const { id }     = req.params;
  const { nombre } = req.body;

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      exito:   false,
      mensaje: 'ID de categoría inválido'
    });
  }

  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El nombre de la categoría es obligatorio'
    });
  }

  try {
    const [resultado] = await db.query(
      'UPDATE mdc_categorias SET nombre = ? WHERE id = ?',
      [nombre.trim(), id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        exito:   false,
        mensaje: 'Categoría no encontrada',
        codigo:  'CATEGORIA_NOT_FOUND'
      });
    }

    res.json({
      exito:   true,
      mensaje: 'Categoría actualizada exitosamente'
    });

  } catch (error) {
    // El nuevo nombre tampoco puede duplicar otra categoría existente
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        exito:   false,
        mensaje: 'Ya existe otra categoría con ese nombre',
        codigo:  'CATEGORIA_DUPLICADA'
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('[Categorías] Error al actualizar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al actualizar la categoría',
      codigo:  'CATEGORIA_UPDATE_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 4: ELIMINAR UNA CATEGORÍA
// =====================================================
// Ruta: DELETE /api/categorias/:id
// Solo se puede eliminar si no hay libros en esa categoría.
// Primero consultamos cuántos libros la usan y damos un mensaje
// descriptivo antes de que MySQL genere el error de FK.
exports.eliminarCategoria = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      exito:   false,
      mensaje: 'ID de categoría inválido'
    });
  }

  try {
    // Contamos cuántos libros tienen esta categoría asignada
    const [libros] = await db.query(
      'SELECT COUNT(*) as total FROM mdc_libros WHERE categoria_id = ?',
      [id]
    );

    // Si hay libros, informamos cuántos y bloqueamos la eliminación
    if (libros[0].total > 0) {
      return res.status(400).json({
        exito:   false,
        mensaje: `No se puede eliminar: hay ${libros[0].total} libro(s) asociado(s) a esta categoría`,
        codigo:  'CATEGORIA_CON_LIBROS'
      });
    }

    // Si no hay libros, procedemos a eliminar la categoría
    const [resultado] = await db.query(
      'DELETE FROM mdc_categorias WHERE id = ?',
      [id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        exito:   false,
        mensaje: 'Categoría no encontrada',
        codigo:  'CATEGORIA_NOT_FOUND'
      });
    }

    res.json({
      exito:   true,
      mensaje: 'Categoría eliminada exitosamente'
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Categorías] Error al eliminar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al eliminar la categoría',
      codigo:  'CATEGORIA_DELETE_ERROR'
    });
  }
};