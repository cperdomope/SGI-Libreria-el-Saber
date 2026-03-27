# SGI — Librería El Saber

**Sistema de Gestión de Inventario** para la Librería El Saber.
Proyecto de grado — SENA, Tecnólogo en Análisis y Desarrollo de Software (ADSO).

---

## ¿Qué es este proyecto?

Es una aplicación web que hicimos para ayudar a una librería a manejar todo su negocio desde el computador o el celular. Básicamente, en vez de llevar el inventario en cuadernos o en Excel, con este sistema se puede:

- Llevar el control de los libros que hay en la tienda (inventario)
- Registrar ventas y generar tickets en PDF
- Saber qué libros se están acabando (alertas de stock bajo)
- Manejar clientes, proveedores, autores y categorías
- Ver estadísticas del negocio con gráficas
- Controlar quién puede hacer qué según su rol (Administrador o Vendedor)

Todo esto funciona desde el navegador, no necesita instalar nada en el computador del usuario.

---

## ¿Cómo funciona el sistema? (Paso a paso)

### 1. Iniciar sesión
El usuario entra a la página de login, escribe su correo y contraseña. Si los datos son correctos, el sistema lo deja entrar y le muestra las opciones según su rol. Si se hacen más de 10 intentos desde la misma IP en 15 minutos, el sistema bloquea temporalmente esa IP por seguridad (rate limiting).

### 2. Navegación
Una vez adentro, hay una barra de navegación en la parte de arriba con todas las secciones. En celulares se convierte en un menú tipo hamburguesa. El Administrador ve todas las opciones, el Vendedor solo ve las que le corresponden.

### 3. Dashboard (solo Administrador)
Es la página de inicio del admin. Muestra tarjetas con información rápida: cuántas ventas hubo hoy, cuánto se vendió en el mes, cuántos libros hay y cuáles tienen stock bajo. También tiene gráficas de barras y de torta para ver las ventas de los últimos meses y las categorías más populares.

### 4. Inventario
Aquí se ven todos los libros con su imagen, título, autor, precio y cuántos quedan. Se pueden buscar libros escribiendo en un buscador. El Admin puede agregar libros nuevos, editarlos o eliminarlos. El Vendedor solo puede ver la lista.

### 5. Movimientos (Kardex)
Cuando llegan libros nuevos del proveedor, se registra una ENTRADA. Si se sacan libros por alguna razón que no sea venta, se registra una SALIDA. El sistema actualiza el stock automáticamente y guarda un historial de todos los movimientos.

### 6. Ventas
Es como una caja registradora digital. Se busca el cliente, se agregan los libros al carrito, se elige el método de pago y listo. El sistema descuenta automáticamente los libros del inventario. Se puede aplicar descuento en porcentaje.

### 7. Historial de ventas
Se pueden ver todas las ventas que se han hecho, filtrarlas por fecha o buscar por cliente. El Admin puede anular una venta si algo salió mal (y el sistema devuelve los libros al inventario). También se puede descargar un ticket en PDF o exportar los datos a Excel.

### 8. Otras secciones
- **Clientes:** se registran los clientes con su nombre, documento, teléfono, etc.
- **Proveedores:** se guardan los datos de las empresas que nos venden los libros.
- **Autores y Categorías:** se manejan para poder clasificar los libros.
- **Usuarios:** el Admin puede crear cuentas para otros empleados y asignarles un rol.
- **Cambiar contraseña:** cualquier usuario puede cambiar su contraseña desde la barra de navegación.

---

## Tecnologías que usamos

Estas son las herramientas y tecnologías que usamos para construir el proyecto. Cada una tiene una función específica:

### Frontend (lo que ve el usuario)

