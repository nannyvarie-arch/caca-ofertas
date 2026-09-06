// CAÇAOFERTA — Detecção robusta de cards de anúncios na Meta Ads Library.
//
// Estratégia multicamada:
//   1. Padrões primários: links de perfil, Library ID, snapshot links.
//   2. Fallback textual: qualquer elemento com "Library ID"/"Veiculação iniciada".
//   3. Fallback visual: containers com imagem significativa + texto.
//   4. Fallback agressivo: scan completo do DOM por qualquer container que
//      contenha mix de mídia + texto curto + links.
//
// Logging ALWAYS-ON via console.info para diagnóstico em tempo real.

import {
  AD_SNAPSHOT_HREF_PATTERN,
  LIBRARY_ID_LABEL_PATTERN,
  PAGE_PROFILE_HREF_PATTERN,
  SPONSORED_TEXT_PATTERN,
  START_DATE_PREFIX_PATTERN,
  STATUS_ACTIVE_PATTERN,
  STATUS_INACTIVE_PATTERN,
  STOP_DATE_PREFIX_PATTERN,
} from './patterns';
import { collectTextLeaves, findTextMatch, normalizeText } from './text';

const LOG_PREFIX = '[CaçaOferta Detection]';

export const MAX_CLIMB_DEPTH = 15;
export const MIN_AD_CARD_SCORE = 2;

export type StatusToken = 'active' | 'inactive' | 'unknown';

function log(msg: string, ...args: unknown[]): void {
  console.info(`${LOG_PREFIX} ${msg}`, ...args);
}

function elementHasMedia(el: Element): boolean {
  if (el.querySelector('video')) return true;
  if (el.querySelector('img')) return true;
  if (el.querySelector('iframe[allow*="autoplay"]')) return true;
  return false;
}

function countPageProfileLinks(el: Element): number {
  let count = 0;
  for (const anchor of el.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href') ?? '';
    if (PAGE_PROFILE_HREF_PATTERN.test(href)) count++;
  }
  return count;
}

export function adCardScore(
  el: Element,
  info?: { pageLinks?: number; libraryId?: boolean; snapshot?: boolean },
): number {
  const pageLinks = info?.pageLinks ?? countPageProfileLinks(el);
  const libraryId = info?.libraryId ?? findTextMatch(el, LIBRARY_ID_LABEL_PATTERN) !== null;
  const snapshot =
    info?.snapshot ??
    Array.from(el.querySelectorAll('a[href]')).some((a) =>
      AD_SNAPSHOT_HREF_PATTERN.test(a.getAttribute('href') ?? ''),
    );

  let score = 0;
  if (libraryId) score += 2;
  if (snapshot) score += 2;
  if (findTextMatch(el, SPONSORED_TEXT_PATTERN) !== null) score += 1;
  score += pageLinks > 0 ? 1 : 0;
  if (elementHasMedia(el)) score += 1;
  if (hasStatusText(el)) score += 1;
  if (findTextMatch(el, START_DATE_PREFIX_PATTERN) !== null) score += 1;
  if (findTextMatch(el, STOP_DATE_PREFIX_PATTERN) !== null) score += 1;
  return score;
}

export function hasStatusText(el: Element): boolean {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const text = normalizeText(node.textContent ?? '');
    if (text && (STATUS_ACTIVE_PATTERN.test(text) || STATUS_INACTIVE_PATTERN.test(text))) return true;
    node = walker.nextNode();
  }
  return false;
}

export function isAdCard(el: Element): boolean {
  const pageLinks = countPageProfileLinks(el);
  if (pageLinks > 1) return false;

  const libraryId = findTextMatch(el, LIBRARY_ID_LABEL_PATTERN) !== null;
  const snapshot = Array.from(el.querySelectorAll('a[href]')).some((a) =>
    AD_SNAPSHOT_HREF_PATTERN.test(a.getAttribute('href') ?? ''),
  );
  const sponsored = findTextMatch(el, SPONSORED_TEXT_PATTERN) !== null;
  const media = elementHasMedia(el);

  if (pageLinks === 0) {
    return libraryId && (sponsored || snapshot) && media;
  }

  const score = adCardScore(el, { pageLinks, libraryId, snapshot });
  return score >= MIN_AD_CARD_SCORE && (libraryId || snapshot || sponsored);
}

