// CAÇAOFERTA — Configurações persistidas via chrome.storage.local.

export interface CaçaOfertaSettings {
  overlayEnabled: boolean;
  showDaysRunning: boolean;
  showDomain: boolean;
  showActionsOnCards: boolean;
  defaultCountry: string;
  autoSearch: boolean;
  downloadCreatives: boolean;
  miningQuantity: number;
  apiConnected: boolean;
}

const DEFAULT_SETTINGS: CaçaOfertaSettings = {
  overlayEnabled: true,
  showDaysRunning: true,
  showDomain: true,
  showActionsOnCards: true,
  defaultCountry: 'BR',
  autoSearch: false,
  downloadCreatives: true,
  miningQuantity: 10,
  apiConnected: false,
};

const STORAGE_KEY = 'co.settings';

export async function loadSettings(): Promise<CaçaOfertaSettings> {
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.get(STORAGE_KEY, (result) => {
          const stored = result[STORAGE_KEY];
          resolve(stored ? { ...DEFAULT_SETTINGS, ...stored } : DEFAULT_SETTINGS);
        });
      } else {
        const raw = localStorage.getItem(STORAGE_KEY);
        resolve(raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS);
      }
    } catch {
      resolve(DEFAULT_SETTINGS);
    }
  });
}

export async function saveSettings(settings: Partial<CaçaOfertaSettings>): Promise<void> {
  const current = await loadSettings();
  const merged = { ...current, ...settings };
  return new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        chrome.storage.local.set({ [STORAGE_KEY]: merged }, resolve);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        resolve();
      }
    } catch {
      resolve();
    }
  });
}
