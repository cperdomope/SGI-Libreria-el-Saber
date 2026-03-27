// =====================================================
// CONTEXTO DE AUTENTICACION (AuthContext)
// =====================================================
// Este archivo implementa el manejo global del estado de
// autenticacion usando el patron React Context.
//
// Que problema resuelve React Context?
//   En una aplicacion React, el estado normalmente vive dentro
//   de un componente y se pasa hacia los hijos mediante "props".
//   Si el navbar, las paginas y los guards necesitan saber quien
//   esta logueado, tendriamos que pasar el usuario como prop
//   a traves de multiples niveles de componentes. Este problema
//   se conoce como "prop drilling" y dificulta el mantenimiento.
//
//   React Context resuelve esto creando un "estado global" al
//   que cualquier componente puede acceder directamente, sin
//   importar que tan profundo este en el arbol de componentes.
//
// Arquitectura de este archivo (3 piezas):
//   1. AuthContext  -> el "canal" de comunicacion (createContext)
//   2. AuthProvider -> el componente que PROVEE los datos al canal
//   3. useAuth()    -> el hook que los componentes usan para LEER
//                      los datos del canal
//
// Persistencia de sesion:
//   Cuando el usuario hace login, guardamos el token JWT y sus datos
//   en localStorage (almacenamiento del navegador que persiste entre
//   recargas y cierres de pestana). Asi, al recargar la pagina, la
//   sesion se restaura automaticamente sin pedir login de nuevo.
//
// RBAC en el frontend:
//   Ademas de la autenticacion, este archivo define la matriz de
//   PERMISOS que controla que botones y secciones ve cada rol en
//   la interfaz. IMPORTANTE: esta validacion es solo para UX
//   (mostrar/ocultar elementos). La seguridad real esta en los
//   middlewares del backend (verificarToken.js, verificarRol.js).
// =====================================================

// Importamos los hooks de React que necesitamos:
//   - createContext: crea el "canal" del contexto
//   - useState: estado local (usuario, cargando)
//   - useEffect: efecto secundario al montar el componente
//   - useContext: para leer datos del contexto
//   - useCallback: memoriza funciones para evitar re-creaciones
//   - useMemo: memoriza valores para evitar re-calculos
import { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';


// =============================================================
// SECCION 1: EL CONTEXTO
// =============================================================
// createContext() crea un objeto Context que tiene dos componentes:
//   - Context.Provider: envuelve los componentes y les PROVEE datos
//   - Context.Consumer: permite a los componentes CONSUMIR esos datos
//     (en la practica, usamos el hook useContext en lugar de Consumer)
//
// No exportamos AuthContext directamente para forzar el uso de
// useAuth(), que incluye validacion de uso correcto.
const AuthContext = createContext();


// =============================================================
// SECCION 2: CONSTANTES DE ROLES
// =============================================================
// Estos IDs deben coincidir EXACTAMENTE con los valores en la
// base de datos (tabla mdc_roles) y en el backend (verificarRol.js).
// Si se cambian en la BD, deben actualizarse aqui tambien.
//
// Los exportamos como "named export" para que cualquier componente
// pueda importarlos directamente:
//   import { ROLES } from '../context/AuthContext';
//   if (usuario.rol_id === ROLES.ADMINISTRADOR) { ... }
//
// Usamos un objeto constante en lugar de numeros sueltos (1, 2)
// para evitar "numeros magicos" en el codigo. Es mas legible
// ROLES.ADMINISTRADOR que simplemente 1.
export const ROLES = {
  ADMINISTRADOR: 1,  // Acceso total al sistema
  VENDEDOR: 2        // Acceso limitado a ventas y consultas
};


// =============================================================
// SECCION 3: MATRIZ DE PERMISOS POR ROL (RBAC)
// =============================================================
// Esta matriz define EXACTAMENTE que puede hacer cada rol en
// la interfaz del sistema. Cada permiso es un booleano (true/false).
//
// Los componentes la consultan asi:
//   PERMISOS[usuario.rol_id].crearLibro  -> true o false
//
// O a traves de la funcion tienePermiso() del contexto:
//   tienePermiso('crearLibro')  -> true o false
//
// CRUD: Create (crear), Read (leer), Update (actualizar), Delete (eliminar)
// Son las 4 operaciones basicas sobre cualquier entidad de datos.
//
// La sintaxis [ROLES.ADMINISTRADOR] usa "computed property names"
// (nombres de propiedad calculados): el valor de ROLES.ADMINISTRADOR
// (que es 1) se usa como la clave del objeto. Es equivalente a
// escribir { 1: { ... } }, pero mas legible.
//
// IMPORTANTE: esta validacion es SOLO para la interfaz de usuario.
// Un usuario podria manipular estas variables en las DevTools del
// navegador, pero el servidor rechazaria sus peticiones porque los
// middlewares del backend validan el JWT y el rol independientemente.

export const PERMISOS = {

  // ── ADMINISTRADOR: acceso completo a todo el sistema ──
  [ROLES.ADMINISTRADOR]: {
    verDashboard: true,          // Estadisticas y metricas del negocio

    // Inventario: CRUD completo de libros
    verInventario: true,
    crearLibro: true,
    editarLibro: true,
    eliminarLibro: true,

    // Autores: CRUD completo
    verAutores: true,
    crearAutor: true,
    editarAutor: true,
    eliminarAutor: true,

    // Categorias: CRUD completo
    verCategorias: true,
    crearCategoria: true,
    editarCategoria: true,
    eliminarCategoria: true,

    // Clientes: CRUD completo
    verClientes: true,
    crearCliente: true,
    editarCliente: true,
    eliminarCliente: true,

    // Proveedores: CRUD completo
    verProveedores: true,
    crearProveedor: true,
    editarProveedor: true,
    eliminarProveedor: true,

    // Ventas: registrar y consultar historial
    registrarVenta: true,
    verVentas: true,

    // Movimientos: entradas y salidas del Kardex
    registrarMovimiento: true,

    // Gestion de usuarios del sistema (solo Admin)
    gestionarUsuarios: true
  },

  // ── VENDEDOR: acceso restringido a lo operativo ──
  // El vendedor solo necesita las funciones del dia a dia:
  // consultar inventario, registrar ventas y manejar clientes.
  [ROLES.VENDEDOR]: {
    // Sin dashboard (contiene datos financieros sensibles)
    verDashboard: false,

    // Inventario: solo consulta (necesita ver stock y precios para vender)
    verInventario: true,
    crearLibro: false,
    editarLibro: false,
    eliminarLibro: false,

    // Autores: solo consulta (para mostrar en el catalogo de ventas)
    verAutores: true,
    crearAutor: false,
    editarAutor: false,
    eliminarAutor: false,

    // Categorias: solo consulta (para filtros en ventas)
    verCategorias: true,
    crearCategoria: false,
    editarCategoria: false,
    eliminarCategoria: false,

    // Clientes: puede ver y crear (necesita registrar clientes nuevos al vender)
    verClientes: true,
    crearCliente: true,
    editarCliente: false,
    eliminarCliente: false,

    // Sin acceso a proveedores (informacion administrativa)
    verProveedores: false,
    crearProveedor: false,
    editarProveedor: false,
    eliminarProveedor: false,

    // Ventas: funcion principal del rol vendedor
    registrarVenta: true,
    verVentas: true,

    // Sin acceso a movimientos de inventario (responsabilidad del admin)
    registrarMovimiento: false,

    // Sin acceso a gestion de usuarios
    gestionarUsuarios: false
  }
};


// =============================================================
// SECCION 4: CLAVES DE LOCALSTORAGE
// =============================================================
// Centralizamos los nombres de las claves que usamos en localStorage
// en un solo objeto constante. Asi, si necesitamos cambiar un nombre,
// solo lo modificamos aqui y no en multiples archivos.
// Estas mismas claves se usan en services/api.js para leer el token.
//
// localStorage es un almacenamiento clave-valor del navegador que:
//   - Persiste entre recargas de pagina y cierres de pestana
//   - Solo almacena strings (por eso usamos JSON.stringify/parse)
//   - Tiene un limite de ~5MB por dominio
//   - NO se envia automaticamente al servidor (a diferencia de cookies)
const STORAGE_KEYS = {
  USUARIO: 'usuario_sgi',   // Datos del usuario (objeto JSON como string)
  TOKEN:   'token_sgi'      // Token JWT (string)
};


// =============================================================
// SECCION 5: AUTHPROVIDER (Componente Proveedor)
// =============================================================
// Este es el componente que envuelve TODA la aplicacion en main.jsx:
//   <AuthProvider>
//     <App />
//   </AuthProvider>
//
// Su responsabilidad es:
//   1. Mantener el estado de autenticacion (usuario logueado o null)
//   2. Restaurar la sesion desde localStorage al cargar la app
//   3. Proveer funciones de login/logout a todos los componentes
//   4. Proveer funciones RBAC (tienePermiso, nombreRol, etc.)
//
// El patron Provider/Consumer funciona asi:
//   - AuthProvider envuelve la app y "emite" datos por el Context
//   - Cualquier componente descendiente puede "recibir" esos datos
//     llamando a useAuth() (que internamente usa useContext)

export const AuthProvider = ({ children }) => {

  // ── Estados del componente ──

  // usuario: objeto con los datos del usuario logueado, o null si no hay sesion.
  // Estructura esperada: { id, nombre_completo, email, rol_id }
  // Cuando este valor cambia, React re-renderiza todos los componentes
  // que consumen el contexto (los que usan useAuth()).
  const [usuario, setUsuario] = useState(null);

  // cargando: true mientras se verifica si hay sesion guardada en localStorage.
  // Mientras sea true, el Provider NO renderiza los children (la app completa).
  // Esto previene el "flash" donde se muestra la pantalla de login por un
  // instante antes de restaurar la sesion del usuario.
  // NOTA: como el Provider bloquea el render con {!cargando && children},
  // los spinners de RutaProtegida y RutaProtegidaPorRol son tecnicamente
  // inalcanzables. Se mantienen como defensa en profundidad por si el
  // comportamiento del Provider cambiara en el futuro.
  const [cargando, setCargando] = useState(true);


  // ---------------------------------------------------------
  // RECUPERAR SESION AL ARRANCAR LA APLICACION
  // ---------------------------------------------------------
  // useEffect es un hook que ejecuta "efectos secundarios": acciones
  // que no son parte del renderizado (leer localStorage, hacer peticiones
  // HTTP, suscribirse a eventos, etc.).
  //
  // El segundo argumento [] (array de dependencias vacio) significa que
  // este efecto se ejecuta UNA SOLA VEZ cuando el componente se monta
  // por primera vez. Es el equivalente a componentDidMount() en
  // componentes de clase.
  //
  // Flujo:
  //   1. Leemos usuario y token de localStorage
  //   2. Si ambos existen y el usuario tiene campos validos, restauramos sesion
  //   3. Si algo falla (datos corruptos, JSON invalido), limpiamos todo
  //   4. En cualquier caso (finally), marcamos cargando=false
  useEffect(() => {
    const recuperarSesion = () => {
      try {
        // localStorage.getItem retorna el string guardado, o null si no existe
        const usuarioGuardado = localStorage.getItem(STORAGE_KEYS.USUARIO);
        const tokenGuardado   = localStorage.getItem(STORAGE_KEYS.TOKEN);

        // Solo restauramos si AMBOS datos existen.
        // Si solo hay uno, la sesion esta incompleta y la limpiamos.
        if (usuarioGuardado && tokenGuardado) {
          // JSON.parse convierte el string de localStorage de vuelta a objeto.
          // Puede lanzar un error si el string no es JSON valido (por ejemplo,
          // si alguien lo modifico manualmente en las DevTools).
          const userParseado = JSON.parse(usuarioGuardado);

          // Verificacion defensiva: comprobamos que el objeto tenga los campos
          // minimos necesarios (id y rol_id) antes de restaurar la sesion.
          // Esto previene crashes si alguien manipulo el localStorage.
          if (userParseado && userParseado.id && userParseado.rol_id) {
            setUsuario(userParseado);
          } else {
            limpiarStorage();
          }
        }
      } catch (error) {
        // Si JSON.parse falla, el localStorage tiene datos corruptos
        if (process.env.NODE_ENV === 'development') {
          console.error('[Auth] Error recuperando sesion:', error);
        }
        limpiarStorage();
      } finally {
        // finally se ejecuta SIEMPRE, haya error o no.
        // Marcamos cargando=false para que la app se renderice.
        setCargando(false);
      }
    };

    recuperarSesion();
  }, []);


  // ---------------------------------------------------------
  // FUNCIONES DE SESION
  // ---------------------------------------------------------
  // useCallback es un hook que "memoriza" una funcion para que
  // React no la recree en cada render del componente.
  //
  // Por que importa? Porque estas funciones se incluyen en el
  // objeto 'value' del contexto. Si se recrean en cada render,
  // el objeto 'value' cambia (nueva referencia en memoria), lo
  // que dispara re-renders innecesarios en TODOS los componentes
  // que usan useAuth(). useCallback evita esto: la funcion solo
  // se recrea si cambian sus dependencias (el array del segundo
  // argumento).
  //
  // Es una optimizacion de rendimiento. Sin useCallback el sistema
  // funcionaria igual, pero haria mas trabajo del necesario.

  // Elimina los datos de sesion del localStorage
  const limpiarStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.USUARIO);
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
  }, []);
  // [] = sin dependencias = la funcion nunca cambia (siempre hace lo mismo)

  // login: guarda los datos del usuario y el token tras autenticarse.
  // La llama la pagina de login (Acceso.jsx) cuando el backend
  // responde exitosamente con el token JWT y los datos del usuario.
  const login = useCallback((datosUsuario, token) => {
    // Validacion defensiva: si falta algun dato, no hacemos nada
    if (!datosUsuario || !token) return;

    // Actualizamos el estado de React (dispara re-render)
    setUsuario(datosUsuario);

    // Guardamos en localStorage para persistir entre recargas.
    // JSON.stringify convierte el objeto a string porque localStorage
    // solo puede almacenar strings.
    localStorage.setItem(STORAGE_KEYS.USUARIO, JSON.stringify(datosUsuario));
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  }, []);

  // logout: cierra la sesion del usuario.
  // Usamos window.location.href (recarga completa de la pagina) en
  // lugar de navigate() de React Router. Esto es intencional porque
  // una recarga completa fuerza a React a destruir TODOS los componentes
  // y limpiar todo el estado en memoria. Asi garantizamos que no queden
  // datos del usuario anterior en ningun componente.
  const logout = useCallback(() => {
    setUsuario(null);        // Limpiamos el estado de React
    limpiarStorage();        // Limpiamos localStorage
    window.location.href = '/acceso';  // Recarga completa al login
  }, [limpiarStorage]);


  // ---------------------------------------------------------
  // FUNCIONES RBAC (Control de Acceso en la UI)
  // ---------------------------------------------------------
  // Estas funciones consultan la matriz PERMISOS y el rol del
  // usuario para determinar que puede ver y hacer en la interfaz.

  // tieneRol: verifica si el usuario tiene un rol especifico.
  // Compara el rol_id del usuario con el rol requerido.
  const tieneRol = useCallback((rolRequerido) => {
    if (!usuario || !usuario.rol_id) return false;
    return usuario.rol_id === rolRequerido;
  }, [usuario]);
  // [usuario] = se recrea solo cuando el usuario cambia (login/logout)

  // Atajos de conveniencia para verificaciones frecuentes.
  // Evitan escribir tieneRol(ROLES.ADMINISTRADOR) cada vez.
  const esAdministrador = useCallback(() => tieneRol(ROLES.ADMINISTRADOR), [tieneRol]);
  const esVendedor = useCallback(() => tieneRol(ROLES.VENDEDOR), [tieneRol]);

  // tienePermiso: la funcion mas usada en los componentes para
  // controlar la UI basandose en el rol del usuario.
  // Consulta la matriz PERMISOS usando el rol_id como clave.
  //
  // Ejemplo de uso en componentes:
  //   {tienePermiso('crearLibro') && <BotonCrear />}
  //   <button disabled={!tienePermiso('eliminarLibro')}>
  const tienePermiso = useCallback((permiso) => {
    if (!usuario || !usuario.rol_id) return false;
    const permisosDelRol = PERMISOS[usuario.rol_id];
    // Verificamos que el rol exista en la matriz Y que el permiso sea true.
    // Usamos === true (comparacion estricta) para evitar que valores
    // "truthy" como 1 o "si" pasen la verificacion.
    return permisosDelRol && permisosDelRol[permiso] === true;
  }, [usuario]);

  // nombreRol: devuelve el nombre legible del rol para mostrar en la UI.
  // Se usa en la BarraNavegacion para mostrar "Administrador" o "Vendedor"
  // debajo del nombre del usuario.
  const nombreRol = useCallback(() => {
    if (!usuario || !usuario.rol_id) return 'Invitado';
    return usuario.rol_id === ROLES.ADMINISTRADOR ? 'Administrador' : 'Vendedor';
  }, [usuario]);


  // ---------------------------------------------------------
  // VALOR DEL CONTEXTO (lo que reciben los consumidores)
  // ---------------------------------------------------------
  // useMemo memoriza el objeto 'value' para que React no cree una
  // nueva referencia en cada render. Solo se recrea cuando cambia
  // alguna de las dependencias listadas en el array.
  //
  // Sin useMemo, cada render del AuthProvider crearia un nuevo
  // objeto {} (aunque con los mismos valores). React veria una
  // nueva referencia y re-renderizaria TODOS los consumidores
  // del contexto, incluso si nada cambio realmente.
  // Esta optimizacion es especialmente importante aqui porque
  // AuthProvider envuelve TODA la aplicacion.
  const value = useMemo(() => ({
    usuario,         // Datos del usuario actual (o null)
    cargando,        // true mientras verifica sesion inicial
    login,           // Funcion para iniciar sesion
    logout,          // Funcion para cerrar sesion
    tieneRol,        // Verifica un rol especifico
    esAdministrador, // Atajo: es admin?
    esVendedor,      // Atajo: es vendedor?
    tienePermiso,    // Consulta la matriz RBAC de permisos
    nombreRol,       // Nombre legible del rol para la UI
    ROLES            // Constantes de roles (conveniencia, tambien exportada)
  }), [usuario, cargando, login, logout, tieneRol, esAdministrador, esVendedor, tienePermiso, nombreRol]);


  // ---------------------------------------------------------
  // RENDER DEL PROVIDER
  // ---------------------------------------------------------
  // AuthContext.Provider es el componente especial que React crea
  // a partir del contexto. Todo lo que pasamos en 'value' estara
  // disponible para cualquier componente descendiente que llame
  // a useContext(AuthContext) o a nuestro hook useAuth().
  //
  // {!cargando && children}: esta es una tecnica de "render blocking"
  // (bloqueo de renderizado). Mientras cargando es true, children
  // (toda la aplicacion) NO se renderiza. Esto significa:
  //   - No se montan las rutas
  //   - No se ejecutan los guards (RutaProtegida, RutaProtegidaPorRol)
  //   - No se muestra la pantalla de login
  // Solo cuando cargando pasa a false (sesion verificada), la
  // aplicacion completa se renderiza de una sola vez, ya sea con
  // sesion restaurada o sin sesion (mostrando login).
  return (
    <AuthContext.Provider value={value}>
      {!cargando && children}
    </AuthContext.Provider>
  );
};


// =============================================================
// SECCION 6: HOOK useAuth (Acceso al Contexto)
// =============================================================
// Un hook personalizado es una funcion que empieza con "use" y
// encapsula logica reutilizable con otros hooks de React.
//
// useAuth() encapsula useContext(AuthContext) con una validacion
// adicional: si alguien usa useAuth() en un componente que NO
// esta dentro del AuthProvider, recibe un mensaje de error claro
// en la consola en lugar de un crash misterioso con "Cannot read
// properties of undefined".
//
// Uso en cualquier componente:
//   import { useAuth } from '../context/AuthContext';
//   const { usuario, logout, tienePermiso } = useAuth();

export const useAuth = () => {
  // useContext lee el valor actual del contexto mas cercano
  // (el 'value' que pasamos en AuthContext.Provider).
  const context = useContext(AuthContext);

  // Si context es undefined, significa que el componente esta fuera
  // del AuthProvider. Solo mostramos el error en desarrollo para
  // no exponer informacion interna en produccion.
  if (process.env.NODE_ENV === 'development' && context === undefined) {
    console.error('[Auth] useAuth debe usarse dentro de AuthProvider');
  }

  return context;
};
