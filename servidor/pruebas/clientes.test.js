// =====================================================
// PRUEBAS DEL MODULO DE CLIENTES
// =====================================================
// Tests de integracion para los endpoints de clientes.
//
// Que se prueba aqui:
//   1. Que los endpoints rechacen peticiones sin token (401)
//   2. Que un vendedor autenticado pueda listar clientes
//
// Patron de pruebas:
//   - Las pruebas sin BD son "puras": no dependen de MySQL,
//     solo verifican que el middleware de autenticacion funcione.
//   - Las pruebas CON BD (login real) se saltan gracefully
//     si la base de datos no esta disponible.
//
// Herramientas:
//   - Jest: framework de testing (describe, test, expect)
//   - Supertest: permite hacer peticiones HTTP al app de Express
//     sin necesidad de levantar el servidor en un puerto real.

// "Los clientes pueden ser gestionados por Administradores y Vendedores,
//  a diferencia de otros modulos que son exclusivos del Admin.
//  Por eso probamos con credenciales de vendedor: si el vendedor
//  puede acceder, el admin tambien puede (tiene mas permisos)."
// =====================================================

// Supertest: libreria que simula peticiones HTTP contra una app Express
const request = require('supertest');

// Establecemos el entorno como 'test' para que los errores
// no muestren detalles internos y el rate limiter sea mas permisivo
process.env.NODE_ENV = 'test';

// Importamos la app de Express (sin levantar servidor)
// Supertest se encarga de crear un servidor temporal para las pruebas
const app = require('../app');

// Credenciales del vendedor de prueba.
// Se pueden configurar por variables de entorno o usar las de desarrollo.
// Usamos vendedor (no admin) porque clientes es accesible para ambos roles.
const EMAIL_VENDEDOR    = process.env.TEST_VENDEDOR_EMAIL    || 'michelle@sena.edu.co';
const PASSWORD_VENDEDOR = process.env.TEST_VENDEDOR_PASSWORD || 'vendedor123';

// ─────────────────────────────────────────────────────
// SUITE: Modulo de Clientes
// ─────────────────────────────────────────────────────
describe('Módulo de Clientes', () => {

  // ─── TEST 1: GET sin token ───────────────────────
  // El middleware verificarToken debe bloquear la peticion
  // antes de que llegue al controlador.
  test('Debe rechazar listado de clientes sin autenticación', async () => {
    const res = await request(app).get('/api/clientes');
    expect(res.status).toBe(401);
  });

  // ─── TEST 2: POST sin token ──────────────────────
  // Intentamos crear un cliente sin autenticacion.
  // Verificamos que la proteccion aplica a todos los metodos HTTP,
  // no solo a GET.
  test('Debe rechazar crear cliente sin token', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .send({ nombre_completo: 'Test', documento: '123' });
    expect(res.status).toBe(401);
  });

  // ─── TEST 3: Vendedor autenticado puede listar ───
  // Esta prueba requiere conexion a MySQL para hacer login real.
  // Si la BD no esta disponible, el login no devuelve token
  // y la prueba se salta con un console.warn (skip graceful).
  test('Vendedor puede acceder al listado de clientes (requiere BD)', async () => {
    // Paso 1: Login real para obtener un JWT valido
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL_VENDEDOR, password: PASSWORD_VENDEDOR });

    // Si no hay token, la BD no esta disponible — saltamos la prueba
    // sin marcarla como fallida (patron de degradacion graceful)
    if (!loginRes.body.token) {
      console.warn('[Test] BD no disponible — omitiendo prueba de vendedor');
      return;
    }

    // Paso 2: Peticion autenticada con el token en el header Authorization
    // Formato: "Bearer <token>" — estandar JWT
    const res = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${loginRes.body.token}`);

    // Verificamos que el endpoint responde correctamente
    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
  });
});
