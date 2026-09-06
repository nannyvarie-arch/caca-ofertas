// CAÇAOFERTA — Extração dos campos de um anúncio a partir do card.
// Best-effort: campos não confirmados retornam null (nunca inventar dados).

import {
  AD_SNAPSHOT_HREF_PATTERN,
  CAROUSEL_INDICATOR_PATTERN,
  KNOWN_PLATFORM_NAMES,
  LIBRARY_ID_LABEL_PATTERN,
  PAGE_ID_IN_HREF_PATTERN,
  PAGE_PROFILE_HREF_PATTERN,
  PLATFORM_LABELS,
} from './patterns';
import { collectTextLeaves, isLikelyCreativeText, normalizeText } from './text';
import type { StatusToken } from './detection';

/** Tokens internos de tipo de mídia (mapeados para o domínio pt no parseAd). */
export type MediaToken = 'image' | 'video' | 'carousel' | 'unknown';

export interface ParsedPageInfo {
  pageId: string | null;
  pageName: string | null;
}

/** Biblioteca de anúncios: ID oficial quando exposto. Nunca gera ID falso. */
export function extractLibraryId(el: Element): string | null {
  const leaf = collectTextLeaves(el).find((t) => LIBRARY_ID_LABEL_PATTERN.test(t));
  if (leaf) {
    const match = LIBRARY_ID_LABEL_PATTERN.exec(leaf);
    if (match?.[1]) return match[1];
  }
  for (const anchor of el.querySelectorAll('a[href]')) {
    const match = AD_SNAPSHOT_HREF_PATTERN.exec(anchor.getAttribute('href') ?? '');
    if (match?.[1]) return match[1];
  }
  return null;
}

/** URL de visualização do anúncio na própria Biblioteca (link real da página). */
export function extractSnapshotUrl(el: Element): string | null {
  for (const anchor of el.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href') ?? '';
    const normalized = href.startsWith('//') ? `https:${href}` : href;
    if (AD_SNAPSHOT_HREF_PATTERN.test(normalized)) return normalized;
  }
  return null;
}

/** Página anunciante: nome + ID extraídos do link de perfil (quando presente). */
export function extractPageInfo(el: Element): ParsedPageInfo {
  for (const anchor of el.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href') ?? '';
    const match = PAGE_PROFILE_HREF_PATTERN.exec(href);
    if (!match?.[1]) continue;
    const name = normalizeText(anchor.textContent ?? '') || null;
    return { pageId: match[1], pageName: name };
  }
  return { pageId: null, pageName: null };
}

export function extractPageIdFromHref(href: string): string | null {
  const match = PAGE_ID_IN_HREF_PATTERN.exec(href);
  return match?.[1] ?? null;
}

/** Status: active / inactive / unknown. Ausência NÃO implica inativo. */
export function extractStatus(el: Element): StatusToken {
  const leaves = collectTextLeaves(el);
  let inactive = false;
  for (const text of leaves) {
    if (text.length > 24) continue; // rótulos de status são curtos ("Active")
    if (/^(?:active|ativo)$/i.test(text)) return 'active';
    if (/^(?:inactive|inativo|encerrado|finalizado)$/i.test(text)) inactive = true;
  }
  return inactive ? 'inactive' : 'unknown';
}

/** Plataformas de veiculação expostas (Facebook, Instagram, Messenger, Audience Network). */
export function extractPlatforms(el: Element): string[] {
  const found = new Set<string>();
  const consider = (value: string): void => {
    const key = value.trim().toLowerCase();
    const canonical = PLATFORM_LABELS[key];
    if (canonical) found.add(canonical);
  };

  for (const target of el.querySelectorAll('[aria-label], [title]')) {
    const label = target.getAttribute('aria-label') ?? target.getAttribute('title');
    if (label && label.length <= 40) consider(label);
  }
  for (const anchor of el.querySelectorAll('[aria-label]')) {
    const label = anchor.getAttribute('aria-label') ?? '';
    if (label.length <= 40) consider(label);
  }
  // Texto visível igual ao nome da plataforma (ex.: "Instagram").
  for (const leaf of collectTextLeaves(el)) {
    if (leaf.length > 32) continue;
    const key = leaf.toLowerCase();
    if (KNOWN_PLATFORM_NAMES.includes(key)) consider(key);
  }
  return Array.from(found);
}

