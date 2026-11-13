import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  build: {
    // En Vercel el sitio sale de frontend/dist. En local el build sigue
    // copiándose dentro de Spring para probar todo en el puerto 8081.
    outDir: process.env.VERCEL ? 'dist' : '../src/main/resources/static',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
    },
  },
})
