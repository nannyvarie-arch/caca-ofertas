// CAÇAOFERTA — Cache de IDs de ofertas salvas (FASE 06).
//
// O service worker mantém os IDs já salvos para NÃO consultar a rede a cada
// card exibido (evita N requisições por scan). Persistido em chrome.storage.local
// com fallback em memória quando o storage não existe (testes).

const STORAGE_KEY = 'co.savedAdIds';
const MAX_CACHE_SIZE = 10_000;

let inMemoryIds = new Set<string>();
let loaded = false;

async function load(): Promise<void> {
  if (loaded) return;
  loaded = true;
  if (!chrome.storage?.local) return;
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const raw = stored?.[STORAGE_KEY];
    if (Array.isArray(raw)) {
      inMemoryIds = new Set(raw.map(String).filter(Boolean).slice(0, MAX_CACHE_SIZE));
    }
  } catch {
    // storage indisponível: mantém apenas a memória da sessão.
  }
}

async function persist(): Promise<void> {
  if (!chrome.storage?.local) return;
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: [...inMemoryIds].slice(0, MAX_CACHE_SIZE) });
  } catch {
    // sem storage: cache só em memória (ok para a sessão).
  }
}

/** Sincroniza o cache com o que veio da listagem (evita divergência). */
export async function setSavedIds(ids: string[]): Promise<void> {
  await load();
  inMemoryIds = new Set(ids.filter(Boolean).slice(0, MAX_CACHE_SIZE));
  await persist();
}

export async function isSavedAdId(adLibraryId: string): Promise<boolean> {
  await load();
  return inMemoryIds.has(adLibraryId);
}

export async function addSavedAdId(adLibraryId: string): Promise<void> {
  await load();
  if (!adLibraryId) return;
  if (inMemoryIds.size >= MAX_CACHE_SIZE) return;
  inMemoryIds.add(adLibraryId);
  await persist();
}

export async function removeSavedAdId(adLibraryId: string): Promise<void> {
  await load();
  inMemoryIds.delete(adLibraryId);
  await persist();
}

/** Estado atual do cache (para debug/observabilidade). */
export function getSavedIdsSnapshot(): string[] {
  return [...inMemoryIds];
}