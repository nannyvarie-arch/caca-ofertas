// CAÇAOFERTA — Painel de pesquisa por domínio (FASE 03).
//
// Interface da extensão dentro da Biblioteca de Anúncios. Consulta SEMPRE o
// índice local (DomainIndex): retorna somente anúncios realmente detectados
// e indexados — nunca afirma cobertura completa da Meta (seção 26).
//
// Nenhum dado externo é inserido via innerHTML: todo texto de anúncio/domínio
// entra por textContent. URLs são validadas com isSafeHttpUrl/domainOriginUrl
// antes de qualquer abertura (toda abertura é ação explícita do usuário).

import type { ParsedAd } from '@caca-oferta/types';
import { copyTextToClipboard } from './clipboard';
import type { DomainIndex } from './DomainIndex';
import { searchByDomain } from './DomainIndex';
import { isSafeHttpUrl, normalizeDomain } from './domain';
import { isoToBr, mediaVisual, platformLabel } from './format';
import { getLogger } from './logging';
import { runningDaysOf, runningDaysTier } from './runningDays';
import type { AdFilters, MediaFilterKey, PlatformFilterKey, SortKey, StatusFilterKey } from './sortFilter';
import { DEFAULT_FILTERS, filterAds, sortAds } from './sortFilter';
import { attachToast } from './toast';

export const SEARCH_MESSAGES = {
  idle: 'Pesquise um domínio para ver anúncios relacionados.',
  empty: 'Digite um domínio para pesquisar.',
  invalid: 'Digite um domínio válido.',
  notFound: 'Nenhum anúncio conhecido pelo CaçaOferta para este domínio.',
  noMatch: 'Nenhum anúncio atende aos filtros selecionados.',
  scope: 'Resultados sobre anúncios detectados nesta sessão (índice local).',
} as const;

const MAX_RESULTS = 200;

export interface AdSearchPanelOptions {
  getIndex: () => DomainIndex;
  /** Quando true, o painel é embutido em um container (sidebar) sem borda/largura própria. */
  embedded?: boolean;
}

type MessageKey = 'idle' | 'empty' | 'invalid' | 'notFound' | 'noMatch';

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

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', 'co-btn');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    onClick();
  });
  return b;
}

