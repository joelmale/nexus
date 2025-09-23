import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
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
    port: parseInt(process.env.PORT || '5173'), // Use PORT env var or default to 5173
    host: true,
    open: true // Automatically open browser
  },
  define: {
    // Define WebSocket URL for development - More flexible port handling
    __WEBSOCKET_URL__: JSON.stringify(
      process.env.NODE_ENV === 'production' 
        ? 'wss://your-domain.com/ws' 
        : process.env.WS_PORT 
          ? `ws://localhost:${process.env.WS_PORT}/ws`
          : 'ws://localhost:5000/ws' // Default fallback
    )
  }
})