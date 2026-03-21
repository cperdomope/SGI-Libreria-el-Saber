// =====================================================
// PÁGINA: ACCESO (LOGIN)
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Es la página de inicio de sesión del sistema.
//   El usuario ingresa su correo y contraseña, y si son
//   correctos, el backend devuelve un token JWT que se
//   guarda en el AuthContext para todas las demás peticiones.
//
// ¿Cómo se conecta con el sistema?
//   1. Se renderiza en la ruta /acceso (ver App.jsx)
//   2. Es la ÚNICA ruta pública (no requiere autenticación)
//   3. Llama a POST /api/auth/login con { email, password }
//   4. Si es exitoso, recibe { usuario, token }
//   5. Llama a login() del AuthContext para guardar la sesión
//   6. Redirige al usuario a la página principal
//
// Conceptos clave para el jurado:
//   - react-hook-form: librería que maneja formularios de forma
//     declarativa (register, handleSubmit, errors)
//   - Bloqueo de cuenta: tras 3 intentos fallidos, el backend
//     bloquea la cuenta por seguridad
//   - Validación en tiempo real: los errores se muestran al
//     perder el foco del campo (mode: 'onTouched')
//
// =====================================================

import React, { useState } from 'react';
// react-hook-form: manejo declarativo de formularios con validación
import { useForm } from 'react-hook-form';
// useNavigate: para redirigir al usuario después del login
import { useNavigate } from 'react-router-dom';
// api: cliente HTTP con Axios
import api from '../services/api';
// useAuth: contexto global de autenticación
import { useAuth } from '../context/AuthContext';

// ── Iconos SVG en línea para el formulario ──
const Icons = {
  // Icono de libro (logo del sistema)
  Book: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
      <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
    </svg>
  ),
  // Icono de usuario (campo email)
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
    </svg>
  ),
  // Icono de candado (campo contraseña)
  Lock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
    </svg>
  ),
  // Icono de ojo abierto (mostrar contraseña)
  Eye: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
    </svg>
  ),
  // Icono de ojo tachado (ocultar contraseña)
  EyeSlash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
      <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
      <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
    </svg>
  )
};

// ── Máximo de intentos antes del bloqueo ──
const MAX_INTENTOS = 3;

// =====================================================
// COMPONENTE PRINCIPAL
// =====================================================

