// CAÇAOFERTA — Validação estrutural do NormalizedAd (FASE 04).
// Verifica tipos, formatos e consistência interna. NÃO rejeita um anúncio
// inteiro porque um campo opcional está ausente: campos desconhecidos são
// válidos como null; erros reais (formato inválido, inconsistência) entram na
// lista `issues`. Um anúncio NÃO é descartado por ter issues — serve para
// depuração e para os testes.

import type { NormalizedAd, NormalizedAdStatus, NormalizedMediaType } from '@caca-oferta/types';
import { NORMALIZED_PLATFORMS } from '@caca-oferta/types';
import { extractIsoDateFromPhrase } from './date';
import { normalizeDomain } from './domain';
import { getLogger } from './logging';

export interface NormalizedAdValidation {
  ok: boolean;
  issues: string[];
}

const AD_ID_PATTERN = /^\d{5,}$/;
const PAGE_ID_PATTERN = /^\d{4,}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const KNOWN_PLATFORMS = new Set<string>(NORMALIZED_PLATFORMS);
const STATUS_SET = new Set<NormalizedAdStatus>(['active', 'inactive', 'unknown']);
const MEDIA_SET = new Set<NormalizedMediaType>(['image', 'video', 'carousel', 'unknown']);

function isValidHttpUrl(value: string | null): boolean {
  if (value === null) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidCalendarDate(value: string | null): boolean {
  if (value === null) return true;
  // Round-trip: precisa ser ISO válida E representar a mesma data de calendário.
  return ISO_DATE_PATTERN.test(value) && extractIsoDateFromPhrase(value) === value;
}

function isValidText(value: string | null): boolean {
  return value === null || (typeof value === 'string' && value.trim().length > 0);
}

export function validateNormalizedAd(ad: NormalizedAd): NormalizedAdValidation {
  const issues: string[] = [];

  if (!ad || typeof ad !== 'object') {
    return { ok: false, issues: ['anúncio não é um objeto'] };
  }

  if (!STATUS_SET.has(ad.status)) {
    issues.push(`status inválido: ${String(ad.status)}`);
  }
  if (!MEDIA_SET.has(ad.mediaType)) {
    issues.push(`mediaType inválido: ${String(ad.mediaType)}`);
  }

  if (ad.adLibraryId !== null && !AD_ID_PATTERN.test(ad.adLibraryId)) {
    issues.push(`adLibraryId não numérico: ${ad.adLibraryId}`);
  }
  if (ad.pageId !== null && !PAGE_ID_PATTERN.test(ad.pageId)) {
    issues.push(`pageId não numérico: ${ad.pageId}`);
  }

  for (const key of ['pageName', 'creativeText', 'headline', 'description', 'cta'] as const) {
    if (!isValidText(ad[key])) issues.push(`${key} inválido`);
  }

  if (!Array.isArray(ad.platforms)) {
    issues.push('platforms deve ser um array');
  } else {
    for (const platform of ad.platforms) {
      if (!KNOWN_PLATFORMS.has(platform)) {
        issues.push(`plataforma desconhecida: ${String(platform)}`);
      }
    }
  }

  if (!isValidCalendarDate(ad.deliveryStartDate)) {
    issues.push(`deliveryStartDate inválida: ${String(ad.deliveryStartDate)}`);
  }
  if (!isValidCalendarDate(ad.deliveryStopDate)) {
    issues.push(`deliveryStopDate inválida: ${String(ad.deliveryStopDate)}`);
  }

  if (ad.runningDays !== null && (!Number.isInteger(ad.runningDays) || ad.runningDays < 0)) {
    issues.push(`runningDays inválido: ${String(ad.runningDays)}`);
  }

  if (!isValidHttpUrl(ad.destinationUrl)) {
    issues.push(`destinationUrl inválida: ${String(ad.destinationUrl)}`);
  }
  if (ad.destinationDomain !== null && typeof ad.destinationDomain !== 'string') {
    issues.push('destinationDomain inválido');
  }
  if (ad.destinationUrl) {
    const expected = normalizeDomain(ad.destinationUrl);
    if (ad.destinationDomain === null) {
      issues.push('URL de destino presente sem domínio normalizado');
    } else if (expected !== null && expected !== ad.destinationDomain) {
      issues.push(`destinationDomain inconsistente com a URL: ${ad.destinationDomain}`);
    }
  }

  for (const key of ['adSnapshotUrl', 'creativeUrl', 'thumbnailUrl'] as const) {
    if (!isValidHttpUrl(ad[key])) {
      issues.push(`${key} inválida: ${String(ad[key])}`);
    }
  }

  return { ok: issues.length === 0, issues };
}

/**
 * Registra issues no modo debug. Usado pelo pipeline para manter o log com a
 * mesma saída do parser (nunca expõe secretos — issues são mensagens estáticas).
 */
export function logValidationIssues(issues: string[]): void {
  if (issues.length === 0) return;
  const logger = getLogger('parser');
  logger.debug('Parse completed with issues');
  for (const issue of issues) logger.debug(`- ${issue}`);
}