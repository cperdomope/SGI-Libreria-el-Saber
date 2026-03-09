const express = require('express');
const cors    = require('cors');
const path    = require('path');
require('dotenv').config();

// Base de Datos
require('./configuracion/db');

// Importar Rutas
const rutasLibros = require('./rutas/rutasLibros');
const rutasMovimientos = require('./rutas/rutasMovimientos');
const rutasDashboard = require('./rutas/rutasDashboard');
const rutasAuth = require('./rutas/rutasAuth');
const rutasClientes = require('./rutas/clienteRutas');
const rutasVentas = require('./rutas/ventaRutas');
const rutasProveedores = require('./rutas/proveedorRutas');
const rutasAutores = require('./rutas/autorRutas');
const rutasCategorias = require('./rutas/categoriaRutas');
const rutasUsuarios = require('./rutas/usuarioRutas');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const app = express();

// --- CONFIGURACIÓN DE CORS SEGURA ---
// Solo permite requests desde el origen especificado en .env
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true, // Permite envío de cookies y headers de autenticación
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Archivos estáticos ANTES del middleware de Content-Type
// para que las imágenes se sirvan con su MIME type correcto
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.json());

// Middleware para forzar UTF-8 en respuestas de la API
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});
// ---------------------------------------------------

// Usar Rutas (Ahora sí funcionarán porque ya se configuró JSON)
app.use('/api/ventas', rutasVentas);
app.use('/api/libros', rutasLibros);
app.use('/api/movimientos', rutasMovimientos);
app.use('/api/dashboard', rutasDashboard);
app.use('/api/auth', rutasAuth);
app.use('/api/clientes', rutasClientes);
app.use('/api/proveedores', rutasProveedores);
app.use('/api/autores', rutasAutores);
app.use('/api/categorias', rutasCategorias);
app.use('/api/usuarios', rutasUsuarios);

app.get('/', (req, res) => {
    res.send('API del Sistema de Inventario Funcionando 🚀');
});

// ── Manejo de rutas no encontradas (404) ──
// Debe ir DESPUÉS de todas las rutas definidas
app.use(notFoundHandler);

// ── Manejo global de errores ──
// Debe ser el ÚLTIMO middleware (4 parámetros: err, req, res, next)
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});