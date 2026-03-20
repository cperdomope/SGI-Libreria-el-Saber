// =====================================================
// CONTROLADOR DE MOVIMIENTOS (KARDEX)
// =====================================================
// Este archivo gestiona las entradas y salidas de inventario.
// En contabilidad y logística, esto se llama "Kardex":
// un registro histórico de todos los movimientos de mercancía.
//
// ¿Para qué sirve el Kardex?
// Para saber EXACTAMENTE qué pasó con cada libro:
//   - ¿Cuándo llegó mercancía? ¿De qué proveedor? ¿A qué costo?
//   - ¿Cuándo se hizo un ajuste? ¿Quién lo autorizó?
//   - ¿Por qué el stock cambió si no fue por una venta?
//
// Tipos de movimiento:
//   - ENTRADA: llega mercancía al inventario
//     (compra a proveedor, devolución de cliente, ajuste positivo)
//   - SALIDA: sale mercancía del inventario
//     (venta directa, pérdida, daño, ajuste negativo)
//
// NOTA: Las salidas por VENTAS las registra automáticamente
// el ventaControlador.js. Este módulo es para movimientos manuales.
//
// 🔹 En la sustentación puedo decir:
// "El módulo de movimientos implementa el Kardex del sistema.
//  Cada entrada o salida se registra con: quién la hizo, cuándo,
//  el stock anterior y el nuevo, y en el caso de entradas,
//  el proveedor y el costo de compra. Todo esto dentro de una
//  transacción para garantizar que el historial y el stock
//  siempre estén sincronizados."
// =====================================================

// Conexión al pool de base de datos MySQL
const db = require('../config/db');

// ─────────────────────────────────────────────────────────
// TIPOS DE MOVIMIENTO VÁLIDOS
// ─────────────────────────────────────────────────────────
// Deben coincidir con el ENUM definido en la tabla mdc_movimientos.
// Al usarlos desde esta constante evitamos errores de tipeo.
const TIPOS_MOVIMIENTO = {
  ENTRADA: 'ENTRADA',
  SALIDA:  'SALIDA'
};

