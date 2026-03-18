/**
 * =====================================================
 * CONTROLADOR DE AUTENTICACIÓN
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Este módulo gestiona la autenticación de usuarios
 * incluyendo registro, login y control de intentos fallidos.
 * Utiliza bcrypt para hash de contraseñas y JWT para tokens de sesión.
 *
 * @author Equipo de Desarrollo SGI
 * @version 2.0.0
 */

const db = require('../configuracion/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// =====================================================
// VALIDACIÓN CRÍTICA DE ENTORNO
// =====================================================
// Se verifica al cargar el módulo porque sin JWT_SECRET
// no es posible firmar ni verificar tokens de autenticación
if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET no está definido en las variables de entorno (.env)');
}

// =====================================================
// SISTEMA DE PROTECCIÓN CONTRA FUERZA BRUTA
// =====================================================

/**
 * Almacén en memoria para rastrear intentos de login fallidos.
 *
 * NOTA PARA PRODUCCIÓN CON MÚLTIPLES INSTANCIAS:
 * - Para un solo servidor (proyecto académico/pequeño): este Map funciona bien
 * - Para múltiples instancias con load balancer: considerar Redis o tabla MySQL
 *
 * PREVENCIÓN DE FUGA DE MEMORIA:
 * - Se limpia automáticamente cada 10 minutos (ver limpiezaPeriodicaBloqueos)
 * - Las entradas expiradas se eliminan al consultar verificarBloqueo
 *
 * @type {Map<string, {intentos: number, bloqueadoHasta: Date|null}>}
 */
const intentosLogin = new Map();

/**
 * Configuración de seguridad para el sistema anti-brute force.
 * Estos valores pueden ajustarse según políticas de seguridad.
 */
const CONFIG_SEGURIDAD = {
  MAX_INTENTOS: 3,              // Intentos permitidos antes de bloquear
  TIEMPO_BLOQUEO_MINUTOS: 3,    // Duración del bloqueo temporal
  TIEMPO_LIMPIEZA_MINUTOS: 10,  // Frecuencia de limpieza de memoria
  SALT_ROUNDS: 10               // Complejidad del hash bcrypt
};

/**
 * Limpia entradas expiradas del Map de intentos de login.
 * Esto previene fuga de memoria eliminando registros antiguos.
 * Se ejecuta automáticamente cada TIEMPO_LIMPIEZA_MINUTOS.
 */
const limpiarBloqueosExpirados = () => {
  const ahora = new Date();
  let eliminados = 0;

  for (const [email, registro] of intentosLogin.entries()) {
    // Eliminar si el bloqueo expiró hace más de 1 hora
    // (dar margen para no eliminar intentos recientes sin bloqueo)
    if (registro.bloqueadoHasta && ahora > registro.bloqueadoHasta) {
      const horasExpirado = (ahora - registro.bloqueadoHasta) / (1000 * 60 * 60);
      if (horasExpirado > 1) {
        intentosLogin.delete(email);
        eliminados++;
      }
    }
    // Eliminar intentos sin bloqueo que tengan más de 24 horas
    else if (!registro.bloqueadoHasta && registro.primeraFecha) {
      const horasDesdeInicio = (ahora - registro.primeraFecha) / (1000 * 60 * 60);
      if (horasDesdeInicio > 24) {
        intentosLogin.delete(email);
        eliminados++;
      }
    }
  }

  if (process.env.NODE_ENV === 'development' && eliminados > 0) {
    console.log(`[Auth] Limpieza: ${eliminados} registros de bloqueo expirados eliminados`);
  }
};

/**
 * Inicia el sistema de limpieza periódica de bloqueos.
 * Se ejecuta automáticamente al cargar el módulo.
 */
