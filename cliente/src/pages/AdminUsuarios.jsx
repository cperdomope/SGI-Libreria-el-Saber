// =====================================================
// PÁGINA: ADMINISTRACIÓN DE USUARIOS
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Permite al Administrador gestionar los usuarios del sistema:
//   - Ver la lista de todos los usuarios registrados
//   - Crear un nuevo usuario (con nombre, email, contraseña y rol)
//   - Editar los datos de un usuario existente (sin cambiar contraseña)
//   - Activar o desactivar usuarios (no se eliminan, se desactivan)
//
// ¿Cómo se conecta con el sistema?
//   1. Se renderiza en la ruta /admin/usuarios (ver App.jsx)
//   2. Solo accesible para rol Administrador (permiso: gestionarUsuarios)
//   3. Llama a la API:
//      - GET /api/usuarios → listar todos los usuarios
//      - POST /api/usuarios → crear nuevo usuario
//      - PUT /api/usuarios/:id → editar datos del usuario
//      - PATCH /api/usuarios/:id/estado → activar/desactivar
//   4. Los usuarios creados aquí son los que hacen login en Acceso.jsx
//   5. El rol (Admin=1 o Vendedor=2) define los permisos en AuthContext
//
// Conceptos clave para el jurado:
//   - react-hook-form: maneja validación del formulario
//   - shouldUnregister: cuando el campo "password" no se renderiza
//     (modo edición), RHF lo ignora automáticamente
//   - reset(): carga valores en el formulario al abrir el modal
//   - Modal controlado por estado (no por Bootstrap JS)
//
// =====================================================

import React, { useState, useEffect } from 'react';
// react-hook-form: manejo declarativo de formularios con validación
import { useForm } from 'react-hook-form';
// api: cliente HTTP con Axios (incluye token JWT automáticamente)
import api from '../services/api';
// useAuth: para obtener el usuario actual (saber quién soy yo)
import { useAuth } from '../context/AuthContext';

