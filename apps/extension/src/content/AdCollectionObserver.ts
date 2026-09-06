// CAÇAOFERTA — Orquestrador de mineração da Biblioteca de Anúncios.
//
// Pipeline incremental:
//   1. MutationObserver no body (childList+subtree) — dispara no carregamento
//      de novos anúncios por scroll.
//   2. Debounce do scan (evita processamento excessivo).
//   3. Cada scan detecta cards, ignora os já processados (WeakSet/Map),
//      parseia apenas os novidades e anexa o badge (Shadow DOM).
//   4. Navegação SPA (pushState/popstate + diff de URL) reinicia a sessão
//      quando a pesquisa/filtros mudam.
//
// Robustez: um card malformado não interrompe os demais (try/catch por card).

import type { NormalizedAd, ParsedAd } from '@caca-oferta/types';
import type { SavedAdDto } from '@caca-oferta/shared';
import { MetaAdsLibraryAdapter, normalizedToParsed } from '../adapter/MetaAdsLibraryAdapter';
import { sendRuntimeRequest } from '../bridge/runtimeClient';
import { RuntimeMessageType } from '../bridge/messages';
import { AdRegistry, adKey, isValidAd } from './deduplicate';
import { DomainIndex, searchByDomain as searchByDomainIndex } from './DomainIndex';
import { isMetaAdsLibraryPage } from './isMetaAdsLibraryPage';
import { getLogger } from './logging';
import { getCurrentUrl, observeSpaNavigation } from './navigation';
import { attachOverlay, type OverlayHandle } from './overlay';
import { CaçaOfertaSidebar } from './sidebar';

export interface AdMiningHandle {
  stop(): void;
  getCollectedAds(): ParsedAd[];
  /** Pesquisa local por domínio (índice de anúncios detectados). */
  searchByDomain(domain: string): ParsedAd[];
  getDomainIndex(): DomainIndex;
  /** Abre o painel de pesquisa; com domínio, preenche e executa a busca. */
  openSearch(domain?: string): void;
}

export interface AdMiningOptions {
  debounceMs?: number;
  refreshDaysMs?: number;
  getRoot?: () => Element | null;
}

const DEFAULT_DEBOUNCE_MS = 500;
const DEFAULT_REFRESH_DAYS_MS = 60_000;

export function startAdMining(options: AdMiningOptions = {}): AdMiningHandle {
  const logger = getLogger('miner');
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const refreshDaysMs = options.refreshDaysMs ?? DEFAULT_REFRESH_DAYS_MS;
  const getRoot = options.getRoot ?? (() => document.body);

  const adapter = new MetaAdsLibraryAdapter();
  const registry = new AdRegistry();
  const domainIndex = new DomainIndex();
  const sidebar = new CaçaOfertaSidebar({
    getIndex: () => domainIndex,
    getAds: () => registry.all(),
  });
  const overlayAds = new Map<Element, ParsedAd>();
  const overlayHandles = new Map<Element, OverlayHandle>();
  // Snapshot NormalizedAd por chave de anúncio (parse ÚNICO, FASE 06): o mesmo
  // parse que alimenta a UI alimenta o botão salvar — sem segundo parse.
  const normalizedById = new Map<string, NormalizedAd>();
  let lastHref = getCurrentUrl();
  let lastDaysRefresh = 0;
  let scanTimer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

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
    sidebar.reset();
    lastDaysRefresh = 0;
    logger.info('Sessão reiniciada (novo estado de busca).');
  };

  const scan = (): void => {
    if (stopped) return;
    if (!isMetaAdsLibraryPage()) return;

    // A Meta pode trocar o estado sem eventos de history: detecta via URL.
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
      for (const card of cards) {
        const el = card.element;
        if (registry.hasElement(el)) continue;
        cardsDetected++;

        let normalized: NormalizedAd | null = null;
        try {
          normalized = adapter.parseAdCard(el);
        } catch (error) {
          logger.warn('Invalid ad skipped', error);
          continue;
        }

        if (!normalized) {
          invalid++;
          logger.debug('Invalid ad skipped', el);
          continue;
        }
        const ad = normalizedToParsed(normalized);

        if (!isValidAd(ad)) {
          invalid++;
          logger.debug('Invalid ad skipped', ad);
          continue;
        }

        if (registry.hasAd(ad)) {
          duplicates++;
          registry.markElement(el);
          // Mesmo anúncio num elemento NOVO (rerender): mantém badge sem duplicar dados.
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
          logger.debug('Duplicate ignored', { adLibraryId: ad.adLibraryId });
          continue;
        }

        registry.add(ad);
        normalizedById.set(adKey(ad), normalized);
        registry.markElement(el);
        domainIndex.add(ad);
        parsed++;
        const handle = attachOverlay(el, ad, {
          onSearchDomain: (d) => sidebar.open(d),
          onSave: () => sendSave(normalized),
        });
        overlayHandles.set(el, handle);
        overlayAds.set(el, ad);
        sidebar.refreshSearch();
        logger.debug('Ad parsed', {
          adLibraryId: ad.adLibraryId,
          pageId: ad.pageId,
          status: ad.status,
        });
      }
    } catch (error) {
      logger.warn('Falha no scan de anúncios', error);
    }

    // Atualiza "Rodando X dias" sem rerender constante (debounce + janela de 1min).
    const now = Date.now();
    if (now - lastDaysRefresh > refreshDaysMs) {
      for (const [el, ad] of overlayAds) {
        overlayHandles.get(el)?.update(ad);
      }
      lastDaysRefresh = now;
    }

    // Contadores da sidebar acompanham cada scan (memoizado dentro da sidebar).
    sidebar.syncStats();

    if (cardsDetected > 0 && cardsDetected < 200) {
      logger.debug(
        `Scan: ${cardsDetected} card(s), ${parsed} novo(s), ${duplicates} duplicado(s), ${invalid} inválido(s).`,
      );
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
  logger.info('Meta Ads Library detected');
  scan();

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