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
// MODO DE ALMACENAMIENTO: CLOUDINARY o DISCO LOCAL
// ─────────────────────────────────────────────────────────
// Si las tres variables de Cloudinary están en el .env,
// las imágenes se suben directo a la nube (Cloudinary).
// Si no están configuradas, se guardan en disco local
// (comportamiento original — retrocompatibilidad).
const usarCloudinary = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY    &&
  process.env.CLOUDINARY_API_SECRET
);

let storage;

if (usarCloudinary) {
  // ── MODO NUBE: Cloudinary ──
  // multer-storage-cloudinary conecta Multer directamente con Cloudinary.
  // El archivo nunca toca el disco del servidor: va de la memoria RAM
  // del proceso directo a Cloudinary mediante su API.
  // req.file.path    → URL pública segura (https://res.cloudinary.com/...)
  // req.file.filename → public_id asignado por Cloudinary (para borrar después)
  const cloudinary = require('cloudinary').v2;
  const { CloudinaryStorage } = require('multer-storage-cloudinary');

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });

  storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder:          'sgi_portadas',   // Carpeta dentro de tu cuenta Cloudinary
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      // Redimensiona al subir: max 400×600 px sin distorsionar
      transformation: [{ width: 400, height: 600, crop: 'limit' }]
    }
  });

} else {
  // ── MODO LOCAL: disco del servidor (comportamiento original) ──
  const DIR_PORTADAS = path.join(__dirname, '..', 'uploads', 'portadas');
  if (!fs.existsSync(DIR_PORTADAS)) {
    fs.mkdirSync(DIR_PORTADAS, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, DIR_PORTADAS),
    filename: (req, file, cb) => {
      const ext    = path.extname(file.originalname).toLowerCase();
      const nombre = `portada-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, nombre);
    }
  });
}

// ─────────────────────────────────────────────────────────
// FILTRO DE TIPO DE ARCHIVO (aplica para ambos modos)
// ─────────────────────────────────────────────────────────
const filtroImagen = (req, file, cb) => {
  const extValida  = /\.(jpg|jpeg|png|webp)$/.test(path.extname(file.originalname).toLowerCase());
  const mimeValido = /^image\/(jpeg|png|webp)$/.test(file.mimetype);
  if (extValida && mimeValido) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'), false);
  }
};

// ─────────────────────────────────────────────────────────
// INSTANCIA FINAL DE MULTER
// ─────────────────────────────────────────────────────────
const uploadPortada = multer({
  storage,
  fileFilter: filtroImagen,
  limits: { fileSize: 2 * 1024 * 1024 }  // 2 MB máximo
});

// usarCloudinary se exporta para que librosControlador sepa
// si guardar el filename (local) o la URL completa (Cloudinary).
module.exports = { uploadPortada, usarCloudinary };