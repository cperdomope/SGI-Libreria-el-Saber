/**
 * =====================================================
 * PÁGINA DE INVENTARIO - GESTIÓN DE LIBROS
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description CRUD completo para la gestión del catálogo
 * de libros con soporte de imágenes de portada (multer).
 *
 * FUNCIONALIDADES:
 * - Listado paginado de libros con thumbnail de portada
 * - Crear nuevo libro con imagen de portada (opcional)
 * - Editar libro y reemplazar portada
 * - Eliminar libro (la imagen se borra del servidor)
 * - Indicador visual de stock bajo
 * - Búsqueda por título o ISBN
 * - Exportar inventario a Excel
 *
 * ANTE UN JURADO:
 * "La portada se sube desde el formulario, multer la
 *  almacena en uploads/portadas/ con nombre único,
 *  y el nombre del archivo queda guardado en BD.
 *  Al editar, si se sube nueva imagen, la anterior
 *  se elimina automáticamente del disco."
 *
 * @author Equipo de Desarrollo SGI
 * @version 3.0.0
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import usePaginacion from '../hooks/usePaginacion';
import * as XLSX from 'xlsx';

// =====================================================
// URL BASE PARA IMÁGENES
// Construida a partir de VITE_API_URL (sin el /api)
// =====================================================

const URL_PORTADAS = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api')
  .replace('/api', '') + '/uploads/portadas';

// =====================================================
// ICONOS SVG (Bootstrap Icons - MIT License)
// =====================================================

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
// CONFIGURACIÓN
// =====================================================

const ELEMENTOS_POR_PAGINA = 5;

const LIBRO_INICIAL = {
  id: null,
  isbn: '',
  titulo: '',
  autor_id: '',
  categoria_id: '',
  precio_venta: '',
  stock_minimo: 5,
  portada: ''
};

// =====================================================
// COMPONENTE THUMBNAIL DE PORTADA
// Muestra la imagen o un placeholder si no hay
// =====================================================

const ThumbnailPortada = ({ portada, titulo }) => {
  if (!portada) {
    return (
      <div
        style={{
          width: 38, height: 52, background: '#e9ecef',
          borderRadius: 4, display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 8, color: '#adb5bd',
          textAlign: 'center', lineHeight: 1.2
        }}
      >
        Sin img
      </div>
    );
  }

  return (
    <img
      src={`${URL_PORTADAS}/${portada}`}
      alt={titulo}
      style={{ width: 38, height: 52, objectFit: 'cover', borderRadius: 4 }}
      onError={(e) => { e.target.style.display = 'none'; }}
    />
  );
};

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const Inventario = () => {
  const { tienePermiso } = useAuth();
  const cerrarModalRef = useRef(null);

  // ── Datos del catálogo ──
  const [libros, setLibros]       = useState([]);
  const [autores, setAutores]     = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando]   = useState(true);

  // ── Formulario (crear/editar) ──
  const [datosLibro, setDatosLibro] = useState(LIBRO_INICIAL);

  // ── Imagen de portada ──
  const [portadaFile, setPortadaFile]       = useState(null);   // File a subir
  const [portadaPreview, setPortadaPreview] = useState(null);   // URL temporal

  // ── Búsqueda y paginación ──
  const [busqueda, setBusqueda] = useState('');

  // ─────────────────────────────────────────────────
  // FILTRADO Y PAGINACIÓN
  // ─────────────────────────────────────────────────

  const librosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return libros;
    const termino = busqueda.toLowerCase().trim();
    return libros.filter((libro) =>
      libro.titulo?.toLowerCase().includes(termino) ||
      libro.isbn?.toLowerCase().includes(termino)
    );
  }, [libros, busqueda]);

  const {
    datosPaginados: librosPaginados,
    paginaActual,
    totalPaginas,
    irAPagina,
    paginaAnterior,
    paginaSiguiente,
    resetear: resetPagina
  } = usePaginacion(librosFiltrados, ELEMENTOS_POR_PAGINA);

  // ─────────────────────────────────────────────────
  // CARGA DE DATOS
  // ─────────────────────────────────────────────────

  const cargarDatos = useCallback(async () => {
    try {
      const [resLibros, resAutores, resCategorias] = await Promise.all([
        api.get('/libros'),
        api.get('/autores'),
        api.get('/categorias')
      ]);

      const librosData     = resLibros.data.datos     || resLibros.data;
      const autoresData    = resAutores.data.datos    || resAutores.data;
      const categoriasData = resCategorias.data.datos || resCategorias.data;

      if (Array.isArray(librosData))     setLibros(librosData);
      if (Array.isArray(autoresData))    setAutores(autoresData);
      if (Array.isArray(categoriasData)) setCategorias(categoriasData);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Inventario] Error cargando datos:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ─────────────────────────────────────────────────
  // GESTIÓN DEL MODAL
  // ─────────────────────────────────────────────────

  const limpiarPortada = () => {
    if (portadaPreview) URL.revokeObjectURL(portadaPreview);
    setPortadaFile(null);
    setPortadaPreview(null);
  };

  const abrirModalNuevo = () => {
    setDatosLibro({
      ...LIBRO_INICIAL,
      autor_id:     autores[0]?.id    || '',
      categoria_id: categorias[0]?.id || ''
    });
    limpiarPortada();
  };

  const abrirModalEditar = (libro) => {
    setDatosLibro({
      id:           libro.id,
      isbn:         libro.isbn         || '',
      titulo:       libro.titulo,
      autor_id:     libro.autor_id     || '',
      categoria_id: libro.categoria_id || '',
      precio_venta: libro.precio_venta || 0,
      stock_minimo: libro.stock_minimo || 5,
      portada:      libro.portada      || ''
    });
    limpiarPortada();
  };

  // ─────────────────────────────────────────────────
  // MANEJADORES
  // ─────────────────────────────────────────────────

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setDatosLibro(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) { limpiarPortada(); return; }
    // Revocar URL anterior para evitar memory leak
    if (portadaPreview) URL.revokeObjectURL(portadaPreview);
    setPortadaFile(file);
    setPortadaPreview(URL.createObjectURL(file));
  };

  /**
   * Guarda el libro con o sin imagen.
   * - Con imagen: FormData (multipart/form-data) → multer en backend
   * - Sin imagen: JSON normal → express.json() en backend
   */
  const handleGuardar = async (e) => {
    e.preventDefault();

    try {
      let peticion;

      if (portadaFile) {
        // ── Subida con imagen: usar FormData ──
        const formData = new FormData();
        formData.append('isbn',         datosLibro.isbn         || '');
        formData.append('titulo',       datosLibro.titulo);
        formData.append('autor_id',     datosLibro.autor_id     || '');
        formData.append('categoria_id', datosLibro.categoria_id || '');
        formData.append('precio_venta', datosLibro.precio_venta);
        formData.append('stock_minimo', datosLibro.stock_minimo || 5);
        formData.append('portada', portadaFile); // campo que multer lee

        const config = { headers: { 'Content-Type': 'multipart/form-data' } };

        peticion = datosLibro.id
          ? api.put(`/libros/${datosLibro.id}`, formData, config)
          : api.post('/libros', formData, config);
      } else {
        // ── Sin imagen: JSON normal ──
        peticion = datosLibro.id
          ? api.put(`/libros/${datosLibro.id}`, datosLibro)
          : api.post('/libros', datosLibro);
      }

      await peticion;
      alert(datosLibro.id ? 'Libro actualizado correctamente' : 'Libro creado con éxito');

      cargarDatos();
      cerrarModalRef.current?.click();

    } catch (error) {
      if (import.meta.env.DEV) console.error('[Inventario] Error al guardar:', error);
      alert(error.response?.data?.mensaje || error.response?.data?.error || 'Error al guardar');
    }
  };

  const handleEliminar = async (id, titulo) => {
    if (!window.confirm(`¿Borrar "${titulo}"?`)) return;

    try {
      await api.delete(`/libros/${id}`);
      cargarDatos();
    } catch (error) {
      if (import.meta.env.DEV) console.error('[Inventario] Error al eliminar:', error);
      alert(error.response?.data?.mensaje || error.response?.data?.error || 'Error al eliminar');
    }
  };

  // ─────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────

  return (
    <div className="container mt-4">

      {/* ── ENCABEZADO ── */}
      <div className="module-header mb-3 shadow-sm" style={{ borderRadius: '8px' }}>
        <h2 className="text-white">Inventario Actual</h2>
        <div className="d-flex gap-2">
          {tienePermiso('crearLibro') && (
            <button
              className="btn btn-light btn-sm"
              data-bs-toggle="modal"
              data-bs-target="#modalLibro"
              onClick={abrirModalNuevo}
            >
              + Nuevo Libro
            </button>
          )}
          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => {
              const datos = librosFiltrados.map((l) => ({
                'ISBN':         l.isbn,
                'Título':       l.titulo,
                'Autor':        l.autor       || '',
                'Categoría':    l.categoria   || '',
                'Precio Venta': l.precio_venta || 0,
                'Stock Actual': l.stock_actual || 0,
                'Stock Mínimo': l.stock_minimo || 0
              }));
              const hoja  = XLSX.utils.json_to_sheet(datos);
              const libro = XLSX.utils.book_new();
              XLSX.utils.book_append_sheet(libro, hoja, 'Inventario');
              XLSX.writeFile(libro, `Inventario-${new Date().toISOString().slice(0, 10)}.xlsx`);
            }}
            title="Exportar inventario a Excel"
          >
            Exportar Excel
          </button>
        </div>
      </div>

      {/* ── BUSCADOR ── */}
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Buscar por título o ISBN..."
          value={busqueda}
          onChange={(e) => { setBusqueda(e.target.value); resetPagina(); }}
        />
        {busqueda && (
          <small className="text-muted">
            {librosFiltrados.length} resultado(s) para "{busqueda}"
          </small>
        )}
      </div>

      {/* ── TABLA DE LIBROS ── */}
      {cargando ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      ) : (
        <div className="table-responsive shadow-sm rounded">
          <table className="table table-hover table-striped border align-middle">
            <thead className="table-dark">
              <tr>
                <th style={{ width: 50 }}>Portada</th>
                <th>ISBN</th>
                <th>Título</th>
                <th>Autor</th>
                <th>Categoría</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {librosPaginados.map((libro) => (
                <tr key={libro.id}>
                  <td className="text-center">
                    <ThumbnailPortada portada={libro.portada} titulo={libro.titulo} />
                  </td>
                  <td>{libro.isbn}</td>
                  <td className="fw-bold">{libro.titulo}</td>
                  <td>{libro.autor || 'N/A'}</td>
                  <td>
                    <span className="badge bg-secondary">{libro.categoria || 'Gral'}</span>
                  </td>
                  <td>${new Intl.NumberFormat('es-CO').format(libro.precio_venta || 0)}</td>
                  <td>
                    <span className={`badge ${
                      (libro.stock_actual || 0) <= libro.stock_minimo ? 'bg-danger' : 'bg-success'
                    }`}>
                      {libro.stock_actual || 0}
                    </span>
                  </td>
                  <td className="text-center action-buttons">
                    {tienePermiso('editarLibro') && (
                      <button
                        className="btn btn-sm btn-outline-primary me-1"
                        data-bs-toggle="modal"
                        data-bs-target="#modalLibro"
                        onClick={() => abrirModalEditar(libro)}
                        title="Editar"
                      >
                        <IconoEditar />
                      </button>
                    )}
                    {tienePermiso('eliminarLibro') && (
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleEliminar(libro.id, libro.titulo)}
                        title="Eliminar"
                      >
                        <IconoEliminar />
                      </button>
                    )}
                    {!tienePermiso('editarLibro') && !tienePermiso('eliminarLibro') && (
                      <span className="text-muted small">Solo consulta</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PAGINACIÓN ── */}
      {!cargando && totalPaginas > 1 && (
        <nav className="d-flex justify-content-center mt-3" aria-label="Paginación de inventario">
          <ul className="pagination pagination-sm">
            <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={paginaAnterior} disabled={paginaActual === 1}>
                Anterior
              </button>
            </li>
            {[...Array(totalPaginas)].map((_, i) => (
              <li key={i + 1} className={`page-item ${paginaActual === i + 1 ? 'active' : ''}`}>
                <button className="page-link" onClick={() => irAPagina(i + 1)}>{i + 1}</button>
              </li>
            ))}
            <li className={`page-item ${paginaActual === totalPaginas ? 'disabled' : ''}`}>
              <button className="page-link" onClick={paginaSiguiente} disabled={paginaActual === totalPaginas}>
                Siguiente
              </button>
            </li>
          </ul>
        </nav>
      )}

      {/* ── MODAL CREAR / EDITAR ── */}
      <div className="modal fade" id="modalLibro" tabIndex="-1" aria-hidden="true">
        <div className="modal-dialog modal-fullscreen-sm-down">
          <div className="modal-content">
            <div className="modal-header bg-primary text-white">
              <h5 className="modal-title">
                {datosLibro.id ? 'Editar Libro' : 'Registrar Nuevo Libro'}
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                data-bs-dismiss="modal"
                aria-label="Cerrar"
                id="cerrarModalBtn"
              />
            </div>
            <div className="modal-body">
              <form onSubmit={handleGuardar}>

                <div className="mb-3">
                  <label className="form-label">ISBN (Código):</label>
                  <input type="text" className="form-control" name="isbn" required value={datosLibro.isbn} onChange={handleChange} />
                </div>

                <div className="mb-3">
                  <label className="form-label">Título:</label>
                  <input type="text" className="form-control" name="titulo" required value={datosLibro.titulo} onChange={handleChange} />
                </div>

                <div className="row">
                  <div className="col-6 mb-3">
                    <label className="form-label">Precio Venta:</label>
                    <input type="number" className="form-control" name="precio_venta" required min="0" value={datosLibro.precio_venta} onChange={handleChange} />
                  </div>
                  <div className="col-6 mb-3">
                    <label className="form-label">Stock Mínimo:</label>
                    <input type="number" className="form-control" name="stock_minimo" min="0" value={datosLibro.stock_minimo} onChange={handleChange} />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Autor:</label>
                  <select className="form-select" name="autor_id" value={datosLibro.autor_id} onChange={handleChange} required>
                    <option value="">Seleccione un autor</option>
                    {autores.map(autor => (
                      <option key={autor.id} value={autor.id}>{autor.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Categoría:</label>
                  <select className="form-select" name="categoria_id" value={datosLibro.categoria_id} onChange={handleChange} required>
                    <option value="">Seleccione una categoría</option>
                    {categorias.map(categoria => (
                      <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* ── PORTADA ── */}
                <div className="mb-3">
                  <label className="form-label">
                    Portada{' '}
                    <span className="text-muted fw-normal small">(opcional, máx. 2 MB — JPG, PNG, WEBP)</span>
                  </label>

                  {/* Portada actual en modo edición */}
                  {datosLibro.id && datosLibro.portada && !portadaPreview && (
                    <div className="mb-2 d-flex align-items-center gap-2">
                      <img
                        src={`${URL_PORTADAS}/${datosLibro.portada}`}
                        alt="Portada actual"
                        style={{ height: 70, objectFit: 'cover', borderRadius: 4 }}
                      />
                      <small className="text-muted">Portada actual (selecciona nueva para reemplazar)</small>
                    </div>
                  )}

                  {/* Preview de nueva imagen seleccionada */}
                  {portadaPreview && (
                    <div className="mb-2 d-flex align-items-center gap-2">
                      <img
                        src={portadaPreview}
                        alt="Nueva portada"
                        style={{ height: 70, objectFit: 'cover', borderRadius: 4 }}
                      />
                      <small className="text-success fw-semibold">Nueva imagen lista para subir</small>
                    </div>
                  )}

                  <input
                    type="file"
                    className="form-control"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                  />
                </div>

                <div className="d-grid">
                  <button type="submit" className="btn btn-primary">
                    {datosLibro.id ? 'Guardar Cambios' : 'Crear Libro'}
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

export default Inventario;
