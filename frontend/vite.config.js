import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    resolve: {
        dedupe: ['react', 'react-dom'],
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
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
        // Exclude Phosphor so Vite doesn't pre-bundle per-icon chunks that go stale (e.g. after removing
        // WifiHigh/WifiLow/WifiMedium imports). App bundles icons on demand; resolve.dedupe keeps single React.
        exclude: ['@phosphor-icons/react'],
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
                // Do not put @phosphor-icons/react in a separate chunk; it uses React context
                // and must share the same React instance as the app to avoid "useContext is null".
            },
        },
    },
    server: {
        port: 3000,
        open: false,
        // Proxy /api/* to local backend so requests work even without VITE_BACKEND_URL.
        // When VITE_BACKEND_URL is set, api.ts builds absolute URLs and bypasses this.
        // Without it, relative /api/* calls hit the Vite server (404) or the deployed
        // production API (CORS error from localhost:3000).
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    envPrefix: 'VITE_',
});
