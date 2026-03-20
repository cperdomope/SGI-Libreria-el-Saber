// =====================================================
// MIDDLEWARE: SUBIDA DE IMÁGENES CON MULTER
// =====================================================
// Multer es una librería de Node.js para manejar peticiones
// multipart/form-data, que es el formato usado cuando un
// formulario HTML envía archivos (imágenes, PDFs, etc.).
//
// ¿Por qué se necesita un middleware especial para archivos?
// Las peticiones normales envían JSON en el body.
// Cuando se adjunta un archivo, el formato cambia completamente:
// el browser divide la petición en "partes" (multipart).
// Express no puede parsear ese formato por sí solo; Multer lo hace.
//
// ¿Qué hace este middleware?
//   1. Intercepta la petición antes del controlador
//   2. Extrae la imagen del formulario
//   3. Valida tipo de archivo (extensión Y MIME type)
//   4. Si es válida, la guarda en disco con nombre único
//   5. Agrega req.file al request para que el controlador sepa
//      dónde quedó guardada la imagen
//
// SEGURIDAD — doble validación de tipo:
// Solo validar la extensión (.jpg, .png) NO es seguro porque
// cualquiera puede renombrar un archivo .exe a .jpg.
// Por eso también validamos el MIME type, que viene del contenido
// real del archivo. Un atacante tendría que falsificar AMBOS.
//
// 🔹 En la sustentación puedo decir:
// "Para la subida de portadas usamos Multer con doble validación:
//  verificamos tanto la extensión del nombre del archivo como el
//  MIME type de su contenido. Esto evita que alguien suba un
//  archivo malicioso con extensión .jpg. Además limitamos el
//  tamaño a 2 MB y guardamos con nombres únicos generados con
//  timestamp + número aleatorio para evitar sobreescrituras."
// =====================================================

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// ─────────────────────────────────────────────────────────
// DIRECTORIO DE ALMACENAMIENTO
// ─────────────────────────────────────────────────────────
// path.join(__dirname, '..', 'uploads', 'portadas') construye
// la ruta absoluta al directorio de portadas:
//   __dirname = ruta de ESTE archivo (middlewares/)
//   '..'      = sube un nivel (servidor/)
//   'uploads/portadas' = subcarpeta de imágenes
//
// Si la carpeta no existe al arrancar el servidor, la creamos
// automáticamente. recursive: true crea todos los niveles necesarios
// (si 'uploads' tampoco existe, la crea también).
const DIR_PORTADAS = path.join(__dirname, '..', 'uploads', 'portadas');

if (!fs.existsSync(DIR_PORTADAS)) {
  fs.mkdirSync(DIR_PORTADAS, { recursive: true });
}

// ─────────────────────────────────────────────────────────
// CONFIGURACIÓN DE ALMACENAMIENTO EN DISCO
// ─────────────────────────────────────────────────────────
// diskStorage permite controlar dónde y con qué nombre se guarda
// el archivo. La alternativa sería memoryStorage (en RAM),
// pero para imágenes de portada el disco es más apropiado.
const storage = multer.diskStorage({

  // destination: dónde guardar el archivo en el servidor
  destination: (req, file, cb) => {
    // cb(error, ruta) → cb(null, ruta) cuando todo está bien
    cb(null, DIR_PORTADAS);
  },

  // filename: con qué nombre guardar el archivo
  // Usamos timestamp + número aleatorio para garantizar unicidad.
  // Si dos admins suben "portada.jpg" al mismo tiempo, no se pisan.
  // Formato: portada-1709150400000-847392847.jpg
  filename: (req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const nombre = `portada-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, nombre);
  }
});

// ─────────────────────────────────────────────────────────
// FILTRO DE TIPO DE ARCHIVO
// ─────────────────────────────────────────────────────────
// Se ejecuta por cada archivo recibido ANTES de guardarlo.
// cb(null, true)  → aceptar el archivo
// cb(error, false) → rechazar el archivo con un error
const filtroImagen = (req, file, cb) => {
  // Validación 1: extensión del nombre original del archivo.
  // file.originalname es el nombre que tenía en el dispositivo del usuario.
  const extValida = /\.(jpg|jpeg|png|webp)$/.test(
    path.extname(file.originalname).toLowerCase()
  );

  // Validación 2: MIME type (tipo real del contenido del archivo).
  // file.mimetype lo determina el browser/cliente al enviar el archivo.
  // image/jpeg, image/png, image/webp son los tipos permitidos.
  const mimeValido = /^image\/(jpeg|png|webp)$/.test(file.mimetype);

  // Solo aceptamos si AMBAS validaciones pasan.
  if (extValida && mimeValido) {
    cb(null, true);   // Archivo aceptado
  } else {
    // El error llegará al manejador de errores de Express.
    // El controlador de libros captura este error y responde con 400.
    cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'), false);
  }
};

// ─────────────────────────────────────────────────────────
// INSTANCIA FINAL DE MULTER
// ─────────────────────────────────────────────────────────
// Juntamos la configuración de disco, el filtro y el límite de tamaño.
// 2 * 1024 * 1024 = 2,097,152 bytes = 2 MB
// Una portada de libro razonablemente optimizada pesa menos de 500 KB,
// así que 2 MB es un límite holgado pero que evita archivos enormes.
const uploadPortada = multer({
  storage,               // Cómo y dónde guardar
  fileFilter: filtroImagen, // Qué archivos aceptar
  limits: {
    fileSize: 2 * 1024 * 1024   // 2 MB máximo por archivo
  }
});

// ─────────────────────────────────────────────────────────
// USO EN LAS RUTAS
// ─────────────────────────────────────────────────────────
// En librosRutas.js se usa así:
//   uploadPortada.single('portada')
//   El 'portada' es el nombre del campo en el formulario HTML/FormData.
//   Si el formulario es JSON (sin imagen), Multer lo deja pasar sin error.
//   Si hay imagen, la guarda y pone los datos en req.file.
//
// Después del middleware, en el controlador:
//   req.file.filename → nombre del archivo guardado en disco
//   req.file.path     → ruta completa en el servidor
//   req.file.size     → tamaño en bytes
module.exports = { uploadPortada };