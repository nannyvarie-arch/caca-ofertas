import { describe, expect, it } from 'vitest';
import type { NormalizedAd, ParsedAd } from '@caca-oferta/types';
import { MetaAdsLibraryAdapter } from '../../adapter/MetaAdsLibraryAdapter';
import { DomainIndex, searchByDomain } from '../../content/DomainIndex';

// ––– Helper: ler fixtures `01-basic-ad.html` … `10-incomplete-ad.html` via Vite.
// `import.meta.glob(..., { eager: true, query: '?raw', import: 'default' })` é
// resolvido pelo Vite/vitest em tempo de build — nunca executamos o HTML.
const rawFixtures = import.meta.glob('../../content/__fixtures__/html/*.html', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

function fixture(name: string): string {
  const file = Object.entries(rawFixtures).find(([key]) => key.endsWith(`/${name}`))?.[1];
  if (!file) throw new Error(`Fixture não encontrada: ${name}`);
  return file;
}

function render(html: string): Element {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const host = document.createElement('div');
  host.appendChild(template.content);
  document.body.append(host);
  if (host.querySelector('[data-testid="ad-card"]')) return host.firstElementChild as Element;
  throw new Error('Fixture sem card de anúncio.');
}

function renderAll(html: string): Element[] {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const host = document.createElement('div');
  host.appendChild(template.content);
  document.body.append(host);
  return Array.from(host.querySelectorAll('[data-testid="ad-card"]'));
}

const adapter = new MetaAdsLibraryAdapter();

describe('FASE 04 — parser em etapas (parseAdCard) e compatibilidade', () => {
  it('01: anúncio completo extrai todos os campos normalizados', () => {
    const ad = adapter.parseAdCard(render(fixture('01-basic-ad.html')));
    expect(ad).not.toBeNull();
    const a = ad as NormalizedAd;
    expect(a.adLibraryId).toBe('968129471240839');
    expect(a.pageName).toBe('NutSmart');
    expect(a.pageId).toBe('123456789');
    expect(a.status).toBe('active');
    expect(a.deliveryStartDate).toBe('2026-08-22');
    expect(a.deliveryStopDate).toBeNull();
    expect(a.platforms).toEqual(['facebook', 'instagram']);
    expect(a.mediaType).toBe('image');
    expect(a.destinationUrl).toBe('https://loja.nutsmart.com.br/promo?utm=fb');
    expect(a.destinationDomain).toBe('nutsmart.com.br');
    expect(a.adSnapshotUrl).toContain('/ads/library/?id=968129471240839');
    expect(a.creativeText).toContain('Proteína de verdade');
    expect(a.headline).toBe('Saiba mais');
    expect(a.cta).toBe('Saiba mais');
    expect(a.creativeUrl).toBe('https://example.com/img/proteina1.jpg');
    expect(a.thumbnailUrl).toBe('https://example.com/img/proteina1.jpg');
    expect(a.parseConfidence).toBe('high');
  });

  it('02: vídeo usa creativeUrl do arquivo e thumbnailUrl do poster', () => {
    const a = adapter.parseAdCard(render(fixture('02-video-ad.html'))) as NormalizedAd;
    expect(a.mediaType).toBe('video');
    expect(a.creativeUrl).toBe('https://v.example.com/video-treino.mp4');
    expect(a.thumbnailUrl).toBe('https://example.com/img/video-capa.jpg');
  });

  it('03: carrossel é identificado por múltiplas imagens + indicador', () => {
    const a = adapter.parseAdCard(render(fixture('03-carousel-ad.html'))) as NormalizedAd;
    expect(a.mediaType).toBe('carousel');
    expect(a.status).toBe('inactive');
    expect(a.deliveryStartDate).toBe('2026-02-10');
    expect(a.deliveryStopDate).toBe('2026-07-15');
    expect(a.pageName).toBe('PacotesViagem');
  });

  it('04: card sem ID não inventa adLibraryId', () => {
    const a = adapter.parseAdCard(render(fixture('04-missing-id.html'))) as NormalizedAd;
    expect(a.adLibraryId).toBeNull();
    expect(a.adSnapshotUrl).toBeNull();
    expect(a.deliveryStartDate).toBe('2026-07-01');
  });

  it('05: card sem destino externo deixa destinationUrl/domain null', () => {
    const a = adapter.parseAdCard(render(fixture('05-missing-domain.html'))) as NormalizedAd;
    expect(a.destinationUrl).toBeNull();
    expect(a.destinationDomain).toBeNull();
    expect(a.mediaType).toBe('image');
  });

  it('06: data em pt abreviada "22 de ago de 2026" normaliza para 2026-08-22', () => {
    const a = adapter.parseAdCard(render(fixture('06-active-ad.html'))) as NormalizedAd;
    expect(a.deliveryStartDate).toBe('2026-08-22');
    expect(a.status).toBe('active');
  });

  it('07: encerrado com stop → runningDays = stop − start', () => {
    const a = adapter.parseAdCard(render(fixture('07-inactive-ad.html'))) as NormalizedAd;
    expect(a.status).toBe('inactive');
    expect(a.runningDays).toBe(106);
  });

  it('08: vários anúncios não misturam dados entre si', () => {
    const cards = renderAll(fixture('08-multiple-ads.html'));
    expect(cards).toHaveLength(3);
    const results = cards.map((card) => adapter.parseAdCard(card) as NormalizedAd);
    expect(results[0]?.pageName).toBe('NutSmart');
    expect(results[0]?.adLibraryId).toBe('968129471240839');
    expect(results[1]?.pageName).toBe('FitLife');
    expect(results[1]?.destinationDomain).toBe('fitlife.com.br');
    expect(results[2]?.pageName).toBe('PetShopBom');
    expect(results[2]?.status).toBe('inactive');
  });

  it('09: conteúdo injetado é tratado isoladamente e ruído é ignorado', () => {
    const html = fixture('09-dynamic-content.html');
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    const host = document.createElement('div');
    host.appendChild(template.content);
    document.body.append(host);
    const container = host.firstElementChild as Element;
    const nodes = adapter.detectAds(container);
    expect(nodes).toHaveLength(1);
    const node = nodes[0];
    if (!node) throw new Error('Esperava um nó de anúncio.');
    const a = adapter.parseAdCard(node.element) as NormalizedAd;
    expect(a.adLibraryId).toBe('778899001122334');
    expect(a.pageName).toBe('LojaDinamica');
  });

  it('10: anúncio incompleto não quebra e status fica unknown', () => {
    const a = adapter.parseAdCard(render(fixture('10-incomplete-ad.html'))) as NormalizedAd;
    expect(a.adLibraryId).toBeNull();
    expect(a.deliveryStartDate).toBeNull();
    expect(a.deliveryStopDate).toBeNull();
    expect(a.platforms).toEqual([]);
    expect(a.destinationUrl).toBeNull();
    expect(a.destinationDomain).toBeNull();
    expect(a.creativeText).toBeNull();
    expect(a.runningDays).toBeNull();
    expect(a.status).toBe('unknown');
    expect(a.parseConfidence).toBe('low');
  });

  it('getters granulares concordam com parseAdCard (sem duplicar extração)', () => {
    const node = { element: render(fixture('01-basic-ad.html')) };
    expect(adapter.getAdId(node)).toBe('968129471240839');
    expect(adapter.getPage(node)).toBe('NutSmart');
    expect(adapter.getPageId(node)).toBe('123456789');
    expect(adapter.getStatus(node)).toBe('active');
    expect(adapter.getStartDate(node)).toBe('2026-08-22');
    expect(adapter.getStopDate(node)).toBeNull();
    expect(adapter.getPlatforms(node)).toEqual(['facebook', 'instagram']);
    expect(adapter.getMediaType(node)).toBe('image');
    expect(adapter.getCreativeText(node)).toContain('Proteína de verdade');
    expect(adapter.getCta(node)).toBe('Saiba mais');
    expect(adapter.getDestinationUrl(node)).toBe('https://loja.nutsmart.com.br/promo?utm=fb');
    expect(adapter.getDomain(node)).toBe('nutsmart.com.br');
    expect(adapter.getThumbnailUrl(node)).toBe('https://example.com/img/proteina1.jpg');
    expect(adapter.getCreativeUrl(node)).toBe('https://example.com/img/proteina1.jpg');
  });

  it('parseAd derivado usa domínio pt e preserva dados', () => {
    const node = { element: render(fixture('01-basic-ad.html')) };
    const ad = adapter.parseAd(node) as ParsedAd;
    expect(ad.status).toBe('ativo');
    expect(ad.mediaType).toBe('imagem');
    expect(ad.platforms).toEqual(['facebook', 'instagram']);
    expect(ad.destinationDomain).toBe('nutsmart.com.br');
    expect(ad.creativeText).toContain('Proteína de verdade');
  });
});

describe('FASE 04 — integração com o DomainIndex', () => {
  function indexFromFixture(name: string): { ads: ParsedAd[]; index: DomainIndex } {
    const cards = renderAll(fixture(name));
    const index = new DomainIndex();
    const ads: ParsedAd[] = [];
    for (const card of cards) {
      const parsed = adapter.parseAd({ element: card });
      if (!parsed) continue;
      ads.push(parsed);
      if (parsed.destinationDomain) index.add(parsed);
    }
    return { ads, index };
  }

  it('indexa apenas anúncios com domínio de destino detectado', () => {
    const { ads, index } = indexFromFixture('01-basic-ad.html');
    expect(ads).toHaveLength(1);
    expect(ads[0]?.destinationDomain).toBe('nutsmart.com.br');
    expect(index.size).toBe(1);
    expect(index.hasDomain('nutsmart.com.br')).toBe(true);
    expect(searchByDomain('https://www.nutsmart.com.br/qualquer', index)).toHaveLength(1);
  });

  it('anúncio sem domínio não é indexado (sem quebrar o pipeline)', () => {
    const { index } = indexFromFixture('10-incomplete-ad.html');
    expect(index.size).toBe(0);
    expect(index.domains).toEqual([]);
  });

  it('múltiplos anúncios indexam cada domínio isoladamente', () => {
    const { ads, index } = indexFromFixture('08-multiple-ads.html');
    expect(ads).toHaveLength(3);
    expect(searchByDomain('nutsmart.com.br', index)).toHaveLength(1);
    expect(searchByDomain('fitlife.com.br', index)).toHaveLength(1);
    expect(searchByDomain('tutamais.com.br', index)).toHaveLength(1);
  });
});