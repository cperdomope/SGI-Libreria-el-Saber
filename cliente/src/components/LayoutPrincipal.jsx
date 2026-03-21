// =====================================================
// COMPONENTE: LayoutPrincipal
// =====================================================
// Es la estructura visual que envuelve cada pagina privada:
//   - Arriba: BarraNavegacion (navbar)
//   - Centro: El contenido de la pagina (children)
//   - Abajo: Footer con copyright
//
// min-vh-100 + flex hacen que el footer siempre
// quede al final de la pantalla (sticky footer con flexbox)
//
// Se usa en App.jsx para envolver cada pagina:
//   <LayoutPrincipal>
//     <Inventario />
//   </LayoutPrincipal>
// =====================================================

import React from 'react';
import BarraNavegacion from './BarraNavegacion';

const LayoutPrincipal = ({ children }) => {
  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Barra de navegacion (menu superior) */}
      <BarraNavegacion />

      {/* Contenido principal de la pagina */}
      <main className="flex-grow-1">
        {children}
      </main>

      {/* Footer (pie de pagina) */}
      <footer className="bg-light text-center p-3 mt-auto border-top">
        <small className="text-muted">
          &copy; 2026 SGI Libreria el Saber - Proyecto SENA
        </small>
      </footer>
    </div>
  );
};

export default LayoutPrincipal;
