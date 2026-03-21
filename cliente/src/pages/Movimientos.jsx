// =====================================================
// PÁGINA: MOVIMIENTOS DE INVENTARIO (KARDEX)
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Registra las ENTRADAS y SALIDAS de libros en el inventario.
//   Es como el "Kardex" contable: cada vez que llegan libros
//   (compra a proveedor) o salen (ajuste, pérdida), se registra aquí.
//
// ¿Cómo se conecta con el sistema?
//   1. Se renderiza en la ruta /movimientos (ver App.jsx)
//   2. Solo accesible para Administradores (permiso: registrarMovimiento)
//   3. Llama a la API:
//      - GET /api/libros → para el select de libros
//      - GET /api/proveedores → para el select de proveedores
//      - GET /api/movimientos → para el historial reciente
//      - POST /api/movimientos → para registrar un nuevo movimiento
//   4. Al registrar una ENTRADA, el stock del libro SUBE automáticamente
//   5. Al registrar una SALIDA, el stock del libro BAJA automáticamente
//
// FLUJO DE UNA COMPRA A PROVEEDOR:
//   1. Seleccionar "Compra (Entrada)"
//   2. Elegir el libro que se está comprando
//   3. Seleccionar el proveedor que lo suministra
//   4. Ingresar el costo de compra por unidad
//   5. Ingresar la cantidad recibida
//   6. (Opcional) Observaciones / número de factura
//   7. Confirmar → el stock se actualiza automáticamente en la BD
//
// Ante un jurado:
//   "Al registrar una ENTRADA seleccionamos el proveedor
//    para trazabilidad de quién nos vende los libros
//    y a qué precio los compramos, permitiendo calcular
//    el margen de ganancia."
//
// =====================================================

import { useState, useEffect } from 'react';
// api: cliente HTTP con Axios (incluye token JWT automáticamente)
import api from '../services/api';

// =====================================================
// ESTADO INICIAL DEL FORMULARIO
// =====================================================
// Aquí definimos los valores por defecto del formulario.
// Cuando se resetea el formulario después de guardar,
// vuelve a estos valores. Es una constante fuera del
// componente para que no se recree en cada render.

