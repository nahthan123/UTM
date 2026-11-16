import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import cesiumPlugin from 'vite-plugin-cesium'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), (cesiumPlugin as any)()],
  server: {
    port: 3000,
    open: false,
  },
})
