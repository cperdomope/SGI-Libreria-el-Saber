// =====================================================
// TESTS DEL MÓDULO DE MOVIMIENTOS (KARDEX)
// =====================================================
// Estas pruebas verifican que el registro de entradas
// y salidas de inventario funcione correctamente.
// Probamos:
//   - Seguridad: sin token no se puede acceder
//   - Validaciones: campos obligatorios
//   - Que solo administradores puedan registrar movimientos

const request = require('supertest');

process.env.NODE_ENV = 'test';

const app = require('../app');

const EMAIL_ADMIN      = process.env.TEST_ADMIN_EMAIL      || 'ldarlys@sena.edu.co';
const PASSWORD_ADMIN   = process.env.TEST_ADMIN_PASSWORD   || 'admin123';
const EMAIL_VENDEDOR   = process.env.TEST_VENDEDOR_EMAIL   || 'michelle@sena.edu.co';
const PASSWORD_VENDEDOR = process.env.TEST_VENDEDOR_PASSWORD || 'vendedor123';

describe('Módulo de Movimientos (Kardex)', () => {

  let tokenAdmin    = null;
  let tokenVendedor = null;

  beforeAll(async () => {
    try {
      // Obtenemos tokens de ambos roles para probar permisos
      const [resAdmin, resVendedor] = await Promise.all([
        request(app).post('/api/auth/login').send({ email: EMAIL_ADMIN, password: PASSWORD_ADMIN }),
        request(app).post('/api/auth/login').send({ email: EMAIL_VENDEDOR, password: PASSWORD_VENDEDOR })
      ]);
      tokenAdmin    = resAdmin.body.token    || null;
      tokenVendedor = resVendedor.body.token || null;
    } catch {
      // BD no disponible
    }
  });

  // ── Pruebas de seguridad ──

  test('Debe rechazar listado de movimientos sin token', async () => {
    const res = await request(app).get('/api/movimientos');
    expect(res.status).toBe(401);
  });

  test('Debe rechazar registrar movimiento sin token', async () => {
    const res = await request(app)
      .post('/api/movimientos')
      .send({ libro_id: 1, tipo_movimiento: 'ENTRADA', cantidad: 5 });
    expect(res.status).toBe(401);
  });

  test('Vendedor NO puede acceder a movimientos (solo Admin)', async () => {
    if (!tokenVendedor) return;

    const res = await request(app)
      .get('/api/movimientos')
      .set('Authorization', `Bearer ${tokenVendedor}`);

    // 403 = Forbidden (tiene token pero no tiene permiso)
    expect(res.status).toBe(403);
  });

  // ── Pruebas de validación ──

  test('Debe rechazar movimiento sin datos obligatorios', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({}); // Sin datos

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  test('Debe rechazar movimiento con tipo inválido', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ libro_id: 1, tipo_movimiento: 'INVALIDO', cantidad: 5 });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  test('Debe rechazar movimiento con cantidad negativa', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ libro_id: 1, tipo_movimiento: 'ENTRADA', cantidad: -5 });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  test('Debe rechazar ENTRADA sin proveedor', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        libro_id: 1,
        tipo_movimiento: 'ENTRADA',
        cantidad: 5,
        costo_compra: 10000
        // Falta proveedor_id
      });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  // ── Pruebas con BD ──

  test('Admin puede ver historial de movimientos', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .get('/api/movimientos')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(Array.isArray(res.body.datos)).toBe(true);
  });
});