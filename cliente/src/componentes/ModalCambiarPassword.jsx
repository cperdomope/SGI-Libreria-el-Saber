/**
 * =====================================================
 * MODAL: CAMBIAR CONTRASEÑA
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Modal para que cualquier usuario autenticado
 * pueda cambiar su propia contraseña. Se renderiza desde
 * la BarraNavegacion como opción del menú de usuario.
 *
 * FLUJO:
 * 1. Usuario ingresa contraseña actual
 * 2. Usuario ingresa nueva contraseña (mín. 6 chars)
 * 3. Usuario confirma nueva contraseña
 * 4. Al guardar, se envía PATCH /api/usuarios/cambiar-password
 * 5. Si es exitoso, el modal se cierra y muestra mensaje
 *
 * @param {boolean} visible - Controla si el modal está abierto
 * @param {Function} onCerrar - Callback para cerrar el modal
 *
 * @version 1.0.0
 */

import React, { useState } from 'react';
import api from '../servicios/api';

// =====================================================
// COMPONENTE
// =====================================================

const ModalCambiarPassword = ({ visible, onCerrar }) => {
  // Estado del formulario
  const [form, setForm] = useState({
    passwordActual: '',
    passwordNueva: '',
    passwordConfirmacion: ''
  });

  const [error, setError] = useState('');
  const [exito, setExito] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Limpiar formulario al cerrar
  const cerrar = () => {
    setForm({ passwordActual: '', passwordNueva: '', passwordConfirmacion: '' });
    setError('');
    setExito('');
    onCerrar();
  };

  // Validar y enviar
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    // Validaciones en frontend
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

    try {
      setGuardando(true);
      await api.patch('/usuarios/cambiar-password', {
        passwordActual: form.passwordActual,
        passwordNueva: form.passwordNueva,
        passwordConfirmacion: form.passwordConfirmacion
      });

      setExito('Contraseña actualizada exitosamente');
      // Limpiar el formulario pero mantener el modal abierto 2 segundos
      setForm({ passwordActual: '', passwordNueva: '', passwordConfirmacion: '' });
      setTimeout(cerrar, 2000);

    } catch (err) {
      const mensaje = err.response?.data?.mensaje || 'Error al cambiar la contraseña';
      setError(mensaje);
    } finally {
      setGuardando(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
      onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}
    >
      <div className="modal-dialog modal-sm">
        <div className="modal-content">
          <div className="modal-header bg-warning text-dark">
            <h5 className="modal-title">Cambiar Contraseña</h5>
            <button type="button" className="btn-close" onClick={cerrar} />
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Mensajes */}
              {error && <div className="alert alert-danger py-2 small">{error}</div>}
              {exito && <div className="alert alert-success py-2 small">{exito}</div>}

              {/* Contraseña actual */}
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

              {/* Nueva contraseña */}
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

              {/* Confirmar contraseña */}
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

            <div className="modal-footer py-2">
              <button type="button" className="btn btn-sm btn-secondary" onClick={cerrar}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-sm btn-warning" disabled={guardando}>
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