const PANEL_STYLE = `
  :host { all: initial; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .co-panel {
    width: 430px;
    max-width: calc(100vw - 24px);
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: #17171c;
    color: #f4f4f5;
    border: 1px solid #ea580c;
    border-radius: 12px;
    padding: 12px;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.55);
    overflow-y: auto;
  }
  .co-head { display: flex; align-items: center; justify-content: space-between; }
  .co-title { font-weight: 700; letter-spacing: 0.05em; color: #ea580c; }
  .co-close {
    background: none; border: none; color: #a1a1aa; cursor: pointer;
    font-size: 14px; line-height: 1; padding: 2px 6px;
  }
  .co-close:hover { color: #f4f4f5; }
  .co-form { display: flex; gap: 6px; }
  .co-input {
    flex: 1; min-width: 0; background: #1f1f26; color: #f4f4f5;
    border: 1px solid #3f3f46; border-radius: 8px; padding: 7px 10px; font: inherit;
  }
  .co-input:focus { outline: none; border-color: #ea580c; }
  .co-submit {
    background: #ea580c; color: #fff; border: none; border-radius: 8px;
    padding: 7px 12px; font: inherit; font-weight: 600; cursor: pointer;
  }
  .co-submit:hover { background: #c2410c; }
  .co-summary { color: #e4e4e7; }
  .co-domain-line { color: #38bdf8; font-weight: 700; }
  .co-counts { margin: 4px 0 0; display: flex; flex-wrap: wrap; gap: 8px; color: #d4d4d8; }
  .co-controls {
    display: flex; flex-wrap: wrap; gap: 6px; padding: 8px;
    border: 1px solid #27272a; border-radius: 8px; background: #1c1c21;
  }
  .co-select {
    background: #27272a; color: #e4e4e7; border: 1px solid #3f3f46;
    border-radius: 6px; font: inherit; font-size: 11px; padding: 4px 6px; cursor: pointer;
  }
  .co-results { display: flex; flex-direction: column; gap: 8px; }
  .co-result {
    border: 1px solid #27272a; border-radius: 8px; background: #1c1c21;
    padding: 8px; display: flex; flex-direction: column; gap: 4px;
  }
  .co-result-top { display: flex; align-items: center; gap: 6px; font-weight: 600; }
  .co-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
  .co-dot-a { background: #22c55e; }
  .co-dot-i { background: #ef4444; }
  .co-dot-u { background: #a1a1aa; }
  .co-meta { color: #a1a1aa; font-size: 11px; }
  .co-domain-sm { color: #38bdf8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .co-actions { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 2px; }
  .co-btn {
    background: #27272a; color: #e4e4e7; border: 1px solid #3f3f46;
    border-radius: 6px; font: inherit; font-size: 10px; padding: 4px 8px; cursor: pointer;
  }
  .co-btn:hover { background: #3f3f46; }
  .co-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
  .co-chip {
    border: 1px solid #3f3f46; border-radius: 999px;
    padding: 1px 7px; font-size: 10px; color: #d4d4d8;
  }
  .co-tier {
    border: 1px solid #3f3f46; border-radius: 999px;
    padding: 1px 7px; font-size: 9px; font-weight: 600;
  }
  .co-tier-t1 { color: #a1a1aa; }
  .co-tier-t2 { color: #d4d4d8; }
  .co-tier-t3 { color: #d6a88a; }
  .co-tier-t4 { color: #fb923c; }
  .co-tier-t5 { color: #fb923c; border-color: #7c2d12; }
  .co-tier-t6 { color: #fdba74; border-color: #ea580c; }
  .co-msg {
    padding: 14px 10px; border: 1px dashed #3f3f46; border-radius: 8px;
    color: #a1a1aa; text-align: center; font-size: 12px;
  }
  .co-scope { color: #71717a; font-size: 10px; margin-top: 2px; }
  .co-toast {
    position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%);
    background: #18181b; color: #f4f4f5; border: 1px solid #ea580c;
    padding: 6px 10px; border-radius: 6px; font-size: 11px;
    z-index: 2147483647; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.5); pointer-events: none;
  }
`;

/** Sobrescrita quando o painel é embutido na sidebar (sem borda/largura própria). */
const EMBEDDED_OVERRIDES = `
  :host { display: block; }
  .co-panel {
    width: 100%;
    max-width: none;
    max-height: none;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    padding: 0;
    overflow: visible;
  }
`;

export class AdSearchPanel {
  private readonly logger = getLogger('search');
  readonly host: HTMLDivElement;
  private shadow: ShadowRoot;
  private input: HTMLInputElement;
  private summaryEl: HTMLDivElement;
  private controlsEl: HTMLDivElement;
  private resultsEl: HTMLDivElement;
  private sortEl: HTMLSelectElement;
  private statusEl: HTMLSelectElement;
  private platformEl: HTMLSelectElement;
  private mediaEl: HTMLSelectElement;
  private daysEl: HTMLSelectElement;
  private toast: ReturnType<typeof attachToast>;

  private query = '';
  private selectedDomain: string | null = null;
  private filters: AdFilters = { ...DEFAULT_FILTERS };
  private sort: SortKey = 'latest';
  private visible = false;

