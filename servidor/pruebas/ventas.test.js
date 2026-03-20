const request = require('supertest');

process.env.NODE_ENV = 'test';

const app = require('../app');

const EMAIL_ADMIN    = process.env.TEST_ADMIN_EMAIL    || 'ldarlys@sena.edu.co';
const PASSWORD_ADMIN = process.env.TEST_ADMIN_PASSWORD || 'admin123';

describe('Módulo de Ventas', () => {

  let tokenAdmin = null;

  beforeAll(async () => {
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: EMAIL_ADMIN, password: PASSWORD_ADMIN });
      tokenAdmin = res.body.token || null;
    } catch {
      // BD no disponible — las pruebas que lo requieran se omitirán
    }
  });

  test('Debe rechazar listado de ventas sin token JWT', async () => {
    const res = await request(app).get('/api/ventas');
    expect(res.status).toBe(401);
  });

  test('Debe rechazar crear venta sin autenticación', async () => {
    const res = await request(app)
      .post('/api/ventas')
      .send({ cliente_id: 1, total: 50000, items: [{ libro_id: 1, cantidad: 1, precio_unitario: 50000 }] });
    expect(res.status).toBe(401);
  });

  test('Debe rechazar venta sin cliente_id', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ total: 50000, items: [{ libro_id: 1, cantidad: 1, precio_unitario: 50000 }] });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  test('Debe rechazar venta con carrito vacío', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ cliente_id: 1, total: 0, items: [] });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
    expect(res.body.mensaje).toMatch(/datos incompletos/i);
  });

  test('Debe rechazar venta con total manipulado desde el frontend', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .post('/api/ventas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ cliente_id: 1, total: 1, items: [{ libro_id: 1, cantidad: 1, precio_unitario: 50000 }] });

    expect(res.status).toBe(400);
    expect(res.body.codigo).toBe('TOTAL_INVALIDO');
  });
});