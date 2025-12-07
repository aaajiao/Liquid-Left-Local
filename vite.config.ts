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
            // Only split Three.js - it has no React dependency and is the largest chunk
            // All other React-dependent libraries (framer-motion, zustand, @react-three)
            // must be bundled together to avoid initialization order issues
            if (id.includes('node_modules') && id.includes('/three/')) {
              return 'vendor-three';
            }
          }
        }
      }
    }
  };
});
