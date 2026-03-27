// =====================================================
// PÁGINA: GESTIÓN DE CATEGORÍAS
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Permite al administrador gestionar las categorías de los libros
//   (Ficción, Ciencia, Historia, Poesía, etc.).
//   Es un módulo CRUD (Crear, Leer, Actualizar, Eliminar).
//
// ¿Cómo se conecta con el sistema?
//   1. Se renderiza en la ruta /categorias (ver App.jsx)
//   2. Llama a la API: GET /api/categorias, POST, PUT, DELETE
//   3. Las categorías se asocian a los libros (cada libro tiene
//      un categoria_id que apunta a esta tabla)
//   4. El Dashboard usa las categorías para la gráfica de distribución
//
// Nota: Este componente sigue el MISMO patrón que PaginaAutores.jsx
//   (tabla paginada + modal + funciones CRUD). Si entiendes uno,
//   entiendes ambos.
//
// =====================================================

import { useEffect, useState, useRef } from 'react';
// api: cliente HTTP con Axios (incluye token JWT automáticamente)
import api from '../services/api';
// useAuth: para verificar los permisos del usuario (RBAC)
import { useAuth } from '../context/AuthContext';

// ── Iconos SVG en línea para los botones de acción ──
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

// Cuantas categorias mostrar por pagina en la tabla
const ELEMENTOS_POR_PAGINA = 5;

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================
const PaginaCategorias = () => {

  // ── Verificacion de permisos (RBAC) ──
  const { tienePermiso } = useAuth();

  // useRef para cerrar el modal programaticamente despues de guardar.
  // Preferimos useRef sobre document.getElementById() porque es la
  // forma idiomatica de React para referenciar elementos del DOM.
  const cerrarModalRef = useRef(null);

  // ── ESTADOS ──
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  // datosCategoria: formulario del modal
  // id=null → crear nueva | id=numero → editar existente
  const [datosCategoria, setDatosCategoria] = useState({ id: null, nombre: '' });

  // ── PAGINACION (lado del cliente) ──
  const [paginaActual, setPaginaActual] = useState(1);

  // Calculamos qué categorías mostrar en la página actual
  const indiceInicio = (paginaActual - 1) * ELEMENTOS_POR_PAGINA;
  const indiceFin = indiceInicio + ELEMENTOS_POR_PAGINA;
  const categoriasPaginadas = categorias.slice(indiceInicio, indiceFin);
  const totalPaginas = Math.ceil(categorias.length / ELEMENTOS_POR_PAGINA);

  // ─────────────────────────────────────────────────────
  // FUNCIÓN: Cargar categorías desde la API
  // ─────────────────────────────────────────────────────
  const cargarCategorias = async () => {
    try {
      // GET /api/categorias → { exito: true, datos: [...] }
      const res = await api.get('/categorias');
      const categoriasData = res.data.datos || res.data;
      setCategorias(Array.isArray(categoriasData) ? categoriasData : []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[PaginaCategorias] Error:', error);
      }
    } finally {
      setCargando(false);
    }
  };

  // Se ejecuta al montar el componente (primera carga)
  useEffect(() => { cargarCategorias(); }, []);

  // ─────────────────────────────────────────────────────
  // FUNCIONES DEL MODAL
  // ─────────────────────────────────────────────────────

  // Preparar formulario para CREAR (campos vacíos)
  const abrirModalNuevo = () => {
    setDatosCategoria({ id: null, nombre: '' });
  };

  // Preparar formulario para EDITAR (llenar con datos existentes)
  const abrirModalEditar = (categoria) => {
    setDatosCategoria({ id: categoria.id, nombre: categoria.nombre });
  };

  // ─────────────────────────────────────────────────────
  // FUNCIÓN: Guardar categoría (crear o actualizar)
  // ─────────────────────────────────────────────────────
  const handleGuardar = async (e) => {
    e.preventDefault();
    try {
      if (datosCategoria.id) {
        // ACTUALIZAR → PUT /api/categorias/:id
        await api.put(`/categorias/${datosCategoria.id}`, { nombre: datosCategoria.nombre });
        alert('Categoría actualizada correctamente');
      } else {
        // CREAR → POST /api/categorias
        await api.post('/categorias', { nombre: datosCategoria.nombre });
        alert('Categoría creada exitosamente');
      }
      cargarCategorias();  // Recargar la lista
      cerrarModalRef.current?.click();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar');
    }
  };

  // ─────────────────────────────────────────────────────
  // FUNCIÓN: Eliminar categoría (con confirmación)
  // ─────────────────────────────────────────────────────
  const handleEliminar = async (id, nombre) => {
    if (window.confirm(`¿Eliminar la categoría "${nombre}"?`)) {
      try {
        // DELETE /api/categorias/:id
        await api.delete(`/categorias/${id}`);
        alert('Categoría eliminada exitosamente');
        cargarCategorias();
      } catch (error) {
        alert(error.response?.data?.error || 'Error al eliminar');
      }
    }
  };

  // =====================================================
  // RENDERIZADO (JSX)
  // =====================================================
  return (
    <div className="container mt-4">
      {/* ── Encabezado con título y botón "Nueva Categoría" ── */}
      <div className="module-header mb-4 shadow-sm" style={{ borderRadius: '8px' }}>
        <h2 className="text-white">Gestión de Categorías</h2>
        {tienePermiso('crearCategoria') && (
          <button className="btn btn-light btn-sm" data-bs-toggle="modal" data-bs-target="#modalCategoria" onClick={abrirModalNuevo}>
            + Nueva Categoría
          </button>
        )}
      </div>

      {/* ── Tabla de categorías o spinner ── */}
      {cargando ? (
        <div className="text-center"><div className="spinner-border text-primary"></div></div>
      ) : (
        <div className="table-responsive shadow-sm rounded">
          <table className="table table-hover table-striped border align-middle">
            <thead className="table-dark">
              <tr>
                <th>ID</th>
                <th>Nombre</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categoriasPaginadas.map((categoria) => (
                <tr key={categoria.id}>
                  <td>{categoria.id}</td>
                  <td className="fw-bold">{categoria.nombre}</td>
                  <td className="text-center action-buttons">
                    {/* Botón editar (solo con permiso) */}
                    {tienePermiso('editarCategoria') && (
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        data-bs-toggle="modal"
                        data-bs-target="#modalCategoria"
                        onClick={() => abrirModalEditar(categoria)}
                        title="Editar"
                      >
                        <IconoEditar />
                      </button>
                    )}
                    {/* Botón eliminar (solo con permiso) */}
                    {tienePermiso('eliminarCategoria') && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleEliminar(categoria.id, categoria.nombre)}
                        title="Eliminar"
                      >
                        <IconoEliminar />
                      </button>
                    )}
                    {!tienePermiso('editarCategoria') && !tienePermiso('eliminarCategoria') && (
                      <span className="text-muted small">Solo consulta</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Paginación ── */}
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

      {/* ── Modal de crear/editar categoría ── */}
      <div className="modal fade" id="modalCategoria" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title">{datosCategoria.id ? 'Editar Categoría' : 'Nueva Categoría'}</h5>
              <button ref={cerrarModalRef} type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" />
            </div>
            <div className="modal-body">
              <form onSubmit={handleGuardar}>
                <div className="mb-3">
                  <label>Nombre de la Categoría:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={datosCategoria.nombre}
                    onChange={(e) => setDatosCategoria({ ...datosCategoria, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="d-grid">
                  <button type="submit" className="btn btn-primary">
                    {datosCategoria.id ? 'Guardar Cambios' : 'Crear Categoría'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaginaCategorias;