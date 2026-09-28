import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  build: {
    assetsDir: 'books-assets'
  },
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3004',
        changeOrigin: true
      },
      '/books/api': {
        target: 'http://localhost:3004',
        changeOrigin: true
      }
    }
  }
});