function byDocumentOrder(a: Element, b: Element): number {
  const position = a.compareDocumentPosition(b);
  if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
  if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
  return 0;
}

function climbAndFindCard(start: Element): Element | null {
  let el: Element | null = start;
  for (let depth = 0; el && depth < MAX_CLIMB_DEPTH; depth++, el = el.parentElement) {
    if (!el.parentElement) break;
    if (countPageProfileLinks(el) > 1) break;
    if (isAdCard(el)) return el;
  }
  return null;
}

/** Passo 1: busca primária por links de perfil + Library ID. */
function findAdCardsPrimary(root: Element): Element[] {
  const candidates = new Set<Element>();

  const pageAnchors = Array.from(root.querySelectorAll('a[href]')).filter((a) =>
    PAGE_PROFILE_HREF_PATTERN.test(a.getAttribute('href') ?? ''),
  );
  for (const anchor of pageAnchors) {
    const card = climbAndFindCard(anchor);
    if (card) candidates.add(card);
  }

  const labelLeaves = collectLabelElements(root);
  for (const labelEl of labelLeaves) {
    const card = climbAndFindCard(labelEl);
    if (card) candidates.add(card);
  }

  return Array.from(candidates).sort(byDocumentOrder);
}

/** Passo 2: fallback textual — busca por qualquer elemento com "Library ID". */
function findAdCardsTextualFallback(root: Element): Element[] {
  const candidates = new Set<Element>();
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();

  const textPatterns = [
    /library\s*id/i,
    /id\s*da\s*biblioteca/i,
    /started\s*running/i,
    /veicula[ção]+\s+iniciada/i,
    /come[çc]ou\s+a\s+(?:veicular|rodar)/i,
    /see\s*ad\s*details/i,
    /ver\s*detalhes\s*do\s*an[úu]ncio/i,
  ];

  while (node) {
    const text = normalizeText(node.textContent ?? '');
    if (text && node.parentElement) {
      const matches = textPatterns.some((p) => p.test(text));
      if (matches) {
        let el: Element | null = node.parentElement;
        for (let depth = 0; el && depth < MAX_CLIMB_DEPTH; depth++, el = el.parentElement) {
          if (!el.parentElement) break;
          if (countPageProfileLinks(el) > 1) break;
          if (elementHasMedia(el) || el.querySelectorAll('a[href]').length >= 2) {
            candidates.add(el);
            break;
          }
        }
      }
    }
    node = walker.nextNode();
  }

  return Array.from(candidates).sort(byDocumentOrder);
}

/** Passo 3: fallback visual — containers com imagem significativa. */
function findAdCardsImageFallback(root: Element): Element[] {
  const candidates = new Set<Element>();
  const images = Array.from(root.querySelectorAll('img'));

  for (const img of images) {
    const w = img.naturalWidth || img.width || 0;
    const h = img.naturalHeight || img.height || 0;
    if (w < 80 || h < 80) continue;

    const link = img.closest('a[href]');
    if (link) {
      const href = link.getAttribute('href') ?? '';
      if (PAGE_PROFILE_HREF_PATTERN.test(href)) continue;
    }

    let el: Element | null = img;
    for (let depth = 0; el && depth < MAX_CLIMB_DEPTH; depth++, el = el.parentElement) {
      if (!el.parentElement) break;
      if (countPageProfileLinks(el) > 1) break;
      if (isAdCard(el)) {
        candidates.add(el);
        break;
      }
    }
  }

  return Array.from(candidates).sort(byDocumentOrder);
}

/** Passo 4: fallback agressivo — scan completo por containers com mídia + links. */
function findAdCardsAggressiveFallback(root: Element): Element[] {
  const candidates = new Set<Element>();

  const allContainers = root.querySelectorAll('div, section, article, li');
  for (const el of allContainers) {
    const hasImg = el.querySelector('img[width], img[height], img') !== null;
    const linkCount = el.querySelectorAll('a[href]').length;
    const textLeaves = collectTextLeaves(el);
    const hasShortText = textLeaves.some((t) => t.length >= 3 && t.length <= 200);
    const isSmall = el.querySelectorAll('*').length < 200;

    if (hasImg && linkCount >= 2 && hasShortText && isSmall) {
      if (countPageProfileLinks(el) <= 1) {
        candidates.add(el);
      }
    }
  }

  return Array.from(candidates).sort(byDocumentOrder);
}

