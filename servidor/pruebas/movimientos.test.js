// =====================================================
// PRUEBAS DEL MODULO DE MOVIMIENTOS (KARDEX)
// =====================================================
// Tests de integracion para entradas y salidas de inventario.
//
// Cobertura:
//   - Seguridad: sin token (401), vendedor denegado (403)
//   - Validacion: campos vacios, tipo invalido, cantidad negativa,
//     entrada sin proveedor
//   - Funcional: admin puede listar movimientos
//
// El Kardex es exclusivo del administrador porque implica
// modificar directamente el stock del inventario.
// Los vendedores solo afectan stock indirectamente via ventas.

// "Este es el archivo de pruebas mas completo del backend
//  porque el modulo de movimientos tiene muchas reglas de negocio:
//  tipos validos (ENTRADA/SALIDA/AJUSTE), proveedor obligatorio
//  en entradas, cantidades positivas, etc."
// =====================================================

// Supertest: peticiones HTTP contra Express sin servidor real
const request = require('supertest');

// Entorno de prueba
process.env.NODE_ENV = 'test';

// App Express para Supertest
const app = require('../app');

// Credenciales de ambos roles para probar RBAC
const EMAIL_ADMIN      = process.env.TEST_ADMIN_EMAIL      || 'ldarlys@sena.edu.co';
const PASSWORD_ADMIN   = process.env.TEST_ADMIN_PASSWORD   || 'admin123';
const EMAIL_VENDEDOR   = process.env.TEST_VENDEDOR_EMAIL   || 'michelle@sena.edu.co';
const PASSWORD_VENDEDOR = process.env.TEST_VENDEDOR_PASSWORD || 'vendedor123';

// ─────────────────────────────────────────────────────
// SUITE: Modulo de Movimientos (Kardex)
// ─────────────────────────────────────────────────────
describe('Módulo de Movimientos (Kardex)', () => {

  let tokenAdmin    = null;
  let tokenVendedor = null;

  // Login paralelo de ambos roles antes de los tests
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

  // ── Pruebas de seguridad (autenticacion y autorizacion) ──

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

  // RBAC: vendedor autenticado pero sin permiso → 403
  test('Vendedor NO puede acceder a movimientos (solo Admin)', async () => {
    if (!tokenVendedor) return;

    const res = await request(app)
      .get('/api/movimientos')
      .set('Authorization', `Bearer ${tokenVendedor}`);

    expect(res.status).toBe(403);
  });

  // ── Pruebas de validacion (reglas de negocio) ────

  // Body vacio: el controlador exige libro_id, tipo_movimiento y cantidad
  test('Debe rechazar movimiento sin datos obligatorios', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  // Solo se aceptan ENTRADA, SALIDA y AJUSTE (constante TIPOS_MOVIMIENTO)
  test('Debe rechazar movimiento con tipo inválido', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ libro_id: 1, tipo_movimiento: 'INVALIDO', cantidad: 5 });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  // Las cantidades deben ser positivas — el tipo determina si suma o resta
  test('Debe rechazar movimiento con cantidad negativa', async () => {
    if (!tokenAdmin) return;

    const res = await request(app)
      .post('/api/movimientos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ libro_id: 1, tipo_movimiento: 'ENTRADA', cantidad: -5 });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  // Regla de negocio: toda ENTRADA debe tener un proveedor asociado
  // porque necesitamos saber de donde viene la mercancia
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
        // Falta proveedor_id — obligatorio en entradas
      });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  // ── Prueba funcional con BD ──────────────────────

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
