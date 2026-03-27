// =====================================================
// CONTROLADOR DE USUARIOS
// =====================================================
// Este archivo gestiona la administración de los usuarios
// del sistema (los empleados que usan el SGI).
//
// ¿Quién puede acceder a estas funciones?
// La mayoría son exclusivas del Administrador.
// Solo "cambiar contraseña" está disponible para todos los usuarios.
//
// Roles del sistema:
//   - rol_id = 1 → Administrador (acceso total)
//   - rol_id = 2 → Vendedor (acceso limitado)
//
// Diferencia entre "usuario" y "cliente":
//   - Usuario: empleado que usa el sistema (login, sesiones)
//   - Cliente: persona que compra en la librería (registrado en ventas)

// "El módulo de usuarios permite al administrador gestionar
//  los accesos al sistema: crear cuentas para nuevos vendedores,
//  desactivar cuentas sin borrarlas, y cambiar roles.
//  Las contraseñas siempre se guardan encriptadas con bcrypt."
// =====================================================

// Conexión al pool de base de datos MySQL
const db = require('../config/db');

// bcryptjs: para encriptar y verificar contraseñas
const bcrypt = require('bcryptjs');

// Nivel de complejidad del hash de contraseñas.
// 10 es el estándar recomendado: seguro y con tiempo de respuesta aceptable.
const SALT_ROUNDS = 10;

// =====================================================
// CONTROLADOR 1: LISTAR TODOS LOS USUARIOS
// =====================================================
// Ruta: GET /api/usuarios (solo Admin)
// Devuelve todos los usuarios con su rol y estado.
// NUNCA incluye el hash de la contraseña por seguridad.

// "La consulta usa JOIN con mdc_roles para mostrar el nombre
//  del rol en lugar de solo el número. Nunca devolvemos
//  el hash de la contraseña, aunque esté en la misma tabla."
exports.obtenerUsuarios = async (req, res) => {
  try {
    // Consultamos usuarios junto con el nombre de su rol.
    // JOIN con mdc_roles para obtener "Administrador" o "Vendedor"
    // en lugar de solo el número 1 o 2.
    const [usuarios] = await db.query(`
      SELECT
        u.id,
        u.nombre_completo,
        u.email,
        u.rol_id,
        r.nombre AS rol,
        u.estado,
        u.ultimo_acceso,
        u.fecha_creacion
      FROM mdc_usuarios u
      JOIN mdc_roles r ON u.rol_id = r.id
      ORDER BY u.fecha_creacion DESC
    `);

    // Respondemos con la lista de usuarios
    // Nótese que password_hash NO está en el SELECT — nunca lo exponemos
    res.json({ exito: true, datos: usuarios });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Usuarios] Error al listar:', error);
    }
    res.status(500).json({ exito: false, mensaje: 'Error al obtener usuarios' });
  }
};

// =====================================================
// CONTROLADOR 2: CREAR UN NUEVO USUARIO
// =====================================================
// Ruta: POST /api/usuarios (solo Admin)
// El administrador puede crear nuevas cuentas para vendedores u otros admins.
// El proceso es igual al registro: validar → verificar duplicado → hashear → insertar.

// "El administrador puede crear usuarios desde el panel de gestión.
//  El sistema valida el formato del email con expresión regular,
//  verifica que no exista ya esa cuenta, y encripta la contraseña
//  antes de guardarla."
exports.crearUsuario = async (req, res) => {
  // Extraemos los datos del formulario
  const { nombre_completo, email, password, rol_id } = req.body;

  // Validar que todos los campos requeridos estén presentes
  if (!nombre_completo || !email || !password || !rol_id) {
    return res.status(400).json({
      exito:   false,
      mensaje: 'Todos los campos son requeridos: nombre_completo, email, password, rol_id'
    });
  }

  // Normalizamos el email: trim + lowercase para evitar duplicados por mayúsculas
  const emailNormalizado = email.trim().toLowerCase();

  // Validar que el email tenga un formato correcto usando expresión regular.
  // La regex verifica: algo@algo.algo (sin espacios, con @, con punto)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailNormalizado)) {
    return res.status(400).json({ exito: false, mensaje: 'Formato de email inválido' });
  }

  // La contraseña debe tener al menos 8 caracteres por política de seguridad
  if (password.length < 8) {
    return res.status(400).json({ exito: false, mensaje: 'La contraseña debe tener al menos 8 caracteres' });
  }

  try {
    // Verificar que el email no esté ya registrado en el sistema
    const [existe] = await db.query(
      'SELECT id FROM mdc_usuarios WHERE email = ?',
      [emailNormalizado]
    );

    if (existe.length > 0) {
      return res.status(409).json({ exito: false, mensaje: 'El email ya está registrado' });
    }

    // Verificar que el rol_id es válido (que exista en mdc_roles)
    // Esto previene asignar roles inventados
    const [roles] = await db.query('SELECT id FROM mdc_roles WHERE id = ?', [rol_id]);
    if (roles.length === 0) {
      return res.status(400).json({ exito: false, mensaje: 'Rol inválido' });
    }

    // Encriptamos la contraseña antes de guardarla
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Insertamos el nuevo usuario.
    // estado = 1 significa activo desde el principio.
    // El email se guarda en minúsculas para consistencia.
    const [resultado] = await db.query(
      `INSERT INTO mdc_usuarios (nombre_completo, email, password_hash, rol_id, estado)
       VALUES (?, ?, ?, ?, 1)`,
      [nombre_completo.trim(), emailNormalizado, passwordHash, parseInt(rol_id)]
    );

    res.status(201).json({
      exito:   true,
      mensaje: 'Usuario creado exitosamente',
      id:      resultado.insertId
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Usuarios] Error al crear:', error);
    }
    res.status(500).json({ exito: false, mensaje: 'Error al crear el usuario' });
  }
};

