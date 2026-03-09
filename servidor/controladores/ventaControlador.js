/**
 * =====================================================
 * CONTROLADOR DE VENTAS
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Maneja las operaciones CRUD de ventas.
 * Este es un MÓDULO CRÍTICO porque gestiona transacciones
 * financieras y modificaciones de inventario atómicas.
 *
 * @requires ../configuracion/db - Pool de conexiones MySQL
 *
 * IMPORTANTE - TRANSACCIONES:
 * Todas las operaciones de venta usan transacciones MySQL
 * para garantizar la integridad de datos (ACID):
 * - Atomicidad: Todo se guarda o nada se guarda
 * - Consistencia: Stock siempre refleja las ventas
 * - Aislamiento: Ventas simultáneas no interfieren
 * - Durabilidad: Datos persistentes tras confirmar
 *
 * @author Equipo de Desarrollo SGI
 * @version 2.0.0
 */

const db = require('../configuracion/db');

// =====================================================
// CONFIGURACIÓN DEL MÓDULO
// =====================================================

/**
 * Métodos de pago aceptados por el sistema.
 * Deben coincidir con el ENUM de la tabla mdc_ventas.
 *
 * @constant {string[]}
 */
const METODOS_PAGO_VALIDOS = ['Efectivo', 'Tarjeta', 'Transferencia'];

/**
 * Método de pago por defecto cuando no se especifica.
 *
 * @constant {string}
 */
const METODO_PAGO_DEFAULT = 'Efectivo';

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

/**
 * Valida que haya stock suficiente para todos los items.
 * Se ejecuta DENTRO de la transacción con bloqueo de filas (FOR UPDATE).
 *
 * IMPORTANTE - PREVENCIÓN DE RACE CONDITIONS:
 * El FOR UPDATE bloquea las filas de libros durante la transacción,
 * evitando que dos ventas simultáneas lean el mismo stock y creen
 * inconsistencias (ej: vender más unidades de las disponibles).
 *
 * @async
 * @param {Object} connection - Conexión MySQL activa (dentro de transacción)
 * @param {Array<{libro_id: number, cantidad: number}>} items - Items a validar
 * @returns {Promise<{valido: boolean, mensaje?: string}>} Resultado de validación
 */
const validarStockDisponible = async (connection, items) => {
  for (const item of items) {
    // FOR UPDATE bloquea la fila hasta que termine la transacción
    // Si otra venta intenta leer el mismo libro, esperará su turno
    const [rows] = await connection.query(
      'SELECT stock_actual, titulo FROM mdc_libros WHERE id = ? FOR UPDATE',
      [item.libro_id]
    );

    // Verificar que el libro existe
    if (rows.length === 0) {
      return {
        valido: false,
        mensaje: `El libro con ID ${item.libro_id} no existe`
      };
    }

    // Verificar stock suficiente
    const libro = rows[0];
    if (libro.stock_actual < item.cantidad) {
      return {
        valido: false,
        mensaje: `Stock insuficiente para "${libro.titulo}". Disponible: ${libro.stock_actual}, Solicitado: ${item.cantidad}`
      };
    }
  }

  return { valido: true };
};

// =====================================================
// CONTROLADORES DE VENTAS
// =====================================================

/**
 * Registra una nueva venta con sus detalles.
 *
 * FLUJO DE LA TRANSACCIÓN:
 * 1. Validar datos de entrada (estructura y tipos)
 * 2. Validar total recalculando en backend (seguridad anti-manipulación)
 * 3. Obtener conexión y comenzar transacción
 * 4. Validar stock disponible con bloqueo de filas (FOR UPDATE)
 * 5. Insertar cabecera en mdc_ventas
 * 6. Insertar cada item en mdc_detalle_ventas
 * 7. Actualizar stock en mdc_libros
 * 8. Confirmar transacción (o rollback si hay error)
 *
 * @async
 * @param {Object} req - Request de Express
 * @param {Object} req.body - Datos de la venta
 * @param {number} req.body.cliente_id - ID del cliente comprador
 * @param {number} req.body.total - Total calculado de la venta
 * @param {string} [req.body.metodo_pago='Efectivo'] - Método de pago
 * @param {Array<Object>} req.body.items - Productos vendidos
 * @param {number} req.body.items[].libro_id - ID del libro
 * @param {number} req.body.items[].cantidad - Unidades vendidas
 * @param {number} req.body.items[].precio_unitario - Precio por unidad
 * @param {Object} req.usuario - Usuario autenticado (del middleware JWT)
 * @param {Object} res - Response de Express
 * @returns {Promise<void>} JSON con ventaId o mensaje de error
 *
 * @example
 * // Request body esperado:
 * {
 *   "cliente_id": 1,
 *   "total": 150000,
 *   "metodo_pago": "Tarjeta",
 *   "items": [
 *     { "libro_id": 1, "cantidad": 2, "precio_unitario": 45000 },
 *     { "libro_id": 3, "cantidad": 1, "precio_unitario": 60000 }
 *   ]
 * }
 */
