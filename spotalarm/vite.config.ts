import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // The production build calls the API directly, so the URL must be baked in.
  // Fail early instead of shipping a site that can't load any data.
  if (command === 'build' && !env.VITE_API_URL) {
    throw new Error('VITE_API_URL is not set. Add it to .env.local or .env.production (see .env.example).')
  }

  return {
    // Relative asset paths: the same build works in the domain root
    // (public_html/) or in any subfolder (public_html/spotalarm/).
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      // In development the dev server forwards /api/* to the API, so the
      // browser never makes a cross-origin request:
      // /api/spot-prices -> <VITE_API_URL>/spot-prices
      proxy: {
        '/api': {
          target: env.VITE_API_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
