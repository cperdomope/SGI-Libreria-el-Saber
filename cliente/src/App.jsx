/**
 * =====================================================
 * APLICACIÓN PRINCIPAL - REACT
 * =====================================================
 * Sistema de Gestión de Inventario - Librería
 * Proyecto SENA - Tecnólogo en ADSO
 *
 * @description Componente raíz que configura el enrutamiento
 * y la estructura general de la aplicación.
 *
 * ARQUITECTURA:
 * - AuthProvider: Contexto global de autenticación
 * - BrowserRouter: Enrutamiento SPA
 * - RutaProtegida: Requiere autenticación
 * - RutaProtegidaPorRol: Requiere permiso específico
 * - LayoutPrincipal: Navbar + contenido + footer
 *
 * FLUJO DE AUTORIZACIÓN:
 * 1. Usuario accede a una ruta
 * 2. RutaProtegida verifica si hay sesión
 * 3. RutaProtegidaPorRol verifica el permiso
 * 4. Si pasa ambas, renderiza el componente
 *
 * @author Equipo de Desarrollo SGI
 * @version 2.0.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// =====================================================
// COMPONENTES
// =====================================================

import BarraNavegacion from './components/BarraNavegacion';
import RutaProtegidaPorRol from './components/RutaProtegidaPorRol';

// =====================================================
// PÁGINAS
// =====================================================

import Inicio from './pages/Inicio';
import Inventario from './pages/Inventario';
import Movimientos from './pages/Movimientos';
import PaginaClientes from './pages/PaginaClientes';
import PaginaVentas from './pages/PaginaVentas';
import HistorialVentas from './pages/HistorialVentas';
import PaginaProveedores from './pages/PaginaProveedores';
import PaginaAutores from './pages/PaginaAutores';
import PaginaCategorias from './pages/PaginaCategorias';
import Acceso from './pages/Acceso';
import AdminUsuarios from './pages/AdminUsuarios';

// =====================================================
// CONTEXTO
// =====================================================

import { AuthProvider, useAuth } from './context/AuthContext';

// =====================================================
// COMPONENTES DE PROTECCIÓN Y LAYOUT
// =====================================================

/**
 * Componente que protege rutas que requieren autenticación.
 * Verifica si existe una sesión activa antes de renderizar.
 *
 * @param {Object} props - Props del componente
 * @param {React.ReactNode} props.children - Componente a renderizar si está autenticado
 * @returns {JSX.Element} Children o redirección a login
 *
 * @example
 * <RutaProtegida>
 *   <MiComponentePrivado />
 * </RutaProtegida>
 */
const RutaProtegida = ({ children }) => {
  const { usuario, cargando } = useAuth();

  // Mostrar loader mientras se verifica la sesión
  // Esto evita flash de contenido no autorizado
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

  // Si no hay sesión, redirigir a login
  if (!usuario) {
    return <Navigate to="/acceso" replace />;
  }

  // Usuario autenticado, renderizar contenido
  return children;
};

/**
 * Layout principal que envuelve las páginas privadas.
 * Incluye barra de navegación y footer.
 *
 * @param {Object} props - Props del componente
 * @param {React.ReactNode} props.children - Contenido de la página
 * @returns {JSX.Element} Estructura completa con navbar y footer
 */
const LayoutPrincipal = ({ children }) => {
  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Barra de navegación sticky */}
      <BarraNavegacion />

      {/* Contenido principal */}
      <main className="flex-grow-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-light text-center p-3 mt-auto border-top">
        <small className="text-muted">
          © 2026 SGI Librería el Saber - Proyecto SENA
        </small>
      </footer>
    </div>
  );
};

// =====================================================
// APLICACIÓN PRINCIPAL
// =====================================================

/**
 * Componente raíz de la aplicación.
 * Configura providers y define todas las rutas.
 *
 * RUTAS PÚBLICAS:
 * - /acceso: Página de login
 *
 * RUTAS PRIVADAS (requieren autenticación):
 * - /: Dashboard (solo Admin)
 * - /inventario: Gestión de libros
 * - /movimientos: Entradas/Salidas (solo Admin)
 * - /clientes: Gestión de clientes
 * - /ventas: Punto de venta (POS)
 * - /historial-ventas: Consulta de ventas
 * - /proveedores: Gestión de proveedores (solo Admin)
 * - /autores: Gestión de autores
 * - /categorias: Gestión de categorías
 *
 * @returns {JSX.Element} Aplicación completa
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ─────────────────────────────────────────────────
              RUTA PÚBLICA: Login
              ───────────────────────────────────────────────── */}
          <Route path="/acceso" element={<Acceso />} />

          {/* ─────────────────────────────────────────────────
              RUTAS PRIVADAS CON CONTROL DE ACCESO (RBAC)
              ───────────────────────────────────────────────── */}

          {/* DASHBOARD - Solo Administradores */}
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

          {/* VENTAS (POS) - Administradores y Vendedores */}
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

          {/* HISTORIAL DE VENTAS - Administradores y Vendedores */}
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

          {/* USUARIOS - Solo Administradores */}
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

          {/* ─────────────────────────────────────────────────
              RUTA CATCH-ALL: Redirige a ventas
              ───────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/ventas" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