exports.crearVenta = async (req, res) => {
  const { cliente_id, total, items, metodo_pago } = req.body;

  // ─────────────────────────────────────────────────
  // VALIDACIÓN DE ENTRADA
  // Fallar rápido si los datos son inválidos
  // ─────────────────────────────────────────────────

  if (!cliente_id || !items || items.length === 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Datos incompletos: se requiere cliente_id y al menos un item'
    });
  }

  // Validar que el usuario esté autenticado
  // SEGURIDAD: No usar fallback a ID 1, debe fallar si no hay usuario
  if (!req.usuario?.id) {
    return res.status(401).json({
      exito: false,
      mensaje: 'Se requiere autenticación para registrar ventas'
    });
  }

  // Validar método de pago contra lista permitida
  const metodoPago = metodo_pago || METODO_PAGO_DEFAULT;
  if (!METODOS_PAGO_VALIDOS.includes(metodoPago)) {
    return res.status(400).json({
      exito: false,
      mensaje: `Método de pago inválido. Permitidos: ${METODOS_PAGO_VALIDOS.join(', ')}`
    });
  }

  // Validar estructura de cada item
  for (const item of items) {
    if (!item.libro_id || !item.cantidad || !item.precio_unitario) {
      return res.status(400).json({
        exito: false,
        mensaje: 'Cada item debe tener: libro_id, cantidad y precio_unitario'
      });
    }
    if (item.cantidad <= 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'La cantidad debe ser mayor a cero'
      });
    }
    if (item.precio_unitario < 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El precio unitario no puede ser negativo'
      });
    }
  }

  // ─────────────────────────────────────────────────
  // VALIDACIÓN DE TOTAL - SEGURIDAD CRÍTICA
  // Recalcular el total en backend para prevenir manipulación
  // desde el frontend (ej: cambiar precios en DevTools)
  // ─────────────────────────────────────────────────

  const totalCalculado = items.reduce((sum, item) => {
    return sum + (item.cantidad * item.precio_unitario);
  }, 0);

  // Permitir diferencia de 0.01 por redondeo de decimales
  const diferencia = Math.abs(totalCalculado - total);
  if (diferencia > 0.01) {
    return res.status(400).json({
      exito: false,
      mensaje: `El total no coincide. Calculado: ${totalCalculado}, Recibido: ${total}`,
      codigo: 'TOTAL_INVALIDO'
    });
  }

  // ─────────────────────────────────────────────────
  // INICIO DE TRANSACCIÓN
  // Obtenemos conexión dedicada para la transacción
  // ─────────────────────────────────────────────────

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // ─────────────────────────────────────────────────
    // VALIDACIÓN DE STOCK CON BLOQUEO
    // Verificar DENTRO de la transacción con FOR UPDATE para prevenir
    // race conditions en ventas simultáneas del mismo producto
    // ─────────────────────────────────────────────────

    const validacionStock = await validarStockDisponible(connection, items);
    if (!validacionStock.valido) {
      await connection.rollback();
      return res.status(400).json({
        exito: false,
        mensaje: validacionStock.mensaje
      });
    }

    // ─────────────────────────────────────────────────
    // PASO 1: INSERTAR CABECERA DE VENTA
    // Registra la venta principal en mdc_ventas
    // ─────────────────────────────────────────────────

    const queryVenta = `
      INSERT INTO mdc_ventas (cliente_id, usuario_id, total_venta, metodo_pago, fecha_venta)
      VALUES (?, ?, ?, ?, NOW())
    `;

    const [ventaResult] = await connection.query(queryVenta, [
      cliente_id,
      req.usuario.id,
      total,
      metodoPago
    ]);

    const ventaId = ventaResult.insertId;

    // ─────────────────────────────────────────────────
    // PASO 2: INSERTAR DETALLES Y ACTUALIZAR STOCK
    // Por cada item: registrar detalle y descontar inventario
    // ─────────────────────────────────────────────────

    for (const item of items) {
      // Calcular subtotal en backend por seguridad
      // No confiar en cálculos del frontend (pueden ser manipulados)
      const subtotalCalculado = item.cantidad * item.precio_unitario;

      // Insertar línea de detalle en mdc_detalle_ventas
      await connection.query(
        `INSERT INTO mdc_detalle_ventas
         (venta_id, libro_id, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [ventaId, item.libro_id, item.cantidad, item.precio_unitario, subtotalCalculado]
      );

      // Descontar del inventario en mdc_libros
      // El stock ya fue validado, esta operación es segura
      await connection.query(
        'UPDATE mdc_libros SET stock_actual = stock_actual - ? WHERE id = ?',
        [item.cantidad, item.libro_id]
      );
    }

    // ─────────────────────────────────────────────────
    // CONFIRMAR TRANSACCIÓN
    // Solo se ejecuta si todo lo anterior fue exitoso
    // ─────────────────────────────────────────────────

    await connection.commit();

    // Log solo en desarrollo para debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Venta] Registrada venta #${ventaId} por usuario ${req.usuario.id}`);
    }

    res.status(201).json({
      exito: true,
      mensaje: 'Venta registrada exitosamente',
      ventaId: ventaId
    });

  } catch (error) {
    // ─────────────────────────────────────────────────
    // ROLLBACK EN CASO DE ERROR
    // Deshace TODOS los cambios de la transacción
    // ─────────────────────────────────────────────────

    if (connection) {
      await connection.rollback();
    }

    // Log detallado solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.error('[Venta] Error en transacción:', error);
    }

    // Mensaje genérico al cliente (no exponer detalles internos)
    res.status(500).json({
      exito: false,
      mensaje: 'Error al procesar la venta. Intente nuevamente.',
      codigo: 'VENTA_ERROR'
    });

  } finally {
    // ─────────────────────────────────────────────────
    // LIBERAR CONEXIÓN
    // Siempre devolver la conexión al pool
    // ─────────────────────────────────────────────────

    if (connection) {
      connection.release();
    }
  }
};

