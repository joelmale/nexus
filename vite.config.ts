import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env variables
  const isDev = command === 'serve';
  const isAnalyze = mode === 'analyze';
  return {
    plugins: [
      react(),
      isAnalyze &&
        visualizer({
          open: true,
          filename: 'stats.html',
          gzipSize: true,
          brotliSize: true,
        }),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['nexus-icon.svg', 'assets/icons/*.png'],
        manifest: {
          name: 'Nexus VTT - Virtual Tabletop',
          short_name: 'Nexus VTT',
          description:
            'A lightweight, modern virtual tabletop for browser-based RPG sessions',
          theme_color: '#6366f1',
          background_color: '#667eea',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/assets/icons/nexus-icon-192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/assets/icons/nexus-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/assets/icons/nexus-icon-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2}'],
          // Increase file size limit to 5MB for large generator files
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          // Exclude very large files that don't need precaching
          globIgnores: [
            '**/world-map-generator/**',
            '**/one-page-dungeon/**',
            '**/dwellings-generator/**',
            '**/city-generator/**',
            '**/cave-generator/**',
            '**/DnDTeamPosing*.png',
            '**/defaults/*.png',
          ],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\/assets\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'assets-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
            {
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5, // 5 minutes
                },
                networkTimeoutSeconds: 10,
              },
            },
          ],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api/, /^\/auth/, /^\/ws/],
        },
        devOptions: {
          enabled: false, // Disable in dev mode to avoid conflicts
        },
      }),
    ].filter(Boolean),
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
      // Disable source maps in production for better security and smaller bundle
      sourcemap: isDev ? true : false,
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
            // Core React libraries
            'vendor-react': ['react', 'react-dom'],
            'vendor-router': ['react-router-dom'],

            // State management
            'vendor-state': ['zustand', 'immer'],

            // UI libraries (only include what's actually used)
            // Note: lucide-react removed - not used in codebase, sonner is used
            'vendor-ui': ['sonner'],

            // Heavy 3D dependencies (lazy loaded, but separate chunk when needed)
            // Only include what's actually used: dice-box
            'vendor-3d': ['@3d-dice/dice-box'],

            // PDF viewer (lazy loaded, but separate chunk when needed)
            'vendor-pdf': ['pdfjs-dist'],

            // Utility libraries
            'vendor-utils': ['uuid'],

            // Drag and drop
            'vendor-dnd': ['react-dnd', 'react-dnd-html5-backend'],
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
