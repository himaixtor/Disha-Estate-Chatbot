import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    // Lets a production build be served from a subpath (e.g.
    // https://chat.dishaestate.com:3001/admin/) behind the same Node process
    // as the API and widget — see host.md. Leave VITE_BASE_PATH unset for
    // local dev (served at the root by `vite dev`).
    base: env.VITE_BASE_PATH || '/',
    server: {
      port: 5174,
    },
  }
})
