// =====================================================
// COMPONENTE: RutaProtegidaPorRol (Guard de Autorizacion RBAC)
// =====================================================
// Este componente actua como un segundo nivel de proteccion para
// las rutas del sistema. Mientras que RutaProtegida verifica si
// hay sesion (autenticacion), este componente verifica si el
// usuario tiene el PERMISO ESPECIFICO para acceder a una pagina
// (autorizacion).
//
// Juntos implementan el patron de seguridad en dos capas:
//   - Capa 1 (RutaProtegida): "Estas logueado?" (autenticacion)
//   - Capa 2 (RutaProtegidaPorRol): "Puedes hacer esto?" (autorizacion)
//
// Que es RBAC?
//   RBAC = Role-Based Access Control (Control de Acceso Basado en Roles).
//   Es un modelo de seguridad donde los permisos se asignan a ROLES,
//   no a usuarios individuales. Cada usuario pertenece a un rol y
//   hereda todos los permisos de ese rol.
//
//   Roles del sistema:
//     - Administrador (rol_id=1): acceso total a todas las funciones
//     - Vendedor (rol_id=2): acceso limitado a ventas, inventario y clientes
//
//   Ventaja de RBAC: si se agrega un nuevo usuario Vendedor, automaticamente
//   tiene los mismos permisos que todos los vendedores, sin configurar
//   permisos individualmente. Los permisos se definen en la matriz
//   PERMISOS del AuthContext.
//
// Uso en App.jsx:
//   <RutaProtegida>
//     <RutaProtegidaPorRol permiso="verDashboard">
//       <Inicio />    <-- solo se muestra si tiene el permiso
//     </RutaProtegidaPorRol>
//   </RutaProtegida>
//
// Flujo de decision del componente:
//   1. Cargando la sesion?  -> Muestra spinner (espera)
//   2. No hay usuario?      -> Redirige a /acceso (login)
//   3. No tiene el permiso? -> Redirige a ruta por defecto
//   4. Tiene el permiso?    -> Renderiza la pagina (children)
//
// IMPORTANTE: esta proteccion es solo para la interfaz (UX).
// La seguridad real esta en los middlewares del backend
// (verificarToken.js y verificarRol.js) que validan cada peticion.
// =====================================================

// Navigate: componente de React Router para redirecciones automaticas.
// Cuando React renderiza <Navigate to="/ruta" />, el navegador
// cambia de pagina inmediatamente sin recargar (navegacion SPA).
import { Navigate } from 'react-router-dom';

// useAuth: hook personalizado del AuthContext que nos da acceso
// al usuario logueado y a la funcion tienePermiso() para consultar
// la matriz RBAC de permisos por rol.
import { useAuth } from '../context/AuthContext';


// =====================================================
// COMPONENTE FUNCIONAL: RutaProtegidaPorRol
// =====================================================
// Props que recibe:
//   - permiso (string): nombre del permiso requerido para acceder.
//     Debe coincidir con una clave de la matriz PERMISOS del AuthContext.
//     Ejemplos: 'verDashboard', 'crearLibro', 'registrarVenta'
//
//   - children (ReactNode): el componente/pagina que se mostrara
//     si el usuario tiene el permiso. Es la prop especial de React
//     que contiene lo que se coloca entre las etiquetas del componente.
//
//   - redirigirA (string, opcional): ruta a la que se redirige si
//     el usuario NO tiene el permiso. Por defecto es '/ventas'
//     porque es la pagina base que ambos roles pueden ver.
//     El valor por defecto se define con "= '/ventas'" en la
//     desestructuracion (default parameter).

const RutaProtegidaPorRol = ({ permiso, children, redirigirA = '/ventas' }) => {

  // Extraemos del contexto de autenticacion:
  //   - usuario: objeto con datos del usuario logueado, o null
  //   - tienePermiso: funcion que recibe un string de permiso y
  //     retorna true/false consultando la matriz PERMISOS[rol_id]
  //   - cargando: true mientras se verifica el token al cargar la app
  const { usuario, tienePermiso, cargando } = useAuth();

  // ── CASO 1: Verificando sesion (cargando = true) ──
  // El AuthProvider aun esta leyendo el token de localStorage
  // y verificando si es valido. Mostramos un spinner para evitar
  // el "flash" visual donde se muestra brevemente la pagina de
  // login antes de restaurar la sesion.
  //
  // role="status" es un atributo ARIA (Accessible Rich Internet
  // Applications) que indica a los lectores de pantalla que este
  // elemento muestra un estado/progreso.
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
  // Si no hay sesion activa, redirigimos al login.
  // Aunque RutaProtegida ya maneja esto, lo incluimos aqui tambien
  // como medida de seguridad defensiva: si por algun motivo este
  // componente se usa sin RutaProtegida como padre, igualmente
  // protege la ruta. Esto se conoce como "defensa en profundidad"
  // (defense in depth) en seguridad informatica.
  if (!usuario) {
    return <Navigate to="/acceso" replace />;
  }

  // ── CASO 3: El usuario no tiene el permiso requerido ──
  // El usuario esta logueado pero su rol no incluye el permiso
  // necesario para esta pagina. Ejemplo: un Vendedor intenta
  // acceder al Dashboard que requiere permiso 'verDashboard'
  // (solo disponible para Administradores).
  //
  // Redirigimos silenciosamente a la ruta definida en redirigirA.
  // No mostramos alerta porque <Navigate> actua de forma inmediata
  // al renderizarse, asi que cualquier contenido visual junto a el
  // no alcanzaria a ser visible para el usuario.
  if (!tienePermiso(permiso)) {
    return <Navigate to={redirigirA} replace />;
  }

  // ── CASO 4: Tiene el permiso, mostrar la pagina ──
  // Si paso todas las verificaciones, renderizamos los children
  // (la pagina protegida). El usuario tiene sesion activa Y el
  // permiso necesario para ver esta pagina.
  return children;
};

export default RutaProtegidaPorRol;
