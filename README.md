# SGI Librería El Saber

**Sistema de Gestión de Inventario** para la Librería El Saber.
Proyecto de grado — SENA, Tecnólogo en Análisis y Desarrollo de Software (ADSO).

---

## Descripción General

Aplicación web full-stack que digitaliza la operación completa de una librería: gestión de inventario, registro de ventas, control de movimientos (kardex), administración de clientes, proveedores, autores y categorías. Incluye panel de estadísticas en tiempo real y control de acceso por roles.

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 7 + Bootstrap 5 |
| Backend | Node.js + Express 5 |
| Base de datos | MySQL 8 (Aiven Cloud) |
| Autenticación | JWT + bcrypt |
| Formularios | react-hook-form |
| Gráficas | Recharts |
| Exportación | jsPDF + xlsx |
| Subida de archivos | Multer |
| Pruebas | Jest + Supertest |

---

## Estructura del Proyecto

```
proyecto-inventario/
├── cliente/                  # Frontend React + Vite
│   ├── src/
│   │   ├── paginas/          # Vistas principales
│   │   ├── componentes/      # Componentes reutilizables
│   │   ├── contexto/         # AuthContext (sesión global)
│   │   └── servicios/        # Cliente HTTP (axios)
│   └── public/               # Assets estáticos
│
├── servidor/                 # Backend Node.js + Express
│   ├── controladores/        # Lógica de negocio
│   ├── rutas/                # Endpoints de la API REST
│   ├── middlewares/          # Auth, roles, errores, uploads
│   ├── configuracion/        # Conexión a MySQL
│   ├── scripts/              # Utilidades (reset de contraseñas)
│   ├── pruebas/              # Tests automatizados
│   └── uploads/portadas/     # Imágenes de portada de libros
│
└── base_datos/
    └── sgi_libreria_completo.sql  # Script único de instalación
```

---

## Módulos de la Aplicación

### 1. Autenticación (`/`)
- Formulario de login con validación en tiempo real (react-hook-form)
- Bloqueo de cuenta tras 3 intentos fallidos
- Barra de progreso de intentos restantes
- Sesión persistida en `localStorage` mediante JWT
- Botón mostrar/ocultar contraseña

### 2. Dashboard — Panel de Administración (`/inicio`)
> Solo accesible para el rol **Administrador**

- Tarjetas con métricas: ventas del día, ventas del mes, total de libros y clientes
- **Gráfica de barras** — ventas e ingresos de los últimos 6 meses (Recharts)
- **Gráfica de torta** — distribución de libros por categoría (Recharts)
- Top 5 productos más vendidos con ingresos generados
- Top 5 mejores clientes por número de compras
- Alertas de libros con stock por debajo del mínimo

### 3. Inventario (`/inventario`)
> Accesible para **Administrador** y **Vendedor**

- Tabla de libros con miniatura de portada, ISBN, autor, categoría, precio y stock
- Búsqueda en tiempo real por título, autor o ISBN (filtrado sin petición al servidor)
- Indicadores visuales de stock: Normal / Stock Bajo / Agotado
- **Crear libro**: modal con todos los campos + subida de imagen de portada (JPG/PNG/WebP, máx. 2 MB)
- **Editar libro**: carga datos actuales, permite cambiar portada mostrando previsualización
- **Eliminar libro**: confirmación con `window.confirm`, elimina también el archivo de portada del servidor

### 4. Movimientos — Kardex (`/movimientos`)
> Accesible para **Administrador** y **Vendedor**

- Registro de movimientos **ENTRADA** y **SALIDA** de inventario
- Para entradas: proveedor y costo de compra **obligatorios** (validados en frontend y backend)
- Validación de que el proveedor exista en la base de datos (dentro de transacción ACID)
- Bloqueo de costos negativos
- Registro del usuario responsable en cada movimiento (auditoría)
- Historial con columnas: libro, tipo, cantidad, stock anterior → nuevo, proveedor, costo, responsable, fecha

### 5. Registro de Ventas (`/ventas`)
> Accesible para **Administrador** y **Vendedor**

