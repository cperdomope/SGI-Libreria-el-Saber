# SGI — Librería El Saber

**Sistema de Gestión de Inventario** para la Librería El Saber.
Proyecto de grado — SENA, Tecnólogo en Análisis y Desarrollo de Software (ADSO).

---

## Descripción General

Aplicación web full-stack que digitaliza la operación completa de una librería: gestión de inventario, registro de ventas, control de movimientos (kardex), administración de clientes, proveedores, autores y categorías. Incluye panel de estadísticas con gráficas en tiempo real y control de acceso por roles.

---

## Tecnologías

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React + Vite | 19.2 / 7.2 |
| Estilos | Bootstrap | 5.3.8 |
| Enrutamiento | React Router DOM | 7.9.6 |
| HTTP Client | Axios | 1.13.2 |
| Formularios | react-hook-form | 7.71.2 |
| Gráficas | Recharts | 3.8.0 |
| Exportación PDF | jsPDF | 4.2.0 |
| Exportación Excel | xlsx | 0.18.5 |
| Backend | Node.js + Express | 5 |
| Base de datos | MySQL 8 | local o Aiven Cloud |
| Autenticación | JWT + bcrypt | — |
| Subida de archivos | Multer | — |
| Compresión HTTP | compression | — |
| Logging HTTP | morgan | — |
| Proceso en producción | PM2 | — |
| Pruebas | Jest + Supertest | — |

---

## Arquitectura de Despliegue

```
┌─────────────────────────────────────────────┐
│         Base de Datos — MySQL 8             │
│    Local (desarrollo) o Aiven Cloud         │
└──────────────┬──────────────────────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌─────────────┐  ┌─────────────────┐
│   Render    │  │     Vercel      │
│  (Backend)  │  │   (Frontend)    │
│  Express    │  │   React + Vite  │
│  API REST   │  │   Build dist/   │
└─────────────┘  └─────────────────┘
```

- **Frontend** → Vercel (Root Directory: `cliente` · Build: `npm run build` · Output: `dist`)
- **Backend** → Render (variables de entorno configuradas en el dashboard)
- **BD** → Aiven Cloud MySQL (producción) o MySQL local (desarrollo)

> Los archivos `.env` **nunca se suben al repositorio** (están en `.gitignore`). Las variables se configuran directamente en los dashboards de Render y Vercel.

---

## Estructura del Proyecto

```
proyecto-inventario/
├── cliente/                          # Frontend React + Vite
│   ├── src/
│   │   ├── pages/                    # 11 páginas/vistas
│   │   │   ├── Acceso.jsx            # Login
│   │   │   ├── Inicio.jsx            # Dashboard (solo Admin)
│   │   │   ├── Inventario.jsx
│   │   │   ├── Movimientos.jsx
│   │   │   ├── PaginaVentas.jsx      # Punto de Venta (POS)
│   │   │   ├── HistorialVentas.jsx
│   │   │   ├── PaginaClientes.jsx
│   │   │   ├── AdminUsuarios.jsx     # Solo Admin
│   │   │   ├── PaginaProveedores.jsx
│   │   │   ├── PaginaAutores.jsx
│   │   │   └── PaginaCategorias.jsx
│   │   ├── components/
│   │   │   ├── BarraNavegacion.jsx
│   │   │   ├── ModalCambiarPassword.jsx
│   │   │   └── RutaProtegidaPorRol.jsx
│   │   ├── context/AuthContext.jsx   # Sesión y permisos globales (RBAC)
│   │   ├── services/api.js           # Axios con interceptores JWT
│   │   ├── hooks/usePaginacion.js    # Hook reutilizable de paginación
│   │   └── styles/custom-theme.css  # Tema y estilos responsive
│   └── public/
│
├── servidor/                         # Backend Node.js + Express 5
│   ├── controllers/                  # Lógica de negocio (11 archivos)
│   ├── routes/                       # Endpoints API REST (10 archivos)
│   ├── middlewares/                  # JWT, RBAC, errores, rate limiting, Multer
│   ├── config/db.js                  # Pool de conexiones MySQL (promise)
│   ├── utils/paginacion.js           # Utilidad de paginación reutilizable
│   ├── scripts/reset_password.js     # Genera hashes bcrypt iniciales
│   ├── pruebas/                      # Tests Jest + Supertest (3 suites)
│   ├── uploads/portadas/             # Imágenes de portada de libros
│   ├── pm2.config.js                 # Configuración PM2 para producción
│   ├── app.js                        # Configuración Express (middlewares + rutas)
│   └── index.js                      # Punto de entrada + graceful shutdown
│
└── base_datos/
    └── sgi_libreria_completo.sql     # Script único de instalación
```

