// =====================================================
// ARCHIVO: main.jsx - PUNTO DE ENTRADA DE LA APLICACION
// =====================================================
// Este es el PRIMER archivo que ejecuta React al iniciar.
// Su unica responsabilidad es:
//   1. Importar los estilos globales (en orden de prioridad)
//   2. Montar el componente <App /> en el DOM
//
// ¿Por que el orden de los CSS importa?
//   CSS funciona por cascada: el ultimo archivo importado
//   puede sobreescribir estilos del anterior.
//   Por eso importamos:
//     1ro: Bootstrap (base) → estilos genericos
//     2do: custom-theme.css → sobreescribe Bootstrap con nuestra paleta
//     3ro: index.css → estilos especificos (login) que tienen maxima prioridad
//
// StrictMode: herramienta de desarrollo de React que detecta
// problemas potenciales (efectos duplicados, APIs obsoletas).
// Solo se activa en desarrollo, no afecta la produccion.
// =====================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

// 1. Bootstrap: libreria CSS/JS de componentes UI (grid, botones, modales, etc.)
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// 2. Tema personalizado: sobreescribe colores y estilos de Bootstrap
//    con la paleta Evergreen & Magenta Bloom del SGI
import './styles/custom-theme.css';

// 3. Estilos del login: glassmorphism, animaciones y responsive
//    Se importa de ultimo para que tenga maxima prioridad en la cascada
import './index.css';

// createRoot: API moderna de React 18+ para montar la aplicacion.
// Reemplaza a la antigua ReactDOM.render() que ya esta deprecada.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);