/**
 * Obtiene el listado de ventas con paginación opcional.
 * Incluye información del cliente para cada venta.
 *
 * PAGINACIÓN (opcional):
 * - Si NO se envían parámetros: devuelve TODAS las ventas (retrocompatible)
 * - Si se envían pagina/limite: devuelve página específica
 *
 * @async
 * @param {Object} req - Request de Express
 * @param {Object} req.query - Query parameters
 * @param {number} [req.query.pagina=1] - Número de página (opcional)
 * @param {number} [req.query.limite=20] - Registros por página (opcional, máx 100)
 * @param {Object} res - Response de Express
 * @returns {Promise<void>} JSON con array de ventas y metadata de paginación
 *
 * @example
 * // Request sin paginación:
 * GET /api/ventas
 *
 * @example
 * // Request con paginación:
 * GET /api/ventas?pagina=1&limite=50
 */
exports.obtenerVentas = async (req, res) => {
  try {
    // Parámetros de paginación
    const usarPaginacion = req.query.pagina || req.query.limite;
    let pagina = parseInt(req.query.pagina) || 1;
    let limite = parseInt(req.query.limite) || 20;

    if (pagina < 1) pagina = 1;
    if (limite < 1) limite = 20;
    if (limite > 100) limite = 100;

    const offset = (pagina - 1) * limite;

    // Filtros por rango de fechas (Prioridad 2 - Filtro de historial)
    const { fechaInicio, fechaFin, buscar } = req.query;

    // Construir condiciones WHERE dinámicamente
    const condiciones = [];
    const parametros = [];

    if (fechaInicio) {
      condiciones.push('DATE(v.fecha_venta) >= ?');
      parametros.push(fechaInicio);
    }

    if (fechaFin) {
      condiciones.push('DATE(v.fecha_venta) <= ?');
      parametros.push(fechaFin);
    }

    if (buscar) {
      condiciones.push('c.nombre_completo LIKE ?');
      parametros.push(`%${buscar}%`);
    }

    const whereClause = condiciones.length > 0
      ? 'WHERE ' + condiciones.join(' AND ')
      : '';

    // Consulta base con filtros opcionales
    const sqlBase = `
      SELECT
        v.id,
        v.fecha_venta,
        v.total_venta AS total,
        v.metodo_pago,
        v.estado,
        c.nombre_completo AS cliente,
        c.documento
      FROM mdc_ventas v
      JOIN mdc_clientes c ON v.cliente_id = c.id
      ${whereClause}
      ORDER BY v.fecha_venta DESC
    `;

    if (usarPaginacion) {
      // Con paginación
      const sqlPaginada = sqlBase + ` LIMIT ? OFFSET ?`;
      const [rows] = await db.query(sqlPaginada, [...parametros, limite, offset]);
      const [[{ total }]] = await db.query(
        `SELECT COUNT(*) as total FROM mdc_ventas v JOIN mdc_clientes c ON v.cliente_id = c.id ${whereClause}`,
        parametros
      );

      res.json({
        exito: true,
        datos: rows,
        paginacion: {
          paginaActual: pagina,
          registrosPorPagina: limite,
          totalRegistros: total,
          totalPaginas: Math.ceil(total / limite)
        }
      });
    } else {
      // Sin paginación (retrocompatible)
      const [rows] = await db.query(sqlBase, parametros);

      res.json({
        exito: true,
        datos: rows,
        total: rows.length
      });
    }

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Venta] Error al listar ventas:', error);
    }

    res.status(500).json({
      exito: false,
      mensaje: 'Error al obtener el listado de ventas',
      codigo: 'VENTAS_LIST_ERROR'
    });
  }
};

