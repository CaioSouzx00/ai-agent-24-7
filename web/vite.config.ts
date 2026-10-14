import path from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/chat': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html'
          }
        },
      },
      '/voice': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '/tools': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html'
          }
        },
      },
      '/handoff': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
        bypass: (req) => {
          if (req.headers.accept?.includes('text/html')) {
            return '/index.html'
          }
        },
      },
      '/health': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '/live': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '/ready': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '/metrics': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '/openapi.json': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
