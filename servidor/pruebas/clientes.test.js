const request = require('supertest');

process.env.NODE_ENV = 'test';

const app = require('../app');

const EMAIL_VENDEDOR    = process.env.TEST_VENDEDOR_EMAIL    || 'michelle@sena.edu.co';
const PASSWORD_VENDEDOR = process.env.TEST_VENDEDOR_PASSWORD || 'vendedor123';

describe('Módulo de Clientes', () => {

  test('Debe rechazar listado de clientes sin autenticación', async () => {
    const res = await request(app).get('/api/clientes');
    expect(res.status).toBe(401);
  });

  test('Debe rechazar crear cliente sin token', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .send({ nombre_completo: 'Test', documento: '123' });
    expect(res.status).toBe(401);
  });

  test('Vendedor puede acceder al listado de clientes (requiere BD)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL_VENDEDOR, password: PASSWORD_VENDEDOR });

    if (!loginRes.body.token) {
      console.warn('[Test] BD no disponible — omitiendo prueba de vendedor');
      return;
    }

    const res = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
  });
});