/**
 * Obtiene el detalle completo de una venta específica.
 * Incluye información de la venta, cliente y todos los items.
 *
 * @async
 * @param {Object} req - Request de Express
 * @param {Object} req.params - Parámetros de ruta
 * @param {string} req.params.id - ID de la venta a consultar
 * @param {Object} res - Response de Express
 * @returns {Promise<void>} JSON con venta e items
 *
 * @example
 * // Response exitoso:
 * {
 *   "exito": true,
 *   "venta": {
 *     "id": 1,
 *     "fecha_venta": "2025-12-27",
 *     "total": 150000,
 *     "metodo_pago": "Efectivo",
 *     "cliente": "María González"
 *   },
 *   "items": [
 *     { "titulo": "Clean Code", "cantidad": 2, "precio_unitario": 45000 }
 *   ]
 * }
 */
exports.obtenerDetalleVenta = async (req, res) => {
  let { id } = req.params;

  // Convertir y validar ID
  id = parseInt(id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'ID de venta inválido'
    });
  }

  try {
    // ─────────────────────────────────────────────────
    // CONSULTA 1: Información principal de la venta
    // LEFT JOIN por si el cliente fue eliminado
    // ─────────────────────────────────────────────────

    const [ventaInfo] = await db.query(`
      SELECT
        v.id,
        v.fecha_venta,
        v.total_venta AS total,
        v.metodo_pago,
        c.nombre_completo AS cliente,
        c.documento,
        c.telefono
      FROM mdc_ventas v
      LEFT JOIN mdc_clientes c ON v.cliente_id = c.id
      WHERE v.id = ?
    `, [id]);

    // Verificar que la venta existe
    if (ventaInfo.length === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Venta no encontrada',
        codigo: 'VENTA_NOT_FOUND'
      });
    }

    // ─────────────────────────────────────────────────
    // CONSULTA 2: Items/productos de la venta
    // Incluye información del libro y autor
    // ─────────────────────────────────────────────────

    const [items] = await db.query(`
      SELECT
        d.id,
        d.cantidad,
        d.precio_unitario,
        d.subtotal,
        l.titulo,
        l.isbn,
        a.nombre AS autor
      FROM mdc_detalle_ventas d
      JOIN mdc_libros l ON d.libro_id = l.id
      LEFT JOIN mdc_autores a ON l.autor_id = a.id
      WHERE d.venta_id = ?
    `, [id]);

    // Respuesta estructurada para el frontend
    res.json({
      exito: true,
      venta: ventaInfo[0],
      items: items
    });

  } catch (error) {
    // Log del error para debugging
    console.error('[Venta] Error al obtener detalle de venta #' + id + ':', error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error('[Venta] Stack trace:', error.stack);
    }

    res.status(500).json({
      exito: false,
      mensaje: 'Error al obtener el detalle de la venta',
      codigo: 'VENTA_DETAIL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { error: error.message })
    });
  }
};