// =====================================================
// CONTROLADOR 3: ACTUALIZAR DATOS DE UN USUARIO
// =====================================================
// Ruta: PUT /api/usuarios/:id (solo Admin)
// Permite cambiar el nombre, email o rol de un usuario.
// Para cambiar contraseña existe un endpoint separado (más seguro).
//
// ¿Por qué separar el cambio de contraseña?
// Porque cambiar datos básicos y cambiar contraseña son dos
// flujos distintos con requisitos de seguridad diferentes.
// El cambio de contraseña requiere verificar la contraseña actual.
exports.actualizarUsuario = async (req, res) => {
  // El middleware validarParametroId ya verifico que el ID sea un numero valido
  const id = parseInt(req.params.id, 10);
  const { nombre_completo, email, rol_id } = req.body;

  // Todos los campos son obligatorios para la actualización
  if (!nombre_completo || !email || !rol_id) {
    return res.status(400).json({ exito: false, mensaje: 'nombre_completo, email y rol_id son requeridos' });
  }

  // Normalizamos el email: trim + lowercase
  const emailNormalizado = email.trim().toLowerCase();

  // Validar formato de email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailNormalizado)) {
    return res.status(400).json({ exito: false, mensaje: 'Formato de email inválido' });
  }

  try {
    // Verificar que el usuario que se quiere editar existe
    const [existe] = await db.query('SELECT id FROM mdc_usuarios WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    }

    // Verificar que el email nuevo no esté siendo usado por OTRO usuario.
    // "AND id != ?" evita que el mismo usuario sea detectado como conflicto.
    const [emailDuplicado] = await db.query(
      'SELECT id FROM mdc_usuarios WHERE email = ? AND id != ?',
      [emailNormalizado, id]
    );
    if (emailDuplicado.length > 0) {
      return res.status(409).json({ exito: false, mensaje: 'El email ya está en uso' });
    }

    // Actualizamos el usuario con los nuevos datos
    await db.query(
      'UPDATE mdc_usuarios SET nombre_completo = ?, email = ?, rol_id = ? WHERE id = ?',
      [nombre_completo.trim(), emailNormalizado, parseInt(rol_id), id]
    );

    res.json({ exito: true, mensaje: 'Usuario actualizado exitosamente' });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Usuarios] Error al actualizar:', error);
    }
    res.status(500).json({ exito: false, mensaje: 'Error al actualizar el usuario' });
  }
};

// =====================================================
// CONTROLADOR 4: ACTIVAR O DESACTIVAR UN USUARIO
// =====================================================
// Ruta: PATCH /api/usuarios/:id/estado (solo Admin)
// En lugar de borrar usuarios, los desactivamos.
// Un usuario inactivo no puede iniciar sesión pero su historial se conserva.
//
// ¿Por qué no borrar? Por trazabilidad.
// Si un empleado hizo ventas y luego se va de la empresa,
// no queremos perder el historial de sus ventas al borrar su cuenta.
// Simplemente la desactivamos.