---

## Módulos de la Aplicación

### 1. Autenticación (`/acceso`)
- Formulario de login con validación en tiempo real (react-hook-form)
- Bloqueo de cuenta tras 3 intentos fallidos consecutivos
- Barra de progreso visual de intentos restantes
- Sesión persistida en `localStorage` mediante JWT
- Botón mostrar/ocultar contraseña
- Fondo con efecto parallax (desactivado en iOS/Safari)

### 2. Dashboard (`/inicio`)
> Solo **Administrador**

- 4 tarjetas KPI: ventas del día, ventas del mes, total libros en catálogo, alertas de stock bajo
- Gráfica de barras — ventas e ingresos últimos 6 meses (Recharts)
- Gráfica de torta — distribución del catálogo por categoría (Recharts)
- Top 5 productos más vendidos con ingresos generados
- Top 5 mejores clientes por total gastado
- Tabla de libros con stock ≤ stock mínimo con acceso directo a Inventario
- Las consultas se ejecutan en paralelo en el backend (`Promise.all`) con caché de 60 segundos

### 3. Inventario (`/inventario`)
> **Administrador** y **Vendedor**

- Tabla con miniatura de portada, ISBN, título, autor, categoría, precio y stock
- Búsqueda instantánea por título, autor o ISBN (`useMemo`, sin petición al servidor)
- Badges de stock: Disponible / Stock Bajo / Agotado
- Crear/Editar libro con subida de imagen de portada (JPG/PNG/WebP, máx. 2 MB)
- Eliminar libro: elimina también el archivo de portada del servidor

### 4. Movimientos — Kardex (`/movimientos`)
> **Administrador** y **Vendedor**

- Registro de **ENTRADA** y **SALIDA** de inventario
- Entradas: proveedor y costo de compra obligatorios (validación en frontend y backend)
- Validación de proveedor existente dentro de transacción ACID
- Panel "Últimos Movimientos" se actualiza automáticamente tras cada registro
- Historial: libro, tipo, cantidad, stock anterior → nuevo, proveedor, costo, usuario, fecha

### 5. Punto de Venta — POS (`/ventas`)
> **Administrador** y **Vendedor**

- Búsqueda dinámica de cliente
- Carrito con múltiples ítems, cantidades editables y eliminación individual
- Métodos de pago: Efectivo, Tarjeta, Transferencia, Mixto
- Descuento en porcentaje o monto fijo
- El backend recalcula y valida el total (nunca confía en el frontend)
- Descuento automático del stock al confirmar (transacción ACID con `FOR UPDATE`)
- En móvil: carrito se reordena debajo del formulario de productos

### 6. Historial de Ventas (`/historial-ventas`)
> **Administrador** y **Vendedor** (anular: solo Administrador)

- Tabla con estado visual (badge): Completada / Anulada
- Paginación del lado del servidor (10 registros por página)
- Filtro por rango de fechas y búsqueda por cliente (con debounce 400 ms)
- Anular venta: revierte el stock de cada ítem (transacción ACID) — solo Admin
- Exportar a Excel (`xlsx`): exporta la vista filtrada actual
- Descargar ticket PDF (`jsPDF`): genera documento tipo ticket POS de 80 mm

