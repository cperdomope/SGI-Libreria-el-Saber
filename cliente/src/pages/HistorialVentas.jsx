// =====================================================
// PÁGINA: HISTORIAL DE VENTAS
// =====================================================
// Muestra todas las ventas registradas con herramientas
// para buscar, filtrar, ver detalles, exportar y anular.
//
// FUNCIONALIDADES PRINCIPALES:
//   1. Listado con paginación del servidor (no carga todo a la vez)
//   2. Búsqueda por nombre de cliente (con debounce)
//   3. Filtro por rango de fechas
//   4. Modal de detalle con todos los productos de una venta
//   5. Generar PDF tipo ticket POS (jsPDF)
//   6. Exportar listado a Excel (xlsx)
//   7. Anular venta — solo administradores (revierte el stock)
//
// CONCEPTOS TÉCNICOS IMPORTANTES:
//
// PAGINACIÓN DEL SERVIDOR:
// No traemos todas las ventas de una vez (podría ser miles).
// El backend recibe `pagina` y `limite` y devuelve solo esa página.
// Así la respuesta es siempre pequeña y rápida.
//
// DEBOUNCE:
// Cuando el usuario escribe en el buscador, no queremos
// hacer una petición por cada tecla presionada (sería ineficiente).
// Con debounce esperamos 400ms de silencio antes de buscar.
// Si el usuario sigue escribiendo, el timer se reinicia.
// Implementado con setTimeout/clearTimeout en el useEffect.
//
// jsPDF:
// Librería que genera archivos PDF directamente en el browser,
// sin necesidad de un servidor. Dibujamos texto y líneas
// en coordenadas (mm) para crear el ticket tipo punto de venta.
//
// XLSX:
// Librería para generar archivos Excel (.xlsx) en el browser.
// Convierte un arreglo de objetos JSON a una hoja de cálculo.
//
// 🔹 En la sustentación puedo decir:
// "HistorialVentas implementa paginación del lado del servidor:
//  en lugar de traer todas las ventas, pedimos una página a la vez.
//  Tiene debounce en el buscador para no saturar la API con cada
//  tecla. El PDF se genera en el browser con jsPDF simulando un
//  ticket POS real de 80mm. El Excel se genera con la librería xlsx.
//  La anulación solo es visible para administradores gracias a
//  esAdministrador() del AuthContext."
// =====================================================

import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// jsPDF: genera PDFs en el browser sin servidor
import jsPDF from 'jspdf';

// XLSX: genera archivos Excel en el browser
import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────
// ICONO SVG INLINE
// ─────────────────────────────────────────────────────────
const IconoOjo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
  </svg>
);

// Cuántas ventas mostrar por página en la tabla
const ELEMENTOS_POR_PAGINA = 10;

