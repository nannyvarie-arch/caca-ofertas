import { resolve } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const root = fileURLToPath(new URL('.', import.meta.url));

const packages = (name: string) =>
  fileURLToPath(new URL(`../../packages/${name}/src`, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: {
      '@caca-oferta/shared': packages('shared'),
      '@caca-oferta/types': packages('types'),
      '@caca-oferta/ui': packages('ui'),
      '@caca-oferta/utils': packages('utils'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        popup: resolve(root, 'popup.html'),
        panel: resolve(root, 'panel.html'),
      },
    },
  },
});