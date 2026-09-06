import { describe, expect, it } from 'vitest';
import { APP_BRAND, APP_NAME, APP_TAGLINE } from '@caca-oferta/shared';

describe('identidade CaçaOferta (contratos compartilhados)', () => {
  it('expõe a marca oficial para toda a plataforma', () => {
    expect(APP_NAME).toBe('CaçaOferta');
    expect(APP_BRAND).toBe('CAÇAOFERTA');
  });

  it('mantém a tagline oficial', () => {
    expect(APP_TAGLINE).toBe('Encontre ofertas. Analise anúncios. Descubra oportunidades.');
  });

  it('não contém referências legadas a RatoAds', () => {
    for (const value of [APP_NAME, APP_BRAND, APP_TAGLINE]) {
      expect(value.toLowerCase()).not.toContain('ratoads');
    }
  });
});