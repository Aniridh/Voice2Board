import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    https: process.env.VITE_USE_HTTPS === 'true' ? {
      // For local HTTPS, you can use mkcert:
      // 1. Install mkcert: brew install mkcert (macOS) or choco install mkcert (Windows)
      // 2. Run: mkcert -install
      // 3. Run: mkcert localhost
      // 4. Set VITE_USE_HTTPS=true and update paths below
      // Or use a tool like ngrok for HTTPS tunneling
      key: process.env.VITE_HTTPS_KEY ? fs.readFileSync(process.env.VITE_HTTPS_KEY) : undefined,
      cert: process.env.VITE_HTTPS_CERT ? fs.readFileSync(process.env.VITE_HTTPS_CERT) : undefined,
    } : false,
    port: 5173,
  },
})

