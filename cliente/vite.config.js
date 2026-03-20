import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    // Avisa si algún chunk supera 600 KB (el default es 500 KB)
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        // Divide el bundle en chunks separados por tema.
        // El navegador los descarga en paralelo y los cachea individualmente.
        // Si el usuario no visita el historial, 'xlsx' y 'jspdf' nunca se descargan.
        manualChunks: {
          // React core — cambia raramente, ideal para caché larga
          vendor: ['react', 'react-dom', 'react-router-dom'],
          // Recharts — solo se usa en el Dashboard
          charts:  ['recharts'],
          // Librerías pesadas de exportación — solo se usan en HistorialVentas
          exportar: ['xlsx', 'jspdf'],
        },
      },
    },
  },
})