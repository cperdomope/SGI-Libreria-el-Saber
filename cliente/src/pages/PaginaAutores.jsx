// =====================================================
// PÁGINA: GESTIÓN DE AUTORES
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Permite al administrador gestionar los autores de los libros.
//   Es un módulo CRUD (Crear, Leer, Actualizar, Eliminar):
//     - Ver la lista de todos los autores en una tabla paginada
//     - Crear un nuevo autor desde un modal
//     - Editar el nombre de un autor existente
//     - Eliminar un autor (con confirmación)
//
// ¿Cómo se conecta con el sistema?
//   1. Esta página se renderiza en la ruta /autores (ver App.jsx)
//   2. Llama a la API: GET /api/autores (listar), POST (crear),
//      PUT (editar), DELETE (eliminar)
//   3. Los autores se asocian a los libros en el inventario
//      (cada libro tiene un autor_id que apunta a esta tabla)
//
// Patrón CRUD que se repite:
//   Este mismo patrón (tabla + modal + funciones CRUD) se usa en
//   PaginaCategorias, PaginaClientes y PaginaProveedores.
//   Si entiendes uno, entiendes todos.
//
// =====================================================

import { useEffect, useState } from 'react';
// api: cliente HTTP con Axios (ya incluye el token JWT en cada petición)
import api from '../services/api';
// useAuth: para verificar los permisos del usuario (RBAC)
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────────────
// ICONOS SVG EN LÍNEA
// ─────────────────────────────────────────────────────
// Son mini-componentes que renderizan iconos SVG directamente.
// Los usamos en los botones de la tabla (editar, eliminar).
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
const PaginaAutores = () => {

  // ── Verificación de permisos (RBAC) ──
  // tienePermiso() consulta la matriz de permisos del AuthContext
  // para saber si el usuario puede crear, editar o eliminar autores
  const { tienePermiso } = useAuth();

  // ── ESTADOS DEL COMPONENTE ──
  // autores: array con todos los autores que vienen del backend
  const [autores, setAutores] = useState([]);
  // cargando: muestra un spinner mientras se cargan los datos
  const [cargando, setCargando] = useState(true);
  // datosAutor: datos del formulario del modal (crear o editar)
  // Si id es null → estamos creando un autor nuevo
  // Si id tiene valor → estamos editando un autor existente
  const [datosAutor, setDatosAutor] = useState({ id: null, nombre: '' });

  // ── PAGINACIÓN (del lado del cliente) ──
  // Dividimos la lista de autores en páginas de 5 elementos
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 5;

  // Calculamos qué autores mostrar en la página actual
  // Ejemplo: página 2 con 5 por página → muestra autores[5] a autores[9]
  const indiceInicio = (paginaActual - 1) * elementosPorPagina;
  const indiceFin = indiceInicio + elementosPorPagina;
  const autoresPaginados = autores.slice(indiceInicio, indiceFin);
  const totalPaginas = Math.ceil(autores.length / elementosPorPagina);

  // ─────────────────────────────────────────────────────
  // FUNCIÓN: Cargar autores desde la API
  // ─────────────────────────────────────────────────────
  // Se llama al montar el componente y después de cada operación CRUD
  const cargarAutores = async () => {
    try {
      // GET /api/autores → devuelve { exito: true, datos: [...] }
      const res = await api.get('/autores');
      // Extraemos el array de autores de la respuesta
      const autoresData = res.data.datos || res.data;
      setAutores(Array.isArray(autoresData) ? autoresData : []);
    } catch (error) {
      // Solo mostramos errores en modo desarrollo (no en producción)
      if (import.meta.env.DEV) {
        console.error('[PaginaAutores] Error:', error);
      }
    } finally {
      // finally se ejecuta siempre (éxito o error)
      setCargando(false);
    }
  };

  // ── useEffect: Se ejecuta UNA VEZ al montar el componente ──
  // Equivale a "cuando la página carga por primera vez, trae los autores"
  useEffect(() => { cargarAutores(); }, []);

  // ─────────────────────────────────────────────────────
  // FUNCIONES DEL MODAL (Crear / Editar)
  // ─────────────────────────────────────────────────────

  // Prepara el formulario para CREAR un autor nuevo (campos vacíos)
  const abrirModalNuevo = () => {
    setDatosAutor({ id: null, nombre: '' });
  };

  // Prepara el formulario para EDITAR un autor existente (llena los campos)
  const abrirModalEditar = (autor) => {
    setDatosAutor({ id: autor.id, nombre: autor.nombre });
  };

  // ─────────────────────────────────────────────────────
  // FUNCIÓN: Guardar autor (crear o actualizar)
  // ─────────────────────────────────────────────────────
  // Si datosAutor.id existe → PUT (actualizar)
  // Si datosAutor.id es null → POST (crear nuevo)
  const handleGuardar = async (e) => {
    e.preventDefault(); // Evita que el formulario recargue la página
    try {
      if (datosAutor.id) {
        // ── ACTUALIZAR: PUT /api/autores/:id ──
        await api.put(`/autores/${datosAutor.id}`, { nombre: datosAutor.nombre });
        alert('Autor actualizado correctamente');
      } else {
        // ── CREAR: POST /api/autores ──
        await api.post('/autores', { nombre: datosAutor.nombre });
        alert('Autor creado exitosamente');
      }
      // Recargamos la lista para ver los cambios
      cargarAutores();
      // Cerramos el modal haciendo clic en su botón de cerrar
      document.getElementById('cerrarModalBtn').click();
    } catch (error) {
      // Mostramos el mensaje de error del backend (o uno genérico)
      alert(error.response?.data?.error || 'Error al guardar');
    }
  };

  // ─────────────────────────────────────────────────────
  // FUNCIÓN: Eliminar autor
  // ─────────────────────────────────────────────────────
  // Pide confirmación antes de eliminar (window.confirm)
  const handleEliminar = async (id, nombre) => {
    if (window.confirm(`¿Eliminar el autor "${nombre}"?`)) {
      try {
        // DELETE /api/autores/:id
        await api.delete(`/autores/${id}`);
        alert('Autor eliminado exitosamente');
        cargarAutores(); // Recargamos la lista
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
      {/* ── Encabezado con título y botón de crear ── */}
      <div className="module-header mb-4 shadow-sm" style={{ borderRadius: '8px' }}>
        <h2 className="text-white">Gestión de Autores</h2>
        {/* Solo mostramos el botón si el usuario tiene permiso de crear */}
        {tienePermiso('crearAutor') && (
          <button className="btn btn-light btn-sm" data-bs-toggle="modal" data-bs-target="#modalAutor" onClick={abrirModalNuevo}>
            + Nuevo Autor
          </button>
        )}
      </div>

      {/* ── Tabla de autores o spinner de carga ── */}
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
              {/* Recorremos solo los autores de la página actual */}
              {autoresPaginados.map((autor) => (
                <tr key={autor.id}>
                  <td>{autor.id}</td>
                  <td className="fw-bold">{autor.nombre}</td>
                  <td className="text-center action-buttons">
                    {/* Botón editar: solo si tiene permiso */}
                    {tienePermiso('editarAutor') && (
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        data-bs-toggle="modal"
                        data-bs-target="#modalAutor"
                        onClick={() => abrirModalEditar(autor)}
                        title="Editar"
                      >
                        <IconoEditar />
                      </button>
                    )}
                    {/* Botón eliminar: solo si tiene permiso */}
                    {tienePermiso('eliminarAutor') && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleEliminar(autor.id, autor.nombre)}
                        title="Eliminar"
                      >
                        <IconoEliminar />
                      </button>
                    )}
                    {/* Si no tiene ningún permiso de escritura, muestra "Solo consulta" */}
                    {!tienePermiso('editarAutor') && !tienePermiso('eliminarAutor') && (
                      <span className="text-muted small">Solo consulta</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Controles de paginación ── */}
      {/* Solo se muestran si hay más de una página */}
      {!cargando && totalPaginas > 1 && (
        <nav className="d-flex justify-content-center mt-3">
          <ul className="pagination pagination-sm">
            {/* Botón "Anterior" - deshabilitado si estamos en la primera página */}
            <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPaginaActual(paginaActual - 1)} disabled={paginaActual === 1}>
                Anterior
              </button>
            </li>
            {/* Números de página: [1] [2] [3] ... */}
            {[...Array(totalPaginas)].map((_, i) => (
              <li key={i + 1} className={`page-item ${paginaActual === i + 1 ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPaginaActual(i + 1)}>
                  {i + 1}
                </button>
              </li>
            ))}
            {/* Botón "Siguiente" - deshabilitado si estamos en la última página */}
            <li className={`page-item ${paginaActual === totalPaginas ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPaginaActual(paginaActual + 1)} disabled={paginaActual === totalPaginas}>
                Siguiente
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* ── Modal de crear/editar autor ── */}
      {/* Es la ventana emergente que aparece al hacer clic en "Nuevo" o "Editar" */}
      <div className="modal fade" id="modalAutor" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              {/* El título cambia según si estamos editando o creando */}
              <h5 className="modal-title">{datosAutor.id ? 'Editar Autor' : 'Nuevo Autor'}</h5>
              <button type="button" className="btn-close btn-close-white" data-bs-dismiss="modal" id="cerrarModalBtn"></button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleGuardar}>
                <div className="mb-3">
                  <label>Nombre del Autor:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={datosAutor.nombre}
                    onChange={(e) => setDatosAutor({ ...datosAutor, nombre: e.target.value })}
                    required
                  />
                </div>
                <div className="d-grid">
                  {/* El texto del botón cambia según la operación */}
                  <button type="submit" className="btn btn-primary">
                    {datosAutor.id ? 'Guardar Cambios' : 'Crear Autor'}
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

export default PaginaAutores;