| Tecnología | ¿Para qué la usamos? |
|------------|----------------------|
| **React** | Para crear toda la interfaz del usuario (botones, formularios, tablas, etc.) |
| **Vite** | Para que el proyecto cargue rápido mientras desarrollamos y para generar la versión final |
| **Bootstrap** | Para que el diseño se vea bonito y funcione bien en celulares y computadores |
| **React Router DOM** | Para navegar entre las páginas sin que se recargue toda la aplicación |
| **Axios** | Para enviar y recibir datos del servidor (como cuando se guarda un libro o se hace una venta) |
| **react-hook-form** | Para manejar los formularios y validar que el usuario llene bien los campos |
| **Recharts** | Para crear las gráficas de barras y de torta en el Dashboard |
| **jsPDF** | Para generar los tickets de venta en formato PDF |
| **xlsx** | Para exportar datos a archivos de Excel |

### Backend (la lógica del servidor)

| Tecnología | ¿Para qué la usamos? |
|------------|----------------------|
| **Node.js** | Es el motor que permite correr JavaScript en el servidor |
| **Express** | Es el framework que usamos para crear las rutas y manejar las peticiones del frontend |
| **MySQL** | Es la base de datos donde se guarda toda la información (libros, ventas, clientes, etc.) |
| **JWT** | Para manejar la sesión del usuario de forma segura (genera un token cuando inicia sesión) |
| **bcrypt** | Para guardar las contraseñas encriptadas (nadie puede verlas en la base de datos) |
| **Multer** | Para subir las imágenes de portada de los libros |
| **morgan** | Para ver en la consola qué peticiones le llegan al servidor (útil para depurar) |
| **compression** | Para comprimir las respuestas y que la app cargue más rápido |
| **PM2** | Para mantener el servidor corriendo en producción sin que se caiga |
| **Jest + Supertest** | Para hacer pruebas automatizadas y verificar que todo funcione bien |

---

## Arquitectura del proyecto (explicación sencilla)

El proyecto tiene 3 partes principales que trabajan juntas:

```
┌──────────────────────┐
│   FRONTEND (React)   │  ← Lo que el usuario ve y toca en el navegador
│   Carpeta: cliente/  │     (botones, tablas, formularios)
└──────────┬───────────┘
           │ Se comunican por internet (peticiones HTTP)
           │
┌──────────▼───────────┐
│  BACKEND (Express)   │  ← La lógica del negocio, recibe peticiones,
│  Carpeta: servidor/  │     procesa datos y responde
└──────────┬───────────┘
           │ Guarda y consulta datos
           │
┌──────────▼───────────┐
│  BASE DE DATOS       │  ← Donde se almacena toda la información
│  MySQL               │     (libros, ventas, usuarios, etc.)
└──────────────────────┘
```

**En resumen:**
- El **Frontend** es como la cara del sistema, lo que el usuario ve.
- El **Backend** es como el cerebro, procesa toda la lógica.
- La **Base de datos** es como la memoria, guarda todo para que no se pierda.

### En producción (cuando está en internet):
- El Frontend se sube a **Vercel** (un servicio gratuito para páginas web)
- El Backend se sube a **Render** (un servicio para servidores)
- La Base de datos está en **Aiven Cloud** (MySQL en la nube)

> Los archivos `.env` con las contraseñas **nunca se suben al repositorio**. Las variables se configuran directamente en los dashboards de Vercel y Render.

---

## Roles del sistema

El sistema tiene dos tipos de usuarios, cada uno puede hacer cosas diferentes:

| Módulo | Administrador | Vendedor |
|--------|:---:|:---:|
| Dashboard (estadísticas) | Si | No |
| Ver inventario | Si | Si |
| Crear/editar/eliminar libros | Si | No |
| Movimientos (entradas y salidas) | Si | No |
| Punto de Venta | Si | Si |
| Ver historial de ventas | Si | Si |
| Anular ventas | Si | No |
| Ver clientes | Si | Si |
| Crear clientes | Si | Si |
| Editar/eliminar clientes | Si | No |
| Gestión de Usuarios | Si | No |
| Proveedores | Si | No |
| Ver autores y categorías | Si | Si |
| Crear/editar/eliminar autores y categorías | Si | No |
| Cambiar contraseña propia | Si | Si |

