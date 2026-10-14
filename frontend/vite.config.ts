import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // O .env real fica na raiz do repo, um nível acima de /frontend — usar
  // process.cwd() aqui dependeria de onde `npm run dev` é executado.
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      // O projeto roda em /mnt/e (drive Windows montado via DrvFs no WSL2),
      // que não suporta inotify — sem polling, o HMR nunca detecta mudanças.
      watch: {
        usePolling: true,
        interval: 300,
      },
    },
    plugins: [react()],
    define: {
      // Ensure VITE_API_URL is available to the client
      'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL || env.VITE_API_URL)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['lucide-react', 'recharts'],
            markdown: ['react-markdown']
          }
        }
      }
    }
  };
});
