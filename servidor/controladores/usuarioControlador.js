/**
 * =====================================================
 * CONTROLADOR DE USUARIOS
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description CRUD de usuarios del sistema. Solo accesible
 * para el rol Administrador. Incluye cambio de contraseña.
 *
 * ENDPOINTS:
 * - GET    /api/usuarios          → Listar todos los usuarios
 * - POST   /api/usuarios          → Crear nuevo usuario
 * - PUT    /api/usuarios/:id      → Actualizar usuario
 * - PATCH  /api/usuarios/:id/estado → Activar/Desactivar usuario
 * - PATCH  /api/usuarios/cambiar-password → Cambiar contraseña (cualquier usuario)
 *
 * @author Equipo de Desarrollo SGI
 * @version 1.0.0
 */

const db = require('../configuracion/db');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

// =====================================================
// LISTAR USUARIOS
// =====================================================

/**
 * Obtiene todos los usuarios del sistema.
 * No retorna los hashes de contraseña por seguridad.
 */
exports.obtenerUsuarios = async (req, res) => {
  try {
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

    res.json({ exito: true, datos: usuarios });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Usuarios] Error al listar:', error);
    }
    res.status(500).json({ exito: false, mensaje: 'Error al obtener usuarios' });
  }
};

// =====================================================
// CREAR USUARIO
// =====================================================

/**
 * Crea un nuevo usuario en el sistema.
 * Solo el Administrador puede crear usuarios.
 */
exports.crearUsuario = async (req, res) => {
  const { nombre_completo, email, password, rol_id } = req.body;

  if (!nombre_completo || !email || !password || !rol_id) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Todos los campos son requeridos: nombre_completo, email, password, rol_id'
    });
  }

  // Validar formato de email básico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ exito: false, mensaje: 'Formato de email inválido' });
  }

  if (password.length < 6) {
    return res.status(400).json({ exito: false, mensaje: 'La contraseña debe tener al menos 6 caracteres' });
  }

  try {
    // Verificar que el email no exista
    const [existe] = await db.query(
      'SELECT id FROM mdc_usuarios WHERE email = ?',
      [email]
    );

    if (existe.length > 0) {
      return res.status(409).json({ exito: false, mensaje: 'El email ya está registrado' });
    }

    // Verificar que el rol existe (1 o 2)
    const [roles] = await db.query('SELECT id FROM mdc_roles WHERE id = ?', [rol_id]);
    if (roles.length === 0) {
      return res.status(400).json({ exito: false, mensaje: 'Rol inválido' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [resultado] = await db.query(
      `INSERT INTO mdc_usuarios (nombre_completo, email, password_hash, rol_id, estado)
       VALUES (?, ?, ?, ?, 1)`,
      [nombre_completo.trim(), email.toLowerCase().trim(), passwordHash, parseInt(rol_id)]
    );

    res.status(201).json({
      exito: true,
      mensaje: 'Usuario creado exitosamente',
      id: resultado.insertId
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Usuarios] Error al crear:', error);
    }
    res.status(500).json({ exito: false, mensaje: 'Error al crear el usuario' });
  }
};

// =====================================================
// ACTUALIZAR USUARIO
// =====================================================

/**
 * Actualiza los datos de un usuario (sin contraseña).
 * Para cambiar contraseña usar el endpoint específico.
 */
exports.actualizarUsuario = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ exito: false, mensaje: 'ID inválido' });
  }

  const { nombre_completo, email, rol_id } = req.body;

  if (!nombre_completo || !email || !rol_id) {
    return res.status(400).json({ exito: false, mensaje: 'nombre_completo, email y rol_id son requeridos' });
  }

  try {
    // Verificar que el usuario existe
    const [existe] = await db.query('SELECT id FROM mdc_usuarios WHERE id = ?', [id]);
    if (existe.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    }

    // Verificar que el email no esté tomado por otro usuario
    const [emailDuplicado] = await db.query(
      'SELECT id FROM mdc_usuarios WHERE email = ? AND id != ?',
      [email, id]
    );
    if (emailDuplicado.length > 0) {
      return res.status(409).json({ exito: false, mensaje: 'El email ya está en uso' });
    }

    await db.query(
      'UPDATE mdc_usuarios SET nombre_completo = ?, email = ?, rol_id = ? WHERE id = ?',
      [nombre_completo.trim(), email.toLowerCase().trim(), parseInt(rol_id), id]
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
// CAMBIAR ESTADO (ACTIVAR / DESACTIVAR)
// =====================================================

/**
 * Activa o desactiva un usuario.
 * Un usuario inactivo no puede iniciar sesión.
 * No se puede desactivar al propio usuario autenticado.
 */
exports.cambiarEstado = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id <= 0) {
    return res.status(400).json({ exito: false, mensaje: 'ID inválido' });
  }

  // Evitar que el administrador se desactive a sí mismo
  if (id === req.usuario.id) {
    return res.status(400).json({ exito: false, mensaje: 'No puede desactivar su propia cuenta' });
  }

  try {
    const [usuarios] = await db.query('SELECT id, estado FROM mdc_usuarios WHERE id = ?', [id]);
    if (usuarios.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    }

    const nuevoEstado = usuarios[0].estado === 1 ? 0 : 1;
    await db.query('UPDATE mdc_usuarios SET estado = ? WHERE id = ?', [nuevoEstado, id]);

    res.json({
      exito: true,
      mensaje: nuevoEstado === 1 ? 'Usuario activado' : 'Usuario desactivado',
      estado: nuevoEstado
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Usuarios] Error al cambiar estado:', error);
    }
    res.status(500).json({ exito: false, mensaje: 'Error al cambiar el estado del usuario' });
  }
};