---

## Estructura del proyecto

```
proyecto-inventario/
├── cliente/                          # Frontend (lo que ve el usuario)
│   ├── src/
│   │   ├── pages/                    # Las páginas de la aplicación
│   │   │   ├── Acceso.jsx            # Página de login
│   │   │   ├── Inicio.jsx            # Dashboard con gráficas
│   │   │   ├── Inventario.jsx        # Lista de libros
│   │   │   ├── Movimientos.jsx       # Entradas y salidas de inventario
│   │   │   ├── PaginaVentas.jsx      # Punto de venta (caja)
│   │   │   ├── HistorialVentas.jsx   # Historial de ventas
│   │   │   ├── PaginaClientes.jsx    # Gestión de clientes
│   │   │   ├── AdminUsuarios.jsx     # Gestión de usuarios (solo Admin)
│   │   │   ├── PaginaProveedores.jsx # Gestión de proveedores
│   │   │   ├── PaginaAutores.jsx     # Gestión de autores
│   │   │   └── PaginaCategorias.jsx  # Gestión de categorías
│   │   ├── components/               # Componentes reutilizables
│   │   │   ├── BarraNavegacion.jsx   # Menú de navegación
│   │   │   ├── ModalCambiarPassword.jsx
│   │   │   └── RutaProtegidaPorRol.jsx
│   │   ├── context/AuthContext.jsx   # Manejo de sesión y permisos
│   │   ├── services/api.js           # Conexión con el servidor
│   │   ├── hooks/usePaginacion.js    # Lógica de paginación
│   │   └── styles/custom-theme.css   # Estilos personalizados
│   └── public/
│
├── servidor/                         # Backend (lógica del servidor)
│   ├── controllers/                  # Donde está la lógica de cada módulo
│   ├── routes/                       # Las rutas de la API
│   ├── middlewares/                  # Seguridad (JWT, roles, etc.)
│   ├── config/db.js                  # Conexión a la base de datos
│   ├── pruebas/                      # Pruebas automatizadas
│   ├── uploads/portadas/             # Imágenes de portada de libros
│   ├── app.js                        # Configuración del servidor
│   └── index.js                      # Archivo principal que arranca todo
│
└── base_datos/
    └── sgi_libreria_completo.sql     # Script para crear la base de datos
```

---

## Base de datos

Usamos **MySQL** para guardar toda la información. La base de datos se llama `inventario_libreria` y tiene 10 tablas. Todas empiezan con el prefijo `mdc_`.

### Tablas principales

| Tabla | ¿Qué guarda? |
|-------|--------------|
| `mdc_roles` | Los roles del sistema (Administrador y Vendedor) |
| `mdc_usuarios` | Las cuentas de los empleados (nombre, correo, contraseña encriptada) |
| `mdc_libros` | Los libros con su ISBN, precio, stock y portada |
| `mdc_autores` | Los autores de los libros |
| `mdc_categorias` | Las categorías para clasificar los libros |
| `mdc_movimientos` | El historial de entradas y salidas de inventario |
| `mdc_clientes` | Los datos de los clientes |
| `mdc_proveedores` | Los datos de los proveedores |
| `mdc_ventas` | Las ventas realizadas |
| `mdc_detalle_ventas` | Los libros que se vendieron en cada venta |

### Cómo se relacionan las tablas

```
mdc_roles ──────> mdc_usuarios ──────> mdc_movimientos
                                └────> mdc_ventas

mdc_autores ────> mdc_libros ────> mdc_movimientos
mdc_categorias ─> mdc_libros ────> mdc_detalle_ventas

mdc_clientes ───> mdc_ventas ────> mdc_detalle_ventas
mdc_proveedores ─> mdc_movimientos
```

La base de datos está **normalizada en Tercera Forma Normal (3NF)**, lo que significa que la información no se repite innecesariamente y está bien organizada.

### Datos de prueba

El script SQL ya trae datos de ejemplo para poder probar el sistema sin tener que cargar todo desde cero:

