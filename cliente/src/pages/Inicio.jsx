// =====================================================
// PÁGINA INICIO — DASHBOARD / PANEL DE CONTROL
// =====================================================
// Esta es la página principal que ve el administrador
// al iniciar sesión. Muestra indicadores clave del negocio
// (KPIs) y estadísticas en tiempo real.
//
// ¿Qué son los KPIs?
// KPI = Key Performance Indicator = Indicador Clave de Rendimiento.
// Son métricas que resumen el estado del negocio de un vistazo:
//   - Ventas de hoy (cantidad e ingresos)
//   - Ventas del mes
//   - Total de libros en catálogo
//   - Alertas de stock bajo
//
// LIBRERÍAS ESPECIALES USADAS:
//   Recharts: librería de React para gráficas (barras, torta).
//   Consume componentes como <BarChart>, <PieChart>, etc.
//   Los datos vienen del backend en el formato que Recharts espera.
//
// FLUJO DE DATOS:
//   1. El componente se monta (useEffect)
//   2. Llama a cargarEstadisticas() → GET /api/dashboard
//   3. El backend calcula todo con Promise.all (paralelo)
//   4. El estado `estadisticas` se actualiza
//   5. React re-renderiza con los nuevos datos
//
// 🔹 En la sustentación puedo decir:
// "El dashboard consume el endpoint /api/dashboard que ejecuta
//  todas las consultas en paralelo con Promise.all.
//  En el frontend usamos Recharts para visualizar las ventas
//  por mes (gráfica de barras) y libros por categoría (torta).
//  Los KPIs se muestran en tarjetas con colores semáforo:
//  verde = stock OK, rojo = stock bajo."
// =====================================================

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

// Importamos solo los componentes de Recharts que usamos.
// Recharts tiene tree-shaking: solo se incluye en el bundle
// lo que realmente se importa.
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';

// Paleta de colores para la gráfica de torta (libros por categoría).
// Se asignan cíclicamente: si hay más categorías que colores,
// el operador % hace que los colores se repitan.
const COLORES_GRAFICAS = [
  '#0d6efd', '#198754', '#0dcaf0', '#ffc107', '#dc3545',
  '#6f42c1', '#fd7e14', '#20c997', '#6c757d', '#d63384'
];

// ─────────────────────────────────────────────────────────
// ICONOS SVG INLINE
// ─────────────────────────────────────────────────────────
// Usamos SVGs inline en lugar de una librería de iconos
// para evitar dependencias extra. Estos son de Bootstrap Icons (MIT).
// Cada icono es un componente React pequeño que devuelve el SVG.

const IconoDinero = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
    <path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1H1zm7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
    <path d="M0 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V5zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V7a2 2 0 0 1-2-2H3z"/>
  </svg>
);

const IconoAlerta = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
  </svg>
);

const IconoLibros = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
    <path d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v11a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-11z"/>
    <path d="M9.5 1a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5h-4a.5.5 0 0 1-.5-.5v-12a.5.5 0 0 1 .5-.5h4z"/>
    <path d="M11 2.5v11a.5.5 0 0 0 .5.5h2a.5.5 0 0 0 .5-.5v-11A1.5 1.5 0 0 0 12.5 1h-2A1.5 1.5 0 0 0 11 2.5z"/>
  </svg>
);

// Mantenido para futura tarjeta de total de clientes
const IconoClientes = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
    <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
    <path fillRule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/>
  </svg>
);

// ─────────────────────────────────────────────────────────
// FORMATEADOR DE PRECIOS
// ─────────────────────────────────────────────────────────
// Creado FUERA del componente para que no se recree en cada render.
// Intl.NumberFormat es costoso de instanciar; hacerlo una vez
// y reutilizarlo es más eficiente.
// Formato colombiano: $1.234.567 (punto como separador de miles)
const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(precio || 0);

