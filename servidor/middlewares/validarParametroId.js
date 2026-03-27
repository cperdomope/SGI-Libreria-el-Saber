// =====================================================
// MIDDLEWARE: VALIDACIÓN DE PARÁMETROS ID EN LA URL
// =====================================================
// En Express, cuando una ruta tiene `:id` (por ejemplo /api/libros/:id),
// ese valor viene como texto (string) en req.params.id.
// Un atacante o un cliente defectuoso podría enviar:
//   /api/libros/abc          → no es un número
//   /api/libros/-5           → número negativo inválido
//   /api/libros/undefined    → literalmente la palabra "undefined"
//   /api/libros/0            → el ID 0 no existe en la BD
//   /api/libros/<script>     → intento de inyección
//
// Sin validación, ese valor llegaría a la consulta SQL y causaría
// errores inesperados o comportamientos extraños.
//
// Por qué un middleware y no validar en cada controlador?
// Antes de crear este middleware, la validación se repetía en
// más de 13 controladores distintos. Centralizar la lógica en
// un solo lugar sigue el principio DRY (Don't Repeat Yourself):
//   - Un solo lugar para mantener/corregir
//   - Los controladores se enfocan en la lógica de negocio,
//     no en sanitizar parámetros
//
// BONUS: Este middleware además convierte el string a número entero
// (parseInt) y guarda el resultado en req.params, para que los
// controladores reciban el ID ya parseado y listo para usar.

// "validarParametroId es un middleware reutilizable que aplica el
//  principio DRY: centraliza la validación de IDs en la URL para
//  que los controladores no tengan que repetir esa lógica.
//  Además defiende contra inyecciones en la URL y convierte
//  el string del parámetro a número entero para las consultas SQL."
// =====================================================

// ─────────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL: validarParametroId
// ─────────────────────────────────────────────────────────
// Es otra factory function (como verificarRol):
// recibe configuración y devuelve el middleware listo.
//
// Parámetros:
//   nombreParametro: nombre del param en la URL (por defecto 'id')
//   nombreEntidad:   nombre legible para el mensaje de error
//                    (ej: 'libro', 'cliente', 'usuario')
const validarParametroId = (nombreParametro = 'id', nombreEntidad = 'recurso') => {
  return (req, res, next) => {
    // Extraer el valor del parámetro de la URL.
    // Si la ruta es /api/libros/:id, req.params.id tiene el valor.
    const valor = req.params[nombreParametro];

    // ¿Existe el parámetro en la URL?
    if (!valor) {
      return res.status(400).json({
        exito: false,
        mensaje: `El parámetro '${nombreParametro}' es requerido`,
        codigo: 'PARAMETRO_FALTANTE'
      });
    }

    // Convertir el string a número entero en base 10.
    // parseInt('42', 10)    → 42     (válido)
    // parseInt('abc', 10)   → NaN   (inválido)
    // parseInt('3.14', 10)  → 3     (trunca decimales)
    // parseInt('-5', 10)    → -5    (lo rechazamos abajo)
    const id = parseInt(valor, 10);

    // ¿Es un número entero positivo?
    // isNaN detecta los que no son números (abc, undefined, etc.)
    // id <= 0 descarta ceros y negativos (no existen en la BD)
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        exito: false,
        mensaje: `ID de ${nombreEntidad} inválido. Debe ser un número entero positivo.`,
        codigo: 'ID_INVALIDO'
      });
    }

    // ─────────────────────────────────────────────────
    // GUARDAR EL ID PARSEADO EN req.params
    // Los controladores recibirán un número, no un string.
    // Así no necesitan hacer parseInt() ellos mismos.
    // ─────────────────────────────────────────────────
    req.params[nombreParametro] = id;

    // ID válido: continuar al controlador
    next();
  };
};

// ─────────────────────────────────────────────────────────
// ALIAS: validarId
// ─────────────────────────────────────────────────────────
// Atajo para el caso más común: validar el parámetro 'id'.
// En lugar de escribir validarParametroId('id', 'libro'),
// se escribe simplemente validarId('libro').
// Hace las rutas más legibles.
const validarId = (nombreEntidad = 'recurso') => {
  return validarParametroId('id', nombreEntidad);
};

// ─────────────────────────────────────────────────────────
// CASO ESPECIAL: validarMultiplesIds
// ─────────────────────────────────────────────────────────
// Para rutas que tienen más de un parámetro ID en la URL.
// Ejemplo: /ventas/:ventaId/detalles/:detalleId
// En lugar de encadenar dos middlewares, se validan ambos en uno.
//
// Uso:
//   validarMultiplesIds({ ventaId: 'venta', detalleId: 'detalle' })
//
// El objeto de configuración mapea: nombre del param → nombre de la entidad
const validarMultiplesIds = (configuracion) => {
  return (req, res, next) => {
    // Iterar sobre cada parámetro configurado
    for (const [nombreParametro, nombreEntidad] of Object.entries(configuracion)) {
      const valor = req.params[nombreParametro];

      if (!valor) {
        return res.status(400).json({
          exito: false,
          mensaje: `El parámetro '${nombreParametro}' es requerido`,
          codigo: 'PARAMETRO_FALTANTE'
        });
      }

      const id = parseInt(valor, 10);

      if (isNaN(id) || id <= 0) {
        return res.status(400).json({
          exito: false,
          mensaje: `ID de ${nombreEntidad} inválido. Debe ser un número entero positivo.`,
          codigo: 'ID_INVALIDO'
        });
      }

      // Guardar el ID parseado para este parámetro
      req.params[nombreParametro] = id;
    }

    // Todos los IDs son válidos: continuar
    next();
  };
};

// Exportamos las tres variantes para que las rutas
// puedan importar la que necesiten:
//   validarId           → para rutas con :id (el más común)
//   validarParametroId  → para rutas con un param de nombre diferente
//   validarMultiplesIds → para rutas con varios parámetros ID
module.exports = {
  validarParametroId,
  validarId,
  validarMultiplesIds
};