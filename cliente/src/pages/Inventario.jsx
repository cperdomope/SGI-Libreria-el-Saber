// =====================================================
// PÁGINA: INVENTARIO - GESTIÓN DE LIBROS
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Es el módulo CRUD principal del sistema. Permite gestionar
//   el catálogo completo de libros de la librería:
//   - Ver todos los libros en una tabla paginada con portada
//   - Crear un nuevo libro (con imagen de portada opcional)
//   - Editar un libro existente (puede cambiar la portada)
//   - Eliminar un libro (la imagen se borra del servidor)
//   - Buscar por título o ISBN
//   - Exportar el inventario a Excel (.xlsx)
//   - Indicador visual de stock bajo (badge rojo)
//
// ¿Cómo se conecta con el sistema?
//   1. Se renderiza en la ruta /inventario (ver App.jsx)
//   2. Llama a la API:
//      - GET /api/libros → listar libros
//      - GET /api/autores → para el select de autores
//      - GET /api/categorias → para el select de categorías
//      - POST /api/libros → crear (con o sin imagen)
//      - PUT /api/libros/:id → editar (con o sin imagen)
//      - DELETE /api/libros/:id → eliminar
//   3. Las imágenes se suben con multer (multipart/form-data)
//      y se guardan en servidor/uploads/portadas/
//   4. Los movimientos (Movimientos.jsx) actualizan el stock
//   5. Las ventas (PaginaVentas.jsx) también afectan el stock
//
// Conceptos clave para el jurado:
//   - FormData: objeto especial para enviar archivos al servidor
//   - multer: middleware del backend que recibe y guarda las imágenes
//   - useMemo: optimiza el filtrado (no recalcula si no cambian los datos)
//   - useCallback: evita que las funciones se recreen en cada render
//   - usePaginacion: hook personalizado que maneja la paginación
//
// =====================================================

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
// api: cliente HTTP con Axios (incluye token JWT automáticamente)
import api from '../services/api';
// useAuth: para verificar los permisos del usuario (RBAC)
import { useAuth } from '../context/AuthContext';
// usePaginacion: hook personalizado que calcula qué elementos mostrar
// según la página actual (ver hooks/usePaginacion.js)
import usePaginacion from '../hooks/usePaginacion';
// XLSX: librería para generar archivos Excel desde JavaScript
import * as XLSX from 'xlsx';

// =====================================================
// URL BASE PARA IMÁGENES DE PORTADA
// =====================================================
// Construimos la URL donde están las imágenes.
// Si VITE_API_URL es "http://localhost:3000/api",
// quitamos "/api" y agregamos "/uploads/portadas"
// Resultado: "http://localhost:3000/uploads/portadas"

const URL_PORTADAS = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api')
  .replace('/api', '') + '/uploads/portadas';

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

// =====================================================
// CONFIGURACIÓN
// =====================================================

// Cuántos libros mostrar por página en la tabla
const ELEMENTOS_POR_PAGINA = 5;

// Valores por defecto del formulario de crear/editar libro
const LIBRO_INICIAL = {
  id: null,           // null = crear nuevo, número = editar existente
  isbn: '',           // Código ISBN del libro
  titulo: '',         // Título del libro
  autor_id: '',       // ID del autor (select)
  categoria_id: '',   // ID de la categoría (select)
  precio_venta: '',   // Precio de venta al público
  stock_minimo: 5,    // Umbral para alerta de stock bajo
  portada: ''         // Nombre del archivo de imagen (si tiene)
};

