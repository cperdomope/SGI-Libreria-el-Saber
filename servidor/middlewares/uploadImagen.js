/**
 * =====================================================
 * MIDDLEWARE DE SUBIDA DE IMÁGENES (MULTER)
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Configura multer para la subida de portadas
 * de libros. Almacena las imágenes en disco con nombres
 * únicos para evitar colisiones.
 *
 * SEGURIDAD:
 * - Solo acepta JPG, PNG y WEBP
 * - Máximo 2 MB por archivo
 * - Valida tanto extensión como MIME type
 * - El directorio se crea automáticamente si no existe
 *
 * @author Equipo de Desarrollo SGI
 * @version 1.0.0
 */

const multer = require('multer');
const path   = require('path');
const fs     = require('fs');

// =====================================================
// DIRECTORIO DE ALMACENAMIENTO
// =====================================================

const DIR_PORTADAS = path.join(__dirname, '..', 'uploads', 'portadas');

// Crear la carpeta automáticamente si no existe
if (!fs.existsSync(DIR_PORTADAS)) {
  fs.mkdirSync(DIR_PORTADAS, { recursive: true });
}

// =====================================================
// CONFIGURACIÓN DE DISCO
// =====================================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, DIR_PORTADAS);
  },
  filename: (req, file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const nombre = `portada-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, nombre);
  }
});

// =====================================================
// FILTRO DE TIPO DE ARCHIVO
// Valida extensión Y mime type para mayor seguridad
// =====================================================

const filtroImagen = (req, file, cb) => {
  const extValida  = /\.(jpg|jpeg|png|webp)$/.test(
    path.extname(file.originalname).toLowerCase()
  );
  const mimeValido = /^image\/(jpeg|png|webp)$/.test(file.mimetype);

  if (extValida && mimeValido) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP'), false);
  }
};

// =====================================================
// INSTANCIA DE MULTER
// =====================================================

const uploadPortada = multer({
  storage,
  fileFilter: filtroImagen,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2 MB máximo
  }
});

module.exports = { uploadPortada };
