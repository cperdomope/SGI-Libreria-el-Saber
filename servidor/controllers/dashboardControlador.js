// =====================================================
// CONTROLADOR DEL DASHBOARD — PANEL DE CONTROL
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Es el cerebro del Dashboard. Calcula TODAS las estadísticas
//   que el administrador necesita para tomar decisiones de negocio:
//   ventas, inventario, clientes, tendencias y alertas.
//
// ¿Cómo se conecta con el sistema?
//   El frontend (Inicio.jsx) hace GET /api/dashboard
//   → Este controlador ejecuta las consultas SQL
//   → Devuelve un objeto JSON con todos los datos organizados
//
// ¿Por qué es importante?
//   Sin este endpoint, el administrador tendría que revisar
//   cada módulo por separado. Aquí centralizamos TODO para
//   dar una vista panorámica del negocio en una sola pantalla.
//
// OPTIMIZACIONES CLAVE:
//   1. Promise.all() → Las consultas se ejecutan en PARALELO
//      (tiempo = la más lenta, no la suma de todas)
//   2. Caché de 60 segundos → Evita repetir consultas pesadas
//
// =====================================================

// Importamos la conexión al pool de MySQL
const db = require('../config/db');

// ─────────────────────────────────────────────────────
// CONFIGURACIÓN
// ─────────────────────────────────────────────────────
// Centralizamos los límites para poder ajustarlos fácilmente
const LIMITES = {
  TOP_PRODUCTOS:   5,    // Cuántos productos mostrar en el ranking
  TOP_CLIENTES:    5,    // Cuántos clientes mostrar en el ranking
  ALERTAS_STOCK:   10,   // Cuántos libros con stock bajo mostrar
  ULTIMAS_VENTAS:  5     // Cuántas ventas recientes mostrar
};

// ─────────────────────────────────────────────────────
// CACHÉ EN MEMORIA
// ─────────────────────────────────────────────────────
// Guarda temporalmente los resultados para no repetir las consultas.
// - Primera visita: ejecuta las consultas y guarda el resultado
// - Visita dentro de 60 segundos: devuelve el resultado guardado
// - Después de 60 segundos: vuelve a consultar la BD
const _cache = {
  datos:     null,
  timestamp: 0,
  TTL_MS:    60_000  // 60 segundos de vida útil
};

