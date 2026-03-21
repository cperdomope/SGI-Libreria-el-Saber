// =====================================================
// ARCHIVO: App.jsx - APLICACIÓN PRINCIPAL (RAÍZ)
// =====================================================
//
// ¿Para qué sirve este archivo?
//   Es el componente RAÍZ de toda la aplicación React.
//   Aquí se define:
//   1. El sistema de RUTAS (qué página se muestra en cada URL)
//   2. La protección de rutas (autenticación + permisos)
//   3. El layout general (navbar + contenido + footer)
//
// ¿Cómo se conecta con el sistema?
//   - main.jsx renderiza <App /> como componente raíz
//   - App envuelve todo en AuthProvider (contexto de autenticación)
//   - Cada ruta pasa por 2 filtros de seguridad:
//     1. RutaProtegida → ¿hay sesión activa?
//     2. RutaProtegidaPorRol → ¿tiene el permiso necesario?
//
// Arquitectura de capas (de afuera hacia adentro):
//   AuthProvider → BrowserRouter → Routes → Route
//     → RutaProtegida → RutaProtegidaPorRol → LayoutPrincipal → Página
//
// RUTAS DEL SISTEMA:
//   PÚBLICA:
//     /acceso → Login (Acceso.jsx)
//
//   PRIVADAS (requieren autenticación):
//     /               → Dashboard (solo Admin)
//     /inventario     → Gestión de libros (todos)
//     /movimientos    → Kardex entradas/salidas (solo Admin)
//     /clientes       → Gestión de clientes (todos)
//     /ventas         → Punto de venta POS (Admin + Vendedor)
//     /historial-ventas → Consulta de ventas (Admin + Vendedor)
//     /proveedores    → Gestión de proveedores (solo Admin)
//     /autores        → Gestión de autores (todos)
//     /categorias     → Gestión de categorías (todos)
//     /admin/usuarios → CRUD de usuarios (solo Admin)
//
// =====================================================

import React from 'react';
// BrowserRouter: habilita el enrutamiento SPA (Single Page Application)
// Routes/Route: definen qué componente mostrar en cada URL
// Navigate: redirige a otra ruta (como un redirect)
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// =====================================================
// IMPORTACIÓN DE COMPONENTES
// =====================================================

// BarraNavegacion: el menú superior (navbar) que aparece en todas las páginas
import BarraNavegacion from './components/BarraNavegacion';
// RutaProtegidaPorRol: verifica si el usuario tiene el permiso necesario
import RutaProtegidaPorRol from './components/RutaProtegidaPorRol';

// =====================================================
// IMPORTACIÓN DE PÁGINAS
// =====================================================
// Cada página es un componente React independiente

import Inicio from './pages/Inicio';                    // Dashboard con gráficas
import Inventario from './pages/Inventario';            // CRUD de libros
import Movimientos from './pages/Movimientos';          // Kardex (entradas/salidas)
import PaginaClientes from './pages/PaginaClientes';    // CRUD de clientes
import PaginaVentas from './pages/PaginaVentas';        // Punto de venta (POS)
import HistorialVentas from './pages/HistorialVentas';  // Consulta de ventas
import PaginaProveedores from './pages/PaginaProveedores'; // CRUD de proveedores
import PaginaAutores from './pages/PaginaAutores';      // CRUD de autores
import PaginaCategorias from './pages/PaginaCategorias'; // CRUD de categorías
import Acceso from './pages/Acceso';                    // Login
import AdminUsuarios from './pages/AdminUsuarios';      // CRUD de usuarios

// ── PÁGINAS DE DOCUMENTACIÓN ──
import DocumentacionHistorias from './pages/DocumentacionHistorias';
import DocumentacionCriterios from './pages/DocumentacionCriterios';
import DocumentacionManualTecnico from './pages/DocumentacionManualTecnico';
import DocumentacionManualUsuario from './pages/DocumentacionManualUsuario';

// =====================================================
// IMPORTACIÓN DEL CONTEXTO DE AUTENTICACIÓN
// =====================================================
// AuthProvider: envuelve toda la app para que cualquier
// componente pueda acceder al usuario y sus permisos
// useAuth: hook para consumir el contexto

