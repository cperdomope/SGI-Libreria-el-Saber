// =====================================================
// PAGINA: ACCESO (LOGIN) - Punto de entrada del sistema
// =====================================================
// Esta es la pagina de inicio de sesion (login) del SGI Libreria El Saber.
// Es la UNICA ruta publica de toda la aplicacion; todas las demas rutas
// estan protegidas por los componentes RutaProtegida y RutaProtegidaPorRol.
//
// Flujo de autenticacion completo:
//   1. El usuario ingresa email y contrasena en el formulario
//   2. react-hook-form valida los campos en el frontend (UX inmediata)
//   3. Si la validacion pasa, se envia POST /api/auth/login al backend
//   4. El backend verifica las credenciales contra la BD (bcrypt)
//   5. Si son correctas, genera un token JWT y lo devuelve con los datos
//   6. Llamamos a login() del AuthContext para guardar usuario + token
//   7. Se redirige al usuario a la pagina principal del sistema
//
// Seguridad implementada:
//   - Bloqueo de cuenta: tras 3 intentos fallidos consecutivos, el backend
//     bloquea la cuenta y responde con { bloqueado: true }
//   - Barra visual de intentos: muestra cuantos intentos le quedan al usuario
//   - Validacion dual: frontend (UX) + backend (seguridad real)
//
// Conceptos clave aplicados:
//   - react-hook-form: libreria que simplifica el manejo de formularios
//     en React. En lugar de manejar cada campo con useState + onChange,
//     react-hook-form usa "register" para conectar inputs directamente
//     y "handleSubmit" para validar antes de enviar.
//   - lazy() + Suspense: carga diferida de componentes pesados (documentacion)
//     para que no afecten la velocidad de carga inicial del login.
//   - SVG inline: los iconos se definen como componentes JSX en lugar de
//     importar una libreria de iconos completa, reduciendo el bundle size.
// =====================================================

// useState: estado local para controlar la UI (loading, errores, etc.)
// lazy: funcion de React para importar componentes de forma diferida.
//   En lugar de cargar el componente inmediatamente con "import X from Y",
//   lazy() lo carga SOLO cuando se necesita renderizar por primera vez.
//   Esto se llama "code splitting" (division de codigo) y reduce el
//   tamano del bundle inicial que descarga el navegador.
// Suspense: componente que muestra un fallback (spinner) mientras el
//   componente lazy se esta descargando. Es obligatorio envolver
//   componentes lazy con Suspense; sin el, React lanza un error.
import { useState, lazy, Suspense } from 'react';

// react-hook-form: libreria especializada en formularios para React.
// A diferencia de manejar formularios con useState (controlados), RHF usa
// refs internamente (no controlados), lo que reduce los re-renders y mejora
// el rendimiento. Nos da:
//   - register: funcion que conecta un input con sus reglas de validacion
//   - handleSubmit: wrapper que valida todo antes de llamar nuestra funcion
//   - formState.errors: objeto con los errores de validacion por campo
import { useForm } from 'react-hook-form';

// api: instancia de Axios preconfigurada con la URL base del servidor
// y un interceptor que agrega automaticamente el token JWT en cada peticion.
import api from '../services/api';

// useAuth: hook personalizado que nos da acceso al contexto global de
// autenticacion. De aqui usamos la funcion login() para guardar la sesion.
import { useAuth } from '../context/AuthContext';

// -- Componentes de documentacion (carga diferida) --
// Cada lazy() recibe una funcion que retorna un import() dinamico.
// Webpack/Vite crean un "chunk" separado para cada uno de estos componentes,
// que solo se descarga cuando el usuario abre el modal de documentacion.
// Esto es importante porque los manuales son pesados y no tiene sentido
// cargarlos si el usuario solo quiere iniciar sesion.
const DocumentacionHistorias = lazy(() => import('./DocumentacionHistorias'));
const DocumentacionCriterios = lazy(() => import('./DocumentacionCriterios'));
const DocumentacionManualTecnico = lazy(() => import('./DocumentacionManualTecnico'));
const DocumentacionManualUsuario = lazy(() => import('./DocumentacionManualUsuario'));

