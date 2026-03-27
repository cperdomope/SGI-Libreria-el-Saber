-- =====================================================
-- SCRIPT COMPLETO - BASE DE DATOS SGI LIBRERIA
-- =====================================================
-- Sistema de Gestion de Inventario - Libreria El Saber
-- Proyecto SENA - Tecnologo en Analisis y Desarrollo de Software
--
-- VERSION: 4.0.0
-- FECHA: Marzo 2026
--
-- PREFIJO DE TABLAS: mdc_
-- (Usamos un prefijo para evitar conflictos de nombres con otras
-- bases de datos en servidores de hosting compartido. De esta forma,
-- nuestras tablas se identifican facilmente como parte del proyecto.)
--
-- MOTOR: InnoDB
-- (Elegimos InnoDB porque es el motor de almacenamiento de MySQL que
-- soporta transacciones ACID y claves foraneas (Foreign Keys).
-- Las transacciones nos permiten agrupar varias operaciones SQL en una
-- sola unidad: si una falla, todas se revierten, protegiendo la
-- integridad de los datos. Esto es fundamental en un sistema de ventas
-- donde se modifica stock y se registran movimientos simultaneamente.)
--
-- CHARSET: utf8mb4
-- (Usamos utf8mb4 en lugar de utf8 porque utf8mb4 soporta el conjunto
-- completo de caracteres Unicode, incluyendo tildes, enes, emojis y
-- simbolos especiales. utf8 de MySQL solo soporta hasta 3 bytes por
-- caracter, lo que excluye algunos caracteres. utf8mb4 usa hasta 4
-- bytes y es el estandar recomendado actualmente.)
--
-- COLLATE: utf8mb4_unicode_ci
-- (El collation define como MySQL compara y ordena texto.
-- 'unicode_ci' significa que las comparaciones no distinguen entre
-- mayusculas y minusculas (Case Insensitive), asi que buscar
-- 'garcia' encontrara 'Garcia' y 'GARCIA'. Esto es ideal para
-- busquedas de nombres, titulos y correos electronicos.)


-- INSTRUCCIONES DE INSTALACION:
--
-- 1. Abrir MySQL Workbench, HeidiSQL o terminal MySQL
--
-- 2. Ejecutar este script completo:
--    mysql -u root -p < sgi_libreria_completo.sql
--
-- 3. Regenerar contrasenas ejecutando en el servidor:
--    cd servidor
--    node scripts/reset_password.js
--
-- 4. Credenciales por defecto tras ejecutar reset_password.js:
--    - Administrador: ldarlys@sena.edu.co   / Luzd12345
--    - Vendedor:      michelle@sena.edu.co  / vendedor123
--    - Administrador: cip@sena.edu.co       / cip123


-- =====================================================
-- SECCION 1: PREPARACION DEL ENTORNO
-- =====================================================
-- Antes de crear cualquier tabla, debemos preparar el entorno de MySQL.
-- Esto incluye configurar el charset de la conexion, crear la base de
-- datos y seleccionarla como la base de datos activa.

-- SET NAMES establece el charset que usara el cliente MySQL para enviar
-- y recibir datos. Con esto nos aseguramos de que los caracteres
-- especiales (tildes, enes) se transmitan correctamente entre el
-- cliente y el servidor de base de datos.
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

-- DROP DATABASE IF EXISTS elimina la base de datos si ya existia.
-- Esto permite ejecutar el script varias veces sin errores (instalacion
-- limpia). IMPORTANTE: esto borra TODOS los datos existentes, por lo
-- que solo debe usarse en desarrollo o al instalar por primera vez.
DROP DATABASE IF EXISTS inventario_libreria;

-- CREATE DATABASE crea una nueva base de datos vacia. Le asignamos
-- el charset utf8mb4 y el collation unicode_ci como configuracion
-- predeterminada, de modo que todas las tablas que creemos dentro
-- hereden automaticamente esta configuracion.
CREATE DATABASE inventario_libreria
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

-- USE selecciona la base de datos activa. A partir de aqui, todas
-- las sentencias CREATE TABLE, INSERT, etc., se ejecutaran dentro
-- de 'inventario_libreria'.
USE inventario_libreria;

