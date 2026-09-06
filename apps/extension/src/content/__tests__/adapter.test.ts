import { describe, expect, it } from 'vitest';
import { MetaAdsLibraryAdapter } from '../../adapter/MetaAdsLibraryAdapter';
import { findAdCards } from '../detection';
import {
  carouselCardHtml,
  externalDestinationCardHtml,
  incompleteCardHtml,
  inactiveCardHtml,
  makeCard,
  noIdCardHtml,
  pageShell,
  parseHtml,
  ptCardHtml,
  validCardHtml,
  videoCardHtml,
} from '../__fixtures__/adCards';

function firstNode(html: string) {
  const host = document.createElement('div');
  host.innerHTML = html.trim();
  document.body.append(host);
  const card = host.querySelector('[data-testid="ad-card"]') as Element | null;
  if (!card) throw new Error('Fixture não produziu card.');
  return { element: card };
}

describe('MetaAdsLibraryAdapter', () => {
  it('detecta cards em página simulada', () => {
    const page = parseHtml(pageShell(validCardHtml(), makeCard({ pageName: 'Loja Fitness' })));
    const adapter = new MetaAdsLibraryAdapter();
    expect(adapter.detectAds(page)).toHaveLength(2);
  });

  it('extrai ID oficial do anúncio quando disponível', () => {
    const adapter = new MetaAdsLibraryAdapter();
    expect(adapter.getAdId(firstNode(validCardHtml()))).toBe('968129471240839');
  });

  it('retorna null quando o anúncio não tem ID exposto (não inventa)', () => {
    const adapter = new MetaAdsLibraryAdapter();
    expect(adapter.getAdId(firstNode(noIdCardHtml()))).toBeNull();
    expect(adapter.getAdId(firstNode(incompleteCardHtml()))).toBeNull();
  });

  it('extrai página anunciante (nome + ID)', () => {
    const adapter = new MetaAdsLibraryAdapter();
    const node = firstNode(validCardHtml());
    expect(adapter.getPage(node)).toBe('NutSmart');
    expect(adapter.getPageId(node)).toBe('123456789');
  });

  it('extrai data de início normalizada (YYYY-MM-DD)', () => {
    const adapter = new MetaAdsLibraryAdapter();
    expect(adapter.getStartDate(firstNode(validCardHtml()))).toBe('2026-08-22');
  });

  it('extrai data de início em pt-BR', () => {
    const adapter = new MetaAdsLibraryAdapter();
    expect(adapter.getStartDate(firstNode(ptCardHtml()))).toBe('2026-08-22');
  });

  it('extrai data de encerramento quando disponível', () => {
    const adapter = new MetaAdsLibraryAdapter();
    const node = firstNode(inactiveCardHtml());
    expect(adapter.getStopDate(node)).toBe('2026-08-05');
    expect(adapter.getStatus(node)).toBe('inactive');
  });

  it('status active / unknown conforme o card', () => {
    const adapter = new MetaAdsLibraryAdapter();
    expect(adapter.getStatus(firstNode(validCardHtml()))).toBe('active');
    expect(adapter.getStatus(firstNode(incompleteCardHtml()))).toBe('unknown');
  });

  it('extrai plataformas de veiculação', () => {
    const adapter = new MetaAdsLibraryAdapter();
    expect(adapter.getPlatforms(firstNode(validCardHtml()))).toEqual(['facebook', 'instagram']);
  });

  it('retorna null quando nenhuma plataforma é detectada', () => {
    const adapter = new MetaAdsLibraryAdapter();
    expect(adapter.getPlatforms(firstNode(incompleteCardHtml()))).toBeNull();
  });

  it('identifica tipo de mídia: image, video, carousel', () => {
    const adapter = new MetaAdsLibraryAdapter();
    expect(adapter.getMediaType(firstNode(validCardHtml()))).toBe('image');
    expect(adapter.getMediaType(firstNode(videoCardHtml()))).toBe('video');
    expect(adapter.getMediaType(firstNode(carouselCardHtml()))).toBe('carousel');
  });

  it('decodifica URL de destino do redirect l.php e deriva o domínio', () => {
    const adapter = new MetaAdsLibraryAdapter();
    const node = firstNode(validCardHtml());
    expect(adapter.getDestinationUrl(node)).toBe('https://loja.nutsmart.com.br/promo?utm=fb');
    expect(adapter.getDomain(node)).toBe('nutsmart.com.br');
  });

  it('passa adiante URL externa direta (sem inventar)', () => {
    const adapter = new MetaAdsLibraryAdapter();
    const node = firstNode(externalDestinationCardHtml());
    expect(adapter.getDestinationUrl(node)).toBe('https://loja.nutsmart.com.br/promo?utm_source=fb');
  });

  it('parseAd mapeia status/mediaType para o domínio pt', () => {
    const adapter = new MetaAdsLibraryAdapter();
    const ad = adapter.parseAd(firstNode(validCardHtml()));
    expect(ad).not.toBeNull();
    expect(ad?.status).toBe('ativo');
    expect(ad?.mediaType).toBe('imagem');
    expect(ad?.pageName).toBe('NutSmart');
    expect(ad?.cta).toBe('Saiba mais');
  });

  it('parseAd não inventa campos ausentes', () => {
    const adapter = new MetaAdsLibraryAdapter();
    const ad = adapter.parseAd(firstNode(noIdCardHtml()));
    expect(ad).not.toBeNull();
    expect(ad?.adLibraryId).toBeNull();
    expect(ad?.pageId).toBe('123456789');
    expect(ad?.deliveryStartDate).toBe('2026-09-01');
  });

  it('parseAd de card incompleto não quebra e mantém o que existe', () => {
    const adapter = new MetaAdsLibraryAdapter();
    const ad = adapter.parseAd(firstNode(incompleteCardHtml()));
    expect(ad).not.toBeNull();
    expect(ad?.adLibraryId).toBeNull();
    expect(ad?.deliveryStartDate).toBeNull();
    expect(ad?.status).toBe('desconhecido');
    expect(ad?.pageName).toBe('NutSmart');
  });

  it('parseAd carrossel mapeado para "carrossel"', () => {
    const adapter = new MetaAdsLibraryAdapter();
    const ad = adapter.parseAd(firstNode(carouselCardHtml()));
    expect(ad?.mediaType).toBe('carrossel');
  });

  it('getCreative retorna detalhes suplementares sem inventar', () => {
    const adapter = new MetaAdsLibraryAdapter();
    const creative = adapter.getCreative(firstNode(validCardHtml())) as Record<string, unknown>;
    expect(creative).not.toBeNull();
    expect(creative.mediaType).toBe('image');
    expect(creative.thumbnailUrl).toBe('https://example.com/img/nutsmart1.jpg');
    expect(creative.adSnapshotUrl).toBe(
      'https://www.facebook.com/ads/library/?id=968129471240839&view_all_page_id=315236625874136',
    );
  });

  it('parseAd falha de forma segura para nó desconectado', () => {
    const adapter = new MetaAdsLibraryAdapter();
    const host = document.createElement('div');
    host.innerHTML = pageShell(validCardHtml());
    document.body.append(host);
    const card = findAdCards(host)[0];
    expect(card).toBeDefined();
    expect(adapter.parseAd({ element: card as Element })).not.toBeNull();
    card?.remove();
    expect(adapter.parseAd({ element: card as Element })).toBeNull();
  });
});