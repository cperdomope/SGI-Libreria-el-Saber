// =====================================================
// COMPONENTE: MODAL PARA CAMBIAR CONTRASENA
// =====================================================
// Este componente renderiza una ventana emergente (modal) que permite
// a CUALQUIER usuario del sistema cambiar su propia contrasena.
// Se abre desde el menu desplegable de usuario en la BarraNavegacion.
//
// Flujo de funcionamiento:
//   1. El usuario hace clic en "Cambiar Contrasena" en la BarraNavegacion
//   2. BarraNavegacion cambia el estado visible=true y se abre este modal
//   3. El usuario llena los 3 campos: contrasena actual, nueva y confirmacion
//   4. Al enviar, se valida en el frontend (evita peticiones innecesarias)
//   5. Si pasa la validacion, se hace PATCH /api/usuarios/cambiar-password
//   6. El backend verifica la contrasena actual con bcrypt
//   7. Si es correcta, hashea la nueva contrasena y la guarda en la BD
//
// Patron de comunicacion padre-hijo con props:
//   Este componente recibe dos props desde BarraNavegacion:
//   - visible (booleano): controla si el modal se muestra o no
//   - onCerrar (funcion callback): funcion que el padre pasa para que
//     este componente pueda "avisarle" que se cierre el modal.
//     Es un patron comun en React: el estado vive en el padre y
//     el hijo le avisa cuando debe cambiarlo.
//
// Conceptos aplicados:
//   - useState: multiples estados para formulario, errores y carga
//   - Validacion en frontend: mejora la UX dando feedback inmediato
//   - Peticiones HTTP con async/await y manejo de errores try/catch
//   - Renderizado condicional: if (!visible) return null
//   - Spread operator (...form): para actualizar campos individuales
// =====================================================

// useState: hook de React para manejar estado local.
// Lo usamos para controlar los valores del formulario, los mensajes
// de error/exito y el estado de carga del boton.
import { useState } from 'react';

// api: instancia de Axios preconfigurada en services/api.js.
// Axios es una libreria para hacer peticiones HTTP (GET, POST, PATCH, etc.)
// Nuestra instancia 'api' ya tiene configurado:
//   - La URL base del servidor (ej: http://localhost:3001/api)
//   - Un interceptor que agrega automaticamente el token JWT en el
//     header Authorization de cada peticion, para que el backend
//     pueda verificar que el usuario esta autenticado.
import api from '../services/api';


// =====================================================
// COMPONENTE FUNCIONAL: ModalCambiarPassword
// =====================================================
// Recibe dos props por desestructuracion:
//   - visible: booleano que indica si el modal debe mostrarse
//   - onCerrar: funcion callback del componente padre para cerrar el modal