/** Elementos cujo texto contém o rótulo "Library ID"/"ID da biblioteca". */
function collectLabelElements(root: Element): Element[] {
  const out: Element[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const text = normalizeText(node.textContent ?? '');
    if (text && LIBRARY_ID_LABEL_PATTERN.test(text) && node.parentElement) {
      out.push(node.parentElement);
    }
    node = walker.nextNode();
  }
  return out;
}

/**
 * Remove candidatos aninhados: quando um card é descendente de outro card na
 * mesma lista, mantém apenas o ancestral (container externo).
 */
function deduplicateNestedCards(cards: Element[]): Element[] {
  return cards.filter((el) => !cards.some((other) => other !== el && other.contains(el)));
}

/**
 * Localiza os cards de anúncio usando estratégia multicamada.
 * Cada passo é mais agressivo que o anterior.
 */
export function findAdCards(root: Element = document.body): Element[] {
  const t0 = performance.now();

  // Passo 1: padrões primários (mais confiável).
  const primary = deduplicateNestedCards(findAdCardsPrimary(root));
  log(`Passo 1 (primário): ${primary.length} cards encontrados`);

  if (primary.length > 0) {
    log(`Detecção concluída em ${(performance.now() - t0).toFixed(1)}ms — ${primary.length} cards`);
    return primary;
  }

  // Passo 2: fallback textual.
  const textual = deduplicateNestedCards(findAdCardsTextualFallback(root));
  log(`Passo 2 (textual): ${textual.length} cards encontrados`);

  if (textual.length > 0) {
    log(`Detecção concluída em ${(performance.now() - t0).toFixed(1)}ms — ${textual.length} cards`);
    return textual;
  }

  // Passo 3: fallback visual (imagens).
  const visual = deduplicateNestedCards(findAdCardsImageFallback(root));
  log(`Passo 3 (visual): ${visual.length} cards encontrados`);

  if (visual.length > 0) {
    log(`Detecção concluída em ${(performance.now() - t0).toFixed(1)}ms — ${visual.length} cards`);
    return visual;
  }

  // Passo 4: fallback agressivo.
  const aggressive = deduplicateNestedCards(findAdCardsAggressiveFallback(root));
  log(`Passo 4 (agressivo): ${aggressive.length} cards encontrados`);

  log(`Detecção concluída em ${(performance.now() - t0).toFixed(1)}ms — total: ${aggressive.length} cards`);

  // Diagnóstico: salva info do DOM quando debug está ativo.
  dumpPageDiagnostics(root);

  return aggressive;
}

/**
 * Diagnóstico: salva informações sobre a estrutura do DOM em chrome.storage.local.
 */
export function dumpPageDiagnostics(root: Element): void {
  try {
    if (typeof localStorage === 'undefined' || localStorage.getItem('co.debug') !== '1') return;
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;

    const allHrefs = Array.from(root.querySelectorAll('a[href]'))
      .map((a) => a.getAttribute('href') ?? '')
      .filter((h) => h.includes('facebook.com'))
      .slice(0, 50);

    const textSamples: string[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node: Node | null = walker.nextNode();
    let count = 0;
    while (node && count < 100) {
      const text = normalizeText(node.textContent ?? '');
      if (text && text.length > 3 && text.length < 200) {
        textSamples.push(text);
        count++;
      }
      node = walker.nextNode();
    }

    const diagnostics = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      totalAnchors: root.querySelectorAll('a[href]').length,
      totalImages: root.querySelectorAll('img').length,
      totalDivs: root.querySelectorAll('div').length,
      sampleHrefs: allHrefs,
      sampleTexts: textSamples.slice(0, 30),
    };

    chrome.storage.local.set({ 'co.diagnostics': diagnostics });
    log('Diagnóstico salvo em chrome.storage.local[co.diagnostics]');
  } catch {
    // Diagnóstico é best-effort.
  }
}