// ─────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────
const HistorialVentas = () => {
  // esAdministrador(): función del AuthContext que verifica el rol.
  // La usamos para mostrar/ocultar el botón "Anular Venta".
  const { esAdministrador } = useAuth();

  // ── ESTADOS DE DATOS ────────────────────────────────
  const [ventas, setVentas]       = useState([]);     // Lista de ventas de la página actual
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState(null);

  // ── ESTADOS DEL MODAL DE DETALLE ────────────────────
  const [mostrarModal, setMostrarModal]       = useState(false);
  const [detalleVenta, setDetalleVenta]       = useState(null);  // { venta, items }
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // ── ESTADOS DE FILTROS Y BÚSQUEDA ───────────────────
  const [buscar, setBuscar]           = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin]       = useState('');

  // ── ESTADOS DE PAGINACIÓN ────────────────────────────
  // La paginación es del servidor: totalRegistros viene del backend
  const [paginaActual, setPaginaActual]     = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // ── ESTADO DE ANULACIÓN ──────────────────────────────
  const [anulando, setAnulando] = useState(false);  // Evita doble clic

  // ─────────────────────────────────────────────────────
  // CARGA DE DATOS (con paginación del servidor)
  // ─────────────────────────────────────────────────────
  // useCallback con dependencias [buscar, fechaInicio, fechaFin]:
  // la función se recrea cuando cambia algún filtro.
  // Esto es necesario porque el useEffect depende de cargarVentas,
  // y necesita la versión actualizada cuando cambian los filtros.
  const cargarVentas = useCallback(async (pagina = 1) => {
    try {
      setCargando(true);

      // Construir los parámetros de la query string.
      // Solo se envían los filtros que tienen valor (no enviamos vacíos).
      const params = { pagina, limite: ELEMENTOS_POR_PAGINA };
      if (buscar)      params.buscar      = buscar;
      if (fechaInicio) params.fechaInicio = fechaInicio;
      if (fechaFin)    params.fechaFin    = fechaFin;

      // GET /api/ventas?pagina=1&limite=10&buscar=...
      // Axios serializa automáticamente el objeto params a query string
      const respuesta = await api.get('/ventas', { params });

      const { datos, paginacion } = respuesta.data;
      setVentas(Array.isArray(datos) ? datos : []);

      // totalRegistros viene del backend para calcular el total de páginas
      setTotalRegistros(paginacion?.totalRegistros ?? 0);
      setPaginaActual(pagina);
      setError(null);
    } catch (err) {
      setError('Error al cargar el historial de ventas');
      if (import.meta.env.DEV) console.error('[HistorialVentas]', err);
    } finally {
      setCargando(false);
    }
  }, [buscar, fechaInicio, fechaFin]);

  // ─────────────────────────────────────────────────────
  // DEBOUNCE AL CAMBIAR FILTROS
  // ─────────────────────────────────────────────────────
  // cargarVentas cambia cuando cambia buscar/fechaInicio/fechaFin.
  // El useEffect detecta ese cambio y espera 400ms antes de llamarla.
  // Si el usuario sigue escribiendo, clearTimeout cancela el timer anterior.
  // Efecto neto: solo se hace la petición cuando el usuario "pausa" 400ms.
  useEffect(() => {
    const timer = setTimeout(() => {
      cargarVentas(1);  // Al cambiar filtros, siempre volvemos a página 1
    }, 400);
    return () => clearTimeout(timer);  // Cleanup: cancela el timer si el efecto se re-ejecuta
  }, [cargarVentas]);

  // ─────────────────────────────────────────────────────
  // CÁLCULO DE PAGINACIÓN
  // ─────────────────────────────────────────────────────
  // Math.ceil redondea hacia arriba: 21 registros / 10 por página = 3 páginas
  // Math.max(1, ...) garantiza al menos 1 página aunque no haya registros
  const totalPaginas    = Math.max(1, Math.ceil(totalRegistros / ELEMENTOS_POR_PAGINA));
  const ventasPaginadas = ventas;  // El servidor ya devuelve solo la página actual

  // ─────────────────────────────────────────────────────
  // VER DETALLE DE UNA VENTA (abre el modal)
  // ─────────────────────────────────────────────────────
  const verDetalleVenta = async (ventaId) => {
    try {
      setCargandoDetalle(true);
      setMostrarModal(true);
      setDetalleVenta(null);  // Limpia datos anteriores mientras carga

      // GET /api/ventas/:id → devuelve la venta + todos sus items
      const respuesta = await api.get(`/ventas/${ventaId}`);
      const datos = respuesta.data;

      // El backend puede envolver los datos en .datos o al nivel raíz
      setDetalleVenta({
        venta: datos.venta || datos.datos?.venta,
        items: datos.items || datos.datos?.items || []
      });
    } catch (err) {
      alert('Error al cargar detalle de la venta');
      setMostrarModal(false);
      if (import.meta.env.DEV) console.error('[HistorialVentas] detalle:', err);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setDetalleVenta(null);
  };

  // ─────────────────────────────────────────────────────
  // GENERAR PDF — TICKET POS (jsPDF)
  // ─────────────────────────────────────────────────────
  // Simula un ticket de caja de 80mm de ancho.
  // Dibujamos manualmente cada línea usando coordenadas (mm).
  // La variable `y` lleva la posición vertical actual y avanza
  // después de cada elemento que se dibuja.
  const generarPDF = () => {
    if (!detalleVenta) return;

    const { venta, items } = detalleVenta;

    // Crear el documento con formato ticket POS (80mm de ancho)
    // La altura se ajusta al final según el contenido real
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200]
    });

    const anchoDoc = 80;
    const margen   = 5;
    const anchoUtil = anchoDoc - margen * 2;
    let y = 8;  // Posición vertical actual en mm

    // Funciones auxiliares para dibujar texto en el PDF:
    // lineaCentrada: texto centrado horizontalmente
    const lineaCentrada = (texto, tamaño = 10, estilo = 'normal') => {
      doc.setFontSize(tamaño);
      doc.setFont('helvetica', estilo);
      doc.text(texto, anchoDoc / 2, y, { align: 'center' });
      y += tamaño * 0.5 + 1.5;
    };

    // lineaIzq: texto alineado a la izquierda
    const lineaIzq = (texto, tamaño = 8) => {
      doc.setFontSize(tamaño);
      doc.setFont('helvetica', 'normal');
      doc.text(texto, margen, y);
      y += tamaño * 0.45 + 1.5;
    };

    // lineaDer: texto en los dos extremos (izquierda y derecha)
    const lineaDer = (izq, der, tamaño = 8) => {
      doc.setFontSize(tamaño);
      doc.setFont('helvetica', 'normal');
      doc.text(izq, margen, y);
      doc.text(der, anchoDoc - margen, y, { align: 'right' });
      y += tamaño * 0.45 + 1.5;
    };

    // separador: línea horizontal divisoria
    const separador = () => {
      doc.setLineWidth(0.1);
      doc.line(margen, y, anchoDoc - margen, y);
      y += 3;
    };

    // Construir el ticket sección por sección:
    lineaCentrada('LIBRERÍA EL SABER', 12, 'bold');
    lineaCentrada('Sistema de Gestión de Inventario', 7);
    lineaCentrada('NIT: 900.123.456-7', 7);
    separador();

    // padStart(6, '0') → "000042" (número de factura con ceros a la izquierda)
    lineaCentrada(`FACTURA N° ${String(venta.id).padStart(6, '0')}`, 9, 'bold');
    lineaIzq(`Fecha: ${formatearFecha(venta.fecha_venta)}`);
    lineaIzq(`Cliente: ${venta.cliente || 'Cliente General'}`);
    if (venta.documento) lineaIzq(`Doc: ${venta.documento}`);
    lineaIzq(`Pago: ${venta.metodo_pago || 'Efectivo'}`);
    separador();

    lineaDer('DESCRIPCIÓN', 'SUBTOTAL', 8);
    doc.setFont('helvetica', 'normal');

    // Listar cada producto vendido
    items.forEach((item) => {
      // Truncar títulos muy largos para que quepan en 80mm
      const titulo = item.titulo.length > 22
        ? item.titulo.substring(0, 22) + '...'
        : item.titulo;
      const subtotal = `$${formatearNumero(item.cantidad * item.precio_unitario)}`;
      lineaIzq(titulo, 7.5);
      lineaDer(
        `  ${item.cantidad} x $${formatearNumero(item.precio_unitario)}`,
        subtotal,
        7.5
      );
    });

    separador();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL:', margen, y);
    doc.text(`$${formatearNumero(venta.total)}`, anchoDoc - margen, y, { align: 'right' });
    y += 7;

    separador();

    lineaCentrada('¡Gracias por su compra!', 8, 'bold');
    lineaCentrada('Vuelva pronto', 7);

    // Ajustar la altura del documento al contenido real (evita espacio en blanco)
    doc.internal.pageSize.height = y + 10;

    // Descargar el PDF en el browser del usuario
    doc.save(`Factura-${String(venta.id).padStart(6, '0')}.pdf`);
  };

  // ─────────────────────────────────────────────────────
  // EXPORTAR A EXCEL (xlsx)
  // ─────────────────────────────────────────────────────
  // Convierte el arreglo de ventas visible a una hoja de cálculo.
  // Solo exporta las ventas de la búsqueda/filtro actual.
  const exportarExcel = () => {
    // Transformar cada venta al formato deseado para el Excel.
    // Las claves del objeto se convierten en encabezados de columna.
    const datos = ventas.map((v) => ({
      'N° Factura':    v.id,
      'Fecha':         formatearFecha(v.fecha_venta),
      'Cliente':       v.cliente || 'Cliente General',
      'Documento':     v.documento || '',
      'Total':         parseFloat(v.total) || 0,
      'Método de Pago': v.metodo_pago || '',
      'Estado':        v.estado || 'Completada'
    }));

    // Crear hoja de cálculo desde el JSON
    const hoja = XLSX.utils.json_to_sheet(datos);

    // Crear el libro (archivo Excel) y agregar la hoja
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Historial de Ventas');

    // Descargar el archivo con la fecha actual en el nombre
    XLSX.writeFile(libro, `Historial-Ventas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ─────────────────────────────────────────────────────
  // ANULAR VENTA (solo administradores)
  // ─────────────────────────────────────────────────────
  // PATCH /api/ventas/:id/anular → cambia estado a 'Anulada'
  //   y revierte el stock de todos los libros de esa venta.
  // Requiere confirmación del usuario para evitar anulaciones accidentales.
  const anularVenta = async (ventaId) => {
    const confirmado = window.confirm(
      `¿Está seguro de anular la venta #${ventaId}?\n\nEsta acción revertirá el stock de todos los productos y registrará la anulación en el Kardex.`
    );
    if (!confirmado) return;

    try {
      setAnulando(true);

      // PATCH en lugar de DELETE porque la venta NO se borra,
      // solo cambia su estado a 'Anulada' (queda en el historial)
      await api.patch(`/ventas/${ventaId}/anular`);

      alert(`Venta #${ventaId} anulada exitosamente.`);
      cerrarModal();
      cargarVentas();  // Refrescar la lista para mostrar el nuevo estado
    } catch (err) {
      // El backend devuelve un mensaje específico si la venta ya estaba anulada
      const mensaje = err.response?.data?.mensaje || 'Error al anular la venta';
      alert(mensaje);
      if (import.meta.env.DEV) console.error('[HistorialVentas] anular:', err);
    } finally {
      setAnulando(false);
    }
  };

  // ─────────────────────────────────────────────────────
  // UTILIDADES DE FORMATO
  // ─────────────────────────────────────────────────────

  // Fecha con hora en formato colombiano: dd/mm/aaaa hh:mm
  const formatearFecha = (fecha) =>
    new Date(fecha).toLocaleString('es-CO', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

  // Precio con símbolo de peso colombiano: $1.234.567
  const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(precio || 0);

  // Número formateado sin símbolo de moneda: 1.234.567
  const formatearNumero = (n) =>
    new Intl.NumberFormat('es-CO').format(n || 0);

  // Limpiar todos los filtros de búsqueda
  const limpiarFiltros = () => {
    setBuscar('');
    setFechaInicio('');
    setFechaFin('');
  };

  // ¿Hay algún filtro activo? Para mostrar el botón "Limpiar filtros"
  const hayFiltrosActivos = buscar || fechaInicio || fechaFin;

  // ─────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="card shadow-sm">

        {/* ── ENCABEZADO CON BOTÓN EXPORTAR ── */}
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h4 className="mb-0">Historial de Ventas</h4>
          {/* Exporta las ventas del filtro actual a un archivo .xlsx */}
          <button
            className="btn btn-sm btn-light"
            onClick={exportarExcel}
            title="Exportar a Excel"
          >
            Exportar Excel
          </button>
        </div>

        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}

          {/* ── FILTROS DE BÚSQUEDA ── */}
          <div className="row g-2 mb-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Buscar por cliente</label>
              {/* onChange actualiza el estado; el useEffect con debounce hace la petición */}
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Nombre del cliente..."
                value={buscar}
                onChange={(e) => setBuscar(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Desde</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label small fw-semibold">Hasta</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              {/* Solo mostrar el botón si hay algún filtro activo */}
              {hayFiltrosActivos && (
                <button
                  className="btn btn-sm btn-outline-secondary w-100"
                  onClick={limpiarFiltros}
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* Contador de resultados de la búsqueda actual */}
          <p className="text-muted small mb-2">
            {ventas.length} {ventas.length === 1 ? 'venta encontrada' : 'ventas encontradas'}
            {hayFiltrosActivos && ' (filtrada)'}
          </p>

          {/* ── TABLA DE VENTAS ── */}
          <div className="table-responsive">
            <table className="table table-hover table-striped align-middle">
              <thead className="table-dark">
                <tr>
                  <th>N° Factura</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Total</th>
                  <th>Método Pago</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {ventasPaginadas.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center text-muted py-4">
                      {hayFiltrosActivos
                        ? 'No se encontraron ventas con esos filtros'
                        : 'No hay ventas registradas'}
                    </td>
                  </tr>
                ) : (
                  ventasPaginadas.map((venta) => (
                    <tr key={venta.id}>
                      {/* padStart(6, '0'): formatea el ID como 000042 */}
                      <td className="fw-bold">#{String(venta.id).padStart(6, '0')}</td>
                      <td>{formatearFecha(venta.fecha_venta)}</td>
                      <td>{venta.cliente || 'Cliente General'}</td>
                      <td className="fw-bold text-success">{formatearPrecio(venta.total)}</td>
                      <td>
                        <span className="badge bg-secondary">{venta.metodo_pago}</span>
                      </td>
                      <td>
                        {/* Badge rojo para anuladas, verde para completadas */}
                        <span className={`badge ${venta.estado === 'Anulada' ? 'bg-danger' : 'bg-success'}`}>
                          {venta.estado || 'Completada'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => verDetalleVenta(venta.id)}
                          title="Ver detalles"
                        >
                          <IconoOjo /> Ver
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* ── PAGINACIÓN ── */}
          {/* Solo se muestra si hay más de una página */}
          {totalPaginas > 1 && (
            <nav className="d-flex justify-content-center mt-3">
              <ul className="pagination pagination-sm">
                <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => cargarVentas(paginaActual - 1)}>
                    Anterior
                  </button>
                </li>
                {/* Generar un botón por cada página */}
                {[...Array(totalPaginas)].map((_, i) => (
                  <li key={i + 1} className={`page-item ${paginaActual === i + 1 ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => cargarVentas(i + 1)}>
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${paginaActual === totalPaginas ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => cargarVentas(paginaActual + 1)}>
                    Siguiente
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      {/* ── MODAL DE DETALLE DE VENTA ── */}
      {/* Se renderiza solo cuando mostrarModal es true */}
      {mostrarModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          // Cerrar el modal al hacer clic en el fondo oscuro (fuera del contenido)
          onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
        >
          <div className="modal-dialog modal-lg modal-fullscreen-sm-down">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  {detalleVenta
                    ? `Factura N° ${String(detalleVenta.venta.id).padStart(6, '0')}`
                    : 'Cargando...'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={cerrarModal} />
              </div>

              <div className="modal-body">
                {cargandoDetalle ? (
                  // Spinner mientras carga el detalle
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status" />
                  </div>
                ) : detalleVenta ? (
                  <>
                    {/* ── DATOS GENERALES DE LA VENTA ── */}
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <h6 className="text-muted border-bottom pb-1">Información de Venta</h6>
                        <p className="mb-1"><strong>Factura N°:</strong> {String(detalleVenta.venta.id).padStart(6, '0')}</p>
                        <p className="mb-1"><strong>Fecha:</strong> {formatearFecha(detalleVenta.venta.fecha_venta)}</p>
                        <p className="mb-1"><strong>Método de Pago:</strong> {detalleVenta.venta.metodo_pago}</p>
                        <p className="mb-1">
                          <strong>Estado:</strong>{' '}
                          <span className={`badge ${detalleVenta.venta.estado === 'Anulada' ? 'bg-danger' : 'bg-success'}`}>
                            {detalleVenta.venta.estado || 'Completada'}
                          </span>
                        </p>
                      </div>
                      <div className="col-md-6">
                        <h6 className="text-muted border-bottom pb-1">Datos del Cliente</h6>
                        <p className="mb-1"><strong>Nombre:</strong> {detalleVenta.venta.cliente || 'Cliente General'}</p>
                        {detalleVenta.venta.documento && (
                          <p className="mb-1"><strong>Documento:</strong> {detalleVenta.venta.documento}</p>
                        )}
                        {detalleVenta.venta.telefono && (
                          <p className="mb-1"><strong>Teléfono:</strong> {detalleVenta.venta.telefono}</p>
                        )}
                      </div>
                    </div>

                    {/* ── TABLA DE PRODUCTOS DE LA VENTA ── */}
                    <h6 className="text-muted border-bottom pb-1 mb-2">Productos Vendidos</h6>
                    <table className="table table-bordered table-sm">
                      <thead className="table-light">
                        <tr>
                          <th>Libro</th>
                          <th>Autor</th>
                          <th className="text-center">Cant.</th>
                          <th className="text-end">Precio Unit.</th>
                          <th className="text-end">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalleVenta.items.map((item) => (
                          <tr key={item.id}>
                            <td>{item.titulo}</td>
                            <td className="text-muted">{item.autor || 'N/A'}</td>
                            <td className="text-center">{item.cantidad}</td>
                            <td className="text-end">{formatearPrecio(item.precio_unitario)}</td>
                            <td className="text-end fw-bold">
                              {/* El subtotal se calcula en el frontend para mostrarlo */}
                              {formatearPrecio(item.cantidad * item.precio_unitario)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="table-success">
                          <td colSpan="4" className="text-end fw-bold">TOTAL:</td>
                          <td className="text-end fw-bold fs-6">
                            {formatearPrecio(detalleVenta.venta.total)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>

                    <div className="text-center text-muted">
                      <small>¡Gracias por su compra! — SGI Librería El Saber</small>
                    </div>
                  </>
                ) : null}
              </div>

              {/* ── PIE DEL MODAL: BOTONES DE ACCIÓN ── */}
              <div className="modal-footer">
                {detalleVenta && (
                  <>
                    {/* Descargar el ticket en PDF */}
                    <button
                      className="btn btn-success"
                      onClick={generarPDF}
                      disabled={!detalleVenta}
                    >
                      Descargar PDF
                    </button>

                    {/* Anular venta: solo visible para administradores
                        y solo si la venta NO está ya anulada */}
                    {esAdministrador() && detalleVenta.venta?.estado !== 'Anulada' && (
                      <button
                        className="btn btn-danger"
                        onClick={() => anularVenta(detalleVenta.venta.id)}
                        disabled={anulando}  // Deshabilitar durante la petición
                      >
                        {anulando ? 'Anulando...' : 'Anular Venta'}
                      </button>
                    )}
                  </>
                )}
                <button className="btn btn-secondary" onClick={cerrarModal}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistorialVentas;