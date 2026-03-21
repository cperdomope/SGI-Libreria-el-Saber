// =====================================================
// COMPONENTE: MODAL PARA CAMBIAR CONTRASEÑA
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Es una ventana emergente (modal) que permite a CUALQUIER
//   usuario del sistema cambiar su propia contraseña.
//   Se abre desde el menú desplegable de la BarraNavegacion.
//
// ¿Cómo se conecta con el sistema?
//   1. BarraNavegacion.jsx muestra un botón "Cambiar Contraseña"
//   2. Al hacer clic, se abre este modal (visible=true)
//   3. El usuario llena el formulario (contraseña actual + nueva)
//   4. Al enviar, se hace PATCH /api/usuarios/cambiar-password
//   5. El backend verifica la contraseña actual con bcrypt
//   6. Si es correcta, encripta y guarda la nueva contraseña
//
// Props que recibe:
//   - visible: booleano que controla si el modal se muestra o no
//   - onCerrar: función callback para cerrar el modal
//
// =====================================================

import React, { useState } from 'react';
// api: nuestro cliente HTTP configurado con Axios (incluye el token JWT automáticamente)
import api from '../services/api';

// ─────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────
const ModalCambiarPassword = ({ visible, onCerrar }) => {

  // ── ESTADOS DEL FORMULARIO ──
  // form: objeto con los 3 campos del formulario
  const [form, setForm] = useState({
    passwordActual: '',       // La contraseña que el usuario usa actualmente
    passwordNueva: '',        // La nueva contraseña que quiere poner
    passwordConfirmacion: ''  // Repetir la nueva contraseña (para evitar errores de tipeo)
  });

  // error: mensaje de error para mostrar al usuario (en rojo)
  const [error, setError] = useState('');
  // exito: mensaje de éxito para mostrar al usuario (en verde)
  const [exito, setExito] = useState('');
  // guardando: booleano para deshabilitar el botón mientras se envía la petición
  const [guardando, setGuardando] = useState(false);

  // ── FUNCIÓN: Cerrar el modal y limpiar todo ──
  // Cuando el usuario cierra el modal (por botón o clic fuera),
  // limpiamos el formulario y los mensajes para que la próxima
  // vez que lo abra esté en blanco.
  const cerrar = () => {
    setForm({ passwordActual: '', passwordNueva: '', passwordConfirmacion: '' });
    setError('');
    setExito('');
    onCerrar();  // Llamamos al callback del componente padre
  };

  // ── FUNCIÓN: Validar y enviar el formulario ──
  // Esta función se ejecuta cuando el usuario hace clic en "Cambiar Contraseña"
  const handleSubmit = async (e) => {
    e.preventDefault();   // Evitamos que el formulario recargue la página
    setError('');          // Limpiamos mensajes previos
    setExito('');

    // ── Validaciones en el frontend (antes de enviar al backend) ──
    // Esto mejora la experiencia porque no tiene que esperar
    // la respuesta del servidor para ver errores obvios.

    if (!form.passwordActual) {
      return setError('Ingrese su contraseña actual');
    }
    if (form.passwordNueva.length < 6) {
      return setError('La nueva contraseña debe tener al menos 6 caracteres');
    }
    if (form.passwordNueva !== form.passwordConfirmacion) {
      return setError('La nueva contraseña y la confirmación no coinciden');
    }
    if (form.passwordActual === form.passwordNueva) {
      return setError('La nueva contraseña debe ser diferente a la actual');
    }

    // ── Enviar la petición al backend ──
    try {
      setGuardando(true);  // Deshabilitar botón para evitar doble clic

      // PATCH = actualización parcial (solo cambiamos la contraseña, no todo el usuario)
      await api.patch('/usuarios/cambiar-password', {
        passwordActual: form.passwordActual,
        passwordNueva: form.passwordNueva,
        passwordConfirmacion: form.passwordConfirmacion
      });

      // Si llegamos aquí, el cambio fue exitoso
      setExito('Contraseña actualizada exitosamente');
      // Limpiamos el formulario pero dejamos el modal abierto 2 segundos
      // para que el usuario vea el mensaje de éxito
      setForm({ passwordActual: '', passwordNueva: '', passwordConfirmacion: '' });
      setTimeout(cerrar, 2000);

    } catch (err) {
      // Si el backend respondió con error, mostramos su mensaje
      // err.response?.data?.mensaje viene del backend (ej: "Contraseña actual incorrecta")
      const mensaje = err.response?.data?.mensaje || 'Error al cambiar la contraseña';
      setError(mensaje);
    } finally {
      // finally se ejecuta siempre (éxito o error)
      setGuardando(false);  // Rehabilitar el botón
    }
  };

  // ── Si el modal no está visible, no renderizamos nada ──
  if (!visible) return null;

  // ── RENDERIZADO DEL MODAL ──
  // Usamos Bootstrap 5 para los estilos del modal
  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
      // Si el usuario hace clic en el fondo oscuro (fuera del modal), lo cerramos
      onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}
    >
      <div className="modal-dialog modal-sm">
        <div className="modal-content">
          {/* Encabezado del modal con fondo amarillo (warning) */}
          <div className="modal-header bg-warning text-dark">
            <h5 className="modal-title">Cambiar Contraseña</h5>
            <button type="button" className="btn-close" onClick={cerrar} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Mensajes de error o éxito */}
              {error && <div className="alert alert-danger py-2 small">{error}</div>}
              {exito && <div className="alert alert-success py-2 small">{exito}</div>}

              {/* Campo: Contraseña actual */}
              <div className="mb-3">
                <label className="form-label fw-semibold small">Contraseña Actual *</label>
                <input
                  type="password"
                  className="form-control form-control-sm"
                  value={form.passwordActual}
                  onChange={(e) => setForm({ ...form, passwordActual: e.target.value })}
                  placeholder="Tu contraseña actual"
                  autoComplete="current-password"
                  required
                />
              </div>

              {/* Campo: Nueva contraseña */}
              <div className="mb-3">
                <label className="form-label fw-semibold small">Nueva Contraseña *</label>
                <input
                  type="password"
                  className="form-control form-control-sm"
                  value={form.passwordNueva}
                  onChange={(e) => setForm({ ...form, passwordNueva: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>

              {/* Campo: Confirmar nueva contraseña */}
              <div className="mb-2">
                <label className="form-label fw-semibold small">Confirmar Nueva Contraseña *</label>
                <input
                  type="password"
                  className="form-control form-control-sm"
                  value={form.passwordConfirmacion}
                  onChange={(e) => setForm({ ...form, passwordConfirmacion: e.target.value })}
                  placeholder="Repite la nueva contraseña"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {/* Botones del modal */}
            <div className="modal-footer py-2">
              <button type="button" className="btn btn-sm btn-secondary" onClick={cerrar}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-sm btn-warning" disabled={guardando}>
                {/* Mientras se envía, mostramos "Guardando..." */}
                {guardando ? 'Guardando...' : 'Cambiar Contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ModalCambiarPassword;