// CAÇAOFERTA — Ordenação e filtros dos resultados de pesquisa (FASE 03).
// Funções puras e testáveis. Os filtros atuam somente sobre dados realmente
// detectados (nada é inferido); dias rodando usa calculateRunningDays.

import type { ParsedAd } from '@caca-oferta/types';
import { calculateRunningDays } from './date';

export type SortKey = 'latest' | 'oldest' | 'longest' | 'shortest' | 'az' | 'za';

export type StatusFilterKey = 'all' | 'ativo' | 'encerrado' | 'desconhecido';
export type PlatformFilterKey = 'all' | 'facebook' | 'instagram' | 'messenger' | 'audience-network';
export type MediaFilterKey = 'all' | 'imagem' | 'video' | 'carrossel' | 'desconhecida';
export type MaxDaysFilterKey = 'all' | '7' | '30' | '90' | '180';

export type CtaFilterKey = 'all' | 'comprar agora' | 'saiba mais' | 'cadastre-se' | 'enviar mensagem' | string;

export interface AdFilters {
  status: StatusFilterKey;
  platform: PlatformFilterKey;
  media: MediaFilterKey;
  maxDays: MaxDaysFilterKey;
  cta?: CtaFilterKey;
  startDateFrom?: string | null;
  startDateTo?: string | null;
  runningDaysMin?: number | null;
  runningDaysMax?: number | null;
  pageName?: string | null;
}

export const DEFAULT_FILTERS: AdFilters = {
  status: 'all',
  platform: 'all',
  media: 'all',
  maxDays: 'all',
  cta: 'all',
  startDateFrom: null,
  startDateTo: null,
  runningDaysMin: null,
  runningDaysMax: null,
  pageName: null,
};

/** Não reconstrói o índice: atualização incremental via add(). */
function startMs(ad: ParsedAd): number | null {
  const parts = (ad.deliveryStartDate ?? '').split('-');
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (y === undefined || m === undefined || d === undefined) return null;
  if ([y, m, d].some(Number.isNaN)) return null;
  return Date.UTC(y, m - 1, d);
}

function runningDays(ad: ParsedAd): number | null {
  return ad.deliveryStartDate ? calculateRunningDays(ad.deliveryStartDate) : null;
}

function compareAdDate(a: ParsedAd, b: ParsedAd, desc: boolean): number {
  const na = startMs(a);
  const nb = startMs(b);
  if (na === null && nb === null) return 0;
  if (na === null) return 1;
  if (nb === null) return -1;
  return desc ? nb - na : na - nb;
}

function compareRunningDays(a: ParsedAd, b: ParsedAd, desc: boolean): number {
  const na = runningDays(a);
  const nb = runningDays(b);
  if (na === null && nb === null) return 0;
  if (na === null) return 1;
  if (nb === null) return -1;
  return desc ? nb - na : na - nb;
}

function compareName(a: ParsedAd, b: ParsedAd, desc: boolean): number {
  const na = (a.pageName ?? '').toLowerCase();
  const nb = (b.pageName ?? '').toLowerCase();
  const cmp = na < nb ? -1 : na > nb ? 1 : 0;
  return desc ? -cmp : cmp;
}

/** Filtra a lista pelo estado selecionado (status, plataforma, mídia, dias, CTA, data, página). */
/* ENTRE filtros diferentes: AND */
export function filterAds(ads: ParsedAd[], filters: AdFilters): ParsedAd[] {
  return ads.filter((ad) => {
    if (filters.status !== 'all' && ad.status !== filters.status) return false;
    if (filters.platform !== 'all' && !(ad.platforms ?? []).includes(filters.platform)) return false;
    if (filters.media !== 'all' && ad.mediaType !== filters.media) return false;
    if (filters.cta != null && filters.cta !== 'all' && filters.cta !== '' && (ad.cta ?? '').toLowerCase().includes(filters.cta?.toLowerCase() ?? '')) return false;
    if (filters.startDateFrom != null) {
      const adStart = ad.deliveryStartDate;
      if (!adStart) return false;
      const adDate = new Date(adStart).getTime();
      const fromDate = new Date(filters.startDateFrom).getTime();
      if (adDate < fromDate) return false;
    }
    if (filters.startDateTo != null) {
      const adStart = ad.deliveryStartDate;
      if (!adStart) return false;
      const adDate = new Date(adStart).getTime();
      const toDate = new Date(filters.startDateTo).getTime();
      if (adDate > toDate) return false;
    }
    if (filters.runningDaysMin != null) {
      const days = runningDays(ad);
      if (days === null || days < filters.runningDaysMin) return false;
    }
    if (filters.runningDaysMax != null) {
      const days = runningDays(ad);
      if (days === null || days > filters.runningDaysMax) return false;
    }
    if (filters.pageName != null && filters.pageName !== '') {
      const pageMatch = (ad.pageName ?? '').toLowerCase().includes(filters.pageName?.toLowerCase() ?? '');
      if (!pageMatch) return false;
    }
    if (filters.maxDays !== 'all') {
      const days = runningDays(ad);
      if (days === null || days > Number(filters.maxDays)) return false;
    }
    return true;
  });
}

/** Ordena a lista (estável) sobre os dados disponíveis; não
 *  inventa datas: anúncios sem data vão para o fim. */
export function sortAds(ads: ParsedAd[], sort: SortKey): ParsedAd[] {
  const copy = [...ads];
  switch (sort) {
    case 'latest':
      copy.sort((a, b) => compareAdDate(a, b, true));
      break;
    case 'oldest':
      copy.sort((a, b) => compareAdDate(a, b, false));
      break;
    case 'longest':
      copy.sort((a, b) => compareRunningDays(a, b, true));
      break;
    case 'shortest':
      copy.sort((a, b) => compareRunningDays(a, b, false));
      break;
    case 'az':
      copy.sort((a, b) => compareName(a, b, false));
      break;
    case 'za':
      copy.sort((a, b) => compareName(a, b, true));
      break;
    default:
      break;
  }
  return copy;
}