### 7. Clientes (`/clientes`)
> **Administrador** y **Vendedor**

- CRUD completo · Tipos de documento: CC, NIT, CE, Pasaporte
- Búsqueda en tiempo real por nombre o documento (`useMemo`)
- Validación de documento único en base de datos

### 8. Gestión de Usuarios (`/admin/usuarios`)
> Solo **Administrador**

- Tabla: nombre completo, email, rol (badge), estado y último acceso
- Crear usuario: nombre, email, contraseña (mín. 6 caracteres) y rol
- Editar: nombre, email y rol (sin contraseña)
- Activar/Desactivar: usuario inactivo no puede iniciar sesión; el admin no puede desactivarse a sí mismo

### 9. Cambiar Contraseña
> Todos los usuarios autenticados

- Modal accesible desde la barra de navegación
- Requiere contraseña actual + nueva contraseña (mín. 6 caracteres) + confirmación

### 10. Proveedores (`/proveedores`)
> **Administrador** y **Vendedor**

- CRUD completo · Campos: empresa, NIT, contacto, email, teléfono, dirección
- Activar/Desactivar proveedores
- Tabla con columnas que se ocultan progresivamente por breakpoint

### 11. Autores (`/autores`)
> **Administrador** y **Vendedor**

- CRUD: nombre y nacionalidad · No se puede eliminar un autor con libros asociados

### 12. Categorías (`/categorias`)
> **Administrador** y **Vendedor**

- CRUD: nombre y descripción · No se puede eliminar una categoría con libros asociados

---

## Sistema de Roles (RBAC)

| Módulo | Administrador | Vendedor |
|--------|:---:|:---:|
| Dashboard | ✅ | ❌ |
| Inventario (ver) | ✅ | ✅ |
| Inventario (crear/editar/eliminar) | ✅ | ❌ |
| Movimientos | ✅ | ✅ |
| Punto de Venta | ✅ | ✅ |
| Historial de Ventas (ver) | ✅ | ✅ |
| Historial de Ventas (anular) | ✅ | ❌ |
| Clientes (ver/crear) | ✅ | ✅ |
| Clientes (editar/eliminar) | ✅ | ❌ |
| Gestión de Usuarios | ✅ | ❌ |
| Proveedores | ✅ | ✅ |
| Autores | ✅ | ✅ |
| Categorías | ✅ | ✅ |
| Cambiar Contraseña | ✅ | ✅ |

---

## API REST — Endpoints

