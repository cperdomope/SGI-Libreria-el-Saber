// =====================================================
// COMPONENTE: RutaProtegida
// =====================================================
// Verifica si hay un usuario con sesion activa.
// Si no hay sesion, redirige a /acceso (login).
// Si esta cargando (verificando token), muestra un spinner.
//
// Se usa asi: <RutaProtegida><MiPagina /></RutaProtegida>
//
// Diferencia con RutaProtegidaPorRol:
//   - RutaProtegida    -> solo verifica si HAY sesion
//   - RutaProtegidaPorRol -> verifica si tiene el PERMISO especifico
//
// Ambos se usan juntos en App.jsx:
//   <RutaProtegida>           -> hay sesion?
//     <RutaProtegidaPorRol>   -> tiene permiso?
//       <Pagina />
//     </RutaProtegidaPorRol>
//   </RutaProtegida>
// =====================================================

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RutaProtegida = ({ children }) => {
  const { usuario, cargando } = useAuth();

  // Mientras verifica si hay sesion, mostramos un spinner
  // Esto evita un "flash" de la pagina de login
  if (cargando) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!usuario) {
    return <Navigate to="/acceso" replace />;
  }

  // Si hay sesion, renderizar la pagina solicitada
  return children;
};

export default RutaProtegida;
