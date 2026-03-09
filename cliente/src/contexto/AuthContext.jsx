/**
 * =====================================================
 * CONTEXTO DE AUTENTICACIÓN - FRONTEND
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Maneja el estado global de autenticación usando React Context.
 * Proporciona funciones de login/logout y utilidades de autorización RBAC.
 *
 * ARQUITECTURA:
 * - AuthContext: Contexto React para compartir estado
 * - AuthProvider: Componente que envuelve la app y provee el estado
 * - useAuth: Hook personalizado para acceder al contexto
 *
 * PERSISTENCIA:
 * - localStorage.usuario_sgi: Datos del usuario (JSON)
 * - localStorage.token_sgi: JWT para peticiones al backend
 *
 * @requires react - createContext, useState, useEffect, useContext
 *
 * @example
 * // En el componente raíz (App.jsx):
 * import { AuthProvider } from './contexto/AuthContext';
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 *
 * @example
 * // En cualquier componente hijo:
 * import { useAuth } from '../contexto/AuthContext';
 * const { usuario, login, logout, tienePermiso } = useAuth();
 *
 * @author Equipo de Desarrollo SGI
 * @version 2.0.0
 */

import React, { createContext, useState, useEffect, useContext } from 'react';

// =====================================================
// CONTEXTO DE AUTENTICACIÓN
// =====================================================

/**
 * Contexto React para el estado de autenticación.
 * No exportamos el contexto directamente para forzar
 * el uso del hook useAuth() que es más seguro.
 *
 * @type {React.Context}
 */
const AuthContext = createContext();

// =====================================================
// CONSTANTES DE ROLES (RBAC)
// =====================================================

/**
 * Identificadores numéricos de roles del sistema.
 * Deben coincidir con los IDs de la tabla mdc_roles en la BD.
 *
 * @constant {Object}
 * @property {number} ADMINISTRADOR - ID 1: Acceso total al sistema
 * @property {number} VENDEDOR - ID 2: Acceso limitado a ventas
 */
export const ROLES = {
  ADMINISTRADOR: 1,
  VENDEDOR: 2
};

// =====================================================
// MATRIZ DE PERMISOS POR ROL
// =====================================================

/**
 * Define qué puede hacer cada rol en el sistema.
 * Esta matriz se consulta en el frontend para:
 * - Mostrar/ocultar elementos de UI
 * - Habilitar/deshabilitar botones
 * - Proteger rutas
 *
 * IMPORTANTE: Esta validación es solo para UX.
 * La seguridad real está en el backend (middlewares).
 *
 * @constant {Object}
 */
export const PERMISOS = {
  // ─────────────────────────────────────────────────
  // ADMINISTRADOR: Acceso completo a todo el sistema
  // ─────────────────────────────────────────────────
  [ROLES.ADMINISTRADOR]: {
    // Dashboard - Estadísticas y métricas
    verDashboard: true,

    // Inventario (Libros) - CRUD completo
    verInventario: true,
    crearLibro: true,
    editarLibro: true,
    eliminarLibro: true,

    // Autores - CRUD completo
    verAutores: true,
    crearAutor: true,
    editarAutor: true,
    eliminarAutor: true,

    // Categorías - CRUD completo
    verCategorias: true,
    crearCategoria: true,
    editarCategoria: true,
    eliminarCategoria: true,

    // Clientes - CRUD completo
    verClientes: true,
    crearCliente: true,
    editarCliente: true,
    eliminarCliente: true,

    // Proveedores - CRUD completo
    verProveedores: true,
    crearProveedor: true,
    editarProveedor: true,
    eliminarProveedor: true,

    // Ventas - Registrar y consultar
    registrarVenta: true,
    verVentas: true,

    // Movimientos - Kardex de inventario
    registrarMovimiento: true,

    // Administración de usuarios - Solo Administrador
    gestionarUsuarios: true
  },

  // ─────────────────────────────────────────────────
  // VENDEDOR: Acceso limitado para operaciones de venta
  // ─────────────────────────────────────────────────
  [ROLES.VENDEDOR]: {
    // Dashboard - Sin acceso (datos sensibles)
    verDashboard: false,

    // Inventario - Solo consulta para verificar disponibilidad
    verInventario: true,
    crearLibro: false,
    editarLibro: false,
    eliminarLibro: false,

    // Autores - Solo consulta para mostrar en ventas
    verAutores: true,
    crearAutor: false,
    editarAutor: false,
    eliminarAutor: false,

    // Categorías - Solo consulta para filtros
    verCategorias: true,
    crearCategoria: false,
    editarCategoria: false,
    eliminarCategoria: false,

    // Clientes - Crear y listar (necesario para registrar ventas)
    verClientes: true,
    crearCliente: true,  // Puede crear cliente nuevo durante venta
    editarCliente: false,
    eliminarCliente: false,

    // Proveedores - Sin acceso (información administrativa)
    verProveedores: false,
    crearProveedor: false,
    editarProveedor: false,
    eliminarProveedor: false,

    // Ventas - Función principal del vendedor
    registrarVenta: true,
    verVentas: true,

    // Movimientos - Sin acceso (modifica inventario directamente)
    registrarMovimiento: false,

    // Administración de usuarios - Sin acceso
    gestionarUsuarios: false
  }
};

