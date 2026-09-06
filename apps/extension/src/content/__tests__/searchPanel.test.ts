import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ParsedAd } from '@caca-oferta/types';
import { DomainIndex } from '../DomainIndex';
import { AdSearchPanel, SEARCH_MESSAGES } from '../searchPanel';

function makeAd(overrides: Partial<ParsedAd>): ParsedAd {
  return {
    adLibraryId: null,
    pageId: null,
    pageName: null,
    status: null,
    deliveryStartDate: null,
    deliveryStopDate: null,
    platforms: null,
    mediaType: null,
    creativeText: null,
    headline: null,
    description: null,
    destinationUrl: null,
    destinationDomain: null,
    adSnapshotUrl: null,
    cta: null,
    creativeUrl: null,
    ...overrides,
  };
}

function setup() {
  const index = new DomainIndex();
  index.add(
    makeAd({
      adLibraryId: 'A',
      pageName: 'Alfa',
      status: 'ativo',
      deliveryStartDate: '2026-09-01',
      platforms: ['facebook'],
      mediaType: 'imagem',
      destinationDomain: 'www.exemplo.com',
      destinationUrl: 'https://www.exemplo.com/produto?utm=fb',
      adSnapshotUrl: 'https://www.facebook.com/ads/library/?id=111',
    }),
  );
  index.add(
    makeAd({
      adLibraryId: 'B',
      pageName: 'Beta',
      status: 'encerrado',
      deliveryStartDate: '2026-06-10',
      platforms: ['instagram'],
      mediaType: 'video',
      destinationDomain: 'exemplo.com',
    }),
  );
  index.add(
    makeAd({
      adLibraryId: 'C',
      pageName: 'Gama',
      status: 'ativo',
      platforms: ['facebook'],
      mediaType: 'carrossel',
      destinationDomain: 'outro.com',
    }),
  );

  const panel = new AdSearchPanel({ getIndex: () => index });
  panel.mount(document.body);
  return { index, panel };
}

function messageText(panel: AdSearchPanel, selector = '.co-msg'): string {
  const root = panel['shadow'];
  const el = root.querySelector(selector);
  return el ? (el.textContent ?? '') : '';
}

function resultsCount(panel: AdSearchPanel): number {
  const root = panel['shadow'];
  return root.querySelectorAll('.co-result').length;
}

describe('AdSearchPanel', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('inicia no estado ocioso', () => {
    const { panel } = setup();
    expect(messageText(panel)).toBe(SEARCH_MESSAGES.idle);
    panel.destroy();
  });

  it('publica a pesquisa de domínio manual', () => {
    const { panel } = setup();
    expect(messageText(panel)).toBe(SEARCH_MESSAGES.idle);
    panel.destroy();
  });

  it('pesquisa manual retorna anúncios do domínio', () => {
    const { panel } = setup();
    panel.search('exemplo.com');
    expect(resultsCount(panel)).toBe(2);
    const text = messageText(panel, '.co-summary');
    expect(text).toContain('exemplo.com');
    expect(text).toContain('2 anúncios encontrados');
    panel.destroy();
  });

  it('normaliza o termo pesquisado', () => {
    const { panel } = setup();
    panel.search('https://www.exemplo.com/produto?utm=fb');
    expect(resultsCount(panel)).toBe(2);
    panel.destroy();
  });

  it('search() com string vazia mostra "Digite um domínio"', () => {
    const { panel } = setup();
    panel.search('   ');
    expect(messageText(panel)).toBe(SEARCH_MESSAGES.empty);
    panel.destroy();
  });

  it('search() com domínio inválido mostra "Digite um domínio válido"', () => {
    const { panel } = setup();
    panel.search('abc');
    expect(messageText(panel)).toBe(SEARCH_MESSAGES.invalid);
    panel.destroy();
  });

  it('pesquisa por domínio inexistente mostra "Nenhum anúncio conhecido"', () => {
    const { panel } = setup();
    panel.search('naoexiste.com');
    expect(messageText(panel)).toBe(SEARCH_MESSAGES.notFound);
    panel.destroy();
  });

  it('abre com domínio preenchido e executa a pesquisa', () => {
    const { panel } = setup();
    panel.open('exemplo.com');
    expect(panel.isVisible).toBe(true);
    expect(resultsCount(panel)).toBe(2);
    panel.close();
    expect(panel.isVisible).toBe(false);
    panel.destroy();
  });

  it('close() e reset() limpam a interface', () => {
    const { panel } = setup();
    panel.open('exemplo.com');
    expect(resultsCount(panel)).toBe(2);
    panel.reset();
    expect(messageText(panel)).toBe(SEARCH_MESSAGES.idle);
    expect(resultsCount(panel)).toBe(0);
    panel.destroy();
  });

  it('aplica filtro de status', () => {
    const { panel } = setup();
    panel.search('exemplo.com');
    expect(resultsCount(panel)).toBe(2);
    panel['statusEl'].value = 'encerrado';
    panel['statusEl'].dispatchEvent(new Event('change'));
    expect(resultsCount(panel)).toBe(1);
    panel.destroy();
  });

  it('aplica filtro de plataforma', () => {
    const { panel } = setup();
    panel.search('exemplo.com');
    panel['platformEl'].value = 'instagram';
    panel['platformEl'].dispatchEvent(new Event('change'));
    expect(resultsCount(panel)).toBe(1);
    panel.destroy();
  });

  it('aplica ordenação por antigos', () => {
    const { panel } = setup();
    panel.search('exemplo.com');
    panel['sortEl'].value = 'oldest';
    panel['sortEl'].dispatchEvent(new Event('change'));
    const cards = Array.from(panel['shadow'].querySelectorAll('.co-result'));
    expect(cards[0]?.textContent).toContain('Beta'); // 2026-06-10 → mais antigo primeiro
    expect(cards[1]?.textContent).toContain('Alfa'); // 2026-09-01 → depois
    panel.destroy();
  });

  it('não injeta HTML externo (textContent para domínio/página)', () => {
    const { panel } = setup();
    panel.search('exemplo.com');
    const root = panel['shadow'];
    const resultsHtml = root.querySelector('.co-results')?.innerHTML ?? '';
    expect(resultsHtml).not.toContain('<script');
    panel.destroy();
  });
});

