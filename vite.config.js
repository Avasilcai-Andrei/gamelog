import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    include: [
      'src/tests/**/*.{test,spec}.{js,jsx,ts,tsx}',
      'server/tests/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ],
    environmentMatchGlobs: [
      ['server/tests/**', 'node'],
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}', 'server/src/**/*.js'],
      exclude: [
        'src/main.jsx',
        'src/App.jsx',
        'src/pages/**',
        'src/tests/**',
        'server/src/index.js',
        'server/tests/**',
      ],
    },
  },
})
