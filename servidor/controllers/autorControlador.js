// =====================================================
// CONTROLADOR DE AUTORES
// =====================================================
// Este archivo gestiona el catálogo de autores de la librería.
//
// ¿Para qué sirven los autores en el sistema?
// Son datos de referencia que se asocian a los libros.
// Cuando registramos un libro, podemos indicar quién lo escribió.
// Esto permite filtrar o buscar libros por autor.
//
// Tabla: mdc_autores
// Campos: id, nombre
//
// Relación: mdc_libros.autor_id → mdc_autores.id
// (Un autor puede tener muchos libros, un libro tiene un autor)

// "Los autores son una entidad de catálogo que se relaciona
//  con los libros. Al intentar eliminar un autor que tiene
//  libros asociados, el sistema lo impide mostrando cuántos
//  libros están vinculados, en lugar de dejar que falle
//  silenciosamente la restricción de clave foránea."
// =====================================================

// Conexión al pool de base de datos MySQL
const db = require('../config/db');

// =====================================================
// CONTROLADOR 1: LISTAR TODOS LOS AUTORES
// =====================================================
// Ruta: GET /api/autores
// Devuelve todos los autores ordenados alfabéticamente.
// Se usa principalmente para llenar el selector de autores
// cuando se crea o edita un libro.
exports.obtenerAutores = async (req, res) => {
  try {
    // Consulta simple: solo necesitamos el ID y el nombre
    const [autores] = await db.query(
      'SELECT id, nombre FROM mdc_autores ORDER BY nombre ASC'
    );

    res.json({
      exito: true,
      datos:  autores,
      total:  autores.length
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Autores] Error al listar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al obtener los autores',
      codigo:  'AUTORES_LIST_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 2: CREAR UN NUEVO AUTOR
// =====================================================
// Ruta: POST /api/autores
// Registra un nuevo autor en el sistema.
// Solo se requiere el nombre.
exports.crearAutor = async (req, res) => {
  const { nombre } = req.body;

  // El nombre es el único campo y es obligatorio
  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El nombre del autor es obligatorio'
    });
  }

  try {
    // Insertamos el autor con el nombre limpio (sin espacios al inicio o fin)
    const [resultado] = await db.query(
      'INSERT INTO mdc_autores (nombre) VALUES (?)',
      [nombre.trim()]
    );

    // Respondemos con el autor recién creado para que el frontend pueda seleccionarlo
    res.status(201).json({
      exito:   true,
      mensaje: 'Autor creado exitosamente',
      datos: {
        id:     resultado.insertId,
        nombre: nombre.trim()
      }
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Autores] Error al crear:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al crear el autor',
      codigo:  'AUTOR_CREATE_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 3: ACTUALIZAR UN AUTOR
// =====================================================
// Ruta: PUT /api/autores/:id
// Permite corregir el nombre de un autor ya registrado.
// Al actualizar el autor, todos sus libros reflejan el cambio
// automáticamente porque usan el autor_id (no el texto).
exports.actualizarAutor = async (req, res) => {
  // El middleware validarParametroId ya verifico que el ID sea un numero valido
  const { id }     = req.params;
  const { nombre } = req.body;

  // Validamos que venga el nombre nuevo
  if (!nombre || nombre.trim() === '') {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El nombre del autor es obligatorio'
    });
  }

  try {
    const [resultado] = await db.query(
      'UPDATE mdc_autores SET nombre = ? WHERE id = ?',
      [nombre.trim(), id]
    );

    // affectedRows = 0 → no existe un autor con ese ID
    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        exito:   false,
        mensaje: 'Autor no encontrado',
        codigo:  'AUTOR_NOT_FOUND'
      });
    }

    res.json({
      exito:   true,
      mensaje: 'Autor actualizado exitosamente'
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Autores] Error al actualizar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al actualizar el autor',
      codigo:  'AUTOR_UPDATE_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 4: ELIMINAR UN AUTOR
// =====================================================
// Ruta: DELETE /api/autores/:id
// Elimina un autor solo si no tiene libros asociados.
//
// ¿Por qué no podemos borrar un autor con libros?
// Porque los libros guardan el autor_id.
// Si borramos el autor, esos libros quedarían con una referencia
// a un ID que ya no existe (inconsistencia de datos).
// La base de datos tiene una restricción de FK que lo impide.
// Aquí lo verificamos primero para dar un mensaje más claro.
exports.eliminarAutor = async (req, res) => {
  // El middleware validarParametroId ya verifico que el ID sea un numero valido
  const { id } = req.params;

  try {
    // Verificamos cuántos libros están asociados a este autor
    // COUNT(*) devuelve el número de libros que tienen este autor_id
    const [libros] = await db.query(
      'SELECT COUNT(*) as total FROM mdc_libros WHERE autor_id = ?',
      [id]
    );

    // Si hay libros asociados, no permitimos la eliminación
    if (libros[0].total > 0) {
      return res.status(400).json({
        exito:   false,
        mensaje: `No se puede eliminar: hay ${libros[0].total} libro(s) asociado(s) a este autor`,
        codigo:  'AUTOR_CON_LIBROS'
      });
    }

    // Si no hay libros asociados, procedemos a eliminar
    const [resultado] = await db.query(
      'DELETE FROM mdc_autores WHERE id = ?',
      [id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        exito:   false,
        mensaje: 'Autor no encontrado',
        codigo:  'AUTOR_NOT_FOUND'
      });
    }

    res.json({
      exito:   true,
      mensaje: 'Autor eliminado exitosamente'
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Autores] Error al eliminar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al eliminar el autor',
      codigo:  'AUTOR_DELETE_ERROR'
    });
  }
};