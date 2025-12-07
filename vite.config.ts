import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            // Split node_modules into vendor chunks
            if (id.includes('node_modules')) {
              // Three.js - largest dependency
              if (id.includes('/three/')) {
                return 'vendor-three';
              }
              // React Three Fiber ecosystem
              if (id.includes('@react-three')) {
                return 'vendor-r3f';
              }
              // React core
              if (id.includes('/react/') || id.includes('/react-dom/')) {
                return 'vendor-react';
              }
              // Animation and state management
              if (id.includes('framer-motion') || id.includes('zustand')) {
                return 'vendor-utils';
              }
            }
          }
        }
      }
    }
  };
});
