// CAÇAOFERTA — Favoritos persistidos via chrome.storage.local.

export interface CaçaOfertaFavorites {
  keywords: string[];
  domains: string[];
  offers: string[];
}

const DEFAULT_FAVORITES: CaçaOfertaFavorites = {
  keywords: [],
  domains: [],
  offers: [],
};

const STORAGE_KEY = 'co.favorites';

export async function loadFavorites(): Promise<CaçaOfertaFavorites> {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(STORAGE_KEY, (result) => {
          const stored = result[STORAGE_KEY];
          resolve(stored ? { ...DEFAULT_FAVORITES, ...stored } : DEFAULT_FAVORITES);
        });
      } else {
        const raw = localStorage.getItem(STORAGE_KEY);
        resolve(raw ? { ...DEFAULT_FAVORITES, ...JSON.parse(raw) } : DEFAULT_FAVORITES);
      }
    } catch {
      resolve(DEFAULT_FAVORITES);
    }
  });
}

export async function saveFavorites(favorites: CaçaOfertaFavorites): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ [STORAGE_KEY]: favorites }, resolve);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
        resolve();
      }
    } catch {
      resolve();
    }
  });
}

export async function toggleKeywordFavorite(keyword: string): Promise<boolean> {
  const fav = await loadFavorites();
  const idx = fav.keywords.indexOf(keyword);
  if (idx >= 0) {
    fav.keywords.splice(idx, 1);
  } else {
    fav.keywords.push(keyword);
  }
  await saveFavorites(fav);
  return idx < 0;
}

export async function toggleDomainFavorite(domain: string): Promise<boolean> {
  const fav = await loadFavorites();
  const idx = fav.domains.indexOf(domain);
  if (idx >= 0) {
    fav.domains.splice(idx, 1);
  } else {
    fav.domains.push(domain);
  }
  await saveFavorites(fav);
  return idx < 0;
}

export async function toggleOfferFavorite(offerId: string): Promise<boolean> {
  const fav = await loadFavorites();
  const idx = fav.offers.indexOf(offerId);
  if (idx >= 0) {
    fav.offers.splice(idx, 1);
  } else {
    fav.offers.push(offerId);
  }
  await saveFavorites(fav);
  return idx < 0;
}

export async function isKeywordFavorited(keyword: string): Promise<boolean> {
  const fav = await loadFavorites();
  return fav.keywords.includes(keyword);
}

export async function isDomainFavorited(domain: string): Promise<boolean> {
  const fav = await loadFavorites();
  return fav.domains.includes(domain);
}

export async function isOfferFavorited(offerId: string): Promise<boolean> {
  const fav = await loadFavorites();
  return fav.offers.includes(offerId);
}
