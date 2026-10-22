/// <reference types="vitest/config" />
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { SECURITY_HEADERS } from './src/lib/csp.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  // `npm run preview` serves the production build with the same headers as Vercel.
  preview: { headers: SECURITY_HEADERS },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
