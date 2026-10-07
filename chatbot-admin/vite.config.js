import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    // The production server mounts this app at /admin; local Vite dev remains
    // at /. VITE_BASE_PATH can override either base for other deployments.
    base: env.VITE_BASE_PATH || (mode === 'production' ? '/admin/' : '/'),
    server: {
      port: 5174,
    },
  }
})