const iniciarLimpiezaPeriodica = () => {
  // Ejecutar limpieza cada TIEMPO_LIMPIEZA_MINUTOS
  setInterval(() => {
    limpiarBloqueosExpirados();
  }, CONFIG_SEGURIDAD.TIEMPO_LIMPIEZA_MINUTOS * 60 * 1000);

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Auth] Sistema anti-brute force iniciado con limpieza cada ${CONFIG_SEGURIDAD.TIEMPO_LIMPIEZA_MINUTOS} minutos`);
  }
};

// Iniciar limpieza automática al cargar el módulo
iniciarLimpiezaPeriodica();

/**
 * Verifica si un email está bloqueado por exceso de intentos fallidos.
 *
 * @param {string} email - Correo electrónico a verificar
 * @returns {{bloqueado: boolean, minutosRestantes?: number}} Estado de bloqueo
 *
 * @example
 * const estado = verificarBloqueo('usuario@email.com');
 * if (estado.bloqueado) {
 *   console.log(`Bloqueado por ${estado.minutosRestantes} minutos`);
 * }
 */
const verificarBloqueo = (email) => {
  const registro = intentosLogin.get(email);

  // Si no hay registro previo, el usuario no está bloqueado
  if (!registro) {
    return { bloqueado: false };
  }

  // Verificar si el bloqueo sigue vigente
  if (registro.bloqueadoHasta && new Date() < registro.bloqueadoHasta) {
    // Calcular tiempo restante redondeando hacia arriba
    const minutosRestantes = Math.ceil(
      (registro.bloqueadoHasta - new Date()) / 60000
    );
    return { bloqueado: true, minutosRestantes };
  }

  // El tiempo de bloqueo expiró, limpiar el registro
  if (registro.bloqueadoHasta && new Date() >= registro.bloqueadoHasta) {
    intentosLogin.delete(email);
    return { bloqueado: false };
  }

  return { bloqueado: false };
};

/**
 * Registra un intento de login fallido y gestiona el bloqueo.
 * Incrementa el contador y bloquea si se excede el límite.
 *
 * @param {string} email - Correo electrónico del intento fallido
 * @returns {{intentosRestantes: number, bloqueado: boolean}} Resultado del registro
 */
const registrarIntentoFallido = (email) => {
  // Obtener registro existente o crear uno nuevo
  const registro = intentosLogin.get(email) || {
    intentos: 0,
    bloqueadoHasta: null,
    primeraFecha: new Date()  // Para limpieza de memoria
  };

  registro.intentos += 1;

  // Si alcanza el límite, establecer tiempo de bloqueo
  if (registro.intentos >= CONFIG_SEGURIDAD.MAX_INTENTOS) {
    const bloqueadoHasta = new Date();
    bloqueadoHasta.setMinutes(
      bloqueadoHasta.getMinutes() + CONFIG_SEGURIDAD.TIEMPO_BLOQUEO_MINUTOS
    );
    registro.bloqueadoHasta = bloqueadoHasta;
  }

  intentosLogin.set(email, registro);

  return {
    intentosRestantes: Math.max(0, CONFIG_SEGURIDAD.MAX_INTENTOS - registro.intentos),
    bloqueado: registro.intentos >= CONFIG_SEGURIDAD.MAX_INTENTOS
  };
};

/**
 * Limpia el registro de intentos fallidos después de un login exitoso.
 * Esto permite que el usuario vuelva a tener intentos disponibles.
 *
 * @param {string} email - Correo electrónico a limpiar
 */
const limpiarIntentos = (email) => {
  intentosLogin.delete(email);
};

// =====================================================
// CONTROLADORES DE AUTENTICACIÓN
// =====================================================

/**
 * Registra un nuevo usuario en el sistema.
 * Valida datos, verifica duplicados, encripta contraseña y crea el registro.
 *
 * @async
 * @function registro
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.body - Datos del usuario a registrar
 * @param {string} req.body.nombre_completo - Nombre completo del usuario
 * @param {string} req.body.email - Correo electrónico (debe ser único)
 * @param {string} req.body.password - Contraseña en texto plano (se encriptará)
 * @param {number} req.body.rol_id - ID del rol (1: Admin, 2: Vendedor)
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} JSON con resultado del registro
 *
 * @example
 * // POST /api/auth/registro
 * // Body: { nombre_completo, email, password, rol_id }
 * // Response 201: { mensaje, exito, usuario }
 * // Response 400: { error, campos_requeridos }
 * // Response 409: { error } - Email duplicado
 */
exports.registro = async (req, res) => {
  const { nombre_completo, email, password, rol_id } = req.body;

  try {
    // ─────────────────────────────────────────────────
    // PASO 1: Validar que todos los campos requeridos estén presentes
    // Esto evita errores de BD y proporciona feedback claro al frontend
    // ─────────────────────────────────────────────────
    if (!nombre_completo || !email || !password || !rol_id) {
      return res.status(400).json({
        error: 'Todos los campos son obligatorios',
        campos_requeridos: ['nombre_completo', 'email', 'password', 'rol_id']
      });
    }

    // ─────────────────────────────────────────────────
    // PASO 2: Verificar que el email no esté registrado
    // El email es único en la BD para evitar duplicados
    // ─────────────────────────────────────────────────
    const [usuarioExistente] = await db.query(
      'SELECT id FROM mdc_usuarios WHERE email = ?',
      [email]
    );

    if (usuarioExistente.length > 0) {
      return res.status(409).json({
        error: 'El correo electrónico ya está registrado'
      });
    }

    // ─────────────────────────────────────────────────
    // PASO 3: Encriptar la contraseña con bcrypt
    // Nunca almacenamos contraseñas en texto plano por seguridad
    // SALT_ROUNDS define la complejidad del hash (mayor = más seguro pero más lento)
    // ─────────────────────────────────────────────────
    const passwordEncriptada = await bcrypt.hash(
      password,
      CONFIG_SEGURIDAD.SALT_ROUNDS
    );

    // ─────────────────────────────────────────────────
    // PASO 4: Insertar el nuevo usuario en la base de datos
    // Estado 1 = Activo (puede iniciar sesión inmediatamente)
    // ─────────────────────────────────────────────────
    const [resultado] = await db.query(
      `INSERT INTO mdc_usuarios
        (nombre_completo, email, password_hash, rol_id, estado)
       VALUES (?, ?, ?, ?, 1)`,
      [nombre_completo, email, passwordEncriptada, rol_id]
    );

    // ─────────────────────────────────────────────────
    // PASO 5: Responder con éxito
    // No retornamos la contraseña ni el hash por seguridad
    // ─────────────────────────────────────────────────
    res.status(201).json({
      mensaje: 'Usuario registrado exitosamente',
      exito: true,
      usuario: {
        id: resultado.insertId,
        nombre_completo,
        email,
        rol_id
      }
    });

  } catch (error) {
    // ─────────────────────────────────────────────────
    // MANEJO DE ERRORES: Log interno + respuesta genérica
    // No exponemos detalles técnicos al cliente por seguridad
    // ─────────────────────────────────────────────────
    if (process.env.NODE_ENV === 'development') {
      console.error('[Auth] Error en registro:', error.message);
    }

    res.status(500).json({
      error: 'Error al procesar el registro. Intente nuevamente.',
      exito: false
    });
  }
};

/**
 * Autentica un usuario y genera un token JWT de sesión.
 * Implementa protección contra fuerza bruta con bloqueo temporal.
 *
 * @async
 * @function login
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} req.body - Credenciales de acceso
 * @param {string} req.body.email - Correo electrónico del usuario
 * @param {string} req.body.password - Contraseña en texto plano
 * @param {Object} res - Objeto de respuesta Express
 * @returns {Object} JSON con token JWT y datos del usuario
 *
 * @example
 * // POST /api/auth/login
 * // Body: { email, password }
 * // Response 200: { mensaje, exito, token, usuario }
 * // Response 401: { error, intentosRestantes }
 * // Response 429: { error, bloqueado, minutosRestantes }
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // ─────────────────────────────────────────────────
    // PASO 1: Validar campos obligatorios
    // ─────────────────────────────────────────────────
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email y contraseña son obligatorios',
        exito: false
      });
    }

    // ─────────────────────────────────────────────────
    // PASO 2: Verificar si el usuario está bloqueado
    // Protección contra ataques de fuerza bruta
    // ─────────────────────────────────────────────────
    const estadoBloqueo = verificarBloqueo(email);

    if (estadoBloqueo.bloqueado) {
      return res.status(429).json({
        error: `Cuenta bloqueada temporalmente. Espere ${estadoBloqueo.minutosRestantes} minuto(s).`,
        exito: false,
        bloqueado: true,
        minutosRestantes: estadoBloqueo.minutosRestantes
      });
    }

    // ─────────────────────────────────────────────────
    // PASO 3: Buscar usuario por email
    // ─────────────────────────────────────────────────
    const [usuarios] = await db.query(
      'SELECT * FROM mdc_usuarios WHERE email = ?',
      [email]
    );

    // ─────────────────────────────────────────────────
    // PASO 4: Verificar existencia del usuario
    // Mensaje genérico para no revelar si el email existe
    // ─────────────────────────────────────────────────
    if (usuarios.length === 0) {
      const resultado = registrarIntentoFallido(email);

      return res.status(401).json({
        error: 'Credenciales incorrectas',
        exito: false,
        intentosRestantes: resultado.intentosRestantes,
        mensaje: resultado.bloqueado
          ? `Cuenta bloqueada por ${CONFIG_SEGURIDAD.TIEMPO_BLOQUEO_MINUTOS} minutos.`
          : `Intento fallido. Quedan ${resultado.intentosRestantes} intento(s).`
      });
    }

    const usuario = usuarios[0];

    // ─────────────────────────────────────────────────
    // PASO 5: Verificar estado del usuario
    // Estado 0 = Inactivo/Deshabilitado por administrador
    // ─────────────────────────────────────────────────
    if (usuario.estado !== 1) {
      return res.status(403).json({
        error: 'Usuario inactivo. Contacte al administrador.',
        exito: false
      });
    }

    // ─────────────────────────────────────────────────
    // PASO 6: Verificar contraseña con bcrypt
    // compare() desencripta el hash y compara de forma segura
    // ─────────────────────────────────────────────────
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      const resultado = registrarIntentoFallido(email);

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
    // PASO 7: Login exitoso - Limpiar historial de intentos
    // ─────────────────────────────────────────────────
    limpiarIntentos(email);

    // ─────────────────────────────────────────────────
    // PASO 8: Generar token JWT
    // El payload contiene datos básicos del usuario para evitar
    // consultas adicionales a la BD en cada petición protegida
    // ─────────────────────────────────────────────────
    const token = jwt.sign(
      {
        id: usuario.id,
        rol: usuario.rol_id,
        nombre: usuario.nombre_completo,
        email: usuario.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }  // Sesión de 8 horas laborales
    );

    // ─────────────────────────────────────────────────
    // PASO 9: Respuesta exitosa con token y datos
    // ─────────────────────────────────────────────────
    res.json({
      mensaje: 'Autenticación exitosa',
      exito: true,
      token,
      usuario: {
        id: usuario.id,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        rol_id: usuario.rol_id
      }
    });

  } catch (error) {
    // ─────────────────────────────────────────────────
    // MANEJO DE ERRORES: Log interno + respuesta segura
    // ─────────────────────────────────────────────────
    if (process.env.NODE_ENV === 'development') {
      console.error('[Auth] Error en login:', error.message);
    }

    res.status(500).json({
      error: 'Error interno del servidor. Intente más tarde.',
      exito: false
    });
  }
};
