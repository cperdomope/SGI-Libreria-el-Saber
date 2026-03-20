// =====================================================
// CONTROLADOR DE CLIENTES
// =====================================================
// Este archivo gestiona el registro y mantenimiento de los
// clientes de la librería.
//
// ¿Para qué sirven los clientes en el sistema?
// Cada venta debe estar asociada a un cliente.
// Esto nos permite:
//   - Saber quién compró qué
//   - Ver el historial de compras por cliente
//   - Identificar los mejores clientes (dashboard)
//
// Tabla principal: mdc_clientes
// Campos: id, nombre_completo, documento (único), email, telefono, direccion
//
// El documento (cédula, pasaporte, etc.) es único en el sistema.
// No puede haber dos clientes con el mismo documento.
//
// 🔹 En la sustentación puedo decir:
// "El módulo de clientes gestiona el CRUD de compradores.
//  El campo documento tiene restricción UNIQUE en la base de datos,
//  garantizando que no se registren clientes duplicados.
//  Además verificamos duplicados antes del INSERT para dar
//  mensajes de error más claros al usuario."
// =====================================================

// Conexión al pool de base de datos MySQL
const db = require('../config/db');

// Utilidad reutilizable para manejar la paginación de cualquier consulta
// Así no repetimos el mismo código de paginación en todos los controladores
const { aplicarPaginacion } = require('../utils/paginacion');