/**
 * Anula una venta existente (Prioridad 3 - Anulación de ventas).
 *
 * FLUJO DE LA ANULACIÓN (dentro de transacción ACID):
 * 1. Verificar que la venta exista y no esté ya anulada
 * 2. Obtener los items de la venta
 * 3. Cambiar estado de la venta a 'Anulada'
 * 4. Revertir el stock de cada libro vendido
 * 5. Registrar movimiento en Kardex (tipo ENTRADA con nota de anulación)
 *
 * @async
 * @param {Object} req - Request de Express
 * @param {string} req.params.id - ID de la venta a anular
 * @param {Object} req.usuario - Usuario autenticado (del middleware JWT)
 * @param {Object} res - Response de Express
 */
exports.anularVenta = async (req, res) => {
  let { id } = req.params;

  id = parseInt(id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ exito: false, mensaje: 'ID de venta inválido' });
  }

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // PASO 1: Verificar que la venta existe y no está anulada
    const [ventas] = await connection.query(
      'SELECT id, estado FROM mdc_ventas WHERE id = ?',
      [id]
    );

    if (ventas.length === 0) {
      await connection.rollback();
      return res.status(404).json({ exito: false, mensaje: 'Venta no encontrada' });
    }

    if (ventas[0].estado === 'Anulada') {
      await connection.rollback();
      return res.status(400).json({ exito: false, mensaje: 'La venta ya fue anulada' });
    }

    // PASO 2: Obtener items de la venta para revertir stock
    const [items] = await connection.query(
      'SELECT libro_id, cantidad FROM mdc_detalle_ventas WHERE venta_id = ?',
      [id]
    );

    // PASO 3: Cambiar estado de la venta
    await connection.query(
      "UPDATE mdc_ventas SET estado = 'Anulada' WHERE id = ?",
      [id]
    );

    // PASO 4 y 5: Revertir stock y registrar en Kardex por cada item
    for (const item of items) {
      // Obtener stock actual antes de revertir
      const [libroActual] = await connection.query(
        'SELECT stock_actual FROM mdc_libros WHERE id = ?',
        [item.libro_id]
      );

      const stockAnterior = libroActual[0]?.stock_actual || 0;
      const stockNuevo = stockAnterior + item.cantidad;

      // Revertir stock (sumar lo que se descontó)
      await connection.query(
        'UPDATE mdc_libros SET stock_actual = stock_actual + ? WHERE id = ?',
        [item.cantidad, item.libro_id]
      );

      // Registrar en Kardex la reversión
      await connection.query(
        `INSERT INTO mdc_movimientos
          (libro_id, usuario_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, observaciones)
         VALUES (?, ?, 'ENTRADA', ?, ?, ?, ?)`,
        [
          item.libro_id,
          req.usuario.id,
          item.cantidad,
          stockAnterior,
          stockNuevo,
          `Reversa por anulación de venta #${id}`
        ]
      );
    }

    await connection.commit();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Venta] Anulada venta #${id} por usuario ${req.usuario.id}`);
    }

    res.json({
      exito: true,
      mensaje: `Venta #${id} anulada exitosamente. Stock revertido.`
    });

  } catch (error) {
    if (connection) await connection.rollback();
    if (process.env.NODE_ENV === 'development') {
      console.error('[Venta] Error al anular venta:', error);
    }
    res.status(500).json({
      exito: false,
      mensaje: 'Error al anular la venta',
      codigo: 'ANULACION_ERROR'
    });
  } finally {
    if (connection) connection.release();
  }
};