import { AuthProvider, useAuth } from './context/AuthContext';

// =====================================================
// COMPONENTE: RutaProtegida
// =====================================================
// ¿Qué hace?
//   Verifica si hay un usuario con sesión activa.
//   Si no hay sesión, redirige a /acceso (login).
//   Si está cargando (verificando token), muestra un spinner.
//
// Se usa así: <RutaProtegida><MiPagina /></RutaProtegida>

const RutaProtegida = ({ children }) => {
  const { usuario, cargando } = useAuth();

  // Mientras verifica si hay sesión, mostramos un spinner
  // Esto evita un "flash" de la página de login
  if (cargando) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
          <p className="mt-3 text-muted">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, redirigir al login
  if (!usuario) {
    return <Navigate to="/acceso" replace />;
  }

  // Si hay sesión, renderizar la página solicitada
  return children;
};

// =====================================================
// COMPONENTE: LayoutPrincipal
// =====================================================
// ¿Qué hace?
//   Es la estructura visual que envuelve cada página:
//   - Arriba: BarraNavegacion (navbar)
//   - Centro: El contenido de la página (children)
//   - Abajo: Footer con copyright
//
// Nota: min-vh-100 + flex hacen que el footer siempre
// quede al final de la pantalla (sticky footer con flexbox)

const LayoutPrincipal = ({ children }) => {
  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Barra de navegación (menú superior) */}
      <BarraNavegacion />

      {/* Contenido principal de la página */}
      <main className="flex-grow-1">
        {children}
      </main>

      {/* Footer (pie de página) */}
      <footer className="bg-light text-center p-3 mt-auto border-top">
        <small className="text-muted">
          © 2026 SGI Librería el Saber - Proyecto SENA
        </small>
      </footer>
    </div>
  );
};

// =====================================================
// COMPONENTE: App (Aplicación Principal)
// =====================================================
// Aquí se configura toda la estructura de la aplicación.
//
// Estructura de cada ruta privada:
//   <RutaProtegida>           → ¿Tiene sesión?
//     <RutaProtegidaPorRol>   → ¿Tiene el permiso?
//       <LayoutPrincipal>     → Navbar + Footer
//         <Página />          → El contenido
//       </LayoutPrincipal>
//     </RutaProtegidaPorRol>
//   </RutaProtegida>