// "Implementamos soft-disable en lugar de borrado físico.
//  Al desactivar un usuario, estado pasa de 1 a 0.
//  El login verifica el estado y rechaza usuarios inactivos.
//  Esto preserva el historial de ventas asociado al usuario."
exports.cambiarEstado = async (req, res) => {
  // El middleware validarParametroId ya verifico que el ID sea un numero valido
  const id = parseInt(req.params.id, 10);

  // Proteccion importante: el administrador no puede desactivarse a si mismo.
  // req.usuario.id viene del token JWT, identificando quién hace la petición.
  // Si se desactivara a sí mismo, quedaría bloqueado del sistema sin poder revertirlo.
  if (id === req.usuario.id) {
    return res.status(400).json({ exito: false, mensaje: 'No puede desactivar su propia cuenta' });
  }

  try {
    // Verificar que el usuario existe y obtener su estado actual
    const [usuarios] = await db.query('SELECT id, estado FROM mdc_usuarios WHERE id = ?', [id]);
    if (usuarios.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    }

    // Invertir el estado: si está activo (1) lo desactivamos (0), y viceversa.
    // Operador ternario: condición ? valor_si_verdadero : valor_si_falso
    const nuevoEstado = usuarios[0].estado === 1 ? 0 : 1;

    // Guardamos el nuevo estado en la base de datos
    await db.query('UPDATE mdc_usuarios SET estado = ? WHERE id = ?', [nuevoEstado, id]);

    res.json({
      exito:   true,
      mensaje: nuevoEstado === 1 ? 'Usuario activado' : 'Usuario desactivado',
      estado:  nuevoEstado
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Usuarios] Error al cambiar estado:', error);
    }
    res.status(500).json({ exito: false, mensaje: 'Error al cambiar el estado del usuario' });
  }
};

// =====================================================
// CONTROLADOR 5: CAMBIAR CONTRASEÑA
// =====================================================
// Ruta: PATCH /api/usuarios/cambiar-password (cualquier usuario autenticado)
// Este es el único endpoint de usuarios accesible para todos los roles.
// Permite que cualquier usuario cambie su propia contraseña.
//
// El proceso exige la contraseña actual como verificación de identidad.
// Así, aunque alguien robe la sesión, no puede cambiar la contraseña
// sin conocer la contraseña actual.

// "Para cambiar la contraseña, el sistema exige la contraseña actual
//  como segundo factor de verificación. Esto protege la cuenta incluso
//  si el token JWT es interceptado, porque el atacante también necesitaría
//  conocer la contraseña actual."
exports.cambiarPassword = async (req, res) => {
  // Extraemos las tres contraseñas del formulario
  const { passwordActual, passwordNueva, passwordConfirmacion } = req.body;

  // El ID del usuario que hace la petición viene del token JWT (decodificado por el middleware)
  const usuarioId = req.usuario.id;

  // Validar que los tres campos estén presentes
  if (!passwordActual || !passwordNueva || !passwordConfirmacion) {
    return res.status(400).json({
      exito:   false,
      mensaje: 'Se requieren: passwordActual, passwordNueva y passwordConfirmacion'
    });
  }

  // La nueva contraseña y su confirmación deben ser idénticas
  // Esto previene errores de tipeo al escribir la nueva contraseña
  if (passwordNueva !== passwordConfirmacion) {
    return res.status(400).json({ exito: false, mensaje: 'La nueva contraseña y la confirmación no coinciden' });
  }

  // Mínimo 8 caracteres por política de seguridad
  if (passwordNueva.length < 8) {
    return res.status(400).json({ exito: false, mensaje: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }

  try {
    // Obtenemos el hash actual de la contraseña del usuario
    const [usuarios] = await db.query(
      'SELECT password_hash FROM mdc_usuarios WHERE id = ?',
      [usuarioId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    }

    // Verificamos que la contraseña actual sea correcta usando bcrypt.compare().
    // Si no coincide, rechazamos el cambio — el usuario debe saber su contraseña actual.
    const passwordValida = await bcrypt.compare(passwordActual, usuarios[0].password_hash);
    if (!passwordValida) {
      return res.status(401).json({ exito: false, mensaje: 'La contraseña actual es incorrecta' });
    }

    // Generamos el hash de la nueva contraseña antes de guardarla
    const nuevoHash = await bcrypt.hash(passwordNueva, SALT_ROUNDS);

    // Actualizamos la contraseña en la base de datos
    // Solo modificamos password_hash, nada más del usuario
    await db.query(
      'UPDATE mdc_usuarios SET password_hash = ? WHERE id = ?',
      [nuevoHash, usuarioId]
    );

    res.json({ exito: true, mensaje: 'Contraseña actualizada exitosamente' });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Usuarios] Error al cambiar contraseña:', error);
    }
    res.status(500).json({ exito: false, mensaje: 'Error al cambiar la contraseña' });
  }
};