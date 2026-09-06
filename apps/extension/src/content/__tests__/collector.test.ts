import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startAdMining } from '../AdCollectionObserver';
import { makeCard, pageShell, parseHtml } from '../__fixtures__/adCards';

const WAIT = 220;

async function flush(ms = WAIT): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function appendToResults(html: string): void {
  const results = document.querySelector('.results');
  const node = parseHtml(html);
  results?.append(node);
}

/** Shadow root do painel de pesquisa embutido na sidebar (FASE 05). */
function sidebarPanelRoot(): ShadowRoot | null {
  const host = document.querySelector('[data-caca-oferta-sidebar]') as HTMLElement | null;
  const panelHost = host?.shadowRoot?.querySelector(
    '[data-caca-oferta-search-panel]',
  ) as HTMLElement | null;
  return panelHost?.shadowRoot ?? null;
}

function sidebarHost(): HTMLElement | null {
  return document.querySelector('[data-caca-oferta-sidebar]') as HTMLElement | null;
}

describe('startAdMining (MutationObserver + overlay)', () => {
  beforeEach(() => {
    document.body.innerHTML = pageShell(makeCard());
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('detecta o card inicial', async () => {
    const handle = startAdMining({ debounceMs: 10 });
    await flush();
    expect(handle.getCollectedAds()).toHaveLength(1);
    expect(document.querySelectorAll('[data-caca-oferta-badge]')).toHaveLength(1);
    handle.stop();
  });

  it('detecta novos anúncios carregados por scroll (mutação do DOM)', async () => {
    const handle = startAdMining({ debounceMs: 10 });
    await flush();
    expect(handle.getCollectedAds()).toHaveLength(1);

    appendToResults(makeCard({ pageName: 'Loja Fitness', adLibraryId: '555000111' }));
    await flush();
    expect(handle.getCollectedAds()).toHaveLength(2);
    expect(document.querySelectorAll('[data-caca-oferta-badge]')).toHaveLength(2);
    handle.stop();
  });

  it('não duplica overlays nem reprocessa anúncios', async () => {
    const handle = startAdMining({ debounceMs: 10 });
    await flush();
    expect(handle.getCollectedAds()).toHaveLength(1);

    // Reinserção do mesmo conteúdo (rerender) → mesmo ID, sem duplicar badge.
    const first = document.querySelector('[data-testid="ad-card"]');
    first?.remove();
    appendToResults(makeCard());
    await flush();
    expect(handle.getCollectedAds()).toHaveLength(1);
    expect(document.querySelectorAll('[data-caca-oferta-badge]')).toHaveLength(1);
    handle.stop();
  });

  it('um card malformado não interrompe os demais', async () => {
    const handle = startAdMining({ debounceMs: 10 });
    await flush();
    appendToResults('<div class="x1n2onr6">Texto sem nenhum marcador de anúncio.</div>');
    appendToResults(makeCard({ pageName: 'Segunda Página', adLibraryId: '888777666' }));
    await flush();
    expect(handle.getCollectedAds()).toHaveLength(2);
    handle.stop();
  });

  it('indexa anúncios por domínio para a pesquisa local (FASE 03)', async () => {
    const handle = startAdMining({ debounceMs: 10 });
    await flush();

    // Card padrão decodifica l.php → https://loja.nutsmart.com.br/promo?utm=fb
    // → domínio normalizado (public suffix) nutsmart.com.br.
    expect(handle.searchByDomain('nutsmart.com.br')).toHaveLength(1);
    expect(handle.searchByDomain('https://www.nutsmart.com.br/qualquer')).toHaveLength(1);
    expect(handle.searchByDomain('exemplo.com')).toHaveLength(0);

    // Novo anúncio: domínio B entra sem reconstruir o índice.
    appendToResults(
      makeCard({
        pageName: 'Loja Fitness',
        adLibraryId: '555000111',
        destinationHref: 'https://www.fitlife.com.br/promo?utm_source=fb',
      }),
    );
    await flush();
    expect(handle.searchByDomain('nutsmart.com.br')).toHaveLength(1);
    expect(handle.searchByDomain('fitlife.com.br')).toHaveLength(1);
    handle.stop();
  });

  it('pesquisar domínio pelo badge abre a sidebar preenchida (FASE 03 → FASE 05)', async () => {
    const handle = startAdMining({ debounceMs: 10 });
    await flush();

    const badge = document.querySelector('[data-caca-oferta-badge]');
    const shadowRoot = badge?.shadowRoot;
    const searchBtn = shadowRoot?.querySelector('.co-btn-search');
    expect(searchBtn).not.toBeNull();
    (searchBtn as HTMLButtonElement).click();

    const sidebar = sidebarHost();
    expect(sidebar).not.toBeNull();
    const panelRoot = sidebarPanelRoot();
    expect(panelRoot?.textContent).toContain('Domínio: nutsmart.com.br');
    expect(panelRoot?.querySelectorAll('.co-result').length).toBe(1);
    handle.stop();
  });

  it('sidebar embute a busca da FASE 03 e mostra contadores ao vivo (FASE 05)', async () => {
    const handle = startAdMining({ debounceMs: 10 });
    await flush();

    const sidebar = sidebarHost();
    const root = sidebar?.shadowRoot;
    expect(root?.textContent).toContain('CAÇAOFERTA');
    expect(root?.textContent).toContain('Extensão ativa');
    expect(root?.querySelector('.co-stat-total')?.textContent).toBe('1');
    expect(root?.querySelector('.co-stat-active')?.textContent).toBe('1');
    expect(root?.querySelector('.co-stat-inactive')?.textContent).toBe('0');

    appendToResults(
      makeCard({
        pageName: 'Loja Fitness',
        adLibraryId: '554433221100',
        status: 'Inactive',
        startText: 'Started running on June 10, 2026',
        stopText: 'Stopped running on August 5, 2026',
      }),
    );
    await flush();
    expect(root?.querySelector('.co-stat-total')?.textContent).toBe('2');
    expect(root?.querySelector('.co-stat-active')?.textContent).toBe('1');
    expect(root?.querySelector('.co-stat-inactive')?.textContent).toBe('1');
    handle.stop();
  });

  it('copiar ID no badge usa clipboard e mostra toast (FASE 05)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const handle = startAdMining({ debounceMs: 10 });
    await flush();

    const shadowRoot = document.querySelector('[data-caca-oferta-badge]')?.shadowRoot;
    const copyIdBtn = shadowRoot?.querySelector('.co-btn-copy-id') as HTMLButtonElement | null;
    expect(copyIdBtn).not.toBeNull();
    copyIdBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(writeText).toHaveBeenCalledWith('968129471240839');
    expect(shadowRoot?.querySelector('.co-toast')?.textContent).toBe('ID copiado.');
    handle.stop();
  });

  it('abrir anúncio no badge só abre sob ação do usuário e valida a URL (FASE 05)', async () => {
    const openSpy = vi.fn();
    window.open = openSpy;

    const handle = startAdMining({ debounceMs: 10 });
    await flush();

    // Nenhuma abertura automática ao detectar o card.
    expect(openSpy).not.toHaveBeenCalled();

    const shadowRoot = document.querySelector('[data-caca-oferta-badge]')?.shadowRoot;
    const openBtn = shadowRoot?.querySelector('.co-btn-open-ad') as HTMLButtonElement | null;
    expect(openBtn).not.toBeNull();
    openBtn?.click();
    expect(openSpy).toHaveBeenCalledWith(
      'https://www.facebook.com/ads/library/?id=968129471240839&view_all_page_id=315236625874136',
      '_blank',
      'noopener',
    );
    handle.stop();
  });

  it('copiar domínio no badge usa clipboard e mostra toast (FASE 03)', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });

    const handle = startAdMining({ debounceMs: 10 });
    await flush();

    const shadowRoot = document.querySelector('[data-caca-oferta-badge]')?.shadowRoot;
    const copyBtn = shadowRoot?.querySelector('.co-btn-copy-domain') as HTMLButtonElement | null;
    expect(copyBtn).not.toBeNull();
    copyBtn?.click();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(writeText).toHaveBeenCalledWith('nutsmart.com.br');
    handle.stop();
  });

  it('openSearch(domain) abre a sidebar e executa a pesquisa a partir do handle (FASE 03 → FASE 05)', async () => {
    const handle = startAdMining({ debounceMs: 10 });
    await flush();
    handle.openSearch('nutsmart.com.br');
    const panelRoot = sidebarPanelRoot();
    expect(panelRoot?.textContent).toContain('Domínio: nutsmart.com.br');
    expect(panelRoot?.querySelectorAll('.co-result').length).toBe(1);
    handle.stop();
  });
});