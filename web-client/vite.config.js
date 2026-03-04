import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load both VITE_ and EXPO_PUBLIC_ prefixes so EXPO_PUBLIC_API_URL works
  // the same way it does in the React Native client .env file.
  const env = loadEnv(mode, process.cwd(), ['VITE_', 'EXPO_PUBLIC_'])
  const apiUrl = env.EXPO_PUBLIC_API_URL || env.VITE_API_URL || 'http://localhost:3000'

  return {
    plugins: [react()],
    // Expose both prefixes to client code via import.meta.env
    envPrefix: ['VITE_', 'EXPO_PUBLIC_'],
    server: {
      proxy: {
        '/api': apiUrl,
        '/socket.io': {
          target: apiUrl,
          ws: true,
        },
      },
    },
  }
})
