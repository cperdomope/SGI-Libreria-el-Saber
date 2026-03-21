import React from 'react';

// =====================================================
// PAGINA: Manual Tecnico
// =====================================================
// Explica como esta construido el sistema por dentro.
// Pensado para que un desarrollador o estudiante entienda
// la estructura, las tecnologias y como funciona todo.
// =====================================================

const DocumentacionManualTecnico = () => {
  return (
    <div className="container py-4">
      <h2 className="fw-bold text-primary mb-1">Manual Tecnico</h2>
      <p className="text-muted mb-4">
        Este manual explica como esta construido el sistema por dentro: que tecnologias usamos,
        como esta organizado el codigo y como funciona cada parte.
      </p>

      {/* ── SECCION 1: DESCRIPCION GENERAL ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-primary text-white fw-bold">
          1. Descripcion general del sistema
        </div>
        <div className="card-body">
          <p>
            El <strong>SGI Libreria El Saber</strong> es una aplicacion web que sirve para gestionar
            el inventario, las ventas, los clientes y los proveedores de una libreria.
          </p>
          <p>
            El sistema tiene dos tipos de usuarios:
          </p>
          <ul>
            <li><strong>Administrador:</strong> puede hacer todo (gestionar inventario, usuarios, ver estadisticas, anular ventas, etc.)</li>
            <li><strong>Vendedor:</strong> puede registrar ventas, ver el inventario y gestionar clientes</li>
          </ul>
          <p className="mb-0">
            La aplicacion funciona desde el navegador (Chrome, Firefox, Edge, etc.) y se adapta
            a celulares, tablets y computadores.
          </p>
        </div>
      </div>

      {/* ── SECCION 2: ARQUITECTURA ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-primary text-white fw-bold">
          2. Arquitectura del sistema (como esta dividido)
        </div>
        <div className="card-body">
          <p>El proyecto tiene 3 partes principales que trabajan juntas:</p>

          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <div className="card h-100 border-success">
                <div className="card-body text-center">
                  <h5 className="text-success fw-bold">Frontend</h5>
                  <p className="small mb-1">Carpeta: <code>cliente/</code></p>
                  <p className="small mb-0">Es lo que el usuario ve y toca en el navegador: botones, formularios, tablas, graficas.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 border-warning">
                <div className="card-body text-center">
                  <h5 className="text-warning fw-bold">Backend</h5>
                  <p className="small mb-1">Carpeta: <code>servidor/</code></p>
                  <p className="small mb-0">Es la logica del negocio. Recibe peticiones del frontend, las procesa y responde con datos.</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 border-info">
                <div className="card-body text-center">
                  <h5 className="text-info fw-bold">Base de Datos</h5>
                  <p className="small mb-1">MySQL</p>
                  <p className="small mb-0">Donde se guarda toda la informacion de forma permanente: libros, ventas, usuarios, etc.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="alert alert-light border">
            <strong>Flujo basico:</strong> El usuario hace clic en un boton (Frontend) &rarr;
            Se envia una peticion al servidor (Backend) &rarr; El servidor consulta o guarda datos
            en la base de datos (MySQL) &rarr; El servidor responde &rarr; El frontend muestra el resultado.
          </div>
        </div>
      </div>

      {/* ── SECCION 3: TECNOLOGIAS ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-primary text-white fw-bold">
          3. Tecnologias utilizadas
        </div>
        <div className="card-body">
          <h6 className="fw-bold mt-2 mb-2">Frontend (lo que ve el usuario)</h6>
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>Tecnologia</th>
                  <th>Para que la usamos</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><strong>React</strong></td><td>Para crear la interfaz del usuario (botones, formularios, tablas)</td></tr>
                <tr><td><strong>Vite</strong></td><td>Para que el proyecto cargue rapido mientras desarrollamos</td></tr>
                <tr><td><strong>Bootstrap 5</strong></td><td>Para que el diseno se vea bien y funcione en celulares</td></tr>
                <tr><td><strong>React Router</strong></td><td>Para navegar entre paginas sin recargar toda la app</td></tr>
                <tr><td><strong>Axios</strong></td><td>Para enviar y recibir datos del servidor</td></tr>
                <tr><td><strong>react-hook-form</strong></td><td>Para manejar formularios y validar los campos</td></tr>
                <tr><td><strong>Recharts</strong></td><td>Para crear las graficas del Dashboard</td></tr>
                <tr><td><strong>jsPDF</strong></td><td>Para generar tickets de venta en PDF</td></tr>
                <tr><td><strong>xlsx</strong></td><td>Para exportar datos a archivos de Excel</td></tr>
              </tbody>
            </table>
          </div>

          <h6 className="fw-bold mt-3 mb-2">Backend (la logica del servidor)</h6>
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>Tecnologia</th>
                  <th>Para que la usamos</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><strong>Node.js</strong></td><td>Motor que permite correr JavaScript en el servidor</td></tr>
                <tr><td><strong>Express 5</strong></td><td>Framework para crear las rutas de la API y manejar peticiones</td></tr>
                <tr><td><strong>MySQL 8</strong></td><td>Base de datos donde se guarda toda la informacion</td></tr>
                <tr><td><strong>JWT</strong></td><td>Para manejar sesiones de forma segura con tokens</td></tr>
                <tr><td><strong>bcrypt</strong></td><td>Para guardar las contrasenas encriptadas</td></tr>
                <tr><td><strong>Multer</strong></td><td>Para subir imagenes de portada de los libros</td></tr>
                <tr><td><strong>morgan</strong></td><td>Para ver en la consola que peticiones llegan al servidor</td></tr>
                <tr><td><strong>compression</strong></td><td>Para comprimir las respuestas y que cargue mas rapido</td></tr>
                <tr><td><strong>Jest + Supertest</strong></td><td>Para hacer pruebas automatizadas</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── SECCION 4: ESTRUCTURA DE CARPETAS ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-primary text-white fw-bold">
          4. Estructura de carpetas del proyecto
        </div>
        <div className="card-body">
          <pre className="bg-light p-3 rounded small" style={{ overflowX: 'auto' }}>
{`proyecto-inventario/
|
|-- cliente/                    (Frontend - React)
|   |-- src/
|   |   |-- main.jsx            (Punto de entrada de React)
|   |   |-- index.css            (Estilos base de la aplicacion)
|   |   |-- App.jsx              (Componente raiz con las rutas)
|   |   |
|   |   |-- pages/              (Paginas de la aplicacion)
|   |   |   |-- Acceso.jsx            Login
|   |   |   |-- Inicio.jsx            Dashboard
|   |   |   |-- Inventario.jsx        Lista de libros
|   |   |   |-- Movimientos.jsx       Entradas y salidas
|   |   |   |-- PaginaVentas.jsx      Punto de venta
|   |   |   |-- HistorialVentas.jsx   Historial de ventas
|   |   |   |-- PaginaClientes.jsx    Clientes
|   |   |   |-- AdminUsuarios.jsx     Gestion de usuarios
|   |   |   |-- PaginaProveedores.jsx Proveedores
|   |   |   |-- PaginaAutores.jsx     Autores
|   |   |   |-- PaginaCategorias.jsx  Categorias
|   |   |   |-- DocumentacionHistorias.jsx      Historias de usuario
|   |   |   |-- DocumentacionCriterios.jsx      Criterios de aceptacion
|   |   |   |-- DocumentacionManualTecnico.jsx  Manual tecnico
|   |   |   |-- DocumentacionManualUsuario.jsx  Manual de usuario
|   |   |
|   |   |-- components/         (Componentes reutilizables)
|   |   |   |-- BarraNavegacion.jsx
|   |   |   |-- ModalCambiarPassword.jsx
|   |   |   |-- RutaProtegida.jsx
|   |   |   |-- RutaProtegidaPorRol.jsx
|   |   |   |-- LayoutPrincipal.jsx
|   |   |
|   |   |-- context/AuthContext.jsx   (Manejo de sesion y permisos)
|   |   |-- services/api.js           (Conexion con el servidor)
|   |   |-- hooks/usePaginacion.js    (Logica de paginacion)
|   |   |-- styles/custom-theme.css   (Estilos personalizados)
|
|-- servidor/                   (Backend - Node.js + Express)
|   |-- controllers/            (Logica de cada modulo)
|   |-- routes/                 (Rutas de la API)
|   |-- middlewares/            (Seguridad: JWT, roles, etc.)
|   |-- config/db.js            (Conexion a MySQL)
|   |-- utils/paginacion.js     (Utilidad para paginar resultados)
|   |-- pruebas/                (Tests automatizados)
|   |-- scripts/                (Scripts auxiliares de mantenimiento)
|   |-- uploads/portadas/       (Imagenes de libros)
|   |-- app.js                  (Configuracion del servidor)
|   |-- index.js                (Archivo que arranca todo)
|   |-- pm2.config.js           (Configuracion de PM2 para produccion)
|
|-- base_datos/
    |-- sgi_libreria_completo.sql   (Script para crear la BD)`}
          </pre>
        </div>
      </div>

      {/* ── SECCION 5: BASE DE DATOS ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-primary text-white fw-bold">
          5. Base de datos
        </div>
        <div className="card-body">
          <p>
            Usamos <strong>MySQL 8</strong> con motor <strong>InnoDB</strong> (que soporta transacciones).
            La base de datos se llama <code>inventario_libreria</code> y tiene 10 tablas.
            Todas las tablas empiezan con el prefijo <code>mdc_</code>.
          </p>

          <h6 className="fw-bold mt-3">Tablas del sistema</h6>
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>Tabla</th>
                  <th>Que guarda</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>mdc_roles</code></td><td>Roles: Administrador (1) y Vendedor (2)</td></tr>
                <tr><td><code>mdc_usuarios</code></td><td>Cuentas de empleados (nombre, email, contrasena encriptada, estado)</td></tr>
                <tr><td><code>mdc_libros</code></td><td>Libros con ISBN, precio, stock actual, stock minimo y portada</td></tr>
                <tr><td><code>mdc_autores</code></td><td>Autores con nombre y nacionalidad</td></tr>
                <tr><td><code>mdc_categorias</code></td><td>Categorias con nombre y descripcion</td></tr>
                <tr><td><code>mdc_movimientos</code></td><td>Historial de entradas y salidas de inventario</td></tr>
                <tr><td><code>mdc_clientes</code></td><td>Datos de los clientes</td></tr>
                <tr><td><code>mdc_proveedores</code></td><td>Datos de los proveedores</td></tr>
                <tr><td><code>mdc_ventas</code></td><td>Las ventas realizadas (cabecera)</td></tr>
                <tr><td><code>mdc_detalle_ventas</code></td><td>Los libros vendidos en cada venta (detalle)</td></tr>
              </tbody>
            </table>
          </div>

          <h6 className="fw-bold mt-3">Relaciones entre tablas</h6>
          <pre className="bg-light p-3 rounded small">
{`mdc_roles --------> mdc_usuarios ---------> mdc_movimientos
                                 |---------> mdc_ventas

mdc_autores ------> mdc_libros ------------> mdc_movimientos
mdc_categorias ---> mdc_libros ------------> mdc_detalle_ventas

mdc_clientes -----> mdc_ventas ------------> mdc_detalle_ventas
mdc_proveedores --> mdc_movimientos`}
          </pre>

          <p className="mb-0">
            La base de datos esta normalizada en <strong>Tercera Forma Normal (3NF)</strong>,
            lo que significa que la informacion no se repite innecesariamente y esta bien organizada.
          </p>
        </div>
      </div>

      {/* ── SECCION 6: API REST ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-primary text-white fw-bold">
          6. API REST (como se comunica el frontend con el backend)
        </div>
        <div className="card-body">
          <p>
            El frontend y el backend se comunican a traves de una <strong>API REST</strong>.
            Esto significa que el frontend envia peticiones HTTP (GET, POST, PUT, DELETE) a
            URLs especificas del servidor, y el servidor responde con datos en formato JSON.
          </p>

          <h6 className="fw-bold mt-3">Principales endpoints (rutas del servidor)</h6>
          <div className="table-responsive">
            <table className="table table-bordered table-sm small">
              <thead className="table-light">
                <tr>
                  <th>Metodo</th>
                  <th>Ruta</th>
                  <th>Que hace</th>
                  <th>Quien puede</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><span className="badge bg-success">POST</span></td><td>/api/auth/login</td><td>Iniciar sesion</td><td>Cualquiera</td></tr>
                <tr><td><span className="badge bg-primary">GET</span></td><td>/api/libros</td><td>Ver todos los libros</td><td>Autenticado</td></tr>
                <tr><td><span className="badge bg-success">POST</span></td><td>/api/libros</td><td>Crear un libro</td><td>Admin</td></tr>
                <tr><td><span className="badge bg-warning text-dark">PUT</span></td><td>/api/libros/:id</td><td>Editar un libro</td><td>Admin</td></tr>
                <tr><td><span className="badge bg-danger">DELETE</span></td><td>/api/libros/:id</td><td>Eliminar un libro</td><td>Admin</td></tr>
                <tr><td><span className="badge bg-primary">GET</span></td><td>/api/movimientos</td><td>Ver movimientos</td><td>Admin</td></tr>
                <tr><td><span className="badge bg-success">POST</span></td><td>/api/movimientos</td><td>Registrar movimiento</td><td>Admin</td></tr>
                <tr><td><span className="badge bg-primary">GET</span></td><td>/api/ventas</td><td>Ver ventas</td><td>Autenticado</td></tr>
                <tr><td><span className="badge bg-success">POST</span></td><td>/api/ventas</td><td>Crear una venta</td><td>Autenticado</td></tr>
                <tr><td><span className="badge bg-info text-dark">PATCH</span></td><td>/api/ventas/:id/anular</td><td>Anular venta</td><td>Admin</td></tr>
                <tr><td><span className="badge bg-primary">GET</span></td><td>/api/clientes</td><td>Ver clientes</td><td>Autenticado</td></tr>
                <tr><td><span className="badge bg-success">POST</span></td><td>/api/clientes</td><td>Crear cliente</td><td>Autenticado</td></tr>
                <tr><td><span className="badge bg-primary">GET</span></td><td>/api/dashboard</td><td>Ver estadisticas</td><td>Admin</td></tr>
                <tr><td><span className="badge bg-primary">GET</span></td><td>/api/usuarios</td><td>Ver usuarios</td><td>Admin</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── SECCION 7: SEGURIDAD ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-primary text-white fw-bold">
          7. Medidas de seguridad implementadas
        </div>
        <div className="card-body">
          <ul className="mb-0">
            <li className="mb-2"><strong>Contrasenas encriptadas (bcrypt):</strong> Las contrasenas se guardan encriptadas en la base de datos. Nadie puede ver la contrasena real.</li>
            <li className="mb-2"><strong>Tokens JWT:</strong> Cuando el usuario inicia sesion, se genera un token que lo identifica. Este token se envia en cada peticion para verificar que esta autenticado.</li>
            <li className="mb-2"><strong>Control de roles (RBAC):</strong> Cada ruta del servidor verifica si el usuario tiene el permiso necesario segun su rol.</li>
            <li className="mb-2"><strong>Bloqueo de cuenta:</strong> Despues de 3 intentos fallidos de login, la cuenta se bloquea.</li>
            <li className="mb-2"><strong>Rate limiting:</strong> El servidor limita la cantidad de peticiones por IP para evitar ataques.</li>
            <li className="mb-2"><strong>CORS:</strong> Solo el frontend autorizado puede comunicarse con el servidor.</li>
            <li className="mb-2"><strong>Validacion doble:</strong> Los datos se validan tanto en el frontend como en el backend.</li>
            <li className="mb-0"><strong>Transacciones ACID:</strong> Las operaciones criticas (ventas, movimientos) usan transacciones para que los datos no queden incompletos.</li>
          </ul>
        </div>
      </div>

      {/* ── SECCION 8: INSTALACION ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-primary text-white fw-bold">
          8. Como instalar y correr el proyecto
        </div>
        <div className="card-body">
          <h6 className="fw-bold">Requisitos previos</h6>
          <ul>
            <li>Node.js version 18 o superior</li>
            <li>MySQL 8 instalado</li>
          </ul>

          <h6 className="fw-bold mt-3">Paso 1: Clonar el proyecto</h6>
          <pre className="bg-light p-2 rounded small">git clone https://github.com/cperdomope/SGI-Libreria-el-Saber.git</pre>

          <h6 className="fw-bold mt-3">Paso 2: Crear la base de datos</h6>
          <pre className="bg-light p-2 rounded small">mysql -u root -p &lt; base_datos/sgi_libreria_completo.sql</pre>

          <h6 className="fw-bold mt-3">Paso 3: Configurar y arrancar el backend</h6>
          <pre className="bg-light p-2 rounded small">
{`cd servidor
cp .env.example .env    (editar con los datos de MySQL)
npm install
npm start               (arranca en http://localhost:3000)`}
          </pre>

          <h6 className="fw-bold mt-3">Paso 4: Configurar y arrancar el frontend</h6>
          <pre className="bg-light p-2 rounded small">
{`cd cliente
npm install
npm run dev             (arranca en http://localhost:5173)`}
          </pre>

          <h6 className="fw-bold mt-3">Variables de entorno del backend (servidor/.env)</h6>
          <pre className="bg-light p-2 rounded small">
{`PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contrasena
DB_NAME=inventario_libreria
DB_SSL=false
JWT_SECRET=una_clave_secreta
JWT_EXPIRY=8h
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173`}
          </pre>
        </div>
      </div>

      {/* ── SECCION 9: PRUEBAS ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-primary text-white fw-bold">
          9. Pruebas automatizadas
        </div>
        <div className="card-body">
          <p>
            Usamos <strong>Jest</strong> (framework de pruebas) y <strong>Supertest</strong> (para
            simular peticiones HTTP) para verificar que las funciones mas importantes del backend
            funcionan correctamente.
          </p>
          <div className="table-responsive">
            <table className="table table-bordered table-sm">
              <thead className="table-light">
                <tr>
                  <th>Archivo</th>
                  <th>Que prueba</th>
                </tr>
              </thead>
              <tbody>
                <tr><td><code>pruebas/auth.test.js</code></td><td>Login, token JWT, rutas protegidas</td></tr>
                <tr><td><code>pruebas/libros.test.js</code></td><td>CRUD de libros y permisos por rol</td></tr>
                <tr><td><code>pruebas/clientes.test.js</code></td><td>CRUD de clientes y permisos por rol</td></tr>
                <tr><td><code>pruebas/ventas.test.js</code></td><td>Creacion de ventas, validacion de totales y seguridad</td></tr>
                <tr><td><code>pruebas/movimientos.test.js</code></td><td>Entradas y salidas de inventario (Kardex)</td></tr>
                <tr><td><code>pruebas/usuarios.test.js</code></td><td>Gestion de usuarios y cambio de contrasena</td></tr>
                <tr><td><code>pruebas/catalogos.test.js</code></td><td>CRUD de autores, categorias y proveedores</td></tr>
                <tr><td><code>pruebas/dashboard.test.js</code></td><td>Estadisticas, graficas y datos del dashboard</td></tr>
              </tbody>
            </table>
          </div>
          <pre className="bg-light p-2 rounded small mb-0">
{`cd servidor
npm test`}
          </pre>
        </div>
      </div>

      {/* ── SECCION 10: DESPLIEGUE ── */}
      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-primary text-white fw-bold">
          10. Despliegue en produccion (como se sube a internet)
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="card h-100 border-success">
                <div className="card-body text-center">
                  <h6 className="fw-bold text-success">Frontend</h6>
                  <p className="small mb-0">Se sube a <strong>Vercel</strong> (servicio gratuito para paginas web)</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 border-warning">
                <div className="card-body text-center">
                  <h6 className="fw-bold text-warning">Backend</h6>
                  <p className="small mb-0">Se sube a <strong>Render</strong> (servicio para servidores)</p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 border-info">
                <div className="card-body text-center">
                  <h6 className="fw-bold text-info">Base de Datos</h6>
                  <p className="small mb-0">Se usa <strong>Aiven Cloud</strong> (MySQL en la nube)</p>
                </div>
              </div>
            </div>
          </div>
          <div className="alert alert-warning mt-3 mb-0 small">
            <strong>Importante:</strong> Las variables de entorno con contrasenas y claves secretas
            se configuran directamente en los dashboards de Vercel y Render, nunca se suben a GitHub.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentacionManualTecnico;