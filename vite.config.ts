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
              // Three.js - largest dependency (safe to split)
              if (id.includes('/three/')) {
                return 'vendor-three';
              }
              // React Three Fiber ecosystem (safe to split)
              if (id.includes('@react-three')) {
                return 'vendor-r3f';
              }
              // Note: React and react-dom NOT split due to React 19 initialization order requirements
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
