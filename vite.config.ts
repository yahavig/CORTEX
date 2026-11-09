import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'src/web',
  publicDir: '../../public',
  plugins: [react(), tailwindcss()],
  build: { outDir: '../../dist/web', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:4747', '/fonts': 'http://127.0.0.1:4747' },
  },
});
