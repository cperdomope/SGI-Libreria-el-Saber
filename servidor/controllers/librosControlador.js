// =====================================================
// CONTROLADOR DE LIBROS (INVENTARIO)
// =====================================================
// Este archivo maneja todo lo relacionado con los libros
// del inventario: crear, leer, actualizar y eliminar.
// Es el núcleo del sistema porque todas las demás funciones
// (ventas, movimientos, dashboard) giran alrededor de los libros.
//
// Tablas involucradas:
//   - mdc_libros       → tabla principal de libros
//   - mdc_autores      → información de autores (relación)
//   - mdc_categorias   → categorías de libros (relación)
//
// ¿Por qué el stock inicial es 0?
// Porque el inventario se gestiona por movimientos.
// Agregar stock se hace desde el módulo de "Movimientos" (Kardex),
// no desde aquí. Esto garantiza que cada cambio de stock
// quede registrado con quién lo hizo y por qué.
//
// 🔹 En la sustentación puedo decir:
// "El controlador de libros gestiona el CRUD del inventario.
//  El stock se maneja exclusivamente a través del módulo de
//  movimientos para mantener trazabilidad completa de cada
//  entrada y salida de mercancía."
// =====================================================

// Conexión al pool de base de datos MySQL
const db   = require('../config/db');

// path: módulo de Node.js para manejar rutas de archivos de forma segura
const path = require('path');

// fs: módulo de Node.js para operaciones del sistema de archivos
// Lo usamos para borrar imágenes de portadas cuando se actualizan o eliminan libros
const fs   = require('fs');