| Método | Ruta | Descripción | Acceso |
|--------|------|-------------|--------|
| GET | `/` | Health check (verifica BD) | Público |
| POST | `/api/auth/login` | Iniciar sesión | Público |
| GET | `/api/libros` | Listar libros con portada | Auth |
| POST | `/api/libros` | Crear libro (multipart/form-data) | Admin |
| PUT | `/api/libros/:id` | Actualizar libro | Admin |
| DELETE | `/api/libros/:id` | Eliminar libro y portada | Admin |
| GET | `/api/movimientos` | Historial kardex | Auth |
| POST | `/api/movimientos` | Registrar movimiento | Auth |
| GET | `/api/ventas` | Listar ventas paginadas | Auth |
| POST | `/api/ventas` | Crear venta | Auth |
| GET | `/api/ventas/:id` | Detalle de una venta | Auth |
| PATCH | `/api/ventas/:id/anular` | Anular venta y revertir stock | Admin |
| GET | `/api/clientes` | Listar clientes | Auth |
| POST | `/api/clientes` | Crear cliente | Auth |
| GET | `/api/clientes/:id` | Obtener cliente por ID | Auth |
| PUT | `/api/clientes/:id` | Actualizar cliente | Admin |
| DELETE | `/api/clientes/:id` | Eliminar cliente | Admin |
| GET | `/api/dashboard` | Estadísticas globales (caché 60 s) | Admin |
| GET | `/api/usuarios` | Listar usuarios | Admin |
| POST | `/api/usuarios` | Crear usuario | Admin |
| PUT | `/api/usuarios/:id` | Actualizar usuario | Admin |
| PATCH | `/api/usuarios/:id/estado` | Activar/Desactivar usuario | Admin |
| PATCH | `/api/usuarios/cambiar-password` | Cambiar contraseña propia | Auth |
| GET | `/api/proveedores` | Listar proveedores | Auth |
| POST | `/api/proveedores` | Crear proveedor | Admin |
| PUT | `/api/proveedores/:id` | Actualizar proveedor | Admin |
| PATCH | `/api/proveedores/:id/estado` | Activar/Desactivar proveedor | Admin |
| GET | `/api/autores` | Listar autores | Auth |
| POST | `/api/autores` | Crear autor | Admin |
| PUT | `/api/autores/:id` | Actualizar autor | Admin |
| DELETE | `/api/autores/:id` | Eliminar autor | Admin |
| GET | `/api/categorias` | Listar categorías | Auth |
| POST | `/api/categorias` | Crear categoría | Admin |
| PUT | `/api/categorias/:id` | Actualizar categoría | Admin |
| DELETE | `/api/categorias/:id` | Eliminar categoría | Admin |

---

## Base de Datos

**Motor:** MySQL 8 — InnoDB (transaccional) — Charset utf8mb4
**Nombre:** `inventario_libreria` · **Prefijo de tablas:** `mdc_`

### Tablas (10)

| Tabla | Descripción |
|-------|-------------|
| `mdc_roles` | Roles del sistema (1=Administrador, 2=Vendedor) |
| `mdc_usuarios` | Cuentas con hash bcrypt, estado activo/inactivo y último acceso |
| `mdc_libros` | Inventario principal: ISBN, precio, stock actual/mínimo, portada |
| `mdc_autores` | Catálogo de autores con nacionalidad |
| `mdc_categorias` | Clasificación de libros con descripción |
| `mdc_movimientos` | Kardex: tipo, cantidad, stock ant/nuevo, proveedor, costo, auditoría |
| `mdc_clientes` | Registro de clientes con tipo de documento |
| `mdc_proveedores` | Empresas suministradoras con estado activo/inactivo |
| `mdc_ventas` | Cabecera de facturas — estado: Completada / Anulada |
| `mdc_detalle_ventas` | Ítems de cada factura (ON DELETE CASCADE) |

### Vistas (3)

| Vista | Descripción |
|-------|-------------|
| `v_libros_stock_bajo` | Libros en o por debajo del stock mínimo |
| `v_ventas_hoy` | Resumen de ventas del día (total, ingresos, promedio) |
| `v_catalogo_libros` | Catálogo completo con autor, categoría y estado de stock |

### Índices de optimización (10)

`idx_libros_titulo` · `idx_libros_isbn` · `idx_libros_stock` · `idx_ventas_fecha` · `idx_ventas_cliente` · `idx_movimientos_fecha` · `idx_movimientos_libro` · `idx_clientes_nombre` · `idx_clientes_documento` · `idx_usuarios_email`

### Relaciones

```
mdc_roles (1) ────< (N) mdc_usuarios
                              │
                              ├──> mdc_movimientos (N)
                              └──> mdc_ventas (N)

mdc_autores (1) ───< (N) mdc_libros ────< (N) mdc_movimientos
mdc_categorias (1) ─< (N) mdc_libros ────< (N) mdc_detalle_ventas

mdc_clientes (1) ──< (N) mdc_ventas (1) ─< (N) mdc_detalle_ventas
mdc_proveedores (1) ─< (N) mdc_movimientos
```

### Normalización

La base de datos cumple la **Tercera Forma Normal (3NF)** con motor InnoDB (soporte transaccional y claves foráneas).

