import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { configDefaults } from 'vitest/config'

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },

  test: {
    globals: true,
    environment: 'jsdom',

    include: [
      'src/features/**/*.{test,spec}.{js,ts,jsx,tsx}',
    ],

    exclude: [...configDefaults.exclude, 'dist'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html']
    },
  },
})