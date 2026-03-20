// =====================================================
// CONTEXTO DE AUTENTICACIÓN (AuthContext)
// =====================================================
// Este archivo implementa el manejo global del estado de
// autenticación usando el patrón React Context.
//
// ¿Qué problema resuelve React Context?
// En una aplicación React, el estado normalmente vive en
// un componente y se pasa hacia abajo por "props".
// El problema: el navbar necesita saber quién está logueado,
// las páginas necesitan saber si tiene permiso, etc.
// Pasar el usuario como prop por 5 niveles de componentes
// se llama "prop drilling" y es difícil de mantener.
//
// Context resuelve esto: crea un "estado global" que
// cualquier componente puede leer directamente sin importar
// qué tan anidado esté.
//
// ARQUITECTURA DE ESTE ARCHIVO:
//   AuthContext  → el "canal" de comunicación React
//   AuthProvider → el componente que provee los datos
//   useAuth      → el hook que los componentes usan para leer los datos
//
// PERSISTENCIA DE SESIÓN:
// Cuando el usuario hace login, guardamos el token y sus datos
// en localStorage (almacenamiento del browser que persiste entre recargas).
// Así, si el usuario recarga la página, la sesión se restaura
// automáticamente sin necesidad de hacer login de nuevo.
//
// RBAC EN EL FRONTEND:
// Además del estado de autenticación, este archivo define la
// matriz de PERMISOS que controla qué botones/secciones ve
// cada rol. Esto es solo para la interfaz (UX); la seguridad
// real está en los middlewares del backend.
//
// 🔹 En la sustentación puedo decir:
// "AuthContext implementa el patrón Provider/Consumer de React.
//  AuthProvider envuelve toda la aplicación y expone el estado
//  de autenticación (usuario, login, logout) y la matriz RBAC
//  (tienePermiso). Cualquier componente accede a esto con el
//  hook useAuth(), sin prop drilling. La sesión persiste en
//  localStorage y se restaura automáticamente al recargar."
// =====================================================

import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';

// ─────────────────────────────────────────────────────────
// EL CONTEXTO
// ─────────────────────────────────────────────────────────
// createContext() crea el "canal" por donde fluirán los datos.
// El valor inicial es undefined; los datos reales los provee AuthProvider.
// No lo exportamos directamente para forzar el uso de useAuth(),
// que incluye validación de uso correcto.
const AuthContext = createContext();

// ─────────────────────────────────────────────────────────
// CONSTANTES DE ROLES
// ─────────────────────────────────────────────────────────
// Los mismos IDs que están en la BD (tabla mdc_roles)
// y en el backend (middlewares/verificarRol.js).
// Exportadas para que los componentes puedan usarlas:
//   import { ROLES } from '../context/AuthContext';
//   if (usuario.rol_id === ROLES.ADMINISTRADOR) { ... }
export const ROLES = {
  ADMINISTRADOR: 1,  // Acceso total al sistema
  VENDEDOR: 2        // Acceso limitado a ventas y consultas
};

// ─────────────────────────────────────────────────────────
// MATRIZ DE PERMISOS POR ROL
// ─────────────────────────────────────────────────────────
// Define exactamente qué puede hacer cada rol en el frontend.
// Los componentes la consultan así:
//   PERMISOS[usuario.rol_id].crearLibro  → true/false
//
// IMPORTANTE: esta validación es solo para la interfaz de usuario
// (mostrar/ocultar botones, habilitar/deshabilitar secciones).
// La seguridad REAL está en los middlewares del backend.
// Un usuario podría manipular estas variables en el browser,
// pero el servidor rechazaría sus peticiones igualmente.
export const PERMISOS = {

  // ─── ADMINISTRADOR: acceso completo ─────────────────
  [ROLES.ADMINISTRADOR]: {
    verDashboard: true,          // Estadísticas y métricas del negocio

    // Inventario — CRUD completo
    verInventario: true,
    crearLibro: true,
    editarLibro: true,
    eliminarLibro: true,

    // Autores — CRUD completo
    verAutores: true,
    crearAutor: true,
    editarAutor: true,
    eliminarAutor: true,

    // Categorías — CRUD completo
    verCategorias: true,
    crearCategoria: true,
    editarCategoria: true,
    eliminarCategoria: true,

    // Clientes — CRUD completo
    verClientes: true,
    crearCliente: true,
    editarCliente: true,
    eliminarCliente: true,

    // Proveedores — CRUD completo
    verProveedores: true,
    crearProveedor: true,
    editarProveedor: true,
    eliminarProveedor: true,

    // Ventas — registrar y consultar historial
    registrarVenta: true,
    verVentas: true,

    // Movimientos — entradas y salidas del kardex
    registrarMovimiento: true,

    // Gestión de usuarios del sistema (solo admin)
    gestionarUsuarios: true
  },

  // ─── VENDEDOR: acceso restringido a lo esencial ─────
  [ROLES.VENDEDOR]: {
    // Sin acceso al dashboard (contiene datos financieros sensibles)
    verDashboard: false,

    // Inventario — solo consulta (necesita ver stock y precios para vender)
    verInventario: true,
    crearLibro: false,
    editarLibro: false,
    eliminarLibro: false,

    // Autores — solo consulta (para mostrar en el catálogo de ventas)
    verAutores: true,
    crearAutor: false,
    editarAutor: false,
    eliminarAutor: false,

    // Categorías — solo consulta (para filtros en ventas)
    verCategorias: true,
    crearCategoria: false,
    editarCategoria: false,
    eliminarCategoria: false,

    // Clientes — puede crear y ver (necesita registrar clientes nuevos al vender)
    verClientes: true,
    crearCliente: true,   // Puede crear cliente en el momento de la venta
    editarCliente: false,
    eliminarCliente: false,

    // Sin acceso a proveedores (información administrativa, no operativa)
    verProveedores: false,
    crearProveedor: false,
    editarProveedor: false,
    eliminarProveedor: false,

    // Ventas — función principal del rol vendedor
    registrarVenta: true,
    verVentas: true,

    // Sin acceso a movimientos (afectan el inventario directamente)
    registrarMovimiento: false,

    // Sin acceso a gestión de usuarios
    gestionarUsuarios: false
  }
};