### Datos de prueba incluidos en el script SQL

- **8 Categorías**: Tecnología, Ficción, Historia, Ciencia, Negocios, Arte, Infantil, Autoayuda
- **8 Autores**: García Márquez, Robert C. Martin, Isabel Allende, Vargas Llosa, Paulo Coelho, Stephen King, Borges, Cortázar
- **10 Libros**: Cien Años de Soledad, Clean Code, El Alquimista, It, entre otros
- **7 Clientes**: 5 personas naturales + 2 empresas
- **4 Proveedores**: Distribuidoras y editoriales colombianas

### Consultas útiles

```sql
-- Estadísticas generales
SELECT
    (SELECT COUNT(*) FROM mdc_libros)      AS libros,
    (SELECT COUNT(*) FROM mdc_clientes)    AS clientes,
    (SELECT COUNT(*) FROM mdc_proveedores) AS proveedores,
    (SELECT COUNT(*) FROM mdc_usuarios)    AS usuarios;

-- Libros con stock bajo
SELECT id, titulo, stock_actual, stock_minimo
FROM mdc_libros
WHERE stock_actual <= stock_minimo;

-- Ventas del día
SELECT v.id, c.nombre_completo AS cliente, v.total_venta, v.metodo_pago, v.fecha_venta
FROM mdc_ventas v
JOIN mdc_clientes c ON v.cliente_id = c.id
WHERE DATE(v.fecha_venta) = CURDATE();

-- Top 5 libros más vendidos
SELECT l.titulo, SUM(dv.cantidad) AS vendidos, SUM(dv.subtotal) AS ingresos
FROM mdc_detalle_ventas dv
JOIN mdc_libros l ON dv.libro_id = l.id
GROUP BY l.id
ORDER BY vendidos DESC
LIMIT 5;
```

### Backup y restauración

```bash
# Crear backup
mysqldump -u root -p inventario_libreria > backup_$(date +%Y%m%d).sql

# Restaurar backup
mysql -u root -p inventario_libreria < backup_20260101.sql
```

---

## Seguridad

- **JWT** con expiración configurable en `.env`
- **bcrypt** (salt rounds: 10) para almacenamiento seguro de contraseñas
- **Rate limiting** en login (10 intentos/15 min por IP) y API general (500/15 min)
- **RBAC** — verificación de rol en el middleware de cada ruta protegida
- **Bloqueo de cuenta** tras 3 intentos fallidos consecutivos (Map en memoria)
- **CORS** restringido al origen exacto configurado en `.env`
- **Helmet** — headers de seguridad HTTP (CSP, HSTS, X-Frame-Options, etc.)
- **Manejo global de errores** — nunca expone stack traces en producción
- **Validación doble** — frontend (react-hook-form) + backend (Express)
- **Validación de IDs en URL** — middleware `validarId` previene IDs maliciosos
- **Transacciones ACID** en operaciones críticas (ventas, movimientos, anulaciones)
- **Validación de archivos** — tipo MIME y extensión verificados en el servidor (Multer)
- **Graceful shutdown** — cierre ordenado del servidor ante SIGTERM/SIGINT

---

## Preparación para Producción

Funcionalidades implementadas orientadas al despliegue real:

| Característica | Descripción |
|----------------|-------------|
| **Graceful shutdown** | `index.js` maneja SIGTERM/SIGINT: cierra el servidor HTTP, luego el pool de BD |
| **Compresión gzip** | Middleware `compression` reduce respuestas JSON hasta un 80% |
| **Logging HTTP** | `morgan` en formato `dev` (desarrollo) y `combined` (producción) |
| **Health check** | `GET /` verifica la conexión real a la BD con `SELECT 1`, responde 503 si falla |
| **PM2** | `pm2.config.js` configura reinicio automático, límite de memoria y señales de cierre |
| **Code splitting** | `vite.config.js` separa `vendor`, `charts` y `exportar` en chunks independientes |