// =====================================================
// COMPONENTE: Thumbnail de portada
// =====================================================
// Muestra una miniatura de la portada del libro en la tabla.
// Si el libro no tiene imagen, muestra un placeholder gris.

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
  // ── Verificación de permisos (RBAC) ──
  const { tienePermiso } = useAuth();

  // useRef para el botón de cerrar modal (alternativa a document.getElementById)
  const cerrarModalRef = useRef(null);

  // ── ESTADOS: Datos del catálogo (vienen de la BD) ──
  const [libros, setLibros]       = useState([]);     // Lista de todos los libros
  const [autores, setAutores]     = useState([]);     // Lista de autores (para el select)
  const [categorias, setCategorias] = useState([]);   // Lista de categorías (para el select)
  const [cargando, setCargando]   = useState(true);   // Spinner mientras carga

  // ── ESTADO: Formulario del modal (crear/editar) ──
  const [datosLibro, setDatosLibro] = useState(LIBRO_INICIAL);

  // ── ESTADOS: Imagen de portada ──
  const [portadaFile, setPortadaFile]       = useState(null);   // El archivo seleccionado
  const [portadaPreview, setPortadaPreview] = useState(null);   // URL temporal para preview

  // ── ESTADO: Búsqueda ──
  const [busqueda, setBusqueda] = useState('');

  // ─────────────────────────────────────────────────
  // FILTRADO CON useMemo
  // ─────────────────────────────────────────────────
  // useMemo memoriza el resultado del filtrado.
  // Solo recalcula cuando cambian 'libros' o 'busqueda'.
  // Esto evita filtrar en cada render (optimización).

  const librosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return libros; // Sin búsqueda, devolver todos
    const termino = busqueda.toLowerCase().trim();
    return libros.filter((libro) =>
      libro.titulo?.toLowerCase().includes(termino) ||
      libro.isbn?.toLowerCase().includes(termino)
    );
  }, [libros, busqueda]);

  // ── PAGINACIÓN con hook personalizado ──
  // usePaginacion recibe el array filtrado y cuántos por página,
  // y devuelve los datos de la página actual + funciones de navegación
  const {
    datosPaginados: librosPaginados,  // Libros de la página actual
    paginaActual,                      // Número de página actual
    totalPaginas,                      // Total de páginas
    irAPagina,                         // Función: ir a página N
    paginaAnterior,                    // Función: ir a página anterior
    paginaSiguiente,                   // Función: ir a página siguiente
    resetear: resetPagina              // Función: volver a página 1
  } = usePaginacion(librosFiltrados, ELEMENTOS_POR_PAGINA);

  // ─────────────────────────────────────────────────
  // FUNCIÓN: Cargar datos iniciales
  // ─────────────────────────────────────────────────
  // Trae libros, autores y categorías EN PARALELO con Promise.all.
  // useCallback evita que esta función se recree en cada render.

  const cargarDatos = useCallback(async () => {
    try {
      // Promise.all ejecuta las 3 peticiones al mismo tiempo
      const [resLibros, resAutores, resCategorias] = await Promise.all([
        api.get('/libros'),       // GET /api/libros
        api.get('/autores'),      // GET /api/autores
        api.get('/categorias')    // GET /api/categorias
      ]);

      // Extraemos los arrays de las respuestas
      const librosData     = resLibros.data.datos     || resLibros.data;
      const autoresData    = resAutores.data.datos    || resAutores.data;
      const categoriasData = resCategorias.data.datos || resCategorias.data;

      // Guardamos en los estados (solo si son arrays válidos)
      if (Array.isArray(librosData))     setLibros(librosData);
      if (Array.isArray(autoresData))    setAutores(autoresData);
      if (Array.isArray(categoriasData)) setCategorias(categoriasData);
    } catch (err) {
      if (import.meta.env.DEV) console.error('[Inventario] Error cargando datos:', err);
    } finally {
      setCargando(false);
    }
  }, []);

  // ── useEffect: Se ejecuta al montar el componente ──
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // ─────────────────────────────────────────────────
  // FUNCIONES DEL MODAL (Crear / Editar)
  // ─────────────────────────────────────────────────

  // Limpia el estado de la imagen (libera la URL temporal)
  const limpiarPortada = () => {
    // URL.revokeObjectURL libera la memoria de la URL temporal
    if (portadaPreview) URL.revokeObjectURL(portadaPreview);
    setPortadaFile(null);
    setPortadaPreview(null);
  };

  // Preparar formulario para CREAR un libro nuevo
  const abrirModalNuevo = () => {
    setDatosLibro({
      ...LIBRO_INICIAL,
      // Pre-seleccionamos el primer autor y categoría si existen
      autor_id:     autores[0]?.id    || '',
      categoria_id: categorias[0]?.id || ''
    });
    limpiarPortada();
  };

  // Preparar formulario para EDITAR un libro existente
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
  // MANEJADORES DE EVENTOS
  // ─────────────────────────────────────────────────

  // handleChange: actualiza el campo del formulario que cambió
  // useCallback evita que esta función se recree innecesariamente
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setDatosLibro(prev => ({ ...prev, [name]: value }));
  }, []);

  // handleFileChange: cuando el usuario selecciona una imagen
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) { limpiarPortada(); return; }
    // Liberar URL anterior para evitar fugas de memoria (memory leak)
    if (portadaPreview) URL.revokeObjectURL(portadaPreview);
    setPortadaFile(file);
    // URL.createObjectURL crea una URL temporal para previsualizar
    setPortadaPreview(URL.createObjectURL(file));
  };

  // ─────────────────────────────────────────────────
  // FUNCIÓN: Guardar libro (crear o actualizar)
  // ─────────────────────────────────────────────────
  // Hay 2 formas de enviar datos al backend:
  //   1. CON imagen → FormData (multipart/form-data) → multer lo procesa
  //   2. SIN imagen → JSON normal → express.json() lo procesa

  const handleGuardar = async (e) => {
    e.preventDefault();

    try {
      let peticion;

      if (portadaFile) {
        // ── CON IMAGEN: usar FormData ──
        // FormData es un objeto especial que permite enviar archivos
        // junto con datos de texto en la misma petición HTTP
        const formData = new FormData();
        formData.append('isbn',         datosLibro.isbn         || '');
        formData.append('titulo',       datosLibro.titulo);
        formData.append('autor_id',     datosLibro.autor_id     || '');
        formData.append('categoria_id', datosLibro.categoria_id || '');
        formData.append('precio_venta', datosLibro.precio_venta);
        formData.append('stock_minimo', datosLibro.stock_minimo || 5);
        formData.append('portada', portadaFile); // El archivo de imagen

        // Indicamos al servidor que es multipart/form-data
        const config = { headers: { 'Content-Type': 'multipart/form-data' } };

        // Si tiene ID → PUT (editar), si no → POST (crear)
        peticion = datosLibro.id
          ? api.put(`/libros/${datosLibro.id}`, formData, config)
          : api.post('/libros', formData, config);
      } else {
        // ── SIN IMAGEN: JSON normal ──
        peticion = datosLibro.id
          ? api.put(`/libros/${datosLibro.id}`, datosLibro)
          : api.post('/libros', datosLibro);
      }

      await peticion; // Esperamos la respuesta del servidor
      alert(datosLibro.id ? 'Libro actualizado correctamente' : 'Libro creado con éxito');

      cargarDatos(); // Recargamos la lista
      cerrarModalRef.current?.click(); // Cerramos el modal

    } catch (error) {
      if (import.meta.env.DEV) console.error('[Inventario] Error al guardar:', error);
      alert(error.response?.data?.mensaje || error.response?.data?.error || 'Error al guardar');
    }
  };

  // ─────────────────────────────────────────────────
  // FUNCIÓN: Eliminar libro (con confirmación)
  // ─────────────────────────────────────────────────

  const handleEliminar = async (id, titulo) => {
    if (!window.confirm(`¿Borrar "${titulo}"?`)) return;

    try {
      await api.delete(`/libros/${id}`); // DELETE /api/libros/:id
      cargarDatos(); // Recargamos la lista
    } catch (error) {
      if (import.meta.env.DEV) console.error('[Inventario] Error al eliminar:', error);
      alert(error.response?.data?.mensaje || error.response?.data?.error || 'Error al eliminar');
    }
  };

  // =====================================================
  // RENDERIZADO (JSX)
  // =====================================================

  return (
    <div className="container mt-4">

      {/* ── ENCABEZADO con título, botón crear y botón exportar ── */}
      <div className="module-header mb-3 shadow-sm" style={{ borderRadius: '8px' }}>
        <h2 className="text-white">Inventario Actual</h2>
        <div className="d-flex gap-2">
          {/* Botón "Nuevo Libro" (solo con permiso) */}
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
          {/* Botón "Exportar Excel" → genera archivo .xlsx con XLSX */}
          <button
            className="btn btn-outline-light btn-sm"
            onClick={() => {
              // Transformamos los datos a un formato legible para Excel
              const datos = librosFiltrados.map((l) => ({
                'ISBN':         l.isbn,
                'Título':       l.titulo,
                'Autor':        l.autor       || '',
                'Categoría':    l.categoria   || '',
                'Precio Venta': l.precio_venta || 0,
                'Stock Actual': l.stock_actual || 0,
                'Stock Mínimo': l.stock_minimo || 0
              }));
              // XLSX genera la hoja de cálculo y la descarga
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

      {/* ── BUSCADOR (filtra por título o ISBN en tiempo real) ── */}
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

      {/* ── TABLA DE LIBROS (o spinner si está cargando) ── */}
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
                  {/* Miniatura de la portada */}
                  <td className="text-center">
                    <ThumbnailPortada portada={libro.portada} titulo={libro.titulo} />
                  </td>
                  <td>{libro.isbn}</td>
                  <td className="fw-bold">{libro.titulo}</td>
                  <td>{libro.autor || 'N/A'}</td>
                  <td>
                    <span className="badge bg-secondary">{libro.categoria || 'Gral'}</span>
                  </td>
                  {/* Precio formateado en pesos colombianos */}
                  <td>${new Intl.NumberFormat('es-CO').format(libro.precio_venta || 0)}</td>
                  {/* Stock: badge ROJO si está bajo el mínimo, VERDE si está bien */}
                  <td>
                    <span className={`badge ${
                      (libro.stock_actual || 0) <= libro.stock_minimo ? 'bg-danger' : 'bg-success'
                    }`}>
                      {libro.stock_actual || 0}
                    </span>
                  </td>
                  {/* Botones de acción (editar/eliminar según permisos) */}
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

      {/* ── PAGINACIÓN (solo si hay más de 1 página) ── */}
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

      {/* ══════════════════════════════════════════════════
          MODAL: Crear o Editar Libro
          ══════════════════════════════════════════════════ */}
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

                {/* Campo ISBN */}
                <div className="mb-3">
                  <label className="form-label">ISBN (Código):</label>
                  <input type="text" className="form-control" name="isbn" required value={datosLibro.isbn} onChange={handleChange} />
                </div>

                {/* Campo Título */}
                <div className="mb-3">
                  <label className="form-label">Título:</label>
                  <input type="text" className="form-control" name="titulo" required value={datosLibro.titulo} onChange={handleChange} />
                </div>

                {/* Precio y Stock Mínimo (en la misma fila) */}
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

                {/* Select de Autor */}
                <div className="mb-3">
                  <label className="form-label">Autor:</label>
                  <select className="form-select" name="autor_id" value={datosLibro.autor_id} onChange={handleChange} required>
                    <option value="">Seleccione un autor</option>
                    {autores.map(autor => (
                      <option key={autor.id} value={autor.id}>{autor.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Select de Categoría */}
                <div className="mb-3">
                  <label className="form-label">Categoría:</label>
                  <select className="form-select" name="categoria_id" value={datosLibro.categoria_id} onChange={handleChange} required>
                    <option value="">Seleccione una categoría</option>
                    {categorias.map(categoria => (
                      <option key={categoria.id} value={categoria.id}>{categoria.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* ── CAMPO DE PORTADA (imagen opcional) ── */}
                <div className="mb-3">
                  <label className="form-label">
                    Portada{' '}
                    <span className="text-muted fw-normal small">(opcional, máx. 2 MB — JPG, PNG, WEBP)</span>
                  </label>

                  {/* Si estamos editando y el libro ya tiene portada, la mostramos */}
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

                  {/* Preview de la nueva imagen seleccionada */}
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

                  {/* Input de tipo file para seleccionar la imagen */}
                  <input
                    type="file"
                    className="form-control"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Botón de envío */}
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