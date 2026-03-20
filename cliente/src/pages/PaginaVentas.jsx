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

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '../services/api';

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

  // Carrito de compras y cliente seleccionado
  const [carrito, setCarrito] = useState([]);
  const [clienteId, setClienteId] = useState('');

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

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

  // Memoizado para que no recalcule en renders no relacionados con el carrito
  const total = useMemo(
    () => carrito.reduce((sum, item) => sum + calcularSubtotal(item.cantidad, item.precio), 0),
    [carrito]
  );

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
        total: total,
        items: carrito.map(item => ({
          libro_id: item.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio
        }))
      };

      const respuesta = await api.post('/ventas', datosVenta);

      alert(`Venta registrada exitosamente. ID: ${respuesta.data.ventaId}`);

      // Limpiar carrito y selección
      setCarrito([]);
      setClienteId('');

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
  }, [clienteId, carrito]);

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
            <h3 className="mb-2">Catálogo de Libros</h3>
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
            {loading ? (
              <div className="col-12 text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            ) : libros.length === 0 ? (
              <div className="col-12 text-center">
                <p className="text-muted">No hay libros disponibles</p>
              </div>
            ) : (
              librosFiltrados.map(libro => (
                  <div key={libro.id} className="col-12 col-sm-6 col-md-4 mb-3">
                    <div className="card shadow-sm h-100">
                      <div className="card-body">
                        <h5 className="card-title text-truncate">{libro.titulo}</h5>
                        <p className="card-text text-muted small">
                          Autor ID: {libro.autor_id || 'N/A'}
                        </p>
                        <h6 className="text-primary fw-bold">
                          ${parsearNumero(libro.precio_venta).toLocaleString('es-CO')}
                        </h6>
                        <small>Disponibles: {parsearNumero(libro.stock_actual)}</small>
                        <button
                          className="btn btn-primary w-100 mt-2 btn-sm"
                          onClick={() => agregarAlCarrito(libro)}
                          disabled={parsearNumero(libro.stock_actual) <= 0}
                        >
                          {parsearNumero(libro.stock_actual) > 0 ? '+ Agregar' : 'Agotado'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
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

              {/* Total y Botón de Confirmación */}
              <div className="alert alert-success text-center mb-3" style={{ backgroundColor: '#d1e7dd' }}>
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
    </div>
  );
};

export default PaginaVentas;
