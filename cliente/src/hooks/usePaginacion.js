import { useState, useMemo, useCallback } from 'react';

/**
 * Hook personalizado para paginación de listas.
 *
 * @param {Array} items - Array completo de datos a paginar
 * @param {number} [elementosPorPagina=10] - Cuántos items por página
 * @returns {{
 *   datosPaginados: Array,
 *   paginaActual: number,
 *   totalPaginas: number,
 *   irAPagina: Function,
 *   paginaAnterior: Function,
 *   paginaSiguiente: Function,
 *   resetear: Function
 * }}
 */
const usePaginacion = (items, elementosPorPagina = 10) => {
  const [paginaActual, setPaginaActual] = useState(1);

  const { datosPaginados, totalPaginas } = useMemo(() => {
    const inicio = (paginaActual - 1) * elementosPorPagina;
    return {
      datosPaginados: items.slice(inicio, inicio + elementosPorPagina),
      totalPaginas: Math.max(1, Math.ceil(items.length / elementosPorPagina))
    };
  }, [items, paginaActual, elementosPorPagina]);

  const irAPagina = useCallback((pagina) => {
    setPaginaActual(p => {
      const max = Math.max(1, Math.ceil(items.length / elementosPorPagina));
      return pagina >= 1 && pagina <= max ? pagina : p;
    });
  }, [items.length, elementosPorPagina]);

  const paginaAnterior  = useCallback(() => setPaginaActual(p => Math.max(1, p - 1)), []);
  const paginaSiguiente = useCallback(() => setPaginaActual(p => p + 1), []);
  const resetear        = useCallback(() => setPaginaActual(1), []);

  return { datosPaginados, paginaActual, totalPaginas, irAPagina, paginaAnterior, paginaSiguiente, resetear };
};

export default usePaginacion;