- Selección de cliente y búsqueda dinámica
- Carrito de compra con múltiples ítems
- Selección de método de pago: Efectivo, Tarjeta, Transferencia, Mixto
- Descuentos por venta
- El backend recalcula y valida el total (no confía en el frontend)
- Descuento automático del stock al confirmar la venta (transacción ACID)

### 6. Historial de Ventas (`/historial-ventas`)
> Solo accesible para el rol **Administrador**

- Tabla de todas las ventas con estado visual (badge): Completada / Anulada
- Filtro por rango de fechas
- Búsqueda por cliente o número de venta
- **Anular venta**: confirmación con `window.confirm`, revierte el stock automáticamente
- **Exportar a Excel** (xlsx): descarga la tabla filtrada
- **Exportar a PDF** (jsPDF): genera documento con resumen de ventas

### 7. Clientes (`/clientes`)
- CRUD completo de clientes
- Tipos de documento: CC, NIT, CE, PP
- Búsqueda en tiempo real por nombre o documento
- Validación de documento único

### 8. Gestión de Usuarios (`/admin/usuarios`)
> Solo accesible para el rol **Administrador**

- Tabla de usuarios con nombre, email, rol (badge), estado (Activo/Inactivo) y último acceso
- **Crear usuario**: nombre, email, contraseña (mín. 6 caracteres) y rol
- **Editar usuario**: modifica nombre, email y rol (sin contraseña)
- **Activar / Desactivar**: un usuario inactivo no puede iniciar sesión; el administrador no puede desactivarse a sí mismo
- Validación completa con react-hook-form + mensajes de error por campo

### 9. Cambiar Contraseña
> Disponible para **todos los usuarios autenticados**

- Modal accesible desde la barra de navegación
- Requiere contraseña actual para confirmar identidad
- Validación de coincidencia entre nueva contraseña y confirmación
- Mínimo 6 caracteres para la nueva contraseña

### 10. Proveedores (`/proveedores`)
- CRUD completo de proveedores (empresas suministradoras)
- Campos: nombre empresa, NIT, contacto, email, teléfono, dirección
- Activar / Desactivar proveedores

### 11. Autores (`/autores`)
- CRUD de autores con nombre y nacionalidad

### 12. Categorías (`/categorias`)
- CRUD de categorías de libros

---

## Sistema de Roles (RBAC)

| Módulo | Administrador | Vendedor |
|--------|:---:|:---:|
| Dashboard | ✅ | ❌ |
| Inventario | ✅ | ✅ |
| Movimientos | ✅ | ✅ |
| Ventas | ✅ | ✅ |
| Historial de Ventas | ✅ | ❌ |
| Clientes | ✅ | ✅ |
| Gestión de Usuarios | ✅ | ❌ |
| Proveedores | ✅ | ✅ |
| Autores | ✅ | ✅ |
| Categorías | ✅ | ✅ |
| Cambiar Contraseña | ✅ | ✅ |

---

## API REST — Endpoints

| Método | Ruta | Descripción | Rol |
|--------|------|-------------|-----|
| POST | `/api/auth/login` | Iniciar sesión | Público |
| GET | `/api/libros` | Listar libros | Auth |
| POST | `/api/libros` | Crear libro (con portada) | Admin |
| PUT | `/api/libros/:id` | Actualizar libro | Admin |
| DELETE | `/api/libros/:id` | Eliminar libro | Admin |
| GET | `/api/movimientos` | Historial kardex | Auth |
| POST | `/api/movimientos` | Registrar movimiento | Auth |
| GET | `/api/ventas` | Listar ventas | Admin |
| POST | `/api/ventas` | Crear venta | Auth |
| PATCH | `/api/ventas/:id/anular` | Anular venta | Admin |
| GET | `/api/clientes` | Listar clientes | Auth |
| POST | `/api/clientes` | Crear cliente | Auth |
| PUT | `/api/clientes/:id` | Actualizar cliente | Auth |
| GET | `/api/dashboard` | Estadísticas globales | Admin |
| GET | `/api/usuarios` | Listar usuarios | Admin |
| POST | `/api/usuarios` | Crear usuario | Admin |
| PUT | `/api/usuarios/:id` | Actualizar usuario | Admin |
| PATCH | `/api/usuarios/:id/estado` | Activar/Desactivar | Admin |
| PATCH | `/api/usuarios/cambiar-password` | Cambiar contraseña | Auth |
| GET | `/api/proveedores` | Listar proveedores | Auth |
| GET | `/api/autores` | Listar autores | Auth |
| GET | `/api/categorias` | Listar categorías | Auth |

