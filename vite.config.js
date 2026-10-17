import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': {
        // Use explicit IPv4 address to prevent ENOBUFS from dual-stack DNS
        // resolution when 'localhost' resolves to both 127.0.0.1 and ::1
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

