// =====================================================
// CONTROLADOR DEL DASHBOARD
// =====================================================
// Este archivo calcula y entrega todas las estadísticas
// que se muestran en el panel principal del Administrador.
//
// ¿Qué muestra el Dashboard?
//   - Ventas del día y del mes (cantidad e ingresos)
//   - Top 5 productos más vendidos
//   - Top 5 mejores clientes
//   - Libros con stock bajo (alertas de inventario)
//   - Total de libros y clientes registrados
//   - Gráfica de ventas por mes (últimos 6 meses)
//   - Gráfica de libros por categoría
//
// Dos optimizaciones importantes aquí:
//
// 1. PARALELISMO: Las 8 consultas SQL se ejecutan al mismo tiempo
//    usando Promise.all(). Sin esto, se ejecutarían una por una,
//    multiplicando el tiempo de respuesta.
//
// 2. CACHÉ EN MEMORIA: Los resultados se guardan 60 segundos.
//    Si el admin recarga el dashboard repetidamente,
//    no se ejecutan las 8 consultas cada vez.
//
// 🔹 En la sustentación puedo decir:
// "El dashboard ejecuta 8 consultas SQL en paralelo usando Promise.all(),
//  lo que reduce el tiempo de respuesta al máximo de las consultas
//  en lugar de la suma. Además implementamos caché de 60 segundos
//  para evitar sobrecargar la base de datos con consultas repetidas."
// =====================================================

// Conexión al pool de base de datos MySQL
const db = require('../config/db');

// ─────────────────────────────────────────────────────────
// LÍMITES CONFIGURABLES
// ─────────────────────────────────────────────────────────
// Centralizamos estos valores para poder ajustarlos fácilmente
// sin tener que buscar en todo el código dónde están los números.
const LIMITES = {
  TOP_PRODUCTOS: 5,   // Cuántos productos mostrar en el ranking
  TOP_CLIENTES:  5,   // Cuántos clientes mostrar en el ranking
  ALERTAS_STOCK: 10   // Cuántos libros con stock bajo mostrar
};

// ─────────────────────────────────────────────────────────
// CACHÉ EN MEMORIA (RAM)
// ─────────────────────────────────────────────────────────
// ¿Qué es la caché aquí?
// Es un objeto que guarda temporalmente los últimos resultados
// calculados para no repetir las consultas inmediatamente.
//
// Funciona así:
//   - Primera visita: ejecuta las 8 consultas, guarda resultado
//   - Segunda visita (< 60s después): devuelve el resultado guardado
//   - Pasados 60s: ejecuta las consultas de nuevo y actualiza la caché
//
// LIMITACIÓN: esta caché es local al proceso del servidor.
// Si se reinicia el servidor o hay múltiples instancias,
// cada una tiene su propia caché independiente.
// Para producción distribuida, se usaría Redis.
const _cache = {
  datos:     null,   // Aquí guardamos los datos calculados
  timestamp: 0,      // Cuándo se guardaron (milisegundos Unix)
  TTL_MS:    60_000  // Time To Live: 60 segundos (60,000 milisegundos)
};

