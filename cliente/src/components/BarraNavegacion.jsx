// =====================================================
// COMPONENTE: BARRA DE NAVEGACIÓN PRINCIPAL
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Es el menú principal del sistema que aparece en la parte
//   superior de TODAS las páginas. Permite al usuario navegar
//   entre los diferentes módulos (Ventas, Inventario, etc.)
//
// ¿Cómo se conecta con el sistema?
//   Se renderiza en App.jsx cuando hay un usuario logueado.
//   Usa el AuthContext para saber:
//     - Quién es el usuario (nombre, rol)
//     - Qué permisos tiene (para mostrar/ocultar opciones)
//     - La función logout (para cerrar sesión)
//
// ¿Cómo funciona el menú por roles?
//   Cada opción del menú está envuelta en un {tienePermiso('...') && (...)}
//   Esto significa: "solo muestra esta opción si el usuario tiene ese permiso".
//   Ejemplo: tienePermiso('verDashboard') → solo Admin lo ve.
//
// Áreas del menú:
//   - Dashboard: Solo Admin → vista panorámica del negocio
//   - Gestión Comercial: Ventas, Historial, Clientes
//   - Logística: Inventario, Movimientos, Autores, Categorías, Proveedores
//   - Usuario: Cambiar contraseña, Gestión usuarios (Admin), Cerrar sesión
//
// =====================================================

import React, { useState } from 'react';
// Link: para navegar entre páginas sin recargar (SPA)
// useNavigate: para redirigir programáticamente
// useLocation: para saber en qué página estamos (ruta activa)
import { Link, useNavigate, useLocation } from 'react-router-dom';
// useAuth: nuestro contexto global de autenticación
import { useAuth } from '../context/AuthContext';
// Modal para que el usuario pueda cambiar su contraseña
import ModalCambiarPassword from './ModalCambiarPassword';

// ─────────────────────────────────────────────────────
// ICONOS SVG
// ─────────────────────────────────────────────────────
// Importamos los iconos como archivos SVG desde la carpeta assets.
// Cada icono se usa en las opciones del menú para que sea más visual.

import iconoLibro from '../assets/icons/icono-libro.svg';
import iconoInventario from '../assets/icons/icono-inventario.svg';
import iconoClientes from '../assets/icons/icono-clientes.svg';
import iconoProveedores from '../assets/icons/icono-proveedores.svg';
import iconoMovimientos from '../assets/icons/icono-movimientos.svg';
import iconoVentas from '../assets/icons/icono-ventas.svg';
import iconoHistorial from '../assets/icons/icono-historial.svg';
import iconoAutores from '../assets/icons/icono-autores.svg';
import iconoCategorias from '../assets/icons/icono-categorias.svg';
import iconoSalir from '../assets/icons/icono-salir.svg';

// ─────────────────────────────────────────────────────
// COMPONENTES DE ICONOS
// ─────────────────────────────────────────────────────
// Cada icono es un mini-componente que renderiza una imagen SVG.
// Reciben un prop "size" para controlar el tamaño.
// Esto permite escribir <IconoVentas /> en vez de repetir
// toda la etiqueta <img src=... /> cada vez.

const IconoLibro = ({ size = 22 }) => (
  <img
    src={iconoLibro}
    alt=""
    width={size}
    height={size}
    style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(89%) saturate(1046%) hue-rotate(178deg) brightness(93%) contrast(91%)' }}
  />
);

const IconoInventario = ({ size = 18 }) => (
  <img src={iconoInventario} alt="" width={size} height={size} className="icon-current-color" />
);

const IconoClientes = ({ size = 18 }) => (
  <img src={iconoClientes} alt="" width={size} height={size} className="icon-current-color" />
);

const IconoProveedores = ({ size = 18 }) => (
  <img src={iconoProveedores} alt="" width={size} height={size} className="icon-current-color" />
);

const IconoMovimientos = ({ size = 18 }) => (
  <img src={iconoMovimientos} alt="" width={size} height={size} className="icon-current-color" />
);

const IconoVentas = ({ size = 18 }) => (
  <img src={iconoVentas} alt="" width={size} height={size} className="icon-current-color" />
);

const IconoHistorial = ({ size = 18 }) => (
  <img src={iconoHistorial} alt="" width={size} height={size} className="icon-current-color" />
);

const IconoAutores = ({ size = 18 }) => (
  <img src={iconoAutores} alt="" width={size} height={size} className="icon-current-color" />
);

const IconoCategorias = ({ size = 18 }) => (
  <img src={iconoCategorias} alt="" width={size} height={size} className="icon-current-color" />
);

const IconoSalir = ({ size = 18 }) => (
  <img src={iconoSalir} alt="" width={size} height={size} style={{ filter: 'brightness(0) invert(1)' }} />
);

