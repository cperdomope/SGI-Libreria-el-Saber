/**
 * =====================================================
 * UTILIDADES DE PAGINACIÓN
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Funciones reutilizables para implementar paginación
 * en endpoints de API de forma consistente.
 *
 * @author Equipo de Desarrollo SGI
 * @version 1.0.0
 */

/**
 * Configuración por defecto de paginación.
 * Estos valores pueden ser sobreescritos según necesidades del endpoint.
 *
 * @constant {Object}
 */
const CONFIG_PAGINACION = {
  LIMITE_DEFAULT: 20,        // Registros por página por defecto
  LIMITE_MAXIMO: 100,        // Máximo de registros permitidos por página
  PAGINA_DEFAULT: 1          // Página inicial
};

/**
 * Extrae y valida los parámetros de paginación de la query string.
 *
 * @param {Object} query - Objeto req.query de Express
 * @param {number} [query.pagina] - Número de página solicitado
 * @param {number} [query.limite] - Cantidad de registros por página
 * @returns {Object} Parámetros de paginación validados
 * @returns {boolean} return.usarPaginacion - Si se debe aplicar paginación
 * @returns {number} return.pagina - Número de página validado
 * @returns {number} return.limite - Límite de registros validado
 * @returns {number} return.offset - Offset para SQL LIMIT
 *
 * @example
 * const params = obtenerParametrosPaginacion(req.query);
 * // params = { usarPaginacion: true, pagina: 1, limite: 20, offset: 0 }
 */
const obtenerParametrosPaginacion = (query) => {
  // Determinar si se solicitó paginación
  const usarPaginacion = query.pagina || query.limite;

  // Parsear y validar parámetros
  let pagina = parseInt(query.pagina) || CONFIG_PAGINACION.PAGINA_DEFAULT;
  let limite = parseInt(query.limite) || CONFIG_PAGINACION.LIMITE_DEFAULT;

  // Validaciones de seguridad
  if (pagina < 1) pagina = 1;
  if (limite < 1) limite = CONFIG_PAGINACION.LIMITE_DEFAULT;
  if (limite > CONFIG_PAGINACION.LIMITE_MAXIMO) {
    limite = CONFIG_PAGINACION.LIMITE_MAXIMO;
  }

  // Calcular offset para SQL
  const offset = (pagina - 1) * limite;

  return {
    usarPaginacion,
    pagina,
    limite,
    offset
  };
};

/**
 * Construye el objeto de metadata de paginación para la respuesta.
 *
 * @param {number} paginaActual - Página actual
 * @param {number} limite - Registros por página
 * @param {number} totalRegistros - Total de registros en la base de datos
 * @returns {Object} Metadata de paginación
 *
 * @example
 * const metadata = construirMetadataPaginacion(1, 20, 150);
 * // metadata = {
 * //   paginaActual: 1,
 * //   registrosPorPagina: 20,
 * //   totalRegistros: 150,
 * //   totalPaginas: 8,
 * //   tieneSiguiente: true,
 * //   tieneAnterior: false
 * // }
 */
const construirMetadataPaginacion = (paginaActual, limite, totalRegistros) => {
  const totalPaginas = Math.ceil(totalRegistros / limite);

  return {
    paginaActual,
    registrosPorPagina: limite,
    totalRegistros,
    totalPaginas,
    tieneSiguiente: paginaActual < totalPaginas,
    tieneAnterior: paginaActual > 1
  };
};

/**
 * Construye una respuesta JSON paginada estandarizada.
 *
 * @param {Array} datos - Datos a enviar en la respuesta
 * @param {Object} metadata - Metadata de paginación (de construirMetadataPaginacion)
 * @returns {Object} Objeto de respuesta completo
 *
 * @example
 * const respuesta = construirRespuestaPaginada(libros, metadata);
 * res.json(respuesta);
 */
const construirRespuestaPaginada = (datos, metadata) => {
  return {
    exito: true,
    datos,
    paginacion: metadata
  };
};

/**
 * Construye una respuesta JSON sin paginación (retrocompatible).
 *
 * @param {Array} datos - Datos a enviar en la respuesta
 * @returns {Object} Objeto de respuesta completo
 *
 * @example
 * const respuesta = construirRespuestaSinPaginacion(libros);
 * res.json(respuesta);
 */
const construirRespuestaSinPaginacion = (datos) => {
  return {
    exito: true,
    datos,
    total: datos.length
  };
};

/**
 * Función helper completa que simplifica la implementación de paginación.
 * Maneja automáticamente el flujo completo: parseo, validación y construcción de respuesta.
 *
 * @async
 * @param {Object} req - Request de Express
 * @param {Function} queryFn - Función que ejecuta la query SQL
 *   - Recibe: (limite, offset) cuando hay paginación
 *   - Recibe: () cuando no hay paginación
 * @param {Function} countFn - Función que cuenta total de registros (solo para paginación)
 * @returns {Object} Objeto de respuesta listo para enviar con res.json()
 *
 * @example
 * // Uso en un controlador:
 * exports.obtenerClientes = async (req, res) => {
 *   try {
 *     const respuesta = await aplicarPaginacion(
 *       req,
 *       (limite, offset) => db.query('SELECT * FROM clientes LIMIT ? OFFSET ?', [limite, offset]),
 *       () => db.query('SELECT COUNT(*) as total FROM clientes')
 *     );
 *     res.json(respuesta);
 *   } catch (error) {
 *     // manejo de error
 *   }
 * };
 */
const aplicarPaginacion = async (req, queryFn, countFn) => {
  const params = obtenerParametrosPaginacion(req.query);

  if (params.usarPaginacion) {
    // Ejecutar query con paginación
    const [datos] = await queryFn(params.limite, params.offset);

    // Obtener total de registros
    const [[{ total }]] = await countFn();

    // Construir metadata
    const metadata = construirMetadataPaginacion(
      params.pagina,
      params.limite,
      total
    );

    return construirRespuestaPaginada(datos, metadata);
  } else {
    // Sin paginación (retrocompatible)
    const [datos] = await queryFn();
    return construirRespuestaSinPaginacion(datos);
  }
};

// =====================================================
// EXPORTACIÓN
// =====================================================

module.exports = {
  CONFIG_PAGINACION,
  obtenerParametrosPaginacion,
  construirMetadataPaginacion,
  construirRespuestaPaginada,
  construirRespuestaSinPaginacion,
  aplicarPaginacion
};