// ─────────────────────────────────────────────────────────
// CLAVES DE LOCALSTORAGE
// ─────────────────────────────────────────────────────────
// Las mismas claves que usa api.js para el token.
// Centralizadas para que si cambian, solo hay un lugar a modificar.
const STORAGE_KEYS = {
  USUARIO: 'usuario_sgi',
  TOKEN:   'token_sgi'
};

// ─────────────────────────────────────────────────────────
// AUTHPROVIDER — EL COMPONENTE PROVEEDOR
// ─────────────────────────────────────────────────────────
// Este componente envuelve TODA la aplicación en main.jsx.
// Mantiene el estado de autenticación y lo comparte
// a través del contexto a todos los componentes hijos.
export const AuthProvider = ({ children }) => {

  // usuario: datos del usuario logueado (null si no hay sesión).
  // Estructura: { id, nombre_completo, email, rol_id }
  const [usuario, setUsuario] = useState(null);

  // cargando: true mientras se verifica si hay sesión guardada.
  // Mientras sea true, no renderizamos la app para evitar
  // que el usuario vea por un instante la pantalla de login
  // cuando en realidad sí tiene sesión activa.
  const [cargando, setCargando] = useState(true);

  // ─────────────────────────────────────────────────
  // RECUPERAR SESIÓN AL ARRANCAR
  // ─────────────────────────────────────────────────
  // useEffect con array vacío [] = se ejecuta una sola vez
  // cuando el componente se monta (equivalente a componentDidMount).
  // Aquí intentamos restaurar la sesión del localStorage.
  useEffect(() => {
    const recuperarSesion = () => {
      try {
        const usuarioGuardado = localStorage.getItem(STORAGE_KEYS.USUARIO);
        const tokenGuardado   = localStorage.getItem(STORAGE_KEYS.TOKEN);

        // Solo restauramos si AMBOS datos existen (usuario y token).
        // Si solo hay uno, la sesión está incompleta y la limpiamos.
        if (usuarioGuardado && tokenGuardado) {
          const userParseado = JSON.parse(usuarioGuardado);

          // Verificamos que el objeto tenga los campos mínimos necesarios.
          // Previene crashes si alguien manipuló el localStorage manualmente.
          if (userParseado && userParseado.id && userParseado.rol_id) {
            setUsuario(userParseado);  // Sesión restaurada exitosamente
          } else {
            limpiarStorage();  // Datos incompletos o corruptos
          }
        }
      } catch (error) {
        // JSON.parse puede fallar si el localStorage fue alterado manualmente
        if (process.env.NODE_ENV === 'development') {
          console.error('[Auth] Error recuperando sesión:', error);
        }
        limpiarStorage();
      } finally {
        // finally siempre se ejecuta, haya error o no.
        // Marcamos cargando=false para que la app se renderice.
        setCargando(false);
      }
    };

    recuperarSesion();
  }, []);

  // ─────────────────────────────────────────────────
  // FUNCIONES DE SESIÓN
  // ─────────────────────────────────────────────────
  // useCallback memoriza las funciones para que no se recreen
  // en cada render. Esto optimiza el rendimiento porque el
  // objeto `value` del contexto no cambia innecesariamente,
  // lo que evita re-renders en todos los componentes que lo usan.

  // Borra todos los datos de sesión del localStorage
  const limpiarStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.USUARIO);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }, []);

  // login: guarda los datos del usuario y el token después de autenticarse.
  // Lo llama la página de Login cuando el servidor responde con éxito.
  const login = useCallback((datosUsuario, token) => {
    if (!datosUsuario || !token) return;
    setUsuario(datosUsuario);
    // JSON.stringify convierte el objeto a string para guardarlo en localStorage
    localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(datosUsuario));
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  }, []);

  // logout: cierra la sesión y redirige al login.
  // window.location.href (recarga completa) en lugar de navigate()
  // porque así React "limpia" todo su estado en memoria.
  // Evita que datos del usuario anterior queden residuales.
  const logout = useCallback(() => {
    setUsuario(null);
    limpiarStorage();
    window.location.href = '/acceso';
  }, [limpiarStorage]);

  // ─────────────────────────────────────────────────
  // FUNCIONES RBAC — CONTROL DE ACCESO EN UI
  // ─────────────────────────────────────────────────

  // tieneRol: verifica si el usuario tiene exactamente ese rol
  const tieneRol = useCallback((rolRequerido) => {
    if (!usuario || !usuario.rol_id) return false;
    return usuario.rol_id === rolRequerido;
  }, [usuario]);

  // esAdministrador: atajo para tieneRol(ROLES.ADMINISTRADOR)
  // Uso: {esAdministrador() && <SeccionAdmin />}
  const esAdministrador = useCallback(() => tieneRol(ROLES.ADMINISTRADOR), [tieneRol]);

  // esVendedor: atajo para tieneRol(ROLES.VENDEDOR)
  const esVendedor = useCallback(() => tieneRol(ROLES.VENDEDOR), [tieneRol]);

  // tienePermiso: consulta la matriz PERMISOS para un permiso específico.
  // Es la función más usada en los componentes para controlar la UI.
  // Uso: <button disabled={!tienePermiso('eliminarLibro')}>
  const tienePermiso = useCallback((permiso) => {
    if (!usuario || !usuario.rol_id) return false;
    const permisosDelRol = PERMISOS[usuario.rol_id];
    return permisosDelRol && permisosDelRol[permiso] === true;
  }, [usuario]);

  // nombreRol: devuelve el nombre legible del rol para mostrar en la UI
  const nombreRol = useCallback(() => {
    if (!usuario || !usuario.rol_id) return 'Invitado';
    return usuario.rol_id === ROLES.ADMINISTRADOR ? 'Administrador' : 'Vendedor';
  }, [usuario]);

  // ─────────────────────────────────────────────────
  // VALOR DEL CONTEXTO
  // ─────────────────────────────────────────────────
  // useMemo memoriza el objeto para que no se recree en cada render.
  // Solo se recrea cuando cambia alguno de sus elementos (usuario, cargando, etc.).
  // Sin esto, todos los componentes que usan useAuth() se re-renderizarían
  // en cada render del AuthProvider, aunque nada haya cambiado.
  const value = useMemo(() => ({
    usuario,         // Datos del usuario actual (o null)
    cargando,        // True mientras se verifica la sesión inicial
    login,           // Función para iniciar sesión
    logout,          // Función para cerrar sesión
    tieneRol,        // Verifica un rol específico
    esAdministrador, // Atajo: ¿es admin?
    esVendedor,      // Atajo: ¿es vendedor?
    tienePermiso,    // Consulta la matriz de permisos
    nombreRol,       // Nombre legible del rol para la UI
    ROLES            // Constantes de roles para comparaciones
  }), [usuario, cargando, login, logout, tieneRol, esAdministrador, esVendedor, tienePermiso, nombreRol]);

  // ─────────────────────────────────────────────────
  // RENDER DEL PROVIDER
  // ─────────────────────────────────────────────────
  // AuthContext.Provider hace disponible `value` a todos los
  // componentes descendientes que llamen a useAuth().
  //
  // {!cargando && children}: mientras verificamos si hay sesión
  // guardada, no renderizamos nada. Esto previene el "flash"
  // donde el usuario ve por un instante la pantalla de login
  // aunque ya estuviera autenticado.
  return (
    <AuthContext.Provider value={value}>
      {!cargando && children}
    </AuthContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────
// HOOK useAuth — LA FORMA DE ACCEDER AL CONTEXTO
// ─────────────────────────────────────────────────────────
// Un "hook" en React es una función que empieza con "use"
// y permite acceder a características de React desde componentes funcionales.
//
// Este hook encapsula useContext(AuthContext) con una validación:
// si alguien usa useAuth() fuera de AuthProvider, recibe un error
// claro en lugar de un crash misterioso.
//
// Uso en cualquier componente:
//   const { usuario, logout, tienePermiso } = useAuth();
export const useAuth = () => {
  const context = useContext(AuthContext);

  // Si context es undefined, el componente está fuera del AuthProvider.
  // Solo avisamos en desarrollo para no exponer información en producción.
  if (process.env.NODE_ENV === 'development' && context === undefined) {
    console.error('[Auth] useAuth debe usarse dentro de AuthProvider');
  }

  return context;
};