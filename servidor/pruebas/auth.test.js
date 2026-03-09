/**
 * =====================================================
 * PRUEBAS AUTOMATIZADAS - AUTENTICACIÓN
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Pruebas de integración para el módulo de
 * autenticación usando Jest + Supertest.
 *
 * PRUEBAS INCLUIDAS:
 * 1. Login exitoso con credenciales válidas
 * 2. Login fallido con contraseña incorrecta
 * 3. Login fallido sin email
 * 4. Login fallido sin contraseña
 * 5. Acceso a ruta protegida sin token
 *
 * Para ejecutar: npm test
 *
 * @requires supertest - HTTP assertions
 * @requires express app - Servidor Express
 */

const request = require('supertest');

// =====================================================
// CONFIGURACIÓN DE LA APP PARA PRUEBAS
// =====================================================

// Cargamos variables de entorno de prueba
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret_para_pruebas_jest';

// Importamos la app Express sin iniciar el servidor
// (el servidor se inicia en index.js, la app se usa aquí directamente)
const express = require('express');
const cors = require('cors');
const rutasAuth = require('../rutas/rutasAuth');
const rutasLibros = require('../rutas/rutasLibros');

// Crear instancia de Express solo para pruebas
const app = express();
app.use(express.json());
app.use('/api/auth', rutasAuth);
app.use('/api/libros', rutasLibros);

// =====================================================
// CREDENCIALES DE PRUEBA
// (Deben existir en la base de datos)
// =====================================================

const CREDENCIALES_ADMIN = {
  email: 'admin@sena.edu.co',
  password: 'admin123'
};

const CREDENCIALES_INVALIDAS = {
  email: 'admin@sena.edu.co',
  password: 'contraseña_incorrecta'
};

// =====================================================
// SUITE: AUTENTICACIÓN
// =====================================================

describe('Módulo de Autenticación', () => {

  // ─────────────────────────────────────────────────
  // PRUEBA 1: Login exitoso
  // ─────────────────────────────────────────────────
  test('Debe hacer login exitosamente con credenciales válidas', async () => {
    const respuesta = await request(app)
      .post('/api/auth/login')
      .send(CREDENCIALES_ADMIN)
      .expect('Content-Type', /json/);

    // Verificar código HTTP 200
    expect(respuesta.status).toBe(200);

    // Verificar estructura de la respuesta
    expect(respuesta.body).toHaveProperty('exito', true);
    expect(respuesta.body).toHaveProperty('token');
    expect(respuesta.body).toHaveProperty('usuario');

    // Verificar datos del usuario
    expect(respuesta.body.usuario).toHaveProperty('id');
    expect(respuesta.body.usuario).toHaveProperty('email');
    expect(respuesta.body.usuario).toHaveProperty('rol_id');

    // Verificar que el token es un string no vacío
    expect(typeof respuesta.body.token).toBe('string');
    expect(respuesta.body.token.length).toBeGreaterThan(10);
  });

  // ─────────────────────────────────────────────────
  // PRUEBA 2: Login con contraseña incorrecta
  // ─────────────────────────────────────────────────
  test('Debe rechazar login con contraseña incorrecta', async () => {
    const respuesta = await request(app)
      .post('/api/auth/login')
      .send(CREDENCIALES_INVALIDAS)
      .expect('Content-Type', /json/);

    // Verificar código HTTP 401 (No autorizado)
    expect(respuesta.status).toBe(401);
    expect(respuesta.body).toHaveProperty('exito', false);
  });

  // ─────────────────────────────────────────────────
  // PRUEBA 3: Login sin email
  // ─────────────────────────────────────────────────
  test('Debe rechazar login cuando falta el email', async () => {
    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ password: 'admin123' })
      .expect('Content-Type', /json/);

    // Verificar código HTTP 400 (Bad Request)
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.exito).toBe(false);
  });

  // ─────────────────────────────────────────────────
  // PRUEBA 4: Login sin contraseña
  // ─────────────────────────────────────────────────
  test('Debe rechazar login cuando falta la contraseña', async () => {
    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@sena.edu.co' })
      .expect('Content-Type', /json/);

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.exito).toBe(false);
  });

  // ─────────────────────────────────────────────────
  // PRUEBA 5: Acceso a ruta protegida sin token
  // ─────────────────────────────────────────────────
  test('Debe rechazar acceso a ruta protegida sin token JWT', async () => {
    const respuesta = await request(app)
      .get('/api/libros')
      .expect('Content-Type', /json/);

    // Verificar código HTTP 401 (No autorizado)
    expect(respuesta.status).toBe(401);
  });
});
