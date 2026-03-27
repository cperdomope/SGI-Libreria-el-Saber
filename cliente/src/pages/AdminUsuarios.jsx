// =====================================================
// PAGINA: ADMINISTRACION DE USUARIOS (CRUD completo)
// =====================================================
// Esta pagina permite al Administrador gestionar los usuarios del sistema.
// Implementa las 4 operaciones CRUD (Create, Read, Update, Delete):
//   - CREATE: formulario modal para crear nuevos usuarios con rol asignado
//   - READ:   tabla con todos los usuarios registrados en el sistema
//   - UPDATE: mismo modal reutilizado para editar datos existentes
//   - DELETE: en lugar de eliminar, se usa "soft delete" (desactivar)
//
// Conexion con el sistema:
//   - Ruta: /admin/usuarios (protegida por RutaProtegidaPorRol, solo Admin)
//   - API endpoints utilizados:
//      GET    /api/usuarios           -> listar todos los usuarios
//      POST   /api/usuarios           -> crear nuevo usuario
//      PUT    /api/usuarios/:id       -> actualizar datos (sin contrasena)
//      PATCH  /api/usuarios/:id/estado -> toggle activar/desactivar
//   - Los usuarios creados aqui son los que hacen login en Acceso.jsx
//   - El rol (Admin=1, Vendedor=2) define los permisos via AuthContext
//
// Conceptos clave aplicados:
//   - CRUD: patron fundamental en desarrollo de software. Casi toda
//     aplicacion web necesita Crear, Leer, Actualizar y Eliminar datos.
//   - Soft delete: en lugar de borrar registros de la BD (DELETE), se cambia
//     un campo "estado" a inactivo. Esto preserva la integridad referencial
//     y permite auditar historicamente quien fue usuario del sistema.
//   - shouldUnregister (RHF): cuando un campo no se renderiza en el DOM,
//     react-hook-form lo desregistra y no exige su validacion. Asi el mismo
//     formulario sirve para crear (con contrasena) y editar (sin contrasena).
//   - Modal controlado por estado: el modal se muestra/oculta con un useState,
//     no con el JavaScript de Bootstrap. Esto da mas control a React.
// =====================================================

// useState: maneja multiples estados locales de este componente
// useEffect: ejecuta la carga inicial de usuarios al montar el componente
import { useState, useEffect } from 'react';

// react-hook-form: simplifica formularios complejos con validacion.
// Aqui usamos una funcionalidad avanzada: shouldUnregister, que permite
// que el mismo formulario sirva para crear Y editar usuarios, ocultando
// el campo de contrasena cuando estamos en modo edicion.
import { useForm } from 'react-hook-form';

// api: instancia de Axios preconfigurada. Ya incluye la URL base del
// servidor y un interceptor que adjunta el token JWT en cada peticion.
import api from '../services/api';

// useAuth: hook del contexto global de autenticacion.
// Lo usamos para obtener el usuario actual y asi evitar que el admin
// pueda desactivarse a si mismo (lo cual lo dejaria fuera del sistema).
import { useAuth } from '../context/AuthContext';

// -- Icono SVG para el boton de editar --
// Componente funcional puro: no tiene estado ni efectos, solo retorna JSX.
// Se define fuera del componente principal porque su contenido NUNCA cambia,
// asi React no lo recrea en cada render (optimizacion de rendimiento).
const IconoEditar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/>
  </svg>
);

// =====================================================
// COMPONENTE PRINCIPAL: AdminUsuarios
// =====================================================

