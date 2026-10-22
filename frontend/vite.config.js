import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
  backend: {
    port: 5173,
    proxy: {
      // Proxying API calls to prevent cross-origin issues during local dev
      '/register': 'http://localhost:3000',
      '/login': 'http://localhost:3000',
      '/submit-application': 'http://localhost:3000',
      '/api': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
});