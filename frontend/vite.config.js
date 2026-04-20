import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@familyConfig': path.resolve(__dirname, '../family.config.json'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3002',
    },
  },
});
