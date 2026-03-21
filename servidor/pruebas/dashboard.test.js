// =====================================================
// TESTS DEL DASHBOARD (PANEL DE CONTROL)
// =====================================================
// Estas pruebas verifican que el endpoint de estadísticas
// funcione correctamente y respete los permisos.
// Probamos:
//   - Solo administradores pueden ver el dashboard
//   - El dashboard devuelve datos con estructura correcta

const request = require('supertest');

process.env.NODE_ENV = 'test';

const app = require('../app');

const EMAIL_ADMIN       = process.env.TEST_ADMIN_EMAIL       || 'ldarlys@sena.edu.co';
const PASSWORD_ADMIN    = process.env.TEST_ADMIN_PASSWORD    || 'admin123';
const EMAIL_VENDEDOR    = process.env.TEST_VENDEDOR_EMAIL    || 'michelle@sena.edu.co';
const PASSWORD_VENDEDOR = process.env.TEST_VENDEDOR_PASSWORD || 'vendedor123';

describe('Dashboard (Estadísticas)', () => {

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

  test('Debe rechazar dashboard sin token', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  test('Vendedor NO puede ver el dashboard (solo Admin)', async () => {
    if (!tokenVendedor) return;

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${tokenVendedor}`);

    expect(res.status).toBe(403);
  });

  test('Admin puede ver el dashboard con datos correctos', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);

    // Verificamos que el dashboard tenga las secciones principales
    const datos = res.body.datos;
    expect(datos).toHaveProperty('ventas_hoy');
    expect(datos).toHaveProperty('total_libros');
    expect(datos).toHaveProperty('total_clientes');
    expect(datos).toHaveProperty('inventario');
    expect(datos).toHaveProperty('ventas_por_mes');
  });
});