  constructor(private readonly options: AdSearchPanelOptions) {
    this.host = el('div');
    this.host.setAttribute('data-caca-oferta-search-panel', '');
    this.host.hidden = true;
    this.shadow = this.host.attachShadow({ mode: 'open' });

    const style = el('style');
    style.textContent = PANEL_STYLE;
    if (options.embedded) {
      style.textContent += EMBEDDED_OVERRIDES;
    }
    this.shadow.append(style);
    this.toast = attachToast(this.shadow);

    const panel = el('div', 'co-panel');

    const head = el('div', 'co-head');
    head.append(el('span', 'co-title', 'CAÇAOFERTA — Pesquisa por domínio'));
    const closeBtn = el('button', 'co-close');
    closeBtn.type = 'button';
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', () => this.close());
    head.append(closeBtn);
    panel.append(head);

    const form = el('form', 'co-form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      void this.searchInput();
    });
    this.input = el('input', 'co-input');
    this.input.type = 'text';
    this.input.placeholder = 'exemplo.com';
    this.input.setAttribute('aria-label', 'Pesquisar domínio');
    const submitBtn = el('button', 'co-submit');
    submitBtn.type = 'submit';
    submitBtn.textContent = '🔎 PESQUISAR';
    form.append(this.input, submitBtn);
    panel.append(form);

    this.summaryEl = el('div', 'co-summary');
    panel.append(this.summaryEl);

    this.controlsEl = el('div', 'co-controls');
    this.statusEl = this.buildSelect<StatusFilterKey>('status', [
      ['all', 'Status: todos'],
      ['ativo', 'Status: ativos'],
      ['encerrado', 'Status: encerrados'],
      ['desconhecido', 'Status: desconhecidos'],
    ]);
    this.platformEl = this.buildSelect<PlatformFilterKey>('platform', [
      ['all', 'Plataforma: todas'],
      ['facebook', 'Plataforma: Facebook'],
      ['instagram', 'Plataforma: Instagram'],
      ['messenger', 'Plataforma: Messenger'],
      ['audience-network', 'Plataforma: Audience Network'],
    ]);
    this.mediaEl = this.buildSelect<MediaFilterKey>('media', [
      ['all', 'Mídia: todas'],
      ['imagem', 'Mídia: imagem'],
      ['video', 'Mídia: vídeo'],
      ['carrossel', 'Mídia: carrossel'],
      ['desconhecida', 'Mídia: desconhecida'],
    ]);
    this.daysEl = this.buildSelect<AdFilters['maxDays']>('maxDays', [
      ['all', 'Dias rodando: todos'],
      ['7', 'Dias rodando: até 7'],
      ['30', 'Dias rodando: até 30'],
      ['90', 'Dias rodando: até 90'],
      ['180', 'Dias rodando: até 180'],
    ]);
    this.sortEl = this.buildSelect<SortKey>('sort', [
      ['latest', 'Mais recentes'],
      ['oldest', 'Mais antigos'],
      ['longest', 'Maior tempo rodando'],
      ['shortest', 'Menor tempo rodando'],
      ['az', 'A-Z'],
      ['za', 'Z-A'],
    ]);
    this.controlsEl.append(this.sortEl, this.statusEl, this.platformEl, this.mediaEl, this.daysEl);
    panel.append(this.controlsEl);

    this.resultsEl = el('div', 'co-results');
    panel.append(this.resultsEl);

