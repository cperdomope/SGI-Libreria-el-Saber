// =====================================================
// PÁGINA INICIO — DASHBOARD / PANEL DE CONTROL
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Es la página principal del administrador. Muestra un resumen
//   visual de TODO el negocio: ventas, inventario, clientes,
//   tendencias y alertas. Es como el "tablero de un carro"
//   pero para la librería.
//
// ¿Cómo se conecta con el sistema?
//   1. El componente se monta → useEffect se ejecuta
//   2. Llama a GET /api/dashboard con el token JWT
//   3. El backend calcula todo con Promise.all (en paralelo)
//   4. Los datos llegan y se guardan en el estado "estadisticas"
//   5. React re-renderiza con los datos nuevos
//
// ¿Por qué es importante?
//   Permite al administrador tomar decisiones rápidas:
//   - ¿Se vendió hoy? → KPI de ventas del día
//   - ¿Qué libro se agota? → Tabla de stock bajo
//   - ¿Cuál es la tendencia? → Gráfica de ventas por mes
//   - ¿Quiénes compran más? → Ranking de clientes
//
// LIBRERÍAS USADAS:
//   Recharts → Para las gráficas (barras, áreas, dona)
//   React → useState, useEffect, useCallback
//
// =====================================================

import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

// Importamos los componentes de Recharts que necesitamos
// Recharts funciona con componentes: <BarChart>, <AreaChart>, <PieChart>
import {
  BarChart, Bar,
  AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

// ─────────────────────────────────────────────────────
// PALETA DE COLORES DEL DASHBOARD
// ─────────────────────────────────────────────────────
// Colores que combinan con el tema Evergreen de la app
const COLORES = {
  // Para las gráficas de torta/dona
  graficas: [
    '#053225', '#e34a6f', '#60a561', '#3b82f6',
    '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6',
    '#f97316', '#6366f1'
  ],
  // Para las gráficas de líneas y áreas
  ventas:   '#053225',
  ingresos: '#60a561',
  barras:   '#e34a6f'
};

// ─────────────────────────────────────────────────────
// FORMATEADOR DE PRECIOS (formato colombiano: $1.234.567)
// ─────────────────────────────────────────────────────
// Lo creamos FUERA del componente para que no se recree cada vez
const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(precio || 0);

// Formato corto para valores grandes (ej: $1.5M, $850K)
const formatearCorto = (valor) => {
  if (valor >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1)}M`;
  if (valor >= 1_000)     return `$${(valor / 1_000).toFixed(0)}K`;
  return formatearPrecio(valor);
};

// ─────────────────────────────────────────────────────
// COMPONENTE: Tarjeta KPI (Indicador Clave)
// ─────────────────────────────────────────────────────
// Cada tarjeta muestra una métrica importante del negocio.
// Props:
//   titulo    → Nombre del indicador (ej: "Ventas Hoy")
//   valor     → El número grande (ej: 15)
//   subtexto  → Texto debajo del número (ej: "$500.000")
//   icono     → Componente SVG del icono
//   color     → Color de fondo de la tarjeta
//   tendencia → Porcentaje de crecimiento (opcional)
const TarjetaKPI = ({ titulo, valor, subtexto, icono, color, tendencia }) => (
  <div className="col-6 col-lg-3">
    <div
      className="card border-0 h-100 text-white position-relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        borderRadius: '16px'
      }}
    >
      {/* Círculo decorativo de fondo */}
      <div
        className="position-absolute"
        style={{
          right: -20, top: -20,
          width: 100, height: 100,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)'
        }}
      />
      <div className="card-body py-3 px-3">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <span style={{ opacity: 0.9, fontSize: '0.8rem', fontWeight: 600 }}>
            {titulo}
          </span>
          <span style={{ opacity: 0.7 }}>{icono}</span>
        </div>
        <h3 className="fw-bold mb-1" style={{ fontSize: 'clamp(1.3rem, 3vw, 1.8rem)' }}>
          {valor}
        </h3>
        <div className="d-flex justify-content-between align-items-center">
          <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>{subtexto}</span>
          {/* Indicador de crecimiento (flecha arriba/abajo) */}
          {tendencia !== undefined && tendencia !== 0 && (
            <span
              className="badge"
              style={{
                fontSize: '0.7rem',
                background: tendencia > 0 ? 'rgba(255,255,255,0.25)' : 'rgba(255,0,0,0.3)',
                color: '#fff'
              }}
            >
              {tendencia > 0 ? '▲' : '▼'} {Math.abs(tendencia)}%
            </span>
          )}
        </div>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────
// TOOLTIP PERSONALIZADO PARA GRÁFICAS
// ─────────────────────────────────────────────────────
// Cuando el usuario pasa el mouse sobre una gráfica,
// aparece este cuadro con los datos formateados
const TooltipPersonalizado = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.97)',
        border: '1px solid #e5e7eb',
        borderRadius: 10, padding: '10px 14px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        fontSize: '0.82rem'
      }}
    >
      <p className="fw-bold mb-1" style={{ color: '#053225' }}>{label}</p>
      {payload.map((item, i) => (
        <p key={i} className="mb-0" style={{ color: item.color }}>
          {item.name}: {item.name.includes('ngreso') ? formatearPrecio(item.value) : item.value}
        </p>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────
// ICONOS SVG (Bootstrap Icons — MIT License)
// ─────────────────────────────────────────────────────
// Usamos SVGs directos para no agregar dependencias extra
const s = 20; // tamaño estándar

const IconoVentas = () => (
  <svg width={s} height={s} fill="currentColor" viewBox="0 0 16 16">
    <path d="M0 3a2 2 0 0 1 2-2h13.5a.5.5 0 0 1 0 1H15v2a1 1 0 0 1 1 1v8.5a1.5 1.5 0 0 1-1.5 1.5h-12A2.5 2.5 0 0 1 0 12.5V3zm1 1.732V12.5A1.5 1.5 0 0 0 2.5 14h12a.5.5 0 0 0 .5-.5V5H2a1.99 1.99 0 0 1-1-.268zM1 3a1 1 0 0 0 1 1h12V2H2a1 1 0 0 0-1 1z"/>
  </svg>
);

const IconoLibros = () => (
  <svg width={s} height={s} fill="currentColor" viewBox="0 0 16 16">
    <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
  </svg>
);

const IconoClientes = () => (
  <svg width={s} height={s} fill="currentColor" viewBox="0 0 16 16">
    <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1H7Zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/>
    <path fillRule="evenodd" d="M5.216 14A2.238 2.238 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.325 6.325 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1h4.216ZM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/>
  </svg>
);

const IconoAlerta = () => (
  <svg width={s} height={s} fill="currentColor" viewBox="0 0 16 16">
    <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
  </svg>
);

const IconoInventario = () => (
  <svg width={s} height={s} fill="currentColor" viewBox="0 0 16 16">
    <path d="M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5l2.404.961L10.404 2l-2.218-.887zm3.564 1.426L5.596 5 8 5.961 14.154 3.5l-2.404-.961zm3.25 1.7-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z"/>
  </svg>
);

const IconoSemana = () => (
  <svg width={s} height={s} fill="currentColor" viewBox="0 0 16 16">
    <path d="M11 6.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm-5 3a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1zm3 0a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5v-1z"/>
    <path d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5zM1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4H1z"/>
  </svg>
);

// =====================================================
// COMPONENTE PRINCIPAL: Inicio (Dashboard)
// =====================================================
const Inicio = () => {

  // ── ESTADOS ──
  // useState guarda datos que, al cambiar, hacen que React redibuje la pantalla.
  const [estadisticas, setEstadisticas] = useState(null); // Datos del dashboard
  const [cargando, setCargando]         = useState(true);  // ¿Está cargando?
  const [error, setError]               = useState(null);  // ¿Hubo error?

  // ── FUNCION QUE PIDE LOS DATOS AL BACKEND ──
  // useCallback con dependencias vacias [] memoriza la funcion para que
  // se cree una sola vez. Esto es necesario para poder incluirla como
  // dependencia del useEffect sin causar re-ejecuciones infinitas.
  const cargarEstadisticas = useCallback(async () => {
    try {
      setCargando(true);
      const respuesta = await api.get('/dashboard');
      setEstadisticas(respuesta.data.datos || respuesta.data);
      setError(null);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Dashboard] Error:', err);
      setError('Error al cargar estadisticas del dashboard');
    } finally {
      // finally SIEMPRE se ejecuta: quita el spinner haya error o no
      setCargando(false);
    }
  }, []);

  // ── CARGAR DATOS AL MONTAR EL COMPONENTE ──
  // Incluimos cargarEstadisticas en las dependencias para cumplir
  // la regla exhaustive-deps del linter de React Hooks.
  // Como cargarEstadisticas esta envuelta en useCallback([]),
  // su referencia nunca cambia y el efecto solo se ejecuta una vez.
  useEffect(() => {
    cargarEstadisticas();
  }, [cargarEstadisticas]);

  // ── ESTADOS DE CARGA Y ERROR (early return) ──
  // Mostramos pantallas diferentes según el estado actual

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

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <h5>Error al cargar el dashboard</h5>
          <p>{error}</p>
          <button onClick={cargarEstadisticas} className="btn btn-primary">Reintentar</button>
        </div>
      </div>
    );
  }

  if (!estadisticas) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          No hay datos disponibles
          <button onClick={cargarEstadisticas} className="btn btn-primary ms-3">Cargar datos</button>
        </div>
      </div>
    );
  }

  // Datos auxiliares para el render
  const est = estadisticas;

  // ══════════════════════════════════════════════════════
  // RENDER PRINCIPAL DEL DASHBOARD
  // ══════════════════════════════════════════════════════
  return (
    <div className="container-fluid py-4" style={{ maxWidth: 1400 }}>

      {/* ── ENCABEZADO ── */}
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <div>
          <h2 className="fw-bold mb-0" style={{ fontSize: 'clamp(1.2rem, 3vw, 1.6rem)' }}>
            Panel de Control
          </h2>
          <small className="text-muted">
            Resumen general del negocio — {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </small>
        </div>
        <button
          onClick={cargarEstadisticas}
          className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
          title="Actualizar datos"
        >
          <svg width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
            <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
          </svg>
          Actualizar
        </button>
      </div>

      {/* ════════════════════════════════════════════════
          FILA 1: KPIs PRINCIPALES (6 tarjetas)
          ════════════════════════════════════════════════ */}
      <div className="row g-3 mb-4">
        <TarjetaKPI
          titulo="Ventas Hoy"
          valor={est.ventas_hoy?.cantidad || 0}
          subtexto={formatearPrecio(est.ventas_hoy?.ingresos)}
          icono={<IconoVentas />}
          color="#053225"
        />
        <TarjetaKPI
          titulo="Ventas Semana"
          valor={est.ventas_semana?.cantidad || 0}
          subtexto={formatearPrecio(est.ventas_semana?.ingresos)}
          icono={<IconoSemana />}
          color="#1e6b54"
        />
        <TarjetaKPI
          titulo="Ventas del Mes"
          valor={est.ventas_mes?.cantidad || 0}
          subtexto={formatearPrecio(est.ventas_mes?.ingresos)}
          icono={<IconoVentas />}
          color="#3b82f6"
          tendencia={est.ventas_mes?.crecimiento}
        />
        <TarjetaKPI
          titulo="Alertas Stock"
          valor={est.alertas_stock || 0}
          subtexto={(est.alertas_stock || 0) > 0 ? 'Requieren reposición' : 'Todo en orden'}
          icono={<IconoAlerta />}
          color={(est.alertas_stock || 0) > 0 ? '#e34a6f' : '#60a561'}
        />
      </div>

      {/* ════════════════════════════════════════════════
          FILA 2: MÉTRICAS SECUNDARIAS (3 tarjetas)
          ════════════════════════════════════════════════ */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
            <div className="card-body d-flex align-items-center gap-3">
              <div className="rounded-3 p-2" style={{ background: 'rgba(5,50,37,0.08)' }}>
                <IconoLibros />
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: '0.78rem' }}>Total Libros</div>
                <h4 className="fw-bold mb-0">{est.total_libros || 0}</h4>
              </div>
              <div className="ms-auto text-end">
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Unidades en stock</div>
                <span className="fw-semibold">{(est.inventario?.unidades_totales || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
            <div className="card-body d-flex align-items-center gap-3">
              <div className="rounded-3 p-2" style={{ background: 'rgba(227,74,111,0.08)' }}>
                <IconoInventario />
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: '0.78rem' }}>Valor Inventario</div>
                <h4 className="fw-bold mb-0">{formatearCorto(est.inventario?.valor_total || 0)}</h4>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
            <div className="card-body d-flex align-items-center gap-3">
              <div className="rounded-3 p-2" style={{ background: 'rgba(59,130,246,0.08)' }}>
                <IconoClientes />
              </div>
              <div>
                <div className="text-muted" style={{ fontSize: '0.78rem' }}>Clientes</div>
                <h4 className="fw-bold mb-0">{est.total_clientes || 0}</h4>
              </div>
              <div className="ms-auto text-end">
                <div className="text-muted" style={{ fontSize: '0.72rem' }}>Proveedores</div>
                <span className="fw-semibold">{est.total_proveedores || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          FILA 3: GRÁFICAS PRINCIPALES
          ════════════════════════════════════════════════ */}
      <div className="row g-4 mb-4">

        {/* ── GRÁFICA: Tendencia de Ventas por Mes (Área) ── */}
        <div className="col-lg-8">
          <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
            <div className="card-header bg-white border-0 pt-3 pb-0 px-4">
              <h6 className="fw-bold mb-0">Tendencia de Ventas — Últimos 6 meses</h6>
            </div>
            <div className="card-body px-2">
              {(est.ventas_por_mes?.length || 0) === 0 ? (
                <p className="text-center text-muted py-5">Sin datos de ventas mensuales</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={est.ventas_por_mes} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <defs>
                      {/* Degradado para rellenar el área bajo la curva */}
                      <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#053225" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#053225" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a561" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#60a561" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#666' }} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#666' }} axisLine={false} />
                    <Tooltip content={<TooltipPersonalizado />} />
                    <Legend />
                    <Area
                      type="monotone" dataKey="ventas" name="N° Ventas"
                      stroke="#60a561" fill="url(#colorVentas)" strokeWidth={2.5}
                    />
                    <Area
                      type="monotone" dataKey="ingresos" name="Ingresos"
                      stroke="#053225" fill="url(#colorIngresos)" strokeWidth={2.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ── GRÁFICA: Distribución por Categoría (Dona) ── */}
        <div className="col-lg-4">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
            <div className="card-header bg-white border-0 pt-3 pb-0 px-4">
              <h6 className="fw-bold mb-0">Libros por Categoría</h6>
            </div>
            <div className="card-body d-flex flex-column">
              {(est.libros_por_categoria?.length || 0) === 0 ? (
                <p className="text-center text-muted py-5">Sin categorías</p>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={est.libros_por_categoria}
                        cx="50%" cy="50%"
                        innerRadius={50} outerRadius={80}
                        dataKey="total" nameKey="categoria"
                        paddingAngle={3} cornerRadius={4}
                      >
                        {est.libros_por_categoria.map((_, i) => (
                          <Cell key={i} fill={COLORES.graficas[i % COLORES.graficas.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, 'Libros']} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Leyenda personalizada debajo de la dona */}
                  <div className="mt-2 px-2" style={{ maxHeight: 100, overflowY: 'auto' }}>
                    {est.libros_por_categoria.map((cat, i) => (
                      <div key={i} className="d-flex justify-content-between align-items-center py-1"
                        style={{ fontSize: '0.78rem', borderBottom: '1px solid #f3f4f6' }}>
                        <span className="d-flex align-items-center gap-2">
                          <span style={{
                            width: 10, height: 10, borderRadius: 3,
                            background: COLORES.graficas[i % COLORES.graficas.length]
                          }} />
                          {cat.categoria}
                        </span>
                        <span className="fw-semibold">{cat.total}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          FILA 4: GRÁFICA DE DÍAS + ÚLTIMAS VENTAS
          ════════════════════════════════════════════════ */}
      <div className="row g-4 mb-4">

        {/* ── GRÁFICA: Ventas por Día de la Semana ── */}
        <div className="col-lg-5">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
            <div className="card-header bg-white border-0 pt-3 pb-0 px-4">
              <h6 className="fw-bold mb-0">Ventas por Día de la Semana</h6>
              <small className="text-muted">Últimos 30 días</small>
            </div>
            <div className="card-body px-2">
              {(est.ventas_por_dia_semana?.length || 0) === 0 ? (
                <p className="text-center text-muted py-4">Sin datos</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={est.ventas_por_dia_semana} margin={{ top: 5, right: 15, left: 5, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="dia" tick={{ fontSize: 11 }} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} />
                    <Tooltip content={<TooltipPersonalizado />} />
                    <Bar
                      dataKey="ventas" name="N° Ventas"
                      fill="#e34a6f" radius={[6, 6, 0, 0]}
                      maxBarSize={35}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ── TABLA: Últimas Ventas Realizadas ── */}
        <div className="col-lg-7">
          <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 14 }}>
            <div className="card-header bg-white border-0 pt-3 pb-0 px-4 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">Últimas Ventas</h6>
              <Link to="/historial-ventas" className="btn btn-sm btn-outline-primary" style={{ fontSize: '0.75rem' }}>
                Ver todo
              </Link>
            </div>
            <div className="card-body p-0">
              {(est.ultimas_ventas?.length || 0) === 0 ? (
                <p className="text-center text-muted py-4">Sin ventas recientes</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0" style={{ fontSize: '0.83rem' }}>
                    <thead>
                      <tr style={{ background: '#f8faf9' }}>
                        <th className="border-0 ps-4">ID</th>
                        <th className="border-0">Cliente</th>
                        <th className="border-0">Vendedor</th>
                        <th className="border-0">Pago</th>
                        <th className="border-0 text-end pe-4">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {est.ultimas_ventas.map((v) => (
                        <tr key={v.id}>
                          <td className="ps-4 fw-semibold">#{v.id}</td>
                          <td>{v.cliente}</td>
                          <td className="text-muted">{v.vendedor}</td>
                          <td>
                            <span className="badge" style={{
                              background:
                                v.metodo_pago === 'Efectivo' ? 'rgba(96,165,97,0.15)' :
                                v.metodo_pago === 'Tarjeta'  ? 'rgba(59,130,246,0.15)' :
                                'rgba(178,161,152,0.2)',
                              color:
                                v.metodo_pago === 'Efectivo' ? '#2d6e2f' :
                                v.metodo_pago === 'Tarjeta'  ? '#2563eb' : '#666',
                              fontSize: '0.72rem'
                            }}>
                              {v.metodo_pago}
                            </span>
                          </td>
                          <td className="text-end pe-4 fw-bold" style={{ color: '#053225' }}>
                            {formatearPrecio(v.total)}
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

      {/* ════════════════════════════════════════════════
          FILA 5: RANKINGS (Top Productos + Top Clientes)
          ════════════════════════════════════════════════ */}
      <div className="row g-4 mb-4">

        {/* ── Top 5 Productos Más Vendidos ── */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
            <div className="card-header bg-white border-0 pt-3 pb-2 px-4">
              <h6 className="fw-bold mb-0">Top 5 Productos Más Vendidos</h6>
            </div>
            <div className="card-body p-0">
              {(est.productos_mas_vendidos?.length || 0) === 0 ? (
                <p className="text-center text-muted py-4">No hay ventas registradas</p>
              ) : (
                <div className="px-4 pb-3">
                  {est.productos_mas_vendidos.map((prod, idx) => {
                    // Calculamos el porcentaje relativo al más vendido (para la barra)
                    const maxVendido = est.productos_mas_vendidos[0]?.total_vendido || 1;
                    const porcentaje = (prod.total_vendido / maxVendido) * 100;
                    return (
                      <div key={idx} className="py-2" style={{ borderBottom: idx < est.productos_mas_vendidos.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div>
                            <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>
                              <span className="text-muted me-2">#{idx + 1}</span>
                              {prod.titulo}
                            </span>
                            <br />
                            <small className="text-muted">{prod.autor}</small>
                          </div>
                          <div className="text-end">
                            <span className="badge bg-primary">{prod.total_vendido} uds</span>
                            <br />
                            <small className="fw-bold" style={{ color: '#60a561', fontSize: '0.75rem' }}>
                              {formatearPrecio(prod.ingresos_generados)}
                            </small>
                          </div>
                        </div>
                        {/* Barra de progreso visual */}
                        <div className="progress" style={{ height: 4, borderRadius: 4 }}>
                          <div
                            className="progress-bar"
                            style={{ width: `${porcentaje}%`, background: '#053225', borderRadius: 4 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Top 5 Mejores Clientes ── */}
        <div className="col-md-6">
          <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
            <div className="card-header bg-white border-0 pt-3 pb-2 px-4">
              <h6 className="fw-bold mb-0">Top 5 Mejores Clientes</h6>
            </div>
            <div className="card-body p-0">
              {(est.mejores_clientes?.length || 0) === 0 ? (
                <p className="text-center text-muted py-4">No hay clientes con compras</p>
              ) : (
                <div className="px-4 pb-3">
                  {est.mejores_clientes.map((cliente, idx) => {
                    const maxCompras = est.mejores_clientes[0]?.total_compras || 1;
                    const porcentaje = (cliente.total_compras / maxCompras) * 100;
                    return (
                      <div key={idx} className="py-2" style={{ borderBottom: idx < est.mejores_clientes.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div className="d-flex align-items-center gap-2">
                            {/* Avatar con la inicial del nombre */}
                            <div
                              className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white"
                              style={{
                                width: 32, height: 32, fontSize: '0.75rem',
                                background: COLORES.graficas[idx % COLORES.graficas.length]
                              }}
                            >
                              {(cliente.nombre || 'C')[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>{cliente.nombre}</span>
                              <br />
                              <small className="text-muted">{cliente.documento}</small>
                            </div>
                          </div>
                          <div className="text-end">
                            <span className="badge" style={{ background: 'rgba(59,130,246,0.12)', color: '#2563eb' }}>
                              {cliente.total_compras} compras
                            </span>
                            <br />
                            <small className="fw-bold" style={{ color: '#053225', fontSize: '0.75rem' }}>
                              {formatearPrecio(cliente.total_gastado)}
                            </small>
                          </div>
                        </div>
                        <div className="progress" style={{ height: 4, borderRadius: 4 }}>
                          <div
                            className="progress-bar"
                            style={{ width: `${porcentaje}%`, background: '#e34a6f', borderRadius: 4 }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          FILA 6: ALERTAS DE STOCK BAJO
          ════════════════════════════════════════════════ */}
      <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 14 }}>
        <div className="card-header bg-white border-0 pt-3 pb-2 px-4 d-flex justify-content-between align-items-center">
          <div>
            <h6 className="fw-bold mb-0" style={{ color: (est.alertas_stock || 0) > 0 ? '#e34a6f' : '#60a561' }}>
              {(est.alertas_stock || 0) > 0
                ? `Libros con Stock Bajo (${est.alertas_stock})`
                : 'Stock OK — Sin alertas'
              }
            </h6>
          </div>
          {(est.alertas_stock || 0) > 0 && (
            <Link to="/inventario" className="btn btn-sm btn-outline-primary" style={{ fontSize: '0.75rem' }}>
              Ir a Inventario
            </Link>
          )}
        </div>
        <div className="card-body p-0">
          {(est.libros_stock_bajo?.length || 0) === 0 ? (
            <div className="text-center py-4">
              <span style={{ fontSize: '2rem' }}>&#10003;</span>
              <p className="text-muted mt-1 mb-0">Todos los libros tienen stock suficiente</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0" style={{ fontSize: '0.83rem' }}>
                <thead>
                  <tr style={{ background: '#fef2f2' }}>
                    <th className="border-0 ps-4">Libro</th>
                    <th className="border-0 d-none d-sm-table-cell">Autor</th>
                    <th className="border-0 text-center">Actual</th>
                    <th className="border-0 text-center d-none d-sm-table-cell">Mínimo</th>
                    <th className="border-0 text-center">Faltante</th>
                    <th className="border-0">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {est.libros_stock_bajo.map((libro) => (
                    <tr key={libro.id}>
                      <td className="ps-4 fw-semibold">{libro.titulo}</td>
                      <td className="text-muted d-none d-sm-table-cell">{libro.autor}</td>
                      <td className="text-center">
                        <span className="badge bg-danger">{libro.stock_actual}</span>
                      </td>
                      <td className="text-center d-none d-sm-table-cell">{libro.stock_minimo}</td>
                      <td className="text-center fw-bold" style={{ color: '#e34a6f' }}>-{libro.faltante}</td>
                      <td>
                        <Link to="/inventario" className="btn btn-sm btn-outline-primary" style={{ fontSize: '0.72rem' }}>
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

      {/* ════════════════════════════════════════════════
          FILA 7: ACCESOS DIRECTOS
          ════════════════════════════════════════════════ */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: 14 }}>
        <div className="card-body px-4">
          <h6 className="fw-bold mb-3">Accesos Directos</h6>
          <div className="d-flex flex-wrap gap-2">
            <Link to="/ventas" className="btn btn-primary px-4">
              Nueva Venta (POS)
            </Link>
            <Link to="/historial-ventas" className="btn btn-outline-primary px-4">
              Historial de Ventas
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
