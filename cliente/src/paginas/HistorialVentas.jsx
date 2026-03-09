/**
 * =====================================================
 * HISTORIAL DE VENTAS
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * FUNCIONALIDADES:
 * - Listado de ventas con paginación
 * - Búsqueda por cliente o fecha
 * - Filtro por rango de fechas
 * - Ver detalle en modal
 * - Generar PDF tipo ticket POS (jsPDF)
 * - Exportar a Excel (xlsx)
 * - Anular ventas (con confirmación)
 *
 * @version 3.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import api from '../servicios/api';
import { useAuth } from '../contexto/AuthContext';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// =====================================================
// ICONOS SVG INLINE
// =====================================================

const IconoOjo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
  </svg>
);

// =====================================================
// CONSTANTES
// =====================================================

const ELEMENTOS_POR_PAGINA = 10;

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const HistorialVentas = () => {
  const { esAdministrador } = useAuth();

  // --- DATOS ---
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // --- DETALLE MODAL ---
  const [mostrarModal, setMostrarModal] = useState(false);
  const [detalleVenta, setDetalleVenta] = useState(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);

  // --- BÚSQUEDA Y FILTROS ---
  const [buscar, setBuscar] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // --- PAGINACIÓN ---
  const [paginaActual, setPaginaActual] = useState(1);

  // --- ANULACIÓN ---
  const [anulando, setAnulando] = useState(false);

  // ─────────────────────────────────────────────────
  // CARGA DE DATOS
  // ─────────────────────────────────────────────────

  const cargarVentas = useCallback(async () => {
    try {
      setCargando(true);
      // Construir params con filtros activos
      const params = {};
      if (buscar) params.buscar = buscar;
      if (fechaInicio) params.fechaInicio = fechaInicio;
      if (fechaFin) params.fechaFin = fechaFin;

      const respuesta = await api.get('/ventas', { params });
      const datos = respuesta.data.datos || respuesta.data;
      setVentas(Array.isArray(datos) ? datos : []);
      setError(null);
      setPaginaActual(1); // Resetear a primera página al buscar
    } catch (err) {
      setError('Error al cargar el historial de ventas');
      if (import.meta.env.DEV) console.error('[HistorialVentas]', err);
    } finally {
      setCargando(false);
    }
  }, [buscar, fechaInicio, fechaFin]);

  useEffect(() => {
    // Debounce para búsqueda en tiempo real
    const timer = setTimeout(() => {
      cargarVentas();
    }, 400);
    return () => clearTimeout(timer);
  }, [cargarVentas]);

  // ─────────────────────────────────────────────────
  // PAGINACIÓN
  // ─────────────────────────────────────────────────

  const totalPaginas = Math.ceil(ventas.length / ELEMENTOS_POR_PAGINA);
  const indiceInicio = (paginaActual - 1) * ELEMENTOS_POR_PAGINA;
  const ventasPaginadas = ventas.slice(indiceInicio, indiceInicio + ELEMENTOS_POR_PAGINA);

  // ─────────────────────────────────────────────────
  // VER DETALLE
  // ─────────────────────────────────────────────────

  const verDetalleVenta = async (ventaId) => {
    try {
      setCargandoDetalle(true);
      setMostrarModal(true);
      setDetalleVenta(null);
      const respuesta = await api.get(`/ventas/${ventaId}`);
      const datos = respuesta.data;
      // El backend retorna { exito, venta, items }
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

  // ─────────────────────────────────────────────────
  // GENERAR PDF - TICKET POS (jsPDF)
  // ─────────────────────────────────────────────────

  const generarPDF = () => {
    if (!detalleVenta) return;

    const { venta, items } = detalleVenta;

    // Configuración del documento (ancho tipo ticket 80mm → ~226 pts)
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 200] // ancho 80mm como un ticket POS real
    });

    const anchoDoc = 80;
    const margen = 5;
    const anchoUtil = anchoDoc - margen * 2;
    let y = 8; // posición vertical actual

    // ── Función auxiliar para líneas de texto centradas ──
    const lineaCentrada = (texto, tamaño = 10, estilo = 'normal') => {
      doc.setFontSize(tamaño);
      doc.setFont('helvetica', estilo);
      doc.text(texto, anchoDoc / 2, y, { align: 'center' });
      y += tamaño * 0.5 + 1.5;
    };

    const lineaIzq = (texto, tamaño = 8) => {
      doc.setFontSize(tamaño);
      doc.setFont('helvetica', 'normal');
      doc.text(texto, margen, y);
      y += tamaño * 0.45 + 1.5;
    };

    const lineaDer = (izq, der, tamaño = 8) => {
      doc.setFontSize(tamaño);
      doc.setFont('helvetica', 'normal');
      doc.text(izq, margen, y);
      doc.text(der, anchoDoc - margen, y, { align: 'right' });
      y += tamaño * 0.45 + 1.5;
    };

    const separador = () => {
      doc.setLineWidth(0.1);
      doc.line(margen, y, anchoDoc - margen, y);
      y += 3;
    };

    // ── ENCABEZADO ──
    lineaCentrada('LIBRERÍA EL SABER', 12, 'bold');
    lineaCentrada('Sistema de Gestión de Inventario', 7);
    lineaCentrada('NIT: 900.123.456-7', 7);
    separador();

    // ── DATOS DE LA VENTA ──
    lineaCentrada(`FACTURA N° ${String(venta.id).padStart(6, '0')}`, 9, 'bold');
    lineaIzq(`Fecha: ${formatearFecha(venta.fecha_venta)}`);
    lineaIzq(`Cliente: ${venta.cliente || 'Cliente General'}`);
    if (venta.documento) lineaIzq(`Doc: ${venta.documento}`);
    lineaIzq(`Pago: ${venta.metodo_pago || 'Efectivo'}`);
    separador();

    // ── ENCABEZADOS DE TABLA ──
    lineaDer('DESCRIPCIÓN', 'SUBTOTAL', 8);
    doc.setFont('helvetica', 'normal');

    items.forEach((item) => {
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

    // ── TOTAL ──
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TOTAL:', margen, y);
    doc.text(`$${formatearNumero(venta.total)}`, anchoDoc - margen, y, { align: 'right' });
    y += 7;

    separador();

    // ── PIE ──
    lineaCentrada('¡Gracias por su compra!', 8, 'bold');
    lineaCentrada('Vuelva pronto', 7);

    // Ajustar altura del documento al contenido
    doc.internal.pageSize.height = y + 10;

    // Guardar el PDF con nombre descriptivo
    doc.save(`Factura-${String(venta.id).padStart(6, '0')}.pdf`);
  };

  // ─────────────────────────────────────────────────
  // EXPORTAR A EXCEL (xlsx)
  // ─────────────────────────────────────────────────

  const exportarExcel = () => {
    const datos = ventas.map((v) => ({
      'N° Factura': v.id,
      'Fecha': formatearFecha(v.fecha_venta),
      'Cliente': v.cliente || 'Cliente General',
      'Documento': v.documento || '',
      'Total': parseFloat(v.total) || 0,
      'Método de Pago': v.metodo_pago || '',
      'Estado': v.estado || 'Completada'
    }));

    const hoja = XLSX.utils.json_to_sheet(datos);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, 'Historial de Ventas');
    XLSX.writeFile(libro, `Historial-Ventas-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ─────────────────────────────────────────────────
  // ANULAR VENTA
  // ─────────────────────────────────────────────────

  const anularVenta = async (ventaId) => {
    const confirmado = window.confirm(
      `¿Está seguro de anular la venta #${ventaId}?\n\nEsta acción revertirá el stock de todos los productos y registrará la anulación en el Kardex.`
    );
    if (!confirmado) return;

    try {
      setAnulando(true);
      await api.patch(`/ventas/${ventaId}/anular`);
      alert(`Venta #${ventaId} anulada exitosamente.`);
      cerrarModal();
      cargarVentas();
    } catch (err) {
      const mensaje = err.response?.data?.mensaje || 'Error al anular la venta';
      alert(mensaje);
      if (import.meta.env.DEV) console.error('[HistorialVentas] anular:', err);
    } finally {
      setAnulando(false);
    }
  };

  // ─────────────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────────────

  const formatearFecha = (fecha) =>
    new Date(fecha).toLocaleString('es-CO', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

  const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(precio || 0);

  const formatearNumero = (n) =>
    new Intl.NumberFormat('es-CO').format(n || 0);

  const limpiarFiltros = () => {
    setBuscar('');
    setFechaInicio('');
    setFechaFin('');
  };

  const hayFiltrosActivos = buscar || fechaInicio || fechaFin;

  // ─────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────

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
        {/* ── ENCABEZADO ── */}
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h4 className="mb-0">Historial de Ventas</h4>
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

          {/* ── FILTROS ── */}
          <div className="row g-2 mb-3 align-items-end">
            <div className="col-md-4">
              <label className="form-label small fw-semibold">Buscar por cliente</label>
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

          {/* Contador de resultados */}
          <p className="text-muted small mb-2">
            {ventas.length} {ventas.length === 1 ? 'venta encontrada' : 'ventas encontradas'}
            {hayFiltrosActivos && ' (filtrada)'}
          </p>

          {/* ── TABLA ── */}
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
                      <td className="fw-bold">#{String(venta.id).padStart(6, '0')}</td>
                      <td>{formatearFecha(venta.fecha_venta)}</td>
                      <td>{venta.cliente || 'Cliente General'}</td>
                      <td className="fw-bold text-success">{formatearPrecio(venta.total)}</td>
                      <td>
                        <span className="badge bg-secondary">{venta.metodo_pago}</span>
                      </td>
                      <td>
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
          {totalPaginas > 1 && (
            <nav className="d-flex justify-content-center mt-3">
              <ul className="pagination pagination-sm">
                <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPaginaActual(p => p - 1)}>
                    Anterior
                  </button>
                </li>
                {[...Array(totalPaginas)].map((_, i) => (
                  <li key={i + 1} className={`page-item ${paginaActual === i + 1 ? 'active' : ''}`}>
                    <button className="page-link" onClick={() => setPaginaActual(i + 1)}>
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${paginaActual === totalPaginas ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => setPaginaActual(p => p + 1)}>
                    Siguiente
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </div>
      </div>

      {/* ── MODAL DE DETALLE ── */}
      {mostrarModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
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
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status" />
                  </div>
                ) : detalleVenta ? (
                  <>
                    {/* Datos generales */}
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

                    {/* Tabla de productos */}
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

              <div className="modal-footer">
                {detalleVenta && (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={generarPDF}
                      disabled={!detalleVenta}
                    >
                      Descargar PDF
                    </button>
                    {/* Solo el administrador puede anular ventas */}
                    {esAdministrador() && detalleVenta.venta?.estado !== 'Anulada' && (
                      <button
                        className="btn btn-danger"
                        onClick={() => anularVenta(detalleVenta.venta.id)}
                        disabled={anulando}
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
