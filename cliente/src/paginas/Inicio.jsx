/**
 * =====================================================
 * PÁGINA DE INICIO - DASHBOARD
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Panel de control con indicadores clave (KPIs)
 * y estadísticas en tiempo real. Acceso exclusivo para Administradores.
 *
 * MÉTRICAS MOSTRADAS:
 * - Ventas del día (cantidad e ingresos)
 * - Ventas del mes (cantidad e ingresos)
 * - Total de libros en catálogo
 * - Alertas de stock bajo
 * - Top 5 productos más vendidos
 * - Top 5 mejores clientes
 * - Libros que requieren reabastecimiento
 *
 * INTERACTIVIDAD:
 * - Actualización manual de datos
 * - Accesos directos a módulos principales
 * - Links de acción rápida para reabastecer
 *
 * @author Equipo de Desarrollo SGI
 * @version 2.0.0
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../servicios/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';

// Paleta de colores para la gráfica de torta
const COLORES_GRAFICAS = [
  '#0d6efd', '#198754', '#0dcaf0', '#ffc107', '#dc3545',
  '#6f42c1', '#fd7e14', '#20c997', '#6c757d', '#d63384'
];

// =====================================================
// ICONOS SVG (Bootstrap Icons - MIT License)
// =====================================================

/**
 * Icono de dinero/billetes - Indicador de ventas
 */
const IconoDinero = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
    <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1H1zm7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
    <path d="M0 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V5zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V7a2 2 0 0 1-2-2H3z"/>
  </svg>
);

/**
 * Icono de alerta/advertencia - Indicador de stock bajo
 */
const IconoAlerta = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
  </svg>
);

/**
 * Icono de libros - Indicador de catálogo
 */
const IconoLibros = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
    <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v11a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-11z"/>
    <path d="M9.5 1a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5h4z"/>
    <path d="M11 2.5v11a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-11A1.5 1.5 0 0 0 12.5 1h-2A1.5 1.5 0 0 0 11 2.5z"/>
  </svg>
);

/**
 * Icono de clientes/usuarios - No usado actualmente
 * Mantenido para futura tarjeta de total de clientes
 */
const IconoClientes = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
    <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
    <path fillRule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
  </svg>
);

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

/**
 * Dashboard principal del sistema.
 * Muestra métricas clave y estadísticas de ventas/inventario.
 *
 * @returns {JSX.Element} Panel de control completo
 */
