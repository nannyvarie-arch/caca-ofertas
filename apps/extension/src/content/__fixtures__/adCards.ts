// CAÇAOFERTA — Fixtures HTML que simulam a estrutura visível da Meta Ads Library.
//
// AVISO: a Meta ofusca classes; estas fixtures NÃO são um contrato do DOM —
// servem para exercitar o detector baseado em marcadores textuais, URLs e
// relações estruturais (textos/links visíveis publicamente, nada de bypass).

export const PAGE_HREF = 'https://www.facebook.com/NutSmart-123456789/';
export const SNAPSHOT_HREF =
  'https://www.facebook.com/ads/library/?id=968129471240839&view_all_page_id=315236625874136';

export interface CardFixtureOptions {
  pageName?: string;
  pageHref?: string;
  pageId?: string;
  adLibraryId?: string | null;
  snapshotHref?: string | null;
  status?: string | null;
  startText?: string | null;
  stopText?: string | null;
  platforms?: string[];
  media?: string;
  carouselIndicator?: string | null;
  destinationHref?: string | null;
  ctaText?: string | null;
  creativeText?: string | null;
  extra?: string;
}

const DEFAULT_MEDIA =
  '<img src="https://example.com/img/nutsmart1.jpg" width="600" height="400" alt="Anúncio NutSmart" />';

export function makeCard(options: CardFixtureOptions = {}): string {
  const {
    pageName = 'NutSmart',
    pageHref = PAGE_HREF,
    pageId = '123456789',
    adLibraryId = '968129471240839',
    snapshotHref = SNAPSHOT_HREF,
    status = 'Active',
    startText = 'Started running on August 22, 2026',
    stopText = null,
    platforms = ['facebook', 'instagram'],
    media = DEFAULT_MEDIA,
    carouselIndicator = null,
    destinationHref = 'https://l.facebook.com/l.php?u=https%3A%2F%2Floja.nutsmart.com.br%2Fpromo%3Futm%3Dfb',
    ctaText = 'Saiba mais',
    creativeText = 'Nutrição de verdade, sem enrolação. Conheça a oferta da semana com 50% de desconto para novos clientes.',
    extra = '',
  } = options;

  const platformsHtml = platforms
    .map((p) => `<span role="img" aria-label="${p}"></span>`)
    .join('\n  ');
  const idLine =
    adLibraryId !== null
      ? `<div class="x9f619 x1n2onr6"><span>Library ID: ${adLibraryId}</span></div>`
      : '';
  const snapshotLink = snapshotHref
    ? `<a href="${snapshotHref}" aria-label="Ver anúncio">Ver anúncio</a>`
    : '';
  const startLine = startText ? `<div class="x1n2onr6">${startText}</div>` : '';
  const stopLine = stopText ? `<div class="x1n2onr6">${stopText}</div>` : '';
  const statusLine = status ? `<div class="x1n2onr6"><span>${status}</span></div>` : '';
  const destination = destinationHref
    ? `<a href="${destinationHref}" aria-label="${ctaText ?? 'Saiba mais'}">${ctaText ?? 'Saiba mais'}</a>`
    : '';
  const indicator = carouselIndicator ? `<div class="x1n2onr6">${carouselIndicator}</div>` : '';
  const creative = creativeText ? `<p>${creativeText}</p>` : '';

  return `<div class="x1yztbdb x1n2onr6" data-testid="ad-card">
  <div class="x1n2onr6">
    <span>Sponsored</span>
    <a href="${pageHref}" data-nt="${pageId}"><span>${pageName}</span></a>
    ${platformsHtml}
  </div>
  ${idLine}
  ${snapshotLink}
  ${statusLine}
  ${startLine}
  ${stopLine}
  <div class="x16tdsg8 x1n2onr6">${media}</div>
  ${indicator}
  ${destination}
  ${creative}
  ${extra}
</div>`;
}

export function validCardHtml(): string {
  return makeCard();
}

export function ptCardHtml(): string {
  return makeCard({
    status: 'Ativo',
    startText: 'Iniciada em 22 de agosto de 2026',
    ctaText: 'Saiba mais',
    creativeText:
      'Nutrição de verdade, sem enrolação. Conheça a oferta da semana com 50% de desconto para novos clientes.',
  });
}

export function incompleteCardHtml(): string {
  return makeCard({
    adLibraryId: null,
    snapshotHref: null,
    status: null,
    startText: null,
    stopText: null,
    creativeText: null,
    destinationHref: null,
    platforms: [],
    ctaText: null,
  });
}

export function noIdCardHtml(): string {
  return makeCard({ adLibraryId: null, snapshotHref: null, startText: 'Started running on September 1, 2026' });
}

export function inactiveCardHtml(): string {
  return makeCard({
    status: 'Inactive',
    startText: 'Started running on June 10, 2026',
    stopText: 'Stopped running on August 5, 2026',
  });
}

export function videoCardHtml(): string {
  return makeCard({
    media:
      '<video src="https://v.example.com/nutsmart.mp4" width="640" height="360"></video>',
  });
}

export function carouselCardHtml(): string {
  return makeCard({
    media: `
      <img src="https://example.com/img/nutsmart1.jpg" width="600" height="400" alt="1" />
      <img src="https://example.com/img/nutsmart2.jpg" width="600" height="400" alt="2" />
      <img src="https://example.com/img/nutsmart3.jpg" width="600" height="400" alt="3" />`,
    carouselIndicator: '1 / 3',
  });
}

export function externalDestinationCardHtml(): string {
  return makeCard({
    destinationHref: 'https://loja.nutsmart.com.br/promo?utm_source=fb',
    ctaText: 'Comprar agora',
  });
}

export function nonAdHtml(): string {
  return `<div class="x1n2onr6">
  <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
  <span>Biblioteca de anúncios</span>
</div>`;
}

export function pageShell(...cards: string[]): string {
  return `<div id="page">
  <div class="topnav"><span>Ad Library</span><span>Search</span></div>
  <div class="results" data-testid="browse_dom">
    ${cards.join('\n  ')}
  </div>
  <div class="footer">Powered by Facebook</div>
</div>`;
}

/** Converte string HTML em um elemento DOM real para os testes. */
export function parseHtml(html: string): Element {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const first = template.content.firstElementChild;
  if (!first) throw new Error('Fixture vazia.');
  return first;
}

export function parseCards(html: string): Element[] {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return Array.from(template.content.querySelectorAll('[data-testid="ad-card"]'));
}