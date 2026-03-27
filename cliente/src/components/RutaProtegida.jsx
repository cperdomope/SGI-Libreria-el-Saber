// =====================================================
// COMPONENTE: RutaProtegida (Guard de Autenticacion)
// =====================================================
// Este componente actua como un "guardia" o "portero" que protege
// las rutas privadas del sistema. Su unica responsabilidad es
// verificar si existe un usuario con sesion activa. Si no hay
// sesion, redirige automaticamente a la pagina de login (/acceso).
//
// Este patron se conoce como "Route Guard" (guardia de ruta) y es
// fundamental en aplicaciones web con autenticacion. Sin este
// componente, cualquier persona podria acceder directamente a URLs
// como /inventario o /ventas escribiendolas en el navegador, incluso
// sin haber iniciado sesion.
//
// Flujo de decision:
//   1. Cargando? (verificando token en localStorage)
//      -> SI: muestra un spinner (evita un flash visual)
//      -> NO: continua al paso 2
//
//   2. Hay usuario autenticado?
//      -> NO: redirige a /acceso (login)
//      -> SI: renderiza la pagina solicitada (children)
//
// Uso en App.jsx (patron de componentes anidados):
//   <RutaProtegida>             <- Hay sesion?
//     <RutaProtegidaPorRol>     <- Tiene el permiso especifico?
//       <Inventario />          <- Pagina destino
//     </RutaProtegidaPorRol>
//   </RutaProtegida>
//
// Diferencia con RutaProtegidaPorRol:
//   - RutaProtegida: solo verifica si HAY sesion (autenticacion)
//   - RutaProtegidaPorRol: verifica si tiene el PERMISO necesario (autorizacion)
//   Son conceptos distintos en seguridad:
//     - Autenticacion = "quien eres" (identidad)
//     - Autorizacion  = "que puedes hacer" (permisos)
//
// IMPORTANTE: esta proteccion es solo a nivel de interfaz (UX).
// La seguridad real esta en los middlewares del backend
// (verificarToken.js, verificarRol.js) que validan el JWT en
// cada peticion HTTP. Un usuario que manipule el frontend no
// podra acceder a datos sin un token JWT valido.
// =====================================================

// Navigate: componente de React Router que realiza una redireccion
// programatica. A diferencia de <Link> (que el usuario hace clic),
// <Navigate> redirige automaticamente cuando se renderiza.
// Es la forma declarativa de hacer navigate('/ruta') en JSX.
import { Navigate } from 'react-router-dom';

// useAuth: hook personalizado que nos da acceso al contexto global
// de autenticacion. De aqui obtenemos:
//   - usuario: datos del usuario logueado (null si no hay sesion)
//   - cargando: booleano que indica si aun se esta verificando
//     el token guardado en localStorage al cargar la aplicacion
import { useAuth } from '../context/AuthContext';


// =====================================================
// COMPONENTE FUNCIONAL: RutaProtegida
// =====================================================
// Recibe { children } como prop. "children" es el contenido que
// se coloca entre las etiquetas del componente:
//   <RutaProtegida>
//     <Inventario />    <-- esto es children
//   </RutaProtegida>
//
// Este patron se llama "Higher-Order Component" (HOC) o mas
// precisamente "Wrapper Component" (componente envolvente):
// no tiene UI propia, sino que decide si renderiza o no
// el contenido que envuelve, basandose en una condicion.

const RutaProtegida = ({ children }) => {
  // Extraemos del contexto:
  // - usuario: objeto con datos del usuario, o null si no hay sesion
  // - cargando: true mientras el AuthProvider verifica si hay un
  //   token valido en localStorage (sucede al cargar la app)
  const { usuario, cargando } = useAuth();

  // ── ESTADO 1: Verificando sesion (cargando = true) ──
  // Cuando la aplicacion se carga por primera vez, el AuthProvider
  // necesita tiempo para leer el token de localStorage y verificar
  // si aun es valido. Durante ese breve momento, 'cargando' es true.
  //
  // Si no mostraramos un spinner aqui, ocurriria un "flash":
  // el usuario veria la pagina de login por un instante antes
  // de ser redirigido a la pagina que solicito. Esto pasa porque
  // 'usuario' empieza como null y se llena cuando termina la
  // verificacion del token.
  //
  // El spinner usa clases de Bootstrap:
  //   - vh-100: altura del 100% del viewport (centra verticalmente)
  //   - spinner-border: animacion de carga circular de Bootstrap
  //   - visually-hidden: oculta el texto visualmente pero lo mantiene
  //     accesible para lectores de pantalla (accesibilidad web)
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

  // ── ESTADO 2: No hay sesion (usuario = null) ──
  // Si ya termino de cargar y no hay usuario, significa que no
  // hay sesion activa. Redirigimos a la pagina de login.
  //
  // <Navigate to="/acceso" replace />
  //   - to="/acceso": ruta destino (pagina de login)
  //   - replace: reemplaza la entrada actual en el historial del
  //     navegador en lugar de agregar una nueva. Esto es importante
  //     porque si el usuario presiona "atras" en el navegador,
  //     NO volvera a la ruta protegida que intento acceder
  //     (lo cual causaria un loop infinito de redirecciones).
  if (!usuario) {
    return <Navigate to="/acceso" replace />;
  }

  // ── ESTADO 3: Hay sesion activa ──
  // Si paso las dos verificaciones anteriores, hay un usuario
  // autenticado. Renderizamos los children (la pagina solicitada).
  // "return children" simplemente muestra lo que este componente
  // envuelve, sin agregar ningun elemento HTML adicional al DOM.
  return children;
};

// Exportamos como default para importar sin llaves:
//   import RutaProtegida from './RutaProtegida';
export default RutaProtegida;