const FORM_INICIAL = {
  libro_id: '',              // ID del libro seleccionado
  tipo_movimiento: 'ENTRADA', // ENTRADA (compra) o SALIDA (ajuste)
  cantidad: 1,               // Cantidad de unidades
  proveedor_id: '',          // ID del proveedor (solo para ENTRADA)
  costo_compra: '',          // Precio de compra por unidad (solo ENTRADA)
  observaciones: ''          // Notas opcionales (ej: "Factura #1234")
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const Movimientos = () => {

  // ── ESTADOS: Datos de referencia (vienen de la BD) ──
  // Estos arrays se llenan con los datos de la API al cargar la página
  const [libros, setLibros] = useState([]);           // Lista de libros para el select
  const [proveedores, setProveedores] = useState([]); // Lista de proveedores para el select

  // ── ESTADO: Formulario ──
  // formData contiene los valores actuales del formulario
  const [formData, setFormData] = useState(FORM_INICIAL);

  // ── ESTADOS: Historial de movimientos recientes ──
  const [historial, setHistorial] = useState([]);           // Últimos 8 movimientos
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // ── ESTADOS: Mensajes de feedback al usuario ──
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' }); // tipo: 'success' o 'danger'
  const [enviando, setEnviando] = useState(false); // true mientras se procesa el envío

  // ── Variable derivada ──
  // esEntrada = true cuando el tipo es ENTRADA (compra)
  // Esto nos sirve para mostrar/ocultar campos de proveedor y costo
  const esEntrada = formData.tipo_movimiento === 'ENTRADA';

  // ─────────────────────────────────────────────────
  // FUNCIÓN: Cargar datos iniciales (libros y proveedores)
  // ─────────────────────────────────────────────────
  // Se ejecuta al montar el componente y después de cada movimiento.
  // Usa Promise.all() para hacer las 2 peticiones EN PARALELO
  // (más rápido que hacer una después de la otra).

  const cargarDatos = async () => {
    try {
      // Promise.all ejecuta ambas peticiones al mismo tiempo
      const [resLibros, resProveedores] = await Promise.all([
        api.get('/libros'),       // GET /api/libros
        api.get('/proveedores')   // GET /api/proveedores
      ]);

      // Extraemos los arrays de las respuestas
      const librosData = resLibros.data.datos || resLibros.data;
      const proveedoresData = resProveedores.data.datos || resProveedores.data;

      // Guardamos los libros en el estado
      if (Array.isArray(librosData)) setLibros(librosData);

      // Guardamos solo proveedores ACTIVOS (filtramos los inactivos)
      if (Array.isArray(proveedoresData)) {
        setProveedores(proveedoresData.filter(p => p.activo !== 0));
      }
    } catch (error) {
      // Solo mostramos errores en modo desarrollo
      if (import.meta.env.DEV) console.error('[Movimientos] Error cargando datos:', error);
    }
  };

  // ─────────────────────────────────────────────────
  // FUNCIÓN: Cargar historial de movimientos recientes
  // ─────────────────────────────────────────────────
  // Trae los últimos movimientos registrados para mostrarlos
  // en la tabla de "Últimos Movimientos" (lado derecho).

  const cargarHistorial = async () => {
    try {
      setCargandoHistorial(true);
      const res = await api.get('/movimientos'); // GET /api/movimientos
      const datos = res.data.datos || res.data;
      // Solo mostramos los últimos 8 movimientos
      setHistorial(Array.isArray(datos) ? datos.slice(0, 8) : []);
    } catch (error) {
      if (import.meta.env.DEV) console.error('[Movimientos] Error historial:', error);
    } finally {
      // finally se ejecuta siempre (éxito o error)
      setCargandoHistorial(false);
    }
  };

  // ── useEffect: Se ejecuta UNA VEZ al montar el componente ──
  // Carga los datos iniciales (libros, proveedores) y el historial
  useEffect(() => {
    cargarDatos();
    cargarHistorial();
  }, []);

  // ─────────────────────────────────────────────────
  // MANEJADORES DE FORMULARIO
  // ─────────────────────────────────────────────────

  // handleChange: Actualiza el campo correspondiente en formData
  // Usa [name] (propiedad computada) para actualizar dinámicamente
  // el campo que coincide con el atributo "name" del input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // cambiarTipo: Cambia entre ENTRADA y SALIDA
  // Cuando cambia a SALIDA, limpia los campos de proveedor y costo
  // porque esos campos solo aplican para compras (ENTRADA)
  const cambiarTipo = (nuevoTipo) => {
    setFormData(prev => ({
      ...prev,
      tipo_movimiento: nuevoTipo,
      // Si es SALIDA, limpiamos proveedor y costo (no aplican)
      proveedor_id: nuevoTipo === 'SALIDA' ? '' : prev.proveedor_id,
      costo_compra: nuevoTipo === 'SALIDA' ? '' : prev.costo_compra
    }));
  };

  // ─────────────────────────────────────────────────
  // FUNCIÓN: Enviar formulario (registrar movimiento)
  // ─────────────────────────────────────────────────
  // Esta función se ejecuta al hacer clic en "Registrar Compra"
  // o "Registrar Salida". Envía los datos al backend via POST.

  const handleSubmit = async (e) => {
    e.preventDefault(); // Evita que el formulario recargue la página
    setMensaje({ texto: '', tipo: '' }); // Limpia mensajes anteriores

    // Validación: debe seleccionar un libro
    if (!formData.libro_id) {
      return setMensaje({ texto: 'Selecciona un libro', tipo: 'danger' });
    }

    try {
      setEnviando(true);

      // Construimos el objeto que se enviará al backend
      // parseInt y parseFloat convierten strings a números
      const payload = {
        libro_id: parseInt(formData.libro_id, 10),
        tipo_movimiento: formData.tipo_movimiento,
        cantidad: parseInt(formData.cantidad, 10),
        observaciones: formData.observaciones || undefined
      };

      // Si es ENTRADA, agregamos proveedor y costo al payload
      if (esEntrada) {
        payload.proveedor_id = parseInt(formData.proveedor_id, 10);
        payload.costo_compra = parseFloat(formData.costo_compra);
      }

      // POST /api/movimientos → registra el movimiento en la BD
      const res = await api.post('/movimientos', payload);

      // Mostramos mensaje de éxito con info de auditoría
      const { mensaje: msg, datos } = res.data;
      const auditado = datos?.auditado_por ? ` — registrado por ${datos.auditado_por}` : '';
      setMensaje({ texto: (msg || '¡Movimiento registrado!') + auditado, tipo: 'success' });

      // Reseteamos el formulario pero mantenemos el tipo seleccionado
      setFormData({ ...FORM_INICIAL, tipo_movimiento: formData.tipo_movimiento });

      // Recargamos datos (los stocks cambiaron) y el historial
      await Promise.all([cargarDatos(), cargarHistorial()]);
      window.scrollTo(0, 0); // Subimos al inicio para ver el mensaje

    } catch (error) {
      // Mostramos el mensaje de error del backend
      const errorMsg = error.response?.data?.mensaje
        || error.response?.data?.error
        || 'Error al procesar la solicitud';
      setMensaje({ texto: errorMsg, tipo: 'danger' });
    } finally {
      setEnviando(false);
    }
  };

  // ─────────────────────────────────────────────────
  // FUNCIONES UTILITARIAS (formateo de datos)
  // ─────────────────────────────────────────────────

  // Formatea una fecha ISO a formato colombiano (DD/MM HH:MM)
  const formatearFecha = (fecha) =>
    new Date(fecha).toLocaleString('es-CO', {
      month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });

  // Formatea un número a pesos colombianos (ej: $15.000)
  const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency', currency: 'COP', minimumFractionDigits: 0
    }).format(precio || 0);

  // =====================================================
  // RENDERIZADO (JSX)
  // =====================================================
  // La página se divide en 2 columnas:
  //   - Izquierda (col-lg-5): Formulario de registro
  //   - Derecha (col-lg-7): Tabla de últimos movimientos

  return (
    <div className="container-fluid py-4">
      <div className="row g-4">

        {/* ══════════════════════════════════════════════
            COLUMNA IZQUIERDA: FORMULARIO DE REGISTRO
            ══════════════════════════════════════════════ */}
        <div className="col-lg-5">
          <div className="card shadow-sm">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">Registrar Movimiento de Inventario</h5>
            </div>
            <div className="card-body">

              {/* ── Alerta de feedback (éxito o error) ── */}
              {mensaje.texto && (
                <div className={`alert alert-${mensaje.tipo} alert-dismissible fade show`} role="alert">
                  <strong>{mensaje.tipo === 'success' ? '¡Éxito! ' : 'Error: '}</strong>
                  {mensaje.texto}
                  <button type="button" className="btn-close" onClick={() => setMensaje({ texto: '', tipo: '' })} />
                </div>
              )}

              <form onSubmit={handleSubmit}>

                {/* ── TIPO DE MOVIMIENTO (radio buttons estilizados) ── */}
                {/* btn-group convierte los radios en botones visuales */}
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
                  {/* Texto explicativo que cambia según el tipo seleccionado */}
                  <small className="text-muted d-block mt-1">
                    {esEntrada
                      ? 'Ingreso de mercancía comprada a un proveedor.'
                      : 'Ajuste por pérdida, daño o corrección de inventario.'}
                  </small>
                </div>

                {/* ── SELECCIONAR LIBRO ── */}
                {/* Muestra todos los libros con su stock actual */}
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

                {/* ── PROVEEDOR (solo visible cuando es ENTRADA) ── */}
                {/* esEntrada && (...) = renderizado condicional: */}
                {/* solo se muestra este bloque si esEntrada es true */}
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

                {/* ── COSTO DE COMPRA (solo visible cuando es ENTRADA) ── */}
                {/* Muestra el total calculado (costo × cantidad) en tiempo real */}
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
                    {/* Cálculo en tiempo real del total de la compra */}
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

                {/* ── OBSERVACIONES (campo opcional) ── */}
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

                {/* ── BOTÓN DE ENVÍO ── */}
                {/* Cambia de color y texto según el tipo de movimiento */}
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

        {/* ══════════════════════════════════════════════
            COLUMNA DERECHA: HISTORIAL DE MOVIMIENTOS
            ══════════════════════════════════════════════ */}
        <div className="col-lg-7">
          <div className="card shadow-sm">
            <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Últimos Movimientos</h5>
              {/* Botón para recargar el historial manualmente */}
              <button
                className="btn btn-sm btn-outline-light"
                onClick={cargarHistorial}
                disabled={cargandoHistorial}
              >
                {cargandoHistorial ? 'Cargando...' : 'Actualizar'}
              </button>
            </div>
            <div className="card-body p-0">
              {/* Renderizado condicional: spinner, mensaje vacío, o tabla */}
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
                          {/* Badge verde para ENTRADA, rojo para SALIDA */}
                          <td>
                            <span className={`badge ${mov.tipo_movimiento === 'ENTRADA' ? 'bg-success' : 'bg-danger'}`}>
                              {mov.tipo_movimiento}
                            </span>
                          </td>
                          <td>
                            <div className="small fw-semibold">{mov.libro}</div>
                            {/* Muestra observaciones si las hay */}
                            {mov.observaciones && (
                              <div className="small text-muted text-truncate" style={{ maxWidth: 150 }}>
                                {mov.observaciones}
                              </div>
                            )}
                          </td>
                          <td className="text-center fw-bold">{mov.cantidad}</td>
                          {/* Proveedor: verde si tiene, guion si no */}
                          <td className="small">
                            {mov.proveedor
                              ? <span className="text-success">{mov.proveedor}</span>
                              : <span className="text-muted">—</span>}
                          </td>
                          {/* Costo de compra: solo aparece en entradas */}
                          <td className="small">
                            {mov.costo_compra
                              ? <span className="text-info">{formatearPrecio(mov.costo_compra)}</span>
                              : <span className="text-muted">—</span>}
                          </td>
                          {/* Quién registró el movimiento (auditoría) */}
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