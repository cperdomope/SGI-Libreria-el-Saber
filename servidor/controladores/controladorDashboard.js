/**
 * =====================================================
 * CONTROLADOR DEL DASHBOARD
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Proporciona estadísticas y métricas en tiempo real
 * para el panel de administración. Solo accesible para rol Administrador.
 *
 * @requires ../configuracion/db - Pool de conexiones MySQL
 *
 * MÉTRICAS DISPONIBLES:
 * - Ventas del día (cantidad e ingresos)
 * - Ventas del mes (cantidad e ingresos)
 * - Top 5 productos más vendidos
 * - Top 5 mejores clientes
 * - Libros con stock bajo
 * - Totales generales (libros, clientes)
 *
 * NOTA DE RENDIMIENTO:
 * Este endpoint ejecuta múltiples queries. En producción con
 * alto volumen de datos, considerar implementar caché.
 *
 * @author Equipo de Desarrollo SGI
 * @version 2.0.0
 */

const db = require('../configuracion/db');

// =====================================================
// CONFIGURACIÓN
// =====================================================

/**
 * Límites para los rankings del dashboard.
 * Centralizados para fácil ajuste.
 *
 * @constant {Object}
 */
const LIMITES = {
  TOP_PRODUCTOS: 5,
  TOP_CLIENTES: 5,
  ALERTAS_STOCK: 10
};

// =====================================================
// CONTROLADOR
// =====================================================

/**
 * Obtiene todas las estadísticas del dashboard.
 * Ejecuta múltiples consultas y agrega los resultados.
 *
 * @async
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @returns {Promise<void>} JSON con todas las métricas
 *
 * @example
 * // Response exitoso:
 * {
 *   "exito": true,
 *   "datos": {
 *     "ventas_hoy": { "cantidad": 5, "ingresos": 250000 },
 *     "ventas_mes": { "cantidad": 45, "ingresos": 2500000 },
 *     "productos_mas_vendidos": [...],
 *     "mejores_clientes": [...],
 *     "libros_stock_bajo": [...],
 *     "total_libros": 150,
 *     "total_clientes": 45,
 *     "alertas_stock": 3
 *   }
 * }
 */