---

## Instalación Local

### Requisitos

- Node.js 18+
- MySQL 8 instalado localmente (o acceso a Aiven Cloud)

### 1. Clonar el repositorio

```bash
git clone https://github.com/cperdomope/SGI-Libreria-el-Saber.git
cd SGI-Libreria-el-Saber
```

### 2. Base de datos

```bash
mysql -u root -p < base_datos/sgi_libreria_completo.sql
```

> Si usas Aiven Cloud, configura `DB_SSL=true` y las credenciales correspondientes en el `.env`.

### 3. Backend

```bash
cd servidor
cp .env.example .env        # Completar con credenciales reales
npm install
node scripts/reset_password.js  # Generar hashes bcrypt (solo primera vez)
npm start                        # Servidor en http://localhost:3000
```

### 4. Frontend

```bash
cd cliente
npm install
# Crear .env con: VITE_API_URL=http://localhost:3000/api
npm run dev                      # Aplicación en http://localhost:5173
```

### Usuarios del sistema

| Nombre | Email | Rol |
|--------|-------|-----|
| Luz Darlys | ldarlys@sena.edu.co | Administrador |
| Michelle Martínez | michelle@sena.edu.co | Vendedor |
| Carlos Ivan Perdomo | cip@sena.edu.co | Administrador |

---

## Variables de Entorno

### `servidor/.env`

```
PORT=3000
DB_HOST=localhost               # o <host-aiven> en producción
DB_PORT=3306
DB_USER=root
DB_PASSWORD=<contraseña>
DB_NAME=inventario_libreria
DB_SSL=false                    # true para Aiven Cloud / producción
JWT_SECRET=<clave-secreta-larga-y-aleatoria>
NODE_ENV=development            # production en Render
CORS_ORIGIN=http://localhost:5173  # URL de Vercel en producción
```

### `cliente/.env`

```
# Desarrollo local
VITE_API_URL=http://localhost:3000/api

# Producción → configurar en Vercel dashboard, no en este archivo
# VITE_API_URL=https://<backend>.onrender.com/api
```

### Variables en Vercel (dashboard)

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://<backend>.onrender.com/api` |

### Variables en Render (dashboard)

`DB_HOST` · `DB_PORT` · `DB_USER` · `DB_PASSWORD` · `DB_NAME` · `DB_SSL=true` · `JWT_SECRET` · `NODE_ENV=production` · `CORS_ORIGIN=<URL-Vercel>`

---

## Pruebas Automatizadas

```bash
cd servidor
npm test
```

| Suite | Casos | Qué prueba |
|-------|-------|-----------|
| `pruebas/auth.test.js` | 5 | Login, JWT, rutas protegidas |
| `pruebas/clientes.test.js` | 4 | CRUD clientes, permisos por rol |
| `pruebas/ventas.test.js` | 5 | Creación, validación de totales, seguridad |

---

## Responsive Design

| Breakpoint | px | Dispositivo |
|------------|-----|-------------|
| xs | < 576 | Móvil pequeño |
| sm | ≥ 576 | Móvil |
| md | ≥ 768 | Tablet |
| lg | ≥ 992 | Laptop |
| xl | ≥ 1200 | Desktop |
| xxl | ≥ 1400 | Pantalla grande |

- Navbar con colapso hamburguesa en móvil
- POS: carrito sticky en desktop, reordenado debajo en móvil
- Tablas con scroll horizontal y columnas que se ocultan por breakpoint
- Dashboard: header flexible con `clamp()` y gráficas adaptadas con `ResponsiveContainer`
- Login: parallax desactivado en iOS/Safari

---

## Autores

Proyecto desarrollado por estudiantes del programa Tecnología en Análisis y Desarrollo de Software — SENA, Centro de Gestión de Mercados, Logística y Tecnologías de la Información.