// ── Icono SVG en línea para el botón de editar ──
const IconoEditar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
  </svg>
);

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const AdminUsuarios = () => {
  // Obtenemos el usuario actual para saber quién soy yo
  // (así no me puedo desactivar a mí mismo)
  const { usuario: usuarioActual } = useAuth();

  // ── ESTADOS: Datos y UI ──
  const [usuarios, setUsuarios]   = useState([]);     // Lista de usuarios del backend
  const [cargando, setCargando]   = useState(true);   // Spinner mientras carga
  const [error, setError]         = useState(null);   // Error general de carga
  const [guardando, setGuardando] = useState(false);  // Spinner del botón guardar

  // ── ESTADOS: Control del modal ──
  const [mostrarModal, setMostrarModal] = useState(false);  // Visible o no
  const [esEdicion, setEsEdicion]       = useState(false);  // true=editar, false=crear
  const [idEditando, setIdEditando]     = useState(null);   // ID del usuario que se edita

  // Error devuelto por el servidor (ej: email duplicado)
  const [errorServidor, setErrorServidor] = useState('');

  // ─────────────────────────────────────────────────
  // react-hook-form: inicialización
  // ─────────────────────────────────────────────────
  // shouldUnregister: true → cuando el campo "password"
  // se oculta del DOM (en modo edición), react-hook-form
  // lo desregistra automáticamente y NO aplica sus reglas.
  // Así el formulario de edición NO exige contraseña.
  //
  // register: conecta inputs con reglas de validación
  // handleSubmit: valida antes de llamar guardarUsuario
  // reset: carga valores en los campos del formulario
  // errors: mensajes de error por campo

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({ shouldUnregister: true });

  // ─────────────────────────────────────────────────
  // FUNCIÓN: Cargar usuarios desde la API
  // ─────────────────────────────────────────────────

  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      const respuesta = await api.get('/usuarios'); // GET /api/usuarios
      setUsuarios(respuesta.data.datos || []);
      setError(null);
    } catch (err) {
      setError('Error al cargar los usuarios del sistema');
      if (import.meta.env.DEV) console.error('[AdminUsuarios]', err);
    } finally {
      setCargando(false);
    }
  };

  // Se ejecuta al montar el componente (primera carga)
  useEffect(() => {
    cargarUsuarios();
  }, []);

  // ─────────────────────────────────────────────────
  // FUNCIONES DEL MODAL (Crear / Editar)
  // ─────────────────────────────────────────────────

  // Preparar modal para CREAR un usuario nuevo
  const abrirModalNuevo = () => {
    setEsEdicion(false);
    setIdEditando(null);
    setErrorServidor('');
    // reset() establece valores por defecto en el formulario
    reset({ nombre_completo: '', email: '', password: '', rol_id: 2 });
    setMostrarModal(true);
  };

  // Preparar modal para EDITAR un usuario existente
  const abrirModalEditar = (usuario) => {
    setEsEdicion(true);
    setIdEditando(usuario.id);
    setErrorServidor('');
    // reset() precarga los datos del usuario en los campos
    reset({
      nombre_completo: usuario.nombre_completo,
      email:           usuario.email,
      rol_id:          usuario.rol_id
      // password NO se incluye: el campo no se renderiza en edición
    });
    setMostrarModal(true);
  };

  // Cerrar el modal y limpiar estados
  const cerrarModal = () => {
    setMostrarModal(false);
    setErrorServidor('');
    reset();
  };

  // ─────────────────────────────────────────────────
  // FUNCIÓN: Guardar usuario (crear o editar)
  // ─────────────────────────────────────────────────
  // handleSubmit() de react-hook-form llama esta función
  // SOLO si todos los campos pasaron su validación.
  // Recibe { nombre_completo, email, password, rol_id }

  const guardarUsuario = async (data) => {
    setErrorServidor('');
    try {
      setGuardando(true);

      if (esEdicion) {
        // PUT /api/usuarios/:id → actualizar (sin contraseña)
        await api.put(`/usuarios/${idEditando}`, {
          nombre_completo: data.nombre_completo,
          email:           data.email,
          rol_id:          parseInt(data.rol_id)
        });
      } else {
        // POST /api/usuarios → crear nuevo (con contraseña)
        await api.post('/usuarios', {
          nombre_completo: data.nombre_completo,
          email:           data.email,
          password:        data.password,
          rol_id:          parseInt(data.rol_id)
        });
      }

      cerrarModal();       // Cerramos el modal
      cargarUsuarios();    // Recargamos la lista
    } catch (err) {
      // Errores de negocio del backend (email duplicado, etc.)
      setErrorServidor(err.response?.data?.mensaje || 'Error al guardar el usuario');
    } finally {
      setGuardando(false);
    }
  };

  // ─────────────────────────────────────────────────
  // FUNCIÓN: Activar o desactivar un usuario
  // ─────────────────────────────────────────────────
  // No se eliminan usuarios, se desactivan (soft delete).
  // Un usuario inactivo no puede hacer login.

  const cambiarEstado = async (usuario) => {
    const accion = usuario.estado === 1 ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Desea ${accion} al usuario "${usuario.nombre_completo}"?`)) return;

    try {
      // PATCH /api/usuarios/:id/estado → cambia el estado
      await api.patch(`/usuarios/${usuario.id}/estado`);
      cargarUsuarios(); // Recargamos la lista
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al cambiar el estado');
    }
  };

  // ── Función utilitaria: formatear fecha ──
  const formatearFecha = (fecha) =>
    fecha ? new Date(fecha).toLocaleDateString('es-CO') : 'Nunca';

  // =====================================================
  // RENDERIZADO (JSX)
  // =====================================================

  // Si está cargando, mostramos solo el spinner
  if (cargando) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="card shadow-sm">

        {/* ── ENCABEZADO con título y botón crear ── */}
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h4 className="mb-0" style={{ fontSize: 'clamp(1rem, 3vw, 1.4rem)' }}>Gestión de Usuarios</h4>
          <button className="btn btn-sm btn-light flex-shrink-0" onClick={abrirModalNuevo}>
            + Nuevo Usuario
          </button>
        </div>

        <div className="card-body">
          {/* Error general de carga */}
          {error && <div className="alert alert-danger">{error}</div>}

          {/* ── TABLA DE USUARIOS ── */}
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Nombre</th>
                  {/* d-none d-md-table-cell: oculto en móvil, visible en tablet+ */}
                  <th className="d-none d-md-table-cell">Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th className="d-none d-lg-table-cell">Último Acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  usuarios.map((usr) => (
                    <tr key={usr.id}>
                      <td>
                        <div className="fw-semibold">{usr.nombre_completo}</div>
                        {/* En móvil, mostramos el email debajo del nombre */}
                        <small className="text-muted d-md-none">{usr.email}</small>
                        {/* Indicador "(Tú)" si es el usuario actual */}
                        {usr.id === usuarioActual?.id && (
                          <small className="text-primary d-block">(Tú)</small>
                        )}
                      </td>
                      <td className="text-muted d-none d-md-table-cell">{usr.email}</td>
                      {/* Badge de rol: rojo=Admin, azul=Vendedor */}
                      <td>
                        <span className={`badge ${usr.rol_id === 1 ? 'bg-danger' : 'bg-info'}`}>
                          {usr.rol_id === 1 ? 'Admin' : 'Vendedor'}
                        </span>
                      </td>
                      {/* Badge de estado: verde=Activo, gris=Inactivo */}
                      <td>
                        <span className={`badge ${usr.estado === 1 ? 'bg-success' : 'bg-secondary'}`}>
                          {usr.estado === 1 ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="text-muted small d-none d-lg-table-cell">{formatearFecha(usr.ultimo_acceso)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          {/* Botón editar */}
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => abrirModalEditar(usr)}
                            title="Editar datos"
                          >
                            <IconoEditar />
                          </button>
                          {/* Botón activar/desactivar (no aparece para mí mismo) */}
                          {usr.id !== usuarioActual?.id && (
                            <button
                              className={`btn btn-sm ${usr.estado === 1 ? 'btn-outline-danger' : 'btn-outline-success'}`}
                              onClick={() => cambiarEstado(usr)}
                              title={usr.estado === 1 ? 'Desactivar usuario' : 'Activar usuario'}
                            >
                              {usr.estado === 1 ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <small className="text-muted">
            Total: {usuarios.length} usuario(s) registrado(s)
          </small>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL: Crear o Editar Usuario
          ══════════════════════════════════════════════════
          Este modal es CONTROLADO POR ESTADO (mostrarModal),
          a diferencia de los otros modales que usan Bootstrap JS.
          Se muestra con className="modal show d-block" */}
      {mostrarModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title">
                  {esEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={cerrarModal} />
              </div>

              {/* handleSubmit valida los campos antes de llamar guardarUsuario */}
              <form onSubmit={handleSubmit(guardarUsuario)} noValidate>
                <div className="modal-body">

                  {/* Error del servidor (ej: email duplicado) */}
                  {errorServidor && (
                    <div className="alert alert-danger py-2">{errorServidor}</div>
                  )}

                  {/* ── NOMBRE COMPLETO ── */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Nombre Completo *</label>
                    <input
                      type="text"
                      className={`form-control ${errors.nombre_completo ? 'is-invalid' : ''}`}
                      placeholder="Nombre y apellido"
                      {...register('nombre_completo', {
                        required: 'El nombre completo es obligatorio',
                        minLength: {
                          value: 3,
                          message: 'El nombre debe tener al menos 3 caracteres'
                        },
                        maxLength: {
                          value: 100,
                          message: 'El nombre no puede superar 100 caracteres'
                        }
                      })}
                    />
                    {errors.nombre_completo && (
                      <div className="invalid-feedback">{errors.nombre_completo.message}</div>
                    )}
                  </div>

                  {/* ── EMAIL ── */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email *</label>
                    <input
                      type="email"
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      placeholder="usuario@ejemplo.com"
                      {...register('email', {
                        required: 'El email es obligatorio',
                        pattern: {
                          value: /\S+@\S+\.\S+/,
                          message: 'El formato del email no es válido'
                        }
                      })}
                    />
                    {errors.email && (
                      <div className="invalid-feedback">{errors.email.message}</div>
                    )}
                  </div>

                  {/* ── CONTRASEÑA (solo al CREAR, no al editar) ──
                      Cuando esEdicion=true, este bloque NO se renderiza.
                      Gracias a shouldUnregister:true, react-hook-form
                      desregistra el campo y no exige contraseña al editar. */}
                  {!esEdicion && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Contraseña *</label>
                      <input
                        type="password"
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        placeholder="Mínimo 6 caracteres"
                        {...register('password', {
                          required: 'La contraseña es obligatoria',
                          minLength: {
                            value: 6,
                            message: 'La contraseña debe tener al menos 6 caracteres'
                          }
                        })}
                      />
                      {errors.password && (
                        <div className="invalid-feedback">{errors.password.message}</div>
                      )}
                      <small className="text-muted">
                        Para cambiar contraseña de usuario existente, use "Cambiar Contraseña" en el menú.
                      </small>
                    </div>
                  )}

                  {/* ── ROL (Administrador o Vendedor) ── */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Rol *</label>
                    <select
                      className={`form-select ${errors.rol_id ? 'is-invalid' : ''}`}
                      {...register('rol_id', {
                        required: 'El rol es obligatorio'
                      })}
                    >
                      <option value={1}>Administrador</option>
                      <option value={2}>Vendedor</option>
                    </select>
                    {errors.rol_id && (
                      <div className="invalid-feedback">{errors.rol_id.message}</div>
                    )}
                    <small className="text-muted">
                      Administrador: acceso total. Vendedor: solo ventas y consultas.
                    </small>
                  </div>

                </div>

                {/* ── Botones del pie del modal ── */}
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={cerrarModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-dark" disabled={guardando}>
                    {guardando ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Crear Usuario'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsuarios;