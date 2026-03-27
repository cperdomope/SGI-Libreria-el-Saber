/**
 * =====================================================
 * PÁGINA DE VENTAS - PUNTO DE VENTA (POS)
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * EVIDENCIA: GA7-220501096-AA4-EV03
 * AUTOR: Carlos Ivan Perdomo
 *
 * @description Interfaz de punto de venta para registrar
 * ventas de libros. Incluye catálogo, carrito y facturación.
 *
 * FUNCIONALIDADES:
 * - Búsqueda de libros en tiempo real
 * - Carrito de compras con control de stock
 * - Incremento/decremento de cantidades
 * - Cálculo automático de subtotales y total
 * - Selección de cliente para facturación
 * - Validaciones de stock y datos
 *
 * FLUJO DE VENTA:
 * 1. Seleccionar cliente
 * 2. Agregar libros al carrito
 * 3. Ajustar cantidades si es necesario
 * 4. Confirmar venta
 * 5. Se actualiza stock automáticamente
 *
 * @author Equipo de Desarrollo SGI
 * @version 2.0.0
 */

// En React 19 con Vite no es necesario importar React explicitamente.
// Solo importamos los hooks que usamos en este componente.
import { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';

// URL base para imágenes de portada locales (fallback si no es URL Cloudinary)
const URL_PORTADAS = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api')
  .replace('/api', '') + '/uploads/portadas';

// =====================================================
// ICONOS SVG (Feather Icons - MIT License)
// =====================================================

/**
 * Icono de lupa - Búsqueda de productos
 */
const IconoBuscar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

/**
 * Icono de usuario - Sección de facturación
 */
const IconoUsuario = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);

/**
 * Icono de basura - Eliminar del carrito
 */
const IconoBasura = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

/**
 * Icono de ojo - Ver detalle del libro
 */
const IconoOjo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

/**
 * Resuelve la URL de portada: Cloudinary (http) o archivo local
 */
const obtenerUrlPortada = (portada) => {
  if (!portada) return null;
  return portada.startsWith('http') ? portada : `${URL_PORTADAS}/${portada}`;
};

// =====================================================
// UTILIDADES DE CÁLCULO
// =====================================================

/**
 * Convierte un valor a número de forma segura.
 * Retorna 0 si el valor no es un número válido.
 *
 * @param {*} valor - Valor a convertir
 * @returns {number} Número válido o 0
 */
const parsearNumero = (valor) => {
  const num = Number(valor);
  return isNaN(num) ? 0 : num;
};

/**
 * Calcula el subtotal de un item del carrito.
 *
 * @param {number} cantidad - Cantidad de unidades
 * @param {number} precio - Precio unitario
 * @returns {number} Subtotal calculado
 */
