// =====================================================
// CONTROLADOR DE VENTAS
// =====================================================
// Este archivo es el corazón del negocio del sistema.
// Maneja todo lo relacionado con registrar ventas,
// consultar el historial y anular ventas si es necesario.
//
// Es el módulo más crítico del sistema porque:
//   1. Mueve dinero (registra ingresos)
//   2. Modifica el inventario (descuenta stock)
//   3. Usa TRANSACCIONES para que todo sea consistente
//
// ¿Qué es una transacción?
// Es como un contrato: o se ejecutan TODAS las operaciones
// o no se ejecuta NINGUNA. Si algo falla a mitad del proceso,
// el sistema "deshace" todo y queda como si nada hubiera pasado.
// Esto se llama principio ACID (Atomicidad, Consistencia, Aislamiento, Durabilidad).
//
// 🔹 En la sustentación puedo decir:
// "El módulo de ventas usa transacciones MySQL para garantizar
//  que si ocurre un error a mitad de una venta, el inventario
//  no quede desactualizado ni la venta a medias registrada."
// =====================================================

// Conexión al pool de base de datos MySQL
const db = require('../config/db');

// ─────────────────────────────────────────────────────────
// MÉTODOS DE PAGO ACEPTADOS
// ─────────────────────────────────────────────────────────
// Esta lista debe coincidir con el ENUM definido en la base de datos.
// Si se intenta registrar un método de pago que no esté aquí, el sistema lo rechaza.
const METODOS_PAGO_VALIDOS = ['Efectivo', 'Tarjeta', 'Transferencia', 'Mixto'];

// Si el frontend no envía método de pago, usamos "Efectivo" por defecto
const METODO_PAGO_DEFAULT = 'Efectivo';

// =====================================================
// FUNCIÓN AUXILIAR: VALIDAR STOCK DISPONIBLE
// =====================================================
// Antes de registrar una venta, verificamos que haya suficientes
// unidades de cada libro en el inventario.
//
// ¿Por qué hacemos esto DENTRO de la transacción?
// Porque si dos vendedores intentan vender el último libro
// al mismo tiempo, sin este bloqueo ambos podrían ver stock = 1
// y ambos venderlo, quedando el stock en -1 (imposible).
// El "FOR UPDATE" bloquea la fila del libro para que el segundo
// vendedor tenga que ESPERAR a que el primero termine.
//
// 🔹 En la sustentación puedo decir:
// "Usamos FOR UPDATE para evitar condiciones de carrera.
//  Si dos ventas ocurren al mismo tiempo para el mismo libro,
//  MySQL las procesa en orden, garantizando consistencia del stock."
const validarStockDisponible = async (connection, items) => {
  // Revisamos cada libro que se quiere vender
  for (const item of items) {
    // SELECT con FOR UPDATE: bloquea la fila hasta que termine la transacción.
    // Ninguna otra transacción puede leer ni modificar esta fila en este momento.
    const [rows] = await connection.query(
      'SELECT stock_actual, titulo FROM mdc_libros WHERE id = ? FOR UPDATE',
      [item.libro_id]
    );

    // Si el libro no existe en la base de datos, detenemos todo
    if (rows.length === 0) {
      return {
        valido: false,
        mensaje: `El libro con ID ${item.libro_id} no existe`
      };
    }

    const libro = rows[0];

    // Comparamos el stock disponible con la cantidad que se quiere vender
    if (libro.stock_actual < item.cantidad) {
      return {
        valido: false,
        mensaje: `Stock insuficiente para "${libro.titulo}". Disponible: ${libro.stock_actual}, Solicitado: ${item.cantidad}`
      };
    }
  }

  // Si llegamos aquí, todos los libros tienen stock suficiente
  return { valido: true };
};