- 8 categorías (Tecnología, Ficción, Historia, etc.)
- 8 autores (García Márquez, Isabel Allende, etc.)
- 10 libros de ejemplo
- 7 clientes
- 4 proveedores

---

## Seguridad

Implementamos varias medidas de seguridad para proteger el sistema:

- **Contraseñas encriptadas:** se guardan con bcrypt, nadie puede ver la contraseña real
- **Tokens JWT:** cuando el usuario inicia sesión, se genera un token que lo identifica
- **Control de roles:** cada ruta verifica que el usuario tenga permiso para acceder
- **Límite de peticiones (Rate Limiting):** el login permite máximo 10 intentos por IP cada 15 minutos; la API general permite 500 peticiones por IP cada 15 minutos
- **CORS:** solo el frontend autorizado puede comunicarse con el servidor
- **Validación doble:** los datos se validan en el frontend Y en el backend
- **Transacciones:** las operaciones importantes (ventas, movimientos) usan transacciones para que no queden datos a medias

---

## API REST — Endpoints principales

Esta es la lista de rutas que el backend expone para que el frontend se comunique con él:

| Método | Ruta | ¿Qué hace? | ¿Quién puede? |
|--------|------|-------------|----------------|
| POST | `/api/auth/login` | Iniciar sesión | Cualquiera |
| GET | `/api/libros` | Ver todos los libros | Usuario autenticado |
| POST | `/api/libros` | Agregar un libro | Admin |
| PUT | `/api/libros/:id` | Editar un libro | Admin |
| DELETE | `/api/libros/:id` | Eliminar un libro | Admin |
| GET | `/api/movimientos` | Ver historial de movimientos | Admin |
| POST | `/api/movimientos` | Registrar entrada o salida | Admin |
| GET | `/api/ventas` | Ver ventas | Usuario autenticado |
| POST | `/api/ventas` | Crear una venta | Usuario autenticado |
| PATCH | `/api/ventas/:id/anular` | Anular una venta | Admin |
| GET | `/api/clientes` | Ver clientes | Usuario autenticado |
| POST | `/api/clientes` | Crear cliente | Usuario autenticado |
| PUT | `/api/clientes/:id` | Editar cliente | Admin |
| DELETE | `/api/clientes/:id` | Eliminar cliente | Admin |
| GET | `/api/dashboard` | Ver estadísticas | Admin |
| GET/POST/PUT/PATCH | `/api/usuarios` | Gestión de usuarios | Admin |
| GET/POST/PUT/DELETE | `/api/proveedores` | Gestión de proveedores | Admin |
| GET | `/api/autores` | Ver autores | Admin y Vendedor |
| POST/PUT/DELETE | `/api/autores` | Crear/editar/eliminar autores | Admin |
| GET | `/api/categorias` | Ver categorías | Admin y Vendedor |
| POST/PUT/DELETE | `/api/categorias` | Crear/editar/eliminar categorías | Admin |

---

## Instalación (cómo correr el proyecto en tu computador)

### Lo que necesitas tener instalado

- **Node.js** versión 18 o superior
- **MySQL 8**

### Paso 1: Clonar el proyecto

```bash
git clone https://github.com/cperdomope/SGI-Libreria-el-Saber.git
cd SGI-Libreria-el-Saber
```

### Paso 2: Crear la base de datos

```bash
mysql -u root -p < base_datos/sgi_libreria_completo.sql
```

### Paso 3: Configurar y arrancar el backend

```bash
cd servidor
cp .env.example .env        # Editar este archivo con tus datos de MySQL
npm install
node scripts/reset_password.js  # Solo la primera vez, genera las contraseñas
npm start                        # El servidor arranca en http://localhost:3000
```

### Paso 4: Configurar y arrancar el frontend

```bash
cd cliente
npm install
# Crear un archivo .env con esta línea: VITE_API_URL=http://localhost:3000/api
npm run dev                      # La app arranca en http://localhost:5173
```

