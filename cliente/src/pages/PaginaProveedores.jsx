// =====================================================
// PÁGINA: GESTIÓN DE PROVEEDORES
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Permite al administrador gestionar los proveedores de la librería.
//   Los proveedores son las empresas o personas que nos venden
//   los libros que ingresamos al inventario.
//
// ¿Cómo se conecta con el sistema?
//   1. Se renderiza en la ruta /proveedores (ver App.jsx)
//   2. Llama a la API: GET /api/proveedores, POST, PUT, DELETE
//   3. Los proveedores se usan en el módulo de Movimientos (Kardex):
//      al registrar una ENTRADA de inventario, se indica de qué
//      proveedor viene la mercancía.
//   4. Solo los Administradores pueden acceder a esta página
//
// Patrón CRUD: mismo que PaginaAutores y PaginaCategorias,
//   pero con más campos (NIT, contacto, email, teléfono, dirección)
//
// =====================================================

import { useState, useEffect } from 'react';
// api: cliente HTTP con Axios (incluye token JWT automáticamente)
import api from '../services/api';

// --- ICONOS SVG INLINE (evita dependencias externas) ---
const IconoPlus = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
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
const PaginaProveedores = () => {

  // ── ESTADOS DEL COMPONENTE ──
  const [proveedores, setProveedores] = useState([]);    // Lista de proveedores del backend
  const [cargando, setCargando] = useState(true);        // Spinner mientras carga
  const [error, setError] = useState(null);              // Mensajes de error
  const [mostrarModal, setMostrarModal] = useState(false); // Visibilidad del modal

  // formDatos: datos del formulario (crear o editar)
  // id=null → crear nuevo | id=número → editar existente
  const [formDatos, setFormDatos] = useState({
    id: null,
    nombre_empresa: '',
    nit: '',
    nombre_contacto: '',
    email: '',
    telefono: '',
    direccion: ''
  });

  // ── PAGINACIÓN (5 proveedores por página) ──
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 5;

  // Calculamos qué proveedores mostrar en la página actual
  const indiceInicio = (paginaActual - 1) * elementosPorPagina;
  const indiceFin = indiceInicio + elementosPorPagina;
  const proveedoresPaginados = proveedores.slice(indiceInicio, indiceFin);
  const totalPaginas = Math.ceil(proveedores.length / elementosPorPagina);

  // Se ejecuta al montar el componente (primera carga)
  useEffect(() => {
    cargarProveedores();
  }, []);

  // ─────────────────────────────────────────────────────
  // FUNCIÓN: Cargar proveedores desde la API
  // ─────────────────────────────────────────────────────
  // GET /api/proveedores → { exito: true, datos: [...] }
  const cargarProveedores = async () => {
    try {
      setCargando(true);
      const respuesta = await api.get('/proveedores');
      // Extraer datos considerando estructura { exito, datos }
      const proveedoresData = respuesta.data.datos || respuesta.data;
      setProveedores(Array.isArray(proveedoresData) ? proveedoresData : []);
      setError(null);
    } catch (err) {
      setError('Error al cargar proveedores');
      if (import.meta.env.DEV) {
        console.error('[PaginaProveedores] Error:', err);
      }
    } finally {
      setCargando(false);
    }
  };

  // ── Actualizar un campo del formulario dinámicamente ──
  // [name] es una "computed property": usa el atributo name del input
  // como clave del objeto. Así una sola función sirve para todos los campos.
  const manejarCambioInput = (e) => {
    const { name, value } = e.target;
    setFormDatos({ ...formDatos, [name]: value });
  };

  // ─────────────────────────────────────────────────────
  // FUNCIONES DEL MODAL
  // ─────────────────────────────────────────────────────

  // Preparar formulario para CREAR (campos vacíos)
  const abrirModalCrear = () => {
    setFormDatos({
      id: null,
      nombre_empresa: '',
      nit: '',
      nombre_contacto: '',
      email: '',
      telefono: '',
      direccion: ''
    });
    setError(null);
    setMostrarModal(true);
  };

  // Preparar formulario para EDITAR (llenar con datos existentes)
  const abrirModalEditar = (proveedor) => {
    setFormDatos(proveedor);
    setError(null);
    setMostrarModal(true);
  };

  // Cerrar modal y limpiar errores
  const cerrarModal = () => {
    setMostrarModal(false);
    setError(null);
  };

  // ─────────────────────────────────────────────────────
  // FUNCIÓN: Guardar proveedor (crear o actualizar)
  // ─────────────────────────────────────────────────────
  const manejarGuardar = async (e) => {
    e.preventDefault();
    setError(null);

    // Validación de campo obligatorio
    if (!formDatos.nombre_empresa) {
      setError('El nombre de la empresa es obligatorio');
      return;
    }

    try {
      if (formDatos.id) {
        // Actualizar proveedor existente
        await api.put(`/proveedores/${formDatos.id}`, formDatos);
      } else {
        // Crear nuevo proveedor
        await api.post('/proveedores', formDatos);
      }

      await cargarProveedores();
      cerrarModal();
    } catch (err) {
      // Mostrar mensaje de error del backend o genérico
      setError(err.response?.data?.error || 'Error al guardar proveedor');
    }
  };

  // ─────────────────────────────────────────────────────
  // FUNCIÓN: Eliminar proveedor (con confirmación)
  // ─────────────────────────────────────────────────────
  // Nota: aquí actualizamos la lista localmente con filter()
  // en vez de recargar del servidor (optimización menor)
  const manejarEliminar = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este proveedor?')) return;

    try {
      await api.delete(`/proveedores/${id}`);
      setProveedores(proveedores.filter(p => p.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar proveedor');
    }
  };

  if (cargando) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="card shadow-sm">
        <div className="module-header">
          <h4 className="mb-0">Gestión de Proveedores</h4>
          <button className="btn btn-light btn-sm" onClick={abrirModalCrear}>
            <IconoPlus /> Nuevo Proveedor
          </button>
        </div>

        <div className="card-body">
          {error && !mostrarModal && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <style>{`
            .tabla-proveedores.table-hover tbody tr:hover td {
              background-color: #c3f0ca !important;
              cursor: pointer;
            }
            .tabla-proveedores tbody tr:hover {
              background-color: #c3f0ca !important;
            }
          `}</style>
          <div className="table-responsive" style={{ overflowX: 'auto' }}>
            <table className="table table-hover table-striped align-middle tabla-proveedores">
              <thead className="table-dark text-center">
                <tr>
                  <th className="d-none d-md-table-cell">ID</th>
                  <th>Empresa</th>
                  <th translate="no">NIT</th>
                  <th className="d-none d-lg-table-cell">Contacto</th>
                  <th className="d-none d-xl-table-cell">Email</th>
                  <th>Teléfono</th>
                  <th className="d-none d-lg-table-cell">Dirección</th>
                  <th style={{ minWidth: '120px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {proveedores.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center text-muted py-4">
                      No hay proveedores registrados
                    </td>
                  </tr>
                ) : (
                  proveedoresPaginados.map((proveedor) => (
                    <tr key={proveedor.id}>
                      <td className="d-none d-md-table-cell text-center">{proveedor.id}</td>
                      <td className="fw-bold text-center">{proveedor.nombre_empresa}</td>
                      <td className="text-center">{proveedor.nit || '-'}</td>
                      <td className="d-none d-lg-table-cell text-center">{proveedor.nombre_contacto || '-'}</td>
                      <td className="d-none d-xl-table-cell text-center">{proveedor.email || '-'}</td>
                      <td className="text-center">{proveedor.telefono || '-'}</td>
                      <td className="d-none d-lg-table-cell text-center">{proveedor.direccion || '-'}</td>
                      <td className="text-center action-buttons">
                        <button
                          className="btn btn-sm btn-outline-primary me-1"
                          onClick={() => abrirModalEditar(proveedor)}
                          title="Editar"
                        >
                          <IconoEditar />
                        </button>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => manejarEliminar(proveedor.id)}
                          title="Eliminar"
                        >
                          <IconoEliminar />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
      </div>

      {/* Modal Crear/Editar */}
      {mostrarModal && (
        <>
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-fullscreen-sm-down">
              <div className="modal-content">
                <div className="modal-header bg-primary text-white">
                  <h5 className="modal-title">
                    {formDatos.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={cerrarModal}
                  ></button>
                </div>

                <form onSubmit={manejarGuardar}>
                  <div className="modal-body">
                    {error && (
                      <div className="alert alert-danger" role="alert">
                        {error}
                      </div>
                    )}

                    <div className="mb-3">
                      <label className="form-label">
                        Nombre de Empresa <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="nombre_empresa"
                        value={formDatos.nombre_empresa}
                        onChange={manejarCambioInput}
                        required
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label" translate="no">NIT</label>
                      <input
                        type="text"
                        className="form-control"
                        name="nit"
                        value={formDatos.nit}
                        onChange={manejarCambioInput}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Persona de Contacto</label>
                      <input
                        type="text"
                        className="form-control"
                        name="nombre_contacto"
                        value={formDatos.nombre_contacto}
                        onChange={manejarCambioInput}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        name="email"
                        value={formDatos.email}
                        onChange={manejarCambioInput}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Teléfono</label>
                      <input
                        type="text"
                        className="form-control"
                        name="telefono"
                        value={formDatos.telefono}
                        onChange={manejarCambioInput}
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Dirección</label>
                      <textarea
                        className="form-control"
                        name="direccion"
                        rows="2"
                        value={formDatos.direccion}
                        onChange={manejarCambioInput}
                      ></textarea>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={cerrarModal}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-primary">
                      {formDatos.id ? 'Actualizar' : 'Guardar'}
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

export default PaginaProveedores;
