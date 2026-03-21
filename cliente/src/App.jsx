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

// RutaProtegida: verifica si hay sesión activa (si no, redirige a /acceso)
import RutaProtegida from './components/RutaProtegida';
// RutaProtegidaPorRol: verifica si el usuario tiene el permiso necesario
import RutaProtegidaPorRol from './components/RutaProtegidaPorRol';
// LayoutPrincipal: estructura visual (navbar + contenido + footer)
import LayoutPrincipal from './components/LayoutPrincipal';

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

// =====================================================
// IMPORTACIÓN DEL CONTEXTO DE AUTENTICACIÓN
// =====================================================
// AuthProvider: envuelve toda la app para que cualquier
// componente pueda acceder al usuario y sus permisos
// useAuth: hook para consumir el contexto

import { AuthProvider } from './context/AuthContext';

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