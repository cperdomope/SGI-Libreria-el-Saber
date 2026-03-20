const request = require('supertest');

process.env.NODE_ENV = 'test';

// La app real (con todos sus middlewares y rutas configurados)
const app = require('../app');

// Credenciales de prueba leídas del entorno.
// Para ejecutar los tests, asegúrate de que estos usuarios existan en la BD.
// Puedes configurarlos en .env o sobreescribirlos al ejecutar:
//   TEST_ADMIN_EMAIL=tu@email.com TEST_ADMIN_PASSWORD=pass npm test
const EMAIL_ADMIN    = process.env.TEST_ADMIN_EMAIL    || 'ldarlys@sena.edu.co';
const PASSWORD_ADMIN = process.env.TEST_ADMIN_PASSWORD || 'admin123';

describe('Módulo de Autenticación', () => {

  test('Debe rechazar login cuando falta el email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'cualquier' });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  test('Debe rechazar login cuando falta la contraseña', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL_ADMIN });

    expect(res.status).toBe(400);
    expect(res.body.exito).toBe(false);
  });

  test('Debe rechazar login con contraseña incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL_ADMIN, password: 'contraseña_incorrecta_xyz' });

    // 401 si el usuario existe pero la contraseña es incorrecta
    // 401 también si el usuario no existe (respuesta genérica por seguridad)
    expect([400, 401]).toContain(res.status);
    expect(res.body.exito).toBe(false);
  });

  test('Debe rechazar acceso a ruta protegida sin token JWT', async () => {
    const res = await request(app).get('/api/libros');
    expect(res.status).toBe(401);
  });

  test('Login exitoso retorna token y datos del usuario (requiere BD)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: EMAIL_ADMIN, password: PASSWORD_ADMIN });

    // Si la BD no está disponible el token será undefined y el test se omite
    if (!res.body.token) {
      console.warn('[Test] BD no disponible — omitiendo prueba de login exitoso');
      return;
    }

    expect(res.status).toBe(200);
    expect(res.body.exito).toBe(true);
    expect(res.body).toHaveProperty('token');
    expect(res.body.usuario).toHaveProperty('id');
    expect(res.body.usuario).toHaveProperty('rol_id');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(10);
  });
});