import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Three.js: no React dependency, the largest chunk -> safe to split.
            if (id.includes('node_modules') && id.includes('/three/')) {
              return 'vendor-three';
            }
            // framer-motion: animation runtime, large, no React-context coupling
            // with the rest of our vendor graph. Splitting it keeps the main
            // bundle smaller without risking init-order issues.
            // DO NOT split: react / zustand / @react-three — they share
            // init order with the app entry and break when chunked.
            if (id.includes('node_modules') && id.includes('/framer-motion/')) {
              return 'vendor-framer-motion';
            }
          }
        }
      }
    },
    test: {
      globals: true,
      environment: 'happy-dom',
      setupFiles: './src/test/setup.ts',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        exclude: [
          'node_modules/',
          'src/test/',
          '**/*.d.ts',
          '**/*.config.*',
          '**/mockData',
          'vite-env.d.ts'
        ]
      }
    }
  };
});
