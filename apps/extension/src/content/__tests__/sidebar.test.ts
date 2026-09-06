import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ParsedAd } from '@caca-oferta/types';
import type { SavedAdListDto } from '@caca-oferta/shared';
import type { RuntimeResponse } from '../../bridge/messages';
import { DomainIndex } from '../DomainIndex';
import type { CaçaOfertaSidebarOptions, SavedOffersService } from '../sidebar';
import { SEARCH_MESSAGES } from '../searchPanel';
import { CaçaOfertaSidebar } from '../sidebar';

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
    creativeUrl: null,
    ...overrides,
  };
}

const ADS_EXEMPLO = [
  makeAd({
    adLibraryId: 'A',
    pageName: 'Alfa',
    status: 'ativo',
    deliveryStartDate: '2026-09-01',
    platforms: ['facebook'],
    mediaType: 'imagem',
    destinationDomain: 'exemplo.com',
    destinationUrl: 'https://loja.exemplo.com/produto?utm=fb',
    adSnapshotUrl: 'https://www.facebook.com/ads/library/?id=111',
  }),
  makeAd({
    adLibraryId: 'B',
    pageName: 'Beta',
    status: 'ativo',
    deliveryStartDate: '2026-08-22',
    platforms: ['instagram'],
    mediaType: 'video',
    destinationDomain: 'exemplo.com',
  }),
];

function shadowOf(sidebar: CaçaOfertaSidebar): ShadowRoot {
  return (sidebar as unknown as { shadow: ShadowRoot }).shadow;
}

function panelShadowOf(sidebar: CaçaOfertaSidebar): ShadowRoot {
  const host = (sidebar as unknown as { panel: { host: HTMLElement } }).panel.host;
  return (host as HTMLElement & { shadowRoot: ShadowRoot }).shadowRoot;
}

function setup(overrides: Partial<CaçaOfertaSidebarOptions> = {}) {
  const index = new DomainIndex();
  for (const ad of ADS_EXEMPLO) index.add(ad);
  let current: ParsedAd[] = [...ADS_EXEMPLO];
  const sidebar = new CaçaOfertaSidebar({
    getIndex: () => index,
    getAds: () => current,
    ...overrides,
  });
  sidebar.mount(document.body);
  sidebar.syncStats();
  return {
    index,
    sidebar,
    setAds(ads: ParsedAd[]): void {
      current = ads;
      sidebar.syncStats();
    },
  };
}

function fakeSavedOffersService(
  list: () => Promise<RuntimeResponse<SavedAdListDto>>,
): SavedOffersService {
  return {
    list: vi.fn(list),
    remove: vi
      .fn()
      .mockResolvedValue({ ok: true, data: { id: 'sa-x', deleted: true } }) as SavedOffersService['remove'],
  };
}

function offersButton(sidebar: CaçaOfertaSidebar): HTMLButtonElement {
  const links = Array.from(shadowOf(sidebar).querySelectorAll('.co-link'));
  return links.find((b) => b.textContent?.includes('Minhas ofertas')) as HTMLButtonElement;
}

function statValue(sidebar: CaçaOfertaSidebar, cls: string): string {
  return shadowOf(sidebar).querySelector(`.co-stat-value.${cls}`)?.textContent ?? '';
}