const Acceso = () => {

  // ─────────────────────────────────────────────────
  // react-hook-form: inicialización
  // ─────────────────────────────────────────────────
  // useForm() nos da 3 cosas principales:
  //   - register: conecta cada input con sus reglas de validación
  //   - handleSubmit: previene envío si hay errores de validación
  //   - errors: objeto con los mensajes de error por campo
  //
  // mode: 'onTouched' → valida cuando el usuario sale del campo
  // (no mientras escribe, para no ser molesto)
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ mode: 'onTouched' });

  // ── ESTADOS de la interfaz (no manejados por react-hook-form) ──
  const [mostrarPassword, setMostrarPassword] = useState(false);     // Toggle ver/ocultar contraseña
  const [loading, setLoading]                 = useState(false);     // Spinner del botón
  const [intentosRestantes, setIntentosRestantes] = useState(null);  // Contador de intentos (null = no mostrar)
  const [bloqueado, setBloqueado]             = useState(false);     // true = cuenta bloqueada
  const [errorServidor, setErrorServidor]     = useState('');        // Mensaje de error del backend
  const [mensajeDetallado, setMensajeDetallado] = useState('');      // Detalle del error

  // login: función del AuthContext que guarda usuario + token
  const { login }    = useAuth();
  // navigate: para redirigir después del login (no usado aquí, se usa window.location)
  const navigate     = useNavigate();

  // ─────────────────────────────────────────────────
  // FUNCIÓN: handleLogin (se ejecuta al enviar el formulario)
  // ─────────────────────────────────────────────────
  // Solo se llama si react-hook-form validó todos los campos OK.
  // Recibe { email, password } directamente de RHF.

  const handleLogin = async ({ email, password }) => {
    setLoading(true);
    setErrorServidor('');

    try {
      // POST /api/auth/login → envía credenciales al backend
      const res = await api.post('/auth/login', { email, password });

      // Si es exitoso, el backend devuelve { usuario, token }
      // Guardamos la sesión en el AuthContext
      login(res.data.usuario, res.data.token);

      // Redirigimos a la página principal (recarga completa)
      window.location.href = '/';

    } catch (err) {
      // ── Manejo de errores del backend ──
      const errorData = err.response?.data;

      if (errorData?.bloqueado) {
        // Caso 1: Cuenta bloqueada (3 intentos fallidos)
        setBloqueado(true);
        setIntentosRestantes(0);
        setMensajeDetallado(errorData.error);
      } else if (errorData?.intentosRestantes !== undefined) {
        // Caso 2: Credenciales incorrectas pero aún tiene intentos
        setIntentosRestantes(errorData.intentosRestantes);
        setMensajeDetallado(errorData.mensaje || errorData.error);
        setBloqueado(false);
      } else {
        // Caso 3: Error de conexión u otro error
        setMensajeDetallado(errorData?.error || 'No se pudo conectar al servidor. Intente más tarde.');
        setBloqueado(false);
      }

      setErrorServidor(errorData?.error || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // RENDERIZADO (JSX)
  // =====================================================

  return (
    <div className="login-container">
      <div className="login-card fade-in">

        {/* ── ENCABEZADO: Logo + título ── */}
        <div className="login-header">
          <div className="login-icon">
            <Icons.Book />
          </div>
          <h2 className="fw-bold text-dark">Bienvenido</h2>
          <p className="text-muted">Sistema de Gestión Librería el Saber</p>
        </div>

        {/* ── ALERTA DE ERROR DEL SERVIDOR ── */}
        {/* Se muestra cuando el backend devuelve un error */}
        {errorServidor && (
          <div className={`alert ${bloqueado ? 'alert-danger' : 'alert-warning'} mb-4`} role="alert">
            <div className="d-flex align-items-start">
              <div className="flex-grow-1">
                <strong className="d-block mb-1">
                  {bloqueado ? 'Cuenta Bloqueada' : 'Error de Autenticación'}
                </strong>
                <p className="mb-2 small">{mensajeDetallado || errorServidor}</p>

                {/* Barra de progreso de intentos restantes */}
                {/* Se muestra solo si hay intentos y no está bloqueado */}
                {intentosRestantes !== null && !bloqueado && (
                  <div className="mt-2">
                    <div className="progress" style={{ height: '8px' }}>
                      <div
                        className={`progress-bar ${
                          intentosRestantes === 2 ? 'bg-success' :
                          intentosRestantes === 1 ? 'bg-warning' : 'bg-danger'
                        }`}
                        style={{ width: `${(intentosRestantes / MAX_INTENTOS) * 100}%` }}
                      />
                    </div>
                    <small className="text-muted mt-1 d-block">
                      Intentos restantes: <strong>{intentosRestantes}</strong> de {MAX_INTENTOS}
                    </small>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════
            FORMULARIO DE LOGIN
            ══════════════════════════════════════════════
            handleSubmit de react-hook-form funciona así:
            1. Ejecuta las reglas de validación de cada register()
            2. Si hay errores → muestra mensajes y NO llama handleLogin
            3. Si todo es válido → llama handleLogin({ email, password })

            noValidate: desactiva la validación nativa del navegador
            (usamos la de react-hook-form que es más personalizable) */}
        <form onSubmit={handleSubmit(handleLogin)} noValidate>

          {/* ── CAMPO: EMAIL ── */}
          <div className="mb-4">
            <label className="form-label fw-bold small text-muted">CORREO ELECTRÓNICO</label>
            <div className="input-group has-validation">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <Icons.User />
              </span>
              {/* register() conecta este input con sus reglas:
                  - required: campo obligatorio
                  - pattern: debe tener formato de email válido */}
              <input
                type="email"
                className={`form-control border-start-0 bg-light ${errors.email ? 'is-invalid' : ''}`}
                placeholder="ejemplo@sena.edu.co"
                disabled={loading}
                autoComplete="email"
                {...register('email', {
                  required: 'El correo electrónico es obligatorio',
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: 'El formato del correo no es válido'
                  }
                })}
              />
              {/* Mensaje de error debajo del campo (solo si hay error) */}
              {errors.email && (
                <div className="invalid-feedback">{errors.email.message}</div>
              )}
            </div>
          </div>

          {/* ── CAMPO: CONTRASEÑA ── */}
          <div className="mb-4">
            <label className="form-label fw-bold small text-muted">CONTRASEÑA</label>
            <div className="input-group has-validation">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <Icons.Lock />
              </span>
              {/* register() con reglas:
                  - required: campo obligatorio
                  - minLength: mínimo 4 caracteres */}
              <input
                type={mostrarPassword ? 'text' : 'password'}
                className={`form-control border-start-0 border-end-0 bg-light ${errors.password ? 'is-invalid' : ''}`}
                placeholder="••••••"
                disabled={loading}
                autoComplete="current-password"
                {...register('password', {
                  required: 'La contraseña es obligatoria',
                  minLength: {
                    value: 4,
                    message: 'La contraseña debe tener al menos 4 caracteres'
                  }
                })}
              />
              {/* Botón para mostrar/ocultar la contraseña */}
              <button
                className="btn btn-light border border-start-0 text-muted"
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {mostrarPassword ? <Icons.EyeSlash /> : <Icons.Eye />}
              </button>
              {errors.password && (
                <div className="invalid-feedback">{errors.password.message}</div>
              )}
            </div>
          </div>

          {/* ── BOTÓN DE ENVÍO ── */}
          {/* Cambia de aspecto según el estado:
              - Normal: "INGRESAR AL SISTEMA" (azul)
              - Cargando: spinner + "Validando..."
              - Bloqueado: "CUENTA BLOQUEADA" (rojo, deshabilitado) */}
          <div className="d-grid gap-2">
            <button
              type="submit"
              className={`btn ${bloqueado ? 'btn-danger' : 'btn-primary'} py-2 fw-bold`}
              disabled={loading || bloqueado}
            >
              {bloqueado ? (
                'CUENTA BLOQUEADA'
              ) : loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Validando...
                </>
              ) : (
                'INGRESAR AL SISTEMA'
              )}
            </button>
          </div>
        </form>

        {/* ── PIE DE PÁGINA ── */}
        <div className="text-center mt-4">
          <small className="text-muted">Librería el Saber &copy; 2026</small>
        </div>
      </div>
    </div>
  );
};

export default Acceso;