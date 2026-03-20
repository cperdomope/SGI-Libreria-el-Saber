/**
 * =====================================================
 * COMPONENTE DE PROTECCIÓN POR ROL (RBAC)
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Protege rutas verificando si el usuario
 * tiene el permiso requerido según su rol.
 *
 * FLUJO:
 * 1. Verifica si hay sesión activa
 * 2. Consulta la matriz PERMISOS del AuthContext
 * 3. Si tiene permiso, renderiza el children
 * 4. Si no, redirige a la ruta especificada
 *
 * @author Equipo de Desarrollo SGI
 * @version 2.0.0
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Componente para proteger rutas según permisos del usuario
 * 
 * @param {Object} props
 * @param {string} props.permiso - Nombre del permiso requerido (ej: 'verDashboard', 'crearLibro')
 * @param {React.ReactNode} props.children - Componente hijo a renderizar si tiene permiso
 * @param {string} props.redirigirA - Ruta a la que redirigir si no tiene permiso (default: '/ventas')
 * 
 * @example
 * <RutaProtegidaPorRol permiso="verDashboard">
 *   <Dashboard />
 * </RutaProtegidaPorRol>
 */
const RutaProtegidaPorRol = ({ permiso, children, redirigirA = '/ventas' }) => {
  const { usuario, tienePermiso, cargando } = useAuth();

  // Mostrar loader mientras se verifica la sesión
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

  // Si no hay usuario, redirigir a login
  if (!usuario) {
    return <Navigate to="/acceso" replace />;
  }

  // Si el usuario no tiene el permiso requerido, redirigir
  if (!tienePermiso(permiso)) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning" role="alert">
          <h4 className="alert-heading">⚠️ Acceso Denegado</h4>
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

  // El usuario tiene el permiso, mostrar el contenido
  return children;
};

export default RutaProtegidaPorRol;