// =====================================================
// CAMBIAR CONTRASEÑA
// =====================================================

/**
 * Permite a cualquier usuario autenticado cambiar su propia contraseña.
 * Requiere la contraseña actual para confirmar identidad.
 *
 * FLUJO:
 * 1. Verificar que contraseña actual sea correcta
 * 2. Hashear la nueva contraseña
 * 3. Actualizar en base de datos
 */
exports.cambiarPassword = async (req, res) => {
  const { passwordActual, passwordNueva, passwordConfirmacion } = req.body;
  const usuarioId = req.usuario.id;

  // Validar campos
  if (!passwordActual || !passwordNueva || !passwordConfirmacion) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Se requieren: passwordActual, passwordNueva y passwordConfirmacion'
    });
  }

  if (passwordNueva !== passwordConfirmacion) {
    return res.status(400).json({ exito: false, mensaje: 'La nueva contraseña y la confirmación no coinciden' });
  }

  if (passwordNueva.length < 6) {
    return res.status(400).json({ exito: false, mensaje: 'La nueva contraseña debe tener al menos 6 caracteres' });
  }

  try {
    // Obtener hash actual del usuario
    const [usuarios] = await db.query(
      'SELECT password_hash FROM mdc_usuarios WHERE id = ?',
      [usuarioId]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' });
    }

    // Verificar contraseña actual
    const passwordValida = await bcrypt.compare(passwordActual, usuarios[0].password_hash);
    if (!passwordValida) {
      return res.status(401).json({ exito: false, mensaje: 'La contraseña actual es incorrecta' });
    }

    // Hashear y guardar nueva contraseña
    const nuevoHash = await bcrypt.hash(passwordNueva, SALT_ROUNDS);
    await db.query('UPDATE mdc_usuarios SET password_hash = ? WHERE id = ?', [nuevoHash, usuarioId]);

    res.json({ exito: true, mensaje: 'Contraseña actualizada exitosamente' });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Usuarios] Error al cambiar contraseña:', error);
    }
    res.status(500).json({ exito: false, mensaje: 'Error al cambiar la contraseña' });
  }
};