    this.shadow.append(panel);
    this.renderMessage('idle');
  }

  private buildSelect<T extends string>(filterKey: string, options: Array<[T, string]>): HTMLSelectElement {
    const select = el('select', 'co-select');
    select.dataset.filterKey = filterKey;
    for (const [value, label] of options) {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      select.append(opt);
    }
    select.addEventListener('change', () => {
      if (filterKey === 'sort') this.sort = select.value as SortKey;
      else this.applyFilter(select, filterKey);
      this.refresh();
    });
    return select;
  }

  private applyFilter(select: HTMLSelectElement, key: string): void {
    const value = select.value;
    if (key === 'status') this.filters.status = value as AdFilters['status'];
    else if (key === 'platform') this.filters.platform = value as AdFilters['platform'];
    else if (key === 'media') this.filters.media = value as AdFilters['media'];
    else if (key === 'maxDays') this.filters.maxDays = value as AdFilters['maxDays'];
  }

  mount(parent: Element = document.body): void {
    parent.append(this.host);
  }

  destroy(): void {
    this.toast.destroy();
    this.host.remove();
    this.logger.debug('Painel de pesquisa destruído.');
  }

  get isVisible(): boolean {
    return this.visible;
  }

  /** Exibe o painel sem roubar o foco (usado na sidebar). */
  reveal(): void {
    this.visible = true;
    this.host.hidden = false;
  }

  /** Abre o painel; com domain, preenche e executa a pesquisa (seção 14). */
  open(domain?: string): void {
    this.reveal();
    if (domain !== undefined && domain !== null) {
      this.search(domain);
    } else {
      this.input.focus();
    }
  }

  close(): void {
    this.visible = false;
    this.host.hidden = true;
  }

  /** Limpa o estado de pesquisa (usado quando a sessão/URL muda). */
  reset(): void {
    this.query = '';
    this.selectedDomain = null;
    this.filters = { ...DEFAULT_FILTERS };
    this.sort = 'latest';
    this.input.value = '';
    this.syncSelects();
    this.summaryEl.textContent = '';
    this.controlsEl.hidden = true;
    this.renderMessage('idle');
  }

  /** Reexecuta a pesquisa atual (novos anúncios chegaram / filtros mudaram). */
  refresh(): void {
    if (!this.selectedDomain) return;
    this.query = this.selectedDomain;
    this.input.value = this.selectedDomain;
    this.renderSummary();
    this.renderResults();
  }

  private searchInput(): void {
    this.search(this.input.value);
  }

  search(raw: string): void {
    this.query = raw.trim();
    this.input.value = this.query;
    this.selectedDomain = null;

    if (!this.query) {
      this.summaryEl.textContent = '';
      this.controlsEl.hidden = true;
      this.renderMessage('empty');
      return;
    }

    const normalized = normalizeDomain(this.query);
    if (!normalized) {
      this.summaryEl.textContent = '';
      this.controlsEl.hidden = true;
      this.renderMessage('invalid');
      return;
    }

    this.selectedDomain = normalized;
    this.query = normalized;
    this.input.value = normalized;
    this.renderSummary();
    this.renderResults();
  }

  private renderSummary(): void {
    const domain = this.selectedDomain;
    if (!domain) {
      this.summaryEl.textContent = '';
      return;
    }
    const stats = this.options.getIndex().stats(domain);
    const line1 = el('div', 'co-domain-line', `Domínio: ${domain}`);
    const counts = el('div', 'co-counts');
    counts.append(
      el('span', undefined, `${stats.total} anúncio${stats.total === 1 ? '' : 's'} encontrados`),
      el('span', undefined, `🟢 ${stats.active} ativo${stats.active === 1 ? '' : 's'}`),
      el('span', undefined, `🔴 ${stats.inactive} encerrado${stats.inactive === 1 ? '' : 's'}`),
      el('span', undefined, `⚪ ${stats.unknown} desconhecido${stats.unknown === 1 ? '' : 's'}`),
    );
    this.summaryEl.replaceChildren(line1, counts);
  }

  private renderResults(): void {
    const domain = this.selectedDomain;
    if (!domain) return;
    const detected = searchByDomain(domain, this.options.getIndex());
    if (detected.length === 0) {
      this.controlsEl.hidden = true;
      this.renderMessage('notFound');
      return;
    }
    this.controlsEl.hidden = false;
    const filtered = filterAds(detected, this.filters);
    if (filtered.length === 0) {
      this.renderMessage('noMatch');
      return;
    }
    const sorted = sortAds(filtered, this.sort);
    const cards: HTMLElement[] = [];
    for (const ad of sorted.slice(0, MAX_RESULTS)) {
      cards.push(this.buildResultCard(ad));
    }
    this.resultsEl.replaceChildren(...cards);
    const scope = el('div', 'co-scope', SEARCH_MESSAGES.scope);
    this.resultsEl.append(scope);
  }

  private buildResultCard(ad: ParsedAd): HTMLElement {
    const card = el('div', 'co-result');

    const top = el('div', 'co-result-top');
    const dot = el('span');
    dot.className =
      ad.status === 'ativo' ? 'co-dot co-dot-a' : ad.status === 'encerrado' ? 'co-dot co-dot-i' : 'co-dot co-dot-u';
    top.append(dot, el('span', undefined, ad.pageName ?? 'Página não identificada'));
    card.append(top);

    const chipsParent = el('div', 'co-chips');
    const media = mediaVisual(ad.mediaType);
    if (media) chipsParent.append(el('span', 'co-chip', `${media.icon} ${media.label}`));
    for (const platform of ad.platforms ?? []) {
      chipsParent.append(el('span', 'co-chip', platformLabel(platform)));
    }
    if (chipsParent.childElementCount) card.append(chipsParent);

    if (ad.deliveryStartDate) {
      const days = runningDaysOf(ad);
      const line = document.createElement('div');
      line.className = 'co-meta';
      line.textContent =
        days === null
          ? `Início: ${isoToBr(ad.deliveryStartDate)} · Rodando: não identificado`
          : `Início: ${isoToBr(ad.deliveryStartDate)} · Rodando: ${days} dia${days === 1 ? '' : 's'}`;
      const tier = runningDaysTier(days);
      if (tier) {
        const tierChip = el('span', `co-tier co-tier-${tier.key}`, tier.label);
        tierChip.title = 'Tempo de veiculação do anúncio — não é classificação de oferta.';
        line.append(' ', tierChip);
      }
      card.append(line);
    } else {
      card.append(el('div', 'co-meta', 'Início: não identificado'));
    }

    if (ad.deliveryStopDate && ad.status === 'encerrado') {
      card.append(el('div', 'co-meta', `Encerrou: ${isoToBr(ad.deliveryStopDate)}`));
    }

    if (ad.destinationDomain) {
      card.append(el('div', 'co-domain-sm', `🌐 ${ad.destinationDomain}`));
    }
    if (ad.adLibraryId) {
      card.append(el('div', 'co-meta', `ID: ${ad.adLibraryId}`));
    }

    const actions = el('div', 'co-actions');
    const snap = ad.adSnapshotUrl;
    if (snap && isSafeHttpUrl(snap)) {
      actions.append(button('🌐 Abrir anúncio', () => window.open(snap, '_blank', 'noopener')));
    }
    if (ad.adLibraryId) {
      const id = ad.adLibraryId;
      actions.append(
        button('📋 Copiar ID', () => {
          void this.copyWithToast(id, 'ID copiado.', 'Não foi possível copiar o ID.');
        }),
      );
    }
    if (ad.destinationDomain) {
      const domain = ad.destinationDomain;
      actions.append(
        button('📋 Copiar domínio', () => {
          void this.copyWithToast(domain, 'Domínio copiado.', 'Não foi possível copiar o domínio.');
        }),
      );
    }
    if (ad.destinationUrl) {
      const url = ad.destinationUrl;
      actions.append(
        button('📋 Copiar URL', () => {
          void this.copyWithToast(url, 'URL copiada.', 'Não foi possível copiar a URL.');
        }),
      );
    }
    card.append(actions);
    return card;
  }

  private renderMessage(kind: MessageKey): void {
    const msg = el('div', 'co-msg', SEARCH_MESSAGES[kind]);
    this.resultsEl.replaceChildren(msg);
  }

  private async copyWithToast(text: string, okMsg: string, failMsg: string): Promise<void> {
    const ok = await copyTextToClipboard(text);
    this.showToast(ok ? okMsg : failMsg);
  }

  private showToast(message: string): void {
    this.toast.show(message);
  }

  private syncSelects(): void {
    this.setSelect(this.statusEl, this.filters.status ?? 'all');
    this.setSelect(this.platformEl, this.filters.platform ?? 'all');
    this.setSelect(this.mediaEl, this.filters.media ?? 'all');
    this.setSelect(this.daysEl, this.filters.maxDays ?? 'all');
    this.sortEl.value = this.sort;
  }

  private setSelect(select: HTMLSelectElement, value: string): void {
    select.value = value;
  }
}