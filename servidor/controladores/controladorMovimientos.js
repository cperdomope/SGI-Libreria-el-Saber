/**
 * =====================================================
 * CONTROLADOR DE MOVIMIENTOS (KARDEX)
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Gestiona el registro de entradas y salidas de inventario.
 * Cada movimiento actualiza automáticamente el stock del libro
 * y mantiene un historial completo para auditoría.
 *
 * @requires ../configuracion/db - Pool de conexiones MySQL
 *
 * TIPOS DE MOVIMIENTO:
 * - ENTRADA: Compra a proveedor, devolución de cliente, ajuste positivo
 * - SALIDA: Venta (automático desde módulo ventas), pérdida, ajuste negativo
 *
 * IMPORTANTE - TRANSACCIONES:
 * Este módulo usa transacciones porque realiza dos operaciones
 * que deben ser atómicas: insertar movimiento + actualizar stock.
 * Si una falla, ambas se revierten.
 *
 * @author Equipo de Desarrollo SGI
 * @version 2.0.0
 */

const db = require('../configuracion/db');

// =====================================================
// CONSTANTES
// =====================================================

/**
 * Tipos de movimiento válidos.
 * Deben coincidir con el ENUM de la tabla mdc_movimientos.
 *
 * @constant {Object}
 */
const TIPOS_MOVIMIENTO = {
  ENTRADA: 'ENTRADA',
  SALIDA: 'SALIDA'
};

// =====================================================
// CONTROLADOR
// =====================================================

/**
 * Registra un movimiento de inventario (entrada o salida).
 * Actualiza automáticamente el stock del libro afectado.
 *
 * FLUJO:
 * 1. Validar datos de entrada
 * 2. Si es SALIDA, verificar stock suficiente
 * 3. Iniciar transacción
 * 4. Insertar registro en mdc_movimientos (historial)
 * 5. Actualizar stock en mdc_libros
 * 6. Confirmar transacción
 *
 * @async
 * @param {Object} req - Request de Express
 * @param {Object} req.body - Datos del movimiento
 * @param {number} req.body.libro_id - ID del libro afectado
 * @param {string} req.body.tipo_movimiento - 'ENTRADA' o 'SALIDA'
 * @param {number} req.body.cantidad - Cantidad de unidades
 * @param {string} [req.body.observaciones] - Notas adicionales
 * @param {Object} req.usuario - Usuario autenticado (del middleware JWT)
 * @param {Object} res - Response de Express
 * @returns {Promise<void>} JSON con mensaje de éxito o error
 *
 * @example
 * // Request body para entrada de mercancía:
 * {
 *   "libro_id": 1,
 *   "tipo_movimiento": "ENTRADA",
 *   "cantidad": 50,
 *   "observaciones": "Compra a proveedor Editorial Nacional"
 * }
 */
