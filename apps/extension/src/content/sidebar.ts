// CAÇAOFERTA — Sidebar dedicada (FASE 05).
//
// Interface visual definitiva inicial da ferramenta dentro da Meta Ads
// Library: painel fixo à direita, recolhível e redimensionável, com
//   • identidade CAÇAOFERTA + "● Extensão ativa";
//   • busca por domínio (REUTILIZA o pipeline da FASE 03 — DomainIndex +
//     searchByDomain + filterAds/sortAds — nenhuma segunda implementação);
//   • contadores ao vivo de anúncios detectados (total/ativos/encerrados/desconhecidos);
//   • links de Configurações / Minhas ofertas (ainda não implementados: toast honesto).
//
// Isolamento total via Shadow DOM (nenhum CSS global sobre a página da Meta).
// O host é transparente a cliques (pointer-events: none); apenas a interface
// em si (shell/tab) intercepta eventos — a página continua rolável e clicável.

import type { ParsedAd } from '@caca-oferta/types';
import type { SavedAdDto, SavedAdListDto } from '@caca-oferta/shared';
import { sendRuntimeRequest } from '../bridge/runtimeClient';
import { RuntimeMessageType, type RuntimeResponse } from '../bridge/messages';
import type { DomainIndex } from './DomainIndex';
import { getLogger } from './logging';
import { AdSearchPanel } from './searchPanel';
import { SearchCentral } from './searchCentral';
import { attachToast, type Toast } from './toast';

/** Acesso à lista de ofertas salvas (produção = service worker; testes = fake). */
export interface SavedOffersService {
  list(): Promise<RuntimeResponse<SavedAdListDto>>;
  remove(id: string): Promise<RuntimeResponse<{ id: string; deleted: true }>>;
}

const bridgeSavedOffersService: SavedOffersService = {
  list() {
    return sendRuntimeRequest<SavedAdListDto>({
      type: RuntimeMessageType.ListSavedAds,
      page: 1,
      pageSize: 50,
    });
  },
  remove(id) {
    return sendRuntimeRequest({ type: RuntimeMessageType.DeleteSavedAd, id });
  },
};

const DEFAULT_WIDTH = 340;
const MIN_WIDTH = 260;
const MAX_WIDTH = 460;
const WIDTH_STORAGE_KEY = 'co.sidebarWidth';
const COLLAPSED_STORAGE_KEY = 'co.sidebarCollapsed';

export interface CaçaOfertaSidebarOptions {
  getIndex: () => DomainIndex;
  getAds: () => ParsedAd[];
  /** Injetável nos testes. Default: service worker (production). */
  savedOffersService?: SavedOffersService;
  onSearch?: (url: string, context?: { keyword?: string; niche?: string; subniche?: string }) => void;
}