// =====================================================
// CONTROLADOR 1: OBTENER TODOS LOS LIBROS
// =====================================================
// Ruta: GET /api/libros
// Devuelve el listado completo de libros del inventario.
// Incluye el nombre del autor y la categoría (no solo sus IDs).
// Opcionalmente soporta paginación si se envían los parámetros.
//
// 🔹 En la sustentación puedo decir:
// "La consulta usa JOIN para traer el nombre del autor y la
//  categoría en una sola consulta, evitando múltiples viajes
//  a la base de datos. También implementa paginación opcional
//  para manejar catálogos grandes sin sobrecargar la red."
exports.obtenerLibros = async (req, res) => {
  try {
    // Detectamos si el frontend pide paginación revisando si envió estos parámetros
    const usarPaginacion = req.query.pagina || req.query.limite;

    // Si no se envían, usamos valores por defecto seguros
    let pagina = parseInt(req.query.pagina) || 1;
    let limite = parseInt(req.query.limite) || 20;

    // Protecciones contra valores inválidos o extremos
    if (pagina < 1) pagina = 1;
    if (limite < 1) limite = 20;
    if (limite > 100) limite = 100; // No permitimos más de 100 por página

    // OFFSET = cuántos registros saltar para llegar a la página correcta
    // Página 1: saltar 0 | Página 2: saltar 20 | Página 3: saltar 40
    const offset = (pagina - 1) * limite;

    // Consulta SQL que une libros + autores + categorías en un solo resultado
    // LEFT JOIN significa "traer el libro aunque no tenga autor o categoría asignados"
    const queryBase = `
      SELECT
        l.id,
        l.isbn,
        l.portada,
        l.titulo,
        l.autor_id,
        l.categoria_id,
        CAST(l.precio_venta AS DECIMAL(10,2)) AS precio_venta,
        CAST(l.stock_actual AS UNSIGNED)      AS stock_actual,
        l.stock_minimo,
        a.nombre AS autor,
        c.nombre AS categoria
      FROM mdc_libros l
      LEFT JOIN mdc_autores    a ON l.autor_id    = a.id
      LEFT JOIN mdc_categorias c ON l.categoria_id = c.id
      ORDER BY l.titulo ASC
    `;

    if (usarPaginacion) {
      // Con paginación: traemos solo los libros de la página actual
      const queryPaginada = queryBase + ` LIMIT ? OFFSET ?`;
      const [filas] = await db.query(queryPaginada, [limite, offset]);

      // También necesitamos el total para que el frontend pueda mostrar "Página 2 de 8"
      const [[{ total }]] = await db.query('SELECT COUNT(*) as total FROM mdc_libros');

      res.json({
        exito: true,
        datos: filas,
        paginacion: {
          paginaActual:       pagina,
          registrosPorPagina: limite,
          totalRegistros:     total,
          totalPaginas:       Math.ceil(total / limite)
        }
      });
    } else {
      // Sin paginación: devolvemos todos los libros de una vez
      // Útil para el módulo de ventas (POS) donde se necesita el catálogo completo
      const [filas] = await db.query(queryBase);

      res.json({
        exito: true,
        datos:  filas,
        total:  filas.length
      });
    }

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Libros] Error al listar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al obtener los libros',
      codigo:  'LIBROS_LIST_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 2: CREAR UN NUEVO LIBRO
// =====================================================
// Ruta: POST /api/libros
// Registra un nuevo libro en el inventario.
// IMPORTANTE: el stock inicial siempre es 0.
// Para agregar stock se usa el módulo de movimientos.
//
// También maneja la subida de imagen de portada (multer).
//
// 🔹 En la sustentación puedo decir:
// "Al crear un libro, el sistema valida que el título no esté
//  vacío y que el precio sea positivo. El ISBN es único en la BD,
//  lo cual el servidor detecta y devuelve un mensaje claro.
//  La imagen de portada se sube al servidor y solo guardamos
//  el nombre del archivo en la base de datos."
exports.crearLibro = async (req, res) => {
  // Extraemos los datos del formulario enviado por el frontend
  const { isbn, titulo, autor_id, categoria_id, precio_venta, stock_minimo } = req.body;

  // req.file viene de multer (middleware de manejo de archivos).
  // Si el usuario no subió imagen, portadaFilename quedará como null.
  const portadaFilename = req.file ? req.file.filename : null;

  // ─────────────────────────────────────────────────
  // VALIDACIONES ANTES DE GUARDAR
  // ─────────────────────────────────────────────────

  // El título es el campo más importante — sin él no podemos identificar el libro
  if (!titulo || titulo.trim() === '') {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El título del libro es obligatorio'
    });
  }

  // Evitamos títulos extremadamente largos que podrían causar problemas en BD
  if (titulo.trim().length > 200) {
    return res.status(400).json({ exito: false, mensaje: 'El título no puede superar los 200 caracteres' });
  }

  // El ISBN tiene un largo máximo en la BD (columna VARCHAR(20))
  if (isbn && isbn.length > 20) {
    return res.status(400).json({ exito: false, mensaje: 'El ISBN no puede superar los 20 caracteres' });
  }

  // El precio debe ser positivo — no tiene sentido un libro que cueste $0 o negativo
  if (!precio_venta || precio_venta <= 0) {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El precio de venta debe ser mayor a cero'
    });
  }

  try {
    // Insertamos el libro en la base de datos.
    // stock_actual = 0 porque el inventario inicial se agrega por movimientos.
    // stock_minimo || 5 → si no se especifica, usamos 5 como umbral de alerta.
    const [resultado] = await db.query(
      `INSERT INTO mdc_libros
       (isbn, portada, titulo, autor_id, categoria_id, precio_venta, stock_minimo, stock_actual)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        isbn         || null,  // null si no se ingresó ISBN
        portadaFilename,       // null si no se subió imagen
        titulo.trim(),         // Eliminamos espacios al inicio y al final
        autor_id     || null,  // null si no se seleccionó autor
        categoria_id || null,  // null si no se seleccionó categoría
        precio_venta,
        stock_minimo || 5      // Valor por defecto: alertar cuando queden menos de 5
      ]
    );

    // Respondemos con 201 (creado) y el ID asignado por la base de datos
    res.status(201).json({
      exito:   true,
      mensaje: 'Libro creado exitosamente',
      id:      resultado.insertId
    });

  } catch (error) {
    // ER_DUP_ENTRY: error de MySQL cuando se intenta insertar un ISBN que ya existe
    // La columna ISBN tiene una restricción UNIQUE en la base de datos
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        exito:   false,
        mensaje: 'El ISBN ingresado ya existe en el sistema',
        codigo:  'ISBN_DUPLICADO'
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('[Libros] Error al crear:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al crear el libro',
      codigo:  'LIBRO_CREATE_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 3: ACTUALIZAR UN LIBRO EXISTENTE
// =====================================================
// Ruta: PUT /api/libros/:id
// Actualiza los datos de un libro ya registrado.
//
// Cosas importantes que NO hace este controlador:
//   - NO modifica el stock_actual (eso es exclusivo del módulo de movimientos)
//   - Si se sube nueva imagen, borra la imagen anterior del disco
//
// 🔹 En la sustentación puedo decir:
// "Al actualizar un libro, si se sube una nueva imagen de portada,
//  el sistema elimina la imagen anterior del servidor para no
//  desperdiciar espacio en disco. El stock solo se puede cambiar
//  a través del módulo de movimientos para garantizar trazabilidad."
exports.actualizarLibro = async (req, res) => {
  // El middleware validarParametroId ya verificó que el ID sea un número válido
  const { id } = req.params;
  const { isbn, titulo, autor_id, categoria_id, precio_venta, stock_minimo } = req.body;

  // Si el usuario subió una nueva imagen de portada, multer nos da el nombre del archivo
  const nuevaPortada = req.file ? req.file.filename : null;

  // Validamos que el título no esté vacío
  if (!titulo || titulo.trim() === '') {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El título del libro es obligatorio'
    });
  }

  try {
    // Si se subió nueva portada, necesitamos el nombre de la anterior para borrarla
    let portadaAnterior = null;
    if (nuevaPortada) {
      const [rows] = await db.query(
        'SELECT portada FROM mdc_libros WHERE id = ?',
        [id]
      );
      portadaAnterior = rows[0]?.portada || null;
    }

    // Construimos el UPDATE de forma dinámica.
    // Si no se subió nueva portada, no incluimos ese campo en el UPDATE
    // (así no borramos la portada existente accidentalmente).
    const campos  = [
      'isbn = ?', 'titulo = ?', 'autor_id = ?',
      'categoria_id = ?', 'precio_venta = ?', 'stock_minimo = ?'
    ];
    const valores = [
      isbn         || null,
      titulo.trim(),
      autor_id     || null,
      categoria_id || null,
      precio_venta,
      stock_minimo || 5
    ];

    // Solo agregamos la portada al UPDATE si se subió una nueva
    if (nuevaPortada) {
      campos.push('portada = ?');
      valores.push(nuevaPortada);
    }

    // El ID del libro va al final como condición del WHERE
    valores.push(id);

    // NOTA: Intencionalmente NO actualizamos stock_actual aquí.
    // Los cambios de stock deben ir por el módulo de movimientos.
    const [resultado] = await db.query(
      `UPDATE mdc_libros SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );

    // Si se subió nueva portada y había una anterior, borramos el archivo viejo del disco
    if (nuevaPortada && portadaAnterior) {
      const rutaAntigua = path.join(__dirname, '..', 'uploads', 'portadas', portadaAnterior);
      // El segundo parámetro es una función que ignora errores (el archivo puede no existir)
      fs.unlink(rutaAntigua, () => {});
    }

    // affectedRows = 0 significa que no existía un libro con ese ID
    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        exito:   false,
        mensaje: 'Libro no encontrado',
        codigo:  'LIBRO_NOT_FOUND'
      });
    }

    res.json({
      exito:   true,
      mensaje: 'Libro actualizado correctamente'
    });

  } catch (error) {
    // Error de ISBN duplicado al actualizar
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        exito:   false,
        mensaje: 'El ISBN ingresado ya existe en otro libro',
        codigo:  'ISBN_DUPLICADO'
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('[Libros] Error al actualizar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al actualizar el libro',
      codigo:  'LIBRO_UPDATE_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 4: ELIMINAR UN LIBRO
// =====================================================
// Ruta: DELETE /api/libros/:id
// Elimina un libro del inventario.
//
// ¿Cuándo NO se puede eliminar un libro?
// Cuando ya tiene historial de movimientos o ventas.
// La base de datos tiene una restricción de CLAVE FORÁNEA (FK)
// que impide borrar un libro que esté referenciado en otras tablas.
// Esto protege la integridad de los datos históricos.
//
// 🔹 En la sustentación puedo decir:
// "La base de datos tiene restricciones de clave foránea que
//  impiden eliminar un libro que ya tenga ventas o movimientos
//  registrados. El servidor captura ese error y devuelve un
//  mensaje claro al usuario en lugar de un error genérico."
exports.eliminarLibro = async (req, res) => {
  // El ID ya fue validado por el middleware validarParametroId
  const { id } = req.params;

  try {
    // Antes de eliminar el libro, obtenemos el nombre de la imagen de portada
    // para poder borrarla del disco después de la eliminación exitosa
    const [rows] = await db.query(
      'SELECT portada FROM mdc_libros WHERE id = ?',
      [id]
    );
    const portadaActual = rows[0]?.portada || null;

    // Ejecutamos la eliminación del libro
    const [resultado] = await db.query(
      'DELETE FROM mdc_libros WHERE id = ?',
      [id]
    );

    // Si no se eliminó ninguna fila, el libro no existía
    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        exito:   false,
        mensaje: 'Libro no encontrado',
        codigo:  'LIBRO_NOT_FOUND'
      });
    }

    // Si el libro tenía imagen de portada, la borramos del disco del servidor
    if (portadaActual) {
      const rutaPortada = path.join(__dirname, '..', 'uploads', 'portadas', portadaActual);
      fs.unlink(rutaPortada, () => {}); // Ignoramos error si el archivo ya no existe
    }

    res.json({
      exito:   true,
      mensaje: 'Libro eliminado correctamente'
    });

  } catch (error) {
    // ER_ROW_IS_REFERENCED_2: error de MySQL cuando intentamos borrar
    // un registro que está referenciado por otra tabla (clave foránea).
    // Ejemplo: no se puede borrar un libro que ya fue vendido.
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        exito:   false,
        mensaje: 'No se puede eliminar: el libro tiene historial de movimientos o ventas',
        codigo:  'LIBRO_CON_HISTORIAL'
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('[Libros] Error al eliminar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al eliminar el libro',
      codigo:  'LIBRO_DELETE_ERROR'
    });
  }
};