// ─────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL: Inicio (Dashboard)
// ─────────────────────────────────────────────────────────
const Inicio = () => {

  // ── ESTADOS ─────────────────────────────────────────
  // estadisticas: objeto con todos los datos del dashboard.
  // Empieza en null para distinguir "no cargado" de "sin datos".
  const [estadisticas, setEstadisticas] = useState(null);

  // cargando: controla el spinner mientras se obtienen los datos
  const [cargando, setCargando] = useState(true);

  // error: guarda el mensaje de error si la petición falla
  const [error, setError] = useState(null);

  // ── CARGAR DATOS AL MONTAR ────────────────────────────
  // useEffect con [] vacío = se ejecuta una sola vez al montar.
  // Es el equivalente React de "al cargar la página, pedir los datos".
  useEffect(() => {
    cargarEstadisticas();
  }, []);

  // ── FUNCIÓN DE CARGA ──────────────────────────────────
  // useCallback memoriza la función para que no se recree
  // en cada render. Importante porque la referencia estable
  // evita loops infinitos si se usa en dependencias de useEffect.
  const cargarEstadisticas = useCallback(async () => {
    try {
      setCargando(true);

      // GET /api/dashboard → el controlador calcula todas las
      // estadísticas en paralelo con Promise.all
      const respuesta = await api.get('/dashboard');

      // El backend puede responder como { exito, datos: {...} }
      // o directamente como el objeto de estadísticas.
      // El operador || maneja ambos formatos.
      setEstadisticas(respuesta.data.datos || respuesta.data);
      setError(null);
    } catch (err) {
      // Solo logueamos en desarrollo para no exponer info en producción
      if (import.meta.env.DEV) {
        console.error('[Dashboard] Error al cargar estadísticas:', err);
      }
      setError('Error al cargar estadísticas del dashboard');
    } finally {
      // finally siempre se ejecuta: quita el spinner haya error o no
      setCargando(false);
    }
  }, []);

  // ── ESTADOS DE CARGA Y ERROR ──────────────────────────
  // Devolvemos JSX diferente según el estado actual.
  // Este patrón "early return" mantiene el render principal limpio.

  if (cargando) {
    return (
      <div className="container mt-5 text-center">
        {/* Bootstrap spinner — la clase visually-hidden esconde el texto
            para usuarios normales pero lo hace legible para lectores de pantalla */}
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
        <p className="mt-2 text-muted">Cargando indicadores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <h5>Error al cargar el dashboard</h5>
          <p>{error}</p>
          {/* El usuario puede reintentar sin recargar la página completa */}
          <button onClick={cargarEstadisticas} className="btn btn-primary">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

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

  // ── RENDER PRINCIPAL ──────────────────────────────────
  // Solo llega aquí cuando cargando=false, error=null y estadisticas≠null
  return (
    <div className="container-fluid py-4">

      {/* ── ENCABEZADO CON BOTÓN DE ACTUALIZAR ── */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        {/* clamp() CSS: tamaño de fuente responsivo entre 1.1rem y 1.75rem */}
        <h2 className="fw-bold mb-0" style={{ fontSize: 'clamp(1.1rem, 3vw, 1.75rem)' }}>
          Panel de Control
        </h2>
        {/* Actualizar sin recargar la página — llama a la misma función de carga */}
        <button
          onClick={cargarEstadisticas}
          className="btn btn-outline-primary btn-sm flex-shrink-0"
          title="Actualizar estadísticas"
        >
          Actualizar
        </button>
      </div>

      {/* ── KPIs PRINCIPALES — 4 TARJETAS ── */}
      {/* Sistema de grid Bootstrap: en móvil 2 columnas, en desktop 4 */}
      <div className="row g-3 mb-4">

        {/* KPI 1: Ventas del día */}
        <div className="col-sm-6 col-md-3">
          <div className="card border-0 shadow-sm h-100 bg-primary">
            <div className="card-body text-white">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="mb-2" style={{ opacity: 0.85 }}>Ventas Hoy</h6>
                  {/* ?. = optional chaining: si ventas_hoy es undefined, devuelve undefined en vez de lanzar error */}
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

        {/* KPI 2: Ventas del mes */}
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

        {/* KPI 3: Total de libros en catálogo */}
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

        {/* KPI 4: Alertas de stock bajo — color semáforo */}
        {/* Si hay alertas: rojo (bg-danger), si no: verde (bg-success) */}
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

      {/* ── TABLAS DE RANKINGS ── */}
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
                        // idx como key: aceptable aquí porque esta lista no se reordena
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

        {/* ── TABLA DE LIBROS CON STOCK BAJO ── */}
        {/* Muestra libros cuyo stock_actual < stock_minimo según el backend */}
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
                        {/* d-none d-md-table-cell: ocultar en móvil, mostrar en desktop */}
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
                            {/* Link de React Router — no recarga la página completa */}
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

      {/* ── GRÁFICAS CON RECHARTS ── */}
      {/* ResponsiveContainer hace que las gráficas se adapten al ancho del contenedor */}
      <div className="row g-4 mt-2">

        {/* Gráfica de Barras: Ventas por Mes (últimos 6 meses) */}
        {/* Permite ver tendencias de venta mes a mes */}
        <div className="col-lg-7">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0 fw-bold">Ventas por Mes (últimos 6 meses)</h5>
            </div>
            <div className="card-body">
              {(estadisticas.ventas_por_mes?.length || 0) === 0 ? (
                <p className="text-center text-muted py-4">Sin datos de ventas mensuales</p>
              ) : (
                // width="100%" hace que la gráfica ocupe todo el ancho disponible
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={estadisticas.ventas_por_mes}
                    margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    {/* dataKey="mes" → propiedad del objeto de datos que va en el eje X */}
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    {/* Tooltip: cuadro que aparece al hacer hover sobre las barras */}
                    <Tooltip
                      formatter={(value, name) =>
                        name === 'ingresos'
                          ? [formatearPrecio(value), 'Ingresos']
                          : [value, 'N° Ventas']
                      }
                    />
                    <Legend />
                    {/* radius: bordes redondeados en la parte superior de las barras */}
                    <Bar dataKey="ventas" fill="#0d6efd" name="N° Ventas" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ingresos" fill="#198754" name="Ingresos" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Gráfica de Torta: Distribución de libros por categoría */}
        {/* Permite ver qué tipos de libros predominan en el catálogo */}
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
                      cx="50%"   // Centro horizontal de la torta
                      cy="50%"   // Centro vertical de la torta
                      outerRadius={90}
                      dataKey="total"       // Valor numérico para el tamaño del slice
                      nameKey="categoria"   // Nombre que aparece en la etiqueta
                      label={({ categoria, percent }) =>
                        // Muestra: "Ficción (35%)" en cada slice
                        `${categoria} (${(percent * 100).toFixed(0)}%)`
                      }
                      labelLine={true}
                    >
                      {/* Cada slice (Cell) recibe un color de la paleta */}
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

      {/* ── ACCESOS DIRECTOS ── */}
      {/* Links rápidos a los módulos más usados desde el dashboard */}
      <div className="card shadow-sm border-0 mt-4">
        <div className="card-body">
          <h5 className="fw-bold mb-3">Accesos Directos</h5>
          <div className="d-flex flex-wrap gap-3">
            {/* Link de React Router: navegación SPA sin recarga de página */}
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