// =====================================================
// CLAVES DE LOCALSTORAGE
// =====================================================

/**
 * Claves usadas para persistir la sesión en localStorage.
 * Centralizadas para evitar errores de tipeo.
 *
 * @constant {Object}
 */
const STORAGE_KEYS = {
  USUARIO: 'usuario_sgi',
  TOKEN: 'token_sgi'
};

// =====================================================
// PROVEEDOR DE AUTENTICACIÓN
// =====================================================

/**
 * Componente proveedor que envuelve la aplicación.
 * Maneja el estado de autenticación y lo comparte vía Context.
 *
 * CICLO DE VIDA:
 * 1. Al montar: Intenta recuperar sesión de localStorage
 * 2. Si hay sesión válida: Establece usuario en estado
 * 3. Si hay error: Limpia datos corruptos
 * 4. Cuando termina: Marca cargando=false y renderiza hijos
 *
 * @param {Object} props - Props del componente
 * @param {React.ReactNode} props.children - Componentes hijos a envolver
 * @returns {JSX.Element} Proveedor del contexto con los hijos
 *
 * @example
 * // En main.jsx o App.jsx:
 * <AuthProvider>
 *   <RouterProvider router={router} />
 * </AuthProvider>
 */
export const AuthProvider = ({ children }) => {
  // ─────────────────────────────────────────────────
  // ESTADO LOCAL
  // ─────────────────────────────────────────────────

  /**
   * Datos del usuario autenticado (null si no hay sesión).
   * Estructura esperada: { id, nombre_completo, email, rol_id }
   */
  const [usuario, setUsuario] = useState(null);

  /**
   * Indica si se está verificando la sesión al iniciar.
   * Mientras sea true, no se renderizan los hijos.
   * Esto evita flash de contenido no autorizado.
   */
  const [cargando, setCargando] = useState(true);

  // ─────────────────────────────────────────────────
  // RECUPERACIÓN DE SESIÓN AL MONTAR
  // ─────────────────────────────────────────────────

  useEffect(() => {
    /**
     * Intenta restaurar la sesión desde localStorage.
     * Se ejecuta solo una vez al montar el componente.
     */
    const recuperarSesion = () => {
      try {
        const usuarioGuardado = localStorage.getItem(STORAGE_KEYS.USUARIO);
        const tokenGuardado = localStorage.getItem(STORAGE_KEYS.TOKEN);

        // Solo restaurar si AMBOS valores existen
        if (usuarioGuardado && tokenGuardado) {
          const userParseado = JSON.parse(usuarioGuardado);

          // Validar estructura mínima del usuario
          if (userParseado && userParseado.id && userParseado.rol_id) {
            setUsuario(userParseado);
          } else {
            // Datos incompletos, limpiar por seguridad
            limpiarStorage();
          }
        }
      } catch (error) {
        // Error de parsing (datos corruptos o manipulados)
        if (process.env.NODE_ENV === 'development') {
          console.error('[Auth] Error recuperando sesión:', error);
        }
        limpiarStorage();
      } finally {
        // Siempre terminar de cargar, haya sesión o no
        setCargando(false);
      }
    };

    recuperarSesion();
  }, []);

  // ─────────────────────────────────────────────────
  // FUNCIONES DE SESIÓN
  // ─────────────────────────────────────────────────

  /**
   * Elimina todos los datos de sesión de localStorage.
   * Usado cuando hay datos corruptos o al hacer logout.
   */
  const limpiarStorage = () => {
    localStorage.removeItem(STORAGE_KEYS.USUARIO);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  };

  /**
   * Inicia sesión guardando los datos del usuario y token.
   * Se llama después de una autenticación exitosa con el backend.
   *
   * @param {Object} datosUsuario - Datos del usuario autenticado
   * @param {number} datosUsuario.id - ID único del usuario
   * @param {string} datosUsuario.nombre_completo - Nombre para mostrar
   * @param {string} datosUsuario.email - Email del usuario
   * @param {number} datosUsuario.rol_id - ID del rol (1=Admin, 2=Vendedor)
   * @param {string} token - JWT recibido del backend
   * @returns {void}
   */
  const login = (datosUsuario, token) => {
    // Validar que los datos sean válidos antes de guardar
    if (!datosUsuario || !token) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Auth] Intento de login con datos vacíos');
      }
      return;
    }

    // Actualizar estado y persistir en localStorage
    setUsuario(datosUsuario);
    localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(datosUsuario));
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  };

  /**
   * Cierra la sesión del usuario.
   * Limpia el estado, localStorage y redirige a login.
   *
   * NOTA: Usamos window.location.href en lugar de navigate()
   * para forzar un reload completo y limpiar toda la memoria
   * de React (evita estados residuales).
   *
   * @returns {void}
   */
  const logout = () => {
    setUsuario(null);
    limpiarStorage();
    window.location.href = '/acceso';
  };

  // ─────────────────────────────────────────────────
  // UTILIDADES DE AUTORIZACIÓN (RBAC)
  // ─────────────────────────────────────────────────

  /**
   * Verifica si el usuario tiene un rol específico.
   *
   * @param {number} rolRequerido - ID del rol a verificar (usar ROLES.*)
   * @returns {boolean} True si el usuario tiene ese rol
   *
   * @example
   * if (tieneRol(ROLES.ADMINISTRADOR)) {
   *   // Mostrar opciones de admin
   * }
   */
  const tieneRol = (rolRequerido) => {
    if (!usuario || !usuario.rol_id) return false;
    return usuario.rol_id === rolRequerido;
  };

  /**
   * Verifica si el usuario actual es Administrador.
   * Shorthand para tieneRol(ROLES.ADMINISTRADOR).
   *
   * @returns {boolean} True si es administrador
   *
   * @example
   * {esAdministrador() && <BotonEliminar />}
   */
  const esAdministrador = () => {
    return tieneRol(ROLES.ADMINISTRADOR);
  };

  /**
   * Verifica si el usuario actual es Vendedor.
   * Shorthand para tieneRol(ROLES.VENDEDOR).
   *
   * @returns {boolean} True si es vendedor
   */
  const esVendedor = () => {
    return tieneRol(ROLES.VENDEDOR);
  };

  /**
   * Verifica si el usuario tiene un permiso específico.
   * Consulta la matriz PERMISOS según el rol del usuario.
   *
   * @param {string} permiso - Nombre del permiso (ej: 'crearLibro')
   * @returns {boolean} True si tiene el permiso
   *
   * @example
   * // Habilitar botón solo si tiene permiso
   * <Button disabled={!tienePermiso('eliminarLibro')}>
   *   Eliminar
   * </Button>
   */
  const tienePermiso = (permiso) => {
    if (!usuario || !usuario.rol_id) return false;
    const permisosDelRol = PERMISOS[usuario.rol_id];
    return permisosDelRol && permisosDelRol[permiso] === true;
  };

  /**
   * Obtiene el nombre legible del rol actual.
   * Útil para mostrar en la UI (navbar, perfil, etc.).
   *
   * @returns {string} Nombre del rol o 'Invitado' si no hay sesión
   *
   * @example
   * <span>Rol: {nombreRol()}</span>
   * // Muestra: "Rol: Administrador" o "Rol: Vendedor"
   */
  const nombreRol = () => {
    if (!usuario || !usuario.rol_id) return 'Invitado';
    return usuario.rol_id === ROLES.ADMINISTRADOR ? 'Administrador' : 'Vendedor';
  };

  // ─────────────────────────────────────────────────
  // VALOR DEL CONTEXTO
  // ─────────────────────────────────────────────────

  /**
   * Objeto con todos los valores y funciones expuestos.
   * Se pasa al Provider para que los hijos accedan vía useAuth().
   */
  const value = {
    // Estado
    usuario,
    cargando,

    // Funciones de sesión
    login,
    logout,

    // Utilidades de autorización
    tieneRol,
    esAdministrador,
    esVendedor,
    tienePermiso,
    nombreRol,

    // Constantes (para uso en componentes)
    ROLES
  };

  // ─────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────

  return (
    <AuthContext.Provider value={value}>
      {/* Solo renderizar hijos cuando termine de cargar.
          Esto evita flash de contenido no autorizado. */}
      {!cargando && children}
    </AuthContext.Provider>
  );
};

