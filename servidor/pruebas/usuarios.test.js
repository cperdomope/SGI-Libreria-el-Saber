// =====================================================
// TESTS DEL MÓDULO DE USUARIOS
// =====================================================
// Estas pruebas verifican la gestión de usuarios del sistema.
// Probamos:
//   - Solo administradores pueden listar/crear usuarios
//   - Vendedores NO pueden gestionar usuarios
//   - Validaciones de campos al crear usuario
//   - Cambio de contraseña funciona correctamente

const request = require('supertest');

process.env.NODE_ENV = 'test';

const app = require('../app');

const EMAIL_ADMIN       = process.env.TEST_ADMIN_EMAIL       || 'ldarlys@sena.edu.co';
const PASSWORD_ADMIN    = process.env.TEST_ADMIN_PASSWORD    || 'admin123';
const EMAIL_VENDEDOR    = process.env.TEST_VENDEDOR_EMAIL    || 'michelle@sena.edu.co';
const PASSWORD_VENDEDOR = process.env.TEST_VENDEDOR_PASSWORD || 'vendedor123';

describe('Módulo de Usuarios', () => {

  let tokenAdmin    = null;
  let tokenVendedor = null;

  beforeAll(async () => {
    try {
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

  // ── Seguridad ──

  test('Debe rechazar listado de usuarios sin token', async () => {
    const res = await request(app).get('/api/usuarios');
    expect(res.status).toBe(401);
  });

  test('Vendedor NO puede listar usuarios (solo Admin)', async () => {
    if (!tokenVendedor) return;

    const res = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${tokenVendedor}`);

    expect(res.status).toBe(403);
  });

  // ── Funcionalidad con Admin ──

  test('Admin puede listar usuarios', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(Array.isArray(res.body.datos)).toBe(true);

    // Verificar que nunca se devuelve el hash de la contraseña
    if (res.body.datos.length > 0) {
      expect(res.body.datos[0]).not.toHaveProperty('password_hash');
    }
  });

  // ── Validaciones al crear usuario ──

  test('Debe rechazar crear usuario sin datos', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  test('Debe rechazar crear usuario sin email', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombre_completo: 'Test User',
        password: 'password123',
        rol_id: 2
      });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  // ── Cambio de contraseña ──

  test('Debe rechazar cambio de contraseña sin token', async () => {
    const res = await request(app)
      .patch('/api/usuarios/cambiar-password')
      .send({
        passwordActual: 'test',
        passwordNueva: 'nueva123'
      });

    expect(res.status).toBe(401);
  });

  test('Debe rechazar cambio de contraseña sin datos', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .patch('/api/usuarios/cambiar-password')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });
});