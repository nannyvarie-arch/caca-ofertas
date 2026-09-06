// CAÇAOFERTA — Detecta se estamos na Biblioteca de Anúncios da Meta.

const META_ADS_LIBRARY_URL_PATTERN =
  /^https:\/\/([a-z0-9-]+\.)*facebook\.com\/ads\/library(?:\/.*)?$/i;

export function isMetaAdsLibraryPage(input?: string): boolean {
  const url = input ?? (typeof window !== 'undefined' ? window.location.href : '');
  return META_ADS_LIBRARY_URL_PATTERN.test(url);
}