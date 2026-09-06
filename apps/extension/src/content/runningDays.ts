// CAÇAOFERTA — Dias rodando e faixas de tempo (FASE 05).
//
// Exibição REAL do tempo de veiculação sem classificar o anúncio como
// "vencedor" só porque roda há muitos dias: a ferramenta apenas mostra o
// tempo e agrupa em faixas visuais neutras (seção 09/10).
//
// runningDaysOf() centraliza a regra da FASE 04 (seção 12):
//   - ativo (ou sem status): hoje − início;
//   - encerrado com stop: fim − início;
//   - encerrado sem stop → null;
//   - sem início válido → null.

import type { ParsedAd } from '@caca-oferta/types';
import { calculateRunningDays } from './date';

export interface RunningDaysTier {
  /** chave usada na classe CSS (co-tier-t1 … co-tier-t6). */
  key: string;
  min: number;
  max: number;
  label: string;
}

/** Faixas de tempo de veiculação (1–6, 7–14, 15–29, 30–59, 60–89, 90+). */
export const RUNNING_DAYS_TIERS: readonly RunningDaysTier[] = [
  { key: 't1', min: 1, max: 6, label: '1–6 dias' },
  { key: 't2', min: 7, max: 14, label: '7–14 dias' },
  { key: 't3', min: 15, max: 29, label: '15–29 dias' },
  { key: 't4', min: 30, max: 59, label: '30–59 dias' },
  { key: 't5', min: 60, max: 89, label: '60–89 dias' },
  { key: 't6', min: 90, max: Number.POSITIVE_INFINITY, label: '90+ dias' },
];

/** Faixa de um número de dias; null para valores inválidos ou 0 (recém-iniciado). */
export function runningDaysTier(days: number | null | undefined): RunningDaysTier | null {
  if (typeof days !== 'number' || !Number.isFinite(days) || days < 1) return null;
  for (const tier of RUNNING_DAYS_TIERS) {
    if (days >= tier.min && days <= tier.max) return tier;
  }
  return null;
}

/** Dias de veiculação de um ParsedAd segundo as regras da FASE 04. */
export function runningDaysOf(ad: ParsedAd, now?: Date): number | null {
  if (!ad.deliveryStartDate) return null;
  const status: 'active' | 'inactive' | 'unknown' | null =
    ad.status === 'ativo'
      ? 'active'
      : ad.status === 'encerrado'
        ? 'inactive'
        : ad.status === 'desconhecido'
          ? 'unknown'
          : null;
  return calculateRunningDays(ad.deliveryStartDate, {
    stopIso: ad.deliveryStopDate,
    status,
    now,
  });
}

/** Texto "X dia(s)" com plural correto. */
export function formatRunningDays(days: number | null): string {
  if (days === null) return 'não identificado';
  return `${days} dia${days === 1 ? '' : 's'}`;
}