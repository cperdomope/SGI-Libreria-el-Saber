/**
 * =====================================================
 * PÁGINA DE GESTIÓN DE AUTORES
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Módulo CRUD para la gestión de autores.
 * Permite crear, listar, editar y eliminar autores
 * de los libros del inventario.
 *
 * @requires react - Hooks useState, useEffect
 * @requires ../services/api - Cliente Axios configurado
 * @requires ../context/AuthContext - Hook de autenticación RBAC
 *
 * CARACTERÍSTICAS:
 * - Control de acceso por permisos (RBAC)
 * - Tabla con paginación cliente (5 elementos)
 * - Modal Bootstrap para crear/editar
 *
 * @author Equipo de Desarrollo SGI
 * @version 2.0.0
 */

import { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// --- ICONOS SVG INLINE (evita dependencias externas) ---
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

/**
 * Componente principal para la gestión de autores.
 * Implementa operaciones CRUD con control de acceso RBAC.
 *
 * @component
 * @returns {JSX.Element} Interfaz de gestión de autores
 */
const PaginaAutores = () => {
  // Hook RBAC para verificar permisos del usuario actual
  const { tienePermiso } = useAuth();

  // --- ESTADOS DEL COMPONENTE ---
  const [autores, setAutores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [datosAutor, setDatosAutor] = useState({ id: null, nombre: '' });

  // Estado de paginación (5 elementos por página)
  const [paginaActual, setPaginaActual] = useState(1);
  const elementosPorPagina = 5;

  // Cálculos de paginación derivados del estado
  const indiceInicio = (paginaActual - 1) * elementosPorPagina;
  const indiceFin = indiceInicio + elementosPorPagina;
  const autoresPaginados = autores.slice(indiceInicio, indiceFin);
  const totalPaginas = Math.ceil(autores.length / elementosPorPagina);

  /**
   * Obtiene el listado de autores desde el backend.
   * Maneja el formato de respuesta { exito, datos }.
   *
   * @async
   * @returns {Promise<void>}
   */
  const cargarAutores = async () => {
    try {
      const res = await api.get('/autores');
      // Extraer datos considerando estructura { exito, datos }
      const autoresData = res.data.datos || res.data;
      setAutores(Array.isArray(autoresData) ? autoresData : []);
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('[PaginaAutores] Error:', error);
      }
    } finally {
      setCargando(false);
    }
  };

  // Cargar autores al montar el componente
  useEffect(() => { cargarAutores(); }, []);

  /** Prepara el modal para crear un nuevo autor */
  const abrirModalNuevo = () => {
    setDatosAutor({ id: null, nombre: '' });
  };

  /**
   * Prepara el modal para editar un autor existente.
   *
   * @param {Object} autor - Datos del autor a editar
   */
  const abrirModalEditar = (autor) => {
    setDatosAutor({ id: autor.id, nombre: autor.nombre });
  };

  /**
   * Guarda un autor (crear o actualizar).
   * Cierra el modal automáticamente al completar.
   *
   * @async
   * @param {React.FormEvent} e - Evento del formulario
   * @returns {Promise<void>}
   */
  const handleGuardar = async (e) => {
    e.preventDefault();
    try {
      if (datosAutor.id) {
        // Actualizar autor existente
        await api.put(`/autores/${datosAutor.id}`, { nombre: datosAutor.nombre });
        alert('Autor actualizado correctamente');
      } else {
        // Crear nuevo autor
        await api.post('/autores', { nombre: datosAutor.nombre });
        alert('Autor creado exitosamente');
      }
      cargarAutores();
      // Cerrar modal usando el botón Bootstrap
      document.getElementById('cerrarModalBtn').click();
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar');
    }
  };

  /**
   * Elimina un autor previa confirmación del usuario.
   *
   * @async
   * @param {number} id - ID del autor a eliminar
   * @param {string} nombre - Nombre del autor (para mensaje)
   * @returns {Promise<void>}
   */
  const handleEliminar = async (id, nombre) => {
    if (window.confirm(`¿Eliminar el autor "${nombre}"?`)) {
      try {
        await api.delete(`/autores/${id}`);
        alert('Autor eliminado exitosamente');
        cargarAutores();
      } catch (error) {
        alert(error.response?.data?.error || 'Error al eliminar');
      }
    }
  };

  return (
    <div className="container mt-4">
      <div className="module-header mb-4 shadow-sm" style={{ borderRadius: '8px' }}>
        <h2 className="text-white">Gestión de Autores</h2>
        {tienePermiso('crearAutor') && (
          <button className="btn btn-light btn-sm" data-bs-toggle="modal" data-bs-target="#modalAutor" onClick={abrirModalNuevo}>
            + Nuevo Autor
          </button>
        )}
      </div>

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
              {autoresPaginados.map((autor) => (
                <tr key={autor.id}>
                  <td>{autor.id}</td>
                  <td className="fw-bold">{autor.nombre}</td>
                  <td className="text-center action-buttons">
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
                    {tienePermiso('eliminarAutor') && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleEliminar(autor.id, autor.nombre)}
                        title="Eliminar"
                      >
                        <IconoEliminar />
                      </button>
                    )}
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

      {/* Modal */}
      <div className="modal fade" id="modalAutor" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
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
