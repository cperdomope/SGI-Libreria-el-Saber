/**
 * =====================================================
 * MÓDULO DE MOVIMIENTOS - KARDEX
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Registra entradas y salidas del inventario.
 * Cuando el tipo es ENTRADA (compra), permite seleccionar
 * el proveedor y registrar el costo de compra por unidad.
 *
 * FLUJO DE UNA COMPRA A PROVEEDOR:
 * 1. Seleccionar "Compra (Entrada)"
 * 2. Elegir el libro que se está comprando
 * 3. Seleccionar el proveedor que lo suministra
 * 4. Ingresar el costo de compra por unidad
 * 5. Ingresar la cantidad recibida
 * 6. (Opcional) Observaciones / número de factura
 * 7. Confirmar → el stock se actualiza automáticamente
 *
 * Ante un jurado:
 * "Al registrar una ENTRADA seleccionamos el proveedor
 *  para trazabilidad de quién nos vende los libros
 *  y a qué precio los compramos, permitiendo calcular
 *  el margen de ganancia."
 *
 * @author Equipo de Desarrollo SGI
 * @version 3.0.0
 */

import { useState, useEffect } from 'react';
import api from '../servicios/api';

// =====================================================
// ESTADO INICIAL DEL FORMULARIO
// =====================================================