function App() {
  return (
    // AuthProvider envuelve todo para que cualquier componente
    // pueda acceder a usuario, login(), logout(), tienePermiso()
    <AuthProvider>
      {/* BrowserRouter habilita el sistema de rutas de React */}
      <BrowserRouter>
        <Routes>

          {/* ══════════════════════════════════════════
              RUTA PÚBLICA: Login
              ══════════════════════════════════════════ */}
          <Route path="/acceso" element={<Acceso />} />

          {/* ══════════════════════════════════════════
              RUTAS PRIVADAS (con autenticación + RBAC)
              ══════════════════════════════════════════ */}

          {/* DASHBOARD - Solo Administradores
              Si un Vendedor intenta entrar, lo redirige a /ventas */}
          <Route
            path="/"
            element={
              <RutaProtegida>
                <RutaProtegidaPorRol permiso="verDashboard" redirigirA="/ventas">
                  <LayoutPrincipal>
                    <Inicio />
                  </LayoutPrincipal>
                </RutaProtegidaPorRol>
              </RutaProtegida>
            }
          />

          {/* INVENTARIO - Todos pueden ver, solo Admin puede editar */}
          <Route
            path="/inventario"
            element={
              <RutaProtegida>
                <RutaProtegidaPorRol permiso="verInventario">
                  <LayoutPrincipal>
                    <Inventario />
                  </LayoutPrincipal>
                </RutaProtegidaPorRol>
              </RutaProtegida>
            }
          />

          {/* MOVIMIENTOS (Kardex) - Solo Administradores */}
          <Route
            path="/movimientos"
            element={
              <RutaProtegida>
                <RutaProtegidaPorRol permiso="registrarMovimiento">
                  <LayoutPrincipal>
                    <Movimientos />
                  </LayoutPrincipal>
                </RutaProtegidaPorRol>
              </RutaProtegida>
            }
          />

          {/* CLIENTES - Todos los roles pueden gestionar */}
          <Route
            path="/clientes"
            element={
              <RutaProtegida>
                <RutaProtegidaPorRol permiso="verClientes">
                  <LayoutPrincipal>
                    <PaginaClientes />
                  </LayoutPrincipal>
                </RutaProtegidaPorRol>
              </RutaProtegida>
            }
          />

          {/* VENTAS (Punto de Venta POS) - Admin y Vendedores */}
          <Route
            path="/ventas"
            element={
              <RutaProtegida>
                <RutaProtegidaPorRol permiso="registrarVenta">
                  <LayoutPrincipal>
                    <PaginaVentas />
                  </LayoutPrincipal>
                </RutaProtegidaPorRol>
              </RutaProtegida>
            }
          />

          {/* HISTORIAL DE VENTAS - Admin y Vendedores */}
          <Route
            path="/historial-ventas"
            element={
              <RutaProtegida>
                <RutaProtegidaPorRol permiso="verVentas">
                  <LayoutPrincipal>
                    <HistorialVentas />
                  </LayoutPrincipal>
                </RutaProtegidaPorRol>
              </RutaProtegida>
            }
          />

          {/* PROVEEDORES - Solo Administradores */}
          <Route
            path="/proveedores"
            element={
              <RutaProtegida>
                <RutaProtegidaPorRol permiso="verProveedores">
                  <LayoutPrincipal>
                    <PaginaProveedores />
                  </LayoutPrincipal>
                </RutaProtegidaPorRol>
              </RutaProtegida>
            }
          />

          {/* AUTORES - Todos pueden ver, solo Admin puede editar */}
          <Route
            path="/autores"
            element={
              <RutaProtegida>
                <RutaProtegidaPorRol permiso="verAutores">
                  <LayoutPrincipal>
                    <PaginaAutores />
                  </LayoutPrincipal>
                </RutaProtegidaPorRol>
              </RutaProtegida>
            }
          />

          {/* CATEGORÍAS - Todos pueden ver, solo Admin puede editar */}
          <Route
            path="/categorias"
            element={
              <RutaProtegida>
                <RutaProtegidaPorRol permiso="verCategorias">
                  <LayoutPrincipal>
                    <PaginaCategorias />
                  </LayoutPrincipal>
                </RutaProtegidaPorRol>
              </RutaProtegida>
            }
          />

          {/* ADMINISTRACIÓN DE USUARIOS - Solo Administradores */}
          <Route
            path="/admin/usuarios"
            element={
              <RutaProtegida>
                <RutaProtegidaPorRol permiso="gestionarUsuarios">
                  <LayoutPrincipal>
                    <AdminUsuarios />
                  </LayoutPrincipal>
                </RutaProtegidaPorRol>
              </RutaProtegida>
            }
          />

          {/* ══════════════════════════════════════════
              RUTAS DE DOCUMENTACIÓN
              Accesibles para cualquier usuario autenticado
              ══════════════════════════════════════════ */}
          <Route
            path="/documentacion/historias"
            element={
              <RutaProtegida>
                <LayoutPrincipal>
                  <DocumentacionHistorias />
                </LayoutPrincipal>
              </RutaProtegida>
            }
          />
          <Route
            path="/documentacion/criterios"
            element={
              <RutaProtegida>
                <LayoutPrincipal>
                  <DocumentacionCriterios />
                </LayoutPrincipal>
              </RutaProtegida>
            }
          />
          <Route
            path="/documentacion/manual-tecnico"
            element={
              <RutaProtegida>
                <LayoutPrincipal>
                  <DocumentacionManualTecnico />
                </LayoutPrincipal>
              </RutaProtegida>
            }
          />
          <Route
            path="/documentacion/manual-usuario"
            element={
              <RutaProtegida>
                <LayoutPrincipal>
                  <DocumentacionManualUsuario />
                </LayoutPrincipal>
              </RutaProtegida>
            }
          />

          {/* ══════════════════════════════════════════
              RUTA CATCH-ALL (cualquier URL no definida)
              Redirige a /ventas por defecto
              ══════════════════════════════════════════ */}
          <Route path="*" element={<Navigate to="/ventas" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;