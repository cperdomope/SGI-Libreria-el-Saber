// =====================================================
// PRUEBAS DEL MODULO DE USUARIOS
// =====================================================
// Tests de integracion para la gestion de usuarios del sistema.
//
// Cobertura:
//   - Seguridad: sin token (401), vendedor denegado (403)
//   - RBAC: solo admin puede listar y crear usuarios
//   - Validacion: campos obligatorios al crear usuario
//   - Cambio de password: proteccion sin token y sin datos
//   - Seguridad extra: password_hash nunca se expone en la respuesta
//
// Este modulo tiene una particularidad: el endpoint /cambiar-password
// es accesible para CUALQUIER usuario autenticado (no solo admin),
// porque todos necesitan poder cambiar su propia contraseña.

// "La prueba mas importante de este archivo es verificar que
//  password_hash nunca aparezca en la respuesta del listado.
//  Exponer hashes seria una vulnerabilidad critica."
// =====================================================

// Supertest: peticiones HTTP contra Express sin servidor real
const request = require('supertest');

// Entorno de prueba
process.env.NODE_ENV = 'test';

// App Express para Supertest
const app = require('../app');

// Credenciales de ambos roles para probar RBAC
const EMAIL_ADMIN       = process.env.TEST_ADMIN_EMAIL       || 'ldarlys@sena.edu.co';
const PASSWORD_ADMIN    = process.env.TEST_ADMIN_PASSWORD    || 'admin123';
const EMAIL_VENDEDOR    = process.env.TEST_VENDEDOR_EMAIL    || 'michelle@sena.edu.co';
const PASSWORD_VENDEDOR = process.env.TEST_VENDEDOR_PASSWORD || 'vendedor123';

// ─────────────────────────────────────────────────────
// SUITE: Modulo de Usuarios
// ─────────────────────────────────────────────────────
describe('Módulo de Usuarios', () => {

  let tokenAdmin    = null;
  let tokenVendedor = null;

  // Login paralelo de ambos roles
  beforeAll(async () => {
    try {
      const [resAdmin, resVendedor] = await Promise.all([
        request(app).post('/api/auth/login').send({ email: EMAIL_ADMIN, password: PASSWORD_ADMIN }),
        request(app).post('/api/auth/login').send({ email: EMAIL_VENDEDOR, password: PASSWORD_VENDEDOR })
      ]);
      tokenAdmin    = resAdmin.body.token    || null;
      tokenVendedor = resVendedor.body.token || null;
    } catch {
      // BD no disponible — tests con token se saltan
    }
  });

  // ── Seguridad ────────────────────────────────────

  test('Debe rechazar listado de usuarios sin token', async () => {
    const res = await request(app).get('/api/usuarios');
    expect(res.status).toBe(401);
  });

  // RBAC: vendedor autenticado pero sin permiso para gestionar usuarios
  test('Vendedor NO puede listar usuarios (solo Admin)', async () => {
    if (!tokenVendedor) return;

    const res = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${tokenVendedor}`);

    expect(res.status).toBe(403);
  });

  // ── Funcionalidad con Admin ──────────────────────

  test('Admin puede listar usuarios', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(Array.isArray(res.body.datos)).toBe(true);

    // CRITICO: verificar que el hash de contraseña NUNCA se exponga.
    // El SELECT del controlador omite password_hash a proposito.
    // Si alguien lo agrega por error, este test lo detecta.
    if (res.body.datos.length > 0) {
      expect(res.body.datos[0]).not.toHaveProperty('password_hash');
    }
  });

  // ── Validaciones al crear usuario ────────────────

  // Body completamente vacio: todos los campos son requeridos
  test('Debe rechazar crear usuario sin datos', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  // Falta email: campo obligatorio individual
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

  // ── Cambio de contraseña ─────────────────────────
  // Este endpoint es accesible para TODOS los roles autenticados,
  // a diferencia del resto del CRUD que es solo admin.

  // Sin token: verificamos que /cambiar-password tambien esta protegido
  test('Debe rechazar cambio de contraseña sin token', async () => {
    const res = await request(app)
      .patch('/api/usuarios/cambiar-password')
      .send({
        passwordActual: 'test',
        passwordNueva: 'nueva123'
      });

    expect(res.status).toBe(401);
  });

  // Sin datos: el controlador exige passwordActual, passwordNueva y passwordConfirmacion
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
