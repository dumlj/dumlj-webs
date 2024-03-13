import path from 'path'
import { defineConfig } from 'vite'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: {
        process: true,
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
    }
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'unsafe-none'
    }
  }
})