const ModalCambiarPassword = ({ visible, onCerrar }) => {

  // ---------------------------------------------------------
  // ESTADOS DEL COMPONENTE (useState)
  // ---------------------------------------------------------
  // En React, el "estado" es informacion que puede cambiar con el
  // tiempo y que, al cambiar, provoca que el componente se vuelva
  // a renderizar (re-render) para reflejar los nuevos datos en la UI.

  // Estado del formulario: un objeto con los 3 campos.
  // Usamos un solo useState con un objeto en lugar de 3 useState
  // separados porque los campos estan logicamente relacionados
  // (todos pertenecen al mismo formulario).
  const [form, setForm] = useState({
    passwordActual: '',       // La contrasena que el usuario usa actualmente
    passwordNueva: '',        // La nueva contrasena que quiere establecer
    passwordConfirmacion: ''  // Repeticion de la nueva contrasena (evita errores de tipeo)
  });

  // Estado para mensajes de retroalimentacion al usuario.
  // Solo uno de estos dos estara activo a la vez (error O exito).
  const [error, setError] = useState('');   // Mensaje en rojo (alert-danger)
  const [exito, setExito] = useState('');   // Mensaje en verde (alert-success)

  // Estado de carga: indica si la peticion HTTP esta en curso.
  // Mientras es true, el boton de enviar se deshabilita para evitar
  // que el usuario haga doble clic y envie la peticion dos veces.
  const [guardando, setGuardando] = useState(false);


  // ---------------------------------------------------------
  // FUNCION: cerrar
  // ---------------------------------------------------------
  // Cierra el modal y reinicia todos los estados a sus valores
  // iniciales. Esto es importante para que la proxima vez que el
  // usuario abra el modal, encuentre el formulario limpio sin
  // datos ni mensajes de la sesion anterior.

  const cerrar = () => {
    setForm({ passwordActual: '', passwordNueva: '', passwordConfirmacion: '' });
    setError('');
    setExito('');
    onCerrar(); // Ejecutamos el callback del padre para que cambie visible=false
  };


  // ---------------------------------------------------------
  // FUNCION: manejarEnvio (evento submit del formulario)
  // ---------------------------------------------------------
  // Esta funcion es "async" porque hace una peticion HTTP al backend
  // que tarda un tiempo en responder. "async/await" nos permite
  // escribir codigo asincrono (que espera respuestas) de forma
  // secuencial y legible, en lugar de usar .then().then().then()
  //
  // Recibe el evento "e" del formulario (evento submit del DOM).

  const manejarEnvio = async (e) => {
    // preventDefault() evita el comportamiento por defecto del formulario
    // HTML, que es recargar toda la pagina al enviarse. En una SPA
    // (Single Page Application) NUNCA queremos recargar la pagina;
    // en su lugar, manejamos el envio con JavaScript.
    e.preventDefault();

    // Limpiamos mensajes previos antes de una nueva validacion
    setError('');
    setExito('');

    // ---------------------------------------------------------
    // VALIDACIONES EN EL FRONTEND
    // ---------------------------------------------------------
    // Validamos los datos ANTES de enviarlos al servidor. Esto
    // mejora la experiencia del usuario (UX) porque:
    //   - El feedback es instantaneo (no espera respuesta del servidor)
    //   - Ahorra ancho de banda (no envia peticiones que van a fallar)
    //   - Reduce carga en el servidor
    //
    // IMPORTANTE: estas validaciones son solo para UX. El backend
    // TAMBIEN valida porque un usuario malicioso podria saltarse
    // el frontend enviando peticiones directamente con Postman o curl.
    //
    // El patron "return setError(...)" aprovecha que setError retorna
    // undefined, y "return undefined" sale de la funcion inmediatamente,
    // evitando que se ejecute el codigo posterior.

    if (!form.passwordActual) {
      return setError('Ingrese su contrasena actual');
    }
    if (form.passwordNueva.length < 8) {
      return setError('La nueva contrasena debe tener al menos 8 caracteres');
    }
    if (form.passwordNueva !== form.passwordConfirmacion) {
      return setError('La nueva contrasena y la confirmacion no coinciden');
    }
    if (form.passwordActual === form.passwordNueva) {
      return setError('La nueva contrasena debe ser diferente a la actual');
    }

    // ---------------------------------------------------------
    // PETICION HTTP AL BACKEND
    // ---------------------------------------------------------
    // Usamos try/catch/finally para manejar errores de forma elegante.
    //   try: intenta ejecutar el codigo (puede fallar si el servidor
    //        responde con error o si no hay conexion)
    //   catch: captura el error si algo fallo en el try
    //   finally: se ejecuta SIEMPRE, haya o no error (ideal para
    //            limpiar estados como "guardando")

    try {
      setGuardando(true); // Deshabilitamos el boton de envio

      // PATCH: metodo HTTP para actualizaciones parciales.
      // A diferencia de PUT (que reemplaza el recurso completo),
      // PATCH solo modifica los campos que se envian.
      // En este caso, solo actualizamos la contrasena del usuario.
      await api.patch('/usuarios/cambiar-password', {
        passwordActual: form.passwordActual,
        passwordNueva: form.passwordNueva,
        passwordConfirmacion: form.passwordConfirmacion
      });

      // Si llegamos aqui sin errores, el cambio fue exitoso
      setExito('Contrasena actualizada exitosamente');

      // Limpiamos el formulario y cerramos el modal automaticamente
      // despues de 2 segundos para que el usuario alcance a leer
      // el mensaje de exito. setTimeout es una funcion de JavaScript
      // que ejecuta una funcion despues de X milisegundos.
      setForm({ passwordActual: '', passwordNueva: '', passwordConfirmacion: '' });
      setTimeout(cerrar, 2000);

    } catch (err) {
      // Si el backend respondio con un error HTTP (400, 401, 500, etc.),
      // Axios lo captura aqui. Extraemos el mensaje de error del backend
      // usando encadenamiento opcional (?.) por si alguna propiedad no existe.
      // El operador || proporciona un mensaje generico como fallback.
      const mensaje = err.response?.data?.mensaje || 'Error al cambiar la contrasena';
      setError(mensaje);
    } finally {
      // Rehabilitamos el boton sin importar si hubo exito o error
      setGuardando(false);
    }
  };


  // ---------------------------------------------------------
  // RENDERIZADO CONDICIONAL
  // ---------------------------------------------------------
  // Si visible es false, retornamos null (nada). React no renderiza
  // null en el DOM, asi que el modal simplemente desaparece.
  // Este patron se llama "early return" (retorno temprano) y es
  // mas limpio que envolver todo el JSX en un {visible && (...)}.
  if (!visible) return null;


  // ---------------------------------------------------------
  // JSX DEL MODAL
  // ---------------------------------------------------------
  // Construimos el modal manualmente con clases de Bootstrap 5
  // en lugar de usar el sistema de modales JavaScript de Bootstrap.
  // Esto nos da control total desde React sobre cuando se muestra
  // y cuando se oculta, ya que React maneja el DOM virtual.

  return (
    // ── FONDO OSCURO (backdrop) ──
    // El div exterior cubre toda la pantalla con un fondo negro
    // semitransparente (rgba con opacidad 0.5). "d-block" lo hace
    // visible (Bootstrap lo oculta por defecto). zIndex: 1060
    // lo posiciona por encima de todos los demas elementos.
    //
    // onClick: si el usuario hace clic en el fondo oscuro (no en el
    // modal), lo cerramos. e.target === e.currentTarget verifica que
    // el clic fue en este div exacto y no en un elemento hijo.
    // Sin esta verificacion, cualquier clic DENTRO del modal tambien
    // lo cerraria (porque los eventos "burbujean" hacia arriba en el DOM).
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}
      onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}
    >
      {/* modal-sm: modal de tamano pequeno (max-width: 300px).
          Suficiente para un formulario de 3 campos. */}
      <div className="modal-dialog modal-sm">
        <div className="modal-content">

          {/* ── ENCABEZADO DEL MODAL ──
              bg-warning: fondo amarillo de Bootstrap, usado para
              indicar precaucion (cambiar la contrasena es una
              accion sensible). btn-close: boton X de Bootstrap. */}
          <div className="modal-header bg-warning text-dark">
            <h5 className="modal-title">Cambiar Contrasena</h5>
            <button type="button" className="btn-close" onClick={cerrar} />
          </div>

          {/* ── FORMULARIO ──
              Envolvemos los campos en <form> para que el evento
              onSubmit se dispare al presionar Enter o al hacer
              clic en el boton de tipo "submit". */}
          <form onSubmit={manejarEnvio}>
            <div className="modal-body">

              {/* Mensajes de retroalimentacion al usuario.
                  Usamos renderizado condicional con && :
                  si 'error' es un string vacio (falsy), no se renderiza.
                  Si tiene texto (truthy), se muestra el alert. */}
              {error && <div className="alert alert-danger py-2 small">{error}</div>}
              {exito && <div className="alert alert-success py-2 small">{exito}</div>}

              {/* ── CAMPO: Contrasena actual ──
                  type="password" oculta el texto con puntos.
                  autoComplete="current-password" le indica al navegador
                  que puede sugerir la contrasena guardada. */}
              <div className="mb-3">
                <label className="form-label fw-semibold small">Contrasena Actual *</label>
                <input
                  type="password"
                  className="form-control form-control-sm"
                  value={form.passwordActual}
                  onChange={(e) => setForm({ ...form, passwordActual: e.target.value })}
                  placeholder="Tu contrasena actual"
                  autoComplete="current-password"
                  required
                />
              </div>

              {/* ── CAMPO: Nueva contrasena ──
                  minLength={8} es una validacion HTML5 nativa que
                  complementa nuestra validacion en JavaScript. */}
              <div className="mb-3">
                <label className="form-label fw-semibold small">Nueva Contrasena *</label>
                <input
                  type="password"
                  className="form-control form-control-sm"
                  value={form.passwordNueva}
                  onChange={(e) => setForm({ ...form, passwordNueva: e.target.value })}
                  placeholder="Minimo 8 caracteres"
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </div>

              {/* ── CAMPO: Confirmar nueva contrasena ──
                  autoComplete="new-password" en ambos campos de
                  contrasena nueva ayuda al navegador a entender que
                  el usuario esta creando una nueva contrasena. */}
              <div className="mb-2">
                <label className="form-label fw-semibold small">Confirmar Nueva Contrasena *</label>
                <input
                  type="password"
                  className="form-control form-control-sm"
                  value={form.passwordConfirmacion}
                  onChange={(e) => setForm({ ...form, passwordConfirmacion: e.target.value })}
                  placeholder="Repite la nueva contrasena"
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            {/* ── BOTONES DEL MODAL ──
                El boton "Cancelar" es type="button" para que NO dispare
                el submit del formulario. El boton "Cambiar" es type="submit"
                para que SI lo dispare. "disabled={guardando}" lo deshabilita
                mientras la peticion esta en curso. */}
            <div className="modal-footer py-2">
              <button type="button" className="btn btn-sm btn-secondary" onClick={cerrar}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-sm btn-warning" disabled={guardando}>
                {guardando ? 'Guardando...' : 'Cambiar Contrasena'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Exportamos el componente para usarlo en BarraNavegacion.jsx
export default ModalCambiarPassword;
