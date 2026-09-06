// CAÇAOFERTA — MetaAdsLibraryAdapter (FASE 02 + refinamento FASE 04).
// Implementa o contrato AdPlatformAdapter para a Biblioteca de Anúncios da Meta.
//
// Detecção: roots do DOM da Meta via combinação de marcadores textuais,
// padrões de URL e relações estruturais (ver detection.ts). Parser best-effort
// em camadas: extract helpers (parse-helpers) → NormalizedAd (canonical) →
// ParsedAd (visão de domínio pt). Nenhum dado é inventado: campos
// indisponíveis retornam null.
//
// A MetaAdsLibraryAdapter é a ÚNICA camada com conhecimento específico da Meta
// (seção 3): o parser em etapas parseAdCard() centraliza toda a extração.

import type { NormalizedAd, ParseConfidence, ParsedAd } from '@caca-oferta/types';
import { extractDateFromElement, calculateRunningDays } from '../content/date';
import { normalizeDomain } from '../content/domain';
import { logValidationIssues, validateNormalizedAd } from '../content/adValidation';
import { getLogger } from '../content/logging';
import { findAdCards } from '../content/detection';
import {
  extractCreative,
  extractDestinationUrl,
  extractLibraryId,
  extractMediaInfo,
  extractPageInfo,
  extractPlatforms,
  extractSnapshotUrl,
  extractStatus,
} from '../content/parse-helpers';
import type { AdNode, AdPlatformAdapter } from './AdPlatformAdapter';

const STATUS_MAP: Record<string, ParsedAd['status']> = {
  active: 'ativo',
  inactive: 'encerrado',
  unknown: 'desconhecido',
};

const MEDIA_MAP: Record<string, ParsedAd['mediaType']> = {
  image: 'imagem',
  video: 'video',
  carousel: 'carrossel',
  unknown: 'desconhecida',
};

/**
 * Confiança do parser (seção 28): pontuação interna para depuração/filtros.
 * NÃO é probabilidade e não deve ser exibida ao usuário como certeza.
 */