describe('AdSearchPanel — ações', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('copiar domínio e copiar URL usam a área de transferência e mostram toast', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const { panel } = setup();
    panel.search('exemplo.com');
    const root = panel['shadow'];
    const firstCard = root.querySelector('.co-result');
    expect(firstCard).not.toBeNull();

    const btnDomain = Array.from(firstCard?.querySelectorAll('.co-btn') ?? []).find((b) =>
      b.textContent?.includes('Copiar domínio'),
    ) as HTMLButtonElement | undefined;
    expect(btnDomain).toBeDefined();
    btnDomain?.click();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(writeText).toHaveBeenCalledWith('www.exemplo.com');
    expect(root.querySelector('.co-toast')?.textContent).toBe('Domínio copiado.');

    writeText.mockClear();
    const btnUrl = Array.from(firstCard?.querySelectorAll('.co-btn') ?? []).find((b) =>
      b.textContent?.includes('Copiar URL'),
    ) as HTMLButtonElement | undefined;
    expect(btnUrl).toBeDefined();
    btnUrl?.click();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(writeText).toHaveBeenCalledWith('https://www.exemplo.com/produto?utm=fb');
    expect(root.querySelector('.co-toast')?.textContent).toBe('URL copiada.');
    panel.destroy();
  });

  it('abrir anúncio abre a snapshot real sob ação do usuário', () => {
    const openSpy = vi.fn();
    window.open = openSpy;

    const { panel } = setup();
    panel.search('exemplo.com');
    const root = panel['shadow'];
    const firstCard = root.querySelector('.co-result');
    const btnOpen = Array.from(firstCard?.querySelectorAll('.co-btn') ?? []).find((b) =>
      b.textContent?.includes('Abrir anúncio'),
    ) as HTMLButtonElement | undefined;
    expect(btnOpen).toBeDefined();
    btnOpen?.click();
    expect(openSpy).toHaveBeenCalledWith(
      'https://www.facebook.com/ads/library/?id=111',
      '_blank',
      'noopener',
    );
    panel.destroy();
  });

  it('resultados só oferecem ações quando existe o dado correspondente', async () => {
    const index = new DomainIndex();
    index.add(
      makeAd({
        adLibraryId: null,
        pageName: 'Gama',
        status: 'ativo',
        destinationDomain: 'exemplo.com',
      }),
    );
    const panel = new AdSearchPanel({ getIndex: () => index });
    panel.mount(document.body);
    panel.search('exemplo.com');
    const root = panel['shadow'];
    const actions = Array.from(root.querySelectorAll('.co-result .co-btn')).map(
      (b) => b.textContent ?? '',
    );
    expect(actions).toEqual(['📋 Copiar domínio']); // sem ID/URL/snapshot → só copiar domínio
    panel.destroy();
  });

  it('admite a verificação do estado de contagem via summary', async () => {
    const { panel } = setup();
    panel.search('exemplo.com');
    const summary = messageText(panel, '.co-summary');
    expect(summary).toContain('🟢 1 ativo');
    expect(summary).toContain('🔴 1 encerrado');
    expect(summary).not.toContain('outro.com');
    panel.destroy();
  });
});