// =====================================================
// CONTROLADOR 1: REGISTRAR UN MOVIMIENTO DE INVENTARIO
// =====================================================
// Ruta: POST /api/movimientos
// Registra una entrada o salida manual del inventario.
// Usa transacción porque afecta dos tablas a la vez:
//   1. mdc_movimientos → historial del kardex
//   2. mdc_libros → stock_actual actualizado
//
// 🔹 En la sustentación puedo decir:
// "Al registrar un movimiento, el sistema usa una transacción
//  para garantizar que si falla el UPDATE del stock,
//  también se deshace el INSERT del historial,
//  evitando tener un kardex que no coincide con el inventario real."
exports.registrarMovimiento = async (req, res) => {
  // Extraemos todos los campos del formulario de movimientos
  let { libro_id, tipo_movimiento, cantidad, observaciones, proveedor_id, costo_compra } = req.body;

  // ─────────────────────────────────────────────────
  // VALIDACIONES INICIALES
  // Rechazamos datos inválidos antes de abrir la transacción
  // ─────────────────────────────────────────────────

  // Los tres campos básicos son siempre obligatorios
  if (!libro_id || !tipo_movimiento || !cantidad) {
    return res.status(400).json({
      exito:   false,
      mensaje: 'Datos incompletos: se requiere libro_id, tipo_movimiento y cantidad'
    });
  }

  // Convertimos el ID del libro a número entero y verificamos que sea válido
  libro_id = parseInt(libro_id, 10);
  if (isNaN(libro_id) || libro_id <= 0) {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El libro_id debe ser un número válido mayor a cero'
    });
  }

  // La cantidad debe ser un número entero positivo (no 0, no negativo, no decimal)
  cantidad = parseInt(cantidad, 10);
  if (isNaN(cantidad) || cantidad <= 0) {
    return res.status(400).json({
      exito:   false,
      mensaje: 'La cantidad debe ser un número entero mayor a cero'
    });
  }

  // Verificamos que el tipo de movimiento sea uno de los válidos
  // Object.values(TIPOS_MOVIMIENTO) = ['ENTRADA', 'SALIDA']
  if (!Object.values(TIPOS_MOVIMIENTO).includes(tipo_movimiento)) {
    return res.status(400).json({
      exito:   false,
      mensaje: `Tipo de movimiento inválido. Use: ${Object.values(TIPOS_MOVIMIENTO).join(' o ')}`
    });
  }

  // ─────────────────────────────────────────────────
  // VALIDACIONES ESPECÍFICAS PARA ENTRADAS
  // ─────────────────────────────────────────────────
  // Una ENTRADA es una compra a proveedor, así que requerimos:
  //   - proveedor_id: de quién compramos
  //   - costo_compra: cuánto costó (puede ser 0 si fue donación)
  //
  // NOTA TÉCNICA: usamos verificación explícita de null/undefined/'',
  // porque costo_compra = 0 es un valor válido (libros donados)
  // y !0 daría true, rechazando erróneamente las donaciones.
  let proveedorIdFinal = null;
  let costoCompraFinal = null;

  if (tipo_movimiento === TIPOS_MOVIMIENTO.ENTRADA) {
    if (!proveedor_id || proveedor_id === '') {
      return res.status(400).json({
        exito:   false,
        mensaje: 'El proveedor es obligatorio para registrar una entrada de inventario'
      });
    }

    // Verificamos explícitamente ausencia del costo (0 es válido)
    if (costo_compra === undefined || costo_compra === null || costo_compra === '') {
      return res.status(400).json({
        exito:   false,
        mensaje: 'El costo de compra es obligatorio para registrar una entrada de inventario'
      });
    }

    // Convertimos a número entero
    proveedorIdFinal = parseInt(proveedor_id, 10);
    if (isNaN(proveedorIdFinal) || proveedorIdFinal <= 0) {
      return res.status(400).json({
        exito:   false,
        mensaje: 'El proveedor_id debe ser un número entero positivo'
      });
    }

    // Convertimos el costo a número decimal
    costoCompraFinal = parseFloat(costo_compra);
    if (isNaN(costoCompraFinal)) {
      return res.status(400).json({
        exito:   false,
        mensaje: 'El costo de compra debe ser un número válido'
      });
    }
    if (costoCompraFinal < 0) {
      return res.status(400).json({
        exito:   false,
        mensaje: 'El costo de compra no puede ser negativo',
        codigo:  'COSTO_NEGATIVO'
      });
    }
  }

  // Verificamos que hay un usuario autenticado registrando el movimiento.
  // req.usuario viene del middleware verificarToken que decodifica el JWT.
  if (!req.usuario?.id) {
    return res.status(401).json({
      exito:   false,
      mensaje: 'Se requiere autenticación para registrar movimientos'
    });
  }

  // ─────────────────────────────────────────────────
  // INICIO DE LA TRANSACCIÓN
  // ─────────────────────────────────────────────────
  let connection;

  try {
    // Obtenemos una conexión exclusiva para manejar la transacción
    connection = await db.getConnection();
    await connection.beginTransaction();

    // ─────────────────────────────────────────────────
    // VERIFICAR QUE EL LIBRO EXISTE
    // ─────────────────────────────────────────────────
    // Obtenemos también el stock actual para calcular el nuevo stock
    // y para validar que no quede negativo en una SALIDA.
    const [libroRows] = await connection.query(
      'SELECT id, stock_actual, titulo FROM mdc_libros WHERE id = ?',
      [libro_id]
    );

    if (libroRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        exito:   false,
        mensaje: 'El libro especificado no existe',
        codigo:  'LIBRO_NOT_FOUND'
      });
    }

    const libro = libroRows[0];

    // ─────────────────────────────────────────────────
    // VERIFICAR QUE EL PROVEEDOR EXISTE (solo para ENTRADA)
    // ─────────────────────────────────────────────────
    // Lo hacemos dentro de la transacción para máxima consistencia.
    // Si el proveedor no existe, cancelamos todo.
    if (tipo_movimiento === TIPOS_MOVIMIENTO.ENTRADA) {
      const [proveedorRows] = await connection.query(
        'SELECT id FROM mdc_proveedores WHERE id = ?',
        [proveedorIdFinal]
      );

      if (proveedorRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          exito:   false,
          mensaje: 'El proveedor especificado no existe en el sistema',
          codigo:  'PROVEEDOR_NOT_FOUND'
        });
      }
    }

    // ─────────────────────────────────────────────────
    // VERIFICAR STOCK SUFICIENTE PARA SALIDAS
    // ─────────────────────────────────────────────────
    // No permitimos que el stock quede negativo.
    // Si se intenta sacar más de lo que hay, cancelamos.
    if (tipo_movimiento === TIPOS_MOVIMIENTO.SALIDA) {
      if (libro.stock_actual < cantidad) {
        await connection.rollback();
        return res.status(400).json({
          exito:   false,
          mensaje: `Stock insuficiente para "${libro.titulo}". Disponible: ${libro.stock_actual}, Solicitado: ${cantidad}`,
          codigo:  'STOCK_INSUFICIENTE'
        });
      }
    }

    // ─────────────────────────────────────────────────
    // PASO 1: CALCULAR EL NUEVO STOCK
    // ─────────────────────────────────────────────────
    const stockAnterior = libro.stock_actual;

    // ENTRADA suma unidades, SALIDA las resta
    const stockNuevo = tipo_movimiento === TIPOS_MOVIMIENTO.ENTRADA
      ? stockAnterior + cantidad
      : stockAnterior - cantidad;

    // ─────────────────────────────────────────────────
    // PASO 2: INSERTAR EL MOVIMIENTO EN EL HISTORIAL (KARDEX)
    // ─────────────────────────────────────────────────
    // Guardamos: qué libro, qué tipo, cuánto, quién lo hizo,
    // stock antes y después, observaciones, proveedor y costo (si aplica).
    await connection.query(
      `INSERT INTO mdc_movimientos
       (libro_id, tipo_movimiento, cantidad, usuario_id, stock_anterior, stock_nuevo,
        observaciones, proveedor_id, costo_compra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        libro_id,
        tipo_movimiento,
        cantidad,
        req.usuario.id,       // Quién registró el movimiento (trazabilidad)
        stockAnterior,
        stockNuevo,
        observaciones  || null,
        proveedorIdFinal,     // null para SALIDAs
        costoCompraFinal      // null para SALIDAs
      ]
    );

    // ─────────────────────────────────────────────────
    // PASO 3: ACTUALIZAR EL STOCK DEL LIBRO
    // ─────────────────────────────────────────────────
    // Usamos el operador dinámico (+/-) para sumar o restar
    // La operación aritmética se hace en MySQL para evitar race conditions
    const operador = tipo_movimiento === TIPOS_MOVIMIENTO.ENTRADA ? '+' : '-';

    await connection.query(
      `UPDATE mdc_libros SET stock_actual = stock_actual ${operador} ? WHERE id = ?`,
      [cantidad, libro_id]
    );

    // Confirmamos la transacción: ambas operaciones se guardan permanentemente
    await connection.commit();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Movimiento] ${tipo_movimiento} de ${cantidad} unidades para libro #${libro_id}`);
    }

    // Calculamos el stock final para informar al usuario en la respuesta
    const nuevoStock = tipo_movimiento === TIPOS_MOVIMIENTO.ENTRADA
      ? libro.stock_actual + cantidad
      : libro.stock_actual - cantidad;

    // Respondemos con un resumen del movimiento realizado
    res.status(201).json({
      exito:   true,
      mensaje: 'Movimiento registrado exitosamente',
      datos: {
        tipo:            tipo_movimiento,
        cantidad:        cantidad,
        libro:           libro.titulo,
        stock_anterior:  libro.stock_actual,
        stock_actual:    nuevoStock,
        // En la respuesta informamos quién ejecutó el movimiento (auditoría)
        auditado_por:    req.usuario.nombre_completo || `Usuario #${req.usuario.id}`
      }
    });

  } catch (error) {
    // Si algo falló, deshacemos todo para mantener la consistencia
    if (connection) await connection.rollback();

    if (process.env.NODE_ENV === 'development') {
      console.error('[Movimiento] Error:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al procesar el movimiento',
      codigo:  'MOVIMIENTO_ERROR'
    });

  } finally {
    // Liberamos la conexión pase lo que pase (éxito o error)
    if (connection) connection.release();
  }
};

