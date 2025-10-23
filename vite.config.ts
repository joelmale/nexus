import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ command }) => {
  // Load env variables
  const isDev = command === 'serve';
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/stores': path.resolve(__dirname, './src/stores'),
        '@/types': path.resolve(__dirname, './src/types'),
        '@/utils': path.resolve(__dirname, './src/utils'),
      },
    },
    server: {
      port: parseInt(process.env.PORT || '5173'),
      host: true,
      open: true,
      proxy: {
        '/api': {
          target: process.env.VITE_API_PROXY_URL || 'http://localhost:5001',
          changeOrigin: true,
        },
        '/auth': {
          target: process.env.VITE_API_PROXY_URL || 'http://localhost:5001',
          changeOrigin: true,
        },
        '/ws': {
          target: process.env.VITE_WS_PROXY_URL || 'ws://localhost:5001',
          ws: true,
        },
      },
    },
    build: {
      // Generate source maps for production builds if not in dev mode
      sourcemap: !isDev,
      // CSS code splitting and optimization
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          // Separate CSS chunks for better caching with content hashing
          assetFileNames: (assetInfo) => {
            if (assetInfo.name?.endsWith('.css')) {
              return 'assets/css/[name]-[hash][extname]';
            }
            return 'assets/[name]-[hash][extname]';
          },
          // Optimize chunk splitting for better caching
          manualChunks: {
            // Vendor chunks for better caching
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['sonner', 'lucide-react'],
          },
        },
      },
    },
    css: {
      // Enable CSS source maps in development
      devSourcemap: isDev,
    },
  };
});
