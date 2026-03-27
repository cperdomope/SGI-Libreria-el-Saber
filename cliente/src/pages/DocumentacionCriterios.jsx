// =====================================================
// PAGINA: Criterios de Aceptacion (Documentacion SENA)
// =====================================================
// En la metodologia agil (Scrum), cada Historia de Usuario tiene asociados
// "criterios de aceptacion": condiciones especificas y verificables que
// definen CUANDO una funcionalidad se considera terminada y correcta.
//
// Estructura de este archivo:
//   1. Array "criterios": datos estaticos con todas las HU y sus criterios
//   2. Objeto "colorModulo": mapa de colores para badges por modulo
//   3. Componente DocumentacionCriterios: agrupa por modulo y renderiza
//
// Este componente se carga de forma diferida (lazy) desde Acceso.jsx,
// por lo que solo se descarga cuando el usuario abre el modal de documentacion.
//
// Conceptos aplicados:
//   - Datos estaticos fuera del componente (no se recrean en cada render)
//   - Object.entries(): convierte un objeto en array de pares [clave, valor]
//   - Array.reduce(): acumula/agrupa elementos de un array en una estructura
//   - Template literals con expresiones: `bg-${variable}`
// =====================================================

// -- Array de criterios de aceptacion --
// Se define fuera del componente como constante porque son datos ESTATICOS
// que nunca cambian durante la ejecucion. Si estuvieran dentro del componente,
// React los recrearia en memoria en cada render (innecesario).
// Cada objeto tiene: id (HU-XX), titulo, modulo (para agrupar) y criterios (array de strings).
const criterios = [
  // ── AUTENTICACION ──
  {
    id: 'HU-01',
    titulo: 'Iniciar sesion en el sistema',
    modulo: 'Autenticacion',
    criterios: [
      'El sistema muestra un formulario con campos de correo y contrasena',
      'Si el correo o la contrasena estan vacios, el formulario no se envia y muestra un mensaje de error',
      'Si los datos son correctos, el sistema redirige al usuario a la pagina principal segun su rol',
      'Si los datos son incorrectos, se muestra un mensaje de error claro',
      'La sesion se mantiene activa aunque el usuario recargue la pagina (se guarda en localStorage)'
    ]
  },
  {
    id: 'HU-02',
    titulo: 'Bloqueo de cuenta por intentos fallidos',
    modulo: 'Autenticacion',
    criterios: [
      'Despues de 3 intentos fallidos consecutivos, la cuenta se bloquea',
      'Se muestra una barra de progreso que indica cuantos intentos quedan',
      'El usuario bloqueado ve un mensaje claro indicando que su cuenta fue bloqueada',
      'Un administrador puede desbloquear la cuenta'
    ]
  },
  {
    id: 'HU-03',
    titulo: 'Cerrar sesion',
    modulo: 'Autenticacion',
    criterios: [
      'El boton de cerrar sesion esta visible en el menu de usuario',
      'Al hacer clic, se muestra una confirmacion antes de cerrar',
      'Al confirmar, se elimina la sesion y se redirige a la pagina de login',
      'Despues de cerrar sesion, no se puede acceder a paginas protegidas'
    ]
  },
  {
    id: 'HU-04',
    titulo: 'Cambiar mi contrasena',
    modulo: 'Autenticacion',
    criterios: [
      'Se accede desde un boton en el menu de usuario que abre un modal',
      'El modal pide la contrasena actual, la nueva contrasena y la confirmacion',
      'La nueva contrasena debe tener minimo 6 caracteres',
      'Si la contrasena actual es incorrecta, se muestra un error',
      'Si la nueva contrasena y la confirmacion no coinciden, se muestra un error',
      'Al cambiar exitosamente, se muestra un mensaje de exito y se cierra el modal'
    ]
  },

  // ── DASHBOARD ──
  {
    id: 'HU-05',
    titulo: 'Ver el dashboard con estadisticas',
    modulo: 'Dashboard',
    criterios: [
      'Solo los Administradores pueden ver esta pagina',
      'Se muestran 4 tarjetas: ventas del dia, ventas del mes, total de libros y alertas de stock bajo',
      'Los datos se cargan automaticamente al entrar a la pagina',
      'Si un Vendedor intenta acceder, se le redirige a la pagina de ventas'
    ]
  },
  {
    id: 'HU-06',
    titulo: 'Ver graficas de ventas y categorias',
    modulo: 'Dashboard',
    criterios: [
      'Se muestra una grafica de barras con las ventas e ingresos de los ultimos 6 meses',
      'Se muestra una grafica de torta con la distribucion de libros por categoria',
      'Las graficas se adaptan al tamano de la pantalla (responsive)',
      'Los datos se obtienen del servidor en tiempo real'
    ]
  },
  {
    id: 'HU-07',
    titulo: 'Ver top de productos y clientes',
    modulo: 'Dashboard',
    criterios: [
      'Se muestra una lista con los 5 libros mas vendidos y cuanto generaron en ingresos',
      'Se muestra una lista con los 5 mejores clientes por total gastado',
      'Los datos se actualizan cada vez que se entra al dashboard'
    ]
  },
  {
    id: 'HU-08',
    titulo: 'Ver libros con stock bajo',
    modulo: 'Dashboard',
    criterios: [
      'Se muestra una tabla con los libros que tienen stock igual o menor al stock minimo',
      'La tabla muestra: titulo, stock actual y stock minimo',
      'Hay un boton o enlace que lleva directamente al modulo de inventario'
    ]
  },

  // ── INVENTARIO ──
  {
    id: 'HU-09',
    titulo: 'Ver lista de libros del inventario',
    modulo: 'Inventario',
    criterios: [
      'Se muestra una tabla con todos los libros registrados',
      'Cada libro muestra: miniatura de portada, ISBN, titulo, autor, categoria, precio y stock',
      'El stock tiene un indicador visual (badge): Disponible, Stock Bajo o Agotado',
      'La tabla se puede ver en celulares con scroll horizontal'
    ]
  },
  {
    id: 'HU-10',
    titulo: 'Buscar libros en el inventario',
    modulo: 'Inventario',
    criterios: [
      'Hay un campo de busqueda en la parte superior de la tabla',
      'Al escribir, la tabla se filtra instantaneamente sin hacer peticion al servidor',
      'Se puede buscar por titulo, autor o ISBN',
      'Si no hay resultados, se muestra un mensaje indicandolo'
    ]
  },
  {
    id: 'HU-11',
    titulo: 'Crear un libro nuevo',
    modulo: 'Inventario',
    criterios: [
      'Solo el Administrador ve el boton de "Agregar libro"',
      'Se abre un formulario para llenar: titulo, ISBN, autor, categoria, precio, stock actual, stock minimo y portada',
      'La portada acepta imagenes JPG, PNG o WebP de maximo 2 MB',
      'Todos los campos obligatorios se validan antes de enviar',
      'Al crear exitosamente, el libro aparece en la tabla sin recargar la pagina'
    ]
  },
  {
    id: 'HU-12',
    titulo: 'Editar un libro existente',
    modulo: 'Inventario',
    criterios: [
      'Solo el Administrador ve el boton de editar en cada libro',
      'Al hacer clic, se abre el formulario con los datos actuales del libro',
      'Se pueden modificar todos los campos incluyendo la imagen de portada',
      'Al guardar, los cambios se reflejan en la tabla inmediatamente'
    ]
  },
  {
    id: 'HU-13',
    titulo: 'Eliminar un libro',
    modulo: 'Inventario',
    criterios: [
      'Solo el Administrador ve el boton de eliminar',
      'Se muestra una confirmacion antes de eliminar',
      'Al eliminar, el libro y su imagen de portada se borran del servidor',
      'El libro desaparece de la tabla sin recargar la pagina'
    ]
  },

  // ── MOVIMIENTOS ──
  {
    id: 'HU-14',
    titulo: 'Registrar entrada de inventario',
    modulo: 'Movimientos',
    criterios: [
      'Se selecciona el tipo "ENTRADA"',
      'Se debe elegir el libro, la cantidad, el proveedor y el costo de compra',
      'El proveedor y el costo son obligatorios para las entradas',
      'Al registrar, el stock del libro se actualiza automaticamente',
      'El movimiento aparece en el panel de ultimos movimientos'
    ]
  },
  {
    id: 'HU-15',
    titulo: 'Registrar salida de inventario',
    modulo: 'Movimientos',
    criterios: [
      'Se selecciona el tipo "SALIDA"',
      'Se debe elegir el libro y la cantidad a descontar',
      'No se puede sacar mas libros de los que hay en stock',
      'Al registrar, el stock del libro se actualiza automaticamente'
    ]
  },
  {
    id: 'HU-16',
    titulo: 'Ver historial de movimientos',
    modulo: 'Movimientos',
    criterios: [
      'Se muestra una tabla con todos los movimientos registrados',
      'Cada movimiento muestra: libro, tipo, cantidad, stock anterior, stock nuevo, proveedor, costo, usuario y fecha',
      'El panel se actualiza automaticamente cuando se registra un nuevo movimiento'
    ]
  },

  // ── VENTAS ──
  {
    id: 'HU-17',
    titulo: 'Registrar una venta',
    modulo: 'Ventas',
    criterios: [
      'Se puede buscar y seleccionar un cliente',
      'Se pueden agregar varios libros al carrito',
      'Se puede cambiar la cantidad de cada libro en el carrito',
      'Se puede eliminar un libro del carrito',
      'Se debe elegir un metodo de pago (Efectivo, Tarjeta, Transferencia o Mixto)',
      'Al confirmar la venta, el stock de cada libro se descuenta automaticamente',
      'El backend recalcula y valida el total (no confia en el frontend)'
    ]
  },
  {
    id: 'HU-18',
    titulo: 'Aplicar descuento a una venta',
    modulo: 'Ventas',
    criterios: [
      'En la seccion de facturacion del POS hay un campo para ingresar el porcentaje de descuento (0% a 100%)',
      'Al cambiar el porcentaje, se muestra automaticamente el subtotal, el monto del descuento y el total final',
      'El descuento no puede ser negativo ni mayor al 100%',
      'El backend valida que el descuento no sea mayor al subtotal y recalcula el total por seguridad',
      'El descuento se guarda en la base de datos y se muestra en el historial de ventas y en el PDF'
    ]
  },
  {
    id: 'HU-19',
    titulo: 'Ver historial de ventas',
    modulo: 'Ventas',
    criterios: [
      'Se muestra una tabla con todas las ventas realizadas',
      'Cada venta tiene un estado visual: Completada (verde) o Anulada (rojo)',
      'La tabla tiene paginacion de 10 registros por pagina',
      'Se puede ver el detalle de cada venta'
    ]
  },
  {
    id: 'HU-20',
    titulo: 'Filtrar ventas por fecha y buscar por cliente',
    modulo: 'Ventas',
    criterios: [
      'Hay campos de fecha "desde" y "hasta" para filtrar por rango',
      'Hay un campo de busqueda para buscar por nombre de cliente',
      'Los filtros se aplican sin recargar la pagina',
      'Se pueden combinar los filtros (fecha + cliente)'
    ]
  },
  {
    id: 'HU-21',
    titulo: 'Anular una venta',
    modulo: 'Ventas',
    criterios: [
      'Solo el Administrador ve el boton de anular',
      'Se muestra una confirmacion antes de anular',
      'Al anular, el stock de cada libro de la venta se devuelve automaticamente',
      'La venta cambia su estado visual a "Anulada"',
      'Una venta ya anulada no se puede anular de nuevo'
    ]
  },
  {
    id: 'HU-22',
    titulo: 'Descargar ticket de venta en PDF',
    modulo: 'Ventas',
    criterios: [
      'Hay un boton de PDF en cada venta del historial',
      'El PDF se genera con formato de ticket POS (80 mm)',
      'El ticket incluye los datos de la venta: cliente, productos, cantidades, precios y total',
      'El archivo se descarga automaticamente al hacer clic'
    ]
  },
  {
    id: 'HU-23',
    titulo: 'Exportar ventas a Excel',
    modulo: 'Ventas',
    criterios: [
      'Hay un boton de "Exportar a Excel" en el historial de ventas',
      'Se exporta la vista filtrada actual (respetando los filtros aplicados)',
      'El archivo se descarga en formato .xlsx',
      'El archivo incluye las columnas visibles en la tabla'
    ]
  },

  // ── CLIENTES ──
  {
    id: 'HU-24',
    titulo: 'Ver lista de clientes',
    modulo: 'Clientes',
    criterios: [
      'Se muestra una tabla con todos los clientes registrados',
      'La tabla muestra: nombre, tipo de documento, documento, telefono y correo',
      'La tabla se adapta a celulares ocultando columnas menos importantes'
    ]
  },
  {
    id: 'HU-25',
    titulo: 'Buscar clientes',
    modulo: 'Clientes',
    criterios: [
      'Hay un campo de busqueda en la parte superior',
      'Se puede buscar por nombre o numero de documento',
      'La busqueda filtra la tabla instantaneamente sin peticion al servidor',
      'Si no hay resultados, se muestra un mensaje'
    ]
  },
  {
    id: 'HU-26',
    titulo: 'Crear un cliente nuevo',
    modulo: 'Clientes',
    criterios: [
      'Tanto el Administrador como el Vendedor pueden crear clientes',
      'Se piden los campos: nombre, tipo de documento, documento, telefono y correo',
      'El tipo de documento puede ser: CC, NIT, CE o Pasaporte',
      'El numero de documento debe ser unico (no se puede repetir)',
      'Al crear exitosamente, el cliente aparece en la tabla'
    ]
  },
  {
    id: 'HU-27',
    titulo: 'Editar un cliente',
    modulo: 'Clientes',
    criterios: [
      'Solo el Administrador ve el boton de editar',
      'Se abre un formulario con los datos actuales del cliente',
      'Se pueden modificar todos los campos',
      'Los cambios se guardan y se reflejan en la tabla'
    ]
  },
  {
    id: 'HU-28',
    titulo: 'Eliminar un cliente',
    modulo: 'Clientes',
    criterios: [
      'Solo el Administrador ve el boton de eliminar',
      'Se muestra una confirmacion antes de eliminar',
      'El cliente se elimina de la base de datos y desaparece de la tabla'
    ]
  },

  // ── PROVEEDORES ──
  {
    id: 'HU-29',
    titulo: 'Gestionar proveedores',
    modulo: 'Proveedores',
    criterios: [
      'Solo el Administrador puede acceder a este modulo',
      'Se puede crear un proveedor con: empresa, NIT, contacto, email, telefono y direccion',
      'Se puede editar la informacion de un proveedor existente',
      'Se puede eliminar un proveedor que no tenga movimientos de inventario asociados',
      'Si el proveedor tiene movimientos registrados, el sistema muestra un mensaje de error y no permite la eliminacion',
      'Las columnas se ocultan progresivamente en pantallas pequenas'
    ]
  },

  // ── AUTORES ──
  {
    id: 'HU-30',
    titulo: 'Gestionar autores',
    modulo: 'Autores',
    criterios: [
      'Todos los usuarios pueden ver la lista de autores',
      'Solo el Administrador puede crear, editar o eliminar autores',
      'Cada autor tiene: nombre y nacionalidad',
      'No se puede eliminar un autor que tiene libros asociados',
      'Si se intenta eliminar un autor con libros, se muestra un mensaje de error'
    ]
  },

  // ── CATEGORIAS ──
  {
    id: 'HU-31',
    titulo: 'Gestionar categorias',
    modulo: 'Categorias',
    criterios: [
      'Todos los usuarios pueden ver la lista de categorias',
      'Solo el Administrador puede crear, editar o eliminar categorias',
      'Cada categoria tiene: nombre y descripcion',
      'No se puede eliminar una categoria que tiene libros asociados',
      'Si se intenta eliminar una categoria con libros, se muestra un mensaje de error'
    ]
  },

  // ── USUARIOS ──
  {
    id: 'HU-32',
    titulo: 'Ver lista de usuarios del sistema',
    modulo: 'Usuarios',
    criterios: [
      'Solo el Administrador puede acceder a esta seccion',
      'Se muestra una tabla con: nombre completo, email, rol (con badge), estado y ultimo acceso',
      'El estado se muestra visualmente (activo/inactivo)'
    ]
  },
  {
    id: 'HU-33',
    titulo: 'Crear un usuario nuevo',
    modulo: 'Usuarios',
    criterios: [
      'Solo el Administrador puede crear usuarios',
      'Se piden: nombre completo, email, contrasena (minimo 6 caracteres) y rol',
      'El email debe ser unico en el sistema',
      'Al crear, el usuario aparece en la tabla con estado activo'
    ]
  },
  {
    id: 'HU-34',
    titulo: 'Editar un usuario',
    modulo: 'Usuarios',
    criterios: [
      'Solo el Administrador puede editar usuarios',
      'Se puede cambiar: nombre, email y rol',
      'La contrasena no se puede cambiar desde aqui (cada usuario cambia la suya)',
      'Los cambios se reflejan en la tabla inmediatamente'
    ]
  },
  {
    id: 'HU-35',
    titulo: 'Activar o desactivar un usuario',
    modulo: 'Usuarios',
    criterios: [
      'Solo el Administrador puede activar o desactivar usuarios',
      'Un usuario inactivo no puede iniciar sesion',
      'El Administrador no puede desactivarse a si mismo',
      'El cambio de estado se refleja visualmente en la tabla'
    ]
  }
];

// -- Mapa de colores Bootstrap para cada modulo --
// Esto permite asignar un color de badge distinto a cada seccion,
// facilitando la identificacion visual. Las clases (primary, success, etc.)
// son clases de Bootstrap 5 para colores de fondo (bg-*).
const colorModulo = {
  'Autenticacion': 'dark',
  'Dashboard': 'primary',
  'Inventario': 'success',
  'Movimientos': 'secondary',
  'Ventas': 'danger',
  'Clientes': 'info',
  'Proveedores': 'warning',
  'Autores': 'primary',
  'Categorias': 'success',
  'Usuarios': 'dark'
};

// =====================================================
// COMPONENTE: DocumentacionCriterios
// =====================================================
const DocumentacionCriterios = () => {

  // -- Agrupar criterios por modulo usando reduce() --
  // Array.reduce() es un metodo funcional que recorre un array y va
  // "acumulando" un resultado. Aqui, transforma el array plano de criterios
  // en un objeto agrupado por modulo:
  //
  // ANTES (array plano):
  //   [ {modulo:'Ventas', ...}, {modulo:'Ventas', ...}, {modulo:'Clientes', ...} ]
  //
  // DESPUES (objeto agrupado):
  //   { 'Ventas': [{...}, {...}], 'Clientes': [{...}] }
  //
  // Parametros de reduce:
  //   - acc (acumulador): el objeto que se va construyendo
  //   - c (current): el elemento actual del array
  //   - {} : valor inicial del acumulador (objeto vacio)
  //
  // (acc[c.modulo] ||= []) es el operador de asignacion logica OR:
  // si acc[c.modulo] no existe (undefined/null), le asigna un array vacio.
  // Luego .push(c) agrega el criterio al array de ese modulo.
  const modulos = criterios.reduce((acc, c) => {
    (acc[c.modulo] ||= []).push(c);
    return acc;
  }, {});

  // -- Contar total de criterios individuales --
  // Otro uso de reduce(): suma la cantidad de criterios de todas las HU.
  // acc empieza en 0 y va sumando c.criterios.length de cada historia.
  const totalCriterios = criterios.reduce((acc, c) => acc + c.criterios.length, 0);

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h2 className="fw-bold text-primary">Criterios de Aceptacion</h2>
        <p className="text-muted">
          Los criterios de aceptacion son las condiciones que se deben cumplir para que cada
          funcionalidad se considere terminada y funcionando bien. Estan asociados a cada historia de usuario.
        </p>
        <div className="alert alert-light border">
          <strong>Total:</strong> {criterios.length} historias con criterios &nbsp;|&nbsp;
          <strong>Total de criterios:</strong> {totalCriterios}
        </div>
      </div>

      {/* Object.entries() convierte el objeto "modulos" en un array de pares
          [clave, valor], es decir: [['Autenticacion', [...]], ['Dashboard', [...]], ...]
          Esto permite usar .map() para iterar, ya que .map() no funciona en objetos.
          Desestructuramos cada par como [modulo, lista] directamente en los parametros. */}
      {Object.entries(modulos).map(([modulo, lista]) => (
        <div key={modulo} className="mb-5">
          <h4 className="fw-bold border-bottom pb-2 mb-3">
            {/* Template literal: `bg-${expresion}` permite construir nombres
                de clase CSS dinamicamente. Si colorModulo[modulo] es undefined,
                el operador || usa 'secondary' como fallback (color por defecto). */}
            <span className={`badge bg-${colorModulo[modulo] || 'secondary'} me-2`}>{modulo}</span>
          </h4>

          {/* Segundo nivel de .map(): por cada modulo, iteramos sus historias */}
          {lista.map(item => (
            <div key={item.id} className="card mb-3 shadow-sm">
              <div className="card-header bg-light">
                <span className="badge bg-secondary me-2">{item.id}</span>
                <strong>{item.titulo}</strong>
              </div>
              <div className="card-body">
                <p className="text-muted small mb-2">Criterios de aceptacion:</p>
                {/* <ol> = lista ordenada (numerada). Usamos indice "i" como key
                    porque estos items son estaticos y nunca cambian de orden.
                    En listas dinamicas (que cambian), usar indice como key
                    es una mala practica porque confunde el reconciliador de React. */}
                <ol className="mb-0">
                  {item.criterios.map((criterio, i) => (
                    <li key={i} className="mb-1">{criterio}</li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default DocumentacionCriterios;