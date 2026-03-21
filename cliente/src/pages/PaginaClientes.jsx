// =====================================================
// PÁGINA: GESTIÓN DE CLIENTES
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Permite gestionar los clientes de la librería.
//   Es un módulo CRUD (Crear, Leer, Actualizar, Eliminar)
//   con las siguientes funcionalidades:
//     - Ver la lista de clientes en una tabla con buscador
//     - Registrar un nuevo cliente desde un modal
//     - Editar los datos de un cliente existente
//     - Eliminar un cliente (con confirmación)
//
// ¿Cómo se conecta con el sistema?
//   1. Se renderiza en la ruta /clientes (ver App.jsx)
//   2. Llama a la API: GET /api/clientes, POST, PUT, DELETE
//   3. Los clientes se asocian a las ventas (cada venta tiene
//      un cliente_id que identifica quién compró)
//   4. El Dashboard muestra los "mejores clientes" usando estos datos
//
// ¿Qué diferencia tiene con PaginaAutores/PaginaCategorias?
//   - Tiene más campos (documento, email, teléfono, dirección)
//   - Incluye un buscador con filtro usando useMemo
//   - El modal es más complejo (más campos de formulario)
//
// =====================================================

import { useState, useEffect, useMemo } from 'react';
// api: cliente HTTP con Axios (incluye token JWT automáticamente)
import api from '../services/api';
// useAuth: para verificar permisos RBAC del usuario
import { useAuth } from '../context/AuthContext';

// --- ICONOS SVG INLINE (evita dependencias externas) ---
const IconoPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-plus-lg" viewBox="0 0 16 16">
    <path fillRule="evenodd" d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2Z"/>
  </svg>
);

const IconoEditar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
  </svg>
);

