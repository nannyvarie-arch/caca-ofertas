import { describe, expect, it } from 'vitest';
import { extractIsoDateFromPhrase, calculateRunningDays } from '../date';

describe('extractIsoDateFromPhrase', () => {
  it('entende data em inglês', () => {
    expect(extractIsoDateFromPhrase('August 22, 2026')).toBe('2026-08-22');
  });

  it('entende data em pt-BR por extenso', () => {
    expect(extractIsoDateFromPhrase('22 de agosto de 2026')).toBe('2026-08-22');
    expect(extractIsoDateFromPhrase('1 de maio de 2026')).toBe('2026-05-01');
  });

  it('entenda abreviações de mês pt-BR', () => {
    expect(extractIsoDateFromPhrase('22 de ago de 2026')).toBe('2026-08-22');
    expect(extractIsoDateFromPhrase('1 de set de 2026')).toBe('2026-09-01');
    expect(extractIsoDateFromPhrase('5 de mar de 2026')).toBe('2026-03-05');
  });

  it('entenda data numérica DD/MM/AAAA', () => {
    expect(extractIsoDateFromPhrase('22/08/2026')).toBe('2026-08-22');
  });

  it('entenda data ISO', () => {
    expect(extractIsoDateFromPhrase('2026-09-05')).toBe('2026-09-05');
  });

  it('ignora frases sem data', () => {
    expect(extractIsoDateFromPhrase('Lorem ipsum dolor sit amet')).toBeNull();
    expect(extractIsoDateFromPhrase('')).toBeNull();
  });

  it('rejeita data implausível', () => {
    expect(extractIsoDateFromPhrase('13/13/2099')).toBeNull();
    expect(extractIsoDateFromPhrase('August 22, 1800')).toBeNull();
  });
});

describe('calculateRunningDays', () => {
  it('exemplo do spec: 2026-08-22 → 2026-09-05 = 14 dias', () => {
    const now = new Date(2026, 8, 5); // setembro = mês 8 no Date
    expect(calculateRunningDays('2026-08-22', now)).toBe(14);
  });

  it('mesmo dia = 0', () => {
    const now = new Date(2026, 8, 5);
    expect(calculateRunningDays('2026-09-05', now)).toBe(0);
  });

  it('data futura → 0 (não negativa)', () => {
    const now = new Date(2026, 8, 5);
    expect(calculateRunningDays('2026-12-25', now)).toBe(0);
  });

  it('data inválida → null', () => {
    expect(calculateRunningDays('não é uma data', { now: new Date(2026, 8, 5) })).toBeNull();
    expect(calculateRunningDays('', { now: new Date(2026, 8, 5) })).toBeNull();
  });

  it('inativo com stop: fim − início', () => {
    expect(
      calculateRunningDays('2026-06-10', { status: 'inactive', stopIso: '2026-08-05', now: new Date(2026, 8, 5) }),
    ).toBe(56);
  });

  it('inativo sem stop → null', () => {
    expect(calculateRunningDays('2026-06-10', { status: 'inactive', now: new Date(2026, 8, 5) })).toBeNull();
  });

  it('ativo com stop ignorado (usa hoje − início)', () => {
    expect(
      calculateRunningDays('2026-08-22', { status: 'active', stopIso: '2026-08-05', now: new Date(2026, 8, 5) }),
    ).toBe(14);
  });

  it('stop antes do início → 0 (não negativo)', () => {
    expect(
      calculateRunningDays('2026-08-22', { status: 'inactive', stopIso: '2026-08-05', now: new Date(2026, 8, 5) }),
    ).toBe(0);
  });

  it('sem status mantém comportamento legado (hoje − início)', () => {
    expect(calculateRunningDays('2026-08-22', { now: new Date(2026, 8, 5) })).toBe(14);
  });
});