const Inicio = () => {
  // ─────────────────────────────────────────────────
  // ESTADOS
  // ─────────────────────────────────────────────────

  const [estadisticas, setEstadisticas] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // ─────────────────────────────────────────────────
  // EFECTOS
  // ─────────────────────────────────────────────────

  /**
   * Carga las estadísticas al montar el componente.
   */
  useEffect(() => {
    cargarEstadisticas();
  }, []);

  // ─────────────────────────────────────────────────
  // CARGA DE DATOS
  // ─────────────────────────────────────────────────

  /**
   * Obtiene las estadísticas del dashboard desde el backend.
   * Maneja estados de carga y error apropiadamente.
   *
   * @async
   * @returns {Promise<void>}
   */
  const cargarEstadisticas = async () => {
    try {
      setCargando(true);
      const respuesta = await api.get('/dashboard');

      // La respuesta incluye { exito, datos }
      // Accedemos directamente a los datos del dashboard
      setEstadisticas(respuesta.data.datos || respuesta.data);
      setError(null);
    } catch (err) {
      // Log solo en desarrollo para debugging
      if (import.meta.env.DEV) {
        console.error('[Dashboard] Error al cargar estadísticas:', err);
      }
      setError('Error al cargar estadísticas del dashboard');
    } finally {
      setCargando(false);
    }
  };

  // ─────────────────────────────────────────────────
  // UTILIDADES DE FORMATO
  // ─────────────────────────────────────────────────

  /**
   * Formatea un valor numérico como precio en pesos colombianos.
   * Usa Intl.NumberFormat para localización correcta.
   *
   * @param {number} precio - Valor a formatear
   * @returns {string} Precio formateado (ej: "$125.000")
   */
  const formatearPrecio = (precio) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio || 0);
  };

  // ─────────────────────────────────────────────────
  // ESTADOS DE CARGA Y ERROR
  // ─────────────────────────────────────────────────

  // Mostrar spinner mientras carga
  if (cargando) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-2 text-muted">Cargando indicadores...</p>
      </div>
    );
  }

  // Mostrar mensaje de error con opción de reintentar
  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <h5>Error al cargar el dashboard</h5>
          <p>{error}</p>
          <button onClick={cargarEstadisticas} className="btn btn-primary">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Mostrar mensaje si no hay datos
  if (!estadisticas) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          No hay datos disponibles
          <button onClick={cargarEstadisticas} className="btn btn-primary ms-3">
            Cargar datos
          </button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ─────────────────────────────────────────────────

  return (
    <div className="container-fluid py-4">

      {/* ─────────────────────────────────────────────────
          ENCABEZADO CON BOTÓN DE ACTUALIZAR
          ───────────────────────────────────────────────── */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <h2 className="fw-bold mb-0" style={{ fontSize: 'clamp(1.1rem, 3vw, 1.75rem)' }}>
          Panel de Control
        </h2>
        <button
          onClick={cargarEstadisticas}
          className="btn btn-outline-primary btn-sm flex-shrink-0"
          title="Actualizar estadísticas"
        >
          Actualizar
        </button>
      </div>

      {/* ─────────────────────────────────────────────────
          KPIs PRINCIPALES - TARJETAS DE INDICADORES
          ───────────────────────────────────────────────── */}
      <div className="row g-3 mb-4">

        {/* Ventas del Día */}
        <div className="col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-primary">
            <div className="card-body text-white">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="mb-2" style={{ opacity: 0.85 }}>Ventas Hoy</h6>
                  <h3 className="fw-bold mb-0">{estadisticas.ventas_hoy?.cantidad || 0}</h3>
                  <p className="small mb-0 mt-2">
                    {formatearPrecio(estadisticas.ventas_hoy?.ingresos)}
                  </p>
                </div>
                <IconoDinero />
              </div>
            </div>
          </div>
        </div>

        {/* Ventas del Mes */}
        <div className="col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-secondary">
            <div className="card-body text-white">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="mb-2" style={{ opacity: 0.85 }}>Ventas del Mes</h6>
                  <h3 className="fw-bold mb-0">{estadisticas.ventas_mes?.cantidad || 0}</h3>
                  <p className="small mb-0 mt-2">
                    {formatearPrecio(estadisticas.ventas_mes?.ingresos)}
                  </p>
                </div>
                <IconoDinero />
              </div>
            </div>
          </div>
        </div>

        {/* Total de Libros en Catálogo */}
        <div className="col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-info">
            <div className="card-body text-white">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="mb-2" style={{ opacity: 0.85 }}>Catálogo</h6>
                  <h3 className="fw-bold mb-0">{estadisticas.total_libros || 0}</h3>
                  <p className="small mb-0 mt-2">Libros registrados</p>
                </div>
                <IconoLibros />
              </div>
            </div>
          </div>
        </div>

        {/* Alertas de Stock Bajo */}
        <div className="col-sm-6 col-md-3">
          <div className={`card border-0 shadow-sm h-100 ${
            (estadisticas.alertas_stock || 0) > 0 ? 'bg-danger' : 'bg-success'
          }`}>
            <div className="card-body text-white">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="mb-2" style={{ opacity: 0.85 }}>Alertas Stock</h6>
                  <h3 className="fw-bold mb-0">{estadisticas.alertas_stock || 0}</h3>
                  <p className="small mb-0 mt-2">
                    {(estadisticas.alertas_stock || 0) > 0 ? 'Requieren reposición' : 'Todo OK'}
                  </p>
                </div>
                <IconoAlerta />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────
          TABLAS DE RANKINGS
          ───────────────────────────────────────────────── */}
      <div className="row g-4">

        {/* Top 5 Productos Más Vendidos */}
        <div className="col-md-6">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0 fw-bold">Top 5 Productos Más Vendidos</h5>
            </div>
            <div className="card-body p-0">
              {(estadisticas.productos_mas_vendidos?.length || 0) === 0 ? (
                <p className="text-center text-muted py-4">No hay ventas registradas</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Libro</th>
                        <th>Autor</th>
                        <th className="text-center">Vendidos</th>
                        <th className="text-end">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estadisticas.productos_mas_vendidos.map((producto, idx) => (
                        <tr key={idx}>
                          <td className="fw-semibold">{producto.titulo}</td>
                          <td className="text-muted">{producto.autor || 'N/A'}</td>
                          <td className="text-center">
                            <span className="badge bg-primary">{producto.total_vendido}</span>
                          </td>
                          <td className="text-end text-success fw-bold">
                            {formatearPrecio(producto.ingresos_generados)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top 5 Mejores Clientes */}
        <div className="col-md-6">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0 fw-bold">Top 5 Mejores Clientes</h5>
            </div>
            <div className="card-body p-0">
              {(estadisticas.mejores_clientes?.length || 0) === 0 ? (
                <p className="text-center text-muted py-4">No hay clientes con compras</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Cliente</th>
                        <th className="text-center">Compras</th>
                        <th className="text-end">Total Gastado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estadisticas.mejores_clientes.map((cliente, idx) => (
                        <tr key={idx}>
                          <td>
                            <div className="fw-semibold">{cliente.nombre}</div>
                            <small className="text-muted">{cliente.documento}</small>
                          </td>
                          <td className="text-center">
                            <span className="badge bg-info">{cliente.total_compras}</span>
                          </td>
                          <td className="text-end text-success fw-bold">
                            {formatearPrecio(cliente.total_gastado)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────
            TABLA DE LIBROS CON STOCK BAJO
            Muestra libros que necesitan reabastecimiento
            ───────────────────────────────────────────────── */}
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0 fw-bold text-danger">Libros con Stock Bajo</h5>
            </div>
            <div className="card-body p-0">
              {(estadisticas.libros_stock_bajo?.length || 0) === 0 ? (
                <p className="text-center text-success py-4">No hay libros con stock bajo</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover table-striped mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="d-none d-md-table-cell">ID</th>
                        <th>Título</th>
                        <th className="d-none d-sm-table-cell">Autor</th>
                        <th className="text-center">Stock</th>
                        <th className="text-center d-none d-sm-table-cell">Mínimo</th>
                        <th className="text-center">Faltante</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estadisticas.libros_stock_bajo.map((libro) => (
                        <tr key={libro.id}>
                          <td className="d-none d-md-table-cell">#{libro.id}</td>
                          <td className="fw-semibold">{libro.titulo}</td>
                          <td className="text-muted d-none d-sm-table-cell">{libro.autor || 'N/A'}</td>
                          <td className="text-center">
                            <span className="badge bg-danger">{libro.stock_actual}</span>
                          </td>
                          <td className="text-center d-none d-sm-table-cell">{libro.stock_minimo}</td>
                          <td className="text-center text-danger fw-bold">{libro.faltante}</td>
                          <td>
                            <Link
                              to="/inventario"
                              className="btn btn-sm btn-outline-primary"
                            >
                              Reabastecer
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────
          GRÁFICAS - ANÁLISIS VISUAL
          ───────────────────────────────────────────────── */}
      <div className="row g-4 mt-2">

        {/* Gráfica de Barras: Ventas por Mes */}
        <div className="col-lg-7">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0 fw-bold">Ventas por Mes (últimos 6 meses)</h5>
            </div>
            <div className="card-body">
              {(estadisticas.ventas_por_mes?.length || 0) === 0 ? (
                <p className="text-center text-muted py-4">Sin datos de ventas mensuales</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={estadisticas.ventas_por_mes}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value, name) =>
                        name === 'ingresos'
                          ? [formatearPrecio(value), 'Ingresos']
                          : [value, 'N° Ventas']
                      }
                    />
                    <Legend />
                    <Bar dataKey="ventas" fill="#0d6efd" name="N° Ventas" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ingresos" fill="#198754" name="Ingresos" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Gráfica de Torta: Libros por Categoría */}
        <div className="col-lg-5">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0 fw-bold">Libros por Categoría</h5>
            </div>
            <div className="card-body">
              {(estadisticas.libros_por_categoria?.length || 0) === 0 ? (
                <p className="text-center text-muted py-4">Sin categorías registradas</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={estadisticas.libros_por_categoria}
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      dataKey="total"
                      nameKey="categoria"
                      label={({ categoria, percent }) =>
                        `${categoria} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={true}
                    >
                      {estadisticas.libros_por_categoria.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORES_GRAFICAS[index % COLORES_GRAFICAS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Libros']} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────
          ACCESOS DIRECTOS A MÓDULOS PRINCIPALES
          ───────────────────────────────────────────────── */}
      <div className="card shadow-sm border-0 mt-4">
        <div className="card-body">
          <h5 className="fw-bold mb-3">Accesos Directos</h5>
          <div className="d-flex flex-wrap gap-3">
            <Link to="/ventas" className="btn btn-primary px-4">
              Nueva Venta (POS)
            </Link>
            <Link to="/historial-ventas" className="btn btn-outline-primary px-4">
              Ver Historial de Ventas
            </Link>
            <Link to="/inventario" className="btn btn-outline-secondary px-4">
              Gestionar Inventario
            </Link>
            <Link to="/clientes" className="btn btn-outline-info px-4">
              Gestionar Clientes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inicio;
