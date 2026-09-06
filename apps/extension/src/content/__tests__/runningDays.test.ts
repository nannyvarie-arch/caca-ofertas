import { describe, expect, it } from 'vitest';
import type { ParsedAd } from '@caca-oferta/types';
import {
  RUNNING_DAYS_TIERS,
  formatRunningDays,
  runningDaysOf,
  runningDaysTier,
} from '../runningDays';

describe('runningDaysTier (faixas de tempo — seção 09)', () => {
  it('expõe as 6 faixas esperadas', () => {
    expect(RUNNING_DAYS_TIERS.map((t) => t.label)).toEqual([
      '1–6 dias',
      '7–14 dias',
      '15–29 dias',
      '30–59 dias',
      '60–89 dias',
      '90+ dias',
    ]);
  });

  it('classifica os limites inferior e superior de cada faixa', () => {
    expect(runningDaysTier(1)?.key).toBe('t1');
    expect(runningDaysTier(6)?.key).toBe('t1');
    expect(runningDaysTier(7)?.key).toBe('t2');
    expect(runningDaysTier(14)?.key).toBe('t2');
    expect(runningDaysTier(15)?.key).toBe('t3');
    expect(runningDaysTier(29)?.key).toBe('t3');
    expect(runningDaysTier(30)?.key).toBe('t4');
    expect(runningDaysTier(59)?.key).toBe('t4');
    expect(runningDaysTier(60)?.key).toBe('t5');
    expect(runningDaysTier(89)?.key).toBe('t5');
    expect(runningDaysTier(90)?.key).toBe('t6');
    expect(runningDaysTier(365)?.key).toBe('t6');
  });

  it('rejeita valores inválidos ou 0', () => {
    expect(runningDaysTier(0)).toBeNull();
    expect(runningDaysTier(-3)).toBeNull();
    expect(runningDaysTier(Number.NaN)).toBeNull();
    expect(runningDaysTier(null)).toBeNull();
    expect(runningDaysTier(undefined)).toBeNull();
  });
});

function makeAd(overrides: Partial<ParsedAd>): ParsedAd {
  return {
    adLibraryId: null,
    pageId: null,
    pageName: null,
    status: null,
    deliveryStartDate: null,
    deliveryStopDate: null,
    platforms: null,
    mediaType: 'desconhecida',
    creativeText: null,
    headline: null,
    description: null,
    destinationUrl: null,
    destinationDomain: null,
    adSnapshotUrl: null,
    cta: null,
    ...overrides,
  };
}

const NOW = new Date(2026, 8, 5); // 2026-09-05

describe('runningDaysOf (regra da FASE 04 na UI)', () => {
  it('anúncio ativo: hoje − início', () => {
    expect(
      runningDaysOf(makeAd({ status: 'ativo', deliveryStartDate: '2026-08-22' }), NOW),
    ).toBe(14);
  });

  it('anúncio encerrado com stop: fim − início', () => {
    expect(
      runningDaysOf(
        makeAd({ status: 'encerrado', deliveryStartDate: '2026-06-10', deliveryStopDate: '2026-08-05' }),
        NOW,
      ),
    ).toBe(56);
  });

  it('anúncio encerrado sem stop → null (não inventa)', () => {
    expect(
      runningDaysOf(makeAd({ status: 'encerrado', deliveryStartDate: '2026-06-10' }), NOW),
    ).toBeNull();
  });

  it('anúncio desconhecido usa a mesma base do ativo (hoje − início)', () => {
    expect(
      runningDaysOf(makeAd({ status: 'desconhecido', deliveryStartDate: '2026-08-22' }), NOW),
    ).toBe(14);
  });

  it('sem status (legado) mantém hoje − início', () => {
    expect(runningDaysOf(makeAd({ deliveryStartDate: '2026-08-22' }), NOW)).toBe(14);
  });

  it('sem data de início → null', () => {
    expect(runningDaysOf(makeAd({ status: 'ativo' }), NOW)).toBeNull();
  });
});

describe('formatRunningDays', () => {
  it('singular e plural', () => {
    expect(formatRunningDays(1)).toBe('1 dia');
    expect(formatRunningDays(35)).toBe('35 dias');
  });

  it('null → não identificado (nunca inventa)', () => {
    expect(formatRunningDays(null)).toBe('não identificado');
  });
});