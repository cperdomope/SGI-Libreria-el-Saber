// =====================================================
// PRUEBAS DEL DASHBOARD (PANEL DE CONTROL)
// =====================================================
// Tests de integracion para el endpoint de estadisticas.
//
// Que se prueba aqui:
//   1. Que sin token se rechace con 401 (no autenticado)
//   2. Que un vendedor reciba 403 (no autorizado — solo Admin)
//   3. Que un admin reciba 200 con la estructura de datos esperada
//
// Estos tests validan RBAC (Control de Acceso Basado en Roles):
//   - 401 = "No se quien eres" (falta autenticacion)
//   - 403 = "Se quien eres, pero no tienes permiso" (falta autorizacion)
//
// Patron de beforeAll:
//   Hacemos login de ambos roles EN PARALELO con Promise.all()
//   antes de ejecutar los tests. Si la BD no esta disponible,
//   los tokens quedan en null y las pruebas que los necesitan
//   se saltan con return (skip graceful).

// "El dashboard es exclusivo del administrador porque muestra
//  informacion sensible del negocio: ventas totales, ingresos,
//  stock critico, etc. Los vendedores solo necesitan acceso
//  a ventas, clientes e inventario."
// =====================================================

// Supertest: simula peticiones HTTP contra Express sin levantar servidor
const request = require('supertest');

// Entorno de prueba: desactiva logs de error detallados
// y puede afectar el comportamiento del rate limiter
process.env.NODE_ENV = 'test';

// Importamos la app Express (Supertest la maneja internamente)
const app = require('../app');

// Credenciales de prueba para ambos roles.
// Configurables por variables de entorno para CI/CD.
const EMAIL_ADMIN       = process.env.TEST_ADMIN_EMAIL       || 'ldarlys@sena.edu.co';
const PASSWORD_ADMIN    = process.env.TEST_ADMIN_PASSWORD    || 'admin123';
const EMAIL_VENDEDOR    = process.env.TEST_VENDEDOR_EMAIL    || 'michelle@sena.edu.co';
const PASSWORD_VENDEDOR = process.env.TEST_VENDEDOR_PASSWORD || 'vendedor123';

// ─────────────────────────────────────────────────────
// SUITE: Dashboard (Estadisticas)
// ─────────────────────────────────────────────────────
describe('Dashboard (Estadísticas)', () => {

  // Tokens para cada rol — se obtienen en beforeAll
  // Inicializamos en null para detectar si la BD no esta disponible
  let tokenAdmin    = null;
  let tokenVendedor = null;

  // ─── SETUP: Login paralelo de ambos roles ────────
  // beforeAll se ejecuta UNA vez antes de todos los tests del describe.
  // Usamos Promise.all() para hacer ambos logins simultaneamente,
  // reduciendo el tiempo de setup a la mitad.
  beforeAll(async () => {
    try {
      const [resAdmin, resVendedor] = await Promise.all([
        request(app).post('/api/auth/login').send({ email: EMAIL_ADMIN, password: PASSWORD_ADMIN }),
        request(app).post('/api/auth/login').send({ email: EMAIL_VENDEDOR, password: PASSWORD_VENDEDOR })
      ]);

      // Guardamos los tokens — si la BD fallo, quedan en null
      // El operador || null asegura que undefined se convierta en null
      tokenAdmin    = resAdmin.body.token    || null;
      tokenVendedor = resVendedor.body.token || null;
    } catch {
      // Si la BD no esta disponible, los tokens quedan null
      // y los tests que dependen de ellos se saltan gracefully
    }
  });

  // ─── TEST 1: Sin token → 401 ────────────────────
  // Esta prueba es "pura": no depende de BD ni de tokens.
  // Verifica que verificarToken bloquee peticiones anonimas.
  test('Debe rechazar dashboard sin token', async () => {
    const res = await request(app).get('/api/dashboard');
    expect(res.status).toBe(401);
  });

  // ─── TEST 2: Vendedor → 403 ─────────────────────
  // El vendedor esta autenticado (tiene token) pero NO autorizado.
  // El middleware verificarRol(soloAdministrador) debe rechazarlo.
  // 403 Forbidden = "Se quien eres, pero no tienes acceso a este recurso"
  test('Vendedor NO puede ver el dashboard (solo Admin)', async () => {
    if (!tokenVendedor) return; // Skip si BD no disponible

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${tokenVendedor}`);

    expect(res.status).toBe(403);
  });

  // ─── TEST 3: Admin → 200 + estructura correcta ──
  // Verificamos no solo que responda 200, sino que la respuesta
  // tenga las propiedades esperadas. Esto protege contra regresiones:
  // si alguien renombra un campo en el controlador, este test falla.
  test('Admin puede ver el dashboard con datos correctos', async () => {
    if (!tokenAdmin) return; // Skip si BD no disponible

    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);

    // Validamos que la respuesta contenga las secciones principales
    // toHaveProperty() verifica que la clave exista (sin importar el valor)
    const datos = res.body.datos;
    expect(datos).toHaveProperty('ventas_hoy');
    expect(datos).toHaveProperty('total_libros');
    expect(datos).toHaveProperty('total_clientes');
    expect(datos).toHaveProperty('inventario');
    expect(datos).toHaveProperty('ventas_por_mes');
  });
});
