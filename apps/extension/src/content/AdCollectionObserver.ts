// CAÇAOFERTA — Orquestrador de mineração da Biblioteca de Anúncios.
//
// Pipeline incremental:
//   1. MutationObserver no body (childList+subtree) — dispara no carregamento
//      de novos anúncios por scroll.
//   2. Debounce do scan (evita processamento excessivo).
//   3. Cada scan detecta cards, ignora os já processados (WeakSet/Map),
//      parseia apenas os novidades e anexa o badge (Shadow DOM).
//   4. Re-scan atrasado (5s, 15s, 30s) para pegar conteúdo carregado tardiamente.
//   5. Navegação SPA (pushState/popstate + diff de URL) reinicia a sessão.
//
// Logging ALWAYS-ON via console.info para diagnóstico.

import type { NormalizedAd, ParsedAd } from '@caca-oferta/types';
import type { SavedAdDto } from '@caca-oferta/shared';
import { MetaAdsLibraryAdapter, normalizedToParsed } from '../adapter/MetaAdsLibraryAdapter';
import { sendRuntimeRequest } from '../bridge/runtimeClient';
import { RuntimeMessageType } from '../bridge/messages';
import { AdRegistry, adKey, isValidAd } from './deduplicate';
import { DomainIndex, searchByDomain as searchByDomainIndex } from './DomainIndex';
import { isMetaAdsLibraryPage } from './isMetaAdsLibraryPage';
import { getCurrentUrl, observeSpaNavigation } from './navigation';
import { attachOverlay, type OverlayHandle } from './overlay';
import { CaçaOfertaSidebar } from './sidebar';

const LOG = '[CaçaOferta Miner]';

export interface AdMiningHandle {
  stop(): void;
  getCollectedAds(): ParsedAd[];
  searchByDomain(domain: string): ParsedAd[];
  getDomainIndex(): DomainIndex;
  openSearch(domain?: string): void;
}

export interface AdMiningOptions {
  debounceMs?: number;
  refreshDaysMs?: number;
  getRoot?: () => Element | null;
}

const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_REFRESH_DAYS_MS = 60_000;