// -- Iconos SVG en linea para el formulario --
// En lugar de usar una libreria de iconos como FontAwesome o react-icons
// (que agregarian peso al bundle), definimos los iconos directamente como
// componentes funcionales que retornan SVG. Cada SVG usa "fill=currentColor"
// para heredar el color del texto del elemento padre (CSS inheritance).
const Icons = {
  // Icono de libro (logo del sistema)
  Book: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
      <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z"/>
    </svg>
  ),
  // Icono de usuario (campo email)
  User: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/>
    </svg>
  ),
  // Icono de candado (campo contraseña)
  Lock: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
    </svg>
  ),
  // Icono de ojo abierto (mostrar contraseña)
  Eye: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z"/>
      <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
    </svg>
  ),
  // Icono de ojo tachado (ocultar contraseña)
  EyeSlash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.709z"/>
      <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.299.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
      <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.709zm10.296 8.884-12-12 .708-.708 12 12-.708.708z"/>
    </svg>
  )
};

// -- Constante: maximo de intentos antes del bloqueo --
// Se define fuera del componente porque es un valor fijo que no cambia.
// Al ser constante, se declara en UPPER_SNAKE_CASE por convencion de JavaScript.
const MAX_INTENTOS = 3;

// =====================================================
// COMPONENTE PRINCIPAL: Acceso (pagina de login)
// =====================================================
// Es un componente funcional (arrow function). En React moderno,
// los componentes funcionales son el estandar; los componentes de
// clase (class Component) ya casi no se usan desde la llegada de los Hooks.