-- FOREIGN_KEY_CHECKS controla si MySQL verifica las claves foraneas
-- al ejecutar sentencias. Lo desactivamos temporalmente (valor 0)
-- porque vamos a crear todas las tablas de una vez y algunas tienen
-- referencias cruzadas entre si. Si no lo desactivaramos, MySQL
-- daria error al intentar crear una FK hacia una tabla que aun no
-- existe. Lo reactivamos al final de la creacion de tablas.
SET FOREIGN_KEY_CHECKS = 0;


-- =====================================================
-- SECCION 2: TABLAS DEL SISTEMA DE SEGURIDAD
-- =====================================================
-- Estas tablas manejan la autenticacion (quien eres) y la autorizacion
-- (que puedes hacer). Implementamos un sistema RBAC (Role-Based Access
-- Control), que significa Control de Acceso Basado en Roles. En RBAC,
-- los permisos se asignan a roles (Administrador, Vendedor) y luego
-- cada usuario se asocia a un rol, en lugar de asignar permisos
-- individualmente a cada usuario.

-- 2.1 Tabla de Roles (Sistema RBAC)
-- Esta tabla almacena los roles disponibles en el sistema.
-- Actualmente manejamos dos: Administrador (acceso total) y
-- Vendedor (acceso limitado a ventas e inventario).
-- INT AUTO_INCREMENT PRIMARY KEY: crea un identificador numerico unico
-- que se incrementa automaticamente con cada nuevo registro.
-- VARCHAR(50): tipo de dato para texto con longitud maxima de 50 caracteres.
-- NOT NULL: indica que el campo es obligatorio, no puede quedar vacio.
-- UNIQUE: garantiza que no se puedan repetir nombres de rol.
CREATE TABLE mdc_roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB COMMENT='Roles del sistema RBAC';

-- 2.2 Tabla de Usuarios
-- Almacena las credenciales y datos de cada usuario que puede
-- iniciar sesion en el sistema. La contrasena se guarda como hash
-- bcrypt (nunca en texto plano) por razones de seguridad.
-- TINYINT(1): tipo de dato pequeno que usamos como booleano
-- (1 = verdadero/activo, 0 = falso/inactivo).
-- TIMESTAMP: almacena fecha y hora. DEFAULT CURRENT_TIMESTAMP
-- asigna automaticamente la fecha/hora actual al crear un registro.
-- FOREIGN KEY: crea una relacion entre esta tabla y mdc_roles.
-- El campo rol_id de esta tabla debe contener un valor que exista
-- en la columna id de mdc_roles. ON UPDATE CASCADE significa que
-- si el id del rol cambia, se actualiza automaticamente aqui.
CREATE TABLE mdc_usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_completo VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL COMMENT 'Hash bcrypt de la contrasena',
    rol_id INT NOT NULL,
    estado TINYINT(1) DEFAULT 1 COMMENT '1=Activo, 0=Inactivo',
    ultimo_acceso TIMESTAMP NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rol_id) REFERENCES mdc_roles(id) ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Usuarios del sistema con autenticacion JWT';


-- =====================================================
-- SECCION 3: TABLAS DEL CATALOGO
-- =====================================================
-- Estas tablas almacenan la informacion del catalogo de productos
-- de la libreria: los autores, las categorias y los libros.
-- Separamos autores y categorias en tablas independientes para
-- aplicar el principio de normalizacion de bases de datos.
-- La normalizacion evita la repeticion de datos: en lugar de escribir
-- "Gabriel Garcia Marquez" en cada libro, guardamos el nombre una
-- sola vez en mdc_autores y lo referenciamos con un id numerico.

-- 3.1 Tabla de Autores
-- Catalogo de autores de libros. Cada autor se registra una sola
-- vez y puede estar asociado a multiples libros (relacion 1:N).
CREATE TABLE mdc_autores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Catalogo de autores de libros';

-- 3.2 Tabla de Categorias
-- Clasificacion de libros por genero o tema (Novela, Programacion,
-- Historia, etc.). Al igual que autores, se normaliza en su propia
-- tabla para evitar inconsistencias (por ejemplo, que un libro diga
-- "Programacion" y otro "programacion" con minuscula).
-- UNIQUE en 'nombre' impide que se registren categorias duplicadas.
CREATE TABLE mdc_categorias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Categorias para clasificar libros';

-- 3.3 Tabla de Libros (Inventario Principal)
-- Esta es la tabla central del sistema. Almacena toda la informacion
-- de cada libro: datos bibliograficos, precio, stock y relaciones
-- con autor y categoria.
-- ISBN: es el codigo internacional estandar para identificar libros.
-- DECIMAL(10,2): tipo numerico para valores monetarios. 10 digitos
-- en total, 2 de ellos decimales. Ejemplo: 85000.00 (pesos COP).
-- Usamos DECIMAL en lugar de FLOAT porque FLOAT puede tener errores
-- de precision con decimales, algo inaceptable en valores de dinero.
-- stock_minimo: define el umbral de alerta. Cuando stock_actual cae
-- por debajo de este valor, el sistema muestra una alerta visual.
-- ON DELETE SET NULL: si se elimina un autor o categoria, el campo
-- correspondiente en el libro se pone en NULL en lugar de eliminar
-- el libro. Asi no perdemos datos de inventario por borrar un autor.
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
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (autor_id) REFERENCES mdc_autores(id) ON DELETE SET NULL,
    FOREIGN KEY (categoria_id) REFERENCES mdc_categorias(id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Inventario principal de libros';


-- =====================================================
-- SECCION 4: TABLAS DE OPERACIONES
-- =====================================================
-- Estas tablas registran las operaciones diarias del negocio:
-- datos de clientes, proveedores y movimientos de inventario.
-- El orden de creacion importa: mdc_clientes y mdc_proveedores
-- se crean ANTES de mdc_movimientos y mdc_ventas porque estas
-- ultimas tienen claves foraneas que los referencian.

-- 4.1 Tabla de Clientes
-- Registro de clientes para facturacion y seguimiento de compras.
-- El campo 'documento' almacena la cedula de ciudadania (CC) o
-- NIT para personas juridicas. Se marca como UNIQUE para evitar
-- registrar el mismo cliente dos veces.
CREATE TABLE mdc_clientes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    documento VARCHAR(20) NOT NULL UNIQUE COMMENT 'CC, NIT o documento de identidad',
    nombre_completo VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(200),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Clientes de la libreria';

-- 4.2 Tabla de Proveedores
-- Empresas o distribuidoras que suministran libros a la libreria.
-- Almacenamos la informacion de contacto para gestionar pedidos
-- y mantener la relacion comercial.
CREATE TABLE mdc_proveedores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre_empresa VARCHAR(100) NOT NULL,
    nit VARCHAR(20) COMMENT 'NIT de la empresa',
    nombre_contacto VARCHAR(100),
    telefono VARCHAR(20),
    email VARCHAR(100),
    direccion VARCHAR(200),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB COMMENT='Proveedores de libros';

-- 4.3 Tabla de Movimientos (Kardex)
-- El Kardex es un registro contable que documenta cada entrada y
-- salida de productos del inventario. Cada vez que llegan libros
-- de un proveedor (ENTRADA) o se venden libros (SALIDA), se crea
-- un registro aqui. Esto permite auditar el historial completo de
-- movimientos de cada libro.
-- ENUM: tipo de dato que solo permite valores especificos, en este
-- caso 'ENTRADA' o 'SALIDA'. Si se intenta insertar otro valor,
-- MySQL rechaza la operacion, garantizando la integridad de datos.
-- stock_anterior y stock_nuevo: guardan una "foto" del stock antes
-- y despues del movimiento, facilitando la auditoria y permitiendo
-- reconstruir el historial de inventario.
-- ON DELETE RESTRICT: impide eliminar un libro o usuario que tenga
-- movimientos registrados. Esto protege la trazabilidad del inventario.
-- ON DELETE SET NULL (proveedor_id): si se elimina un proveedor,
-- el movimiento se conserva pero el campo proveedor_id queda en NULL.
CREATE TABLE mdc_movimientos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    libro_id INT NOT NULL,
    usuario_id INT NOT NULL,
    tipo_movimiento ENUM('ENTRADA', 'SALIDA') NOT NULL,
    cantidad INT NOT NULL,
    fecha_movimiento TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    observaciones TEXT,
    proveedor_id INT NULL COMMENT 'Proveedor que suministro los libros (solo para ENTRADA)',
    costo_compra DECIMAL(10, 2) NULL COMMENT 'Precio unitario de compra al proveedor',
    stock_anterior INT COMMENT 'Stock antes del movimiento',
    stock_nuevo INT COMMENT 'Stock despues del movimiento',
    FOREIGN KEY (libro_id) REFERENCES mdc_libros(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES mdc_usuarios(id) ON DELETE RESTRICT,
    FOREIGN KEY (proveedor_id) REFERENCES mdc_proveedores(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Kardex de movimientos de inventario';


-- =====================================================
-- SECCION 5: TABLAS DE VENTAS
-- =====================================================
-- Las ventas se manejan con un modelo de cabecera-detalle, un
-- patron muy comun en bases de datos de facturacion:
-- - La CABECERA (mdc_ventas) almacena la informacion general de la
--   venta: quien compro, quien vendio, fecha, total y metodo de pago.
-- - El DETALLE (mdc_detalle_ventas) almacena cada libro incluido
--   en esa venta con su cantidad y precio.
-- Esta separacion permite que una venta tenga multiples libros
-- (relacion 1:N entre cabecera y detalle).

-- 5.1 Tabla de Ventas (Cabecera de Factura)
-- Cada registro representa una venta/factura completa.
-- El campo 'estado' permite manejar anulaciones sin borrar datos:
-- cuando se anula una venta, se cambia el estado a 'Anulada' y se
-- revierte el stock de los libros vendidos.
-- ON DELETE RESTRICT en cliente_id: impide eliminar un cliente que
-- tenga ventas asociadas, protegiendo el historial de facturacion.
-- ON DELETE SET NULL en usuario_id: si se elimina el vendedor, la
-- venta se conserva pero sin referencia al vendedor. Esto es menos
-- estricto porque la venta ya fue realizada.
CREATE TABLE mdc_ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cliente_id INT NOT NULL,
    usuario_id INT COMMENT 'Vendedor que realizo la venta',
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_venta DECIMAL(10, 2) NOT NULL,
    descuento DECIMAL(10, 2) DEFAULT 0,
    metodo_pago ENUM('Efectivo', 'Tarjeta', 'Transferencia', 'Mixto') DEFAULT 'Efectivo',
    estado ENUM('Completada', 'Anulada', 'Pendiente') DEFAULT 'Completada',
    FOREIGN KEY (cliente_id) REFERENCES mdc_clientes(id) ON DELETE RESTRICT,
    FOREIGN KEY (usuario_id) REFERENCES mdc_usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB COMMENT='Cabecera de facturas de venta';

-- 5.2 Tabla de Detalle de Ventas (Items de Factura)
-- Cada registro representa una linea/item dentro de una factura.
-- Guardamos el precio_unitario al momento de la venta porque el
-- precio del libro puede cambiar en el futuro, pero la factura
-- debe reflejar el precio que se cobro en ese momento.
-- subtotal = cantidad * precio_unitario (se calcula en el backend
-- pero se almacena para consultas rapidas).
-- ON DELETE CASCADE en venta_id: si se elimina una venta, se
-- eliminan automaticamente todos sus items de detalle. Esto
-- mantiene la consistencia: no queremos detalles huerfanos
-- sin su venta padre.
-- ON DELETE RESTRICT en libro_id: impide eliminar un libro que
-- aparece en alguna factura, preservando el historial de ventas.
CREATE TABLE mdc_detalle_ventas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    venta_id INT NOT NULL,
    libro_id INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL COMMENT 'Precio al momento de la venta',
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES mdc_ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (libro_id) REFERENCES mdc_libros(id) ON DELETE RESTRICT
) ENGINE=InnoDB COMMENT='Detalle de items por venta';

-- Reactivamos la verificacion de claves foraneas ahora que todas
-- las tablas ya fueron creadas correctamente.
SET FOREIGN_KEY_CHECKS = 1;


-- =====================================================
-- SECCION 6: INDICES DE RENDIMIENTO
-- =====================================================
-- Un indice es una estructura de datos que MySQL crea internamente
-- para acelerar las busquedas en una tabla, similar al indice de
-- un libro que te permite encontrar un tema sin leer todas las paginas.
-- Sin indice, MySQL debe recorrer TODA la tabla (Full Table Scan)
-- para encontrar un registro, lo cual es muy lento con miles de filas.
--
-- NOTA IMPORTANTE: InnoDB ya crea indices automaticamente para:
-- - PRIMARY KEY (clave primaria)
-- - FOREIGN KEY (claves foraneas)
-- - UNIQUE (restricciones de unicidad)
--
-- Los indices adicionales que creamos aqui cubren columnas que se
-- usan frecuentemente en clausulas WHERE, ORDER BY y JOIN pero
-- que no tienen indice automatico. Esto mejora significativamente
-- el rendimiento de las consultas mas comunes del sistema.
--
-- NOTA: Algunos de los indices a continuacion coinciden con columnas
-- que ya tienen UNIQUE o FOREIGN KEY (y por tanto ya tienen indice
-- automatico). En esos casos el indice explicito es redundante pero
-- no causa errores; MySQL simplemente lo ignora si ya existe uno
-- equivalente. Los mantenemos documentados por claridad.

-- mdc_ventas: estos indices aceleran las consultas del dashboard
-- y el historial de ventas, que filtran por fecha, cliente y estado.
CREATE INDEX idx_ventas_fecha       ON mdc_ventas (fecha_venta);
CREATE INDEX idx_ventas_cliente     ON mdc_ventas (cliente_id);
CREATE INDEX idx_ventas_estado      ON mdc_ventas (estado);

-- mdc_detalle_ventas: acelera los JOINs entre ventas y sus detalles,
-- y las consultas de "productos mas vendidos" que agrupan por libro.
CREATE INDEX idx_detalle_venta      ON mdc_detalle_ventas (venta_id);
CREATE INDEX idx_detalle_libro      ON mdc_detalle_ventas (libro_id);

-- mdc_libros: el indice compuesto (stock_actual, stock_minimo)
-- optimiza la consulta de alertas de stock bajo que compara ambos
-- campos. El indice de titulo acelera las busquedas por nombre.
CREATE INDEX idx_libros_stock       ON mdc_libros (stock_actual, stock_minimo);
CREATE INDEX idx_libros_titulo      ON mdc_libros (titulo);

-- mdc_movimientos: optimiza las consultas del Kardex que filtran
-- movimientos por libro especifico, rango de fechas o proveedor.
CREATE INDEX idx_mov_libro          ON mdc_movimientos (libro_id);
CREATE INDEX idx_mov_fecha          ON mdc_movimientos (fecha_movimiento);
CREATE INDEX idx_mov_proveedor      ON mdc_movimientos (proveedor_id);

-- mdc_clientes: acelera la busqueda de clientes por nombre
-- (barra de busqueda en el frontend).
CREATE INDEX idx_clientes_nombre    ON mdc_clientes (nombre_completo);


-- =====================================================
-- SECCION 7: DATOS SEMILLA (SEEDERS)
-- =====================================================
-- Los "seeders" o datos semilla son registros iniciales que se
-- insertan en la base de datos para que el sistema sea funcional
-- desde la primera ejecucion. Sin estos datos, no habria roles
-- para asignar, ni usuarios para iniciar sesion, ni libros para
-- gestionar. En un entorno de produccion real, solo los roles y
-- el usuario administrador serian datos semilla; el resto se
-- agregaria desde la interfaz del sistema.

-- 7.1 Roles del Sistema
-- Insertamos los dos roles base del sistema RBAC.
-- El id se asigna automaticamente: 1=Administrador, 2=Vendedor.
-- Estos ids se usan como referencia en el codigo del backend para
-- verificar permisos en los middlewares de autorizacion.
INSERT INTO mdc_roles (nombre) VALUES
    ('Administrador'),
    ('Vendedor');

-- 7.2 Usuarios del Sistema
-- IMPORTANTE: Las contrasenas aqui son placeholders (textos temporales).
-- Los hashes reales de bcrypt DEBEN generarse ejecutando:
--   cd servidor && node scripts/reset_password.js
--
-- Nunca almacenamos contrasenas en texto plano. bcrypt es un algoritmo
-- de hashing disenado especificamente para contrasenas: es lento a
-- proposito (para dificultar ataques de fuerza bruta) y agrega un
-- "salt" aleatorio a cada hash, haciendo que dos contrasenas iguales
-- produzcan hashes diferentes.
--
-- Credenciales tras ejecutar reset_password.js:
--   ldarlys@sena.edu.co  -> contrasena: Luzd12345
--   michelle@sena.edu.co -> contrasena: vendedor123
--   cip@sena.edu.co      -> contrasena: cip123
INSERT INTO mdc_usuarios (nombre_completo, email, password_hash, rol_id, estado) VALUES
    ('Luz Darlys',          'ldarlys@sena.edu.co',  '$2b$10$placeholder_debe_regenerarse_ldarlys',  1, 1),
    ('Michelle Martinez',   'michelle@sena.edu.co', '$2b$10$placeholder_debe_regenerarse_michelle', 2, 1),
    ('Carlos Ivan Perdomo', 'cip@sena.edu.co',      '$2b$10$placeholder_debe_regenerarse_cip',      1, 1);

-- 7.3 Categorias de Libros
-- Categorias predefinidas para clasificar el inventario.
-- Se pueden agregar mas desde la interfaz del administrador.
INSERT INTO mdc_categorias (nombre) VALUES
    ('Novela Literaria'),
    ('Programacion / Tecnologia'),
    ('Historia'),
    ('Poesia'),
    ('Economia y Finanzas'),
    ('Cocina / Gastronomia'),
    ('Desarrollo Personal');

-- 7.4 Autores de Ejemplo
-- Autores colombianos representativos y algunos adicionales.
-- El id se asigna automaticamente y se referencia desde mdc_libros.
INSERT INTO mdc_autores (nombre) VALUES
    ('Gabriel Garcia Marquez'),
    ('Robert C. Martin'),
    ('Alvaro Mutis'),
    ('Laura Restrepo'),
    ('William Ospina'),
    ('Manuel Echaverria'),
    ('Jose Eustacio Rivera'),
    ('Rafael Pombo');

-- 7.5 Libros de Ejemplo (Catalogo Inicial)
-- Insertamos un catalogo inicial de libros para demostracion.
-- Los campos autor_id y categoria_id hacen referencia a los
-- registros insertados anteriormente (por su id numerico).
-- El precio esta en pesos colombianos (COP).
INSERT INTO mdc_libros (isbn, titulo, descripcion, precio_venta, stock_actual, stock_minimo, autor_id, categoria_id) VALUES
    ('978-1', 'Cien Anos de Soledad', 'El libro CIEN ANOS DE SOLEDAD es la obra cumbre del realismo magico: una saga familiar que recorre siete generaciones de los Buendia en el mitico pueblo de Macondo. Entre guerras, amores imposibles y prodigios sobrenaturales, Garcia Marquez teje un universo donde la soledad y el destino se entrelazan con la historia de toda Latinoamerica.', 50000, 15, 5, 1, 1),
    ('978-2', 'El Amor en los Tiempos del Colera', 'El libro EL AMOR EN LOS TIEMPOS DEL COLERA se impone como una lectura imprescindible dentro de la literatura colombiana: una novela que promete una experiencia sensorial y emocional, donde el tiempo y el amor se entrelazan en un paisaje caribeno que transforma lo cotidiano en mito. Una historia de pasion que sobrevive mas de medio siglo de espera.', 30000, 2, 5, 1, 1),
    ('978-3', 'El Coronel No Tiene Quien Le Escriba', 'El libro EL CORONEL NO TIENE QUIEN LE ESCRIBA es una novela breve y contundente que retrata la dignidad humana frente a la adversidad. Un coronel retirado espera una pension que nunca llega, mientras la pobreza y la esperanza se debaten en cada pagina. Garcia Marquez logra con prosa austera una de las obras mas emotivas de la literatura universal.', 60000, 25, 5, 3, 1),
    ('978-4', 'La Bandera de la Patria', 'El libro LA BANDERA DE LA PATRIA es una obra que explora los cimientos de la identidad colombiana a traves de sus simbolos mas profundos. Con una narrativa que combina historia y reflexion, invita al lector a redescubrir el sentido de pertenencia y orgullo nacional en un recorrido por las raices culturales que nos definen como nacion.', 88000, 12, 5, 5, 1),
    ('978-5', 'El Arte de Programar', 'El libro EL ARTE DE PROGRAMAR es una guia esencial para todo aquel que desee dominar el desarrollo de software. Desde los fundamentos logicos hasta las mejores practicas profesionales, este texto transforma conceptos complejos en conocimiento accesible, convirtiendo al lector en un programador mas eficiente, creativo y preparado para los retos tecnologicos actuales.', 85000, 37, 5, 2, 2),
    ('978-6', 'El Amor Al Limite', 'El libro EL AMOR AL LIMITE es una historia apasionante que lleva las emociones al extremo. Entre decisiones imposibles y encuentros que desafian el destino, esta novela explora hasta donde puede llegar el corazon humano cuando el amor se convierte en la fuerza mas poderosa y a la vez mas vulnerable de la existencia.', 30000, 47, 5, 2, 1),
    ('978-7', 'La Voragine', 'El libro LA VORAGINE es un clasico indiscutible de la literatura colombiana que sumerge al lector en la inmensidad de la selva amazonica. A traves de la travesia de Arturo Cova, Jose Eustasio Rivera denuncia la explotacion cauchera mientras construye una narrativa salvaje y poetica donde la naturaleza devora todo a su paso.', 70000, 29, 5, 7, 1),
    ('978-8', 'La Pobre Viejecita', 'El libro LA POBRE VIEJECITA es un clasico entranable de la literatura infantil colombiana escrito por Rafael Pombo. Con humor e ironia, narra la historia de una anciana que lo tenia todo pero vivia quejandose, ensenando a los mas pequenos sobre la gratitud y el valor de lo que se tiene. Una lectura divertida y llena de sabiduria.', 45000, 29, 5, 8, 1);

-- 7.6 Clientes de Ejemplo
-- Clientes de prueba para demostracion. Incluimos tanto personas
-- naturales (con cedula de ciudadania) como personas juridicas
-- (con NIT), ya que la libreria puede vender a ambos tipos.
INSERT INTO mdc_clientes (documento, nombre_completo, telefono, email, direccion) VALUES
    ('1020304050', 'Maria Gonzalez Perez',    '3101234567', 'maria.gonzalez@email.com',   'Calle 10 #20-30, Bogota'),
    ('1020304051', 'Carlos Rodriguez Lopez',  '3109876543', 'carlos.rodriguez@email.com', 'Carrera 15 #25-40, Medellin'),
    ('1020304052', 'Ana Martinez Silva',      '3205551234', 'ana.martinez@email.com',     'Avenida 7 #12-18, Cali'),
    ('1020304053', 'Luis Hernandez Garcia',   '3156667788', 'luis.hernandez@email.com',   'Calle 45 #30-22, Barranquilla'),
    ('1020304054', 'Sofia Ramirez Torres',    '3001112233', 'sofia.ramirez@email.com',    'Carrera 8 #15-60, Cartagena'),
    ('900111222-1','Empresa ABC S.A.S.',      '6017778899', 'compras@empresaabc.com',     'Zona Industrial, Bogota'),
    ('899999999-4','Universidad Nacional',    '6013165000', 'biblioteca@unal.edu.co',     'Ciudad Universitaria, Bogota');

-- 7.7 Proveedores de Ejemplo
-- Distribuidoras y editoriales que suministran libros.
-- El NIT incluye el digito de verificacion (ej: 900123456-1).
INSERT INTO mdc_proveedores (nombre_empresa, nit, nombre_contacto, telefono, email, direccion) VALUES
    ('Distribuidora de Libros S.A.',  '900123456-1', 'Juan Perez Gomez',    '6015551234', 'ventas@distlibros.com',            'Calle 50 #30-20, Bogota'),
    ('Editorial Nacional Ltda.',      '900789012-3', 'Laura Gomez Ruiz',    '6015559876', 'contacto@editnacional.com',        'Carrera 80 #45-10, Bogota'),
    ('Importadora Lecturas S.A.S.',   '900456789-5', 'Pedro Sanchez Diaz',  '6014443322', 'pedidos@implecturas.com',          'Avenida 68 #22-15, Bogota'),
    ('Penguin Random House',          '800555666-7', 'Andrea Lopez',        '6012223344', 'ventas.co@penguinrandomhouse.com', 'Calle 93 #12-45, Bogota');


-- =====================================================
-- SECCION 8: VISTAS UTILES
-- =====================================================
-- Una VISTA (VIEW) es una consulta SQL guardada con un nombre.
-- Funciona como una "tabla virtual": no almacena datos propios,
-- sino que ejecuta su consulta cada vez que se accede a ella.
-- Las vistas son utiles para:
-- 1. Simplificar consultas complejas (se escriben una vez y se
--    reutilizan con un simple SELECT * FROM nombre_vista).
-- 2. Encapsular logica de negocio en la base de datos.
-- 3. Restringir el acceso a ciertas columnas o filas.

-- Vista: Libros con stock bajo
-- Muestra solo los libros cuyo stock_actual es menor o igual al
-- stock_minimo definido. Esta vista alimenta las alertas del
-- dashboard para que el administrador sepa que libros necesitan
-- reabastecimiento.
-- LEFT JOIN: une las tablas incluso si el libro no tiene autor o
-- categoria asignada (en ese caso esos campos aparecen como NULL).
-- A diferencia de INNER JOIN que excluiria esos registros.
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
ORDER BY l.stock_actual ASC;

-- Vista: Resumen de ventas del dia
-- Calcula estadisticas rapidas de las ventas de hoy: cantidad total,
-- ingresos y promedio por venta. Se usa en el dashboard principal.
-- COALESCE: funcion que devuelve el primer valor no NULL de sus
-- argumentos. Si no hay ventas hoy, SUM y AVG devuelven NULL, pero
-- con COALESCE mostramos 0 en su lugar. Esto evita errores en el
-- frontend al intentar mostrar un valor NULL.
-- CURDATE(): funcion de MySQL que retorna la fecha actual (sin hora).
-- DATE(): extrae solo la parte de fecha de un TIMESTAMP.
CREATE OR REPLACE VIEW v_ventas_hoy AS
SELECT
    COUNT(*) AS total_ventas,
    COALESCE(SUM(total_venta), 0) AS ingresos_totales,
    COALESCE(AVG(total_venta), 0) AS promedio_venta
FROM mdc_ventas
WHERE DATE(fecha_venta) = CURDATE()
    AND estado = 'Completada';

-- Vista: Catalogo completo de libros con estado de stock
-- Muestra todos los libros con su informacion completa y un campo
-- calculado 'estado_stock' que clasifica visualmente cada libro.
-- CASE WHEN: es la estructura condicional de SQL, equivalente a
-- un if-else en programacion. Evaluamos las condiciones en orden:
-- primero si el stock es 0 (Agotado), luego si esta por debajo
-- del minimo (Stock Bajo), y si ninguna se cumple (ELSE), el
-- libro esta Disponible.
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
ORDER BY l.titulo;


-- =====================================================
-- SECCION 9: VERIFICACION DE INSTALACION
-- =====================================================
-- Estas consultas se ejecutan al final del script para confirmar
-- que todo se creo correctamente. Muestran un resumen de las
-- tablas creadas, sus registros y las vistas disponibles.
-- information_schema es una base de datos especial de MySQL que
-- contiene metadatos (informacion sobre la estructura) de todas
-- las bases de datos del servidor.

SELECT '=============================================' AS '';
SELECT '  BASE DE DATOS CREADA EXITOSAMENTE'         AS 'ESTADO';
SELECT '=============================================' AS '';

-- Consultamos information_schema.TABLES para obtener informacion
-- sobre cada tabla: nombre, cantidad aproximada de registros y
-- tamano en KB. TABLE_ROWS es una estimacion de InnoDB, no un
-- conteo exacto, pero es suficiente para verificar la instalacion.
SELECT
    TABLE_NAME  AS 'Tabla',
    TABLE_ROWS  AS 'Registros (aprox)',
    ROUND(DATA_LENGTH / 1024, 2) AS 'Tamano (KB)'
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'inventario_libreria'
ORDER BY TABLE_NAME;

-- Verificamos que las vistas se crearon correctamente consultando
-- information_schema.VIEWS.
SELECT
    TABLE_NAME AS 'Vista'
FROM information_schema.VIEWS
WHERE TABLE_SCHEMA = 'inventario_libreria';


-- =====================================================
-- RECORDATORIO POST-INSTALACION
-- =====================================================
--
-- PASO OBLIGATORIO DESPUES DE EJECUTAR ESTE SCRIPT:
--
-- 1. Navegar al directorio del servidor:
--    cd servidor
--
-- 2. Ejecutar el script de reset de contrasenas:
--    node scripts/reset_password.js
--
-- 3. Esto generara hashes bcrypt validos para:
--    - ldarlys@sena.edu.co  (contrasena: Luzd12345)
--    - michelle@sena.edu.co (contrasena: vendedor123)
--    - cip@sena.edu.co      (contrasena: cip123)
--
-- 4. Iniciar el servidor:
--    npm run dev
--
-- 5. Acceder a la aplicacion:
--    http://localhost:3000
--
-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================
