import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const packages = (name: string) =>
  fileURLToPath(new URL(`../../packages/${name}/src`, import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@caca-oferta/shared': packages('shared'),
      '@caca-oferta/types': packages('types'),
      '@caca-oferta/ui': packages('ui'),
      '@caca-oferta/utils': packages('utils'),
    },
  },
  server: {
    port: 5173,
  },
});