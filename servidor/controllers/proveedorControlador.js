// =====================================================
// CONTROLADOR DE PROVEEDORES
// =====================================================
// Este archivo gestiona el catálogo de proveedores de la librería.
//
// ¿Qué es un proveedor en este sistema?
// Son las empresas o distribuidoras que nos venden los libros.
// Cuando registramos una ENTRADA de inventario (llega mercancía),
// debemos indicar de qué proveedor vino y a qué costo.
// Esto permite llevar el control de compras por proveedor.
//
// Tabla: mdc_proveedores
// Campos principales:
//   - nombre_empresa: razón social (obligatorio)
//   - nit: número de identificación tributaria
//   - nombre_contacto: persona a quien llamar
//   - email, telefono, direccion: datos de contacto
//
// Relación: mdc_movimientos.proveedor_id → mdc_proveedores.id

// "El módulo de proveedores registra las empresas de las que
//  compramos los libros. Cada vez que hacemos una entrada de
//  inventario, queda registrado el proveedor y el costo de compra,
//  lo que permite analizar el historial de compras por proveedor."
// =====================================================

// Conexion al pool de base de datos MySQL
const db = require('../config/db');

// ─────────────────────────────────────────────────────────
// HELPER: Normalizar y validar campos opcionales del proveedor
// ─────────────────────────────────────────────────────────
// Extraemos esta logica en una funcion aparte porque se usa
// tanto en crearProveedor como en actualizarProveedor.
// Principio DRY (Don't Repeat Yourself): si la misma logica
// aparece en dos lugares, la centralizamos en una funcion.
// Asi, si cambiamos una regla (ej: permitir telefonos de 7 digitos),
// solo lo hacemos en UN lugar.
//
// Retorna: { valido: true, datos: {...} } si todo esta bien
//          { valido: false, mensaje: '...' } si hay un error
function normalizarCamposProveedor({ nit, nombre_contacto, email, telefono, direccion }) {

  // NIT y nombre_contacto: solo trim (eliminar espacios sobrantes)
  const nitNorm = nit && nit.trim() !== '' ? nit.trim() : null;
  const contactoNorm = nombre_contacto && nombre_contacto.trim() !== '' ? nombre_contacto.trim() : null;

  // Email: trim + lowercase + validacion de formato basico
  let emailNorm = null;
  if (email && email.trim() !== '') {
    emailNorm = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailNorm)) {
      return { valido: false, mensaje: 'El formato del email no es valido' };
    }
  }

  // Telefono: eliminar caracteres de formato + validar solo digitos + exactamente 10
  let telefonoNorm = null;
  if (telefono && telefono.trim() !== '') {
    telefonoNorm = telefono.replace(/[\s\-\(\)\.]/g, '');
    if (!/^\d+$/.test(telefonoNorm)) {
      return { valido: false, mensaje: 'El telefono solo debe contener numeros' };
    }
    if (telefonoNorm.length !== 10) {
      return { valido: false, mensaje: 'El telefono debe tener exactamente 10 digitos' };
    }
  }

  // Direccion: solo trim
  const direccionNorm = direccion && direccion.trim() !== '' ? direccion.trim() : null;

  return {
    valido: true,
    datos: {
      nit:              nitNorm,
      nombre_contacto:  contactoNorm,
      email:            emailNorm,
      telefono:         telefonoNorm,
      direccion:        direccionNorm
    }
  };
}

// =====================================================
// CONTROLADOR 1: LISTAR TODOS LOS PROVEEDORES
// =====================================================
// Ruta: GET /api/proveedores
// Devuelve todos los proveedores ordenados por nombre de empresa.
// Se usa para llenar el selector de proveedores al registrar
// una entrada de inventario en el módulo de movimientos.
exports.obtenerProveedores = async (req, res) => {
  try {
    // Traemos todos los campos del proveedor para mostrar información completa
    const [proveedores] = await db.query(
      `SELECT id, nombre_empresa, nit, nombre_contacto, email, telefono, direccion, fecha_registro
       FROM mdc_proveedores
       ORDER BY nombre_empresa ASC`
    );

    res.json({
      exito: true,
      datos:  proveedores,
      total:  proveedores.length
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Proveedores] Error al listar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al obtener los proveedores',
      codigo:  'PROVEEDORES_LIST_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 2: CREAR UN NUEVO PROVEEDOR
// =====================================================
// Ruta: POST /api/proveedores
// Solo el nombre de la empresa es obligatorio.
// El resto de campos (NIT, contacto, email, teléfono, dirección)
// son opcionales y se guardan como NULL si no se envían.
exports.crearProveedor = async (req, res) => {
  const { nombre_empresa, nit, nombre_contacto, email, telefono, direccion } = req.body;

  // El nombre de la empresa es el unico campo indispensable
  if (!nombre_empresa || nombre_empresa.trim() === '') {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El nombre de la empresa es obligatorio'
    });
  }

  // Normalizamos y validamos los campos opcionales con el helper
  const resultado_norm = normalizarCamposProveedor({ nit, nombre_contacto, email, telefono, direccion });
  if (!resultado_norm.valido) {
    return res.status(400).json({ exito: false, mensaje: resultado_norm.mensaje });
  }

  const { nit: nitNorm, nombre_contacto: contactoNorm, email: emailNorm,
          telefono: telefonoNorm, direccion: direccionNorm } = resultado_norm.datos;

  try {
    // Insertamos el proveedor. Los campos opcionales van como NULL si no se enviaron.
    // NULL en la BD es preferible a texto vacio para campos opcionales,
    // porque permite filtrar facilmente "proveedores sin email" con IS NULL.
    const [resultado] = await db.query(
      `INSERT INTO mdc_proveedores
       (nombre_empresa, nit, nombre_contacto, email, telefono, direccion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nombre_empresa.trim(),
        nitNorm,
        contactoNorm,
        emailNorm,
        telefonoNorm,
        direccionNorm
      ]
    );

    res.status(201).json({
      exito:   true,
      mensaje: 'Proveedor creado exitosamente',
      datos: {
        id:             resultado.insertId,
        nombre_empresa: nombre_empresa.trim()
      }
    });

  } catch (error) {
    // Si hubiera restricciones UNIQUE en el NIT, capturamos el error aquí
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        exito:   false,
        mensaje: 'Ya existe un proveedor con esos datos',
        codigo:  'PROVEEDOR_DUPLICADO'
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('[Proveedores] Error al crear:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al crear el proveedor',
      codigo:  'PROVEEDOR_CREATE_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 3: ACTUALIZAR UN PROVEEDOR
// =====================================================
// Ruta: PUT /api/proveedores/:id
// Permite corregir o completar los datos de un proveedor.
// Solo el nombre de la empresa es obligatorio.
exports.actualizarProveedor = async (req, res) => {
  // El middleware validarParametroId ya verifico que el ID sea un numero valido
  const { id } = req.params;
  const { nombre_empresa, nit, nombre_contacto, email, telefono, direccion } = req.body;

  // El nombre de la empresa sigue siendo obligatorio al actualizar
  if (!nombre_empresa || nombre_empresa.trim() === '') {
    return res.status(400).json({
      exito:   false,
      mensaje: 'El nombre de la empresa es obligatorio'
    });
  }

  // Reutilizamos el helper de normalizacion (principio DRY)
  const resultado_norm = normalizarCamposProveedor({ nit, nombre_contacto, email, telefono, direccion });
  if (!resultado_norm.valido) {
    return res.status(400).json({ exito: false, mensaje: resultado_norm.mensaje });
  }

  const { nit: nitNorm, nombre_contacto: contactoNorm, email: emailNorm,
          telefono: telefonoNorm, direccion: direccionNorm } = resultado_norm.datos;

  try {
    // Actualizamos todos los campos del proveedor
    const [resultado] = await db.query(
      `UPDATE mdc_proveedores
       SET nombre_empresa = ?, nit = ?, nombre_contacto = ?,
           email = ?, telefono = ?, direccion = ?
       WHERE id = ?`,
      [
        nombre_empresa.trim(),
        nitNorm,
        contactoNorm,
        emailNorm,
        telefonoNorm,
        direccionNorm,
        id
      ]
    );

    // Si no se actualizó ninguna fila, el proveedor no existe
    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        exito:   false,
        mensaje: 'Proveedor no encontrado',
        codigo:  'PROVEEDOR_NOT_FOUND'
      });
    }

    res.json({
      exito:   true,
      mensaje: 'Proveedor actualizado correctamente'
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Proveedores] Error al actualizar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al actualizar el proveedor',
      codigo:  'PROVEEDOR_UPDATE_ERROR'
    });
  }
};

// =====================================================
// CONTROLADOR 4: ELIMINAR UN PROVEEDOR
// =====================================================
// Ruta: DELETE /api/proveedores/:id
// No se puede eliminar un proveedor que tenga movimientos
// de inventario registrados (la BD protege esto con FK).
//
// ¿Por qué no podemos borrar un proveedor con historial?
// Porque los movimientos de entrada guardan el proveedor_id.
// Si borramos el proveedor, esos movimientos quedarían
// con una referencia inválida (ID que ya no existe).
// La FK de la BD impide esto automáticamente.

// "La restricción de clave foránea en mdc_movimientos
//  impide borrar un proveedor que haya participado en
//  entradas de inventario, preservando la trazabilidad
//  del historial de compras."
exports.eliminarProveedor = async (req, res) => {
  // El middleware validarParametroId ya verifico que el ID sea un numero valido
  const { id } = req.params;

  try {
    const [resultado] = await db.query(
      'DELETE FROM mdc_proveedores WHERE id = ?',
      [id]
    );

    if (resultado.affectedRows === 0) {
      return res.status(404).json({
        exito:   false,
        mensaje: 'Proveedor no encontrado',
        codigo:  'PROVEEDOR_NOT_FOUND'
      });
    }

    res.json({
      exito:   true,
      mensaje: 'Proveedor eliminado correctamente'
    });

  } catch (error) {
    // MySQL lanza ER_ROW_IS_REFERENCED_2 cuando intentamos borrar
    // un proveedor que está referenciado en mdc_movimientos.
    if (error.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        exito:   false,
        mensaje: 'No se puede eliminar: el proveedor tiene registros relacionados',
        codigo:  'PROVEEDOR_CON_REGISTROS'
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('[Proveedores] Error al eliminar:', error);
    }
    res.status(500).json({
      exito:   false,
      mensaje: 'Error al eliminar el proveedor',
      codigo:  'PROVEEDOR_DELETE_ERROR'
    });
  }
};