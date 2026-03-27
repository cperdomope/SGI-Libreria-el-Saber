// =====================================================
// MIDDLEWARE: VERIFICACIÓN DE ROL (RBAC)
// =====================================================
// RBAC = Role-Based Access Control = Control de Acceso Basado en Roles.
// Es un modelo de seguridad donde los permisos no se asignan a personas,
// sino a ROLES, y las personas tienen roles asignados.
//
// En este sistema hay dos roles:
//   Administrador (rol_id = 1): acceso total
//   Vendedor      (rol_id = 2): acceso limitado (ventas y consultas)
//
// Este archivo se ejecuta DESPUÉS de verificarToken.
// verificarToken ya confirmó que el usuario está autenticado
// y llenó req.usuario con sus datos (incluyendo req.usuario.rol).
// Este middleware usa ese rol para decidir si tiene permisos.
//
// Ejemplo del flujo completo:
//   verificarToken → soloAdministrador → controlador.eliminarUsuario
//   (¿quién eres?)   (¿tienes permiso?) (haz la operación)
//
// PATRÓN "FACTORY FUNCTION":
// verificarRol() no es el middleware directamente.
// Es una función que DEVUELVE el middleware ya configurado.
// Esto permite crear variantes (soloAdmin, adminOVendedor)
// sin repetir código.

// "Implementamos RBAC con una factory function: verificarRol([roles])
//  recibe un arreglo de IDs de roles permitidos y devuelve el middleware
//  ya configurado. Los presets soloAdministrador y administradorOVendedor
//  son instancias predefinidas de esa función para los dos casos de uso
//  más comunes del sistema."
// =====================================================

// ─────────────────────────────────────────────────────────
// CONSTANTES DE ROLES
// ─────────────────────────────────────────────────────────
// Los IDs de roles deben coincidir con los registros
// de la tabla mdc_roles en la base de datos.
// Usar constantes en lugar de números "mágicos" hace el código
// más legible: soloAdministrador es más claro que verificarRol([1]).
const ROLES = {
  ADMINISTRADOR: 1,  // Acceso total: inventario, usuarios, ventas, reportes
  VENDEDOR: 2        // Acceso parcial: crear ventas, consultar catálogo
};

// ─────────────────────────────────────────────────────────
// FACTORY FUNCTION: verificarRol
// ─────────────────────────────────────────────────────────
// Recibe un arreglo de IDs de roles que pueden pasar el filtro.
// Devuelve una función middleware lista para usar en rutas.
//
// Ejemplo de uso directo (sin presets):
//   router.delete('/algo', verificarToken, verificarRol([ROLES.ADMINISTRADOR]), ctrl.eliminar);
//
// El parámetro rolesPermitidos se "recuerda" en el closure
// gracias a la función interna que se devuelve.
const verificarRol = (rolesPermitidos) => {

  // Esta es la función que Express ejecutará como middleware
  return (req, res, next) => {

    // ─────────────────────────────────────────────────
    // VALIDACIÓN 1: ¿verificarToken corrió antes?
    // req.usuario lo establece verificarToken. Si no existe,
    // alguien usó este middleware sin verificarToken primero,
    // lo cual es un error de programación (no del usuario).
    // ─────────────────────────────────────────────────
    if (!req.usuario) {
      return res.status(401).json({
        error: 'No autenticado',
        mensaje: 'Debe iniciar sesión para acceder a este recurso',
        codigo: 'NOT_AUTHENTICATED'
      });
    }

    // ─────────────────────────────────────────────────
    // VALIDACIÓN 2: ¿El rol del usuario está en la lista permitida?
    // req.usuario.rol viene del payload del token JWT,
    // que se llenó en el login con el rol real de la BD.
    // includes() busca si el rol del usuario está en el arreglo.
    // ─────────────────────────────────────────────────
    const rolUsuario = req.usuario.rol;

    if (!rolesPermitidos.includes(rolUsuario)) {
      // En desarrollo, registramos en consola quién intentó qué.
      // En producción omitimos esto para no saturar los logs.
      // Esto sirve para auditar accesos indebidos durante el desarrollo.
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[RBAC] Acceso denegado - Usuario: ${req.usuario.id} ` +
          `(Rol: ${rolUsuario}) -> ${req.method} ${req.originalUrl}`
        );
      }

      // 403 = "Prohibido" (sí está autenticado, pero no tiene permiso)
      // Diferente de 401 que significa "no autenticado".
      return res.status(403).json({
        error: 'Acceso denegado',
        mensaje: 'No tiene permisos suficientes para realizar esta acción',
        codigo: 'FORBIDDEN'
      });
    }

    // ─────────────────────────────────────────────────
    // AUTORIZADO: el usuario tiene el rol adecuado.
    // Pasamos al siguiente middleware o controlador.
    // ─────────────────────────────────────────────────
    next();
  };
};

// ─────────────────────────────────────────────────────────
// PRESETS (MIDDLEWARES LISTOS PARA USAR)
// ─────────────────────────────────────────────────────────
// En lugar de escribir verificarRol([ROLES.ADMINISTRADOR]) en cada ruta,
// creamos atajos con nombres descriptivos.
// Son el resultado de invocar verificarRol() de antemano.

// Solo permite paso a usuarios con rol Administrador (rol_id = 1).
// Se usa en operaciones críticas: CRUD de usuarios, eliminar registros,
// anular ventas, configurar el sistema.
const soloAdministrador = verificarRol([ROLES.ADMINISTRADOR]);

// Permite paso a Administradores Y Vendedores (rol_id 1 o 2).
// Se usa en operaciones del día a día: ver inventario, crear ventas,
// consultar clientes, ver historial.
const administradorOVendedor = verificarRol([ROLES.ADMINISTRADOR, ROLES.VENDEDOR]);

// ─────────────────────────────────────────────────────────
// EXPORTACIONES
// ─────────────────────────────────────────────────────────
// Exportamos todo para que las rutas puedan importar
// exactamente lo que necesiten con destructuring:
//   const { soloAdministrador } = require('../middlewares/verificarRol');
module.exports = {
  verificarRol,           // Factory function para roles personalizados en el futuro
  soloAdministrador,      // Preset: solo admins
  administradorOVendedor, // Preset: admins y vendedores
  ROLES                   // Constantes de roles (por si algún controlador las necesita)
};