### Usuarios para probar

| Nombre | Correo | Rol |
|--------|--------|-----|
| Luz Darlys | ldarlys@sena.edu.co | Administrador |
| Michelle Martínez | michelle@sena.edu.co | Vendedor |
| Carlos Ivan Perdomo | cip@sena.edu.co | Administrador |

---

## Variables de entorno

Son valores privados que cada quien configura en su computador. Nunca se suben a GitHub.

### `servidor/.env`

```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_contraseña_de_mysql
DB_NAME=inventario_libreria
DB_SSL=false
JWT_SECRET=una_clave_secreta_larga
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### `cliente/.env`

```
VITE_API_URL=http://localhost:3000/api
```

---

## Pruebas automatizadas

Hicimos pruebas con Jest y Supertest para verificar que las funciones más importantes del backend funcionan bien.

```bash
cd servidor
npm test
```

| Archivo de prueba | ¿Qué prueba? |
|-------------------|--------------|
| `pruebas/auth.test.js` | Login, validación de token JWT, protección de rutas sin autenticación |
| `pruebas/catalogos.test.js` | CRUD de autores y categorías, permisos RBAC (admin vs vendedor) |
| `pruebas/clientes.test.js` | Listado y creación de clientes, protección sin token |
| `pruebas/dashboard.test.js` | Acceso exclusivo admin, estructura de datos de estadísticas |
| `pruebas/libros.test.js` | CRUD de libros, validaciones (título, precio negativo), protección sin token |
| `pruebas/movimientos.test.js` | Seguridad, validación de tipos (ENTRADA/SALIDA), cantidad negativa, proveedor obligatorio |
| `pruebas/usuarios.test.js` | CRUD de usuarios, RBAC, cambio de contraseña, que password_hash nunca se exponga |
| `pruebas/ventas.test.js` | Creación de ventas, carrito vacío, detección de total manipulado (anti-fraude) |

---

## Diseño responsive

La aplicación se adapta a diferentes tamaños de pantalla:

- En **celular**: el menú se convierte en hamburguesa, las tablas se pueden desplazar horizontalmente y el carrito de ventas se mueve debajo del formulario
- En **tablet**: se ven más columnas en las tablas y el diseño se acomoda
- En **computador**: se ve todo completo, con el carrito al lado del formulario de ventas

---

## ¿Qué aprendí con este proyecto?

Este proyecto me enseñó muchas cosas que no se aprenden solo con la teoría:

- **A organizar un proyecto real:** Aprendí a separar el frontend del backend, a organizar las carpetas y a que cada archivo tenga una responsabilidad clara.

- **A trabajar con bases de datos de verdad:** No es lo mismo hacer ejercicios sueltos de SQL que diseñar una base de datos completa con relaciones, llaves foráneas y transacciones.

- **A manejar la seguridad:** Entendí por qué es importante encriptar contraseñas, validar datos en el servidor (no solo en el frontend) y controlar quién puede hacer qué con los roles.

- **A conectar frontend con backend:** Aprendí cómo React se comunica con Express a través de peticiones HTTP, cómo enviar datos, recibir respuestas y manejar errores.

- **A resolver problemas reales:** Muchas veces las cosas no funcionaban a la primera. Aprendí a leer errores, buscar soluciones y depurar código.

- **A usar herramientas profesionales:** Git para el control de versiones, variables de entorno para datos sensibles, pruebas automatizadas para verificar que el código funcione.

- **A pensar en el usuario:** El sistema tiene que ser fácil de usar, verse bien en celular y en computador, y dar mensajes claros cuando algo sale mal.

- **A desplegar en internet:** Pasar de "funciona en mi computador" a "funciona en internet" fue todo un reto. Aprendí a usar servicios como Vercel, Render y Aiven.

---

## Autores

Proyecto desarrollado por estudiantes del programa Tecnología en Análisis y Desarrollo de Software — SENA, Centro de Gestión de Mercados, Logística y Tecnologías de la Información.