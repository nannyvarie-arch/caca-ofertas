import { describe, expect, it } from 'vitest';
import { findAdCards, isAdCard } from '../detection';
import { makeCard, nonAdHtml, pageShell, parseHtml, validCardHtml } from '../__fixtures__/adCards';

describe('isAdCard', () => {
  it('reconhece um card válido', () => {
    const card = parseHtml(validCardHtml());
    expect(isAdCard(card)).toBe(true);
  });

  it('rejeita um elemento sem marcadores', () => {
    const nonAd = parseHtml(nonAdHtml());
    expect(isAdCard(nonAd)).toBe(false);
  });
});

describe('findAdCards', () => {
  it('encontra cards em uma página simulada', () => {
    const page = parseHtml(pageShell(validCardHtml(), makeCard({ pageName: 'Loja Fitness' }), nonAdHtml()));
    const cards = findAdCards(page);
    expect(cards).toHaveLength(2);
  });

  it('colapsa candidatos aninhados: retorna o container do card, não a âncora', () => {
    const page = parseHtml(pageShell(validCardHtml()));
    const cards = findAdCards(page);
    expect(cards).toHaveLength(1);
    const card = cards[0];
    expect(card).toBeDefined();
    if (card) {
      // O card detectado é o container externo do card, não a âncora da página.
      expect(card.matches('[data-testid="ad-card"]')).toBe(true);
    }
  });

  it('não encontra nada em página sem anúncios', () => {
    const page = parseHtml(pageShell(nonAdHtml()));
    expect(findAdCards(page)).toHaveLength(0);
  });
});