import React from 'react';

// =====================================================
// PAGINA: Manual de Usuario
// =====================================================
// Explica paso a paso como usar el sistema.
// Escrito en lenguaje sencillo para que cualquier
// persona pueda entenderlo, aunque no sepa de programacion.
// =====================================================

const DocumentacionManualUsuario = () => {
  return (
    <div className="container py-4">
      <h2 className="fw-bold text-primary mb-1">Manual de Usuario</h2>
      <p className="text-muted mb-4">
        Esta guia te explica paso a paso como usar el Sistema de Gestion de Inventario
        de la Libreria El Saber. Esta escrita en lenguaje sencillo para que cualquier persona
        pueda entender como funciona.
      </p>

      {/* ── 1. INICIAR SESION ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">
          1. Como iniciar sesion
        </div>
        <div className="card-body">
          <ol>
            <li className="mb-2">Abre el navegador (Chrome, Firefox, Edge) y entra a la direccion del sistema.</li>
            <li className="mb-2">Veras la pagina de login con dos campos: <strong>Correo electronico</strong> y <strong>Contrasena</strong>.</li>
            <li className="mb-2">Escribe tu correo y tu contrasena.</li>
            <li className="mb-2">Haz clic en el boton <strong>"Iniciar Sesion"</strong>.</li>
            <li className="mb-2">Si los datos son correctos, entraras al sistema.</li>
            <li className="mb-0">Si te equivocas 3 veces seguidas, tu cuenta se bloqueara por seguridad. En ese caso, pide al Administrador que la desbloquee.</li>
          </ol>
          <div className="alert alert-info mt-3 mb-0 small">
            <strong>Tip:</strong> Puedes hacer clic en el icono del ojo para ver u ocultar tu contrasena mientras la escribes.
          </div>
        </div>
      </div>

      {/* ── 2. NAVEGACION ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">
          2. Como navegar por el sistema
        </div>
        <div className="card-body">
          <p>Una vez dentro, veras una <strong>barra de navegacion</strong> en la parte de arriba con estas opciones:</p>
          <ul>
            <li><strong>Dashboard:</strong> Estadisticas del negocio (solo Administrador)</li>
            <li><strong>Gestion Comercial:</strong> Ventas, Historial de Ventas y Clientes</li>
            <li><strong>Logistica:</strong> Inventario, Movimientos, Autores, Categorias y Proveedores</li>
            <li><strong>Tu nombre:</strong> Menu con opciones de usuario (cambiar contrasena, cerrar sesion, gestion de usuarios)</li>
          </ul>
          <div className="alert alert-warning small mb-0">
            <strong>En celular:</strong> La barra de navegacion se convierte en un boton de 3 lineas (hamburguesa).
            Toca ese boton para ver las opciones.
          </div>
        </div>
      </div>

      {/* ── 3. DASHBOARD ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">
          3. Dashboard (solo Administrador)
        </div>
        <div className="card-body">
          <p>Es la primera pagina que ve el Administrador al entrar. Aqui puedes ver:</p>
          <ul>
            <li><strong>Tarjetas de resumen:</strong> Ventas del dia, ventas del mes, total de libros en el catalogo y cuantos libros tienen stock bajo.</li>
            <li><strong>Grafica de barras:</strong> Muestra las ventas e ingresos de los ultimos 6 meses.</li>
            <li><strong>Grafica de torta:</strong> Muestra como estan distribuidos los libros por categorias.</li>
            <li><strong>Top 5 libros mas vendidos:</strong> Los libros que mas se han vendido con sus ingresos.</li>
            <li><strong>Top 5 mejores clientes:</strong> Los clientes que mas han comprado.</li>
            <li><strong>Libros con stock bajo:</strong> Una tabla con los libros que necesitan reabastecimiento.</li>
          </ul>
        </div>
      </div>

      {/* ── 4. INVENTARIO ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">
          4. Como gestionar el inventario
        </div>
        <div className="card-body">
          <h6 className="fw-bold">Ver los libros</h6>
          <ol>
            <li>Ve a <strong>Logistica &rarr; Inventario</strong>.</li>
            <li>Veras una tabla con todos los libros: imagen, titulo, autor, categoria, precio y stock.</li>
            <li>Cada libro tiene un indicador de color: <span className="badge bg-success">Disponible</span>, <span className="badge bg-warning text-dark">Stock Bajo</span> o <span className="badge bg-danger">Agotado</span>.</li>
          </ol>

          <h6 className="fw-bold mt-3">Buscar un libro</h6>
          <ol>
            <li>Escribe en el campo de busqueda que esta arriba de la tabla.</li>
            <li>Puedes buscar por titulo, autor o ISBN.</li>
            <li>La tabla se filtra automaticamente mientras escribes.</li>
          </ol>

          <h6 className="fw-bold mt-3">Agregar un libro nuevo (solo Administrador)</h6>
          <ol>
            <li>Haz clic en el boton <strong>"Agregar libro"</strong>.</li>
            <li>Llena el formulario con los datos del libro (titulo, ISBN, autor, categoria, precio, stock).</li>
            <li>Opcionalmente, sube una imagen de portada (JPG, PNG o WebP, maximo 2 MB).</li>
            <li>Haz clic en <strong>"Guardar"</strong>.</li>
          </ol>

          <h6 className="fw-bold mt-3">Editar o eliminar un libro (solo Administrador)</h6>
          <ol>
            <li>En la tabla, busca el libro que quieres editar.</li>
            <li>Haz clic en el boton de <strong>editar</strong> (lapiz) para modificar sus datos.</li>
            <li>Haz clic en el boton de <strong>eliminar</strong> (basura) para borrarlo. Te pedira confirmacion antes.</li>
          </ol>
        </div>
      </div>

      {/* ── 5. MOVIMIENTOS ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">
          5. Como registrar movimientos de inventario (Kardex)
        </div>
        <div className="card-body">
          <p>Los movimientos sirven para registrar cuando llegan libros nuevos (ENTRADA) o cuando salen por algun motivo que no es venta (SALIDA).</p>

          <h6 className="fw-bold">Registrar una entrada</h6>
          <ol>
            <li>Ve a <strong>Logistica &rarr; Movimientos</strong>.</li>
            <li>Selecciona el tipo <strong>"ENTRADA"</strong>.</li>
            <li>Elige el libro que llego.</li>
            <li>Escribe la cantidad, selecciona el proveedor y escribe el costo de compra.</li>
            <li>Haz clic en <strong>"Registrar"</strong>.</li>
            <li>El stock del libro se actualizara automaticamente.</li>
          </ol>

          <h6 className="fw-bold mt-3">Registrar una salida</h6>
          <ol>
            <li>Selecciona el tipo <strong>"SALIDA"</strong>.</li>
            <li>Elige el libro y la cantidad que sale.</li>
            <li>Haz clic en <strong>"Registrar"</strong>.</li>
          </ol>

          <p className="mb-0">En la parte de abajo veras el <strong>historial de movimientos</strong> con todos los registros.</p>
        </div>
      </div>

      {/* ── 6. VENTAS ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">
          6. Como registrar una venta
        </div>
        <div className="card-body">
          <ol>
            <li className="mb-2">Ve a <strong>Gestion Comercial &rarr; POS / Ventas</strong>.</li>
            <li className="mb-2"><strong>Busca al cliente:</strong> Escribe el nombre del cliente en el buscador. Si no existe, puedes crearlo desde la seccion de Clientes.</li>
            <li className="mb-2"><strong>Agrega libros al carrito:</strong> Busca el libro, elige la cantidad y haz clic en "Agregar". Puedes agregar varios libros.</li>
            <li className="mb-2"><strong>Revisa el carrito:</strong> Puedes cambiar las cantidades o eliminar productos del carrito.</li>
            <li className="mb-2"><strong>Aplica descuento (opcional):</strong> Puedes aplicar un descuento en porcentaje o en pesos.</li>
            <li className="mb-2"><strong>Elige el metodo de pago:</strong> Efectivo, Tarjeta, Transferencia o Mixto.</li>
            <li className="mb-0"><strong>Confirma la venta:</strong> Haz clic en "Confirmar venta". El stock se descuenta automaticamente.</li>
          </ol>
          <div className="alert alert-info mt-3 mb-0 small">
            <strong>En celular:</strong> El carrito aparece debajo del formulario de productos en vez de al lado.
          </div>
        </div>
      </div>

      {/* ── 7. HISTORIAL DE VENTAS ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">
          7. Como consultar el historial de ventas
        </div>
        <div className="card-body">
          <ol>
            <li className="mb-2">Ve a <strong>Gestion Comercial &rarr; Historial</strong>.</li>
            <li className="mb-2">Veras una tabla con todas las ventas. Cada una tiene un estado: <span className="badge bg-success">Completada</span> o <span className="badge bg-danger">Anulada</span>.</li>
            <li className="mb-2"><strong>Filtrar por fecha:</strong> Usa los campos de fecha "desde" y "hasta" para filtrar.</li>
            <li className="mb-2"><strong>Buscar por cliente:</strong> Escribe el nombre del cliente en el buscador.</li>
            <li className="mb-2"><strong>Descargar ticket PDF:</strong> Haz clic en el boton de PDF junto a una venta para descargar el ticket.</li>
            <li className="mb-2"><strong>Exportar a Excel:</strong> Haz clic en "Exportar a Excel" para descargar un archivo con las ventas filtradas.</li>
            <li className="mb-0"><strong>Anular venta (solo Admin):</strong> Haz clic en "Anular" junto a una venta completada. Los libros volverian al inventario.</li>
          </ol>
        </div>
      </div>

      {/* ── 8. CLIENTES ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">
          8. Como gestionar clientes
        </div>
        <div className="card-body">
          <ol>
            <li className="mb-2">Ve a <strong>Gestion Comercial &rarr; Clientes</strong>.</li>
            <li className="mb-2">Veras la lista de clientes registrados.</li>
            <li className="mb-2"><strong>Buscar:</strong> Escribe en el buscador para filtrar por nombre o documento.</li>
            <li className="mb-2"><strong>Crear cliente:</strong> Haz clic en "Agregar cliente" y llena el formulario (nombre, tipo de documento, documento, telefono, correo).</li>
            <li className="mb-2"><strong>Editar (solo Admin):</strong> Haz clic en el boton de editar junto al cliente.</li>
            <li className="mb-0"><strong>Eliminar (solo Admin):</strong> Haz clic en el boton de eliminar. Te pedira confirmacion.</li>
          </ol>
          <div className="alert alert-light border small mt-3 mb-0">
            <strong>Tipos de documento disponibles:</strong> Cedula de Ciudadania (CC), NIT, Cedula de Extranjeria (CE), Pasaporte.
          </div>
        </div>
      </div>

      {/* ── 9. PROVEEDORES ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">
          9. Como gestionar proveedores (solo Administrador)
        </div>
        <div className="card-body">
          <ol>
            <li className="mb-2">Ve a <strong>Logistica &rarr; Proveedores</strong>.</li>
            <li className="mb-2">Veras la lista de proveedores con su empresa, NIT, contacto, etc.</li>
            <li className="mb-2"><strong>Crear proveedor:</strong> Haz clic en "Agregar proveedor" y llena los datos (empresa, NIT, contacto, email, telefono, direccion).</li>
            <li className="mb-2"><strong>Editar:</strong> Haz clic en el boton de editar para modificar los datos.</li>
            <li className="mb-0"><strong>Activar/Desactivar:</strong> En vez de eliminar, puedes desactivar un proveedor. Un proveedor inactivo no aparece en los formularios de movimientos.</li>
          </ol>
        </div>
      </div>

      {/* ── 10. AUTORES Y CATEGORIAS ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">
          10. Como gestionar autores y categorias
        </div>
        <div className="card-body">
          <h6 className="fw-bold">Autores</h6>
          <ol>
            <li className="mb-1">Ve a <strong>Logistica &rarr; Autores</strong>.</li>
            <li className="mb-1">Puedes crear un autor con su nombre y nacionalidad.</li>
            <li className="mb-1">No se puede eliminar un autor que tiene libros asociados.</li>
          </ol>

          <h6 className="fw-bold mt-3">Categorias</h6>
          <ol>
            <li className="mb-1">Ve a <strong>Logistica &rarr; Categorias</strong>.</li>
            <li className="mb-1">Puedes crear una categoria con su nombre y descripcion.</li>
            <li className="mb-1">No se puede eliminar una categoria que tiene libros asociados.</li>
          </ol>

          <div className="alert alert-info small mt-3 mb-0">
            <strong>Nota:</strong> Todos los usuarios pueden ver autores y categorias, pero solo el Administrador puede crear, editar o eliminar.
          </div>
        </div>
      </div>

      {/* ── 11. GESTION DE USUARIOS ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">
          11. Como gestionar usuarios (solo Administrador)
        </div>
        <div className="card-body">
          <ol>
            <li className="mb-2">Haz clic en tu nombre en la barra de navegacion y selecciona <strong>"Gestion de Usuarios"</strong>.</li>
            <li className="mb-2">Veras una tabla con todos los usuarios del sistema.</li>
            <li className="mb-2"><strong>Crear usuario:</strong> Haz clic en "Agregar usuario" y llena los datos (nombre, email, contrasena y rol).</li>
            <li className="mb-2"><strong>Editar:</strong> Puedes cambiar el nombre, email y rol de un usuario.</li>
            <li className="mb-0"><strong>Activar/Desactivar:</strong> Puedes desactivar un usuario para que no pueda iniciar sesion. No puedes desactivarte a ti mismo.</li>
          </ol>
        </div>
      </div>

      {/* ── 12. CAMBIAR CONTRASENA ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">
          12. Como cambiar tu contrasena
        </div>
        <div className="card-body">
          <ol>
            <li className="mb-2">Haz clic en tu nombre en la barra de navegacion.</li>
            <li className="mb-2">Selecciona <strong>"Cambiar Contrasena"</strong>.</li>
            <li className="mb-2">Se abrira una ventana (modal) con tres campos:</li>
          </ol>
          <ul className="mb-3">
            <li><strong>Contrasena actual:</strong> Escribe tu contrasena actual para verificar tu identidad.</li>
            <li><strong>Nueva contrasena:</strong> Escribe la nueva contrasena (minimo 6 caracteres).</li>
            <li><strong>Confirmar contrasena:</strong> Vuelve a escribir la nueva contrasena para asegurarte de que esta bien.</li>
          </ul>
          <p className="mb-0">Haz clic en <strong>"Guardar"</strong>. Si todo esta bien, veras un mensaje de exito.</p>
        </div>
      </div>

      {/* ── 13. ROLES ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">
          13. Diferencias entre Administrador y Vendedor
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>Funcion</th>
                  <th className="text-center">Administrador</th>
                  <th className="text-center">Vendedor</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Ver Dashboard</td><td className="text-center text-success">Si</td><td className="text-center text-danger">No</td></tr>
                <tr><td>Ver inventario</td><td className="text-center text-success">Si</td><td className="text-center text-success">Si</td></tr>
                <tr><td>Crear/editar/eliminar libros</td><td className="text-center text-success">Si</td><td className="text-center text-danger">No</td></tr>
                <tr><td>Registrar movimientos</td><td className="text-center text-success">Si</td><td className="text-center text-danger">No</td></tr>
                <tr><td>Registrar ventas</td><td className="text-center text-success">Si</td><td className="text-center text-success">Si</td></tr>
                <tr><td>Ver historial de ventas</td><td className="text-center text-success">Si</td><td className="text-center text-success">Si</td></tr>
                <tr><td>Anular ventas</td><td className="text-center text-success">Si</td><td className="text-center text-danger">No</td></tr>
                <tr><td>Ver clientes</td><td className="text-center text-success">Si</td><td className="text-center text-success">Si</td></tr>
                <tr><td>Crear clientes</td><td className="text-center text-success">Si</td><td className="text-center text-success">Si</td></tr>
                <tr><td>Editar/eliminar clientes</td><td className="text-center text-success">Si</td><td className="text-center text-danger">No</td></tr>
                <tr><td>Gestionar proveedores</td><td className="text-center text-success">Si</td><td className="text-center text-danger">No</td></tr>
                <tr><td>Ver autores y categorias</td><td className="text-center text-success">Si</td><td className="text-center text-success">Si</td></tr>
                <tr><td>Gestionar usuarios</td><td className="text-center text-success">Si</td><td className="text-center text-danger">No</td></tr>
                <tr><td>Cambiar contrasena propia</td><td className="text-center text-success">Si</td><td className="text-center text-success">Si</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── PREGUNTAS FRECUENTES ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-dark text-white fw-bold">
          Preguntas frecuentes
        </div>
        <div className="card-body">
          <h6 className="fw-bold">Mi cuenta esta bloqueada, que hago?</h6>
          <p>Despues de 3 intentos fallidos la cuenta se bloquea. Pide al Administrador que la desbloquee.</p>

          <h6 className="fw-bold">No veo algunas opciones en el menu, por que?</h6>
          <p>Probablemente tu rol es Vendedor. Algunas opciones como Dashboard, Movimientos y Gestion de Usuarios solo estan disponibles para Administradores.</p>

          <h6 className="fw-bold">Puedo anular una venta?</h6>
          <p>Solo el Administrador puede anular ventas. Al anular, los libros vuelven al inventario automaticamente.</p>

          <h6 className="fw-bold">Que pasa si intento vender mas libros de los que hay en stock?</h6>
          <p className="mb-0">El sistema no lo permite. Valida la cantidad disponible antes de confirmar la venta.</p>
        </div>
      </div>
    </div>
  );
};

export default DocumentacionManualUsuario;