// =====================================================
// COMPONENTE PRINCIPAL: BarraNavegacion
// =====================================================
const BarraNavegacion = () => {

  // ── Extraemos del contexto de autenticación ──
  // usuario: datos del usuario logueado (nombre, rol, etc.)
  // logout: función para cerrar sesión
  // tienePermiso: función que verifica si el rol puede hacer algo
  // nombreRol: función que devuelve "Administrador" o "Vendedor"
  const { usuario, logout, tienePermiso, nombreRol, ROLES } = useAuth();

  // Hooks de React Router para navegación
  const navigate = useNavigate();    // Para redirigir programáticamente
  const location = useLocation();    // Para saber la ruta actual (ej: '/ventas')

  // Estado: controla si el modal de cambiar contraseña está abierto o cerrado
  const [mostrarCambioPassword, setMostrarCambioPassword] = useState(false);

  // ─────────────────────────────────────────────────
  // FUNCIONES AUXILIARES
  // ─────────────────────────────────────────────────

  // Cierra sesión con confirmación para evitar cierres accidentales
  const manejarSalida = () => {
    if (window.confirm('¿Desea cerrar sesión?')) {
      logout();  // Limpia el token JWT y redirige a login
    }
  };

  // Obtiene el nombre del usuario para mostrarlo en el menú
  // Si no tiene nombre, muestra "Usuario" como fallback
  const obtenerNombreUsuario = () => {
    return usuario?.nombre_completo || 'Usuario';
  };

  // ─────────────────────────────────────────────────
  // FUNCIONES DE ESTILOS DINÁMICOS
  // ─────────────────────────────────────────────────
  // Estas funciones determinan qué clases CSS aplicar
  // para resaltar la opción del menú que está activa.

  // Compara si la ruta dada es la página actual
  const esRutaActiva = (ruta) => location.pathname === ruta;

  // Para los dropdowns: verifica si ALGUNA de sus rutas hijas está activa
  // Ej: si estoy en /ventas, el dropdown "Gestión Comercial" se resalta
  const dropdownActivo = (rutas) => rutas.includes(location.pathname);

  // Genera las clases CSS para un link normal del menú
  // Si la ruta está activa → fondo blanco semitransparente + negrita
  // Si no → texto blanco con opacidad reducida
  const claseLink = (ruta) => {
    const base = 'nav-link d-flex align-items-center gap-2 px-3 mx-1';
    return esRutaActiva(ruta)
      ? `${base} text-white bg-white bg-opacity-25 rounded-pill fw-bold shadow-sm`
      : `${base} text-white text-opacity-75`;
  };

  // Igual que claseLink pero para los botones de dropdown
  const claseDropdown = (rutas) => {
    const base = 'nav-link dropdown-toggle d-flex align-items-center gap-2 px-3 mx-1';
    return dropdownActivo(rutas)
      ? `${base} text-white bg-white bg-opacity-25 rounded-pill fw-bold shadow-sm`
      : `${base} text-white text-opacity-75`;
  };

  // ─────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────

  return (
    <>
    <nav className="navbar navbar-expand-lg navbar-dark shadow">
      <div className="container-fluid px-4">

        {/* ─────────────────────────────────────────────────
            LOGO Y MARCA
            ───────────────────────────────────────────────── */}
        <Link
          className="navbar-brand d-flex align-items-center gap-2 fw-bold"
          to="/"
          style={{ fontSize: '1.1rem', minWidth: 0 }}
        >
          <div
            className="bg-white text-primary rounded-circle p-1 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 35, height: 35 }}
          >
            <IconoLibro />
          </div>
          <span className="text-truncate d-none d-sm-inline">SGI Librería el Saber</span>
          <span className="d-sm-none">SGI</span>
        </Link>

        {/* ─────────────────────────────────────────────────
            BOTÓN HAMBURGUESA (MÓVIL)
            ───────────────────────────────────────────────── */}
        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#menuNavegacion"
          aria-controls="menuNavegacion"
          aria-expanded="false"
          aria-label="Alternar navegación"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* ─────────────────────────────────────────────────
            MENÚ COLAPSABLE
            ───────────────────────────────────────────────── */}
        <div className="collapse navbar-collapse py-2 py-lg-0" id="menuNavegacion">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4">

            {/* DASHBOARD - Solo visible para Administradores */}
            {tienePermiso('verDashboard') && (
              <li className="nav-item">
                <Link className={claseLink('/')} to="/">
                  Dashboard
                </Link>
              </li>
            )}

            {/* ─────────────────────────────────────────────────
                DROPDOWN: GESTIÓN COMERCIAL
                Ventas, Historial, Clientes
                ───────────────────────────────────────────────── */}
            {(tienePermiso('registrarVenta') || tienePermiso('verClientes')) && (
              <li className="nav-item dropdown">
                <a
                  className={claseDropdown(['/ventas', '/historial-ventas', '/clientes'])}
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Gestión Comercial
                </a>
                <ul className="dropdown-menu shadow-sm border-0">
                  {tienePermiso('registrarVenta') && (
                    <li>
                      <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/ventas">
                        <IconoVentas /> POS / Ventas
                      </Link>
                    </li>
                  )}
                  {tienePermiso('verVentas') && (
                    <li>
                      <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/historial-ventas">
                        <IconoHistorial /> Historial
                      </Link>
                    </li>
                  )}
                  {(tienePermiso('registrarVenta') && tienePermiso('verClientes')) && (
                    <li><hr className="dropdown-divider" /></li>
                  )}
                  {tienePermiso('verClientes') && (
                    <li>
                      <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/clientes">
                        <IconoClientes /> Clientes
                      </Link>
                    </li>
                  )}
                </ul>
              </li>
            )}

            {/* ─────────────────────────────────────────────────
                DROPDOWN: LOGÍSTICA
                Inventario, Movimientos, Autores, Categorías, Proveedores
                ───────────────────────────────────────────────── */}
            {(tienePermiso('verInventario') || tienePermiso('verProveedores') || tienePermiso('registrarMovimiento')) && (
              <li className="nav-item dropdown">
                <a
                  className={claseDropdown(['/inventario', '/movimientos', '/proveedores', '/autores', '/categorias'])}
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Logística
                </a>
                <ul className="dropdown-menu shadow-sm border-0">
                  {tienePermiso('verInventario') && (
                    <li>
                      <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/inventario">
                        <IconoInventario /> Inventario
                      </Link>
                    </li>
                  )}
                  {tienePermiso('registrarMovimiento') && (
                    <li>
                      <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/movimientos">
                        <IconoMovimientos /> Movimientos
                      </Link>
                    </li>
                  )}
                  {(tienePermiso('verInventario') && (tienePermiso('verAutores') || tienePermiso('verCategorias'))) && (
                    <li><hr className="dropdown-divider" /></li>
                  )}
                  {tienePermiso('verAutores') && (
                    <li>
                      <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/autores">
                        <IconoAutores /> Autores
                      </Link>
                    </li>
                  )}
                  {tienePermiso('verCategorias') && (
                    <li>
                      <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/categorias">
                        <IconoCategorias /> Categorías
                      </Link>
                    </li>
                  )}
                  {tienePermiso('verProveedores') && (
                    <>
                      <li><hr className="dropdown-divider" /></li>
                      <li>
                        <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/proveedores">
                          <IconoProveedores /> Proveedores
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              </li>
            )}
            {/* ─────────────────────────────────────────────────
                DROPDOWN: DOCUMENTACIÓN
                Historias, Criterios, Manual Técnico, Manual de Usuario
                ───────────────────────────────────────────────── */}
            <li className="nav-item dropdown">
              <a
                className={claseDropdown(['/documentacion/historias', '/documentacion/criterios', '/documentacion/manual-tecnico', '/documentacion/manual-usuario'])}
                href="#"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                Documentación
              </a>
              <ul className="dropdown-menu shadow-sm border-0">
                <li>
                  <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/documentacion/historias">
                    Historias de Usuario
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/documentacion/criterios">
                    Criterios de Aceptación
                  </Link>
                </li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/documentacion/manual-tecnico">
                    Manual Técnico
                  </Link>
                </li>
                <li>
                  <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/documentacion/manual-usuario">
                    Manual de Usuario
                  </Link>
                </li>
              </ul>
            </li>
          </ul>

          {/* ─────────────────────────────────────────────────
              SECCIÓN DE USUARIO
              Nombre, rol y botón de logout
              ───────────────────────────────────────────────── */}
          {/* ── MENÚ DE USUARIO (dropdown) ── */}
          <div className="d-flex align-items-center text-white border-start border-white border-opacity-25 ps-lg-4 ms-lg-2 mt-3 mt-lg-0">
            <div className="dropdown">
              <button
                className="btn d-flex align-items-center gap-2 text-white bg-transparent border-0 p-0"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <div className="lh-1 text-end d-none d-lg-block me-2">
                  <div className="fw-bold">{obtenerNombreUsuario()}</div>
                  <div className="small text-white-50">{nombreRol()}</div>
                </div>
                {/* Avatar circular con inicial */}
                <div
                  className="rounded-circle bg-white bg-opacity-25 d-flex align-items-center justify-content-center fw-bold"
                  style={{ width: 38, height: 38, fontSize: 16 }}
                >
                  {(obtenerNombreUsuario() || 'U')[0].toUpperCase()}
                </div>
              </button>

              <ul className="dropdown-menu dropdown-menu-end shadow">
                {/* Enlace a Gestión de Usuarios (solo Admin) */}
                {tienePermiso('gestionarUsuarios') && (
                  <li>
                    <Link className="dropdown-item" to="/admin/usuarios">
                      Gestión de Usuarios
                    </Link>
                  </li>
                )}
                {tienePermiso('gestionarUsuarios') && <li><hr className="dropdown-divider" /></li>}

                {/* Cambiar contraseña (todos los usuarios) */}
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setMostrarCambioPassword(true)}
                  >
                    Cambiar Contraseña
                  </button>
                </li>

                <li><hr className="dropdown-divider" /></li>

                {/* Cerrar sesión */}
                <li>
                  <button className="dropdown-item text-danger" onClick={manejarSalida}>
                    Cerrar Sesión
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>

    {/* Modal de Cambio de Contraseña */}
    <ModalCambiarPassword
      visible={mostrarCambioPassword}
      onCerrar={() => setMostrarCambioPassword(false)}
    />
  </>
  );
};

export default BarraNavegacion;
