// =====================================================
// HOOK PERSONALIZADO: usePaginacion
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Es un "hook" reutilizable que divide una lista larga
//   en páginas más pequeñas (como las páginas de Google).
//   En vez de mostrar 100 registros de golpe, muestra
//   10 por página y permite navegar entre ellas.
//
// ¿Cómo se conecta con el sistema?
//   Lo usan las páginas que muestran tablas con muchos datos:
//   Inventario, Clientes, Proveedores, HistorialVentas, etc.
//
// ¿Qué es un Hook en React?
//   Un hook es una función especial que empieza con "use"
//   y permite reutilizar lógica entre componentes.
//   En vez de repetir el código de paginación en cada página,
//   lo escribimos UNA VEZ aquí y lo importamos donde se necesite.
//
// Ejemplo de uso:
//   const { datosPaginados, paginaActual, totalPaginas } = usePaginacion(listaCompleta, 10);
//
// =====================================================

import { useState, useMemo, useCallback } from 'react';

// ─────────────────────────────────────────────────────
// FUNCIÓN PRINCIPAL DEL HOOK
// ─────────────────────────────────────────────────────
// Recibe:
//   - items: el array completo de datos (ej: 100 libros)
//   - elementosPorPagina: cuántos mostrar por página (por defecto 10)
// Devuelve:
//   - datosPaginados: solo los items de la página actual
//   - paginaActual: número de la página actual (1, 2, 3...)
//   - totalPaginas: cuántas páginas hay en total
//   - irAPagina: función para saltar a una página específica
//   - paginaAnterior: función para ir a la página anterior
//   - paginaSiguiente: función para ir a la página siguiente
//   - resetear: función para volver a la página 1

const usePaginacion = (items, elementosPorPagina = 10) => {

  // Estado: en qué página estamos actualmente (empieza en 1)
  const [paginaActual, setPaginaActual] = useState(1);

  // ─────────────────────────────────────────────────────
  // CÁLCULO DE DATOS PAGINADOS
  // ─────────────────────────────────────────────────────
  // useMemo memoriza el resultado para no recalcular en cada render.
  // Solo recalcula si cambian: items, paginaActual o elementosPorPagina.
  //
  // Ejemplo con 25 items y 10 por página:
  //   Página 1: items[0..9]   → inicio=0,  fin=10
  //   Página 2: items[10..19] → inicio=10, fin=20
  //   Página 3: items[20..24] → inicio=20, fin=30 (slice corta en 25)
  const { datosPaginados, totalPaginas } = useMemo(() => {
    const inicio = (paginaActual - 1) * elementosPorPagina;
    return {
      datosPaginados: items.slice(inicio, inicio + elementosPorPagina),
      totalPaginas: Math.max(1, Math.ceil(items.length / elementosPorPagina))
    };
  }, [items, paginaActual, elementosPorPagina]);

  // ─────────────────────────────────────────────────────
  // FUNCIONES DE NAVEGACIÓN
  // ─────────────────────────────────────────────────────
  // useCallback memoriza las funciones para evitar re-renders innecesarios.

  // Saltar a una página específica (con validación de límites)
  const irAPagina = useCallback((pagina) => {
    setPaginaActual(p => {
      const max = Math.max(1, Math.ceil(items.length / elementosPorPagina));
      // Solo cambia si la página solicitada está dentro del rango válido
      return pagina >= 1 && pagina <= max ? pagina : p;
    });
  }, [items.length, elementosPorPagina]);

  // Ir a la página anterior (mínimo página 1)
  const paginaAnterior  = useCallback(() => setPaginaActual(p => Math.max(1, p - 1)), []);

  // Ir a la siguiente página
  const paginaSiguiente = useCallback(() => setPaginaActual(p => p + 1), []);

  // Volver a la primera página (útil al buscar o filtrar)
  const resetear        = useCallback(() => setPaginaActual(1), []);

  // Devolvemos todo lo que el componente necesita para mostrar la paginación
  return { datosPaginados, paginaActual, totalPaginas, irAPagina, paginaAnterior, paginaSiguiente, resetear };
};

export default usePaginacion;