/** Tipo de mídia: image / video / carousel / unknown. */
export function extractMediaType(el: Element): MediaToken {
  const video = el.querySelector('video');
  if (video) return 'video';
  const iframe = el.querySelector('iframe[src*="video"], iframe[allow*="autoplay"][src*="video"]');
  if (iframe) return 'video';

  const leaves = collectTextLeaves(el);
  const hasCarouselIndicator = leaves.some((t) => t.length <= 12 && CAROUSEL_INDICATOR_PATTERN.test(t));
  const images = Array.from(el.querySelectorAll('img')).filter(isCreativeImage);
  if (hasCarouselIndicator || images.length > 1) return 'carousel';
  if (images.length === 1) return 'image';
  return 'unknown';
}

function isMeaningfulImage(img: HTMLImageElement): boolean {
  const w = img.naturalWidth || img.width || 0;
  const h = img.naturalHeight || img.height || 0;
  return w >= 80 && h >= 80;
}

/**
 * Imagens candidatas ao CRIATIVO: significativas e fora do cabeçalho da página
 * (avatar/foto de perfil ficam dentro de links de perfil e não são criativo).
 */
function isCreativeImage(img: HTMLImageElement): boolean {
  if (!isMeaningfulImage(img)) return false;
  const link = img.closest('a[href]');
  if (link) {
    const href = link.getAttribute('href') ?? '';
    if (PAGE_PROFILE_HREF_PATTERN.test(href)) return false;
  }
  return true;
}

/** Links externos (não-Facebook) dentro do card — candidatos a destino/CTA.
 *  l.facebook.com e fb.me são redirecionadores de clique da Meta e contam como
 *  âncoras de CTA (o destino real é resolvido na FASE 03). */
export function findExternalAnchors(el: Element): HTMLAnchorElement[] {
  const anchors: HTMLAnchorElement[] = [];
  for (const anchor of el.querySelectorAll('a[href]')) {
    const href = anchor.getAttribute('href') ?? '';
    if (!/^https?:/i.test(href) && !href.startsWith('//')) continue;
    const host = new URL(href.startsWith('//') ? `https:${href}` : href).hostname;
    const isFb = host === 'facebook.com' || host.endsWith('.facebook.com');
    if (isFb && host !== 'l.facebook.com' && host !== 'fb.me' && host !== 'm.me') continue;
    anchors.push(anchor as HTMLAnchorElement);
  }
  return anchors;
}

/**
 * URL de destino: decodifica l.facebook.com/l.php?u= quando presente, senão o
 * primeiro link externo visível. Nenhuma URL é inventada.
 */
export function extractDestinationUrl(el: Element): string | null {
  const anchors = Array.from(el.querySelectorAll('a[href]'));
  for (const anchor of anchors) {
    const raw = anchor.getAttribute('href') ?? '';
    const href = raw.startsWith('//') ? `https:${raw}` : raw;
    try {
      const url = new URL(href);
      if (url.hostname === 'l.facebook.com' && url.pathname.endsWith('/l.php') && url.searchParams.has('u')) {
        const decoded = url.searchParams.get('u');
        if (decoded && /^https?:/i.test(decoded)) return decoded;
      }
      if (url.hostname === 'facebook.com' || url.hostname.endsWith('.facebook.com')) continue;
      if (/^https?:/i.test(href)) return href;
    } catch {
      // href inválida: ignora este link.
    }
  }
  return null;
}

