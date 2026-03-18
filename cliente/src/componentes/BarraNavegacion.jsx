/**
 * =====================================================
 * BARRA DE NAVEGACIÓN PRINCIPAL
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Componente de navegación responsivo con control RBAC.
 * Muestra/oculta opciones de menú según los permisos del usuario.
 *
 * CARACTERÍSTICAS:
 * - Menú responsivo (Bootstrap 5)
 * - Dropdowns organizados por área funcional
 * - Indicador visual de ruta activa
 * - Información del usuario y rol
 * - Botón de logout con confirmación
 *
 * ÁREAS DE MENÚ:
 * - Dashboard: Solo Administradores
 * - Gestión Comercial: Ventas, Historial, Clientes
 * - Logística: Inventario, Movimientos, Autores, Categorías, Proveedores
 *
 * @author Equipo de Desarrollo SGI
 * @version 2.0.0
 */

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexto/AuthContext';
import ModalCambiarPassword from './ModalCambiarPassword';

// =====================================================
// ICONOS SVG (Bootstrap Icons - MIT License)
// =====================================================

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

// =====================================================
// COMPONENTES DE ICONOS
// =====================================================

/**
 * Componentes wrapper para iconos SVG con tamaño configurable.
 * Facilitan el uso consistente de iconos en el menú.
 */

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
// COMPONENTE PRINCIPAL
// =====================================================

/**
 * Barra de navegación principal de la aplicación.
 * Implementa control de acceso basado en roles (RBAC).
 *
 * @returns {JSX.Element} Navbar responsiva con menús dinámicos
 */
const BarraNavegacion = () => {
  const { usuario, logout, tienePermiso, nombreRol, ROLES } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Estado para el modal de cambio de contraseña
  const [mostrarCambioPassword, setMostrarCambioPassword] = useState(false);

  // ─────────────────────────────────────────────────
  // MANEJADORES DE EVENTOS
  // ─────────────────────────────────────────────────

  /**
   * Cierra la sesión del usuario previa confirmación.
   */
  const manejarSalida = () => {
    if (window.confirm('¿Desea cerrar sesión?')) {
      logout();
    }
  };

  /**
   * Obtiene el nombre del usuario según su rol.
   * @returns {string} Nombre del usuario
   */
  const obtenerNombreUsuario = () => {
    return usuario?.nombre_completo || 'Usuario';
  };

  // ─────────────────────────────────────────────────
  // UTILIDADES DE ESTILOS
  // ─────────────────────────────────────────────────

  /**
   * Verifica si una ruta específica es la actual.
   * @param {string} ruta - Ruta a comparar
   * @returns {boolean} True si es la ruta activa
   */
  const esRutaActiva = (ruta) => location.pathname === ruta;

  /**
   * Verifica si alguna ruta del array está activa.
   * Usado para destacar dropdowns cuando un hijo está activo.
   * @param {string[]} rutas - Array de rutas
   * @returns {boolean} True si alguna está activa
   */
  const dropdownActivo = (rutas) => rutas.includes(location.pathname);

  /**
   * Genera clases CSS para links normales.
   * Aplica estilo destacado si la ruta está activa.
   * @param {string} ruta - Ruta del link
   * @returns {string} Clases CSS
   */
  const claseLink = (ruta) => {
    const base = 'nav-link d-flex align-items-center gap-2 px-3 mx-1';
    return esRutaActiva(ruta)
      ? `${base} text-white bg-white bg-opacity-25 rounded-pill fw-bold shadow-sm`
      : `${base} text-white text-opacity-75`;
  };

  /**
   * Genera clases CSS para toggles de dropdown.
   * Aplica estilo destacado si algún hijo está activo.
   * @param {string[]} rutas - Rutas hijas del dropdown
   * @returns {string} Clases CSS
   */
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
