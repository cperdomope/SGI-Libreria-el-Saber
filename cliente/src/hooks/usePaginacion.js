// =====================================================
// HOOK PERSONALIZADO: usePaginacion
// =====================================================
// Este hook reutilizable implementa la logica de paginacion para
// dividir listas largas de datos en paginas mas pequenas, similar
// a como Google divide los resultados de busqueda en paginas de 10.
//
// Que es un Hook personalizado en React?
//   Es una funcion que empieza con "use" y encapsula logica
//   reutilizable que incluye otros hooks de React (useState,
//   useMemo, useCallback, etc.). Permite extraer logica compleja
//   de los componentes y compartirla entre multiples paginas
//   sin duplicar codigo. Es la alternativa moderna a los mixins
//   y HOCs (Higher-Order Components) de versiones anteriores de React.
//
// Sin este hook, cada pagina que muestra una tabla (Inventario,
// Clientes, Proveedores, HistorialVentas) tendria que repetir
// toda la logica de calcular paginas, cortar arrays y navegar.
// Con el hook, cada pagina solo escribe una linea:
//   const { datosPaginados, ...controles } = usePaginacion(datos, 10);
//
// Parametros que recibe:
//   - items: array completo de datos (ej: 100 libros)
//   - elementosPorPagina: cuantos mostrar por pagina (por defecto 10)
//
// Valores que retorna (objeto desestructurable):
//   - datosPaginados: subarray con solo los items de la pagina actual
//   - paginaActual: numero de la pagina actual (1, 2, 3...)
//   - totalPaginas: cantidad total de paginas calculadas
//   - irAPagina: funcion para saltar a una pagina especifica
//   - paginaAnterior: funcion para retroceder una pagina
//   - paginaSiguiente: funcion para avanzar una pagina
//   - resetear: funcion para volver a la pagina 1
// =====================================================

// Importamos solo los hooks que necesitamos de React:
//   - useState: para mantener el estado de la pagina actual
//   - useMemo: para memorizar calculos costosos (cortar el array)
//   - useCallback: para memorizar funciones de navegacion
import { useState, useMemo, useCallback } from 'react';


// =====================================================
// FUNCION PRINCIPAL DEL HOOK
// =====================================================
// Un hook personalizado es simplemente una funcion de JavaScript
// que usa hooks de React internamente. Al llamarla desde un
// componente, React "conecta" los hooks internos al ciclo de
// vida de ese componente. Por eso DEBE llamarse dentro de un
// componente funcional o de otro hook (nunca en funciones normales,
// condicionales o bucles).

