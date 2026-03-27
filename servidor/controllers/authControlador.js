// =====================================================
// CONTROLADOR DE AUTENTICACIÓN
// =====================================================
// Este archivo es el "portero" del sistema.
// Se encarga de dos cosas principales:
//   1. Registrar nuevos usuarios
//   2. Verificar quién puede entrar (login) y darle un pase (token JWT)
// "El controlador de autenticación gestiona el acceso al sistema.
//  Usa bcrypt para proteger las contraseñas y JWT para mantener
//  la sesión activa sin necesidad de consultar la base de datos
//  en cada petición."
// =====================================================

// Conexión al pool de base de datos MySQL
const db = require('../config/db');

// bcryptjs: librería para encriptar contraseñas de forma segura
// NUNCA guardamos contraseñas en texto plano en la base de datos
const bcrypt = require('bcryptjs');

// jsonwebtoken: librería para crear y verificar tokens JWT
// Un token JWT es como un "carné" digital que identifica al usuario
const jwt = require('jsonwebtoken');

// ─────────────────────────────────────────────────────────
// VALIDACIÓN CRÍTICA AL ARRANCAR EL SERVIDOR
// ─────────────────────────────────────────────────────────
// Si no existe la clave secreta JWT en el archivo .env,
// el servidor falla inmediatamente al arrancar.
// Esto es mejor que descubrirlo cuando alguien intente hacer login.
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET no está definido en las variables de entorno (.env)');
}

// =====================================================
// SISTEMA DE PROTECCIÓN CONTRA FUERZA BRUTA
// =====================================================
// Un ataque de fuerza bruta ocurre cuando alguien intenta
// miles de contraseñas automáticamente hasta acertar.
// Para evitarlo, bloqueamos el acceso temporalmente
// después de varios intentos fallidos.

// "Implementamos protección anti-fuerza bruta que bloquea
//  una cuenta por 3 minutos después de 3 intentos fallidos,
//  lo que hace inviable un ataque automatizado."

// Este Map actúa como una tabla temporal en memoria RAM.
// Guarda: email → { cantidad de intentos, hasta cuándo está bloqueado }
// Cuando el servidor reinicia, se borra (es temporal, no persiste en BD).
const intentosLogin = new Map();

// Valores de configuración centralizados para fácil ajuste
const CONFIG_SEGURIDAD = {
  MAX_INTENTOS: 3,              // Bloquear después de 3 intentos fallidos
  TIEMPO_BLOQUEO_MINUTOS: 3,    // Duración del bloqueo: 3 minutos
  TIEMPO_LIMPIEZA_MINUTOS: 10,  // Cada 10 minutos limpiar registros viejos de RAM
  SALT_ROUNDS: 10               // Nivel de complejidad del hash bcrypt (10 es el estándar recomendado)
};

// ─────────────────────────────────────────────────────────
// LIMPIEZA AUTOMÁTICA DE MEMORIA
// ─────────────────────────────────────────────────────────
// Si dejamos que el Map crezca indefinidamente con emails bloqueados,
// con el tiempo el servidor usaría demasiada RAM.
// Esta función elimina los registros viejos que ya no sirven.
const limpiarBloqueosExpirados = () => {
  const ahora = new Date();
  let eliminados = 0;

  // Recorremos cada entrada del Map buscando registros viejos
  for (const [email, registro] of intentosLogin.entries()) {
    // Si el bloqueo ya expiró hace más de 1 hora → borrar
    if (registro.bloqueadoHasta && ahora > registro.bloqueadoHasta) {
      const horasExpirado = (ahora - registro.bloqueadoHasta) / (1000 * 60 * 60);
      if (horasExpirado > 1) {
        intentosLogin.delete(email);
        eliminados++;
      }
    }
    // Si nunca se bloqueó pero tiene más de 24 horas de antigüedad → borrar
    else if (!registro.bloqueadoHasta && registro.primeraFecha) {
      const horasDesdeInicio = (ahora - registro.primeraFecha) / (1000 * 60 * 60);
      if (horasDesdeInicio > 24) {
        intentosLogin.delete(email);
        eliminados++;
      }
    }
  }

  // Solo mostramos el log en desarrollo para no ensuciar los logs de producción
  if (process.env.NODE_ENV === 'development' && eliminados > 0) {
    console.log(`[Auth] Limpieza: ${eliminados} registros de bloqueo expirados eliminados`);
  }
};