describe('CaçaOfertaSidebar (FASE 05)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    try {
      localStorage.removeItem('co.sidebarWidth');
      localStorage.removeItem('co.sidebarCollapsed');
    } catch {
      // sem localStorage no ambiente.
    }
    vi.restoreAllMocks();
  });

  it('monta com a identidade CAÇAOFERTA e "Extensão ativa"', () => {
    const { sidebar } = setup();
    const text = shadowOf(sidebar).textContent ?? '';
    expect(text).toContain('CAÇAOFERTA');
    expect(text).toContain('Extensão ativa');
    expect(text).toContain('ANÚNCIOS DETECTADOS');
    sidebar.destroy();
  });

  it('mostra contadores reais dos anúncios detectados', () => {
    const { sidebar } = setup();
    expect(statValue(sidebar, 'co-stat-total')).toBe('2');
    expect(statValue(sidebar, 'co-stat-active')).toBe('2');
    expect(statValue(sidebar, 'co-stat-inactive')).toBe('0');
    expect(statValue(sidebar, 'co-stat-unknown')).toBe('0');
    sidebar.destroy();
  });

  it('estado vazio: "Nenhum anúncio detectado ainda."', () => {
    const { sidebar, setAds } = setup();
    setAds([]);
    expect(statValue(sidebar, 'co-stat-total')).toBe('0');
    const empty = shadowOf(sidebar).querySelector('.co-stat-empty') as HTMLElement;
    expect(empty.hidden).toBe(false);
    expect(empty.textContent).toBe('Nenhum anúncio detectado ainda.');
    sidebar.destroy();
  });

  it('busca por domínio usa o pipeline da FASE 03 (mesmo DomainIndex)', () => {
    const { sidebar } = setup();
    sidebar.panel.search('exemplo.com');
    const root = panelShadowOf(sidebar);
    expect(root.querySelectorAll('.co-result').length).toBe(2);
    expect(root.querySelector('.co-summary')?.textContent).toContain('2 anúncios encontrados');
    sidebar.destroy();
  });

  it('open(domain) expande e executa a busca', () => {
    const { sidebar } = setup();
    sidebar.open('exemplo.com');
    expect(sidebar.isVisible).toBe(true);
    expect(panelShadowOf(sidebar).querySelectorAll('.co-result').length).toBe(2);
    sidebar.destroy();
  });

  it('recolher/expandir alterna a visibilidade sem quebrar o estado', () => {
    const { sidebar } = setup();
    const shell = shadowOf(sidebar).querySelector('.co-shell') as HTMLElement;
    const tab = shadowOf(sidebar).querySelector('.co-tab') as HTMLElement;

    sidebar.collapse();
    expect(sidebar.isVisible).toBe(false);
    expect(shell.style.display).toBe('none');
    expect(tab.style.display).toBe('flex');

    sidebar.expand();
    expect(sidebar.isVisible).toBe(true);
    expect(shell.style.display).toBe('flex');
    expect(tab.style.display).toBe('none');
    sidebar.destroy();
  });

  it('reset() limpa a busca (estado ocioso)', () => {
    const { sidebar } = setup();
    sidebar.open('exemplo.com');
    expect(panelShadowOf(sidebar).querySelectorAll('.co-result').length).toBe(2);
    sidebar.reset();
    expect(shadowOf(sidebar).textContent).toBeDefined();
    expect(panelShadowOf(sidebar).querySelector('.co-msg')?.textContent).toBe(SEARCH_MESSAGES.idle);
    sidebar.destroy();
  });

  it('não re-renderiza os contadores quando nada mudou (memo)', () => {
    const { sidebar } = setup();
    const before = shadowOf(sidebar).querySelector('.co-stat-total');
    sidebar.syncStats();
    const after = shadowOf(sidebar).querySelector('.co-stat-total');
    expect(after).toBe(before);
    sidebar.destroy();
  });

  it('Configurações mostra mensagem honesta (fases futuras)', () => {
    const { sidebar } = setup();
    const links = Array.from(shadowOf(sidebar).querySelectorAll('.co-link'));
    const settings = links.find((b) => b.textContent?.includes('Configurações')) as HTMLButtonElement;
    settings.click();
    const toast = shadowOf(sidebar).querySelector('.co-toast');
    expect(toast?.textContent).toContain('Configurações disponíveis em fases futuras.');
    sidebar.destroy();
  });

  it('Minhas ofertas carrega a lista real pelo service worker (FASE 06)', async () => {
    const list: SavedAdListDto = {
      items: [
        {
          id: 'sa-1',
          adLibraryId: '968129471240839',
          pageId: '315236625874136',
          pageName: 'NutSmart',
          status: 'active',
          deliveryStartDate: '2026-08-22',
          deliveryStopDate: null,
          runningDays: 12,
          platforms: ['facebook'],
          mediaType: 'image',
          creativeText: 'Oferta',
          headline: null,
          description: null,
          cta: null,
          destinationUrl: null,
          destinationDomain: 'nutsmart.com.br',
          adSnapshotUrl: 'https://www.facebook.com/ads/library/?id=968129471240839',
          creativeUrl: null,
          thumbnailUrl: null,
          savedAt: '2026-09-05T12:00:00.000Z',
          updatedAt: '2026-09-05T12:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
    };
    const service = fakeSavedOffersService(() => Promise.resolve({ ok: true, data: list }));

    const { sidebar } = setup({ savedOffersService: service });
    offersButton(sidebar).click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(service.list).toHaveBeenCalledTimes(1);
    const box = shadowOf(sidebar).querySelector('.co-offers') as HTMLElement;
    expect(box.hidden).toBe(false);
    expect(box.textContent).toContain('NutSmart');
    expect(box.querySelector('.co-offer-title')?.textContent).toBe('NutSmart');
    sidebar.destroy();
  });

  it('Minhas ofertas mostra estado vazio honesto quando não há ofertas salvas', async () => {
    const service = fakeSavedOffersService(() =>
      Promise.resolve({ ok: true, data: { items: [], page: 1, pageSize: 50, total: 0 } }),
    );

    const { sidebar } = setup({ savedOffersService: service });
    offersButton(sidebar).click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const box = shadowOf(sidebar).querySelector('.co-offers') as HTMLElement;
    expect(box.textContent).toContain('Nenhuma oferta salva ainda.');
    sidebar.destroy();
  });

  it('Minhas ofertas mostra erro honesto quando o service worker não responde (fallback real)', async () => {
    // Sem service injetado: usa o service worker DEFAULT da extensão; sem
    // chrome.runtime (jsdom) o bridge responde CONTEXT_UNAVAILABLE — e a UI
    // mostra o erro SEM fingir sucesso.
    const { sidebar } = setup();
    offersButton(sidebar).click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const box = shadowOf(sidebar).querySelector('.co-offers') as HTMLElement;
    expect(box.textContent).toContain('Este ambiente não oferece comunicação');
    expect(box.querySelector('.co-offer-btn-retry')).not.toBeNull();
    sidebar.destroy();
  });

  it('excluir oferta da lista usa o service worker e recarrega a lista', async () => {
    const full: SavedAdListDto = {
      items: [
        {
          id: 'sa-1',
          adLibraryId: '111',
          pageId: null,
          pageName: 'Alfa',
          status: 'active',
          deliveryStartDate: null,
          deliveryStopDate: null,
          runningDays: null,
          platforms: ['facebook'],
          mediaType: 'image',
          creativeText: null,
          headline: null,
          description: null,
          cta: null,
          destinationUrl: null,
          destinationDomain: null,
          adSnapshotUrl: null,
          creativeUrl: null,
          thumbnailUrl: null,
          savedAt: '2026-09-05T12:00:00.000Z',
          updatedAt: '2026-09-05T12:00:00.000Z',
        },
      ],
      page: 1,
      pageSize: 50,
      total: 1,
    };
    const empty: SavedAdListDto = { items: [], page: 1, pageSize: 50, total: 0 };
    const service: SavedOffersService = {
      list: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, data: full })
        .mockResolvedValueOnce({ ok: true, data: empty }) as SavedOffersService['list'],
      remove: vi
        .fn()
        .mockResolvedValue({ ok: true, data: { id: 'sa-1', deleted: true } }) as SavedOffersService['remove'],
    };

    const { sidebar } = setup({ savedOffersService: service });
    offersButton(sidebar).click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const removeBtn = shadowOf(sidebar).querySelector('.co-offer-btn-remove') as HTMLButtonElement;
    expect(removeBtn).not.toBeNull();
    removeBtn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(service.remove).toHaveBeenCalledWith('sa-1');
    const box = shadowOf(sidebar).querySelector('.co-offers') as HTMLElement;
    expect(box.textContent).toContain('Nenhuma oferta salva ainda.');
    sidebar.destroy();
  });

  it('fechar e reabrir a aba de ofertas alterna o painel', async () => {
    const service = fakeSavedOffersService(() =>
      Promise.resolve({ ok: true, data: { items: [], page: 1, pageSize: 50, total: 0 } }),
    );

    const { sidebar } = setup({ savedOffersService: service });
    offersButton(sidebar).click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const box = shadowOf(sidebar).querySelector('.co-offers') as HTMLElement;
    expect(box.hidden).toBe(false);

    offersButton(sidebar).click();
    expect(box.hidden).toBe(true);
    sidebar.destroy();
  });

  it('copiar ID em resultado usa clipboard e mostra toast específico', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const { sidebar } = setup();
    sidebar.open('exemplo.com');
    const root = panelShadowOf(sidebar);
    const firstCard = root.querySelector('.co-result');
    const btn = Array.from(firstCard?.querySelectorAll('.co-btn') ?? []).find((b) =>
      b.textContent?.includes('Copiar ID'),
    ) as HTMLButtonElement | undefined;
    expect(btn).toBeDefined();
    btn?.click();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(writeText).toHaveBeenCalledWith('A');
    expect(root.querySelector('.co-toast')?.textContent).toBe('ID copiado.');
    sidebar.destroy();
  });

  it('anúncio incompleto não ganha campos inventados', () => {
    const index = new DomainIndex();
    index.add(makeAd({ destinationDomain: 'outro.com' }));
    const sidebar = new CaçaOfertaSidebar({
      getIndex: () => index,
      getAds: () => [makeAd({ destinationDomain: 'outro.com' })],
    });
    sidebar.mount(document.body);
    sidebar.open('outro.com');
    const root = panelShadowOf(sidebar);
    const actions = Array.from(root.querySelectorAll('.co-result .co-btn')).map(
      (b) => b.textContent ?? '',
    );
    expect(actions).toEqual(['📋 Copiar domínio']);
    expect(root.textContent).not.toContain('Abrir anúncio');
    expect(root.textContent).not.toContain('Copiar URL');
    sidebar.destroy();
  });
});