// =====================================================
// COMPONENTE: PROTECCIÓN DE RUTAS POR ROL (RBAC)
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Es un "guardián" que protege las páginas del sistema.
//   Antes de mostrar una página, verifica si el usuario
//   tiene permiso para verla según su rol (Admin o Vendedor).
//
// ¿Cómo se conecta con el sistema?
//   Se usa en App.jsx para envolver cada ruta protegida:
//     <RutaProtegidaPorRol permiso="verDashboard">
//       <Inicio />   ← Solo se muestra si tiene permiso
//     </RutaProtegidaPorRol>
//
// ¿Qué es RBAC?
//   Role-Based Access Control = Control de Acceso Basado en Roles.
//   En vez de verificar usuario por usuario, verificamos por ROL:
//     - Admin (rol_id=1): puede ver TODO
//     - Vendedor (rol_id=2): solo ve Ventas, Inventario, Clientes
//
// Flujo del componente:
//   1. ¿Está cargando la sesión? → Muestra spinner
//   2. ¿No hay usuario logueado? → Redirige a /acceso (login)
//   3. ¿No tiene el permiso? → Muestra alerta y redirige
//   4. ¿Tiene el permiso? → Muestra la página (children)
//
// =====================================================

import React from 'react';
// Navigate: componente de React Router que redirige a otra página
import { Navigate } from 'react-router-dom';
// useAuth: nuestro hook personalizado que da acceso al usuario logueado
import { useAuth } from '../context/AuthContext';

// ─────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────
// Props que recibe:
//   - permiso: nombre del permiso requerido (ej: 'verDashboard', 'crearLibro')
//   - children: el componente hijo que se va a mostrar si tiene permiso
//   - redirigirA: a dónde mandarlo si NO tiene permiso (por defecto '/ventas')
const RutaProtegidaPorRol = ({ permiso, children, redirigirA = '/ventas' }) => {

  // Extraemos del contexto de autenticación:
  //   - usuario: datos del usuario logueado (o null si no hay sesión)
  //   - tienePermiso: función que verifica si el rol tiene acceso
  //   - cargando: booleano que indica si aún se está verificando el token
  const { usuario, tienePermiso, cargando } = useAuth();

  // ── CASO 1: Aún cargando la sesión ──
  // Mientras el sistema verifica el token JWT guardado en localStorage,
  // mostramos un spinner para que el usuario sepa que está procesando.
  // Sin esto, habría un "flash" de la página de login antes de redirigir.
  if (cargando) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // ── CASO 2: No hay usuario logueado ──
  // Si no hay sesión activa, redirigimos a la página de login.
  // "replace" reemplaza la entrada en el historial del navegador
  // para que el botón "atrás" no vuelva a esta página protegida.
  if (!usuario) {
    return <Navigate to="/acceso" replace />;
  }

  // ── CASO 3: El usuario no tiene el permiso requerido ──
  // Si el usuario está logueado pero su rol no incluye este permiso,
  // mostramos una alerta y lo redirigimos a una página que sí puede ver.
  // Ejemplo: un Vendedor intenta acceder al Dashboard (solo Admin).
  if (!tienePermiso(permiso)) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning" role="alert">
          <h4 className="alert-heading">Acceso Denegado</h4>
          <p>No tiene permisos suficientes para acceder a esta página.</p>
          <hr />
          <p className="mb-0">
            Será redirigido automáticamente...
          </p>
        </div>
        <Navigate to={redirigirA} replace />
      </div>
    );
  }

  // ── CASO 4: Todo bien, tiene permiso ──
  // Renderizamos el componente hijo (la página protegida).
  // "children" es lo que está DENTRO de <RutaProtegidaPorRol>...</RutaProtegidaPorRol>
  return children;
};

export default RutaProtegidaPorRol;