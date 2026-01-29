import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,           // <- LAAT TOEGANG VANAF NETWERK TOE
    strictPort: true,     // <- FORCEER POORT 3000
    open: true,           // <- OPEN BROWSER AUTOMATISCH
    cors: true,           // <- STA CORS TOE
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@import "bootstrap/scss/bootstrap";`
      }
    }
  }
})