const SIDEBAR_STYLE = `
  :host { all: initial; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .co-shell {
    pointer-events: auto;
    position: relative;
    display: flex;
    flex-direction: column;
    width: ${DEFAULT_WIDTH}px;
    max-width: calc(100vw - 24px);
    max-height: calc(100vh - 32px);
    background: #17171c;
    color: #f4f4f5;
    border: 1px solid #ea580c;
    border-radius: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.55);
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    line-height: 1.4;
    overflow: hidden;
  }
  .co-handle {
    position: absolute;
    top: 0;
    bottom: 0;
    left: -4px;
    width: 8px;
    cursor: col-resize;
    touch-action: none;
  }
  .co-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 10px 8px 12px;
    border-bottom: 1px solid #27272a;
  }
  .co-brand { font-weight: 800; letter-spacing: 0.05em; color: #ea580c; font-size: 13px; }
  .co-statusline {
    display: flex; align-items: center; gap: 5px;
    margin-left: auto; color: #d4d4d8; font-size: 11px;
  }
  .co-dotstate { width: 8px; height: 8px; border-radius: 50%; background: #22c55e; }
  .co-collapse {
    margin-left: 4px;
    background: #27272a; color: #e4e4e7;
    border: 1px solid #3f3f46; border-radius: 6px;
    font: inherit; font-size: 12px; line-height: 1;
    padding: 3px 5px; cursor: pointer;
  }
  .co-collapse:hover { background: #3f3f46; }
  .co-body {
    flex: 1 1 auto;
    overflow-y: auto;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .co-section-t {
    font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
    color: #71717a;
  }
  .co-stats { display: flex; flex-direction: column; gap: 2px; }
  .co-stat-row { display: flex; justify-content: space-between; gap: 8px; color: #d4d4d8; }
  .co-stat-value { font-weight: 600; color: #f4f4f5; }
  .co-stat-empty { color: #71717a; font-size: 11px; }
  .co-divider { height: 1px; background: #27272a; }
  .co-footer {
    display: flex; gap: 6px;
    padding: 8px 12px 10px;
    border-top: 1px solid #27272a;
  }
  .co-link {
    background: #27272a; color: #e4e4e7;
    border: 1px solid #3f3f46; border-radius: 6px;
    font: inherit; font-size: 11px; font-weight: 600;
    padding: 5px 8px; cursor: pointer;
  }
  .co-link:hover { background: #3f3f46; }
  .co-offers { margin: 2px 0 4px; }
  .co-offers-head {
    display: flex; align-items: center; gap: 6px; margin-bottom: 6px;
  }
  .co-offers-msg { color: #a1a1aa; font-size: 11px; line-height: 1.5; }
  .co-offers-msg-error { color: #fca5a5; }
  .co-offers-list { display: flex; flex-direction: column; gap: 5px; }
  .co-offer {
    display: flex; align-items: center; gap: 6px;
    background: #1e1e23; border: 1px solid #27272a; border-radius: 6px;
    padding: 5px 6px;
  }
  .co-offer-info { flex: 1 1 auto; min-width: 0; }
  .co-offer-title {
    color: #e4e4e7; font-size: 11px; font-weight: 600;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .co-offer-sub { color: #71717a; font-size: 10px; }
  .co-offer-btn {
    flex: none;
    background: #27272a; color: #e4e4e7;
    border: 1px solid #3f3f46; border-radius: 5px;
    font: inherit; font-size: 10px; padding: 3px 6px; cursor: pointer;
  }
  .co-offer-btn:hover { background: #3f3f46; }
  .co-offer-btn-remove:hover { background: #7f1d1d; border-color: #b91c1c; color: #fecaca; }
  .co-refresh {
    margin-left: auto;
    background: #27272a; color: #e4e4e7;
    border: 1px solid #3f3f46; border-radius: 5px;
    font: inherit; font-size: 10px; padding: 2px 6px; cursor: pointer;
  }
  .co-refresh:hover { background: #3f3f46; }
  .co-tab {
    pointer-events: auto;
    display: none;
    align-items: center;
    gap: 6px;
    padding: 9px 11px;
    background: #17171c;
    color: #ea580c;
    border: 1px solid #ea580c;
    border-radius: 8px;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
  }
  .co-tab:hover { background: #1c1c21; }
  :focus-visible { outline: 2px solid #fb923c; outline-offset: 1px; }
`;

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // sem localStorage (testes/strict) não persiste, sem quebrar a UI.
  }
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className = '',
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class CaçaOfertaSidebar {
  private readonly logger = getLogger('sidebar');
  private readonly host: HTMLDivElement;
  private readonly shadow: ShadowRoot;
  private readonly shell: HTMLDivElement;
  private readonly body: HTMLDivElement;
  private readonly tab: HTMLButtonElement;
  private readonly totalEl: HTMLSpanElement;
  private readonly activeEl: HTMLSpanElement;
  private readonly inactiveEl: HTMLSpanElement;
  private readonly unknownEl: HTMLSpanElement;
  private readonly emptyEl: HTMLDivElement;
  private readonly toast: Toast;

  /** Lista de ofertas salvas (FASE 06). */
  private readonly savedOffersBox: HTMLDivElement;
  private readonly savedOffersHead: HTMLDivElement;
  private readonly savedOffersBody: HTMLDivElement;
  private readonly savedOffersService: SavedOffersService;
  private savedOffersVisible = false;
  private loadingSaved = false;

  /** Engine de busca da FASE 03, embutida na sidebar (sem segunda implementação). */
  readonly panel: AdSearchPanel;
  /** Central de Pesquisa (FASE 07). */
  readonly searchCentral: SearchCentral | null;
  /** Contexto da pesquisa ativa (keyword/niche/subniche). */
  private searchContext: { keyword?: string; niche?: string; subniche?: string } = {};

  private collapsed: boolean;
  private width = DEFAULT_WIDTH;
  private lastCounts = { total: -1, active: -1, inactive: -1, unknown: -1 };

  constructor(private readonly options: CaçaOfertaSidebarOptions) {
    this.host = el('div');
    this.savedOffersService = options.savedOffersService ?? bridgeSavedOffersService;
    this.host.setAttribute('data-caca-oferta-sidebar', '');
    Object.assign(this.host.style, {
      position: 'fixed',
      top: '16px',
      right: '16px',
      zIndex: '2147482990',
      pointerEvents: 'none',
    });
    this.shadow = this.host.attachShadow({ mode: 'open' });

    const style = el('style');
    style.textContent = SIDEBAR_STYLE;
    this.shadow.append(style);

    this.shell = el('div', 'co-shell');
    this.shell.setAttribute('role', 'complementary');
    this.shell.setAttribute('aria-label', 'CaçaOferta — análise de anúncios da Biblioteca');

    // Cabeçalho.
    const header = el('div', 'co-header');
    header.append(el('span', 'co-brand', '🔎 CAÇAOFERTA'));
    const statusLine = el('span', 'co-statusline');
    statusLine.append(el('span', 'co-dotstate'));
    statusLine.append(el('span', undefined, 'Extensão ativa'));
    const collapseBtn = el('button', 'co-collapse', '⏷');
    collapseBtn.type = 'button';
    collapseBtn.setAttribute('aria-label', 'Recolher CaçaOferta');
    collapseBtn.setAttribute('aria-expanded', 'true');
    collapseBtn.addEventListener('click', () => this.collapse());
    const handle = el('div', 'co-handle');
    handle.setAttribute('role', 'separator');
    handle.setAttribute('aria-orientation', 'vertical');
    handle.setAttribute('aria-label', 'Ajustar largura do CaçaOferta');
    this.attachResize(handle);
    header.append(statusLine, collapseBtn);
    this.shell.append(handle, header);

    // Corpo: contadores + busca (painel da FASE 03 embutido).
    this.body = el('div', 'co-body');

    const statsBox = el('div');
    statsBox.append(el('div', 'co-section-t', 'ANÚNCIOS DETECTADOS'));
    const stats = el('div', 'co-stats');
    const total = this.statRow('Total', 'co-stat-total');
    this.totalEl = total.value;
    stats.append(total.row);
    const active = this.statRow('🟢 Ativos', 'co-stat-active');
    this.activeEl = active.value;
    stats.append(active.row);
    const inactive = this.statRow('🔴 Encerrados', 'co-stat-inactive');
    this.inactiveEl = inactive.value;
    stats.append(inactive.row);
    const unknown = this.statRow('⚪ Desconhecidos', 'co-stat-unknown');
    this.unknownEl = unknown.value;
    stats.append(unknown.row);
    this.emptyEl = el('div', 'co-stat-empty', 'Nenhum anúncio detectado ainda.');
    this.emptyEl.hidden = true;
    statsBox.append(stats, this.emptyEl);
    this.body.append(statsBox, el('div', 'co-divider'));

    this.panel = new AdSearchPanel({ getIndex: this.options.getIndex, embedded: true });
    this.body.append(this.panel.host);

    // Central de Pesquisa (FASE 07): pesquisa por palavra-chave, domínio ou combinado.
    if (this.options.onSearch) {
      this.searchCentral = new SearchCentral({
        onSearch: this.options.onSearch,
      });
      this.body.append(this.searchCentral.host);
    } else {
      this.searchCentral = null;
    }

    // Seção de ofertas salvas (FASE 06): escondida até o usuário pedir.
    // Carregada só sob ação explícita (sem chamadas automáticas à rede).
    this.savedOffersBox = el('div', 'co-offers');
    this.savedOffersBox.hidden = true;
    this.savedOffersHead = el('div', 'co-offers-head');
    const savedTitle = el('span', 'co-section-t', '⭐ MINHAS OFERTAS');
    const refreshBtn = el('button', 'co-refresh', '↻ Atualizar');
    refreshBtn.type = 'button';
    refreshBtn.title = 'Atualizar lista de ofertas salvas';
    refreshBtn.addEventListener('click', () => void this.loadSavedOffers());
    this.savedOffersHead.append(savedTitle, refreshBtn);
    this.savedOffersBody = el('div', 'co-offers-msg', 'Suas ofertas salvas aparecem aqui.');
    this.savedOffersBox.append(this.savedOffersHead, this.savedOffersBody);
    this.body.append(this.savedOffersBox, el('div', 'co-divider'));

    this.shell.append(this.body);

    // Rodapé: Configurações (fases futuras) e Minhas ofertas (FASE 06: lista real).
    const footer = el('div', 'co-footer');
    const settingsBtn = el('button', 'co-link', '⚙ Configurações');
    settingsBtn.type = 'button';
    settingsBtn.title = 'Configurações do CaçaOferta';
    settingsBtn.addEventListener('click', () => this.toast.show('Configurações disponíveis em fases futuras.'));
    const offersBtn = el('button', 'co-link', '⭐ Minhas ofertas');
    offersBtn.type = 'button';
    offersBtn.title = 'Salvar e gerenciar ofertas';
    offersBtn.addEventListener('click', () => this.toggleSavedOffers());
    footer.append(settingsBtn, offersBtn);
    this.shell.append(footer);

    this.shadow.append(this.shell);

    // Aba recolhida (mostrada apenas quando a sidebar está recolhida).
    this.tab = el('button', 'co-tab', '🔎 CAÇAOFERTA');
    this.tab.type = 'button';
    this.tab.setAttribute('aria-label', 'Expandir CaçaOferta');
    this.tab.addEventListener('click', () => this.expand());
    Object.assign(this.tab.style, { pointerEvents: 'auto' });
    this.shadow.append(this.tab);

    this.toast = attachToast(this.shadow);

    // Estado inicial: expandida por padrão (respeitando preferência salva).
    this.collapsed = readStored(COLLAPSED_STORAGE_KEY) === '1';
    this.restoreWidth();
    this.applyCollapsed();

    // Esc recolhe a sidebar (acessibilidade por teclado).
    this.host.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !this.collapsed) this.collapse();
    });
  }

  private statRow(label: string, cls: string): { row: HTMLDivElement; value: HTMLSpanElement } {
    const row = el('div', 'co-stat-row');
    row.append(el('span', 'co-stat-label', label));
    const value = el('span', `co-stat-value ${cls}`);
    value.textContent = '…';
    row.append(value);
    return { row, value };
  }

  mount(parent: Element = document.body): void {
    parent.append(this.host);
    // A busca fica sempre acessível na sidebar expandida (sem roubar o foco).
    this.panel.reveal();
    this.logger.debug('Sidebar montada.');
  }

  destroy(): void {
    this.panel.destroy();
    this.searchCentral?.destroy();
    this.toast.destroy();
    this.host.remove();
    this.logger.debug('Sidebar destruída.');
  }

  get isVisible(): boolean {
    return !this.collapsed;
  }

  /** Abre a sidebar (expandida) e, com domínio, executa a busca da FASE 03. */
  open(domain?: string): void {
    this.expand();
    this.panel.open(domain);
  }

  close(): void {
    this.collapse();
  }

  /** Limpa contadores e a busca (reutilizado quando a sessão/URL muda). */
  reset(): void {
    this.panel.reset();
    this.syncStats();
    this.searchContext = {};
    this.savedOffersVisible = false;
    this.savedOffersBox.hidden = true;
  }

  /** Reexecuta a busca atual quando novos anúncios chegam (sem rebuild total). */
  refreshSearch(): void {
    if (this.panel.isVisible) this.panel.refresh();
  }

  /** Define o contexto da pesquisa ativa (keyword/niche/subniche). */
  setSearchContext(context: { keyword?: string; niche?: string; subniche?: string }): void {
    this.searchContext = context;
    this.logger.debug('Contexto de pesquisa atualizado', context);
  }

  /** Alterna a aba "⭐ Minhas ofertas" (carrega a lista apenas sob ação do usuário). */
  toggleSavedOffers(): void {
    this.savedOffersVisible = !this.savedOffersVisible;
    this.savedOffersBox.hidden = !this.savedOffersVisible;
    if (this.savedOffersVisible) void this.loadSavedOffers();
  }

  async loadSavedOffers(): Promise<void> {
    if (this.loadingSaved) return;
    this.loadingSaved = true;
    this.renderSavedOffersLoading();
    const response = await this.savedOffersService.list();
    this.loadingSaved = false;
    if (response.ok) {
      this.renderSavedOffersList(response.data.items);
    } else {
      this.renderSavedOffersError(response.message);
    }
  }

  private renderSavedOffersLoading(): void {
    this.savedOffersBody.replaceChildren();
    this.savedOffersBody.className = 'co-offers-msg';
    this.savedOffersBody.textContent = 'Carregando suas ofertas…';
    const refresh = this.savedOffersHead.querySelector('.co-refresh');
    if (refresh) (refresh as HTMLButtonElement).disabled = true;
  }

  private renderSavedOffersError(message: string): void {
    this.savedOffersBody.replaceChildren();
    this.savedOffersBody.className = 'co-offers-msg co-offers-msg-error';
    this.savedOffersBody.textContent = message || 'Não foi possível carregar suas ofertas.';
    const retry = el('button', 'co-offer-btn co-offer-btn-retry', '↻ Tentar novamente');
    retry.type = 'button';
    retry.addEventListener('click', () => void this.loadSavedOffers());
    this.savedOffersBody.append(retry);
    const refresh = this.savedOffersHead.querySelector('.co-refresh');
    if (refresh) (refresh as HTMLButtonElement).disabled = false;
  }

  private renderSavedOffersList(items: SavedAdDto[]): void {
    this.savedOffersBody.replaceChildren();
    this.savedOffersBody.className = 'co-offers-list';
    const refresh = this.savedOffersHead.querySelector('.co-refresh');
    if (refresh) (refresh as HTMLButtonElement).disabled = false;

    if (!items.length) {
      this.savedOffersBody.className = 'co-offers-msg';
      this.savedOffersBody.textContent = 'Nenhuma oferta salva ainda. Salve ofertas pelos botões nos anúncios.';
      return;
    }

    for (const saved of items) {
      this.savedOffersBody.append(this.buildSavedOfferItem(saved));
    }
  }

  private buildSavedOfferItem(saved: SavedAdDto): HTMLElement {
    const item = el('div', 'co-offer');

    const info = el('div', 'co-offer-info');
    const title = el('div', 'co-offer-title', saved.pageName || saved.adLibraryId);
    title.title = title.textContent ?? '';
    const sub = el('div', 'co-offer-sub', `ID ${saved.adLibraryId}`);
    info.append(title, sub);

    const openBtn = el('button', 'co-offer-btn co-offer-btn-open', 'Abrir');
    openBtn.type = 'button';
    openBtn.title = 'Abrir o anúncio na Biblioteca';
    openBtn.addEventListener('click', () => {
      if (saved.adSnapshotUrl) window.open(saved.adSnapshotUrl, '_blank', 'noopener');
      else this.toast.show('Sem URL do anúncio para abrir.');
    });

    const removeBtn = el('button', 'co-offer-btn co-offer-btn-remove', 'Excluir');
    removeBtn.type = 'button';
    removeBtn.title = 'Remover destas ofertas salvas';
    removeBtn.addEventListener('click', () => void this.removeSavedOffer(saved));

    item.append(info, openBtn, removeBtn);
    return item;
  }

  private async removeSavedOffer(saved: SavedAdDto): Promise<void> {
    const response = await this.savedOffersService.remove(saved.id);
    if (response.ok) {
      this.toast.show('Oferta removida.');
      await this.loadSavedOffers();
    } else {
      this.toast.show(response.message || 'Não foi possível remover a oferta.');
    }
  }

  /** Atualiza os contadores a partir dos anúncios detectados (memoizado). */
  syncStats(): void {
    const ads = this.options.getAds();
    let total = 0;
    let active = 0;
    let inactive = 0;
    let unknown = 0;
    for (const ad of ads) {
      total++;
      if (ad.status === 'ativo') active++;
      else if (ad.status === 'encerrado') inactive++;
      else unknown++;
    }
    if (
      total === this.lastCounts.total &&
      active === this.lastCounts.active &&
      inactive === this.lastCounts.inactive &&
      unknown === this.lastCounts.unknown
    ) {
      return;
    }
    this.lastCounts = { total, active, inactive, unknown };
    this.totalEl.textContent = String(total);
    this.activeEl.textContent = String(active);
    this.inactiveEl.textContent = String(inactive);
    this.unknownEl.textContent = String(unknown);
    this.emptyEl.hidden = total !== 0;
  }

  expand(): void {
    this.collapsed = false;
    writeStored(COLLAPSED_STORAGE_KEY, '0');
    this.applyCollapsed();
    this.logger.debug('Sidebar expandida.');
  }

  collapse(): void {
    this.collapsed = true;
    writeStored(COLLAPSED_STORAGE_KEY, '1');
    this.applyCollapsed();
    this.logger.debug('Sidebar recolhida.');
  }

  private applyCollapsed(): void {
    this.shell.style.display = this.collapsed ? 'none' : 'flex';
    this.tab.style.display = this.collapsed ? 'flex' : 'none';
  }

  private restoreWidth(): void {
    const stored = readStored(WIDTH_STORAGE_KEY);
    const parsed = stored ? Number(stored) : NaN;
    if (Number.isFinite(parsed)) this.setWidth(parsed);
    else this.setWidth(DEFAULT_WIDTH);
  }

  private setWidth(px: number): void {
    this.width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, px));
    this.shell.style.width = `${this.width}px`;
    writeStored(WIDTH_STORAGE_KEY, String(this.width));
  }

  private attachResize(handle: HTMLDivElement): void {
    handle.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = this.width;
      const onMove = (moveEvent: PointerEvent): void => {
        this.setWidth(startWidth + (startX - moveEvent.clientX));
      };
      const onUp = (): void => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });
  }
}