export function startAdMining(options: AdMiningOptions = {}): AdMiningHandle {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const refreshDaysMs = options.refreshDaysMs ?? DEFAULT_REFRESH_DAYS_MS;
  const getRoot = options.getRoot ?? (() => document.body);

  const adapter = new MetaAdsLibraryAdapter();
  const registry = new AdRegistry();
  const domainIndex = new DomainIndex();
  const sidebar = new CaçaOfertaSidebar({
    getIndex: () => domainIndex,
    getAds: () => registry.all(),
    onSearch: (url, context) => {
      window.open(url, '_blank', 'noopener');
      if (context?.keyword) {
        console.info(`${LOG} Pesquisa executada:`, { keyword: context.keyword, niche: context.niche });
      }
    },
  });
  const overlayAds = new Map<Element, ParsedAd>();
  const overlayHandles = new Map<Element, OverlayHandle>();
  const normalizedById = new Map<string, NormalizedAd>();
  let lastHref = getCurrentUrl();
  let lastDaysRefresh = 0;
  let scanTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  let totalParsed = 0;

  const sendSave = (payload: NormalizedAd) =>
    sendRuntimeRequest<SavedAdDto>({ type: RuntimeMessageType.SaveSavedAd, payload });

  const destroyAllOverlays = (): void => {
    for (const handle of overlayHandles.values()) handle.destroy();
    overlayHandles.clear();
    overlayAds.clear();
  };

  const resetSession = (): void => {
    destroyAllOverlays();
    registry.clear();
    domainIndex.clear();
    normalizedById.clear();
    totalParsed = 0;
    sidebar.reset();
    lastDaysRefresh = 0;
    console.info(`${LOG} Sessão reiniciada.`);
  };

  const scan = (): void => {
    if (stopped) return;
    if (!isMetaAdsLibraryPage()) return;

    const currentHref = getCurrentUrl();
    if (currentHref !== lastHref) {
      lastHref = currentHref;
      resetSession();
    }

    const root = getRoot();
    if (!root) return;

    let cardsDetected = 0;
    let parsed = 0;
    let duplicates = 0;
    let invalid = 0;

    try {
      const cards = adapter.detectAds(root);
      console.info(`${LOG} Scan: ${cards.length} cards brutos encontrados no DOM`);

      for (const card of cards) {
        const el = card.element;
        if (registry.hasElement(el)) continue;
        cardsDetected++;

        let normalized: NormalizedAd | null = null;
        try {
          normalized = adapter.parseAdCard(el);
        } catch (error) {
          console.warn(`${LOG} Card com erro de parse:`, error);
          continue;
        }

        if (!normalized) {
          invalid++;
          continue;
        }
        const ad = normalizedToParsed(normalized);

        if (!isValidAd(ad)) {
          invalid++;
          console.warn(`${LOG} Card inválido (nenhum campo detectado):`, {
            hasId: Boolean(ad.adLibraryId),
            hasPage: Boolean(ad.pageName),
            hasText: Boolean(ad.creativeText),
          });
          continue;
        }

        if (registry.hasAd(ad)) {
          duplicates++;
          registry.markElement(el);
          if (!overlayHandles.has(el)) {
            const stored = registry.all().find((a) => adKey(a) === adKey(ad));
            const payload = normalizedById.get(adKey(ad)) ?? normalized;
            const handle = attachOverlay(el, stored ?? ad, {
              onSearchDomain: (d) => sidebar.open(d),
              onSave: () => sendSave(payload),
            });
            overlayHandles.set(el, handle);
            overlayAds.set(el, ad);
          }
          continue;
        }

        registry.add(ad);
        normalizedById.set(adKey(ad), normalized);
        registry.markElement(el);
        domainIndex.add(ad);
        parsed++;
        totalParsed++;
        const handle = attachOverlay(el, ad, {
          onSearchDomain: (d) => sidebar.open(d),
          onSave: () => sendSave(normalized),
        });
        overlayHandles.set(el, handle);
        overlayAds.set(el, ad);
        sidebar.refreshSearch();
        console.info(`${LOG} ✓ Overlay injetado:`, {
          id: ad.adLibraryId,
          page: ad.pageName,
          status: ad.status,
          days: ad.deliveryStartDate,
          domain: ad.destinationDomain,
        });
      }
    } catch (error) {
      console.error(`${LOG} Falha no scan:`, error);
    }

    const now = Date.now();
    if (now - lastDaysRefresh > refreshDaysMs) {
      for (const [el, ad] of overlayAds) {
        overlayHandles.get(el)?.update(ad);
      }
      lastDaysRefresh = now;
    }

    sidebar.syncStats();

    if (cardsDetected > 0) {
      console.info(`${LOG} Scan resultado: ${cardsDetected} card(s), ${parsed} novo(s), ${duplicates} duplicado(s), ${invalid} inválido(s). Total: ${totalParsed}`);
    }
  };

  const scheduleScan = (): void => {
    if (stopped) return;
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, debounceMs);
  };

  const observer = new MutationObserver(scheduleScan);
  const body = document.body;
  if (body) observer.observe(body, { childList: true, subtree: true });

  const stopNavigation = observeSpaNavigation(() => {
    lastHref = getCurrentUrl();
    resetSession();
    scheduleScan();
  });

  sidebar.mount(document.body);

  // Scan imediato.
  scan();

  // Re-scans atrasados para pegar conteúdo carregado tardiamente.
  const delayedScans = [2000, 5000, 10000, 20000];
  for (const delay of delayedScans) {
    setTimeout(() => {
      if (!stopped) {
        console.info(`${LOG} Re-scan atrasado (${delay / 1000}s)...`);
        scan();
      }
    }, delay);
  }

  return {
    stop(): void {
      stopped = true;
      if (scanTimer) clearTimeout(scanTimer);
      observer.disconnect();
      stopNavigation();
      destroyAllOverlays();
      sidebar.destroy();
    },
    getCollectedAds(): ParsedAd[] {
      return registry.all();
    },
    searchByDomain(domain: string): ParsedAd[] {
      return searchByDomainIndex(domain, domainIndex);
    },
    getDomainIndex(): DomainIndex {
      return domainIndex;
    },
    openSearch(domain?: string): void {
      sidebar.open(domain);
    },
  };
}
