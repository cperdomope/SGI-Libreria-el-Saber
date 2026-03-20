// =====================================================
// SERVICIO API — CLIENTE HTTP CENTRALIZADO
// =====================================================
// Este archivo configura Axios, la librería que el frontend
// usa para comunicarse con el backend (Node.js/Express).
//
// ¿Por qué no usar fetch() directamente?
// fetch() es la API nativa del browser para hacer peticiones HTTP.
// Axios la envuelve con ventajas importantes:
//   - Interceptores: funciones que se ejecutan automáticamente
//     antes de CADA petición y después de CADA respuesta
//   - Cancela automáticamente peticiones que tardan demasiado (timeout)
//   - Transforma la respuesta automáticamente a JSON
//   - Manejo de errores más consistente
//
// ¿Qué problema resuelve este archivo?
// Sin este archivo, CADA componente tendría que:
//   1. Obtener el token del localStorage
//   2. Agregarlo al header Authorization manualmente
//   3. Verificar si el token expiró (error 401) y hacer logout
//
// Con este archivo, eso ocurre AUTOMÁTICAMENTE en todos lados.
// Es el principio DRY aplicado a la comunicación con la API.
//
// FLUJO DE UNA PETICIÓN:
//   Componente → api.get('/libros')
//     → interceptor de REQUEST (agrega el token)
//     → servidor recibe la petición
//     → interceptor de RESPONSE (detecta errores 401)
//     → Componente recibe los datos
//
// 🔹 En la sustentación puedo decir:
// "api.js centraliza toda la comunicación con el backend
//  usando una instancia configurada de Axios.
//  Los interceptores agregan el token JWT automáticamente
//  en cada petición y detectan sesiones expiradas (error 401)
//  para hacer logout sin que cada componente tenga que
//  manejar eso por separado. Esto sigue el principio DRY."
// =====================================================

import axios from 'axios';

// ─────────────────────────────────────────────────────────
// CLAVES DE LOCALSTORAGE
// ─────────────────────────────────────────────────────────
// Definidas como constantes para evitar errores de tipeo.
// Si la clave cambia en un lugar, solo hay que cambiarla aquí.
// Deben coincidir con las usadas en AuthContext.jsx.
const STORAGE_KEYS = {
  TOKEN:   'token_sgi',    // El JWT recibido al hacer login
  USUARIO: 'usuario_sgi'   // Los datos del usuario (JSON serializado)
};

// Ruta a la que el usuario es enviado cuando su sesión expira
const RUTA_LOGIN = '/acceso';

// ─────────────────────────────────────────────────────────
// INSTANCIA DE AXIOS
// ─────────────────────────────────────────────────────────
// axios.create() crea una instancia con configuración base.
// Todas las peticiones que hagamos con esta instancia
// usarán automáticamente esta configuración.
//
// import.meta.env.VITE_API_URL es la forma de acceder a
// variables de entorno en Vite (el bundler del frontend).
// En el archivo .env del cliente:
//   VITE_API_URL=http://localhost:3000/api
// En producción apuntaría al dominio real del backend.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',

  // Si el servidor no responde en 30 segundos, la petición falla.
  // Sin timeout, una petición podría quedar colgada para siempre.
  timeout: 30000,

  // Todas las peticiones enviarán JSON por defecto.
  // Para peticiones con archivos (FormData) esto se sobreescribe automáticamente.
  headers: {
    'Content-Type': 'application/json'
  }
});

// ─────────────────────────────────────────────────────────
// INTERCEPTOR DE PETICIONES (REQUEST)
// ─────────────────────────────────────────────────────────
// Se ejecuta ANTES de que cada petición salga al servidor.
// Aquí "inyectamos" el token JWT en el header Authorization.
//
// ¿Por qué aquí y no en cada componente?
// Porque todos los componentes que hacen peticiones al backend
// necesitan el token. Centralizarlo aquí evita repetir esa
// lógica en decenas de archivos.
api.interceptors.request.use(
  (config) => {
    // Leer el token guardado después del login
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

    if (token) {
      // Formato estándar JWT / RFC 6750: "Bearer <token>"
      // El backend en verificarToken.js espera exactamente este formato.
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Retornar la config (modificada o no) para que la petición continue
    return config;
  },
  (error) => {
    // Error en la construcción de la petición (raro, pero posible)
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────────────────
// INTERCEPTOR DE RESPUESTAS (RESPONSE)
// ─────────────────────────────────────────────────────────
// Se ejecuta DESPUÉS de recibir la respuesta del servidor.
// Aquí manejamos el error 401 (sesión expirada) de forma global.
//
// ¿Por qué manejar 401 aquí?
// Si el token expiró, CUALQUIER petición a la API recibirá 401.
// En lugar de que cada componente tenga que detectarlo y hacer logout,
// lo manejamos en un solo lugar.
api.interceptors.response.use(
  // Respuestas exitosas (códigos 2xx): no hacemos nada, las dejamos pasar.
  (response) => response,

  // Respuestas con error (códigos 4xx, 5xx):
  (error) => {
    if (error.response?.status === 401) {
      // 401 = No autorizado. Significa que el token es inválido o expiró.
      // El servidor lo rechazó con el código TOKEN_EXPIRED o TOKEN_INVALID.

      // Borrar la sesión inválida del localStorage
      localStorage.removeItem(STORAGE_KEYS.USUARIO);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);

      // Redirigir a la página de login.
      // Usamos window.location.href (recarga completa) en lugar de
      // navigate() de React Router para limpiar todo el estado de React.
      // Así evitamos datos residuales del usuario anterior en memoria.
      window.location.href = RUTA_LOGIN;
    }

    // Para cualquier otro error, lo propagamos para que cada componente
    // lo maneje según su contexto (mostrar mensaje, limpiar formulario, etc.)
    return Promise.reject(error);
  }
);

// Exportamos la instancia configurada.
// Todos los archivos del frontend la importan así:
//   import api from '../services/api';
//   const { data } = await api.get('/libros');
export default api;