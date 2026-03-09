-- =====================================================
-- SCRIPT COMPLETO - BASE DE DATOS SGI LIBRERÍA
-- =====================================================
-- Sistema de Gestión de Inventario - Librería El Saber
-- Proyecto SENA - Tecnólogo en Análisis y Desarrollo de Software
--
-- AUTOR: Equipo de Desarrollo SGI
-- VERSIÓN: 3.0.0
-- FECHA: Marzo 2026
--
-- PREFIJO DE TABLAS: mdc_
-- (Evita conflictos en hosting compartido)
--
-- MOTOR: InnoDB (soporte transaccional y FK)
-- CHARSET: utf8mb4 (soporte emoji y caracteres especiales)
-- =====================================================

-- =====================================================
-- INSTRUCCIONES DE INSTALACIÓN:
-- =====================================================
-- 1. Abrir MySQL Workbench, HeidiSQL o terminal MySQL
--
-- 2. Ejecutar este script completo:
--    mysql -u root -p < sgi_libreria_completo.sql
--
-- 3. Regenerar contraseñas ejecutando en el servidor:
--    cd servidor
--    node scripts/reset_password.js
--
-- 4. Credenciales por defecto tras ejecutar reset_password.js:
--    - Administrador: admin@sena.edu.co / 123456
--    - Vendedor: vendedor@sena.edu.co / vendedor123
-- =====================================================

-- =====================================================
-- SECCIÓN 1: PREPARACIÓN DEL ENTORNO
-- =====================================================

-- Eliminar base de datos si existe (instalación limpia)
DROP DATABASE IF EXISTS inventario_libreria;

-- Crear base de datos con charset UTF-8 completo
CREATE DATABASE inventario_libreria
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- Seleccionar la base de datos
USE inventario_libreria;

-- Desactivar verificación de FK temporalmente para creación ordenada
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- SECCIÓN 2: TABLAS DEL SISTEMA DE SEGURIDAD
-- =====================================================

-- 2.1 Tabla de Roles (Sistema RBAC)
-- Define los niveles de acceso: Administrador y Vendedor
CREATE TABLE mdc_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Roles del sistema RBAC';

-- 2.2 Tabla de Usuarios
-- Almacena credenciales y datos de los usuarios del sistema
CREATE TABLE mdc_usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt de la contraseña',
    rol_id INT NOT NULL,
    estado TINYINT(1) DEFAULT 1 COMMENT '1=Activo, 0=Inactivo',
    ultimo_acceso TIMESTAMP NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES mdc_roles(id) ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Usuarios del sistema con autenticación JWT';

-- =====================================================
-- SECCIÓN 3: TABLAS DEL CATÁLOGO
-- =====================================================

-- 3.1 Tabla de Autores
-- Catálogo de autores de libros
CREATE TABLE mdc_autores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    nacionalidad VARCHAR(50),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Catálogo de autores de libros';

-- 3.2 Tabla de Categorías
-- Clasificación de libros por género/tema
CREATE TABLE mdc_categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(200),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Categorías para clasificar libros';

-- 3.3 Tabla de Libros (Inventario Principal)
-- Catálogo completo de libros con información de stock
CREATE TABLE mdc_libros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    isbn VARCHAR(20) UNIQUE COMMENT 'ISBN-13 del libro',
    portada VARCHAR(255) NULL COMMENT 'Nombre del archivo de imagen de portada (carpeta uploads/portadas/)',
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    precio_venta DECIMAL(10, 2) NOT NULL COMMENT 'Precio en COP',
    stock_actual INT DEFAULT 0,
    stock_minimo INT DEFAULT 5 COMMENT 'Umbral para alerta de reabastecimiento',
    autor_id INT,
    categoria_id INT,
    imagen_url VARCHAR(255),
    activo TINYINT(1) DEFAULT 1,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (autor_id) REFERENCES mdc_autores(id) ON DELETE SET NULL,
    FOREIGN KEY (categoria_id) REFERENCES mdc_categorias(id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Inventario principal de libros';

-- =====================================================
-- SECCIÓN 4: TABLAS DE OPERACIONES
-- =====================================================

-- 4.1 Tabla de Movimientos (Kardex)
-- Registro de entradas y salidas de inventario con auditoría completa
CREATE TABLE mdc_movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    libro_id INT NOT NULL,
    usuario_id INT NOT NULL,
    tipo_movimiento ENUM('ENTRADA', 'SALIDA') NOT NULL,
    cantidad INT NOT NULL,
    stock_anterior INT COMMENT 'Stock antes del movimiento',
    stock_nuevo INT COMMENT 'Stock después del movimiento',
    observaciones TEXT,
    proveedor_id INT NULL COMMENT 'Proveedor que suministró los libros (solo para ENTRADA)',
    costo_compra DECIMAL(10, 2) NULL COMMENT 'Precio unitario de compra al proveedor',
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (libro_id) REFERENCES mdc_libros(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES mdc_usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT fk_movimiento_proveedor
        FOREIGN KEY (proveedor_id) REFERENCES mdc_proveedores(id)
        ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Kardex de movimientos de inventario';

-- 4.2 Tabla de Clientes
-- Registro de clientes para facturación
CREATE TABLE mdc_clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    documento VARCHAR(20) NOT NULL UNIQUE COMMENT 'CC, NIT o documento de identidad',
    tipo_documento ENUM('CC', 'NIT', 'CE', 'PP') DEFAULT 'CC',
    email VARCHAR(100),
    telefono VARCHAR(20),
    direccion VARCHAR(200),
    activo TINYINT(1) DEFAULT 1,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Clientes de la librería';

-- 4.3 Tabla de Proveedores
-- Empresas que suministran libros
CREATE TABLE mdc_proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_empresa VARCHAR(100) NOT NULL,
    nit VARCHAR(20) COMMENT 'NIT de la empresa',
    nombre_contacto VARCHAR(100),
    email VARCHAR(100),
    telefono VARCHAR(20),
    direccion VARCHAR(200),
    activo TINYINT(1) DEFAULT 1,
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Proveedores de libros';

-- =====================================================
-- SECCIÓN 5: TABLAS DE VENTAS
-- =====================================================

-- 5.1 Tabla de Ventas (Cabecera de Factura)
-- Registro de ventas realizadas
CREATE TABLE mdc_ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    usuario_id INT COMMENT 'Vendedor que realizó la venta',
    subtotal DECIMAL(10, 2) DEFAULT 0,
    descuento DECIMAL(10, 2) DEFAULT 0,
    total_venta DECIMAL(10, 2) NOT NULL,
    metodo_pago ENUM('Efectivo', 'Tarjeta', 'Transferencia', 'Mixto') DEFAULT 'Efectivo',
    estado ENUM('Completada', 'Anulada', 'Pendiente') DEFAULT 'Completada',
    observaciones TEXT,
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cliente_id) REFERENCES mdc_clientes(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES mdc_usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Cabecera de facturas de venta';

-- 5.2 Tabla de Detalle de Ventas (Ítems de Factura)
-- Líneas de detalle de cada venta
CREATE TABLE mdc_detalle_ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    libro_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL COMMENT 'Precio al momento de la venta',
    descuento_linea DECIMAL(10, 2) DEFAULT 0,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES mdc_ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (libro_id) REFERENCES mdc_libros(id) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Detalle de ítems por venta';

-- Reactivar verificación de FK
SET FOREIGN_KEY_CHECKS = 1;

-- =====================================================
-- SECCIÓN 6: DATOS SEMILLA (SEEDERS)
-- =====================================================

-- 6.1 Roles del Sistema
INSERT INTO mdc_roles (nombre, descripcion) VALUES
    ('Administrador', 'Acceso completo al sistema. Puede gestionar usuarios, inventario y ver reportes.'),
    ('Vendedor', 'Acceso limitado a ventas e inventario. No puede gestionar usuarios.');

-- 6.2 Usuarios del Sistema
-- IMPORTANTE: Las contraseñas deben regenerarse ejecutando reset_password.js
-- Los hash placeholder serán reemplazados por bcrypt válidos
INSERT INTO mdc_usuarios (nombre_completo, email, password_hash, rol_id, estado) VALUES
    ('Administrador SENA', 'admin@sena.edu.co', '$2b$10$placeholder_debe_regenerarse_admin', 1, 1),
    ('Vendedor SENA', 'vendedor@sena.edu.co', '$2b$10$placeholder_debe_regenerarse_vendedor', 2, 1);

-- 6.3 Categorías de Libros
INSERT INTO mdc_categorias (nombre, descripcion) VALUES
    ('Tecnología', 'Libros de programación, bases de datos y desarrollo de software'),
    ('Ficción', 'Novelas, cuentos y narrativa literaria'),
    ('Historia', 'Libros históricos y biografías'),
    ('Ciencia', 'Divulgación científica y textos académicos'),
    ('Negocios', 'Administración, emprendimiento y finanzas'),
    ('Arte', 'Diseño, pintura, música y expresión artística'),
    ('Infantil', 'Literatura para niños y jóvenes'),
    ('Autoayuda', 'Desarrollo personal y motivación');

-- 6.4 Autores de Ejemplo
INSERT INTO mdc_autores (nombre, nacionalidad) VALUES
    ('Gabriel García Márquez', 'Colombiano'),
    ('Robert C. Martin', 'Estadounidense'),
    ('Isabel Allende', 'Chilena'),
    ('Mario Vargas Llosa', 'Peruano'),
    ('Paulo Coelho', 'Brasileño'),
    ('Stephen King', 'Estadounidense'),
    ('Jorge Luis Borges', 'Argentino'),
    ('Julio Cortázar', 'Argentino');

-- 6.5 Libros de Ejemplo (Catálogo Inicial)
INSERT INTO mdc_libros (isbn, titulo, descripcion, precio_venta, stock_actual, stock_minimo, autor_id, categoria_id) VALUES
    ('978-0307474728', 'Cien Años de Soledad', 'Obra maestra del realismo mágico latinoamericano que narra la historia de la familia Buendía.', 45000, 15, 5, 1, 2),
    ('978-0132350884', 'Clean Code', 'Guía esencial para escribir código limpio, legible y mantenible. Lectura obligada para desarrolladores.', 85000, 10, 3, 2, 1),
    ('978-0062466532', 'La Casa de los Espíritus', 'Saga familiar que abarca varias generaciones en Chile, mezclando realismo y elementos sobrenaturales.', 38000, 12, 5, 3, 2),
    ('978-8420471839', 'La Ciudad y los Perros', 'Primera novela del Premio Nobel peruano, ambientada en un colegio militar de Lima.', 42000, 8, 4, 4, 2),
    ('978-0061122415', 'El Alquimista', 'Novela filosófica sobre seguir los sueños y encontrar el destino personal.', 35000, 20, 5, 5, 2),
    ('978-1501142970', 'It', 'Clásico del terror sobre los miedos de la infancia y un payaso diabólico en Maine.', 55000, 7, 3, 6, 2),
    ('978-0140286809', 'Ficciones', 'Colección de cuentos que exploran laberintos, espejos y realidades alternas.', 40000, 9, 4, 7, 2),
    ('978-8437604572', 'Rayuela', 'Novela experimental que puede leerse de múltiples formas.', 48000, 11, 5, 8, 2),
    ('978-0134685991', 'The Pragmatic Programmer', 'Guía práctica para convertirse en un mejor desarrollador de software.', 95000, 6, 3, 2, 1),
    ('978-0596517748', 'JavaScript: The Good Parts', 'Análisis profundo de las mejores características de JavaScript.', 65000, 8, 4, 2, 1);

-- 6.6 Clientes de Ejemplo
INSERT INTO mdc_clientes (nombre_completo, documento, tipo_documento, email, telefono, direccion) VALUES
    ('María González Pérez', '1020304050', 'CC', 'maria.gonzalez@email.com', '3101234567', 'Calle 10 #20-30, Bogotá'),
    ('Carlos Rodríguez López', '1020304051', 'CC', 'carlos.rodriguez@email.com', '3109876543', 'Carrera 15 #25-40, Medellín'),
    ('Ana Martínez Silva', '1020304052', 'CC', 'ana.martinez@email.com', '3205551234', 'Avenida 7 #12-18, Cali'),
    ('Luis Hernández García', '1020304053', 'CC', 'luis.hernandez@email.com', '3156667788', 'Calle 45 #30-22, Barranquilla'),
    ('Sofía Ramírez Torres', '1020304054', 'CC', 'sofia.ramirez@email.com', '3001112233', 'Carrera 8 #15-60, Cartagena'),
    ('Empresa ABC S.A.S.', '900111222-1', 'NIT', 'compras@empresaabc.com', '6017778899', 'Zona Industrial, Bogotá'),
    ('Universidad Nacional', '899999999-4', 'NIT', 'biblioteca@unal.edu.co', '6013165000', 'Ciudad Universitaria, Bogotá');

-- 6.7 Proveedores de Ejemplo
INSERT INTO mdc_proveedores (nombre_empresa, nit, nombre_contacto, email, telefono, direccion) VALUES
    ('Distribuidora de Libros S.A.', '900123456-1', 'Juan Pérez Gómez', 'ventas@distlibros.com', '6015551234', 'Calle 50 #30-20, Bogotá'),
    ('Editorial Nacional Ltda.', '900789012-3', 'Laura Gómez Ruiz', 'contacto@editnacional.com', '6015559876', 'Carrera 80 #45-10, Bogotá'),
    ('Importadora Lecturas S.A.S.', '900456789-5', 'Pedro Sánchez Díaz', 'pedidos@implecturas.com', '6014443322', 'Avenida 68 #22-15, Bogotá'),
    ('Penguin Random House', '800555666-7', 'Andrea López', 'ventas.co@penguinrandomhouse.com', '6012223344', 'Calle 93 #12-45, Bogotá');

-- =====================================================
-- SECCIÓN 7: ÍNDICES DE OPTIMIZACIÓN
-- =====================================================

-- Índices para búsquedas frecuentes
CREATE INDEX idx_libros_titulo ON mdc_libros(titulo);
CREATE INDEX idx_libros_isbn ON mdc_libros(isbn);
CREATE INDEX idx_libros_stock ON mdc_libros(stock_actual);
CREATE INDEX idx_ventas_fecha ON mdc_ventas(fecha_venta);
CREATE INDEX idx_ventas_cliente ON mdc_ventas(cliente_id);
CREATE INDEX idx_movimientos_fecha ON mdc_movimientos(fecha_movimiento);
CREATE INDEX idx_movimientos_libro ON mdc_movimientos(libro_id);
CREATE INDEX idx_movimientos_proveedor ON mdc_movimientos(proveedor_id);
CREATE INDEX idx_clientes_nombre ON mdc_clientes(nombre_completo);
CREATE INDEX idx_clientes_documento ON mdc_clientes(documento);
CREATE INDEX idx_usuarios_email ON mdc_usuarios(email);

-- =====================================================
-- SECCIÓN 8: VISTAS ÚTILES
-- =====================================================

-- Vista: Libros con stock bajo
CREATE OR REPLACE VIEW v_libros_stock_bajo AS
SELECT
    l.id,
    l.isbn,
    l.titulo,
    a.nombre AS autor,
    c.nombre AS categoria,
    l.stock_actual,
    l.stock_minimo,
    l.precio_venta
FROM mdc_libros l
LEFT JOIN mdc_autores a ON l.autor_id = a.id
LEFT JOIN mdc_categorias c ON l.categoria_id = c.id
WHERE l.stock_actual <= l.stock_minimo
    AND l.activo = 1
ORDER BY l.stock_actual ASC;

-- Vista: Resumen de ventas del día
CREATE OR REPLACE VIEW v_ventas_hoy AS
SELECT
    COUNT(*) AS total_ventas,
    COALESCE(SUM(total_venta), 0) AS ingresos_totales,
    COALESCE(AVG(total_venta), 0) AS promedio_venta
FROM mdc_ventas
WHERE DATE(fecha_venta) = CURDATE()
    AND estado = 'Completada';

-- Vista: Catálogo completo de libros
CREATE OR REPLACE VIEW v_catalogo_libros AS
SELECT
    l.id,
    l.isbn,
    l.titulo,
    l.descripcion,
    a.nombre AS autor,
    c.nombre AS categoria,
    l.precio_venta,
    l.stock_actual,
    l.stock_minimo,
    CASE
        WHEN l.stock_actual = 0 THEN 'Agotado'
        WHEN l.stock_actual <= l.stock_minimo THEN 'Stock Bajo'
        ELSE 'Disponible'
    END AS estado_stock
FROM mdc_libros l
LEFT JOIN mdc_autores a ON l.autor_id = a.id
LEFT JOIN mdc_categorias c ON l.categoria_id = c.id
WHERE l.activo = 1
ORDER BY l.titulo;

-- =====================================================
-- SECCIÓN 9: VERIFICACIÓN DE INSTALACIÓN
-- =====================================================

-- Mostrar mensaje de éxito
SELECT '=============================================' AS '';
SELECT '  BASE DE DATOS CREADA EXITOSAMENTE' AS 'ESTADO';
SELECT '=============================================' AS '';

-- Mostrar tablas creadas con cantidad de registros
SELECT
    TABLE_NAME AS 'Tabla',
    TABLE_ROWS AS 'Registros',
    ROUND(DATA_LENGTH / 1024, 2) AS 'Tamaño (KB)'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'inventario_libreria'
ORDER BY TABLE_NAME;

-- Mostrar vistas creadas
SELECT
    TABLE_NAME AS 'Vista'
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'inventario_libreria';

-- =====================================================
-- RECORDATORIO POST-INSTALACIÓN
-- =====================================================
--
-- PASO OBLIGATORIO DESPUÉS DE EJECUTAR ESTE SCRIPT:
--
-- 1. Navegar al directorio del servidor:
--    cd servidor
--
-- 2. Ejecutar el script de reset de contraseñas:
--    node scripts/reset_password.js
--
-- 3. Esto generará hashes bcrypt válidos para:
--    - admin@sena.edu.co (contraseña: 123456)
--    - vendedor@sena.edu.co (contraseña: vendedor123)
--
-- 4. Iniciar el servidor:
--    npm start
--
-- 5. Acceder a la aplicación:
--    http://localhost:3000
--
-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
