import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@frontend': resolve(__dirname, '../frontend/src'),
    },
  },
  server: {
    proxy: {
      // Proxy /api to avoid CORS when app uses relative /api/metrics.
      // Default: production API. For local backend use: VITE_BACKEND_URL=http://localhost:8000 (and run backend on 8000).
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'https://api.narvo.news',
        changeOrigin: true,
      },
    },
  },
});
