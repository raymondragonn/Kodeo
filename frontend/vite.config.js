import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
  ],
  server: {
    port: 5001,
    host: 'localhost',
    strictPort: false,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
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
