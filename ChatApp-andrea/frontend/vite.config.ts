import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carica le variabili d'ambiente
  const env = loadEnv(mode, process.cwd(), '');
  
  // Configurazione del server
  const serverConfig = {
    port: parseInt(env.VITE_DEV_SERVER_PORT || '5173'),
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: env.VITE_API_URL || 'https://localhost:3000',
        changeOrigin: true,
        secure: mode === 'production', // Verifica SSL solo in produzione
      },
      '/uploads': {
        target: env.VITE_API_URL || 'https://localhost:3000',
        changeOrigin: true,
        secure: mode === 'production',
      }
    }
  };

  return {
    plugins: [react()],
    server: serverConfig,
    // Esponi solo le variabili d'ambiente che iniziano con VITE_
    define: {
      'process.env': env
    }
  };
});