// Iniciamos el temporizador de limpieza automática al arrancar el servidor.
// setInterval ejecuta la función cada X milisegundos de forma indefinida.
const iniciarLimpiezaPeriodica = () => {
  setInterval(() => {
    limpiarBloqueosExpirados();
  }, CONFIG_SEGURIDAD.TIEMPO_LIMPIEZA_MINUTOS * 60 * 1000); // convertimos minutos a ms

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Auth] Sistema anti-brute force iniciado con limpieza cada ${CONFIG_SEGURIDAD.TIEMPO_LIMPIEZA_MINUTOS} minutos`);
  }
};

// Esta línea hace que la limpieza empiece automáticamente al cargar el módulo
iniciarLimpiezaPeriodica();

// ─────────────────────────────────────────────────────────
// FUNCIÓN: Revisar si un usuario está bloqueado
// ─────────────────────────────────────────────────────────
// Recibe el email y devuelve si está bloqueado y cuánto tiempo falta
const verificarBloqueo = (email) => {
  // Buscamos si hay un registro de intentos para este email
  const registro = intentosLogin.get(email);

  // Si no hay registro, el usuario nunca ha fallado → no está bloqueado
  if (!registro) {
    return { bloqueado: false };
  }

  // Si hay fecha de bloqueo y aún no ha pasado el tiempo → sí está bloqueado
  if (registro.bloqueadoHasta && new Date() < registro.bloqueadoHasta) {
    // Calculamos cuántos minutos faltan y redondeamos hacia arriba
    const minutosRestantes = Math.ceil(
      (registro.bloqueadoHasta - new Date()) / 60000
    );
    return { bloqueado: true, minutosRestantes };
  }

  // Si el tiempo de bloqueo ya pasó → limpiamos y dejamos entrar
  if (registro.bloqueadoHasta && new Date() >= registro.bloqueadoHasta) {
    intentosLogin.delete(email);
    return { bloqueado: false };
  }

  return { bloqueado: false };
};

// ─────────────────────────────────────────────────────────
// FUNCIÓN: Registrar un intento de login fallido
// ─────────────────────────────────────────────────────────
// Aumenta el contador de intentos. Si llega al límite, bloquea.
const registrarIntentoFallido = (email) => {
  // Si ya existe un registro lo tomamos, si no creamos uno nuevo desde cero
  const registro = intentosLogin.get(email) || {
    intentos: 0,
    bloqueadoHasta: null,
    primeraFecha: new Date()
  };

  // Sumamos un intento fallido más
  registro.intentos += 1;

  // Si llegamos al límite máximo, calculamos hasta cuándo bloquear
  if (registro.intentos >= CONFIG_SEGURIDAD.MAX_INTENTOS) {
    const bloqueadoHasta = new Date();
    bloqueadoHasta.setMinutes(
      bloqueadoHasta.getMinutes() + CONFIG_SEGURIDAD.TIEMPO_BLOQUEO_MINUTOS
    );
    registro.bloqueadoHasta = bloqueadoHasta;
  }

  // Guardamos el registro actualizado en el Map
  intentosLogin.set(email, registro);

  return {
    // Cuántos intentos le quedan antes de bloquearse
    intentosRestantes: Math.max(0, CONFIG_SEGURIDAD.MAX_INTENTOS - registro.intentos),
    bloqueado: registro.intentos >= CONFIG_SEGURIDAD.MAX_INTENTOS
  };
};

// ─────────────────────────────────────────────────────────
// FUNCIÓN: Limpiar intentos después de un login exitoso
// ─────────────────────────────────────────────────────────
// Si alguien fallaba 2 veces pero al final entra correctamente,
// reseteamos su contador para que vuelva a tener 3 intentos disponibles.
const limpiarIntentos = (email) => {
  intentosLogin.delete(email);
};

// =====================================================
// CONTROLADOR 1: REGISTRO DE NUEVO USUARIO
// =====================================================
// Ruta: POST /api/auth/registro
// Permite crear un nuevo usuario en el sistema.
// Solo el administrador debería poder acceder a esta ruta (se controla en las rutas).
// "El proceso de registro valida los datos, verifica que el correo
//  no esté duplicado, encripta la contraseña con bcrypt y guarda
//  el usuario en la base de datos."
exports.registro = async (req, res, next) => {
  // Extraemos los datos que el usuario envió en el cuerpo de la petición
  const { nombre_completo, email, password, rol_id } = req.body;

  try {
    // ─────────────────────────────────────────────────
    // PASO 1: Validar que no falte ningún campo
    // Si falta alguno, respondemos con error 400 (Bad Request)
    // antes de tocar la base de datos
    // ─────────────────────────────────────────────────
    if (!nombre_completo || !email || !password || !rol_id) {
      return res.status(400).json({
        error: 'Todos los campos son obligatorios',
        campos_requeridos: ['nombre_completo', 'email', 'password', 'rol_id']
      });
    }

    // Limpiamos espacios del nombre y convertimos el email a minúsculas
    // para evitar duplicados como "Juan@GMAIL.com" vs "juan@gmail.com"
    const nombreNormalizado = nombre_completo.trim();
    const emailNormalizado  = email.trim().toLowerCase();

    // Validar formato del email con expresión regular
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNormalizado)) {
      return res.status(400).json({ error: 'El formato del email no es válido', exito: false });
    }

    // La contraseña debe tener al menos 8 caracteres por seguridad
    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres', exito: false });
    }

    // ─────────────────────────────────────────────────
    // PASO 2: Verificar que el correo no esté ya registrado
    // El campo email en la BD tiene restricción UNIQUE,
    // pero verificamos antes para dar un mensaje más claro
    // ─────────────────────────────────────────────────
    const [usuarioExistente] = await db.query(
      'SELECT id FROM mdc_usuarios WHERE email = ?',
      [emailNormalizado]
    );

    // Si la consulta devolvió al menos un registro, el email ya existe
    if (usuarioExistente.length > 0) {
      return res.status(409).json({
        error: 'El correo electrónico ya está registrado'
      });
    }

    // ─────────────────────────────────────────────────
    // PASO 3: Encriptar la contraseña con bcrypt
    // bcrypt.hash() convierte "miClave123" en algo como
    // "$2a$10$xK9p3...qM7" — un hash irreversible.
    // Si alguien roba la base de datos, no puede ver las contraseñas reales.
    //
  
    // "Usamos bcrypt con 10 salt rounds para hashear las contraseñas.
    //  Esto significa que aunque alguien obtenga acceso a la base de datos,
    //  no puede recuperar las contraseñas originales."
    // ─────────────────────────────────────────────────
    const passwordEncriptada = await bcrypt.hash(
      password,
      CONFIG_SEGURIDAD.SALT_ROUNDS
    );

    // ─────────────────────────────────────────────────
    // PASO 4: Guardar el nuevo usuario en la base de datos
    // Guardamos el hash de la contraseña, nunca el texto plano.
    // estado = 1 significa que el usuario está activo y puede iniciar sesión.
    // ─────────────────────────────────────────────────
    const [resultado] = await db.query(
      `INSERT INTO mdc_usuarios
        (nombre_completo, email, password_hash, rol_id, estado)
       VALUES (?, ?, ?, ?, 1)`,
      [nombreNormalizado, emailNormalizado, passwordEncriptada, rol_id]
    );

    // ─────────────────────────────────────────────────
    // PASO 5: Responder con éxito
    // Devolvemos los datos del usuario nuevo, pero NUNCA la contraseña.
    // El 201 significa "recurso creado exitosamente" (estándar HTTP).
    // ─────────────────────────────────────────────────
    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      exito: true,
      usuario: {
        id: resultado.insertId,  // ID autogenerado por MySQL
        nombre_completo: nombreNormalizado,
        email: emailNormalizado,
        rol_id
      }
    });

  } catch (error) {
    // En desarrollo mostramos el error completo para depuración.
    // En producción solo lo pasamos al middleware de errores global,
    // que responde con un mensaje genérico sin revelar detalles internos.
    if (process.env.NODE_ENV === 'development') {
      console.error('[Auth] Error en registro:', error.message);
    }
    next(error);
  }
};

// =====================================================
// CONTROLADOR 2: LOGIN (INICIO DE SESIÓN)
// =====================================================
// Ruta: POST /api/auth/login
// Verifica las credenciales y, si son correctas, entrega un token JWT.

// "El login verifica la contraseña con bcrypt, aplica protección
//  anti-fuerza bruta y genera un token JWT que el frontend guarda
//  en localStorage para identificar al usuario en futuras peticiones."
exports.login = async (req, res, next) => {
  // Tomamos el email y la contraseña del cuerpo de la petición
  const { email, password } = req.body;

  try {
    // ─────────────────────────────────────────────────
    // PASO 1: Validar que los campos no estén vacíos
    // ─────────────────────────────────────────────────
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email y contraseña son obligatorios',
        exito: false
      });
    }

    // Normalizamos el email para buscar sin importar mayúsculas ni espacios
    const emailNormalizado = email.trim().toLowerCase();

    // ─────────────────────────────────────────────────
    // PASO 2: Revisar si esta cuenta está bloqueada
    // Si el usuario ya falló 3 veces, no le permitimos ni intentar
    // ─────────────────────────────────────────────────
    const estadoBloqueo = verificarBloqueo(emailNormalizado);

    if (estadoBloqueo.bloqueado) {
      // Código 429 = "Too Many Requests" (demasiadas peticiones)
      return res.status(429).json({
        error: `Cuenta bloqueada temporalmente. Espere ${estadoBloqueo.minutosRestantes} minuto(s).`,
        exito: false,
        bloqueado: true,
        minutosRestantes: estadoBloqueo.minutosRestantes
      });
    }

    // ─────────────────────────────────────────────────
    // PASO 3: Buscar al usuario en la base de datos por su email
    // Solo traemos los campos necesarios (no traemos información innecesaria)
    // ─────────────────────────────────────────────────
    const [usuarios] = await db.query(
      'SELECT id, nombre_completo, email, password_hash, rol_id, estado FROM mdc_usuarios WHERE email = ?',
      [emailNormalizado]
    );

    // ─────────────────────────────────────────────────
    // PASO 4: Verificar si el usuario existe
    // IMPORTANTE: usamos el mismo mensaje de error si el email no existe
    // O si la contraseña es incorrecta. Esto evita dar pistas a un atacante
    // sobre cuáles emails están registrados en el sistema.
    // ─────────────────────────────────────────────────
    if (usuarios.length === 0) {
      // Registramos el intento fallido para el sistema anti-fuerza bruta
      const resultado = registrarIntentoFallido(emailNormalizado);

      return res.status(401).json({
        error: 'Credenciales incorrectas',
        exito: false,
        intentosRestantes: resultado.intentosRestantes,
        mensaje: resultado.bloqueado
          ? `Cuenta bloqueada por ${CONFIG_SEGURIDAD.TIEMPO_BLOQUEO_MINUTOS} minutos.`
          : `Intento fallido. Quedan ${resultado.intentosRestantes} intento(s).`
      });
    }

    // Tomamos el primer (y único) resultado de la consulta
    const usuario = usuarios[0];

    // ─────────────────────────────────────────────────
    // PASO 5: Verificar que el usuario esté activo
    // Un administrador puede desactivar usuarios (estado = 0)
    // para que no puedan iniciar sesión sin borrarlos de la BD
    // ─────────────────────────────────────────────────
    if (usuario.estado !== 1) {
      return res.status(403).json({
        error: 'Usuario inactivo. Contacte al administrador.',
        exito: false
      });
    }

    // ─────────────────────────────────────────────────
    // PASO 6: Comparar la contraseña con el hash guardado en BD
    // bcrypt.compare() NO desencripta el hash (eso es imposible).
    // Lo que hace es aplicar el mismo proceso de hash a la contraseña
    // ingresada y verifica si el resultado coincide con el hash guardado.
    
    // "bcrypt.compare() verifica la contraseña de forma segura
    //  sin necesidad de desencriptar el hash. El algoritmo aplica
    //  el mismo proceso y compara los resultados."
    // ─────────────────────────────────────────────────
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    // Si la contraseña no coincide, registramos el intento fallido
    if (!passwordValida) {
      const resultado = registrarIntentoFallido(emailNormalizado);

      return res.status(401).json({
        error: 'Credenciales incorrectas',
        exito: false,
        intentosRestantes: resultado.intentosRestantes,
        mensaje: resultado.bloqueado
          ? `Cuenta bloqueada por ${CONFIG_SEGURIDAD.TIEMPO_BLOQUEO_MINUTOS} minutos.`
          : `Intento fallido. Quedan ${resultado.intentosRestantes} intento(s).`
      });
    }

    // ─────────────────────────────────────────────────
    // PASO 7: Login exitoso → limpiamos el historial de intentos
    // Esto permite que el usuario vuelva a tener 3 intentos disponibles
    // ─────────────────────────────────────────────────
    limpiarIntentos(emailNormalizado);

    // ─────────────────────────────────────────────────
    // PASO 7.5: Registrar la fecha y hora del último acceso
    // Actualizamos el campo ultimo_acceso en la base de datos
    // para que el administrador pueda ver cuándo fue la última
    // vez que cada usuario inició sesión en el sistema.
    // NOW() es una función de MySQL que devuelve la fecha y hora actual.
    // ─────────────────────────────────────────────────
    await db.query(
      'UPDATE mdc_usuarios SET ultimo_acceso = NOW() WHERE id = ?',
      [usuario.id]
    );

    // ─────────────────────────────────────────────────
    // PASO 8: Generar el token JWT (carné digital del usuario)
    //
    // ¿Qué es un JWT?
    // Es una cadena de texto codificada en 3 partes separadas por puntos:
    //   HEADER.PAYLOAD.FIRMA
    // El payload contiene datos del usuario (id, rol, nombre).
    // La firma garantiza que nadie puede modificar el token sin invalidarlo.
    //
    // Incluimos en el payload solo lo necesario para no exponer datos sensibles.
    // El frontend leerá este token para saber quién es el usuario y qué puede hacer.
    
    // "El JWT que generamos incluye el id, rol y nombre del usuario.
    //  Tiene una duración de 8 horas y está firmado con HS256 usando
    //  una clave secreta del servidor. Esto garantiza que el token
    //  no puede ser falsificado ni modificado por el usuario."
    // ─────────────────────────────────────────────────
    const token = jwt.sign(
      {
        id:     usuario.id,          // Para saber quién es en cada petición
        rol:    usuario.rol_id,      // Para saber qué puede hacer (1=Admin, 2=Vendedor)
        nombre: usuario.nombre_completo,
        email:  usuario.email
      },
      process.env.JWT_SECRET,        // Clave secreta del servidor (del archivo .env)
      {
        algorithm: 'HS256',                           // Algoritmo de firma
        expiresIn: process.env.JWT_EXPIRY || '8h',   // El token expira en 8 horas
        issuer:    'sgi-libreria'                     // Identifica quién emitió el token
      }
    );

    // ─────────────────────────────────────────────────
    // PASO 9: Enviar el token y los datos del usuario al frontend
    // El frontend guardará el token en localStorage y lo enviará
    // en cada petición dentro del header "Authorization: Bearer <token>"
    // ─────────────────────────────────────────────────
    res.json({
      mensaje: 'Autenticación exitosa',
      exito: true,
      token,  // Este token es lo más importante de la respuesta
      usuario: {
        id:              usuario.id,
        nombre_completo: usuario.nombre_completo,
        email:           usuario.email,
        rol_id:          usuario.rol_id
      }
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Auth] Error en login:', error.message);
    }
    // Pasamos el error al middleware global de manejo de errores
    next(error);
  }
};