// =====================================================
// CONTROLADOR 1: CREAR UNA NUEVA VENTA
// =====================================================
// Ruta: POST /api/ventas
// Este proceso tiene 8 pasos que se ejecutan como una sola unidad atómica.
//
// 🔹 En la sustentación puedo decir:
// "Al registrar una venta, el sistema valida los datos de entrada,
//  verifica el stock disponible, calcula el total en el servidor
//  (para evitar manipulaciones desde el frontend), registra la venta
//  y sus detalles, y actualiza el inventario, todo dentro de una
//  sola transacción para garantizar consistencia."
exports.crearVenta = async (req, res, next) => {
  // Extraemos todos los datos enviados por el formulario de venta del frontend
  const { cliente_id, subtotal: subtotalEnviado, descuento: descuentoEnviado, total, items, metodo_pago } = req.body;

  // ─────────────────────────────────────────────────
  // VALIDACIONES INICIALES (antes de tocar la BD)
  // Es más eficiente rechazar datos incorrectos aquí
  // que iniciar una transacción y luego cancelarla.
  // ─────────────────────────────────────────────────

  // Verificar que se enviaron el cliente y al menos un producto
  if (!cliente_id || !items || items.length === 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Datos incompletos: se requiere cliente_id y al menos un item'
    });
  }

  // Verificar que hay un usuario autenticado registrando la venta
  // req.usuario viene del middleware verificarToken que decodifica el JWT
  if (!req.usuario?.id) {
    return res.status(401).json({
      exito: false,
      mensaje: 'Se requiere autenticación para registrar ventas'
    });
  }

  // Si no se envió método de pago, usamos el valor por defecto
  const metodoPago = metodo_pago || METODO_PAGO_DEFAULT;

  // Verificar que el método de pago es uno de los válidos
  if (!METODOS_PAGO_VALIDOS.includes(metodoPago)) {
    return res.status(400).json({
      exito: false,
      mensaje: `Método de pago inválido. Permitidos: ${METODOS_PAGO_VALIDOS.join(', ')}`
    });
  }

  // Verificar que cada producto tiene los datos mínimos requeridos
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
  // VALIDACIÓN DEL DESCUENTO
  // ─────────────────────────────────────────────────
  // El descuento es opcional (por defecto 0).
  // Si se envía, debe ser un número no negativo y no puede
  // ser mayor que el subtotal (no puede quedar total negativo).
  const descuento = Number(descuentoEnviado) || 0;

  if (descuento < 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El descuento no puede ser negativo'
    });
  }

  // ─────────────────────────────────────────────────
  // VALIDACIÓN DEL TOTAL - SEGURIDAD IMPORTANTE
  // ─────────────────────────────────────────────────
  // El frontend envía el total calculado, pero NO confiamos en él.
  // Un usuario malicioso podría modificar los datos en el navegador
  // para cambiar el precio (ej: pagar $1 por un libro de $50.000).
  // Por eso, recalculamos el total en el servidor y comparamos.
  //
  // 🔹 En la sustentación puedo decir:
  // "Recalculamos el total en el backend como medida de seguridad.
  //  Si el total enviado por el frontend no coincide con el calculado
  //  en el servidor, la venta es rechazada. Esto incluye la validación
  //  del descuento aplicado."
  const subtotalCalculado = items.reduce((suma, item) => {
    return suma + (item.cantidad * item.precio_unitario);
  }, 0); // Empezamos sumando desde 0

  // El descuento no puede ser mayor que el subtotal
  if (descuento > subtotalCalculado) {
    return res.status(400).json({
      exito: false,
      mensaje: 'El descuento no puede ser mayor al subtotal de la venta'
    });
  }

  // Total esperado = subtotal - descuento
  const totalCalculado = subtotalCalculado - descuento;

  // Permitimos una diferencia máxima de $1 por redondeo de decimales
  const diferencia = Math.abs(totalCalculado - total);
  if (diferencia > 1) {
    return res.status(400).json({
      exito: false,
      mensaje: `El total no coincide. Calculado: ${totalCalculado}, Recibido: ${total}`,
      codigo: 'TOTAL_INVALIDO'
    });
  }

  // ─────────────────────────────────────────────────
  // INICIO DE LA TRANSACCIÓN
  // ─────────────────────────────────────────────────
  // Necesitamos una conexión dedicada (no del pool compartido)
  // para poder manejar la transacción nosotros mismos.
  let connection;

  try {
    // Obtenemos una conexión exclusiva del pool para esta transacción
    connection = await db.getConnection();

    // Iniciamos la transacción: a partir de aquí, nada se guarda
    // permanentemente hasta que hagamos COMMIT o todo se deshace con ROLLBACK
    await connection.beginTransaction();

    // ─────────────────────────────────────────────────
    // PASO 1: Verificar stock disponible (con bloqueo de filas)
    // Si no hay suficiente stock, cancelamos la transacción
    // ─────────────────────────────────────────────────
    const validacionStock = await validarStockDisponible(connection, items);
    if (!validacionStock.valido) {
      await connection.rollback(); // Cancelamos todo
      return res.status(400).json({
        exito: false,
        mensaje: validacionStock.mensaje
      });
    }

    // ─────────────────────────────────────────────────
    // PASO 2: Registrar la venta principal en mdc_ventas
    // Esta tabla guarda la "cabecera" de la venta:
    // quién compró, cuánto pagó, cuándo fue, cómo pagó.
    // ─────────────────────────────────────────────────
    const [ventaResult] = await connection.query(
      `INSERT INTO mdc_ventas (cliente_id, usuario_id, descuento, total_venta, metodo_pago, fecha_venta)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [cliente_id, req.usuario.id, descuento, total, metodoPago]
    );

    // MySQL nos devuelve el ID autogenerado para la venta recién creada
    const ventaId = ventaResult.insertId;

    // ─────────────────────────────────────────────────
    // PASO 3: Por cada producto vendido, registrar el detalle
    // y descontar del inventario
    // ─────────────────────────────────────────────────
    for (const item of items) {
      // Calculamos el subtotal aquí también por seguridad
      const subtotalCalculado = item.cantidad * item.precio_unitario;

      // Insertamos una fila en mdc_detalle_ventas por cada libro vendido
      // Esta tabla guarda qué se vendió en cada venta
      await connection.query(
        `INSERT INTO mdc_detalle_ventas (venta_id, libro_id, cantidad, precio_unitario, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [ventaId, item.libro_id, item.cantidad, item.precio_unitario, subtotalCalculado]
      );

      // Descontamos del inventario la cantidad vendida
      // stock_actual = stock_actual - cantidad_vendida
      await connection.query(
        'UPDATE mdc_libros SET stock_actual = stock_actual - ? WHERE id = ?',
        [item.cantidad, item.libro_id]
      );
    }

    // ─────────────────────────────────────────────────
    // CONFIRMAR LA TRANSACCIÓN
    // Solo llegamos aquí si TODO lo anterior fue exitoso.
    // COMMIT hace que todos los cambios se guarden permanentemente.
    // ─────────────────────────────────────────────────
    await connection.commit();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Venta] Venta #${ventaId} registrada por usuario ${req.usuario.id}`);
    }

    // Respondemos al frontend con el ID de la venta creada
    res.status(201).json({
      exito: true,
      mensaje: 'Venta registrada exitosamente',
      ventaId: ventaId
    });

  } catch (error) {
    // Si algo salió mal, deshacemos TODOS los cambios de la transacción
    // Esto garantiza que no quede la venta registrada sin el stock descontado
    // ni el stock descontado sin la venta registrada
    if (connection) await connection.rollback();

    if (process.env.NODE_ENV === 'development') {
      console.error('[Venta] Error en transacción de venta:', error);
    }
    next(error);
  } finally {
    // El bloque finally siempre se ejecuta, haya error o no.
    // Liberamos la conexión de vuelta al pool para que otros la puedan usar.
    if (connection) connection.release();
  }
};