exports.registrarMovimiento = async (req, res) => {
  let { libro_id, tipo_movimiento, cantidad, observaciones, proveedor_id, costo_compra } = req.body;

  // ─────────────────────────────────────────────────
  // VALIDACIÓN DE ENTRADA
  // ─────────────────────────────────────────────────

  // Validar campos requeridos
  if (!libro_id || !tipo_movimiento || !cantidad) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Datos incompletos: se requiere libro_id, tipo_movimiento y cantidad'
    });
  }

  // Convertir y validar libro_id
  libro_id = parseInt(libro_id, 10);
  if (isNaN(libro_id) || libro_id <= 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El libro_id debe ser un número válido mayor a cero'
    });
  }

  // Convertir y validar cantidad
  cantidad = parseInt(cantidad, 10);
  if (isNaN(cantidad) || cantidad <= 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'La cantidad debe ser un número entero mayor a cero'
    });
  }

  // Validar tipo de movimiento
  if (!Object.values(TIPOS_MOVIMIENTO).includes(tipo_movimiento)) {
    return res.status(400).json({
      exito: false,
      mensaje: `Tipo de movimiento inválido. Use: ${Object.values(TIPOS_MOVIMIENTO).join(' o ')}`
    });
  }

  // ─────────────────────────────────────────────────
  // VALIDACIÓN DE COMPRA A PROVEEDOR (solo ENTRADA)
  // proveedor_id y costo_compra son OBLIGATORIOS para ENTRADA.
  // Nota: costo_compra = 0 es válido (libros donados), por eso
  // no se usa !costo_compra sino verificación explícita de ausencia.
  // ─────────────────────────────────────────────────

  let proveedorIdFinal = null;
  let costoCompraFinal = null;

  if (tipo_movimiento === TIPOS_MOVIMIENTO.ENTRADA) {
    // Validar presencia de proveedor_id
    if (!proveedor_id || proveedor_id === '') {
      return res.status(400).json({
        exito: false,
        mensaje: 'El proveedor es obligatorio para registrar una entrada de inventario'
      });
    }

    // Validar presencia de costo_compra (0 es válido: libros donados)
    if (costo_compra === undefined || costo_compra === null || costo_compra === '') {
      return res.status(400).json({
        exito: false,
        mensaje: 'El costo de compra es obligatorio para registrar una entrada de inventario'
      });
    }

    // Validar formato de proveedor_id
    proveedorIdFinal = parseInt(proveedor_id, 10);
    if (isNaN(proveedorIdFinal) || proveedorIdFinal <= 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El proveedor_id debe ser un número entero positivo'
      });
    }

    // Validar formato de costo_compra
    costoCompraFinal = parseFloat(costo_compra);
    if (isNaN(costoCompraFinal)) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El costo de compra debe ser un número válido'
      });
    }
    if (costoCompraFinal < 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'El costo de compra no puede ser negativo',
        codigo: 'COSTO_NEGATIVO'
      });
    }
  }

  // Validar autenticación
  // SEGURIDAD: No usar fallback a ID 1, debe fallar si no hay usuario
  if (!req.usuario?.id) {
    return res.status(401).json({
      exito: false,
      mensaje: 'Se requiere autenticación para registrar movimientos'
    });
  }

  // ─────────────────────────────────────────────────
  // INICIO DE TRANSACCIÓN
  // ─────────────────────────────────────────────────

  let connection;

  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // ─────────────────────────────────────────────────
    // VERIFICAR EXISTENCIA DEL LIBRO
    // ─────────────────────────────────────────────────

    const [libroRows] = await connection.query(
      'SELECT id, stock_actual, titulo FROM mdc_libros WHERE id = ?',
      [libro_id]
    );

    if (libroRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        exito: false,
        mensaje: 'El libro especificado no existe',
        codigo: 'LIBRO_NOT_FOUND'
      });
    }

    const libro = libroRows[0];

    // ─────────────────────────────────────────────────
    // VERIFICAR EXISTENCIA DEL PROVEEDOR (solo ENTRADA)
    // Previene manipulación de peticiones con IDs falsos.
    // Se hace dentro de la transacción para garantizar
    // consistencia incluso si el proveedor se elimina
    // justo entre la validación y el INSERT.
    // ─────────────────────────────────────────────────

    if (tipo_movimiento === TIPOS_MOVIMIENTO.ENTRADA) {
      const [proveedorRows] = await connection.query(
        'SELECT id FROM mdc_proveedores WHERE id = ?',
        [proveedorIdFinal]
      );

      if (proveedorRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          exito: false,
          mensaje: 'El proveedor especificado no existe en el sistema',
          codigo: 'PROVEEDOR_NOT_FOUND'
        });
      }
    }

    // ─────────────────────────────────────────────────
    // VALIDAR STOCK PARA SALIDAS
    // Evitar stock negativo
    // ─────────────────────────────────────────────────

    if (tipo_movimiento === TIPOS_MOVIMIENTO.SALIDA) {
      if (libro.stock_actual < cantidad) {
        await connection.rollback();
        return res.status(400).json({
          exito: false,
          mensaje: `Stock insuficiente para "${libro.titulo}". Disponible: ${libro.stock_actual}, Solicitado: ${cantidad}`,
          codigo: 'STOCK_INSUFICIENTE'
        });
      }
    }

    // ─────────────────────────────────────────────────
    // PASO 1: REGISTRAR MOVIMIENTO EN HISTORIAL
    // ─────────────────────────────────────────────────

    // Capturar stock antes del movimiento para el historial
    const stockAnterior = libro.stock_actual;
    const stockNuevo = tipo_movimiento === TIPOS_MOVIMIENTO.ENTRADA
      ? stockAnterior + cantidad
      : stockAnterior - cantidad;

    // Insertar movimiento incluyendo proveedor y costo si es una ENTRADA
    await connection.query(
      `INSERT INTO mdc_movimientos
       (libro_id, tipo_movimiento, cantidad, usuario_id, stock_anterior, stock_nuevo,
        observaciones, proveedor_id, costo_compra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        libro_id, tipo_movimiento, cantidad, req.usuario.id,
        stockAnterior, stockNuevo,
        observaciones || null,
        proveedorIdFinal,
        costoCompraFinal
      ]
    );

    // ─────────────────────────────────────────────────
    // PASO 2: ACTUALIZAR STOCK DEL LIBRO
    // ENTRADA suma (+), SALIDA resta (-)
    // ─────────────────────────────────────────────────

    const operador = tipo_movimiento === TIPOS_MOVIMIENTO.ENTRADA ? '+' : '-';

    await connection.query(
      `UPDATE mdc_libros SET stock_actual = stock_actual ${operador} ? WHERE id = ?`,
      [cantidad, libro_id]
    );

    // ─────────────────────────────────────────────────
    // CONFIRMAR TRANSACCIÓN
    // ─────────────────────────────────────────────────

    await connection.commit();

    // Log solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Movimiento] ${tipo_movimiento} de ${cantidad} unidades para libro #${libro_id}`);
    }

    // Calcular nuevo stock para informar al usuario
    const nuevoStock = tipo_movimiento === TIPOS_MOVIMIENTO.ENTRADA
      ? libro.stock_actual + cantidad
      : libro.stock_actual - cantidad;

    res.status(201).json({
      exito: true,
      mensaje: 'Movimiento registrado exitosamente',
      datos: {
        tipo: tipo_movimiento,
        cantidad: cantidad,
        libro: libro.titulo,
        stock_anterior: libro.stock_actual,
        stock_actual: nuevoStock,
        // AUDITORÍA: queda registrado quién ejecutó la operación
        auditado_por: req.usuario.nombre_completo || `Usuario #${req.usuario.id}`
      }
    });

  } catch (error) {
    // Rollback si hay error
    if (connection) {
      await connection.rollback();
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('[Movimiento] Error:', error);
    }

    res.status(500).json({
      exito: false,
      mensaje: 'Error al procesar el movimiento',
      codigo: 'MOVIMIENTO_ERROR'
    });

  } finally {
    // Siempre liberar la conexión
    if (connection) {
      connection.release();
    }
  }
};

