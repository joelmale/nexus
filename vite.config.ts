import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env variables
  const isDev = command === 'serve'
  
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
      open: true
    },
    define: {
      // Define WebSocket URL
      __WEBSOCKET_URL__: JSON.stringify(
        isDev 
          ? `ws://localhost:${process.env.WS_PORT || '5000'}/ws`
          : 'wss://your-domain.com/ws'
      )
    }
  }
})