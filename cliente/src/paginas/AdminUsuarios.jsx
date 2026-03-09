/**
 * =====================================================
 * ADMINISTRACIÓN DE USUARIOS
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description CRUD completo para gestionar los usuarios
 * del sistema. Solo accesible para el rol Administrador.
 *
 * VALIDACIÓN CON react-hook-form:
 * - useForm() con shouldUnregister:true para que el campo
 *   "password" se desregistre cuando no está en el DOM
 *   (modo edición) y no se valide innecesariamente.
 * - register() conecta cada campo con reglas declarativas
 * - errors muestra mensajes bajo cada campo
 * - reset() carga los valores al abrir el modal
 *
 * @version 2.0.0
 */

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../servicios/api';
import { useAuth } from '../contexto/AuthContext';

// =====================================================
// ICONOS SVG INLINE
// =====================================================

const IconoEditar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
  </svg>
);

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const AdminUsuarios = () => {
  const { usuario: usuarioActual } = useAuth();

  // ── Datos de la tabla ──
  const [usuarios, setUsuarios]   = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState(null);
  const [guardando, setGuardando] = useState(false);

  // ── Estado del modal ──
  const [mostrarModal, setMostrarModal] = useState(false);
  const [esEdicion, setEsEdicion]       = useState(false);
  const [idEditando, setIdEditando]     = useState(null);

  // Error devuelto por el servidor (p.ej. email duplicado)
  const [errorServidor, setErrorServidor] = useState('');

  // ─────────────────────────────────────────────────
  // react-hook-form
  //
  // shouldUnregister: true → cuando el campo "password"
  // se oculta (modo edición), RHF lo desregistra y NO
  // aplica sus reglas de validación. Así el formulario
  // de edición no exige contraseña.
  // ─────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({ shouldUnregister: true });

  // ─────────────────────────────────────────────────
  // CARGA DE DATOS
  // ─────────────────────────────────────────────────

  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      const respuesta = await api.get('/usuarios');
      setUsuarios(respuesta.data.datos || []);
      setError(null);
    } catch (err) {
      setError('Error al cargar los usuarios del sistema');
      if (import.meta.env.DEV) console.error('[AdminUsuarios]', err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  // ─────────────────────────────────────────────────
  // GESTIÓN DEL MODAL
  // ─────────────────────────────────────────────────

  const abrirModalNuevo = () => {
    setEsEdicion(false);
    setIdEditando(null);
    setErrorServidor('');
    // reset() carga los valores por defecto al formulario RHF
    reset({ nombre_completo: '', email: '', password: '', rol_id: 2 });
    setMostrarModal(true);
  };

  const abrirModalEditar = (usuario) => {
    setEsEdicion(true);
    setIdEditando(usuario.id);
    setErrorServidor('');
    // reset() precarga los datos del usuario en los campos
    reset({
      nombre_completo: usuario.nombre_completo,
      email:           usuario.email,
      rol_id:          usuario.rol_id
      // password no se incluye: el campo no se renderiza en edición
    });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setErrorServidor('');
    reset();
  };

  // ─────────────────────────────────────────────────
  // GUARDAR USUARIO
  // handleSubmit() de RHF llama esta función SOLO si
  // todos los register() pasaron su validación.
  // Recibe { nombre_completo, email, password, rol_id }
  // ─────────────────────────────────────────────────

  const guardarUsuario = async (data) => {
    setErrorServidor('');
    try {
      setGuardando(true);

      if (esEdicion) {
        await api.put(`/usuarios/${idEditando}`, {
          nombre_completo: data.nombre_completo,
          email:           data.email,
          rol_id:          parseInt(data.rol_id)
        });
      } else {
        await api.post('/usuarios', {
          nombre_completo: data.nombre_completo,
          email:           data.email,
          password:        data.password,
          rol_id:          parseInt(data.rol_id)
        });
      }

      cerrarModal();
      cargarUsuarios();
    } catch (err) {
      // Errores de negocio del backend (email duplicado, etc.)
      setErrorServidor(err.response?.data?.mensaje || 'Error al guardar el usuario');
    } finally {
      setGuardando(false);
    }
  };

  // ─────────────────────────────────────────────────
  // CAMBIAR ESTADO (ACTIVAR / DESACTIVAR)
  // ─────────────────────────────────────────────────

  const cambiarEstado = async (usuario) => {
    const accion = usuario.estado === 1 ? 'desactivar' : 'activar';
    if (!window.confirm(`¿Desea ${accion} al usuario "${usuario.nombre_completo}"?`)) return;

    try {
      await api.patch(`/usuarios/${usuario.id}/estado`);
      cargarUsuarios();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al cambiar el estado');
    }
  };

  // ─────────────────────────────────────────────────
  // UTILIDADES
  // ─────────────────────────────────────────────────

  const formatearFecha = (fecha) =>
    fecha ? new Date(fecha).toLocaleDateString('es-CO') : 'Nunca';

  // ─────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────

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

        {/* ── ENCABEZADO ── */}
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Gestión de Usuarios del Sistema</h4>
          <button className="btn btn-sm btn-light" onClick={abrirModalNuevo}>
            + Nuevo Usuario
          </button>
        </div>

        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}

          {/* ── TABLA ── */}
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Último Acceso</th>
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
                        {usr.id === usuarioActual?.id && (
                          <small className="text-primary">(Tú)</small>
                        )}
                      </td>
                      <td className="text-muted">{usr.email}</td>
                      <td>
                        <span className={`badge ${usr.rol_id === 1 ? 'bg-danger' : 'bg-info'}`}>
                          {usr.rol || (usr.rol_id === 1 ? 'Administrador' : 'Vendedor')}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${usr.estado === 1 ? 'bg-success' : 'bg-secondary'}`}>
                          {usr.estado === 1 ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="text-muted small">{formatearFecha(usr.ultimo_acceso)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => abrirModalEditar(usr)}
                            title="Editar datos"
                          >
                            <IconoEditar />
                          </button>
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

      {/* ─────────────────────────────────────────────────
          MODAL CREAR / EDITAR
          ───────────────────────────────────────────────── */}
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

              {/* ── handleSubmit valida antes de llamar guardarUsuario ── */}
              <form onSubmit={handleSubmit(guardarUsuario)} noValidate>
                <div className="modal-body">

                  {/* Error del servidor (email duplicado, etc.) */}
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

                  {/* ── CONTRASEÑA (solo en creación) ──
                      Al estar dentro de {!esEdicion && (...)}, cuando
                      esEdicion=true el input no se renderiza.
                      Con shouldUnregister:true, RHF lo desregistra
                      automáticamente y no valida este campo. */}
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

                  {/* ── ROL ── */}
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
