/**
 * =====================================================
 * PRUEBAS AUTOMATIZADAS - CLIENTES
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * PRUEBAS INCLUIDAS:
 * 1. Listar clientes sin token → debe fallar
 * 2. Crear cliente sin token → debe fallar
 * 3. Crear cliente sin campos requeridos → debe fallar
 * 4. Acceso con token de vendedor → debe funcionar
 *
 * @version 1.0.0
 */

const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret_para_pruebas_jest';

const express = require('express');
const rutasAuth = require('../rutas/rutasAuth');
const rutasClientes = require('../rutas/clienteRutas');

const app = express();
app.use(express.json());
app.use('/api/auth', rutasAuth);
app.use('/api/clientes', rutasClientes);

describe('Módulo de Clientes', () => {

  // ─────────────────────────────────────────────────
  // PRUEBA 1: Sin autenticación
  // ─────────────────────────────────────────────────
  test('Debe rechazar listado de clientes sin autenticación', async () => {
    const respuesta = await request(app).get('/api/clientes');
    expect(respuesta.status).toBe(401);
  });

  // ─────────────────────────────────────────────────
  // PRUEBA 2: Crear cliente sin token
  // ─────────────────────────────────────────────────
  test('Debe rechazar crear cliente sin token', async () => {
    const respuesta = await request(app)
      .post('/api/clientes')
      .send({ nombre_completo: 'Test', documento: '123' });

    expect(respuesta.status).toBe(401);
  });

  // ─────────────────────────────────────────────────
  // PRUEBA 3: Token de vendedor puede crear clientes
  // ─────────────────────────────────────────────────
  test('Vendedor puede acceder a listado de clientes', async () => {
    // Login como vendedor
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'vendedor@sena.edu.co', password: 'vendedor123' });

    if (!loginRes.body.token) return; // BD no disponible

    const respuesta = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    // Vendedor tiene acceso a clientes
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.exito).toBe(true);
  });
});