const IconoEliminar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
  </svg>
);

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
const PaginaClientes = () => {

  // ── Verificación de permisos (RBAC) ──
  const { tienePermiso } = useAuth();

  // ── ESTADOS DEL COMPONENTE ──
  const [clientes, setClientes] = useState([]);        // Lista de clientes del backend
  const [cargando, setCargando] = useState(true);       // Spinner mientras carga
  const [error, setError] = useState(null);             // Mensajes de error
  const [mostrarModal, setMostrarModal] = useState(false); // Controla visibilidad del modal

  // formDatos: datos del formulario del modal (crear o editar)
  // Si id es null → crear nuevo | Si id tiene valor → editar existente
  const [formDatos, setFormDatos] = useState({
    id: null,
    nombre_completo: '',
    documento: '',
    email: '',
    telefono: '',
    direccion: ''
  });

  // ── BUSCADOR ──
  // Permite buscar clientes por nombre o documento sin recargar la página
  const [busqueda, setBusqueda] = useState('');

  // ── PAGINACIÓN (5 clientes por página) ──
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 5;

  // ── FILTRADO CON useMemo ──
  // useMemo memoriza el resultado del filtro para no recalcular
  // en cada render (optimización de rendimiento).
  // Si no hay búsqueda, devuelve todos los clientes.
  // Si hay búsqueda, filtra por nombre o documento.
  const clientesFiltrados = useMemo(() => {
    if (!busqueda.trim()) return clientes;
    const termino = busqueda.toLowerCase().trim();
    return clientes.filter((c) =>
      c.nombre_completo?.toLowerCase().includes(termino) ||
      c.documento?.toLowerCase().includes(termino)
    );
  }, [clientes, busqueda]);

  // Calcular qué clientes mostrar en la página actual
  // (se aplica SOBRE los resultados filtrados, no sobre todos)
  const indiceInicio = (paginaActual - 1) * elementosPorPagina;
  const indiceFin = indiceInicio + elementosPorPagina;
  const clientesPaginados = clientesFiltrados.slice(indiceInicio, indiceFin);
  const totalPaginas = Math.ceil(clientesFiltrados.length / elementosPorPagina);

  // Se ejecuta al montar el componente (primera carga de la página)
  useEffect(() => {
    cargarClientes();
  }, []);

  // ─────────────────────────────────────────────────────
  // FUNCIÓN: Cargar clientes desde la API
  // ─────────────────────────────────────────────────────
  // GET /api/clientes → { exito: true, datos: [...] }
  const cargarClientes = async () => {
    try {
      setCargando(true);
      const respuesta = await api.get('/clientes');
      // Extraer datos considerando estructura { exito, datos }
      const clientesData = respuesta.data.datos || respuesta.data;
      setClientes(Array.isArray(clientesData) ? clientesData : []);
    } catch (err) {
      setError(err.message);
      if (import.meta.env.DEV) {
        console.error('[PaginaClientes] Error:', err);
      }
    } finally {
      setCargando(false);
    }
  };

  // ── Actualizar un campo del formulario ──
  // Usa [name] (computed property) para actualizar dinámicamente
  // cualquier campo del formulario con una sola función.
  // Ej: si name="email" y value="test@mail.com" → { ...formDatos, email: "test@mail.com" }
  const manejarCambioInput = (e) => {
    const { name, value } = e.target;
    setFormDatos({ ...formDatos, [name]: value });
  };

  // ─────────────────────────────────────────────────────
  // FUNCIONES DEL MODAL
  // ─────────────────────────────────────────────────────

  // Preparar formulario para CREAR un cliente nuevo (campos vacíos)
  const abrirModalCrear = () => {
    setFormDatos({
      id: null,
      nombre_completo: '',
      documento: '',
      email: '',
      telefono: '',
      direccion: ''
    });
    setError(null);
    setMostrarModal(true);
  };

  // Preparar formulario para EDITAR (llenar con datos del cliente seleccionado)
  const abrirModalEditar = (cliente) => {
    setFormDatos(cliente);
    setError(null);
    setMostrarModal(true);
  };

  // Cerrar modal y limpiar errores
  const cerrarModal = () => {
    setMostrarModal(false);
    setError(null);
  };

  // ─────────────────────────────────────────────────────
  // FUNCIÓN: Guardar cliente (crear o actualizar)
  // ─────────────────────────────────────────────────────
  // Si formDatos.id existe → PUT (actualizar)
  // Si formDatos.id es null → POST (crear nuevo)
  const manejarGuardar = async (e) => {
    e.preventDefault();
    setError(null);

    // Validaciones básicas de Frontend
    if (!formDatos.nombre_completo || !formDatos.documento) {
      setError("El nombre y el documento son obligatorios.");
      return;
    }

    try {
      if (formDatos.id) {
        // Actualizar cliente existente
        await api.put(`/clientes/${formDatos.id}`, formDatos);
      } else {
        // Crear nuevo cliente
        await api.post('/clientes', formDatos);
      }

      // Recargar tabla y cerrar modal
      await cargarClientes();
      cerrarModal();
    } catch (err) {
      setError(err.response?.data?.mensaje || err.message);
    }
  };

  // ─────────────────────────────────────────────────────
  // FUNCIÓN: Eliminar cliente (con confirmación)
  // ─────────────────────────────────────────────────────
  const manejarEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este cliente? Esta acción no se puede deshacer.')) return;

    try {
      await api.delete(`/clientes/${id}`);
      await cargarClientes();
    } catch (err) {
      // Mostrar mensaje del backend o error genérico
      setError(err.response?.data?.mensaje || err.message);
    }
  };

  return (
    <div className="container-fluid p-4">
      {/* Encabezado */}
      <div className="module-header mb-4 shadow-sm" style={{ borderRadius: '8px' }}>
        <h2 className="text-white fw-bold">Gestión de Clientes</h2>
        {tienePermiso('crearCliente') && (
          <button className="btn btn-light btn-sm d-flex align-items-center gap-2" onClick={abrirModalCrear}>
            <IconoPlus /> Nuevo Cliente
          </button>
        )}
      </div>

      {/* Mensaje de Error General */}
      {error && !mostrarModal && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      {/* Buscador */}
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Buscar por nombre o número de documento..."
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setPaginaActual(1);
          }}
        />
        {busqueda && (
          <small className="text-muted">
            {clientesFiltrados.length} cliente(s) encontrado(s) para "{busqueda}"
          </small>
        )}
      </div>

      {/* Tabla de Clientes */}
      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light text-secondary">
                <tr>
                  <th className="ps-4">Documento</th>
                  <th>Nombre Completo</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th className="text-end pe-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {cargando ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4">Cargando datos...</td>
                  </tr>
                ) : clientes.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-4 text-muted">No hay clientes registrados.</td>
                  </tr>
                ) : (
                  clientesPaginados.map((cliente) => (
                    <tr key={cliente.id}>
                      <td className="ps-4 fw-medium">{cliente.documento}</td>
                      <td>{cliente.nombre_completo}</td>
                      <td>{cliente.email || <span className="text-muted small">N/A</span>}</td>
                      <td>{cliente.telefono || <span className="text-muted small">N/A</span>}</td>
                      <td className="text-center action-buttons">
                        {tienePermiso('editarCliente') && (
                          <button
                            className="btn btn-outline-primary btn-sm me-1"
                            onClick={() => abrirModalEditar(cliente)}
                            title="Editar"
                          >
                            <IconoEditar />
                          </button>
                        )}
                        {tienePermiso('eliminarCliente') && (
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => manejarEliminar(cliente.id)}
                            title="Eliminar"
                          >
                            <IconoEliminar />
                          </button>
                        )}
                        {!tienePermiso('editarCliente') && !tienePermiso('eliminarCliente') && (
                          <span className="text-muted small">Solo lectura</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Controles de Paginación */}
        {!cargando && totalPaginas > 1 && (
          <nav className="d-flex justify-content-center mt-3">
            <ul className="pagination pagination-sm">
              <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPaginaActual(paginaActual - 1)} disabled={paginaActual === 1}>
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
                <button className="page-link" onClick={() => setPaginaActual(paginaActual + 1)} disabled={paginaActual === totalPaginas}>
                  Siguiente
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>

      {/* Modal Personalizado (Usando clases Bootstrap sin JS externo) */}
      {mostrarModal && (
        <>
          <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down" role="document">
              <div className="modal-content shadow">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">
                    {formDatos.id ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={cerrarModal}></button>
                </div>
                <form onSubmit={manejarGuardar}>
                  <div className="modal-body">
                    {error && <div className="alert alert-danger py-2">{error}</div>}
                    
                    <div className="mb-3">
                      <label className="form-label small text-muted fw-bold">Documento *</label>
                      <input
                        type="text"
                        name="documento"
                        className="form-control"
                        value={formDatos.documento}
                        onChange={manejarCambioInput}
                        required
                        autoFocus
                      />
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label small text-muted text-uppercase fw-bold">Nombre Completo *</label>
                      <input 
                        type="text" 
                        name="nombre_completo"
                        className="form-control" 
                        value={formDatos.nombre_completo} 
                        onChange={manejarCambioInput}
                        required 
                      />
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label className="form-label small text-muted text-uppercase fw-bold">Email</label>
                        <input 
                          type="email" 
                          name="email"
                          className="form-control" 
                          value={formDatos.email} 
                          onChange={manejarCambioInput}
                        />
                      </div>
                      <div className="col-md-6 mb-3">
                        <label className="form-label small text-muted text-uppercase fw-bold">Teléfono</label>
                        <input 
                          type="tel" 
                          name="telefono"
                          className="form-control" 
                          value={formDatos.telefono} 
                          onChange={manejarCambioInput}
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label small text-muted text-uppercase fw-bold">Dirección</label>
                      <input 
                        type="text" 
                        name="direccion"
                        className="form-control" 
                        value={formDatos.direccion} 
                        onChange={manejarCambioInput}
                      />
                    </div>
                  </div>
                  <div className="modal-footer bg-light">
                    <button type="button" className="btn btn-secondary" onClick={cerrarModal}>Cancelar</button>
                    <button type="submit" className="btn btn-primary">
                      {formDatos.id ? 'Actualizar Datos' : 'Guardar Cliente'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default PaginaClientes;