const FORM_INICIAL = {
  libro_id: '',
  tipo_movimiento: 'ENTRADA',
  cantidad: 1,
  proveedor_id: '',
  costo_compra: '',
  observaciones: ''
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const Movimientos = () => {
  // --- DATOS DE REFERENCIA ---
  const [libros, setLibros] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  // --- FORMULARIO ---
  const [formData, setFormData] = useState(FORM_INICIAL);

  // --- HISTORIAL (últimos movimientos) ---
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // --- FEEDBACK ---
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [enviando, setEnviando] = useState(false);

  // ¿El tipo actual es una ENTRADA (compra)?
  const esEntrada = formData.tipo_movimiento === 'ENTRADA';

  // ─────────────────────────────────────────────────
  // CARGA INICIAL DE DATOS
  // ─────────────────────────────────────────────────

  const cargarDatos = async () => {
    try {
      const [resLibros, resProveedores] = await Promise.all([
        api.get('/libros'),
        api.get('/proveedores')
      ]);
      const librosData = resLibros.data.datos || resLibros.data;
      const proveedoresData = resProveedores.data.datos || resProveedores.data;
      if (Array.isArray(librosData)) setLibros(librosData);
      if (Array.isArray(proveedoresData)) {
        setProveedores(proveedoresData.filter(p => p.activo !== 0));
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error('[Movimientos] Error cargando datos:', error);
    }
  };

  const cargarHistorial = async () => {
    try {
      setCargandoHistorial(true);
      const res = await api.get('/movimientos');
      const datos = res.data.datos || res.data;
      setHistorial(Array.isArray(datos) ? datos.slice(0, 8) : []);
    } catch (error) {
      if (import.meta.env.DEV) console.error('[Movimientos] Error historial:', error);
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => {
    cargarDatos();
    cargarHistorial();
  }, []);

  // ─────────────────────────────────────────────────
  // MANEJADORES
  // ─────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  /**
   * Cambia el tipo de movimiento y limpia campos
   * que son exclusivos de ENTRADA para evitar enviar
   * datos inconsistentes al backend.
   */
  const cambiarTipo = (nuevoTipo) => {
    setFormData(prev => ({
      ...prev,
      tipo_movimiento: nuevoTipo,
      proveedor_id: nuevoTipo === 'SALIDA' ? '' : prev.proveedor_id,
      costo_compra: nuevoTipo === 'SALIDA' ? '' : prev.costo_compra
    }));
  };

  // ─────────────────────────────────────────────────
  // ENVÍO DEL FORMULARIO
  // ─────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });

    if (!formData.libro_id) {
      return setMensaje({ texto: 'Selecciona un libro', tipo: 'danger' });
    }

    try {
      setEnviando(true);

      // Construir payload: incluir proveedor y costo solo si es ENTRADA
      const payload = {
        libro_id: parseInt(formData.libro_id, 10),
        tipo_movimiento: formData.tipo_movimiento,
        cantidad: parseInt(formData.cantidad, 10),
        observaciones: formData.observaciones || undefined
      };

      if (esEntrada) {
        payload.proveedor_id = parseInt(formData.proveedor_id, 10);
        payload.costo_compra = parseFloat(formData.costo_compra);
      }

      const res = await api.post('/movimientos', payload);
      const { mensaje: msg, datos } = res.data;
      const auditado = datos?.auditado_por ? ` — registrado por ${datos.auditado_por}` : '';
      setMensaje({ texto: (msg || '¡Movimiento registrado!') + auditado, tipo: 'success' });

      // Resetear formulario manteniendo el tipo actual
      setFormData({ ...FORM_INICIAL, tipo_movimiento: formData.tipo_movimiento });

      await Promise.all([cargarDatos(), cargarHistorial()]);
      window.scrollTo(0, 0);

    } catch (error) {
      const errorMsg = error.response?.data?.mensaje
        || error.response?.data?.error
        || 'Error al procesar la solicitud';
      setMensaje({ texto: errorMsg, tipo: 'danger' });
    } finally {
      setEnviando(false);
    }
  };

  // ─────────────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────────────

  const formatearFecha = (fecha) =>
    new Date(fecha).toLocaleString('es-CO', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

  const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(precio || 0);

  // ─────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────

  return (
    <div className="container-fluid py-4">
      <div className="row g-4">

        {/* ── FORMULARIO DE REGISTRO ── */}
        <div className="col-lg-5">
          <div className="card shadow-sm">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">Registrar Movimiento de Inventario</h5>
            </div>
            <div className="card-body">

              {mensaje.texto && (
                <div className={`alert alert-${mensaje.tipo} alert-dismissible fade show`} role="alert">
                  <strong>{mensaje.tipo === 'success' ? '¡Éxito! ' : 'Error: '}</strong>
                  {mensaje.texto}
                  <button type="button" className="btn-close" onClick={() => setMensaje({ texto: '', tipo: '' })} />
                </div>
              )}

              <form onSubmit={handleSubmit}>

                {/* ── TIPO DE MOVIMIENTO ── */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">Tipo de Movimiento</label>
                  <div className="btn-group w-100" role="group">
                    <input
                      type="radio"
                      className="btn-check"
                      id="tipo-entrada"
                      name="tipo_movimiento"
                      value="ENTRADA"
                      checked={esEntrada}
                      onChange={() => cambiarTipo('ENTRADA')}
                    />
                    <label className="btn btn-outline-success" htmlFor="tipo-entrada">
                      Compra (Entrada)
                    </label>

                    <input
                      type="radio"
                      className="btn-check"
                      id="tipo-salida"
                      name="tipo_movimiento"
                      value="SALIDA"
                      checked={!esEntrada}
                      onChange={() => cambiarTipo('SALIDA')}
                    />
                    <label className="btn btn-outline-danger" htmlFor="tipo-salida">
                      Ajuste (Salida)
                    </label>
                  </div>
                  <small className="text-muted d-block mt-1">
                    {esEntrada
                      ? 'Ingreso de mercancía comprada a un proveedor.'
                      : 'Ajuste por pérdida, daño o corrección de inventario.'}
                  </small>
                </div>

                {/* ── LIBRO ── */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Libro *</label>
                  <select
                    className="form-select"
                    name="libro_id"
                    value={formData.libro_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled>— Selecciona un libro —</option>
                    {libros.map((libro) => (
                      <option key={libro.id} value={libro.id}>
                        {libro.titulo} (Stock: {libro.stock_actual ?? 0})
                        {libro.isbn ? ` — ${libro.isbn}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ── CANTIDAD ── */}
                <div className="mb-3">
                  <label className="form-label fw-semibold">Cantidad *</label>
                  <input
                    type="number"
                    className="form-control"
                    name="cantidad"
                    min="1"
                    value={formData.cantidad}
                    onChange={handleChange}
                    required
                  />
                </div>

                {/* ── PROVEEDOR (solo ENTRADA, obligatorio) ── */}
                {esEntrada && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Proveedor *</label>
                    <select
                      className="form-select"
                      name="proveedor_id"
                      value={formData.proveedor_id}
                      onChange={handleChange}
                      required
                    >
                      <option value="" disabled>— Selecciona un proveedor —</option>
                      {proveedores.map((prov) => (
                        <option key={prov.id} value={prov.id}>
                          {prov.nombre_empresa}
                          {prov.nit ? ` — NIT: ${prov.nit}` : ''}
                        </option>
                      ))}
                    </select>
                    <small className="text-muted">
                      Identifica quién suministró los libros para esta compra.
                    </small>
                  </div>
                )}

                {/* ── COSTO DE COMPRA (solo ENTRADA, obligatorio) ── */}
                {esEntrada && (
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Costo de Compra por Unidad *</label>
                    <div className="input-group">
                      <span className="input-group-text">$</span>
                      <input
                        type="number"
                        className="form-control"
                        name="costo_compra"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={formData.costo_compra}
                        onChange={handleChange}
                        required
                      />
                      <span className="input-group-text">COP</span>
                    </div>
                    {formData.costo_compra && parseInt(formData.cantidad) > 0 && (
                      <div className="mt-1">
                        <small className="text-success fw-semibold">
                          Total de compra:{' '}
                          {formatearPrecio(
                            parseFloat(formData.costo_compra) * parseInt(formData.cantidad || 0)
                          )}
                        </small>
                      </div>
                    )}
                    <small className="text-muted d-block">
                      Precio pagado al proveedor (diferente al precio de venta).
                    </small>
                  </div>
                )}

                {/* ── OBSERVACIONES ── */}
                <div className="mb-4">
                  <label className="form-label fw-semibold">
                    Observaciones{' '}
                    <span className="text-muted fw-normal small">(opcional)</span>
                  </label>
                  <textarea
                    className="form-control"
                    name="observaciones"
                    rows="2"
                    placeholder={esEntrada
                      ? 'Ej: Factura #1234, pedido de noviembre...'
                      : 'Ej: Libro dañado por humedad, pérdida por extravío...'}
                    value={formData.observaciones}
                    onChange={handleChange}
                    maxLength={255}
                  />
                </div>

                {/* ── BOTÓN ENVIAR ── */}
                <div className="d-grid">
                  <button
                    type="submit"
                    className={`btn btn-lg ${esEntrada ? 'btn-success' : 'btn-danger'}`}
                    disabled={enviando}
                  >
                    {enviando ? 'Procesando...' : esEntrada ? 'Registrar Compra' : 'Registrar Salida'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* ── HISTORIAL RECIENTE ── */}
        <div className="col-lg-7">
          <div className="card shadow-sm">
            <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Últimos Movimientos</h5>
              <button
                className="btn btn-sm btn-outline-light"
                onClick={cargarHistorial}
                disabled={cargandoHistorial}
              >
                {cargandoHistorial ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>
            <div className="card-body p-0">
              {cargandoHistorial ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm" role="status" />
                </div>
              ) : historial.length === 0 ? (
                <p className="text-center text-muted py-4">No hay movimientos registrados</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm table-hover align-middle mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Tipo</th>
                        <th>Libro</th>
                        <th className="text-center">Cant.</th>
                        <th>Proveedor</th>
                        <th>Costo Unit.</th>
                        <th>Responsable</th>
                        <th className="text-muted">Fecha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historial.map((mov) => (
                        <tr key={mov.id}>
                          <td>
                            <span className={`badge ${mov.tipo_movimiento === 'ENTRADA' ? 'bg-success' : 'bg-danger'}`}>
                              {mov.tipo_movimiento}
                            </span>
                          </td>
                          <td>
                            <div className="small fw-semibold">{mov.libro}</div>
                            {mov.observaciones && (
                              <div className="small text-muted text-truncate" style={{ maxWidth: 150 }}>
                                {mov.observaciones}
                              </div>
                            )}
                          </td>
                          <td className="text-center fw-bold">{mov.cantidad}</td>
                          <td className="small">
                            {mov.proveedor
                              ? <span className="text-success">{mov.proveedor}</span>
                              : <span className="text-muted">—</span>}
                          </td>
                          <td className="small">
                            {mov.costo_compra
                              ? <span className="text-info">{formatearPrecio(mov.costo_compra)}</span>
                              : <span className="text-muted">—</span>}
                          </td>
                          <td className="small">
                            <span className="text-secondary">
                              {mov.usuario || '—'}
                            </span>
                          </td>
                          <td className="small text-muted">{formatearFecha(mov.fecha_movimiento)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="p-2 border-top text-end">
                <small className="text-muted">Mostrando los últimos 8 movimientos</small>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Movimientos;
