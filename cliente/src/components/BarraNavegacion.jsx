// =====================================================
// COMPONENTE: BARRA DE NAVEGACION PRINCIPAL
// =====================================================
// Este componente renderiza el menu de navegacion superior que
// aparece en TODAS las paginas del sistema cuando hay un usuario
// autenticado. Es el punto de acceso principal a todos los modulos.
//
// Se conecta con el AuthContext para obtener:
//   - Los datos del usuario logueado (nombre, rol)
//   - La funcion tienePermiso() para mostrar/ocultar opciones segun el rol
//   - La funcion logout() para cerrar sesion
//
// El menu se adapta al rol del usuario mediante renderizado condicional:
//   {tienePermiso('verDashboard') && (<Link>Dashboard</Link>)}
//   Esto significa: "solo renderiza este Link si el usuario tiene
//   el permiso 'verDashboard'". Los permisos estan definidos en la
//   matriz PERMISOS del AuthContext.
//
// Secciones del menu:
//   - Dashboard: solo Admin (vista panoramica del negocio)
//   - Gestion Comercial: Ventas, Historial, Clientes
//   - Logistica: Inventario, Movimientos, Autores, Categorias, Proveedores
//   - Usuario: Cambiar contrasena, Gestion usuarios (Admin), Cerrar sesion
//
// Conceptos de React aplicados aqui:
//   - useState: para controlar la visibilidad del modal de contrasena
//   - useLocation (React Router): para saber en que pagina estamos
//     y resaltar la opcion activa del menu
//   - Renderizado condicional: operador && para mostrar/ocultar
//     elementos segun permisos del rol
//   - Componentes reutilizables: Icono() es un componente generico
//     que recibe props para renderizar cualquier icono SVG
// =====================================================

// useState: hook de React para manejar estado local del componente.
// Un hook es una funcion especial de React que permite "enganchar"
// funcionalidades (estado, efectos, contexto) dentro de componentes
// funcionales. Antes de los hooks, esto solo era posible con clases.
import { useState } from 'react';

// React Router: libreria de enrutamiento para aplicaciones SPA.
// Link: crea enlaces que navegan sin recargar la pagina completa
//   (a diferencia de <a href> que recarga todo el navegador).
// useLocation: hook que retorna la ruta actual del navegador
//   (ej: { pathname: '/ventas' }). Lo usamos para resaltar
//   la opcion activa del menu.
import { Link, useLocation } from 'react-router-dom';

// useAuth: hook personalizado que creamos en AuthContext.jsx.
// Nos da acceso al estado global de autenticacion sin necesidad
// de pasar props por multiples niveles de componentes (evita
// el problema conocido como "prop drilling").
import { useAuth } from '../context/AuthContext';

// ModalCambiarPassword: componente que muestra un formulario modal
// (ventana emergente) para que el usuario cambie su contrasena.
// Se controla con el estado 'mostrarCambioPassword'.
import ModalCambiarPassword from './ModalCambiarPassword';


// ---------------------------------------------------------
// IMPORTACION DE ICONOS SVG
// ---------------------------------------------------------
// SVG (Scalable Vector Graphics) es un formato de imagen vectorial.
// A diferencia de PNG o JPG (imagenes de pixeles), los SVG son
// archivos de texto que describen formas geometricas, por lo que
// se pueden escalar a cualquier tamano sin perder calidad.
// Vite los importa como URLs que podemos usar en etiquetas <img>.

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


// ---------------------------------------------------------
// COMPONENTE REUTILIZABLE: Icono
// ---------------------------------------------------------
// En lugar de crear 10 componentes casi identicos (IconoVentas,
// IconoClientes, etc.), creamos un UNICO componente generico
// que recibe la fuente (src) y el estilo como props.
//
// Esto aplica el principio DRY (Don't Repeat Yourself / No Te
// Repitas): si necesitamos cambiar el tamano o el estilo de todos
// los iconos, solo modificamos este componente en un solo lugar.
//
// Props (propiedades):
//   - src: la ruta al archivo SVG importado
//   - size: tamano en pixeles (por defecto 18)
//   - style: estilos CSS adicionales (por defecto ninguno)
//
// La desestructuracion ({ src, size = 18, style }) extrae las
// props directamente como variables. "size = 18" es un valor
// por defecto: si no se pasa la prop, usa 18.
const Icono = ({ src, size = 18, style }) => (
  <img
    src={src}
    alt=""
    width={size}
    height={size}
    className="icon-current-color"
    style={style}
  />
);

// Estilos CSS-in-JS para iconos que necesitan un color especial.
// Estos filtros CSS transforman el color del SVG sin modificar el
// archivo original. Es una tecnica comun cuando los SVG se cargan
// como <img> y no se puede acceder a su contenido interno.
const ESTILO_ICONO_LIBRO = {
  filter: 'brightness(0) saturate(100%) invert(27%) sepia(89%) saturate(1046%) hue-rotate(178deg) brightness(93%) contrast(91%)'
};
const ESTILO_ICONO_SALIR = {
  filter: 'brightness(0) invert(1)'
};


// =====================================================
// COMPONENTE PRINCIPAL: BarraNavegacion
// =====================================================
// Este es un componente funcional de React. En React, un componente
// funcional es simplemente una funcion de JavaScript que retorna JSX
// (la sintaxis similar a HTML que React transforma en elementos del DOM).
// Los componentes funcionales son el estandar moderno de React, ya que
// con los hooks pueden hacer todo lo que antes requeria clases.

const BarraNavegacion = () => {

  // -- Extraemos datos y funciones del contexto de autenticacion --
  // Usamos desestructuracion de objetos para extraer solo lo que
  // necesitamos del contexto. Esto es equivalente a:
  //   const auth = useAuth();
  //   const usuario = auth.usuario;
  //   const logout = auth.logout;
  //   ... etc.
  // Pero la desestructuracion es mas concisa y legible.
  const { usuario, logout, tienePermiso, nombreRol } = useAuth();

  // useLocation() retorna un objeto con informacion de la URL actual.
  // Usamos location.pathname para comparar con las rutas del menu
  // y determinar cual opcion debe mostrarse como "activa".
  const location = useLocation();

  // -- Estado local del componente --
  // useState retorna un array con dos elementos:
  //   [0] El valor actual del estado (mostrarCambioPassword)
  //   [1] La funcion para actualizarlo (setMostrarCambioPassword)
  // Inicializamos en false porque el modal empieza cerrado.
  // Cuando llamamos setMostrarCambioPassword(true), React re-renderiza
  // el componente y el modal se muestra.
  const [mostrarCambioPassword, setMostrarCambioPassword] = useState(false);

  // -- Nombre del usuario para mostrar en la interfaz --
  // Usamos el operador de encadenamiento opcional (?.) para acceder
  // de forma segura a usuario.nombre_completo. Si 'usuario' es null
  // o undefined, en vez de lanzar un error, retorna undefined.
  // Luego, el operador || (OR logico) proporciona un valor por defecto
  // ('Usuario') en caso de que el resultado sea undefined o vacio.
  const nombreUsuario = usuario?.nombre_completo || 'Usuario';

  // -- Inicial del avatar --
  // Tomamos el primer caracter del nombre y lo convertimos a mayuscula
  // para mostrarlo dentro del circulo del avatar.
  // [0] accede al primer caracter del string (indice 0).
  const inicialAvatar = nombreUsuario[0].toUpperCase();


  // ---------------------------------------------------------
  // FUNCIONES AUXILIARES
  // ---------------------------------------------------------

  // Cierra sesion con confirmacion previa.
  // window.confirm() muestra un dialogo nativo del navegador con
  // botones "Aceptar" y "Cancelar". Retorna true si el usuario
  // acepta y false si cancela. Esto previene cierres accidentales.
  const manejarSalida = () => {
    if (window.confirm('Desea cerrar sesion?')) {
      logout(); // Limpia el token JWT del localStorage y redirige al login
    }
  };


  // ---------------------------------------------------------
  // FUNCIONES DE ESTILOS DINAMICOS
  // ---------------------------------------------------------
  // Estas funciones generan las clases CSS de Bootstrap de forma
  // dinamica segun la ruta actual del navegador. Esto permite
  // resaltar visualmente la opcion del menu en la que el usuario
  // se encuentra actualmente (patron de UI llamado "active state").

  // Compara si la ruta dada coincide con la pagina actual.
  // Retorna true o false (valor booleano).
  const esRutaActiva = (ruta) => location.pathname === ruta;

  // Para los dropdowns (menus desplegables): verifica si ALGUNA
  // de las rutas hijas esta activa. Recibe un array de rutas y
  // usa .includes() para buscar si la ruta actual esta en ese array.
  // Ejemplo: si estoy en '/ventas', el dropdown "Gestion Comercial"
  // se resalta porque ['/ventas', '/historial-ventas', '/clientes']
  // incluye '/ventas'.
  const dropdownActivo = (rutas) => rutas.includes(location.pathname);

  // Genera las clases CSS para un enlace normal del menu.
  // Usa template literals (comillas invertidas ``) para construir
  // el string de clases dinamicamente con interpolacion ${}.
  // Si la ruta esta activa: fondo blanco semitransparente + negrita
  // Si no esta activa: texto blanco con opacidad reducida
  const claseLink = (ruta) => {
    const base = 'nav-link d-flex align-items-center gap-2 px-3 mx-1';
    return esRutaActiva(ruta)
      ? `${base} text-white bg-white bg-opacity-25 rounded-pill fw-bold shadow-sm`
      : `${base} text-white text-opacity-75`;
  };

  // Igual que claseLink pero para los botones que abren dropdowns.
  // La clase 'dropdown-toggle' de Bootstrap agrega la flecha
  // indicadora de menu desplegable.
  const claseDropdown = (rutas) => {
    const base = 'nav-link dropdown-toggle d-flex align-items-center gap-2 px-3 mx-1';
    return dropdownActivo(rutas)
      ? `${base} text-white bg-white bg-opacity-25 rounded-pill fw-bold shadow-sm`
      : `${base} text-white text-opacity-75`;
  };


  // ---------------------------------------------------------
  // RENDER (JSX)
  // ---------------------------------------------------------
  // El return de un componente funcional contiene el JSX que
  // React convertira en elementos HTML reales del DOM.
  // <> y </> son Fragments: permiten retornar multiples elementos
  // sin agregar un div contenedor innecesario al DOM.

  return (
    <>
    {/* =====================================================
        BARRA DE NAVEGACION (Bootstrap Navbar)
        La clase 'navbar-expand-lg' hace que el menu se muestre
        horizontal en pantallas grandes (>=992px) y se colapse
        en un boton hamburguesa en pantallas pequenas.
        'navbar-dark' aplica colores claros al texto para
        contrastar con un fondo oscuro.
        ===================================================== */}
    <nav className="navbar navbar-expand-lg navbar-dark shadow">
      <div className="container-fluid px-4">

        {/* -------------------------------------------------
            LOGO Y MARCA
            Link to="/" navega a la pagina principal (Dashboard).
            'd-none d-sm-inline' oculta el texto en pantallas
            muy pequenas (<576px) y muestra solo "SGI" como
            version compacta.
            ------------------------------------------------- */}
        <Link
          className="navbar-brand d-flex align-items-center gap-2 fw-bold"
          to="/"
          style={{ fontSize: '1.1rem', minWidth: 0 }}
        >
          <div
            className="bg-white text-primary rounded-circle p-1 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ width: 35, height: 35 }}
          >
            <Icono src={iconoLibro} size={22} style={ESTILO_ICONO_LIBRO} />
          </div>
          <span className="text-truncate d-none d-sm-inline">SGI Libreria el Saber</span>
          <span className="d-sm-none">SGI</span>
        </Link>

        {/* -------------------------------------------------
            BOTON HAMBURGUESA (RESPONSIVE)
            Solo es visible en pantallas menores a 992px (lg).
            Al hacer clic, Bootstrap toglea la visibilidad del
            div con id="menuNavegacion" usando JavaScript.
            Los atributos aria-* son para accesibilidad: ayudan
            a lectores de pantalla a entender la funcion del boton.
            ------------------------------------------------- */}
        <button
          className="navbar-toggler border-0"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#menuNavegacion"
          aria-controls="menuNavegacion"
          aria-expanded="false"
          aria-label="Alternar navegacion"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        {/* -------------------------------------------------
            MENU COLAPSABLE
            Este div contiene todas las opciones del menu.
            La clase 'collapse navbar-collapse' lo hace colapsable
            en dispositivos moviles. Bootstrap lo muestra/oculta
            automaticamente al presionar el boton hamburguesa.
            ------------------------------------------------- */}
        <div className="collapse navbar-collapse py-2 py-lg-0" id="menuNavegacion">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 ms-lg-4">

            {/* DASHBOARD - Solo visible para Administradores
                El operador && funciona como un "if" en JSX:
                si tienePermiso('verDashboard') es true, renderiza
                el <li>. Si es false, no renderiza nada. */}
            {tienePermiso('verDashboard') && (
              <li className="nav-item">
                <Link className={claseLink('/')} to="/">
                  Dashboard
                </Link>
              </li>
            )}

            {/* -------------------------------------------------
                DROPDOWN: GESTION COMERCIAL
                Agrupa las opciones de Ventas, Historial y Clientes.
                Los dropdowns de Bootstrap funcionan con el atributo
                data-bs-toggle="dropdown" que activa el menu al clic.
                Solo se muestra si el usuario tiene permiso de
                registrar ventas O ver clientes (operador ||).
                ------------------------------------------------- */}
            {(tienePermiso('registrarVenta') || tienePermiso('verClientes')) && (
              <li className="nav-item dropdown">
                <a
                  className={claseDropdown(['/ventas', '/historial-ventas', '/clientes'])}
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Gestion Comercial
                </a>
                <ul className="dropdown-menu shadow-sm border-0">
                  {tienePermiso('registrarVenta') && (
                    <li>
                      <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/ventas">
                        <Icono src={iconoVentas} /> POS / Ventas
                      </Link>
                    </li>
                  )}
                  {tienePermiso('verVentas') && (
                    <li>
                      <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/historial-ventas">
                        <Icono src={iconoHistorial} /> Historial
                      </Link>
                    </li>
                  )}
                  {/* Separador visual entre secciones del dropdown.
                      Solo aparece si hay items arriba Y abajo de el. */}
                  {(tienePermiso('registrarVenta') && tienePermiso('verClientes')) && (
                    <li><hr className="dropdown-divider" /></li>
                  )}
                  {tienePermiso('verClientes') && (
                    <li>
                      <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/clientes">
                        <Icono src={iconoClientes} /> Clientes
                      </Link>
                    </li>
                  )}
                </ul>
              </li>
            )}

            {/* -------------------------------------------------
                DROPDOWN: LOGISTICA
                Agrupa Inventario, Movimientos, Autores, Categorias
                y Proveedores. Se muestra si el usuario tiene al
                menos uno de los permisos relacionados.
                ------------------------------------------------- */}
            {(tienePermiso('verInventario') || tienePermiso('verProveedores') || tienePermiso('registrarMovimiento')) && (
              <li className="nav-item dropdown">
                <a
                  className={claseDropdown(['/inventario', '/movimientos', '/proveedores', '/autores', '/categorias'])}
                  href="#"
                  role="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  Logistica
                </a>
                <ul className="dropdown-menu shadow-sm border-0">
                  {tienePermiso('verInventario') && (
                    <li>
                      <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/inventario">
                        <Icono src={iconoInventario} /> Inventario
                      </Link>
                    </li>
                  )}
                  {tienePermiso('registrarMovimiento') && (
                    <li>
                      <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/movimientos">
                        <Icono src={iconoMovimientos} /> Movimientos
                      </Link>
                    </li>
                  )}
                  {/* Separador entre inventario/movimientos y catalogos */}
                  {(tienePermiso('verInventario') && (tienePermiso('verAutores') || tienePermiso('verCategorias'))) && (
                    <li><hr className="dropdown-divider" /></li>
                  )}
                  {tienePermiso('verAutores') && (
                    <li>
                      <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/autores">
                        <Icono src={iconoAutores} /> Autores
                      </Link>
                    </li>
                  )}
                  {tienePermiso('verCategorias') && (
                    <li>
                      <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/categorias">
                        <Icono src={iconoCategorias} /> Categorias
                      </Link>
                    </li>
                  )}
                  {/* Separador antes de proveedores */}
                  {tienePermiso('verProveedores') && (
                    <>
                      <li><hr className="dropdown-divider" /></li>
                      <li>
                        <Link className="dropdown-item d-flex align-items-center gap-2 py-2" to="/proveedores">
                          <Icono src={iconoProveedores} /> Proveedores
                        </Link>
                      </li>
                    </>
                  )}
                </ul>
              </li>
            )}
          </ul>

          {/* -------------------------------------------------
              SECCION DE USUARIO (esquina derecha)
              Muestra el nombre, rol y avatar del usuario logueado
              con un dropdown para acciones de cuenta.
              'border-start' agrega una linea divisoria vertical
              que separa visualmente esta seccion del menu principal.
              ------------------------------------------------- */}
          <div className="d-flex align-items-center text-white border-start border-white border-opacity-25 ps-lg-4 ms-lg-2 mt-3 mt-lg-0">
            <div className="dropdown">
              <button
                className="btn d-flex align-items-center gap-2 text-white bg-transparent border-0 p-0"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                {/* Info del usuario - oculta en movil (d-none d-lg-block) */}
                <div className="lh-1 text-end d-none d-lg-block me-2">
                  <div className="fw-bold">{nombreUsuario}</div>
                  <div className="small text-white-50">{nombreRol()}</div>
                </div>
                {/* Avatar circular con la inicial del nombre.
                    Es un div estilizado como circulo usando
                    'rounded-circle' de Bootstrap. */}
                <div
                  className="rounded-circle bg-white bg-opacity-25 d-flex align-items-center justify-content-center fw-bold"
                  style={{ width: 38, height: 38, fontSize: 16 }}
                >
                  {inicialAvatar}
                </div>
              </button>

              {/* Menu desplegable del usuario.
                  'dropdown-menu-end' alinea el menu a la derecha
                  para que no se salga de la pantalla. */}
              <ul className="dropdown-menu dropdown-menu-end shadow">
                {/* Gestion de Usuarios - solo visible para Admin */}
                {tienePermiso('gestionarUsuarios') && (
                  <li>
                    <Link className="dropdown-item" to="/admin/usuarios">
                      Gestion de Usuarios
                    </Link>
                  </li>
                )}
                {tienePermiso('gestionarUsuarios') && (
                  <li><hr className="dropdown-divider" /></li>
                )}

                {/* Cambiar contrasena - disponible para todos los roles.
                    Usamos un <button> en lugar de <Link> porque no
                    navega a otra pagina, sino que abre un modal. */}
                <li>
                  <button
                    className="dropdown-item"
                    onClick={() => setMostrarCambioPassword(true)}
                  >
                    Cambiar Contrasena
                  </button>
                </li>

                <li><hr className="dropdown-divider" /></li>

                {/* Cerrar sesion - 'text-danger' lo muestra en rojo
                    como convencion visual de accion destructiva. */}
                <li>
                  <button className="dropdown-item text-danger d-flex align-items-center gap-2" onClick={manejarSalida}>
                    <Icono src={iconoSalir} style={ESTILO_ICONO_SALIR} /> Cerrar Sesion
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>

    {/* Modal de Cambio de Contrasena
        Este componente se renderiza siempre en el DOM pero solo se
        muestra visualmente cuando 'visible' es true.
        'onCerrar' es un callback: una funcion que el componente hijo
        ejecuta cuando el usuario cierra el modal. Aqui le pasamos
        una funcion que cambia el estado a false. */}
    <ModalCambiarPassword
      visible={mostrarCambioPassword}
      onCerrar={() => setMostrarCambioPassword(false)}
    />
  </>
  );
};

// export default: exporta el componente como la exportacion principal
// del archivo. Al importarlo desde otro archivo se escribe:
//   import BarraNavegacion from './BarraNavegacion';
// Sin 'default', tendriamos que usar llaves: { BarraNavegacion }
export default BarraNavegacion;
