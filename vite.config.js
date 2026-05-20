import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { imagetools } from 'vite-imagetools'

export default defineConfig({
  plugins: [
    react({
      babel: { compact: true },
    }),
    imagetools(),
  ],
  server: {
    port: 5000,
    host: 'localhost',
    strictPort: true,
    historyApiFallback: true,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    esbuild: {
      drop: ['console', 'debugger'],
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/gsap'))         return 'gsap';
          if (id.includes('node_modules/react-dom'))    return 'react-dom';
          if (id.includes('node_modules/react-router')) return 'router';
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'gsap'],
  },
})