const Acceso = () => {

  // -- react-hook-form: inicializacion del formulario --
  // useForm() retorna un objeto con multiples utilidades. Usamos
  // desestructuracion para extraer solo las 3 que necesitamos:
  //   - register: conecta cada <input> con sus reglas de validacion
  //   - handleSubmit: funcion que valida todo ANTES de llamar nuestra funcion
  //   - formState.errors: objeto con los errores activos por campo
  //
  // mode: 'onTouched' significa que la validacion se ejecuta cuando el
  // usuario SALE del campo (evento blur), no mientras escribe. Esto evita
  // mostrar errores prematuros que confundan al usuario.
  // Otros modos posibles: 'onChange' (al escribir), 'onSubmit' (solo al enviar),
  // 'onBlur' (similar a onTouched pero sin revalidar al cambiar), 'all'.
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({ mode: 'onTouched' });

  // -- Estados locales de la interfaz --
  // Estos estados controlan aspectos visuales que react-hook-form no maneja.
  // Cada useState retorna un par [valor, funcion_para_cambiar_valor].
  const [mostrarPassword, setMostrarPassword] = useState(false);     // Toggle ver/ocultar contrasena
  const [loading, setLoading]                 = useState(false);     // Spinner del boton de envio
  const [intentosRestantes, setIntentosRestantes] = useState(null);  // null = no mostrar barra
  const [bloqueado, setBloqueado]             = useState(false);     // true = cuenta bloqueada por intentos
  const [errorServidor, setErrorServidor]     = useState('');        // Mensaje principal de error
  const [mensajeDetallado, setMensajeDetallado] = useState('');      // Detalle adicional del error
  const [mostrarDocs, setMostrarDocs]         = useState(false);     // Controla visibilidad del modal docs
  const [tabActiva, setTabActiva]             = useState('historias'); // Pestana activa en modal docs

  // -- Hook de autenticacion global --
  // login() es la funcion del AuthContext que guarda el usuario y el token
  // JWT en el estado global + localStorage para persistencia entre recargas.
  const { login } = useAuth();

  // -- Funcion: manejarLogin (se ejecuta al enviar el formulario) --
  // Esta funcion SOLO se llama si react-hook-form valido todos los campos
  // exitosamente. RHF le pasa los valores como objeto: { email, password }.
  // Es async porque necesitamos esperar la respuesta del servidor (await).
  const manejarLogin = async ({ email, password }) => {
    // Activamos el spinner y limpiamos errores anteriores
    setLoading(true);
    setErrorServidor('');

    try {
      // POST /api/auth/login: envia las credenciales al backend.
      // api.post() es un wrapper de Axios que ya tiene configurada
      // la URL base del servidor (ej: http://localhost:3001/api).
      const res = await api.post('/auth/login', { email, password });

      // Si llega aqui, la autenticacion fue exitosa.
      // El backend responde con { usuario: {...}, token: "jwt..." }
      // Guardamos ambos en el AuthContext para uso global.
      login(res.data.usuario, res.data.token);

      // Redirigimos a la pagina principal con recarga completa.
      // Usamos window.location.href en lugar de navigate() de React Router
      // para forzar una recarga completa del DOM, asegurando que todos
      // los componentes lean el nuevo estado de autenticacion desde cero.
      window.location.href = '/';

    } catch (err) {
      // -- Manejo de errores del backend --
      // err.response?.data usa encadenamiento opcional (?.) porque si el
      // servidor esta caido, err.response sera undefined y sin ?. lanzaria
      // "Cannot read properties of undefined".
      const errorData = err.response?.data;

      if (errorData?.bloqueado) {
        // Caso 1: Cuenta bloqueada (supero el maximo de intentos)
        setBloqueado(true);
        setIntentosRestantes(0);
        setMensajeDetallado(errorData.error);
      } else if (errorData?.intentosRestantes !== undefined) {
        // Caso 2: Credenciales incorrectas pero aun tiene intentos.
        // Usamos !== undefined (no solo truthy) porque intentosRestantes
        // podria ser 0, que es falsy pero es un valor valido.
        setIntentosRestantes(errorData.intentosRestantes);
        setMensajeDetallado(errorData.mensaje || errorData.error);
        setBloqueado(false);
      } else {
        // Caso 3: Error de conexion u otro error inesperado
        setMensajeDetallado(errorData?.error || 'No se pudo conectar al servidor. Intente mas tarde.');
        setBloqueado(false);
      }

      setErrorServidor(errorData?.error || 'Error de autenticacion');
    } finally {
      // finally se ejecuta SIEMPRE, sea exito o error.
      // Desactivamos el spinner del boton en cualquier caso.
      setLoading(false);
    }
  };

  // =====================================================
  // RENDERIZADO (JSX)
  // =====================================================
  // Todo lo que retorna el componente es JSX, una extension de sintaxis
  // que permite escribir HTML dentro de JavaScript. JSX se compila a
  // llamadas React.createElement() por el bundler (Vite en este caso).

  return (
    <div className="login-container">
      {/* login-card y fade-in son clases CSS personalizadas definidas
          en los estilos globales. fade-in aplica una animacion de entrada. */}
      <div className="login-card fade-in">

        {/* -- BOTON DOCUMENTACION (parte superior) --
            type="button" es importante aqui: sin el, un boton dentro de
            un formulario se comporta como type="submit" por defecto,
            lo que enviaria el formulario al hacer clic.
            Los estilos inline (style={{}}) se usan aqui porque son
            especificos de este unico boton y no se reutilizan. */}
        <div className="text-center mb-3">
          <button
            type="button"
            className="btn btn-lg w-100 fw-bold py-2 shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1.05rem',
              letterSpacing: '0.5px',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 .125rem .25rem rgba(0,0,0,.075)';
            }}
            onClick={() => setMostrarDocs(true)}
          >
            Documentacion del Proyecto
          </button>
        </div>

        {/* -- ENCABEZADO: Logo + titulo -- */}
        <div className="login-header">
          <div className="login-icon">
            <Icons.Book />
          </div>
          <h2 className="fw-bold text-dark">Bienvenido</h2>
          <p className="text-muted">Sistema de Gestion Libreria el Saber</p>
        </div>

        {/* -- ALERTA DE ERROR DEL SERVIDOR --
            Renderizado condicional: {condicion && <JSX>} es un patron comun
            en React. Si errorServidor es "" (falsy), React no renderiza nada.
            Si tiene texto (truthy), renderiza la alerta.
            role="alert" es un atributo ARIA que indica a los lectores de
            pantalla que este contenido es importante y debe anunciarse. */}
        {errorServidor && (
          <div className={`alert ${bloqueado ? 'alert-danger' : 'alert-warning'} mb-4`} role="alert">
            <div className="d-flex align-items-start">
              <div className="flex-grow-1">
                <strong className="d-block mb-1">
                  {bloqueado ? 'Cuenta Bloqueada' : 'Error de Autenticacion'}
                </strong>
                <p className="mb-2 small">{mensajeDetallado || errorServidor}</p>

                {/* Barra visual de intentos restantes.
                    El ancho se calcula como porcentaje: (restantes / total) * 100.
                    El color cambia segun la urgencia:
                      2 intentos = verde, 1 = amarillo, 0 = rojo.
                    Esto es UX: el usuario percibe visualmente el peligro. */}
                {intentosRestantes !== null && !bloqueado && (
                  <div className="mt-2">
                    <div className="progress" style={{ height: '8px' }}>
                      <div
                        className={`progress-bar ${
                          intentosRestantes === 2 ? 'bg-success' :
                          intentosRestantes === 1 ? 'bg-warning' : 'bg-danger'
                        }`}
                        style={{ width: `${(intentosRestantes / MAX_INTENTOS) * 100}%` }}
                      />
                    </div>
                    <small className="text-muted mt-1 d-block">
                      Intentos restantes: <strong>{intentosRestantes}</strong> de {MAX_INTENTOS}
                    </small>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -- FORMULARIO DE LOGIN --
            handleSubmit es la funcion de react-hook-form que:
              1. Ejecuta las reglas de validacion de cada campo registrado
              2. Si hay errores, los pone en formState.errors y NO llama nuestra funcion
              3. Si todo pasa, llama manejarLogin({ email, password })

            noValidate: desactiva la validacion HTML5 nativa del navegador
            (los tooltips del navegador). Usamos la de react-hook-form porque
            es mas personalizable y consistente entre navegadores. */}
        <form onSubmit={handleSubmit(manejarLogin)} noValidate>

          {/* -- CAMPO: EMAIL --
              input-group de Bootstrap permite agrupar un icono + input + feedback
              en una sola linea visual. has-validation asegura que los bordes
              redondeados se apliquen correctamente cuando hay mensajes de error. */}
          <div className="mb-4">
            <label className="form-label fw-bold small text-muted">CORREO ELECTRONICO</label>
            <div className="input-group has-validation">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <Icons.User />
              </span>
              {/* register('email', reglas) conecta este input con RHF:
                  - El primer argumento es el nombre del campo en el formulario
                  - El segundo es un objeto con las reglas de validacion
                  - El spread (...) expande las props que RHF necesita
                    (ref, onChange, onBlur, name) directamente en el input */}
              <input
                type="email"
                className={`form-control border-start-0 bg-light ${errors.email ? 'is-invalid' : ''}`}
                placeholder="ejemplo@sena.edu.co"
                disabled={loading}
                autoComplete="email"
                {...register('email', {
                  required: 'El correo electronico es obligatorio',
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: 'El formato del correo no es valido'
                  }
                })}
              />
              {/* invalid-feedback de Bootstrap se muestra automaticamente
                  cuando el input hermano tiene la clase is-invalid */}
              {errors.email && (
                <div className="invalid-feedback">{errors.email.message}</div>
              )}
            </div>
          </div>

          {/* -- CAMPO: CONTRASENA --
              El type alterna entre 'text' y 'password' segun el estado
              mostrarPassword. Esto es lo que permite ver/ocultar la clave. */}
          <div className="mb-4">
            <label className="form-label fw-bold small text-muted">CONTRASENA</label>
            <div className="input-group has-validation">
              <span className="input-group-text bg-light border-end-0 text-muted">
                <Icons.Lock />
              </span>
              {/* minLength: 8 valida que la contrasena tenga al menos
                  8 caracteres. Esta validacion es solo de UX (frontend);
                  el backend tambien valida por seguridad (validacion dual). */}
              <input
                type={mostrarPassword ? 'text' : 'password'}
                className={`form-control border-start-0 border-end-0 bg-light ${errors.password ? 'is-invalid' : ''}`}
                placeholder="••••••"
                disabled={loading}
                autoComplete="current-password"
                {...register('password', {
                  required: 'La contrasena es obligatoria',
                  minLength: {
                    value: 8,
                    message: 'La contrasena debe tener al menos 8 caracteres'
                  }
                })}
              />
              {/* Boton toggle para ver/ocultar contrasena.
                  Usa un operador ternario para alternar entre los dos iconos.
                  aria-label proporciona texto accesible para lectores de pantalla. */}
              <button
                className="btn btn-light border border-start-0 text-muted"
                type="button"
                onClick={() => setMostrarPassword(!mostrarPassword)}
                aria-label={mostrarPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
              >
                {mostrarPassword ? <Icons.EyeSlash /> : <Icons.Eye />}
              </button>
              {errors.password && (
                <div className="invalid-feedback">{errors.password.message}</div>
              )}
            </div>
          </div>

          {/* -- BOTON DE ENVIO --
              Renderizado condicional con ternarios encadenados (condicion ? A : B):
                1. Si bloqueado → texto "CUENTA BLOQUEADA" (btn-danger = rojo)
                2. Si loading → spinner animado + "Validando..."
                3. Si ninguno → texto normal "INGRESAR AL SISTEMA"
              disabled={loading || bloqueado} evita doble clic o envio con cuenta bloqueada.
              d-grid hace que el boton ocupe el 100% del ancho (display: grid). */}
          <div className="d-grid gap-2">
            <button
              type="submit"
              className={`btn ${bloqueado ? 'btn-danger' : 'btn-primary'} py-2 fw-bold`}
              disabled={loading || bloqueado}
            >
              {bloqueado ? (
                'CUENTA BLOQUEADA'
              ) : loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                  Validando...
                </>
              ) : (
                'INGRESAR AL SISTEMA'
              )}
            </button>
          </div>
        </form>

        {/* -- PIE DE PAGINA -- */}
        <div className="text-center mt-4">
          <small className="text-muted">Libreria el Saber &copy; 2026</small>
        </div>
      </div>

      {/* -- MODAL DE DOCUMENTACION --
          Este modal se implementa manualmente con Bootstrap CSS (no el JS de Bootstrap).
          La logica de mostrar/ocultar la controlamos con el estado mostrarDocs.

          Patron "cerrar al hacer clic en el fondo":
          e.target === e.currentTarget verifica que el clic fue en el overlay oscuro
          y NO en el contenido del modal. e.target es donde se hizo clic,
          e.currentTarget es el elemento que tiene el evento (el overlay).

          Suspense envuelve los componentes lazy. Mientras se descargan,
          muestra el fallback (spinner). Sin Suspense, React lanzaria error. */}
      {mostrarDocs && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setMostrarDocs(false); }}
        >
          <div className="modal-dialog modal-xl modal-dialog-scrollable" style={{ maxWidth: '95vw', maxHeight: '95vh' }}>
            <div className="modal-content" style={{ maxHeight: '95vh' }}>
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Documentacion del Proyecto — SGI Libreria El Saber</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setMostrarDocs(false)} />
              </div>

              {/* Pestanas de navegacion renderizadas con .map() sobre un array
                  de configuracion. Esto es mas limpio que escribir 4 <li> manuales
                  y facilita agregar o quitar pestanas en el futuro (principio DRY). */}
              <div className="modal-header p-0 border-0">
                <ul className="nav nav-tabs w-100 border-0">
                  {[
                    { key: 'historias', label: 'Historias de Usuario' },
                    { key: 'criterios', label: 'Criterios de Aceptacion' },
                    { key: 'tecnico', label: 'Manual Tecnico' },
                    { key: 'usuario', label: 'Manual de Usuario' }
                  ].map(tab => (
                    <li className="nav-item" key={tab.key}>
                      <button
                        className={`nav-link ${tabActiva === tab.key ? 'active' : ''}`}
                        onClick={() => setTabActiva(tab.key)}
                        type="button"
                      >
                        {tab.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Contenido de la pestana activa.
                  Solo se renderiza el componente cuya key coincide con tabActiva.
                  Los demas ni se montan en el DOM (short-circuit evaluation). */}
              <div className="modal-body" style={{ overflowY: 'auto' }}>
                <Suspense fallback={
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status" />
                    <p className="mt-2 text-muted">Cargando documentacion...</p>
                  </div>
                }>
                  {tabActiva === 'historias' && <DocumentacionHistorias />}
                  {tabActiva === 'criterios' && <DocumentacionCriterios />}
                  {tabActiva === 'tecnico' && <DocumentacionManualTecnico />}
                  {tabActiva === 'usuario' && <DocumentacionManualUsuario />}
                </Suspense>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setMostrarDocs(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Acceso;