// CAÇAOFERTA — Detecta se estamos na Biblioteca de Anúncios da Meta.
// Aceita qualquer URL que contenha /ads/library.

const META_ADS_LIBRARY_URL_PATTERN = /facebook\.com\/ads\/library/i;

export function isMetaAdsLibraryPage(input?: string): boolean {
  const url = input ?? (typeof window !== 'undefined' ? window.location.href : '');
  return META_ADS_LIBRARY_URL_PATTERN.test(url);
}