/**
 * Obtiene el historial de movimientos.
 * Puede filtrarse por libro_id vía query params.
 *
 * @async
 * @param {Object} req - Request de Express
 * @param {Object} req.query - Query parameters
 * @param {string} [req.query.libro_id] - Filtrar por libro específico
 * @param {Object} res - Response de Express
 * @returns {Promise<void>} JSON con array de movimientos
 */
exports.obtenerMovimientos = async (req, res) => {
  const { libro_id } = req.query;

  try {
    let sql = `
      SELECT
        m.id,
        m.tipo_movimiento,
        m.cantidad,
        m.stock_anterior,
        m.stock_nuevo,
        m.fecha_movimiento,
        m.observaciones,
        m.costo_compra,
        l.titulo AS libro,
        l.isbn,
        u.nombre_completo AS usuario,
        p.nombre_empresa AS proveedor,
        p.id AS proveedor_id
      FROM mdc_movimientos m
      JOIN mdc_libros l ON m.libro_id = l.id
      JOIN mdc_usuarios u ON m.usuario_id = u.id
      LEFT JOIN mdc_proveedores p ON m.proveedor_id = p.id
    `;

    const params = [];

    // Filtro opcional por libro
    if (libro_id) {
      sql += ' WHERE m.libro_id = ?';
      params.push(libro_id);
    }

    sql += ' ORDER BY m.fecha_movimiento DESC';

    const [rows] = await db.query(sql, params);

    res.json({
      exito: true,
      datos: rows,
      total: rows.length
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Movimiento] Error al listar:', error);
    }

    res.status(500).json({
      exito: false,
      mensaje: 'Error al obtener el historial de movimientos',
      codigo: 'MOVIMIENTOS_LIST_ERROR'
    });
  }
};