export function computeParseConfidence(ad: NormalizedAd): ParseConfidence {
  let score = 0;
  if (ad.adLibraryId) score += 2;
  if (ad.pageId) score += 1;
  if (ad.pageName) score += 1;
  if (ad.deliveryStartDate) score += 1;
  if (ad.status !== 'unknown') score += 1;
  if (ad.destinationDomain) score += 1;
  if (ad.creativeText) score += 1;
  if (score >= 6) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

/** Deriva o ParsedAd (tokens pt) a partir do NormalizedAd (tokens en). */
export function normalizedToParsed(normalized: NormalizedAd): ParsedAd {
  return {
    adLibraryId: normalized.adLibraryId,
    pageId: normalized.pageId,
    pageName: normalized.pageName,
    status: STATUS_MAP[normalized.status] ?? 'desconhecido',
    deliveryStartDate: normalized.deliveryStartDate,
    deliveryStopDate: normalized.deliveryStopDate,
    platforms: normalized.platforms.length ? normalized.platforms : null,
    mediaType: MEDIA_MAP[normalized.mediaType] ?? 'desconhecida',
    creativeText: normalized.creativeText,
    headline: normalized.headline,
    description: normalized.description,
    destinationUrl: normalized.destinationUrl,
    destinationDomain: normalized.destinationDomain,
    adSnapshotUrl: normalized.adSnapshotUrl,
    cta: normalized.cta,
    creativeUrl: normalized.creativeUrl,
  };
}

export class MetaAdsLibraryAdapter implements AdPlatformAdapter {
  detectAds(container: Element): AdNode[] {
    return findAdCards(container).map((element) => ({ element }));
  }

  /**
   * Parser em etapas (seção 26): extrai TODOS os campos do card em uma única
   * estrutura canônica NormalizedAd, com validação e confiança. Nenhuma
   * etapa pode derrubar as demais — falhas pontuais viram campos null.
   */
  parseAdCard(element: Element): NormalizedAd | null {
    if (!element || !element.isConnected) return null;
    const logger = getLogger('parser');
    logger.debug('Parsing ad');

    const adLibraryId = extractLibraryId(element);
    if (adLibraryId) logger.debug('ID detected');

    const pageInfo = extractPageInfo(element);
    if (pageInfo.pageId || pageInfo.pageName) logger.debug('Page detected');

    const status = extractStatus(element);
    const deliveryStartDate = extractDateFromElement(element, 'start');
    const deliveryStopDate = extractDateFromElement(element, 'stop');
    if (deliveryStartDate || deliveryStopDate) logger.debug('Date detected');

    const platforms = extractPlatforms(element);
    const media = extractMediaInfo(element);
    if (media.mediaType !== 'unknown') logger.debug('Media detected');

    const creative = extractCreative(element);
    const destinationUrl = extractDestinationUrl(element);
    const destinationDomain = normalizeDomain(destinationUrl);
    if (destinationDomain) logger.debug('Domain detected');

    const runningDays =
      deliveryStartDate !== null
        ? calculateRunningDays(deliveryStartDate, { stopIso: deliveryStopDate, status })
        : null;

    const normalized: NormalizedAd = {
      adLibraryId,
      pageId: pageInfo.pageId,
      pageName: pageInfo.pageName,
      status,
      deliveryStartDate,
      deliveryStopDate,
      runningDays,
      platforms: platforms as NormalizedAd['platforms'],
      mediaType: media.mediaType,
      creativeText: creative.creativeText,
      headline: creative.headline,
      description: creative.description,
      cta: creative.cta,
      destinationUrl,
      destinationDomain,
      adSnapshotUrl: extractSnapshotUrl(element),
      creativeUrl: media.creativeUrl,
      thumbnailUrl: media.thumbnailUrl,
      parseConfidence: 'low',
    };
    normalized.parseConfidence = computeParseConfidence(normalized);

    const validation = validateNormalizedAd(normalized);
    if (validation.ok) {
      logger.debug('Parse completed');
    } else {
      logValidationIssues(validation.issues);
    }

    return normalized;
  }

  parseAd(node: AdNode): ParsedAd | null {
    const el = node?.element;
    if (!el) return null;
    const normalized = this.parseAdCard(el);
    return normalized ? normalizedToParsed(normalized) : null;
  }

  /** Forma canônica usada pelos getters granulares (sem duplicar extração). */
  private normalizedOf(node: AdNode): NormalizedAd | null {
    const el = node?.element;
    if (!el) return null;
    return this.parseAdCard(el);
  }

  getAdId(node: AdNode): string | null {
    return this.normalizedOf(node)?.adLibraryId ?? null;
  }

  getPage(node: AdNode): string | null {
    return this.normalizedOf(node)?.pageName ?? null;
  }

  getPageId(node: AdNode): string | null {
    return this.normalizedOf(node)?.pageId ?? null;
  }

  /** active | inactive | unknown (nunca null: ausência de badge = unknown). */
  getStatus(node: AdNode): string | null {
    return this.normalizedOf(node)?.status ?? null;
  }

  getStartDate(node: AdNode): string | null {
    return this.normalizedOf(node)?.deliveryStartDate ?? null;
  }

  getStopDate(node: AdNode): string | null {
    return this.normalizedOf(node)?.deliveryStopDate ?? null;
  }

  getPlatforms(node: AdNode): string[] | null {
    const platforms = this.normalizedOf(node)?.platforms;
    return platforms && platforms.length ? platforms : null;
  }

  /** image | video | carousel | unknown */
  getMediaType(node: AdNode): string | null {
    return this.normalizedOf(node)?.mediaType ?? null;
  }

  getCreativeText(node: AdNode): string | null {
    return this.normalizedOf(node)?.creativeText ?? null;
  }

  getHeadline(node: AdNode): string | null {
    return this.normalizedOf(node)?.headline ?? null;
  }

  getDescription(node: AdNode): string | null {
    return this.normalizedOf(node)?.description ?? null;
  }

  getCta(node: AdNode): string | null {
    return this.normalizedOf(node)?.cta ?? null;
  }

  getSnapshotUrl(node: AdNode): string | null {
    return this.normalizedOf(node)?.adSnapshotUrl ?? null;
  }

  getThumbnailUrl(node: AdNode): string | null {
    return this.normalizedOf(node)?.thumbnailUrl ?? null;
  }

  getCreativeUrl(node: AdNode): string | null {
    return this.normalizedOf(node)?.creativeUrl ?? null;
  }

  getRunningDays(node: AdNode): number | null {
    return this.normalizedOf(node)?.runningDays ?? null;
  }

  getConfidence(node: AdNode): string | null {
    return this.normalizedOf(node)?.parseConfidence ?? null;
  }

  getDestinationUrl(node: AdNode): string | null {
    return this.normalizedOf(node)?.destinationUrl ?? null;
  }

  getDomain(node: AdNode): string | null {
    return this.normalizedOf(node)?.destinationDomain ?? null;
  }

  getCreative(node: AdNode): unknown | null {
    const normalized = this.normalizedOf(node);
    if (!normalized) return null;
    return {
      mediaType: normalized.mediaType,
      status: normalized.status,
      creativeText: normalized.creativeText,
      headline: normalized.headline,
      description: normalized.description,
      cta: normalized.cta,
      destinationUrl: normalized.destinationUrl,
      adSnapshotUrl: normalized.adSnapshotUrl,
      videoUrl: normalized.mediaType === 'video' ? normalized.creativeUrl : null,
      thumbnailUrl: normalized.thumbnailUrl,
      creativeUrl: normalized.creativeUrl,
      iframeSrc: null,
      runningDays: normalized.runningDays,
      confidence: normalized.parseConfidence,
    };
  }
}