const AdminUsuarios = () => {
  // Desestructuramos "usuario" del contexto y lo renombramos a "usuarioActual".
  // Esto es sintaxis de desestructuracion con alias: { usuario: nuevoNombre }.
  // Lo necesitamos para comparar IDs y evitar que el admin se desactive a si mismo.
  const { usuario: usuarioActual } = useAuth();

  // -- Estados de datos y carga --
  // Separamos los estados en dos grupos logicos: datos de la API y control de UI.
  const [usuarios, setUsuarios]   = useState([]);     // Array de usuarios del backend
  const [cargando, setCargando]   = useState(true);   // true mientras se hace fetch inicial
  const [error, setError]         = useState(null);   // Error de la peticion GET (carga)
  const [guardando, setGuardando] = useState(false);  // true mientras se guarda (POST/PUT)

  // -- Estados de control del modal --
  // Un solo modal sirve para crear Y editar. La variable "esEdicion" determina
  // el modo actual. Esto es el patron "modal reutilizable": en lugar de tener
  // dos modales (uno para crear y otro para editar), usamos uno solo y cambiamos
  // su comportamiento segun el contexto. Reduce duplicacion de codigo (DRY).
  const [mostrarModal, setMostrarModal] = useState(false);
  const [esEdicion, setEsEdicion]       = useState(false);
  const [idEditando, setIdEditando]     = useState(null);

  // Error especifico del servidor al guardar (ej: "email ya registrado")
  const [errorServidor, setErrorServidor] = useState('');

  // -- react-hook-form: inicializacion con shouldUnregister --
  // La opcion shouldUnregister: true es CLAVE en este componente.
  // Por defecto, RHF mantiene los valores de todos los campos registrados
  // aunque se desmonen del DOM. Con shouldUnregister: true, cuando el campo
  // "password" desaparece (modo edicion), RHF lo elimina de su registro
  // interno y NO lo incluye en la validacion ni en los datos del submit.
  // Esto permite reutilizar el mismo formulario para crear (CON contrasena)
  // y editar (SIN contrasena) sin logica adicional.
  //
  // reset(): funcion de RHF que establece o reinicia los valores del formulario.
  // La usamos para precargar datos al abrir el modal en modo edicion.
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({ shouldUnregister: true });

  // -- Funcion: cargar lista de usuarios desde la API --
  // Es async porque realiza una peticion HTTP (operacion asincrona).
  // Se usa tanto en la carga inicial como despues de crear/editar/cambiar estado.
  const cargarUsuarios = async () => {
    try {
      setCargando(true);
      // GET /api/usuarios: el backend retorna { datos: [...usuarios] }
      const respuesta = await api.get('/usuarios');
      // Operador || (OR logico): si respuesta.data.datos es null/undefined,
      // usamos un array vacio como fallback para evitar errores en .map()
      setUsuarios(respuesta.data.datos || []);
      setError(null);
    } catch (err) {
      setError('Error al cargar los usuarios del sistema');
      // import.meta.env.DEV es una variable de Vite que es true solo en
      // desarrollo. Asi el console.error NO aparece en produccion (buena practica).
      if (import.meta.env.DEV) console.error('[AdminUsuarios]', err);
    } finally {
      setCargando(false);
    }
  };

  // useEffect con array de dependencias vacio [] se ejecuta UNA sola vez:
  // cuando el componente se monta en el DOM por primera vez.
  // Es el equivalente a componentDidMount() en componentes de clase.
  useEffect(() => {
    cargarUsuarios();
  }, []);

  // -- Funciones del modal: preparar contexto antes de abrir --
  // Estas funciones configuran los estados que determinan si el modal
  // se comporta como "crear" o "editar". Es el patron de modal reutilizable.

  // Preparar modal para CREAR un usuario nuevo
  const abrirModalNuevo = () => {
    setEsEdicion(false);
    setIdEditando(null);
    setErrorServidor('');
    // reset() de RHF establece valores iniciales en todos los campos.
    // rol_id: 2 (Vendedor) es el valor por defecto porque es el rol mas comun.
    reset({ nombre_completo: '', email: '', password: '', rol_id: 2 });
    setMostrarModal(true);
  };

  // Preparar modal para EDITAR un usuario existente
  const abrirModalEditar = (usuario) => {
    setEsEdicion(true);
    setIdEditando(usuario.id);
    setErrorServidor('');
    // reset() precarga los datos actuales del usuario en los campos.
    // Notar que password NO se incluye: como shouldUnregister es true
    // y el campo no se renderiza en modo edicion, RHF no lo exige.
    reset({
      nombre_completo: usuario.nombre_completo,
      email:           usuario.email,
      rol_id:          usuario.rol_id
    });
    setMostrarModal(true);
  };

  // Cerrar modal y limpiar todo el estado relacionado
  const cerrarModal = () => {
    setMostrarModal(false);
    setErrorServidor('');
    // reset() sin argumentos limpia todos los campos del formulario
    reset();
  };

  // -- Funcion: guardar usuario (crear o editar segun el modo) --
  // handleSubmit() de RHF llama esta funcion SOLO si la validacion pasa.
  // Recibe un objeto "data" con los valores de los campos registrados.
  // En modo creacion: { nombre_completo, email, password, rol_id }
  // En modo edicion:  { nombre_completo, email, rol_id } (sin password)
  const guardarUsuario = async (data) => {
    setErrorServidor('');
    try {
      setGuardando(true);

      if (esEdicion) {
        // PUT: metodo HTTP para actualizacion completa de un recurso.
        // parseInt() convierte el string del <select> a numero entero,
        // ya que los valores de los <option> siempre son strings en HTML.
        await api.put(`/usuarios/${idEditando}`, {
          nombre_completo: data.nombre_completo,
          email:           data.email,
          rol_id:          parseInt(data.rol_id)
        });
      } else {
        // POST: metodo HTTP para crear un nuevo recurso.
        // Aqui si enviamos password porque es un usuario nuevo.
        await api.post('/usuarios', {
          nombre_completo: data.nombre_completo,
          email:           data.email,
          password:        data.password,
          rol_id:          parseInt(data.rol_id)
        });
      }

      cerrarModal();       // Cerramos el modal
      cargarUsuarios();    // Recargamos la lista para reflejar los cambios
    } catch (err) {
      // Mostramos el error del servidor dentro del modal (no alert).
      // Errores comunes: "El email ya esta registrado", "Datos invalidos", etc.
      setErrorServidor(err.response?.data?.mensaje || 'Error al guardar el usuario');
    } finally {
      setGuardando(false);
    }
  };

  // -- Funcion: activar o desactivar un usuario (soft delete) --
  // En lugar de eliminar el registro de la BD (hard delete), cambiamos
  // el campo "estado" entre 1 (activo) y 0 (inactivo). Esto se conoce
  // como "soft delete" y tiene ventajas:
  //   - Preserva la integridad referencial (ventas asociadas al usuario)
  //   - Permite reactivar la cuenta en el futuro
  //   - Mantiene el historial completo para auditorias
  const cambiarEstado = async (usuario) => {
    // Template literal con ternario para construir el mensaje de confirmacion
    const accion = usuario.estado === 1 ? 'desactivar' : 'activar';
    // window.confirm() muestra un dialogo nativo del navegador.
    // Retorna true si el usuario acepta, false si cancela.
    // El "!" niega el resultado: si cancela, salimos de la funcion (return).
    if (!window.confirm(`Desea ${accion} al usuario "${usuario.nombre_completo}"?`)) return;

    try {
      // PATCH: metodo HTTP para actualizacion PARCIAL de un recurso.
      // A diferencia de PUT (actualizacion completa), PATCH modifica
      // solo un campo especifico (en este caso, el estado).
      await api.patch(`/usuarios/${usuario.id}/estado`);
      cargarUsuarios();
    } catch (err) {
      alert(err.response?.data?.mensaje || 'Error al cambiar el estado');
    }
  };

  // -- Funcion utilitaria: formatear fecha para mostrar en la tabla --
  // toLocaleDateString('es-CO') formatea la fecha segun la convencion
  // colombiana (dd/mm/yyyy). Si la fecha es null, mostramos "Nunca".
  const formatearFecha = (fecha) =>
    fecha ? new Date(fecha).toLocaleDateString('es-CO') : 'Nunca';

  // =====================================================
  // RENDERIZADO (JSX)
  // =====================================================

  // -- Early return: patron de retorno anticipado --
  // Si los datos aun estan cargando, retornamos SOLO el spinner.
  // Esto evita renderizar una tabla vacia o con datos incompletos.
  // Es una buena practica: manejar los estados excepcionales primero
  // y dejar el return principal para el caso normal (datos listos).
  if (cargando) {
    return (
      <div className="container mt-4 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* card de Bootstrap: contenedor con sombra, header y body */}
      <div className="card shadow-sm">

        {/* -- ENCABEZADO: titulo + boton crear --
            flex-wrap + gap-2: en pantallas pequenas, el boton baja
            debajo del titulo en lugar de desbordarse (responsive).
            clamp(1rem, 3vw, 1.4rem): funcion CSS que hace el tamano
            de fuente responsivo, con un minimo de 1rem y maximo de 1.4rem. */}
        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center flex-wrap gap-2">
          <h4 className="mb-0" style={{ fontSize: 'clamp(1rem, 3vw, 1.4rem)' }}>Gestion de Usuarios</h4>
          <button className="btn btn-sm btn-light flex-shrink-0" onClick={abrirModalNuevo}>
            + Nuevo Usuario
          </button>
        </div>

        <div className="card-body">
          {/* Renderizado condicional: solo muestra la alerta si hay error */}
          {error && <div className="alert alert-danger">{error}</div>}

          {/* -- TABLA DE USUARIOS --
              table-responsive: agrega scroll horizontal en pantallas pequenas.
              table-hover: resalta la fila al pasar el mouse (mejor UX).
              align-middle: centra verticalmente el contenido de las celdas. */}
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead className="table-dark">
                <tr>
                  <th>Nombre</th>
                  {/* Clases responsive de Bootstrap para ocultar columnas:
                      d-none: oculto por defecto (movil)
                      d-md-table-cell: visible a partir de 768px (tablet)
                      d-lg-table-cell: visible a partir de 992px (desktop)
                      Esto mantiene la tabla legible en todas las pantallas. */}
                  <th className="d-none d-md-table-cell">Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th className="d-none d-lg-table-cell">Ultimo Acceso</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {/* Ternario: si no hay usuarios, mostramos mensaje.
                    colSpan="6" hace que la celda ocupe las 6 columnas. */}
                {usuarios.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center text-muted py-4">
                      No hay usuarios registrados
                    </td>
                  </tr>
                ) : (
                  // .map() transforma cada objeto "usr" del array en una fila <tr>.
                  // key={usr.id} es OBLIGATORIO en listas de React: permite al
                  // algoritmo de reconciliacion (diffing) identificar que elemento
                  // cambio, se agrego o se elimino, optimizando los re-renders.
                  usuarios.map((usr) => (
                    <tr key={usr.id}>
                      <td>
                        <div className="fw-semibold">{usr.nombre_completo}</div>
                        {/* En movil, el email se muestra debajo del nombre
                            (ya que la columna Email esta oculta con d-none) */}
                        <small className="text-muted d-md-none">{usr.email}</small>
                        {/* Indicador "(Tu)" para que el admin identifique su propia cuenta.
                            Encadenamiento opcional (?.) por si usuarioActual es null. */}
                        {usr.id === usuarioActual?.id && (
                          <small className="text-primary d-block">(Tu)</small>
                        )}
                      </td>
                      <td className="text-muted d-none d-md-table-cell">{usr.email}</td>
                      {/* Badges: componentes visuales de Bootstrap para etiquetar.
                          El color cambia segun el rol/estado con ternarios. */}
                      <td>
                        <span className={`badge ${usr.rol_id === 1 ? 'bg-danger' : 'bg-info'}`}>
                          {usr.rol_id === 1 ? 'Admin' : 'Vendedor'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${usr.estado === 1 ? 'bg-success' : 'bg-secondary'}`}>
                          {usr.estado === 1 ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="text-muted small d-none d-lg-table-cell">{formatearFecha(usr.ultimo_acceso)}</td>
                      <td>
                        <div className="d-flex align-items-center gap-1">
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => abrirModalEditar(usr)}
                            title="Editar datos"
                          >
                            <IconoEditar />
                          </button>
                          {/* El boton de desactivar NO aparece para el usuario actual.
                              Esto es una regla de negocio: el admin no puede
                              desactivarse a si mismo porque perderia acceso al sistema
                              y nadie podria reactivarlo (se quedaria bloqueado). */}
                          {usr.id !== usuarioActual?.id && (
                            <button
                              className={`btn btn-sm ${usr.estado === 1 ? 'btn-outline-danger' : 'btn-outline-success'}`}
                              onClick={() => cambiarEstado(usr)}
                              title={usr.estado === 1 ? 'Desactivar usuario' : 'Activar usuario'}
                            >
                              {usr.estado === 1 ? 'Desactivar' : 'Activar'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <small className="text-muted">
            Total: {usuarios.length} usuario(s) registrado(s)
          </small>
        </div>
      </div>

      {/* -- MODAL: Crear o Editar Usuario --
          Modal controlado por estado React (mostrarModal), no por Bootstrap JS.
          Ventaja: React controla completamente cuando se muestra/oculta,
          lo que es mas predecible y evita conflictos con el Virtual DOM.

          "modal show d-block": combinacion de clases que muestra el modal.
          Normalmente Bootstrap usa JS para agregar "show" y cambiar display,
          pero aqui lo hacemos manualmente con clases CSS.

          Patron "cerrar al clic en fondo":
          e.target === e.currentTarget verifica que se hizo clic en el
          overlay oscuro y no dentro del contenido del modal. */}
      {mostrarModal && (
        <div
          className="modal show d-block"
          tabIndex="-1"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              {/* El titulo del modal cambia segun el modo (crear vs editar).
                  Esto refuerza visualmente en que operacion estamos. */}
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title">
                  {esEdicion ? 'Editar Usuario' : 'Nuevo Usuario'}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={cerrarModal} />
              </div>

              {/* handleSubmit de RHF envuelve guardarUsuario: primero valida
                  todos los campos, y solo si TODOS pasan, llama guardarUsuario.
                  noValidate desactiva la validacion HTML5 nativa del navegador. */}
              <form onSubmit={handleSubmit(guardarUsuario)} noValidate>
                <div className="modal-body">

                  {/* Error del servidor: se muestra DENTRO del modal para que
                      el usuario lo vea sin perder el contexto del formulario */}
                  {errorServidor && (
                    <div className="alert alert-danger py-2">{errorServidor}</div>
                  )}

                  {/* -- NOMBRE COMPLETO --
                      Tres reglas de validacion: required + minLength + maxLength.
                      maxLength: 100 coincide con el VARCHAR(100) de la BD. */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Nombre Completo *</label>
                    <input
                      type="text"
                      className={`form-control ${errors.nombre_completo ? 'is-invalid' : ''}`}
                      placeholder="Nombre y apellido"
                      {...register('nombre_completo', {
                        required: 'El nombre completo es obligatorio',
                        minLength: {
                          value: 3,
                          message: 'El nombre debe tener al menos 3 caracteres'
                        },
                        maxLength: {
                          value: 100,
                          message: 'El nombre no puede superar 100 caracteres'
                        }
                      })}
                    />
                    {errors.nombre_completo && (
                      <div className="invalid-feedback">{errors.nombre_completo.message}</div>
                    )}
                  </div>

                  {/* -- EMAIL --
                      La regex /\S+@\S+\.\S+/ es una validacion basica de email:
                      \S+ = uno o mas caracteres que no sean espacio
                      @ = arroba literal
                      \. = punto literal
                      Es suficiente para UX; la validacion real la hace el backend. */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Email *</label>
                    <input
                      type="email"
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      placeholder="usuario@ejemplo.com"
                      {...register('email', {
                        required: 'El email es obligatorio',
                        pattern: {
                          value: /\S+@\S+\.\S+/,
                          message: 'El formato del email no es valido'
                        }
                      })}
                    />
                    {errors.email && (
                      <div className="invalid-feedback">{errors.email.message}</div>
                    )}
                  </div>

                  {/* -- CONTRASENA (solo al CREAR, no al editar) --
                      Este es el campo que demuestra el poder de shouldUnregister.
                      Cuando esEdicion es true, el bloque {!esEdicion && ...} no
                      se renderiza, el <input> desaparece del DOM, y RHF lo
                      desregistra automaticamente. El resultado: al enviar el
                      formulario de edicion, "password" no existe en los datos. */}
                  {!esEdicion && (
                    <div className="mb-3">
                      <label className="form-label fw-semibold">Contrasena *</label>
                      <input
                        type="password"
                        className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                        placeholder="Minimo 8 caracteres"
                        {...register('password', {
                          required: 'La contrasena es obligatoria',
                          minLength: {
                            value: 8,
                            message: 'La contrasena debe tener al menos 8 caracteres'
                          }
                        })}
                      />
                      {errors.password && (
                        <div className="invalid-feedback">{errors.password.message}</div>
                      )}
                      <small className="text-muted">
                        Para cambiar contrasena de usuario existente, use "Cambiar Contrasena" en el menu.
                      </small>
                    </div>
                  )}

                  {/* -- ROL (Administrador o Vendedor) --
                      <select> con register() funciona igual que un <input>.
                      RHF captura el value del <option> seleccionado.
                      Importante: los values de <option> siempre son strings,
                      por eso usamos parseInt() al enviar al backend. */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">Rol *</label>
                    <select
                      className={`form-select ${errors.rol_id ? 'is-invalid' : ''}`}
                      {...register('rol_id', {
                        required: 'El rol es obligatorio'
                      })}
                    >
                      <option value={1}>Administrador</option>
                      <option value={2}>Vendedor</option>
                    </select>
                    {errors.rol_id && (
                      <div className="invalid-feedback">{errors.rol_id.message}</div>
                    )}
                    <small className="text-muted">
                      Administrador: acceso total. Vendedor: solo ventas y consultas.
                    </small>
                  </div>

                </div>

                {/* -- Botones del pie del modal --
                    Ternarios encadenados para el texto del boton:
                    guardando ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Crear Usuario'
                    disabled={guardando} evita doble clic mientras se procesa. */}
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={cerrarModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-dark" disabled={guardando}>
                    {guardando ? 'Guardando...' : esEdicion ? 'Guardar Cambios' : 'Crear Usuario'}
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsuarios;