import React from 'react';

// =====================================================
// PAGINA: Historias de Usuario
// =====================================================
// Muestra todas las historias de usuario del proyecto
// organizadas por modulos. Cada historia describe una
// funcionalidad real del sistema.
// =====================================================

const historias = [
  // ── MODULO: AUTENTICACION ──
  {
    id: 'HU-01',
    titulo: 'Iniciar sesion en el sistema',
    como: 'Usuario (Administrador o Vendedor)',
    quiero: 'iniciar sesion con mi correo y contrasena',
    para: 'acceder a las funcionalidades del sistema segun mi rol',
    prioridad: 'Alta',
    modulo: 'Autenticacion'
  },
  {
    id: 'HU-02',
    titulo: 'Bloqueo de cuenta por intentos fallidos',
    como: 'Sistema',
    quiero: 'bloquear la cuenta despues de 3 intentos fallidos de login',
    para: 'proteger las cuentas de accesos no autorizados',
    prioridad: 'Alta',
    modulo: 'Autenticacion'
  },
  {
    id: 'HU-03',
    titulo: 'Cerrar sesion',
    como: 'Usuario autenticado',
    quiero: 'cerrar mi sesion desde la barra de navegacion',
    para: 'proteger mi cuenta cuando deje de usar el sistema',
    prioridad: 'Alta',
    modulo: 'Autenticacion'
  },
  {
    id: 'HU-04',
    titulo: 'Cambiar mi contrasena',
    como: 'Usuario autenticado',
    quiero: 'cambiar mi contrasena desde un modal en la barra de navegacion',
    para: 'mantener la seguridad de mi cuenta',
    prioridad: 'Media',
    modulo: 'Autenticacion'
  },

  // ── MODULO: DASHBOARD ──
  {
    id: 'HU-05',
    titulo: 'Ver el dashboard con estadisticas',
    como: 'Administrador',
    quiero: 'ver un panel con tarjetas de ventas del dia, ventas del mes, total de libros y alertas de stock bajo',
    para: 'tener una vision rapida del estado del negocio',
    prioridad: 'Alta',
    modulo: 'Dashboard'
  },
  {
    id: 'HU-06',
    titulo: 'Ver graficas de ventas y categorias',
    como: 'Administrador',
    quiero: 'ver una grafica de barras con ventas de los ultimos 6 meses y una grafica de torta con la distribucion por categorias',
    para: 'analizar el comportamiento de las ventas y del catalogo',
    prioridad: 'Media',
    modulo: 'Dashboard'
  },
  {
    id: 'HU-07',
    titulo: 'Ver top de productos y clientes',
    como: 'Administrador',
    quiero: 'ver los 5 libros mas vendidos y los 5 mejores clientes',
    para: 'saber cuales son los productos mas populares y los clientes mas frecuentes',
    prioridad: 'Media',
    modulo: 'Dashboard'
  },
  {
    id: 'HU-08',
    titulo: 'Ver libros con stock bajo',
    como: 'Administrador',
    quiero: 'ver una tabla con los libros que tienen stock igual o menor al minimo',
    para: 'saber cuales libros necesito reabastecer',
    prioridad: 'Alta',
    modulo: 'Dashboard'
  },

  // ── MODULO: INVENTARIO ──
  {
    id: 'HU-09',
    titulo: 'Ver lista de libros del inventario',
    como: 'Usuario (Administrador o Vendedor)',
    quiero: 'ver todos los libros con su imagen, titulo, autor, categoria, precio y stock',
    para: 'conocer que libros hay disponibles en la libreria',
    prioridad: 'Alta',
    modulo: 'Inventario'
  },
  {
    id: 'HU-10',
    titulo: 'Buscar libros en el inventario',
    como: 'Usuario (Administrador o Vendedor)',
    quiero: 'buscar libros por titulo, autor o ISBN escribiendo en un campo de busqueda',
    para: 'encontrar rapidamente un libro especifico',
    prioridad: 'Alta',
    modulo: 'Inventario'
  },
  {
    id: 'HU-11',
    titulo: 'Crear un libro nuevo',
    como: 'Administrador',
    quiero: 'agregar un libro con su titulo, ISBN, autor, categoria, precio, stock y una imagen de portada',
    para: 'registrar nuevos libros en el inventario',
    prioridad: 'Alta',
    modulo: 'Inventario'
  },
  {
    id: 'HU-12',
    titulo: 'Editar un libro existente',
    como: 'Administrador',
    quiero: 'modificar los datos de un libro (titulo, precio, stock, portada, etc.)',
    para: 'corregir o actualizar la informacion de un libro',
    prioridad: 'Alta',
    modulo: 'Inventario'
  },
  {
    id: 'HU-13',
    titulo: 'Eliminar un libro',
    como: 'Administrador',
    quiero: 'eliminar un libro del inventario',
    para: 'quitar libros que ya no se venden',
    prioridad: 'Media',
    modulo: 'Inventario'
  },

  // ── MODULO: MOVIMIENTOS (KARDEX) ──
  {
    id: 'HU-14',
    titulo: 'Registrar entrada de inventario',
    como: 'Administrador',
    quiero: 'registrar una entrada de libros indicando el libro, la cantidad, el proveedor y el costo de compra',
    para: 'que el stock se actualice automaticamente cuando llegan libros nuevos',
    prioridad: 'Alta',
    modulo: 'Movimientos'
  },
  {
    id: 'HU-15',
    titulo: 'Registrar salida de inventario',
    como: 'Administrador',
    quiero: 'registrar una salida de libros indicando el libro, la cantidad y el motivo',
    para: 'descontar del stock los libros que salieron por motivos diferentes a ventas',
    prioridad: 'Alta',
    modulo: 'Movimientos'
  },
  {
    id: 'HU-16',
    titulo: 'Ver historial de movimientos',
    como: 'Administrador',
    quiero: 'ver el historial con el libro, tipo (entrada/salida), cantidad, stock anterior, stock nuevo, proveedor, costo, usuario y fecha',
    para: 'tener un control detallado de todo lo que ha entrado y salido del inventario',
    prioridad: 'Alta',
    modulo: 'Movimientos'
  },

  // ── MODULO: VENTAS (POS) ──
  {
    id: 'HU-17',
    titulo: 'Registrar una venta',
    como: 'Usuario (Administrador o Vendedor)',
    quiero: 'buscar un cliente, agregar libros al carrito, elegir metodo de pago y confirmar la venta',
    para: 'registrar las ventas de la libreria y descontar el stock automaticamente',
    prioridad: 'Alta',
    modulo: 'Ventas'
  },
  {
    id: 'HU-18',
    titulo: 'Aplicar descuento a una venta',
    como: 'Usuario (Administrador o Vendedor)',
    quiero: 'aplicar un descuento en porcentaje (0% a 100%) al total de la venta desde el punto de venta',
    para: 'ofrecer descuentos a los clientes y que el sistema calcule automaticamente el subtotal, descuento y total final',
    prioridad: 'Media',
    modulo: 'Ventas'
  },
  {
    id: 'HU-19',
    titulo: 'Ver historial de ventas',
    como: 'Usuario (Administrador o Vendedor)',
    quiero: 'ver todas las ventas realizadas con su estado (completada o anulada)',
    para: 'consultar las ventas anteriores',
    prioridad: 'Alta',
    modulo: 'Ventas'
  },
  {
    id: 'HU-20',
    titulo: 'Filtrar ventas por fecha y buscar por cliente',
    como: 'Usuario (Administrador o Vendedor)',
    quiero: 'filtrar las ventas por rango de fechas y buscar por nombre de cliente',
    para: 'encontrar rapidamente una venta especifica',
    prioridad: 'Media',
    modulo: 'Ventas'
  },
  {
    id: 'HU-21',
    titulo: 'Anular una venta',
    como: 'Administrador',
    quiero: 'anular una venta, lo que devuelve los libros al inventario automaticamente',
    para: 'corregir ventas que se hicieron por error',
    prioridad: 'Alta',
    modulo: 'Ventas'
  },
  {
    id: 'HU-22',
    titulo: 'Descargar ticket de venta en PDF',
    como: 'Usuario (Administrador o Vendedor)',
    quiero: 'descargar un ticket de venta en formato PDF',
    para: 'entregarle un comprobante al cliente',
    prioridad: 'Media',
    modulo: 'Ventas'
  },
  {
    id: 'HU-23',
    titulo: 'Exportar ventas a Excel',
    como: 'Usuario (Administrador o Vendedor)',
    quiero: 'exportar la lista de ventas filtrada a un archivo de Excel',
    para: 'analizar los datos de ventas en una hoja de calculo',
    prioridad: 'Baja',
    modulo: 'Ventas'
  },

  // ── MODULO: CLIENTES ──
  {
    id: 'HU-24',
    titulo: 'Ver lista de clientes',
    como: 'Usuario (Administrador o Vendedor)',
    quiero: 'ver todos los clientes registrados con su nombre, documento, telefono y correo',
    para: 'consultar la informacion de los clientes',
    prioridad: 'Alta',
    modulo: 'Clientes'
  },
  {
    id: 'HU-25',
    titulo: 'Buscar clientes',
    como: 'Usuario (Administrador o Vendedor)',
    quiero: 'buscar clientes por nombre o documento',
    para: 'encontrar rapidamente un cliente',
    prioridad: 'Alta',
    modulo: 'Clientes'
  },
  {
    id: 'HU-26',
    titulo: 'Crear un cliente nuevo',
    como: 'Usuario (Administrador o Vendedor)',
    quiero: 'registrar un cliente con su nombre, tipo de documento (CC, NIT, CE, Pasaporte), documento, telefono y correo',
    para: 'tener los datos del cliente para futuras ventas',
    prioridad: 'Alta',
    modulo: 'Clientes'
  },
  {
    id: 'HU-27',
    titulo: 'Editar un cliente',
    como: 'Administrador',
    quiero: 'modificar los datos de un cliente existente',
    para: 'corregir o actualizar la informacion del cliente',
    prioridad: 'Media',
    modulo: 'Clientes'
  },
  {
    id: 'HU-28',
    titulo: 'Eliminar un cliente',
    como: 'Administrador',
    quiero: 'eliminar un cliente del sistema',
    para: 'quitar clientes que ya no son necesarios',
    prioridad: 'Baja',
    modulo: 'Clientes'
  },

  // ── MODULO: PROVEEDORES ──
  {
    id: 'HU-29',
    titulo: 'Gestionar proveedores',
    como: 'Administrador',
    quiero: 'crear, editar y activar/desactivar proveedores con sus datos (empresa, NIT, contacto, email, telefono, direccion)',
    para: 'mantener actualizada la informacion de quienes nos venden libros',
    prioridad: 'Alta',
    modulo: 'Proveedores'
  },

  // ── MODULO: AUTORES ──
  {
    id: 'HU-30',
    titulo: 'Gestionar autores',
    como: 'Administrador',
    quiero: 'crear, editar y eliminar autores con su nombre y nacionalidad',
    para: 'poder clasificar los libros por autor',
    prioridad: 'Media',
    modulo: 'Autores'
  },

  // ── MODULO: CATEGORIAS ──
  {
    id: 'HU-31',
    titulo: 'Gestionar categorias',
    como: 'Administrador',
    quiero: 'crear, editar y eliminar categorias con su nombre y descripcion',
    para: 'poder clasificar los libros por categoria',
    prioridad: 'Media',
    modulo: 'Categorias'
  },

  // ── MODULO: GESTION DE USUARIOS ──
  {
    id: 'HU-32',
    titulo: 'Ver lista de usuarios del sistema',
    como: 'Administrador',
    quiero: 'ver todos los usuarios con su nombre, correo, rol, estado y ultimo acceso',
    para: 'saber quienes tienen acceso al sistema',
    prioridad: 'Alta',
    modulo: 'Usuarios'
  },
  {
    id: 'HU-33',
    titulo: 'Crear un usuario nuevo',
    como: 'Administrador',
    quiero: 'crear un usuario con nombre, correo, contrasena y rol (Administrador o Vendedor)',
    para: 'dar acceso al sistema a nuevos empleados',
    prioridad: 'Alta',
    modulo: 'Usuarios'
  },
  {
    id: 'HU-34',
    titulo: 'Editar un usuario',
    como: 'Administrador',
    quiero: 'editar el nombre, correo y rol de un usuario existente',
    para: 'actualizar la informacion o cambiar el rol de un empleado',
    prioridad: 'Media',
    modulo: 'Usuarios'
  },
  {
    id: 'HU-35',
    titulo: 'Activar o desactivar un usuario',
    como: 'Administrador',
    quiero: 'activar o desactivar la cuenta de un usuario (sin poder desactivarme a mi mismo)',
    para: 'controlar quienes pueden acceder al sistema sin eliminar sus cuentas',
    prioridad: 'Alta',
    modulo: 'Usuarios'
  }
];

// Colores para los badges de prioridad
const colorPrioridad = {
  'Alta': 'danger',
  'Media': 'warning',
  'Baja': 'info'
};

// Colores para los badges de modulo
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

const DocumentacionHistorias = () => {
  // Agrupar historias por modulo
  const modulos = {};
  historias.forEach(h => {
    if (!modulos[h.modulo]) modulos[h.modulo] = [];
    modulos[h.modulo].push(h);
  });

  return (
    <div className="container py-4">
      <div className="mb-4">
        <h2 className="fw-bold text-primary">Historias de Usuario</h2>
        <p className="text-muted">
          Estas son las funcionalidades del sistema descritas desde el punto de vista del usuario.
          Cada historia explica que puede hacer cada tipo de usuario y para que le sirve.
        </p>
        <div className="alert alert-light border">
          <strong>Total:</strong> {historias.length} historias de usuario &nbsp;|&nbsp;
          <strong>Modulos:</strong> {Object.keys(modulos).length}
        </div>
      </div>

      {Object.entries(modulos).map(([modulo, lista]) => (
        <div key={modulo} className="mb-5">
          <h4 className="fw-bold border-bottom pb-2 mb-3">
            <span className={`badge bg-${colorModulo[modulo] || 'secondary'} me-2`}>{modulo}</span>
            <small className="text-muted fw-normal">({lista.length} historias)</small>
          </h4>

          {lista.map(h => (
            <div key={h.id} className="card mb-3 shadow-sm">
              <div className="card-header bg-light d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div>
                  <span className="badge bg-secondary me-2">{h.id}</span>
                  <strong>{h.titulo}</strong>
                </div>
                <span className={`badge bg-${colorPrioridad[h.prioridad]}`}>
                  Prioridad: {h.prioridad}
                </span>
              </div>
              <div className="card-body">
                <p className="mb-1"><strong>Como:</strong> {h.como}</p>
                <p className="mb-1"><strong>Quiero:</strong> {h.quiero}</p>
                <p className="mb-0"><strong>Para:</strong> {h.para}</p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default DocumentacionHistorias;