// =====================================================
// CONTROLADOR 2: OBTENER HISTORIAL DE MOVIMIENTOS
// =====================================================
// Ruta: GET /api/movimientos
// Devuelve todos los movimientos del Kardex.
// Opcionalmente filtra por libro si se envía libro_id en la URL.
//
// Ejemplo sin filtro:   GET /api/movimientos
// Ejemplo con filtro:   GET /api/movimientos?libro_id=5
//
// 🔹 En la sustentación puedo decir:
// "El historial de movimientos muestra el Kardex completo:
//  quién hizo cada movimiento, cuándo, el stock antes y después,
//  y el proveedor en el caso de entradas. Se puede filtrar
//  por libro para ver el historial de un título específico."
exports.obtenerMovimientos = async (req, res) => {
  // Tomamos el filtro opcional de la URL (query string)
  const { libro_id } = req.query;

  try {
    // Consulta base que une movimientos con libros, usuarios y proveedores
    // Usamos LEFT JOIN con proveedores porque las SALIDAs no tienen proveedor
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
        l.titulo      AS libro,
        l.isbn,
        u.nombre_completo AS usuario,
        p.nombre_empresa  AS proveedor,
        p.id              AS proveedor_id
      FROM mdc_movimientos m
      JOIN  mdc_libros      l ON m.libro_id    = l.id
      JOIN  mdc_usuarios    u ON m.usuario_id  = u.id
      LEFT JOIN mdc_proveedores p ON m.proveedor_id = p.id
    `;

    const params = [];

    // Si se envió un libro_id en la URL, filtramos solo sus movimientos
    if (libro_id) {
      sql += ' WHERE m.libro_id = ?';
      params.push(libro_id);
    }

    // Ordenamos del más reciente al más antiguo
    sql += ' ORDER BY m.fecha_movimiento DESC';

    const [rows] = await db.query(sql, params);

    res.json({
      exito: true,
      datos:  rows,
      total:  rows.length
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Movimiento] Error al listar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al obtener el historial de movimientos',
      codigo:  'MOVIMIENTOS_LIST_ERROR'
    });
  }
};