// =====================================================
// CONTROLADOR 2: OBTENER LISTADO DE VENTAS
// =====================================================
// Ruta: GET /api/ventas
// Devuelve el historial de ventas con filtros opcionales:
//   - Búsqueda por nombre de cliente
//   - Filtro por rango de fechas
//   - Paginación server-side (para no cargar miles de registros de una vez)
//
// 🔹 En la sustentación puedo decir:
// "Implementamos paginación en el servidor para que el sistema
//  sea eficiente aunque haya miles de ventas. En lugar de traer
//  todo al frontend y paginar ahí, solo traemos los registros
//  de la página actual."
exports.obtenerVentas = async (req, res, next) => {
  try {
    // Determinamos si se solicita paginación (si vienen los parámetros)
    const usarPaginacion = req.query.pagina || req.query.limite;

    // Valores de paginación con límites seguros
    let pagina = parseInt(req.query.pagina) || 1;
    let limite = parseInt(req.query.limite) || 20;

    // Protegemos contra valores inválidos
    if (pagina < 1) pagina = 1;
    if (limite < 1) limite = 20;
    if (limite > 100) limite = 100; // Máximo 100 registros por página

    // OFFSET: cuántos registros saltar para llegar a la página solicitada
    // Ejemplo: página 3, límite 20 → saltar los primeros 40 registros
    const offset = (pagina - 1) * limite;

    // Tomamos los filtros opcionales de la URL (query string)
    const { fechaInicio, fechaFin, buscar } = req.query;

    // ─────────────────────────────────────────────────
    // CONSTRUCCIÓN DINÁMICA DE FILTROS
    // En lugar de tener múltiples versiones de la misma consulta,
    // construimos el WHERE dinámicamente según los filtros activos.
    // ─────────────────────────────────────────────────
    const condiciones = [];  // Lista de condiciones WHERE
    const parametros  = [];  // Valores para los marcadores ? (protege contra SQL injection)

    // Si se filtra por fecha de inicio, agregamos esa condición
    if (fechaInicio) {
      condiciones.push('DATE(v.fecha_venta) >= ?');
      parametros.push(fechaInicio);
    }

    // Si se filtra por fecha de fin, agregamos esa condición
    if (fechaFin) {
      condiciones.push('DATE(v.fecha_venta) <= ?');
      parametros.push(fechaFin);
    }

    // Si se busca por nombre de cliente
    if (buscar) {
      // Limitamos la longitud del texto de búsqueda por seguridad
      if (buscar.length > 100) {
        return res.status(400).json({ exito: false, mensaje: 'El término de búsqueda es demasiado largo' });
      }
      // LIKE con % permite buscar texto parcial: "Mar" encuentra "María González"
      condiciones.push('c.nombre_completo LIKE ?');
      parametros.push(`%${buscar}%`);
    }

    // Construimos el WHERE completo, o cadena vacía si no hay filtros
    const whereClause = condiciones.length > 0
      ? 'WHERE ' + condiciones.join(' AND ')
      : '';

    // Consulta base: junta ventas con clientes para mostrar el nombre del cliente
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
      // Con paginación: traemos solo los registros de la página solicitada
      const sqlPaginada = sqlBase + ` LIMIT ? OFFSET ?`;
      const [rows] = await db.query(sqlPaginada, [...parametros, limite, offset]);

      // También necesitamos el total de registros para que el frontend
      // pueda calcular cuántas páginas hay en total
      const [[{ total }]] = await db.query(
        `SELECT COUNT(*) as total FROM mdc_ventas v JOIN mdc_clientes c ON v.cliente_id = c.id ${whereClause}`,
        parametros
      );

      // Respondemos con los datos y la información de paginación
      res.json({
        exito: true,
        datos: rows,
        paginacion: {
          paginaActual:        pagina,
          registrosPorPagina:  limite,
          totalRegistros:      total,
          totalPaginas:        Math.ceil(total / limite)
        }
      });
    } else {
      // Sin paginación: devolvemos todo (útil para reportes o exportaciones)
      const [rows] = await db.query(sqlBase, parametros);

      res.json({
        exito:  true,
        datos:  rows,
        total:  rows.length
      });
    }

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Venta] Error al listar ventas:', error);
    }
    next(error);
  }
};

