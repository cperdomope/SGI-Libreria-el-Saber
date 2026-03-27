// =====================================================
// COMPONENTE: LayoutPrincipal
// =====================================================
// Este componente implementa el patron de diseno "Layout" (disposicion),
// que define la estructura visual comun para TODAS las paginas privadas
// del sistema. En lugar de repetir el navbar y el footer en cada pagina,
// los definimos una sola vez aqui y envolvemos el contenido variable.
//
// Estructura visual que genera:
//   +--------------------------------------+
//   |         BarraNavegacion (navbar)     |  <- Fija arriba
//   +--------------------------------------+
//   |                                      |
//   |     Contenido de la pagina           |  <- Cambia segun la ruta
//   |     (children)                       |
//   |                                      |
//   +--------------------------------------+
//   |         Footer (pie de pagina)       |  <- Siempre al fondo
//   +--------------------------------------+
//
// Como se usa en App.jsx:
//   <LayoutPrincipal>
//     <Inventario />     <-- esto es "children"
//   </LayoutPrincipal>
//
// Conceptos aplicados:
//   - Props "children": propiedad especial de React que contiene
//     todo lo que se coloque entre las etiquetas del componente.
//   - Sticky Footer con Flexbox: tecnica CSS donde el footer siempre
//     queda al fondo de la pantalla, incluso si el contenido es corto.
// =====================================================

// BarraNavegacion: el menu de navegacion superior del sistema.
// Se renderiza en la parte superior de todas las paginas.
import BarraNavegacion from './BarraNavegacion';

// ─────────────────────────────────────────────────────
// COMPONENTE FUNCIONAL: LayoutPrincipal
// ─────────────────────────────────────────────────────
// Recibe { children } como prop. "children" es una prop especial
// de React que contiene automaticamente todo lo que se coloque
// DENTRO de las etiquetas del componente al usarlo. Por ejemplo:
//
//   <LayoutPrincipal>
//     <Inventario />       <-- esto es children
//   </LayoutPrincipal>
//
// Es como un "hueco" o "slot" donde se inserta contenido variable
// dentro de una estructura fija. Este patron permite reutilizar
// el layout sin duplicar codigo en cada pagina.

const LayoutPrincipal = ({ children }) => {
  return (
    // ── CONTENEDOR PRINCIPAL ──
    // Usamos Flexbox (d-flex flex-column) para organizar los tres
    // bloques verticalmente: navbar, contenido y footer.
    //
    // "min-vh-100" = altura minima del 100% del viewport (pantalla).
    // Esto asegura que el contenedor siempre ocupe al menos toda
    // la pantalla, lo cual es clave para el "sticky footer".
    //
    // STICKY FOOTER: Tecnica CSS para que el footer siempre aparezca
    // al fondo de la pagina. Funciona asi:
    //   1. El contenedor tiene min-height: 100vh (toda la pantalla)
    //   2. El <main> tiene flex-grow: 1 (ocupa todo el espacio libre)
    //   3. El footer tiene mt-auto (margen superior automatico)
    // Resultado: si el contenido es corto, <main> se expande y
    // empuja el footer al fondo. Si el contenido es largo, el
    // footer queda naturalmente despues del contenido.
    <div className="d-flex flex-column min-vh-100">

      {/* Barra de navegacion (menu superior) */}
      <BarraNavegacion />

      {/* ── CONTENIDO PRINCIPAL ──
          La etiqueta <main> es una etiqueta semantica de HTML5
          que indica el contenido principal de la pagina. Usar
          etiquetas semanticas (main, nav, footer, section) mejora
          la accesibilidad y el SEO, ya que los navegadores y
          lectores de pantalla entienden la estructura de la pagina.

          "flex-grow-1" (Bootstrap) = flex-grow: 1 en CSS.
          Le indica a este elemento que crezca para ocupar todo
          el espacio vertical disponible entre el navbar y el footer. */}
      <main className="flex-grow-1">
        {children}
      </main>

      {/* ── FOOTER (PIE DE PAGINA) ──
          "bg-light": fondo gris claro de Bootstrap.
          "mt-auto": margen superior automatico, complementa el
          sticky footer empujandolo al fondo cuando hay poco contenido.
          "border-top": linea divisoria superior.
          "&copy;" es la entidad HTML para el simbolo de copyright. */}
      <footer className="bg-light text-center p-3 mt-auto border-top">
        <small className="text-muted">
          &copy; 2026 SGI Libreria el Saber - Proyecto SENA
        </small>
      </footer>
    </div>
  );
};

// Exportamos el componente para que App.jsx pueda importarlo.
// Al ser "export default", se importa sin llaves:
//   import LayoutPrincipal from './LayoutPrincipal';
export default LayoutPrincipal;
