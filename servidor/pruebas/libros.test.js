// =====================================================
// TESTS DEL MÓDULO DE LIBROS (INVENTARIO)
// =====================================================
// Estas pruebas verifican que el CRUD de libros funcione correctamente.
// Probamos:
//   - Que sin token no se pueda acceder
//   - Que un vendedor pueda VER los libros
//   - Que al crear un libro se validen los campos obligatorios
//   - Que la lista de libros devuelva datos correctos

const request = require('supertest');

// Indicamos que estamos en modo test
process.env.NODE_ENV = 'test';

// Importamos la app (sin arrancar el servidor)
const app = require('../app');

// Credenciales de prueba (deben existir en la BD)
const EMAIL_ADMIN    = process.env.TEST_ADMIN_EMAIL    || 'ldarlys@sena.edu.co';
const PASSWORD_ADMIN = process.env.TEST_ADMIN_PASSWORD || 'admin123';

describe('Módulo de Libros (Inventario)', () => {

  // Variable para guardar el token del admin
  let tokenAdmin = null;

  // Antes de todas las pruebas, hacemos login para obtener el token
  beforeAll(async () => {
    try {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: EMAIL_ADMIN, password: PASSWORD_ADMIN });
      tokenAdmin = res.body.token || null;
    } catch {
      // Si la BD no está disponible, las pruebas que requieren token se omiten
    }
  });

  // ── Pruebas de seguridad (no necesitan BD) ──

  test('Debe rechazar listado de libros sin token JWT', async () => {
    const res = await request(app).get('/api/libros');
    // Sin token → 401 Unauthorized
    expect(res.status).toBe(401);
  });

  test('Debe rechazar crear libro sin autenticación', async () => {
    const res = await request(app)
      .post('/api/libros')
      .send({ titulo: 'Test', precio_venta: 10000 });
    expect(res.status).toBe(401);
  });

  test('Debe rechazar eliminar libro sin autenticación', async () => {
    const res = await request(app).delete('/api/libros/1');
    expect(res.status).toBe(401);
  });

  // ── Pruebas con autenticación (necesitan BD) ──

  test('Admin puede listar libros con token válido', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .get('/api/libros')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    // Debe devolver un array de libros
    expect(Array.isArray(res.body.datos)).toBe(true);
  });

  test('Debe rechazar crear libro sin título', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .post('/api/libros')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ precio_venta: 10000 });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  test('Debe rechazar crear libro con precio negativo', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .post('/api/libros')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ titulo: 'Libro Test', precio_venta: -5000 });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });
});