---

## Base de Datos

**Motor:** MySQL 8 — InnoDB (transaccional) — Charset utf8mb4
**Prefijo de tablas:** `mdc_`

### Tablas

| Tabla | Descripción |
|-------|-------------|
| `mdc_roles` | Roles del sistema (Administrador, Vendedor) |
| `mdc_usuarios` | Cuentas de usuario con hash bcrypt y JWT |
| `mdc_libros` | Inventario principal con stock y portada |
| `mdc_autores` | Catálogo de autores |
| `mdc_categorias` | Clasificación de libros |
| `mdc_movimientos` | Kardex: entradas y salidas con auditoría |
| `mdc_clientes` | Registro de clientes para facturación |
| `mdc_proveedores` | Empresas suministradoras |
| `mdc_ventas` | Cabecera de facturas |
| `mdc_detalle_ventas` | Ítems de cada factura (ON DELETE CASCADE) |

### Vistas
- `v_libros_stock_bajo` — Libros en o por debajo del stock mínimo
- `v_ventas_hoy` — Resumen de ventas del día actual
- `v_catalogo_libros` — Catálogo con estado de stock calculado

---

## Seguridad

- **JWT** con expiración configurable vía `.env`
- **bcrypt** (salt rounds: 10) para almacenamiento de contraseñas
- **Rate limiting** en endpoints de autenticación (protección contra fuerza bruta)
- **RBAC** — verificación de rol en cada ruta protegida
- **Bloqueo de cuenta** tras 3 intentos fallidos de login
- **CORS** restringido al origen configurado en `.env`
- **Manejo global de errores** — nunca expone detalles internos en producción
- **Validación doble** — frontend (react-hook-form) + backend (Express)
- **Transacciones ACID** en operaciones críticas (ventas, movimientos)
- **Archivos estáticos** con validación de tipo MIME y extensión (solo imágenes)

---

## Instalación Local

### Requisitos
- Node.js 18+
- MySQL 8+ (local o Aiven Cloud)

### 1. Base de datos
```bash
mysql -u root -p < base_datos/sgi_libreria_completo.sql
```

### 2. Backend
```bash
cd servidor
cp .env.example .env        # Completar variables de entorno
npm install
node scripts/reset_password.js  # Generar hashes bcrypt iniciales
npm start                   # Puerto 3000 por defecto
```

### 3. Frontend
```bash
cd cliente
cp .env.example .env        # Configurar VITE_API_URL
npm install
npm run dev                 # http://localhost:5173
```

### Credenciales por defecto
| Usuario | Email | Contraseña | Rol |
|---------|-------|------------|-----|
| Administrador | `admin@sena.edu.co` | `123456` | Administrador |
| Vendedor | `vendedor@sena.edu.co` | `vendedor123` | Vendedor |

> Las contraseñas son válidas solo después de ejecutar `node scripts/reset_password.js`

---

## Variables de Entorno

### `servidor/.env`
```
PORT=3000
DB_HOST=...
DB_PORT=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=inventario_libreria
JWT_SECRET=...
JWT_EXPIRES_IN=8h
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### `cliente/.env`
```
VITE_API_URL=http://localhost:3000/api
```

---

## Pruebas Automatizadas

```bash
cd servidor
npm test
```

Suites disponibles:
- `pruebas/auth.test.js` — Login, tokens JWT, rutas protegidas (5 casos)
- `pruebas/clientes.test.js` — CRUD clientes, permisos (4 casos)
- `pruebas/ventas.test.js` — Creación, validación de totales, seguridad (5 casos)

---

## Autores

Proyecto desarrollado por estudiantes de Tecnología en ADSO — SENA, Centro de Gestión de Mercados, Logística y TI.