// =====================================================
// HOOK PERSONALIZADO
// =====================================================

/**
 * Hook para acceder al contexto de autenticación.
 * Debe usarse dentro de un componente envuelto por AuthProvider.
 *
 * @returns {Object} Objeto con estado y funciones de autenticación
 * @property {Object|null} usuario - Datos del usuario o null
 * @property {boolean} cargando - True mientras verifica sesión
 * @property {Function} login - Función para iniciar sesión
 * @property {Function} logout - Función para cerrar sesión
 * @property {Function} tieneRol - Verifica rol específico
 * @property {Function} esAdministrador - Verifica si es admin
 * @property {Function} esVendedor - Verifica si es vendedor
 * @property {Function} tienePermiso - Verifica permiso específico
 * @property {Function} nombreRol - Obtiene nombre del rol
 * @property {Object} ROLES - Constantes de roles
 *
 * @throws {Error} Si se usa fuera de AuthProvider (en desarrollo)
 *
 * @example
 * function MiComponente() {
 *   const { usuario, logout, tienePermiso } = useAuth();
 *
 *   if (!usuario) return <Redirect to="/acceso" />;
 *
 *   return (
 *     <div>
 *       <h1>Hola, {usuario.nombre_completo}</h1>
 *       {tienePermiso('verDashboard') && <LinkDashboard />}
 *       <button onClick={logout}>Cerrar Sesión</button>
 *     </div>
 *   );
 * }
 */
export const useAuth = () => {
  const context = useContext(AuthContext);

  // Validación de uso correcto (solo en desarrollo)
  if (process.env.NODE_ENV === 'development' && context === undefined) {
    console.error('[Auth] useAuth debe usarse dentro de AuthProvider');
  }

  return context;
};