// =====================================================
// CONTROLADOR 1: OBTENER TODOS LOS CLIENTES
// =====================================================
// Ruta: GET /api/clientes
// Devuelve la lista de clientes ordenada alfabéticamente.
// Soporta paginación opcional (si se envían pagina y limite).
const obtenerClientes = async (req, res) => {
  try {
    // aplicarPaginacion es una función utilitaria que detecta si se pide paginación
    // y ejecuta la consulta apropiada según corresponda
    const respuesta = await aplicarPaginacion(
      req,
      (limite, offset) => {
        // Si viene con paginación: traemos solo los registros de la página actual
        if (limite !== undefined) {
          return db.query(
            'SELECT id, nombre_completo, documento, email, telefono, direccion, fecha_registro FROM mdc_clientes ORDER BY nombre_completo ASC LIMIT ? OFFSET ?',
            [limite, offset]
          );
        }
        // Sin paginación: traemos todos los clientes
        // Útil cuando el frontend necesita el listado completo (por ejemplo en el POS)
        return db.query(
          'SELECT id, nombre_completo, documento, email, telefono, direccion, fecha_registro FROM mdc_clientes ORDER BY nombre_completo ASC'
        );
      },
      // Función que cuenta el total de clientes (para calcular total de páginas)
      () => db.query('SELECT COUNT(*) as total FROM mdc_clientes')
    );

    res.json(respuesta);

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Clientes] Error al listar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al obtener los clientes',
      codigo:  'CLIENTES_LIST_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 2: OBTENER UN CLIENTE POR ID
// =====================================================
// Ruta: GET /api/clientes/:id
// Busca y devuelve los datos de un cliente específico.
// Se usa cuando el vendedor selecciona un cliente en el POS.
const obtenerClientePorId = async (req, res) => {
  // El middleware validarParametroId ya verificó que el ID sea un número válido
  const { id } = req.params;

  try {
    // Buscamos el cliente por su ID primario
    const [filas] = await db.query(
      'SELECT id, nombre_completo, documento, email, telefono, direccion, fecha_registro FROM mdc_clientes WHERE id = ?',
      [id]
    );

    // Si la consulta no devolvió resultados, el cliente no existe
    if (filas.length === 0) {
      return res.status(404).json({
        exito:   false,
        mensaje: 'Cliente no encontrado',
        codigo:  'CLIENTE_NOT_FOUND'
      });
    }

    // Devolvemos el primer (y único) resultado
    res.json({
      exito: true,
      datos: filas[0]
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Clientes] Error al obtener:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al obtener el cliente',
      codigo:  'CLIENTE_GET_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 3: CREAR UN NUEVO CLIENTE
// =====================================================
// Ruta: POST /api/clientes
// Registra un nuevo cliente en el sistema.
// El nombre y el documento son obligatorios.
// El email, teléfono y dirección son opcionales.
//
// 🔹 En la sustentación puedo decir:
// "Verificamos la unicidad del documento antes de hacer el INSERT
//  para dar un mensaje de error más descriptivo que el error
//  genérico que devolvería MySQL con la restricción UNIQUE."
const crearCliente = async (req, res) => {
  // Extraemos los datos enviados por el formulario del frontend
  const { nombre_completo, documento, email, telefono, direccion } = req.body;

  // ─────────────────────────────────────────────────
  // VALIDACIONES
  // ─────────────────────────────────────────────────

  // El nombre es obligatorio para identificar al cliente
  if (!nombre_completo || nombre_completo.trim() === '') {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El nombre completo es obligatorio'
    });
  }

  // El documento (cédula, NIT, etc.) es obligatorio y único
  if (!documento || documento.trim() === '') {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El documento es obligatorio'
    });
  }

  // Límites de longitud según el tamaño de las columnas en la BD
  if (nombre_completo.trim().length > 100) {
    return res.status(400).json({ exito: false, mensaje: 'El nombre no puede superar los 100 caracteres' });
  }

  if (documento.trim().length > 20) {
    return res.status(400).json({ exito: false, mensaje: 'El documento no puede superar los 20 caracteres' });
  }

  try {
    // Verificar que no exista ya un cliente con ese número de documento.
    // Lo hacemos ANTES de insertar para dar un mensaje claro.
    // (La BD también tiene restricción UNIQUE, pero el error de MySQL es menos amigable)
    const [existeDoc] = await db.query(
      'SELECT id FROM mdc_clientes WHERE documento = ?',
      [documento.trim()]
    );

    if (existeDoc.length > 0) {
      return res.status(400).json({
        exito:   false,
        mensaje: 'Ya existe un cliente con este documento',
        codigo:  'DOCUMENTO_DUPLICADO'
      });
    }

    // Insertamos el nuevo cliente.
    // Los campos opcionales (email, telefono, direccion) se guardan como NULL si no se enviaron.
    // En MySQL, NULL significa "sin información", que es diferente a un texto vacío.
    const [resultado] = await db.query(
      `INSERT INTO mdc_clientes
       (nombre_completo, documento, email, telefono, direccion)
       VALUES (?, ?, ?, ?, ?)`,
      [
        nombre_completo.trim(),
        documento.trim(),
        email     || null,
        telefono  || null,
        direccion || null
      ]
    );

    // Respondemos con los datos básicos del cliente recién creado
    res.status(201).json({
      exito:   true,
      mensaje: 'Cliente creado exitosamente',
      datos: {
        id:              resultado.insertId,   // ID generado automáticamente por MySQL
        nombre_completo: nombre_completo.trim(),
        documento:       documento.trim()
      }
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Clientes] Error al crear:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al crear el cliente',
      codigo:  'CLIENTE_CREATE_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 4: ACTUALIZAR UN CLIENTE
// =====================================================
// Ruta: PUT /api/clientes/:id
// Permite corregir o actualizar los datos de un cliente.
// Si se cambia el documento, verifica que no pertenezca a otro cliente.
const actualizarCliente = async (req, res) => {
  // ID ya validado por el middleware validarParametroId
  const { id } = req.params;
  const { nombre_completo, documento, email, telefono, direccion } = req.body;

  // Validaciones básicas (mismas reglas que al crear)
  if (!nombre_completo || nombre_completo.trim() === '') {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El nombre completo es obligatorio'
    });
  }

  if (!documento || documento.trim() === '') {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El documento es obligatorio'
    });
  }

  try {
    // Verificar que el cliente que queremos actualizar existe
    const [existe] = await db.query(
      'SELECT id FROM mdc_clientes WHERE id = ?',
      [id]
    );

    if (existe.length === 0) {
      return res.status(404).json({
        exito:   false,
        mensaje: 'Cliente no encontrado',
        codigo:  'CLIENTE_NOT_FOUND'
      });
    }

    // Verificar que el documento no esté siendo usado por OTRO cliente.
    // "AND id != ?" excluye al cliente actual de la búsqueda,
    // porque si el documento no cambió, él mismo lo tiene asignado.
    const [conflicto] = await db.query(
      'SELECT id FROM mdc_clientes WHERE documento = ? AND id != ?',
      [documento.trim(), id]
    );

    if (conflicto.length > 0) {
      return res.status(400).json({
        exito:   false,
        mensaje: 'El documento ya pertenece a otro cliente',
        codigo:  'DOCUMENTO_DUPLICADO'
      });
    }

    // Actualizamos todos los campos del cliente
    const [resultado] = await db.query(
      `UPDATE mdc_clientes
       SET nombre_completo = ?, documento = ?, email = ?, telefono = ?, direccion = ?
       WHERE id = ?`,
      [
        nombre_completo.trim(),
        documento.trim(),
        email     || null,
        telefono  || null,
        direccion || null,
        id
      ]
    );

    if (resultado.affectedRows === 0) {
      return res.status(400).json({
        exito:   false,
        mensaje: 'No se pudo actualizar el cliente'
      });
    }

    res.json({
      exito:   true,
      mensaje: 'Cliente actualizado correctamente'
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Clientes] Error al actualizar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al actualizar el cliente',
      codigo:  'CLIENTE_UPDATE_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 5: ELIMINAR UN CLIENTE
// =====================================================
// Ruta: DELETE /api/clientes/:id
// Elimina un cliente del sistema.
//
// ¿Cuándo no se puede eliminar?
// Si el cliente tiene ventas registradas.
// La base de datos tiene una clave foránea (FK) en mdc_ventas
// que impide borrar un cliente referenciado en alguna venta.
// Esto protege el historial de transacciones.
//
// 🔹 En la sustentación puedo decir:
// "No podemos eliminar un cliente que haya comprado,
//  porque la base de datos protege la integridad referencial.
//  Capturamos ese error de MySQL y devolvemos un mensaje
//  comprensible para el usuario."
const eliminarCliente = async (req, res) => {
  // ID ya validado por el middleware
  const { id } = req.params;

  try {
    const [resultado] = await db.query(
      'DELETE FROM mdc_clientes WHERE id = ?',
      [id]
    );

    // Si no se eliminó ninguna fila, el cliente no existía
    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        exito:   false,
        mensaje: 'Cliente no encontrado',
        codigo:  'CLIENTE_NOT_FOUND'
      });
    }

    res.json({
      exito:   true,
      mensaje: 'Cliente eliminado correctamente'
    });

  } catch (error) {
    // MySQL lanza ER_ROW_IS_REFERENCED_2 cuando intentamos borrar
    // un registro que está siendo referenciado por otra tabla (FK).
    // En este caso: el cliente tiene ventas en mdc_ventas.
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        exito:   false,
        mensaje: 'No se puede eliminar: el cliente tiene ventas registradas',
        codigo:  'CLIENTE_CON_VENTAS'
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('[Clientes] Error al eliminar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al eliminar el cliente',
      codigo:  'CLIENTE_DELETE_ERROR'
    });
  }
};

// =====================================================
// EXPORTAMOS TODAS LAS FUNCIONES
// =====================================================
// Node.js requiere exportar explícitamente lo que queremos
// que otros archivos puedan usar (como las rutas).
module.exports = {
  obtenerClientes,
  obtenerClientePorId,
  crearCliente,
  actualizarCliente,
  eliminarCliente
};