export interface ParsedCreative {
  creativeText: string | null;
  headline: string | null;
  description: string | null;
  cta: string | null;
}

/** Texto criativo, headline, descrição e CTA (best-effort, sem inventar). */
export function extractCreative(el: Element): ParsedCreative {
  const candidateLeaves = collectTextLeaves(el).filter((t) => isLikelyCreativeText(t));
  const ordered = [...candidateLeaves].sort((a, b) => b.length - a.length);
  const creativeText = ordered[0] ?? null;

  const external = findExternalAnchors(el);
  const ctaAnchor =
    external.find((a) => {
      const t = normalizeText(a.textContent ?? '');
      return t.length >= 2 && t.length <= 40;
    }) ?? null;
  const cta = ctaAnchor ? normalizeText(ctaAnchor.textContent ?? '') : null;

  // A descrição só existe quando há uma segunda evidência textual distinta do
  // texto principal e do CTA (nada é inventado nem duplicado).
  let description: string | null = null;
  for (const leaf of ordered) {
    if (leaf === creativeText) continue;
    if (cta && leaf === cta) continue;
    description = leaf;
    break;
  }

  // Headline = texto do CTA (link externo). Sem CTA/estrutura de título, null.
  const headline = cta && cta.length <= 60 ? cta : null;

  return { creativeText, headline, description, cta };
}

export interface CreativeUrls {
  videoUrl: string | null;
  iframeSrc: string | null;
  thumbnailUrl: string | null;
  creativeUrl: string | null;
}

/**
 * URLs de mídia suplementares, sem enriquecimento falso (seção 24):
 * - vídeo: arquivo de mídia em videoUrl/creativeUrl; capa em thumbnailUrl;
 * - imagem/carrossel: a Meta renderiza o próprio criativo como capa — não
 *   fabricamos um "arquivo original" menor; thumbnail e creative apontam para
 *   a mesma imagem extraída (ver NormalizedAd.thumbnailUrl).
 */
export function extractCreativeUrls(el: Element): CreativeUrls {
  const video = el.querySelector('video');
  let videoUrl: string | null = null;
  if (video) {
    const src = video.currentSrc || video.src || video.getAttribute('src') || '';
    if (src.startsWith('http')) videoUrl = src;
  }

  const iframe = el.querySelector<HTMLIFrameElement>('iframe[src*="video"], iframe[allow*="autoplay"]');
  const iframeSrc = iframe ? iframe.src || iframe.getAttribute('src') : null;

  const images = Array.from(el.querySelectorAll('img')).filter(isCreativeImage);
  const mainImage = images[images.length - 1];
  const imageUrl = mainImage ? mainImage.currentSrc || mainImage.src || mainImage.getAttribute('src') || null : null;
  const imageUrlHttp = imageUrl && imageUrl.startsWith('http') ? imageUrl : null;

  const poster = video ? video.getAttribute('poster') : null;
  const thumbnailUrl = poster && poster.startsWith('http') ? poster : imageUrlHttp;

  return { videoUrl, iframeSrc, thumbnailUrl, creativeUrl: videoUrl ?? imageUrlHttp };
}

export interface MediaInfo {
  mediaType: MediaToken;
  videoUrl: string | null;
  iframeSrc: string | null;
  thumbnailUrl: string | null;
  creativeUrl: string | null;
}

/**
 * Informações de mídia consolidadas (tipo + URLs), usadas pelo parser para
 * preencher NormalizedAd.mediaType / creativeUrl / thumbnailUrl.
 */
export function extractMediaInfo(el: Element): MediaInfo {
  const mediaType = extractMediaType(el);
  const urls = extractCreativeUrls(el);
  return {
    mediaType,
    videoUrl: urls.videoUrl,
    iframeSrc: urls.iframeSrc,
    thumbnailUrl: urls.thumbnailUrl,
    creativeUrl: urls.creativeUrl,
  };
}