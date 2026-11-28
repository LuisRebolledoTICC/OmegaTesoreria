import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function pwaVersionPlugin(): Plugin {
  return {
    name: 'omega-pwa-version',
    apply: 'build',
    generateBundle() {
      const templatePath = path.resolve(__dirname, 'src', 'sw.js')
      if (fs.existsSync(templatePath)) {
        const version = new Date().toISOString().replace(/[:.]/g, '-')
        const source = fs.readFileSync(templatePath, 'utf8').replaceAll('__PWA_BUILD_VERSION__', version)
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source,
        })
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), pwaVersionPlugin()],
  server: {
    port: 5173,
    host: true // Permite acceso desde otros dispositivos de la red local (ej. 192.168.x.x:5173)
  }
})