// =====================================================
// CONTROLADOR: OBTENER ESTADÍSTICAS DEL DASHBOARD
// =====================================================
// Ruta: GET /api/dashboard (solo Admin)
// Ejecuta múltiples consultas en paralelo y retorna todo en una respuesta.
exports.obtenerEstadisticas = async (_req, res) => {

  // ─────────────────────────────────────────────────
  // VERIFICAR CACHÉ ANTES DE CONSULTAR LA BD
  // ─────────────────────────────────────────────────
  // Si los datos en caché tienen menos de 60 segundos, los devolvemos directamente.
  // Date.now() devuelve el tiempo actual en milisegundos.
  const ahora = Date.now();
  if (_cache.datos && ahora - _cache.timestamp < _cache.TTL_MS) {
    // Respondemos inmediatamente sin tocar la base de datos
    return res.json({ exito: true, datos: _cache.datos });
  }

  try {
    // ─────────────────────────────────────────────────
    // EJECUTAR LAS 8 CONSULTAS EN PARALELO
    // ─────────────────────────────────────────────────
    // Promise.all() inicia todas las consultas al mismo tiempo.
    // El resultado llega cuando TODAS terminan.
    // Si cualquiera falla, todo el Promise.all() falla (catch lo maneja).
    //
    // Sin Promise.all (secuencial): tiempo = Q1 + Q2 + Q3 + ... + Q8
    // Con Promise.all (paralelo):   tiempo = max(Q1, Q2, Q3, ..., Q8)
    const [
      [ventasDia],
      [ventasMes],
      [productosMasVendidos],
      [mejoresClientes],
      [librosStockBajo],
      [totalLibros],
      [totalClientes],
      [ventasPorMes],
      [librosPorCategoria]
    ] = await Promise.all([

      // CONSULTA 1: Ventas registradas HOY
      // Usamos rango (>= / <) en lugar de DATE(col) = CURDATE()
      // porque DATE() sobre la columna impide usar el índice idx_ventas_fecha.
      // Con el rango, MySQL puede usar el índice y es mucho más rápido.
      db.query(`
        SELECT COUNT(*) AS cantidad, COALESCE(SUM(total_venta), 0) AS ingresos
        FROM mdc_ventas
        WHERE fecha_venta >= CURDATE()
          AND fecha_venta <  CURDATE() + INTERVAL 1 DAY
      `),

      // CONSULTA 2: Ventas del MES ACTUAL
      // DATE_FORMAT calcula el primer día del mes actual y el primero del siguiente.
      // Ejemplo para marzo 2026: entre '2026-03-01' y '2026-04-01'
      db.query(`
        SELECT COUNT(*) AS cantidad, COALESCE(SUM(total_venta), 0) AS ingresos
        FROM mdc_ventas
        WHERE fecha_venta >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
          AND fecha_venta <  DATE_FORMAT(CURDATE() + INTERVAL 1 MONTH, '%Y-%m-01')
      `),

      // CONSULTA 3: Top 5 libros más vendidos (histórico)
      // GROUP BY libro → SUM(cantidad vendida) → ORDER BY más vendido primero
      db.query(`
        SELECT
          l.titulo,
          l.isbn,
          a.nombre AS autor,
          SUM(dv.cantidad) AS total_vendido,
          SUM(dv.cantidad * dv.precio_unitario) AS ingresos_generados
        FROM mdc_detalle_ventas dv
        INNER JOIN mdc_libros  l ON dv.libro_id = l.id
        LEFT  JOIN mdc_autores a ON l.autor_id   = a.id
        GROUP BY l.id, l.titulo, l.isbn, a.nombre
        ORDER BY total_vendido DESC
        LIMIT ?
      `, [LIMITES.TOP_PRODUCTOS]),

      // CONSULTA 4: Top 5 mejores clientes (por número de compras)
      // GROUP BY cliente → COUNT(ventas) → ORDER BY más compras primero
      db.query(`
        SELECT
          c.nombre_completo,
          c.documento,
          COUNT(v.id) AS total_compras,
          SUM(v.total_venta) AS total_gastado
        FROM mdc_ventas v
        INNER JOIN mdc_clientes c ON v.cliente_id = c.id
        GROUP BY c.id, c.nombre_completo, c.documento
        ORDER BY total_compras DESC
        LIMIT ?
      `, [LIMITES.TOP_CLIENTES]),

      // CONSULTA 5: Libros con stock CRÍTICO (por debajo del mínimo)
      // stock_actual < stock_minimo = alerta roja de inventario
      // ORDER BY el más crítico primero (mayor diferencia primero)
      db.query(`
        SELECT
          l.id, l.titulo, l.isbn,
          a.nombre AS autor,
          l.stock_actual, l.stock_minimo
        FROM mdc_libros l
        LEFT JOIN mdc_autores a ON l.autor_id = a.id
        WHERE l.stock_actual < l.stock_minimo
        ORDER BY (l.stock_minimo - l.stock_actual) DESC
        LIMIT ?
      `, [LIMITES.ALERTAS_STOCK]),

      // CONSULTA 6a: Total de libros en el inventario
      db.query('SELECT COUNT(*) AS total FROM mdc_libros'),

      // CONSULTA 6b: Total de clientes registrados
      db.query('SELECT COUNT(*) AS total FROM mdc_clientes'),

      // CONSULTA 7: Ventas agrupadas por mes (últimos 6 meses)
      // Para la gráfica de barras del historial de ventas
      db.query(`
        SELECT
          DATE_FORMAT(fecha_venta, '%Y-%m')   AS mes,
          DATE_FORMAT(fecha_venta, '%b %Y')   AS mes_label,
          COUNT(*) AS cantidad,
          COALESCE(SUM(total_venta), 0) AS ingresos
        FROM mdc_ventas
        WHERE fecha_venta >= CURDATE() - INTERVAL 6 MONTH
        GROUP BY DATE_FORMAT(fecha_venta, '%Y-%m'), DATE_FORMAT(fecha_venta, '%b %Y')
        ORDER BY mes ASC
      `),

      // CONSULTA 8: Libros agrupados por categoría
      // Para la gráfica de torta de distribución del catálogo
      db.query(`
        SELECT c.nombre AS categoria, COUNT(l.id) AS total_libros
        FROM mdc_categorias c
        LEFT JOIN mdc_libros l ON l.categoria_id = c.id
        GROUP BY c.id, c.nombre
        ORDER BY total_libros DESC
      `)
    ]);

    // ─────────────────────────────────────────────────
    // CONSTRUIR EL OBJETO DE RESPUESTA
    // ─────────────────────────────────────────────────
    // Transformamos los resultados brutos de MySQL en un formato
    // limpio y consistente para el frontend.
    // parseFloat() y parseInt() aseguran que los números no vengan
    // como strings (MySQL a veces retorna números como texto).
    const datos = {
      // Métricas de ventas
      ventas_hoy: {
        cantidad: ventasDia[0].cantidad,
        ingresos: parseFloat(ventasDia[0].ingresos) || 0
      },
      ventas_mes: {
        cantidad: ventasMes[0].cantidad,
        ingresos: parseFloat(ventasMes[0].ingresos) || 0
      },

      // Rankings
      productos_mas_vendidos: productosMasVendidos.map(p => ({
        titulo:             p.titulo,
        autor:              p.autor || 'Sin autor',
        total_vendido:      parseInt(p.total_vendido) || 0,
        ingresos_generados: parseFloat(p.ingresos_generados) || 0
      })),

      mejores_clientes: mejoresClientes.map(c => ({
        nombre:        c.nombre_completo,
        documento:     c.documento,
        total_compras: parseInt(c.total_compras) || 0,
        total_gastado: parseFloat(c.total_gastado) || 0
      })),

      // Alertas de inventario — libros que necesitan reposición
      libros_stock_bajo: librosStockBajo.map(l => ({
        id:           l.id,
        titulo:       l.titulo,
        autor:        l.autor || 'Sin autor',
        stock_actual: l.stock_actual,
        stock_minimo: l.stock_minimo,
        faltante:     l.stock_minimo - l.stock_actual  // Cuántas unidades faltan
      })),

      // Totales generales
      total_libros:   totalLibros[0].total,
      total_clientes: totalClientes[0].total,
      alertas_stock:  librosStockBajo.length,   // Cantidad de libros en alerta

      // Datos para la gráfica de barras (ventas por mes)
      ventas_por_mes: ventasPorMes.map(v => ({
        mes:      v.mes_label,   // Texto como "Mar 2026"
        ventas:   parseInt(v.cantidad) || 0,
        ingresos: parseFloat(v.ingresos) || 0
      })),

      // Datos para la gráfica de torta (distribución por categoría)
      libros_por_categoria: librosPorCategoria.map(c => ({
        categoria: c.categoria,
        total:     parseInt(c.total_libros) || 0
      }))
    };

    // ─────────────────────────────────────────────────
    // GUARDAR EN CACHÉ Y RESPONDER
    // ─────────────────────────────────────────────────
    // Guardamos los datos calculados y el timestamp actual.
    // La próxima petición en los próximos 60 segundos usará esta caché.
    _cache.datos     = datos;
    _cache.timestamp = Date.now();

    res.json({ exito: true, datos });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Dashboard] Error al obtener estadísticas:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al calcular las estadísticas del dashboard',
      codigo:  'DASHBOARD_ERROR'
    });
  }
};