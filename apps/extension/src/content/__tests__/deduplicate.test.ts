import { describe, expect, it } from 'vitest';
import type { ParsedAd } from '@caca-oferta/types';
import { AdRegistry, adKey, deduplicateAds, isValidAd } from '../deduplicate';

const base: ParsedAd = {
  adLibraryId: '968129471240839',
  pageId: '123456789',
  pageName: 'NutSmart',
  status: 'ativo',
  deliveryStartDate: '2026-08-22',
  deliveryStopDate: null,
  platforms: ['facebook', 'instagram'],
  mediaType: 'imagem',
  creativeText: 'Texto criativo de exemplo com mais de vinte caracteres.',
  headline: null,
  description: null,
  destinationUrl: 'https://loja.nutsmart.com.br/promo',
  destinationDomain: 'loja.nutsmart.com.br',
  adSnapshotUrl: null,
  cta: 'Saiba mais',
  creativeUrl: null,
};

function noIdAd(pageId: string, startDate: string, text: string): ParsedAd {
  return { ...base, adLibraryId: null, pageId, deliveryStartDate: startDate, creativeText: text };
}

describe('AdRegistry / deduplicateAds', () => {
  it('não processa o mesmo anúncio duas vezes (mesmo ID)', () => {
    const registry = new AdRegistry();
    expect(registry.add({ ...base })).toBe(true);
    expect(registry.add({ ...base })).toBe(false);
    expect(registry.size).toBe(1);
  });

  it('anúncios com IDs diferentes são distintos', () => {
    const registry = new AdRegistry();
    expect(registry.add({ ...base })).toBe(true);
    expect(registry.add({ ...base, adLibraryId: '777' })).toBe(true);
    expect(registry.size).toBe(2);
  });

  it('fallback de chave para anúncio sem ID usa assinatura de campos', () => {
    const registry = new AdRegistry();
    const a = noIdAd('111', '2026-08-22', 'Texto de exemplo igual para deduplicar.');
    const b = noIdAd('111', '2026-08-22', 'Texto de exemplo igual para deduplicar.');
    expect(registry.add(a)).toBe(true);
    expect(registry.add(b)).toBe(false);
  });

  it('assinatura diferente não colide', () => {
    const registry = new AdRegistry();
    const a = noIdAd('111', '2026-08-22', 'Texto de exemplo igual para deduplicar.');
    const b = noIdAd('222', '2026-09-01', 'Outro texto completamente diferente aqui.');
    expect(registry.add(a)).toBe(true);
    expect(registry.add(b)).toBe(true);
  });

  it('deduplicateAds mantém somente os novos', () => {
    const registry = new AdRegistry();
    const dup = { ...base };
    const novos = deduplicateAds([{ ...base, adLibraryId: '1' }, dup, dup], registry);
    expect(novos).toHaveLength(2);
    expect(registry.size).toBe(2);
  });

  it('WeakSet marca elementos já processados', () => {
    const registry = new AdRegistry();
    const el1 = document.createElement('div');
    const el2 = document.createElement('div');
    expect(registry.hasElement(el1)).toBe(false);
    registry.markElement(el1);
    expect(registry.hasElement(el1)).toBe(true);
    expect(registry.hasElement(el2)).toBe(false);
  });

  it('isValidAd aceita anúncio parcial e rejeita vazio', () => {
    expect(isValidAd({ ...base })).toBe(true);
    expect(
      isValidAd({
        ...base,
        adLibraryId: null,
        pageId: null,
        pageName: null,
        creativeText: null,
        deliveryStartDate: null,
        destinationUrl: null,
      }),
    ).toBe(false);
  });

  it('adKey prioriza ID e só usa assinatura como fallback', () => {
    expect(adKey({ ...base })).toBe('id:968129471240839');
    expect(adKey({ ...base, adLibraryId: null })).toMatch(/^sig:/);
  });
});