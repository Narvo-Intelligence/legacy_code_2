import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  plugins: [
    react({ include: /\.[tj]sx?$/ }), // transform .js, .jsx, .ts, .tsx (CRA used .js for JSX)
  ],
  esbuild: {
    // tsx loader handles TS and JSX so .ts/.tsx/.js/.jsx all transform correctly (define step parses them)
    loader: 'tsx',
    include: /\.(j|t)sx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: { '.js': 'jsx' },
    },
  },
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'build',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  server: {
    port: 3000,
    open: false,
  },
  envPrefix: 'VITE_',
});