const calcularSubtotal = (cantidad, precio) => {
  return parsearNumero(cantidad) * parsearNumero(precio);
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

/**
 * Punto de Venta (POS) para registro de ventas.
 * Gestiona catálogo, carrito y proceso de facturación.
 *
 * @returns {JSX.Element} Interfaz completa del POS
 */
const PaginaVentas = () => {
  // ─────────────────────────────────────────────────
  // ESTADOS
  // ─────────────────────────────────────────────────

  // Datos del catálogo y clientes
  const [libros, setLibros] = useState([]);
  const [clientes, setClientes] = useState([]);

  // Control de búsqueda
  const [busqueda, setBusqueda] = useState('');

  // Carrito de compras, cliente, método de pago y descuento
  const [carrito, setCarrito] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // Libro seleccionado para ver detalle (modal "Ver")
  const [libroDetalle, setLibroDetalle] = useState(null);

  // ─────────────────────────────────────────────────
  // FILTRADO DE LIBROS (memoizado)
  // ─────────────────────────────────────────────────
  const librosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return libros;
    const termino = busqueda.toLowerCase().trim();
    return libros.filter(l =>
      l.titulo?.toLowerCase().includes(termino) ||
      l.isbn?.toLowerCase().includes(termino)
    );
  }, [libros, busqueda]);

  // ─────────────────────────────────────────────────
  // CARGA INICIAL DE DATOS
  // ─────────────────────────────────────────────────

  /**
   * Carga libros y clientes al montar el componente.
   * Usa Promise.all para optimizar las peticiones.
   */
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // Cargar libros y clientes en paralelo
        const [resLibros, resClientes] = await Promise.all([
          api.get('/libros'),
          api.get('/clientes')
        ]);

        // Extraer datos considerando estructura de respuesta
        setLibros(resLibros.data.datos || resLibros.data);
        setClientes(resClientes.data.datos || resClientes.data);
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[POS] Error cargando datos:', error);
        }
        alert('Error conectando con el servidor. Verifica que estés autenticado.');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // ─────────────────────────────────────────────────
  // CÁLCULOS DEL CARRITO
  // ─────────────────────────────────────────────────

  // Subtotal: suma de todos los items sin descuento
  const subtotal = useMemo(
    () => carrito.reduce((sum, item) => sum + calcularSubtotal(item.cantidad, item.precio), 0),
    [carrito]
  );

  // Monto del descuento en pesos (porcentaje aplicado al subtotal)
  const montoDescuento = useMemo(
    () => Math.round(subtotal * (parsearNumero(descuentoPorcentaje) / 100)),
    [subtotal, descuentoPorcentaje]
  );

  // Total final = subtotal - descuento
  const total = subtotal - montoDescuento;

  // ─────────────────────────────────────────────────
  // GESTIÓN DEL CARRITO
  // ─────────────────────────────────────────────────

  /**
   * Agrega un libro al carrito o incrementa su cantidad.
   * Valida stock disponible antes de agregar.
   *
   * @param {Object} libro - Libro a agregar
   */
  const agregarAlCarrito = useCallback((libro) => {
    const precio = parsearNumero(libro.precio_venta);
    const stock = parsearNumero(libro.stock_actual);

    setCarrito(prevCarrito => {
      const indice = prevCarrito.findIndex(item => item.id === libro.id);

      if (indice >= 0) {
        // Ya existe en el carrito - verificar stock
        if (prevCarrito[indice].cantidad >= stock) {
          alert(`Stock insuficiente. Solo hay ${stock} unidades.`);
          return prevCarrito;
        }

        // Incrementar cantidad
        const nuevoCarrito = [...prevCarrito];
        nuevoCarrito[indice] = {
          ...nuevoCarrito[indice],
          cantidad: nuevoCarrito[indice].cantidad + 1
        };
        return nuevoCarrito;
      } else {
        // Nuevo item en el carrito
        return [...prevCarrito, {
          id: libro.id,
          titulo: libro.titulo,
          precio: precio,
          stock: stock,
          cantidad: 1
        }];
      }
    });
  }, []);

  /**
   * Elimina un libro del carrito por su ID.
   *
   * @param {number} id - ID del libro a eliminar
   */
  const eliminarDelCarrito = useCallback((id) => {
    setCarrito(prevCarrito => prevCarrito.filter(item => item.id !== id));
  }, []);

  /**
   * Incrementa la cantidad de un item en el carrito.
   * Valida que no exceda el stock disponible.
   *
   * @param {number} id - ID del libro
   */
  const incrementarCantidad = useCallback((id) => {
    setCarrito(prevCarrito => {
      return prevCarrito.map(item => {
        if (item.id === id) {
          if (item.cantidad >= item.stock) {
            alert(`Stock insuficiente. Solo hay ${item.stock} unidades.`);
            return item;
          }
          return { ...item, cantidad: item.cantidad + 1 };
        }
        return item;
      });
    });
  }, []);

  /**
   * Decrementa la cantidad de un item en el carrito.
   * No permite bajar de 1 unidad.
   *
   * @param {number} id - ID del libro
   */
  const decrementarCantidad = useCallback((id) => {
    setCarrito(prevCarrito => {
      return prevCarrito.map(item => {
        if (item.id === id && item.cantidad > 1) {
          return { ...item, cantidad: item.cantidad - 1 };
        }
        return item;
      });
    });
  }, []);

  // ─────────────────────────────────────────────────
  // PROCESO DE VENTA
  // ─────────────────────────────────────────────────

  /**
   * Procesa y registra la venta en el backend.
   * Valida datos, confirma con usuario y actualiza inventario.
   *
   * @async
   * @returns {Promise<void>}
   */
  const confirmarVenta = useCallback(async () => {
    // Validaciones previas
    if (!clienteId) {
      alert('Por favor selecciona un cliente.');
      return;
    }

    if (carrito.length === 0) {
      alert('El carrito está vacío.');
      return;
    }

    // Confirmar con el usuario
    if (!window.confirm(`¿Confirmar venta por $${total.toLocaleString('es-CO')}?`)) {
      return;
    }

    setProcesando(true);

    try {
      // Preparar datos para el backend
      const datosVenta = {
        cliente_id: clienteId,
        subtotal: subtotal,
        descuento: montoDescuento,
        total: total,
        metodo_pago: metodoPago,
        items: carrito.map(item => ({
          libro_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio
        }))
      };

      const respuesta = await api.post('/ventas', datosVenta);

      alert(`Venta registrada exitosamente. ID: ${respuesta.data.ventaId}`);

      // Limpiar carrito, selección y descuento
      setCarrito([]);
      setClienteId('');
      setDescuentoPorcentaje(0);

      // Recargar inventario para reflejar nuevo stock
      const resLibros = await api.get('/libros');
      setLibros(resLibros.data.datos || resLibros.data);

    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[POS] Error al guardar venta:', error);
      }
      alert(error.response?.data?.mensaje || 'Hubo un error al guardar la venta.');
    } finally {
      setProcesando(false);
    }
  }, [clienteId, carrito, total, subtotal, montoDescuento, metodoPago]);

  // ─────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────

  return (
    <div className="container-fluid h-100 bg-light p-4">
      <div className="row">

        {/* ─────────────────────────────────────────────────
            COLUMNA IZQUIERDA: CATÁLOGO DE LIBROS
            (en móvil aparece debajo del carrito)
            ───────────────────────────────────────────────── */}
        <div className="col-md-8 pos-catalog">
          <div className="mb-3">
            <h4 className="fw-bold mb-2">Catálogo de Libros</h4>
            <div className="input-group">
              <span className="input-group-text"><IconoBuscar /></span>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar por título..."
                value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
              />
            </div>
          </div>

          <div className="row">
            {/* Tres estados: cargando, sin resultados, o catalogo */}
            {loading ? (
              <div className="col-12 text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            ) : librosFiltrados.length === 0 ? (
              <div className="col-12 text-center">
                <p className="text-muted">
                  {busqueda ? `No se encontraron libros para "${busqueda}"` : 'No hay libros disponibles'}
                </p>
              </div>
            ) : (
              librosFiltrados.map(libro => {
                  const urlPortada = obtenerUrlPortada(libro.portada);
                  const stock = parsearNumero(libro.stock_actual);
                  return (
                    <div key={libro.id} className="col-6 col-sm-4 col-md-3 mb-3">
                      <div className="card shadow-sm h-100 border-0" style={{ borderRadius: 12, overflow: 'hidden' }}>

                        {/* Portada del libro */}
                        <div
                          className="d-flex align-items-center justify-content-center bg-light position-relative"
                          style={{ height: 180, cursor: 'pointer' }}
                          onClick={() => agregarAlCarrito(libro)}
                        >
                          {urlPortada ? (
                            <img
                              src={urlPortada}
                              alt={libro.titulo}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                            />
                          ) : null}
                          <div
                            className="align-items-center justify-content-center text-muted"
                            style={{
                              display: urlPortada ? 'none' : 'flex',
                              width: '100%', height: '100%',
                              fontSize: 12, flexDirection: 'column',
                              background: '#e9ecef'
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16">
                              <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
                            </svg>
                            <small className="mt-1">Sin portada</small>
                          </div>

                          {/* Badge de stock */}
                          <span
                            className={`badge position-absolute ${stock <= 3 ? 'bg-danger' : 'bg-success'}`}
                            style={{ top: 8, right: 8, fontSize: 10 }}
                          >
                            {stock} uds
                          </span>
                        </div>

                        {/* Info: precio, título, autor, botón ver */}
                        <div className="card-body p-2 d-flex flex-column">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="fw-bold" style={{ color: '#053225', fontSize: '0.95rem' }}>
                              ${parsearNumero(libro.precio_venta).toLocaleString('es-CO')}
                            </span>
                            <button
                              className="btn btn-outline-secondary btn-sm py-0 px-1"
                              title="Ver detalle"
                              onClick={(e) => { e.stopPropagation(); setLibroDetalle(libro); }}
                            >
                              <IconoOjo />
                            </button>
                          </div>
                          <p className="fw-semibold mb-0" style={{ fontSize: 13, lineHeight: 1.3 }}>
                            {libro.titulo}
                          </p>
                          <p className="text-muted mb-2" style={{ fontSize: 12, lineHeight: 1.3 }}>
                            {libro.autor || 'Sin autor'}
                          </p>
                          <button
                            className="btn btn-primary w-100 btn-sm d-flex align-items-center justify-content-center gap-1 mt-auto"
                            onClick={() => agregarAlCarrito(libro)}
                            disabled={stock <= 0}
                            style={{ fontSize: 12 }}
                          >
                            {stock > 0 ? 'Seleccionar Libro' : 'Sin stock'}
                            {stock > 0 && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                                <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                              </svg>
                            )}
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })

            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────
            COLUMNA DERECHA: RESUMEN DE FACTURACIÓN
            (en móvil aparece primero)
            ───────────────────────────────────────────────── */}
        <div className="col-md-4 pos-cart">
          <div className="card shadow" style={{ position: 'sticky', top: '1rem' }}>
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0"><IconoUsuario /> Facturación</h5>
            </div>
            <div className="card-body">

              {/* Selector de Cliente */}
              <label className="form-label">Cliente:</label>
              <select
                className="form-select mb-3"
                value={clienteId}
                onChange={e => setClienteId(e.target.value)}
              >
                <option value="">-- Seleccionar --</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre_completo}</option>
                ))}
              </select>

              {/* Selector de Método de Pago */}
              <label className="form-label">Método de pago:</label>
              <select
                className="form-select mb-3"
                value={metodoPago}
                onChange={e => setMetodoPago(e.target.value)}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Mixto">Mixto</option>
              </select>

              {/* Descuento en porcentaje */}
              <label className="form-label">Descuento (%):</label>
              <div className="input-group mb-3">
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  max="100"
                  step="1"
                  value={descuentoPorcentaje}
                  onChange={e => {
                    let valor = parsearNumero(e.target.value);
                    if (valor < 0) valor = 0;
                    if (valor > 100) valor = 100;
                    setDescuentoPorcentaje(valor);
                  }}
                />
                <span className="input-group-text">%</span>
              </div>

              <hr />

              {/* Lista de productos en carrito */}
              <h6>Productos en Carrito:</h6>
              <ul className="list-group list-group-flush mb-3" style={{ maxHeight: '35vh', overflowY: 'auto' }}>
                {carrito.length === 0 && (
                  <li className="list-group-item text-muted">Carrito vacío</li>
                )}
                {carrito.map((item) => {
                  const subtotalItem = calcularSubtotal(item.cantidad, item.precio);

                  return (
                    <li key={item.id} className="list-group-item">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="flex-grow-1">
                          <strong className="d-block">{item.titulo}</strong>
                          <small className="text-muted">
                            Precio unitario: ${parsearNumero(item.precio).toLocaleString('es-CO')}
                          </small>
                        </div>
                        <button
                          className="btn btn-sm btn-danger py-0 px-2"
                          onClick={() => eliminarDelCarrito(item.id)}
                          title="Eliminar del carrito"
                        >
                          <IconoBasura />
                        </button>
                      </div>

                      {/* Control de cantidad */}
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="btn-group btn-group-sm" role="group">
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => decrementarCantidad(item.id)}
                            disabled={item.cantidad <= 1}
                          >
                            −
                          </button>
                          <input
                            type="text"
                            className="form-control form-control-sm text-center"
                            style={{ maxWidth: '60px' }}
                            value={item.cantidad}
                            readOnly
                          />
                          <button
                            className="btn btn-outline-secondary"
                            onClick={() => incrementarCantidad(item.id)}
                            disabled={item.cantidad >= item.stock}
                          >
                            +
                          </button>
                        </div>
                        <strong className="text-success" style={{ fontSize: '1.1rem' }}>
                          ${subtotalItem.toLocaleString('es-CO')}
                        </strong>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Resumen de totales */}
              <div className="alert alert-success text-center mb-3" style={{ backgroundColor: '#d1e7dd' }}>
                {montoDescuento > 0 ? (
                  <>
                    <div className="d-flex justify-content-between small text-muted mb-1">
                      <span>Subtotal:</span>
                      <span>${subtotal.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="d-flex justify-content-between small text-danger mb-1">
                      <span>Descuento ({descuentoPorcentaje}%):</span>
                      <span>-${montoDescuento.toLocaleString('es-CO')}</span>
                    </div>
                    <hr className="my-1" />
                  </>
                ) : null}
                <div className="mb-1 text-muted small">Total a Pagar:</div>
                <h3 className="mb-0 fw-bold text-success">
                  ${total.toLocaleString('es-CO')}
                </h3>
              </div>
              <button
                className="btn btn-success w-100 btn-lg"
                onClick={confirmarVenta}
                disabled={carrito.length === 0 || procesando}
              >
                {procesando ? 'Procesando...' : 'CONFIRMAR VENTA'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* ─────────────────────────────────────────────────
          MODAL: DETALLE DEL LIBRO (botón "Ver")
          ───────────────────────────────────────────────── */}
      {libroDetalle && (
        <div
          className="modal d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={() => setLibroDetalle(null)}
        >
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow" style={{ borderRadius: 16, overflow: 'hidden' }}>

              {/* Botón cerrar */}
              <button
                className="btn btn-dark btn-sm position-absolute"
                style={{ top: 10, right: 10, borderRadius: '50%', width: 32, height: 32, padding: 0, zIndex: 10 }}
                onClick={() => setLibroDetalle(null)}
              >
                &times;
              </button>

              {/* Cuerpo con scroll vertical */}
              <div className="modal-body p-0" style={{ maxHeight: '80vh', overflowY: 'auto' }}>

                {/* Portada completa */}
                <div className="d-flex align-items-center justify-content-center bg-light">
                  {obtenerUrlPortada(libroDetalle.portada) ? (
                    <img
                      src={obtenerUrlPortada(libroDetalle.portada)}
                      alt={libroDetalle.titulo}
                      style={{ width: '100%', maxHeight: 420, objectFit: 'contain', padding: 16 }}
                    />
                  ) : (
                    <div className="text-muted d-flex flex-column align-items-center py-5">
                      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
                      </svg>
                      <span className="mt-2">Sin portada</span>
                    </div>
                  )}
                </div>

                {/* Información del libro */}
                <div className="p-3">
                  <h5 className="fw-bold mb-2">{libroDetalle.titulo}</h5>

                  {/* Reseña / Descripción (máx. 5 líneas visibles) */}
                  {libroDetalle.descripcion && (
                    <div className="mb-3">
                      <h6 className="text-muted mb-1" style={{ fontSize: 13 }}>Reseña</h6>
                      <p style={{
                        fontSize: 14,
                        lineHeight: 1.6,
                        color: '#444',
                        textAlign: 'justify',
                        display: '-webkit-box',
                        WebkitLineClamp: 5,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {libroDetalle.descripcion}
                      </p>
                    </div>
                  )}

                  <div className="row g-2 mb-3" style={{ fontSize: 14 }}>
                    <div className="col-6 d-flex align-items-center gap-2">
                      <IconoUsuario />
                      <div>
                        <small className="text-muted d-block">Autor</small>
                        <span className="fw-semibold">{libroDetalle.autor || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="col-6 d-flex align-items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                      <div>
                        <small className="text-muted d-block">Categoría</small>
                        <span className="fw-semibold">{libroDetalle.categoria || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="col-6 d-flex align-items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 12h10M7 17h6"/></svg>
                      <div>
                        <small className="text-muted d-block">ISBN</small>
                        <span className="fw-semibold">{libroDetalle.isbn || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="col-6 d-flex align-items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"/></svg>
                      <div>
                        <small className="text-muted d-block">Precio</small>
                        <span className="fw-bold" style={{ color: '#053225' }}>
                          ${parsearNumero(libroDetalle.precio_venta).toLocaleString('es-CO')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <span className={`badge ${parsearNumero(libroDetalle.stock_actual) <= 3 ? 'bg-danger' : 'bg-success'}`}>
                      Stock: {parsearNumero(libroDetalle.stock_actual)} unidades
                    </span>
                    <button
                      className="btn btn-primary btn-sm d-flex align-items-center gap-1"
                      disabled={parsearNumero(libroDetalle.stock_actual) <= 0}
                      onClick={() => { agregarAlCarrito(libroDetalle); setLibroDetalle(null); }}
                    >
                      Seleccionar Libro
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                      </svg>
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PaginaVentas;