// =====================================================
// CONTROLADOR PRINCIPAL: obtenerEstadisticas
// =====================================================
// Ruta: GET /api/dashboard (solo Admin)
//
// Entrada: nada (solo necesita el token JWT del admin)
// Salida: JSON con todas las estadísticas del negocio
//
exports.obtenerEstadisticas = async (_req, res) => {

  // Paso 1: Verificar si tenemos datos frescos en caché
  const ahora = Date.now();
  if (_cache.datos && ahora - _cache.timestamp < _cache.TTL_MS) {
    return res.json({ exito: true, datos: _cache.datos });
  }

  try {
    // Paso 2: Ejecutar TODAS las consultas en paralelo con Promise.all()
    // Esto es mucho más rápido que ejecutarlas una por una
    const [
      [ventasDia],
      [ventasMes],
      [ventasMesAnterior],
      [ventasSemana],
      [productosMasVendidos],
      [mejoresClientes],
      [librosStockBajo],
      [totalLibros],
      [totalClientes],
      [totalProveedores],
      [valorInventario],
      [ventasPorMes],
      [librosPorCategoria],
      [ventasPorDiaSemana],
      [ultimasVentas]
    ] = await Promise.all([

      // ── CONSULTA 1: Ventas de HOY ──
      // COUNT = cuántas ventas, SUM = total en dinero
      db.query(`
        SELECT COUNT(*) AS cantidad, COALESCE(SUM(total_venta), 0) AS ingresos
        FROM mdc_ventas
        WHERE fecha_venta >= CURDATE()
          AND fecha_venta <  CURDATE() + INTERVAL 1 DAY
      `),

      // ── CONSULTA 2: Ventas del MES ACTUAL ──
      db.query(`
        SELECT COUNT(*) AS cantidad, COALESCE(SUM(total_venta), 0) AS ingresos
        FROM mdc_ventas
        WHERE fecha_venta >= DATE_FORMAT(CURDATE(), '%Y-%m-01')
          AND fecha_venta <  DATE_FORMAT(CURDATE() + INTERVAL 1 MONTH, '%Y-%m-01')
      `),

      // ── CONSULTA 3: Ventas del MES ANTERIOR (para comparar crecimiento) ──
      db.query(`
        SELECT COUNT(*) AS cantidad, COALESCE(SUM(total_venta), 0) AS ingresos
        FROM mdc_ventas
        WHERE fecha_venta >= DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m-01')
          AND fecha_venta <  DATE_FORMAT(CURDATE(), '%Y-%m-01')
      `),

      // ── CONSULTA 4: Ventas de la SEMANA actual ──
      // YEARWEEK agrupa por semana del año
      db.query(`
        SELECT COUNT(*) AS cantidad, COALESCE(SUM(total_venta), 0) AS ingresos
        FROM mdc_ventas
        WHERE YEARWEEK(fecha_venta, 1) = YEARWEEK(CURDATE(), 1)
      `),

      // ── CONSULTA 5: Top 5 libros más vendidos ──
      // GROUP BY agrupa las ventas por libro y SUM suma las cantidades
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

      // ── CONSULTA 6: Top 5 mejores clientes ──
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

      // ── CONSULTA 7: Libros con stock CRÍTICO ──
      // stock_actual < stock_minimo = necesita reposición urgente
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

      // ── CONSULTA 8: Total de libros registrados ──
      db.query('SELECT COUNT(*) AS total FROM mdc_libros'),

      // ── CONSULTA 9: Total de clientes registrados ──
      db.query('SELECT COUNT(*) AS total FROM mdc_clientes'),

      // ── CONSULTA 10: Total de proveedores activos ──
      db.query('SELECT COUNT(*) AS total FROM mdc_proveedores'),

      // ── CONSULTA 11: Valor total del inventario ──
      // stock_actual × precio_venta de cada libro = valor en estantería
      db.query(`
        SELECT COALESCE(SUM(stock_actual * precio_venta), 0) AS valor_total,
               COALESCE(SUM(stock_actual), 0) AS unidades_totales
        FROM mdc_libros
      `),

      // ── CONSULTA 12: Ventas por mes (últimos 6 meses) ──
      // Para la gráfica de tendencia de ventas
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

      // ── CONSULTA 13: Libros por categoría ──
      // Para la gráfica de distribución del catálogo
      db.query(`
        SELECT c.nombre AS categoria, COUNT(l.id) AS total_libros
        FROM mdc_categorias c
        LEFT JOIN mdc_libros l ON l.categoria_id = c.id
        GROUP BY c.id, c.nombre
        ORDER BY total_libros DESC
      `),

      // ── CONSULTA 14: Ventas por día de la semana (últimos 30 días) ──
      // Para saber qué días se vende más
      db.query(`
        SELECT
          DAYOFWEEK(fecha_venta) AS dia_num,
          CASE DAYOFWEEK(fecha_venta)
            WHEN 1 THEN 'Dom' WHEN 2 THEN 'Lun' WHEN 3 THEN 'Mar'
            WHEN 4 THEN 'Mié' WHEN 5 THEN 'Jue' WHEN 6 THEN 'Vie'
            WHEN 7 THEN 'Sáb'
          END AS dia_nombre,
          COUNT(*) AS cantidad,
          COALESCE(SUM(total_venta), 0) AS ingresos
        FROM mdc_ventas
        WHERE fecha_venta >= CURDATE() - INTERVAL 30 DAY
        GROUP BY dia_num, dia_nombre
        ORDER BY dia_num
      `),

      // ── CONSULTA 15: Últimas 5 ventas realizadas ──
      // Para ver la actividad reciente del negocio
      db.query(`
        SELECT
          v.id,
          v.total_venta,
          v.metodo_pago,
          v.fecha_venta,
          c.nombre_completo AS cliente,
          u.nombre_completo AS vendedor
        FROM mdc_ventas v
        LEFT JOIN mdc_clientes c ON v.cliente_id = c.id
        LEFT JOIN mdc_usuarios u ON v.usuario_id = u.id
        ORDER BY v.fecha_venta DESC
        LIMIT ?
      `, [LIMITES.ULTIMAS_VENTAS])
    ]);

    // ─────────────────────────────────────────────────
    // CALCULAR PORCENTAJE DE CRECIMIENTO
    // ─────────────────────────────────────────────────
    // Fórmula: ((actual - anterior) / anterior) * 100
    // Si el mes anterior fue 0, mostramos 100% de crecimiento
    const ingresosActual  = parseFloat(ventasMes[0].ingresos) || 0;
    const ingresosAnterior = parseFloat(ventasMesAnterior[0].ingresos) || 0;
    const crecimiento = ingresosAnterior > 0
      ? (((ingresosActual - ingresosAnterior) / ingresosAnterior) * 100).toFixed(1)
      : (ingresosActual > 0 ? 100 : 0);

    // ─────────────────────────────────────────────────
    // CONSTRUIR OBJETO DE RESPUESTA
    // ─────────────────────────────────────────────────
    // Transformamos los resultados SQL en un formato limpio para el frontend
    const datos = {

      // === MÉTRICAS PRINCIPALES (KPIs) ===
      ventas_hoy: {
        cantidad: ventasDia[0].cantidad,
        ingresos: parseFloat(ventasDia[0].ingresos) || 0
      },
      ventas_semana: {
        cantidad: ventasSemana[0].cantidad,
        ingresos: parseFloat(ventasSemana[0].ingresos) || 0
      },
      ventas_mes: {
        cantidad:    ventasMes[0].cantidad,
        ingresos:    ingresosActual,
        crecimiento: parseFloat(crecimiento)
      },

      // === TOTALES GENERALES ===
      total_libros:      totalLibros[0].total,
      total_clientes:    totalClientes[0].total,
      total_proveedores: totalProveedores[0].total,
      alertas_stock:     librosStockBajo.length,

      // === VALOR DEL INVENTARIO ===
      inventario: {
        valor_total:      parseFloat(valorInventario[0].valor_total) || 0,
        unidades_totales: parseInt(valorInventario[0].unidades_totales) || 0
      },

      // === RANKINGS ===
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

      // === ALERTAS DE INVENTARIO ===
      libros_stock_bajo: librosStockBajo.map(l => ({
        id:           l.id,
        titulo:       l.titulo,
        autor:        l.autor || 'Sin autor',
        stock_actual: l.stock_actual,
        stock_minimo: l.stock_minimo,
        faltante:     l.stock_minimo - l.stock_actual
      })),

      // === DATOS PARA GRÁFICAS ===
      ventas_por_mes: ventasPorMes.map(v => ({
        mes:      v.mes_label,
        ventas:   parseInt(v.cantidad) || 0,
        ingresos: parseFloat(v.ingresos) || 0
      })),

      libros_por_categoria: librosPorCategoria.map(c => ({
        categoria: c.categoria,
        total:     parseInt(c.total_libros) || 0
      })),

      ventas_por_dia_semana: ventasPorDiaSemana.map(d => ({
        dia:      d.dia_nombre,
        ventas:   parseInt(d.cantidad) || 0,
        ingresos: parseFloat(d.ingresos) || 0
      })),

      // === ACTIVIDAD RECIENTE ===
      ultimas_ventas: ultimasVentas.map(v => ({
        id:          v.id,
        total:       parseFloat(v.total_venta) || 0,
        metodo_pago: v.metodo_pago,
        fecha:       v.fecha_venta,
        cliente:     v.cliente || 'Cliente general',
        vendedor:    v.vendedor || 'Sistema'
      }))
    };

    // Paso 3: Guardar en caché y responder
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
