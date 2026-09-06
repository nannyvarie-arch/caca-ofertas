// CAÇAOFERTA — Detecção de cards de anúncios na Meta Ads Library.
//
// Estratégia: NÃO confiar em uma classe CSS específica. O detector combina
// marcadores públicos estáveis da página (textos visíveis, padrões de URL de
// links, relação estrutural pai/card) e pontua cada candidato. Candidatos
// aninhados são colapsados para o container mais externo que ainda contém
// exatamente um perfil de página.
//
// Limitações conhecidas (FASE 02): sem login/autorização, a estrutura exata do
// DOM da Meta não pode ser inspecionada neste ambiente; portanto o parser é
// defensivo — informações não confirmadas retornam null e são registradas.

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
import { findTextMatch, normalizeText } from './text';

export const MAX_CLIMB_DEPTH = 12;
export const MIN_AD_CARD_SCORE = 3;

export type StatusToken = 'active' | 'inactive' | 'unknown';

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

/** Nota de confiança: quanto maior, mais forte a evidência de ser um card. */
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

/** True quando o elemento é um card de anúncio (relação estrutural + marcadores). */
export function isAdCard(el: Element): boolean {
  const pageLinks = countPageProfileLinks(el);
  if (pageLinks > 1) return false; // container com várias páginas → não é um card.

  const libraryId = findTextMatch(el, LIBRARY_ID_LABEL_PATTERN) !== null;
  const snapshot = Array.from(el.querySelectorAll('a[href]')).some((a) =>
    AD_SNAPSHOT_HREF_PATTERN.test(a.getAttribute('href') ?? ''),
  );
  const sponsored = findTextMatch(el, SPONSORED_TEXT_PATTERN) !== null;
  const media = elementHasMedia(el);

  if (pageLinks === 0) {
    // Fallback: card exibido sem link de perfil ainda deve ter ID + mídia/marcador.
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

/**
 * Localiza os cards de anúncio presentes no DOM.
 * Varre âncoras de perfil de página e rótulos "Library ID", então sobe na
 * árvore até o container externo que ainda seja um card (links de página == 1).
 */
export function findAdCards(root: Element = document.body): Element[] {
  const candidates = new Set<Element>();

  // Passo 1: âncoras de perfil de página.
  const pageAnchors = Array.from(root.querySelectorAll('a[href]')).filter((a) =>
    PAGE_PROFILE_HREF_PATTERN.test(a.getAttribute('href') ?? ''),
  );
  for (const anchor of pageAnchors) {
    let el: Element | null = anchor;
    for (let depth = 0; el && depth < MAX_CLIMB_DEPTH; depth++, el = el.parentElement) {
      if (!el.parentElement) break;
      if (countPageProfileLinks(el) > 1) break; // subiu para um container multi-page.
      if (isAdCard(el)) {
        candidates.add(el); // nó mais específico que ainda é um card completo.
        break;
      }
    }
  }

  // Passo 2: rótulos "Library ID" em cards que podem não ter link de perfil.
  const labelLeaves = collectLabelElements(root);
  for (const labelEl of labelLeaves) {
    let el: Element | null = labelEl;
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