const usePaginacion = (items, elementosPorPagina = 10) => {

  // Estado: numero de la pagina actual.
  // Empieza en 1 (no en 0) porque para el usuario las paginas
  // se numeran desde 1 naturalmente.
  const [paginaActual, setPaginaActual] = useState(1);


  // ---------------------------------------------------------
  // CALCULO DEL TOTAL DE PAGINAS
  // ---------------------------------------------------------
  // Calculamos totalPaginas con useMemo para reutilizarlo en las
  // funciones de navegacion sin recalcular cada vez.
  //
  // Math.ceil() redondea hacia ARRIBA. Esto es necesario porque
  // si hay 25 items y mostramos 10 por pagina:
  //   25 / 10 = 2.5 -> Math.ceil(2.5) = 3 paginas
  //   (pagina 1: 10 items, pagina 2: 10 items, pagina 3: 5 items)
  //
  // Math.max(1, ...) garantiza que siempre haya al menos 1 pagina,
  // incluso si el array esta vacio. Sin esto, una lista vacia
  // mostraria 0 paginas, lo cual es confuso en la interfaz.
  const totalPaginas = useMemo(() =>
    Math.max(1, Math.ceil(items.length / elementosPorPagina)),
    [items.length, elementosPorPagina]
  );


  // ---------------------------------------------------------
  // CALCULO DE LOS DATOS DE LA PAGINA ACTUAL
  // ---------------------------------------------------------
  // useMemo memoriza el resultado de un calculo y solo lo recalcula
  // cuando cambian las dependencias [items, paginaActual, elementosPorPagina].
  // Esto evita recortar el array en cada render del componente padre,
  // lo cual seria ineficiente con listas grandes.
  //
  // La logica usa Array.slice(inicio, fin) que extrae una porcion
  // del array SIN modificar el original (es "inmutable").
  //
  // Ejemplo con 25 items y 10 por pagina:
  //   Pagina 1: inicio = (1-1)*10 = 0,  fin = 0+10 = 10  -> items[0..9]
  //   Pagina 2: inicio = (2-1)*10 = 10, fin = 10+10 = 20  -> items[10..19]
  //   Pagina 3: inicio = (3-1)*10 = 20, fin = 20+10 = 30  -> items[20..24]
  //
  // NOTA: .slice() no da error si 'fin' excede el largo del array;
  // simplemente retorna hasta donde haya datos. Por eso la pagina 3
  // retorna 5 items aunque le pedimos hasta el indice 30.
  const datosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * elementosPorPagina;
    return items.slice(inicio, inicio + elementosPorPagina);
  }, [items, paginaActual, elementosPorPagina]);


  // ---------------------------------------------------------
  // FUNCIONES DE NAVEGACION ENTRE PAGINAS
  // ---------------------------------------------------------
  // useCallback memoriza cada funcion para que React no la recree
  // en cada render. Esto es importante porque estas funciones se
  // pasan como props a los botones de paginacion en la UI, y si
  // cambian de referencia en cada render, esos botones se
  // re-renderizan innecesariamente.
  //
  // NOTA sobre el patron de actualizacion funcional:
  //   setPaginaActual(p => ...) en lugar de setPaginaActual(valor)
  //   La forma funcional recibe el valor ACTUAL del estado como
  //   argumento (p). Esto es mas seguro cuando el nuevo valor
  //   depende del anterior, porque React agrupa (batches) las
  //   actualizaciones de estado y el valor "directo" podria
  //   estar desactualizado.

  // Saltar a una pagina especifica (con validacion de limites).
  // Si la pagina solicitada esta fuera del rango [1, totalPaginas],
  // mantiene la pagina actual sin cambios.
  const irAPagina = useCallback((pagina) => {
    setPaginaActual(p => (pagina >= 1 && pagina <= totalPaginas) ? pagina : p);
  }, [totalPaginas]);

  // Retroceder una pagina. Math.max(1, ...) evita que baje de 1.
  const paginaAnterior = useCallback(() =>
    setPaginaActual(p => Math.max(1, p - 1)),
    []
  );

  // Avanzar una pagina. Math.min(totalPaginas, ...) evita que
  // supere la ultima pagina. Sin esta validacion, el usuario
  // podria navegar a paginas inexistentes que mostrarian una
  // tabla vacia con un numero de pagina invalido.
  const paginaSiguiente = useCallback(() =>
    setPaginaActual(p => Math.min(totalPaginas, p + 1)),
    [totalPaginas]
  );

  // Volver a la pagina 1. Se usa cuando el usuario aplica un
  // filtro de busqueda o cambia criterios de ordenamiento, ya que
  // los resultados filtrados podrian tener menos paginas y la
  // pagina actual podria quedar fuera de rango.
  const resetear = useCallback(() => setPaginaActual(1), []);


  // ---------------------------------------------------------
  // RETORNO DEL HOOK
  // ---------------------------------------------------------
  // Retornamos un objeto con todos los datos y funciones que el
  // componente necesita. Al ser un objeto, el componente puede
  // desestructurar solo lo que necesite:
  //   const { datosPaginados, totalPaginas } = usePaginacion(datos);
  //
  // Este patron se llama "return object" y es el estandar para
  // hooks que retornan multiples valores. La alternativa seria
  // retornar un array (como useState), pero con tantos valores
  // un objeto con nombres es mas legible y flexible.
  return {
    datosPaginados,
    paginaActual,
    totalPaginas,
    irAPagina,
    paginaAnterior,
    paginaSiguiente,
    resetear
  };
};

// export default para importar sin llaves:
//   import usePaginacion from '../hooks/usePaginacion';
export default usePaginacion;