exports.obtenerEstadisticas = async (req, res) => {
  try {
    // ─────────────────────────────────────────────────
    // CONSULTA 1: VENTAS DEL DÍA
    // Filtra por fecha actual usando CURDATE()
    // ─────────────────────────────────────────────────

    const [ventasDia] = await db.query(`
      SELECT
        COUNT(*) AS cantidad,
        COALESCE(SUM(total_venta), 0) AS ingresos
      FROM mdc_ventas
      WHERE DATE(fecha_venta) = CURDATE()
    `);

    // ─────────────────────────────────────────────────
    // CONSULTA 2: VENTAS DEL MES
    // Filtra por mes y año actuales
    // ─────────────────────────────────────────────────

    const [ventasMes] = await db.query(`
      SELECT
        COUNT(*) AS cantidad,
        COALESCE(SUM(total_venta), 0) AS ingresos
      FROM mdc_ventas
      WHERE MONTH(fecha_venta) = MONTH(CURDATE())
        AND YEAR(fecha_venta) = YEAR(CURDATE())
    `);

    // ─────────────────────────────────────────────────
    // CONSULTA 3: PRODUCTOS MÁS VENDIDOS
    // Agrupa por libro y ordena por cantidad vendida
    // ─────────────────────────────────────────────────

    const [productosMasVendidos] = await db.query(`
      SELECT
        l.titulo,
        l.isbn,
        a.nombre AS autor,
        SUM(dv.cantidad) AS total_vendido,
        SUM(dv.cantidad * dv.precio_unitario) AS ingresos_generados
      FROM mdc_detalle_ventas dv
      INNER JOIN mdc_libros l ON dv.libro_id = l.id
      LEFT JOIN mdc_autores a ON l.autor_id = a.id
      GROUP BY l.id, l.titulo, l.isbn, a.nombre
      ORDER BY total_vendido DESC
      LIMIT ?
    `, [LIMITES.TOP_PRODUCTOS]);

    // ─────────────────────────────────────────────────
    // CONSULTA 4: MEJORES CLIENTES
    // Ordena por número de compras realizadas
    // ─────────────────────────────────────────────────

    const [mejoresClientes] = await db.query(`
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
    `, [LIMITES.TOP_CLIENTES]);

    // ─────────────────────────────────────────────────
    // CONSULTA 5: LIBROS CON STOCK BAJO
    // stock_actual < stock_minimo indica necesidad de reabastecimiento
    // ─────────────────────────────────────────────────

    const [librosStockBajo] = await db.query(`
      SELECT
        l.id,
        l.titulo,
        l.isbn,
        a.nombre AS autor,
        l.stock_actual,
        l.stock_minimo
      FROM mdc_libros l
      LEFT JOIN mdc_autores a ON l.autor_id = a.id
      WHERE l.stock_actual < l.stock_minimo
      ORDER BY (l.stock_minimo - l.stock_actual) DESC
      LIMIT ?
    `, [LIMITES.ALERTAS_STOCK]);

    // ─────────────────────────────────────────────────
    // CONSULTA 6: CONTADORES GENERALES
    // Totales para métricas rápidas
    // ─────────────────────────────────────────────────

    const [totalLibros] = await db.query(
      'SELECT COUNT(*) AS total FROM mdc_libros'
    );

    const [totalClientes] = await db.query(
      'SELECT COUNT(*) AS total FROM mdc_clientes'
    );

    // ─────────────────────────────────────────────────
    // FORMATEAR Y ENVIAR RESPUESTA
    // Estructura consistente para el frontend
    // ─────────────────────────────────────────────────

    // ─────────────────────────────────────────────────
    // CONSULTA 7: VENTAS POR MES (últimos 6 meses)
    // Para la gráfica de barras del dashboard
    // ─────────────────────────────────────────────────

    const [ventasPorMes] = await db.query(`
      SELECT
        DATE_FORMAT(fecha_venta, '%Y-%m') AS mes,
        DATE_FORMAT(fecha_venta, '%b %Y') AS mes_label,
        COUNT(*) AS cantidad,
        COALESCE(SUM(total_venta), 0) AS ingresos
      FROM mdc_ventas
      WHERE fecha_venta >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(fecha_venta, '%Y-%m'), DATE_FORMAT(fecha_venta, '%b %Y')
      ORDER BY mes ASC
    `);

    // ─────────────────────────────────────────────────
    // CONSULTA 8: LIBROS POR CATEGORÍA
    // Para la gráfica de torta del dashboard
    // ─────────────────────────────────────────────────

    const [librosPorCategoria] = await db.query(`
      SELECT
        c.nombre AS categoria,
        COUNT(l.id) AS total_libros
      FROM mdc_categorias c
      LEFT JOIN mdc_libros l ON l.categoria_id = c.id
      GROUP BY c.id, c.nombre
      ORDER BY total_libros DESC
    `);

    res.json({
      exito: true,
      datos: {
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
          titulo: p.titulo,
          autor: p.autor || 'Sin autor',
          total_vendido: parseInt(p.total_vendido) || 0,
          ingresos_generados: parseFloat(p.ingresos_generados) || 0
        })),

        mejores_clientes: mejoresClientes.map(c => ({
          nombre: c.nombre_completo,
          documento: c.documento,
          total_compras: parseInt(c.total_compras) || 0,
          total_gastado: parseFloat(c.total_gastado) || 0
        })),

        // Alertas de inventario
        libros_stock_bajo: librosStockBajo.map(l => ({
          id: l.id,
          titulo: l.titulo,
          autor: l.autor || 'Sin autor',
          stock_actual: l.stock_actual,
          stock_minimo: l.stock_minimo,
          faltante: l.stock_minimo - l.stock_actual
        })),

        // Totales
        total_libros: totalLibros[0].total,
        total_clientes: totalClientes[0].total,
        alertas_stock: librosStockBajo.length,

        // Datos para gráficas
        ventas_por_mes: ventasPorMes.map(v => ({
          mes: v.mes_label,
          ventas: parseInt(v.cantidad) || 0,
          ingresos: parseFloat(v.ingresos) || 0
        })),

        libros_por_categoria: librosPorCategoria.map(c => ({
          categoria: c.categoria,
          total: parseInt(c.total_libros) || 0
        }))
      }
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Dashboard] Error al obtener estadísticas:', error);
    }

    res.status(500).json({
      exito: false,
      mensaje: 'Error al calcular las estadísticas del dashboard',
      codigo: 'DASHBOARD_ERROR'
    });
  }
};
