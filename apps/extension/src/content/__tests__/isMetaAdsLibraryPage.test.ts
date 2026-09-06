import { describe, expect, it } from 'vitest';
import { isMetaAdsLibraryPage } from '../isMetaAdsLibraryPage';

describe('isMetaAdsLibraryPage', () => {
  it('aceita a URL padrão da Biblioteca', () => {
    expect(isMetaAdsLibraryPage('https://www.facebook.com/ads/library/')).toBe(true);
  });

  it('aceita a Biblioteca com parâmetros de busca', () => {
    expect(
      isMetaAdsLibraryPage('https://www.facebook.com/ads/library/?view_all_page_id=123&search_type=keyboard_top'),
    ).toBe(true);
  });

  it('aceita a Biblioteca sem barra final', () => {
    expect(isMetaAdsLibraryPage('https://www.facebook.com/ads/library')).toBe(true);
  });

  it('rejeita outras páginas do Facebook', () => {
    expect(isMetaAdsLibraryPage('https://www.facebook.com/')).toBe(false);
    expect(isMetaAdsLibraryPage('https://www.facebook.com/marketplace/')).toBe(false);
  });

  it('rejeita outros domínios', () => {
    expect(isMetaAdsLibraryPage('https://google.com/ads/library/')).toBe(false);
  });

  it('rejeita URL vazia', () => {
    expect(isMetaAdsLibraryPage('')).toBe(false);
  });
});