// =====================================================
// CONTROLADOR 3: OBTENER DETALLE DE UNA VENTA
// =====================================================
// Ruta: GET /api/ventas/:id
// Devuelve toda la información de una venta específica:
// datos del cliente, del vendedor, y todos los productos vendidos.
// Se usa para mostrar el ticket de venta o generar el PDF.
//
// 🔹 En la sustentación puedo decir:
// "Al hacer clic en una venta del historial, el sistema hace
//  dos consultas: una para los datos generales de la venta
//  y otra para los productos. Así obtenemos el detalle completo
//  para mostrar o exportar como PDF."
exports.obtenerDetalleVenta = async (req, res, next) => {
  let { id } = req.params;

  // Convertimos el ID a número entero y validamos que sea válido
  id = parseInt(id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({
      exito: false,
      mensaje: 'ID de venta inválido'
    });
  }

  try {
    // CONSULTA 1: Datos principales de la venta
    // LEFT JOIN con clientes porque si el cliente fue eliminado,
    // igual queremos ver el registro de la venta
    const [ventaInfo] = await db.query(`
      SELECT
        v.id,
        v.fecha_venta,
        v.descuento,
        v.total_venta AS total,
        v.metodo_pago,
        v.estado,
        c.nombre_completo AS cliente,
        c.documento,
        c.telefono
      FROM mdc_ventas v
      LEFT JOIN mdc_clientes c ON v.cliente_id = c.id
      WHERE v.id = ?
    `, [id]);

    // Si no existe la venta, respondemos con 404
    if (ventaInfo.length === 0) {
      return res.status(404).json({
        exito:   false,
        mensaje: 'Venta no encontrada',
        codigo:  'VENTA_NOT_FOUND'
      });
    }

    // CONSULTA 2: Lista de productos vendidos en esta venta
    // Incluye título, autor, cantidad y precio
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
      JOIN  mdc_libros  l ON d.libro_id = l.id
      LEFT JOIN mdc_autores a ON l.autor_id = a.id
      WHERE d.venta_id = ?
    `, [id]);

    // Enviamos la respuesta con los datos de la venta y sus productos
    res.json({
      exito: true,
      venta: ventaInfo[0],  // Objeto con los datos de la venta
      items: items           // Array con los productos vendidos
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Venta] Error al obtener detalle de venta #' + id + ':', error.message);
    }
    next(error);
  }
};

// =====================================================
// CONTROLADOR 4: ANULAR UNA VENTA
// =====================================================
// Ruta: PATCH /api/ventas/:id/anular
// Solo el administrador puede anular ventas (se controla en las rutas).
// Anular una venta NO la borra: cambia su estado a "Anulada"
// y devuelve el stock al inventario.
//
// ¿Por qué no la borramos?
// Para mantener la trazabilidad (historial completo de lo que ocurrió).
// En auditorías o revisiones contables, es importante saber
// que existió esa venta aunque haya sido anulada.
//
// 🔹 En la sustentación puedo decir:
// "Al anular una venta, el sistema no la elimina sino que
//  cambia su estado a 'Anulada' y devuelve el stock al inventario,
//  registrando el movimiento en el kardex para trazabilidad.
//  Todo esto ocurre en una sola transacción."
exports.anularVenta = async (req, res, next) => {
  let { id } = req.params;

  // Validamos que el ID sea un número entero positivo
  id = parseInt(id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ exito: false, mensaje: 'ID de venta inválido' });
  }

  let connection;

  try {
    // Iniciamos transacción porque tocamos varias tablas a la vez
    connection = await db.getConnection();
    await connection.beginTransaction();

    // PASO 1: Verificar que la venta existe y no está ya anulada
    const [ventas] = await connection.query(
      'SELECT id, estado FROM mdc_ventas WHERE id = ?',
      [id]
    );

    if (ventas.length === 0) {
      await connection.rollback();
      return res.status(404).json({ exito: false, mensaje: 'Venta no encontrada' });
    }

    // No tiene sentido anular algo que ya está anulado
    if (ventas[0].estado === 'Anulada') {
      await connection.rollback();
      return res.status(400).json({ exito: false, mensaje: 'La venta ya fue anulada' });
    }

    // PASO 2: Traer los productos que se vendieron para poder devolver el stock
    const [items] = await connection.query(
      'SELECT libro_id, cantidad FROM mdc_detalle_ventas WHERE venta_id = ?',
      [id]
    );

    // PASO 3: Cambiar el estado de la venta a "Anulada"
    await connection.query(
      "UPDATE mdc_ventas SET estado = 'Anulada' WHERE id = ?",
      [id]
    );

    // PASO 4: Por cada libro vendido, devolver el stock y registrar en el kardex
    for (const item of items) {
      // Consultamos el stock actual del libro antes de la reversión
      const [libroActual] = await connection.query(
        'SELECT stock_actual FROM mdc_libros WHERE id = ?',
        [item.libro_id]
      );

      const stockAnterior = libroActual[0]?.stock_actual || 0;
      const stockNuevo    = stockAnterior + item.cantidad; // Devolvemos las unidades

      // Sumamos de vuelta al inventario la cantidad que se había vendido
      await connection.query(
        'UPDATE mdc_libros SET stock_actual = stock_actual + ? WHERE id = ?',
        [item.cantidad, item.libro_id]
      );

      // Registramos la entrada en el kardex (historial de movimientos)
      // para que quede trazabilidad de por qué aumentó el stock
      await connection.query(
        `INSERT INTO mdc_movimientos
          (libro_id, usuario_id, tipo_movimiento, cantidad, stock_anterior, stock_nuevo, observaciones)
         VALUES (?, ?, 'ENTRADA', ?, ?, ?, ?)`,
        [
          item.libro_id,
          req.usuario.id,       // Quién anuló la venta
          item.cantidad,
          stockAnterior,
          stockNuevo,
          `Reversa por anulación de venta #${id}` // Motivo del movimiento
        ]
      );
    }

    // Confirmamos todos los cambios de la transacción
    await connection.commit();

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Venta] Venta #${id} anulada por usuario ${req.usuario.id}`);
    }

    res.json({
      exito:   true,
      mensaje: `Venta #${id} anulada exitosamente. Stock revertido.`
    });

  } catch (error) {
    // Si algo falló, deshacemos todos los cambios
    if (connection) await connection.rollback();

    if (process.env.NODE_ENV === 'development') {
      console.error('[Venta] Error al anular venta:', error);
    }
    next(error);
  } finally {
    // Liberamos la conexión pase lo que pase
    if (connection) connection.release();
  }
};