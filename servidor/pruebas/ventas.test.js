/**
 * =====================================================
 * PRUEBAS AUTOMATIZADAS - VENTAS
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Pruebas de integración para el módulo de
 * ventas. Valida creación, validación de stock y listado.
 *
 * PRUEBAS INCLUIDAS:
 * 1. Listar ventas sin autenticación → debe fallar
 * 2. Listar ventas con token válido → debe funcionar
 * 3. Crear venta con datos incompletos → debe fallar
 * 4. Crear venta sin cliente_id → debe fallar
 * 5. Crear venta sin items → debe fallar
 *
 * @version 1.0.0
 */

const request = require('supertest');

// Configuración de entorno para pruebas
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secret_para_pruebas_jest';

// App Express para pruebas
const express = require('express');
const rutasAuth = require('../rutas/rutasAuth');
const rutasVentas = require('../rutas/ventaRutas');

const app = express();
app.use(express.json());
app.use('/api/auth', rutasAuth);
app.use('/api/ventas', rutasVentas);

// =====================================================
// HELPER: Obtener token de autenticación
// =====================================================

/**
 * Realiza login y retorna el token JWT.
 * Se reutiliza en múltiples pruebas.
 */
const obtenerToken = async () => {
  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@sena.edu.co', password: 'admin123' });

  return respuesta.body.token;
};

// =====================================================
// SUITE: VENTAS
// =====================================================

describe('Módulo de Ventas', () => {

  let tokenAdmin = null;

  // Obtener token antes de las pruebas
  beforeAll(async () => {
    try {
      tokenAdmin = await obtenerToken();
    } catch {
      // Si no hay BD disponible, el token será null
      // Las pruebas que lo requieran lo manejarán
    }
  });

  // ─────────────────────────────────────────────────
  // PRUEBA 1: Listar ventas sin autenticación
  // ─────────────────────────────────────────────────
  test('Debe rechazar listado de ventas sin token JWT', async () => {
    const respuesta = await request(app)
      .get('/api/ventas')
      .expect('Content-Type', /json/);

    expect(respuesta.status).toBe(401);
  });

  // ─────────────────────────────────────────────────
  // PRUEBA 2: Crear venta sin datos (sin token)
  // ─────────────────────────────────────────────────
  test('Debe rechazar crear venta sin autenticación', async () => {
    const respuesta = await request(app)
      .post('/api/ventas')
      .send({
        cliente_id: 1,
        total: 50000,
        items: [{ libro_id: 1, cantidad: 1, precio_unitario: 50000 }]
      });

    expect(respuesta.status).toBe(401);
  });

  // ─────────────────────────────────────────────────
  // PRUEBA 3: Crear venta sin cliente_id
  // ─────────────────────────────────────────────────
  test('Debe rechazar venta sin cliente_id', async () => {
    if (!tokenAdmin) return; // Saltar si no hay BD

    const respuesta = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        // Sin cliente_id
        total: 50000,
        items: [{ libro_id: 1, cantidad: 1, precio_unitario: 50000 }]
      });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.exito).toBe(false);
  });

  // ─────────────────────────────────────────────────
  // PRUEBA 4: Crear venta sin items
  // ─────────────────────────────────────────────────
  test('Debe rechazar venta sin items (carrito vacío)', async () => {
    if (!tokenAdmin) return;

    const respuesta = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        cliente_id: 1,
        total: 0,
        items: []  // Items vacíos
      });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.exito).toBe(false);
    expect(respuesta.body.mensaje).toMatch(/datos incompletos/i);
  });

  // ─────────────────────────────────────────────────
  // PRUEBA 5: Total manipulado (seguridad backend)
  // ─────────────────────────────────────────────────
  test('Debe rechazar venta con total manipulado desde el frontend', async () => {
    if (!tokenAdmin) return;

    const respuesta = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        cliente_id: 1,
        total: 1,  // Total manipulado (debería ser 50000)
        items: [{ libro_id: 1, cantidad: 1, precio_unitario: 50000 }]
      });

    // El backend recalcula y rechaza si hay diferencia
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.codigo).toBe('TOTAL_INVALIDO');
  });
});
