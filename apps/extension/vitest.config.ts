import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        // URL padrão = Biblioteca de Anúncios: permite testar o pipeline real
        // (isMetaAdsLibraryPage usa window.location).
        url: 'https://www.facebook.com/ads/library/?search_type=keyboard_top',
      },
    },
    include: ['src/**/*.test.{ts,tsx}'],
  },
});