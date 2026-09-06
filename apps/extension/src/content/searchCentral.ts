// CAÇAOFERTA — Central de Pesquisa (FASE 07).
//
// Interface unificada de pesquisa com três modos:
//   1. Palavras-chave
//   2. Domínio
//   3. Palavra-chave + Domínio
//
// Inclui: biblioteca de nichos, favoritos, pesquisas recentes, filtros.
// Tudo isolado via Shadow DOM.

import { NICHE_LIBRARY, PURCHASE_INTENT_KEYWORDS, lookupKeyword } from './keywordLibrary';
import { getLogger } from './logging';

export type SearchMode = 'keyword' | 'domain' | 'combined';

export interface SearchFilters {
  country: string;
  status: string;
  platform: string;
  mediaType: string;
}

export interface SearchHistoryEntry {
  id: string;
  mode: SearchMode;
  keyword: string;
  domain: string;
  niche: string;
  subniche: string;
  filters: SearchFilters;
  timestamp: number;
  url: string;
}

export interface SearchFavorites {
  keywords: string[];
  domains: string[];
  searches: string[];
}

export interface SearchCentralOptions {
  onSearch: (url: string, context?: { keyword?: string; niche?: string; subniche?: string }) => void;
  getHistory?: () => SearchHistoryEntry[];
  getFavorites?: () => SearchFavorites;
  saveHistory?: (entry: SearchHistoryEntry) => void;
  saveFavorites?: (favorites: SearchFavorites) => void;
}

const HISTORY_KEY = 'co.searchHistory';
const FAVORITES_KEY = 'co.searchFavorites';

const COUNTRIES: Record<string, string> = {
  '': 'Todos os países',
  BR: 'Brasil',
  US: 'Estados Unidos',
  PT: 'Portugal',
  AO: 'Angola',
  MZ: 'Moçambique',
  CV: 'Cabo Verde',
  ST: 'São Tomé e Príncipe',
  TL: 'Timor-Leste',
  GQ: 'Guiné Equatorial',
};

const STATUS_OPTIONS: Record<string, string> = {
  '': 'Todos',
  ACTIVE: 'Ativos',
  INACTIVE: 'Encerrados',
};

const PLATFORM_OPTIONS: Record<string, string> = {
  '': 'Todas',
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  AUDIENCE_NETWORK: 'Audience Network',
  MESSENGER: 'Messenger',
};

const MEDIA_OPTIONS: Record<string, string> = {
  '': 'Todos',
  IMAGE: 'Imagem',
  VIDEO: 'Vídeo',
  CAROUSEL: 'Carrossel',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function buildSearchUrl(mode: SearchMode, keyword: string, domain: string, filters: SearchFilters): string {
  const base = 'https://www.facebook.com/ads/library/';
  const params = new URLSearchParams();

  if (filters.country) params.set('country', filters.country);
  if (filters.status) params.set('active_status', filters.status);
  if (filters.platform) params.set('media_type', filters.platform);
  if (filters.mediaType) params.set('content_type', filters.mediaType);

  if (mode === 'keyword' || mode === 'combined') {
    if (keyword.trim()) params.set('search_type', 'keyword_unordered');
    params.set('q', keyword.trim());
  }

  if (mode === 'domain' || mode === 'combined') {
    if (mode === 'domain') {
      params.set('search_type', 'page');
      params.set('q', domain.trim());
    }
  }

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

export class SearchCentral {
  private readonly logger = getLogger('search');
  readonly host: HTMLDivElement;
  private readonly shadow: ShadowRoot;
  private readonly options: SearchCentralOptions;
  private history: SearchHistoryEntry[];
  private favorites: SearchFavorites;
  private activeMode: SearchMode = 'keyword';
  private activeTab: 'search' | 'library' | 'history' | 'favorites' = 'search';

  // Elements
  private keywordInput!: HTMLInputElement;
  private domainInput!: HTMLInputElement;
  private modeIndicator!: HTMLDivElement;
  private resultsBox!: HTMLDivElement;
  private historyList!: HTMLDivElement;
  private favoritesList!: HTMLDivElement;
  private nicheLibrary!: HTMLDivElement;
  private filterSelects!: HTMLDivElement;

  constructor(options: SearchCentralOptions) {
    this.options = options;
    this.history = options.getHistory?.() ?? readStored<SearchHistoryEntry[]>(HISTORY_KEY, []);
    this.favorites = options.getFavorites?.() ?? readStored<SearchFavorites>(FAVORITES_KEY, { keywords: [], domains: [], searches: [] });

    this.host = document.createElement('div');
    this.host.setAttribute('data-caca-oferta-search', '');
    this.shadow = this.host.attachShadow({ mode: 'open' });
    this.build();
  }

  mount(parent: Element = document.body): void {
    parent.append(this.host);
  }

  destroy(): void {
    this.host.remove();
  }

  private getFilters(): SearchFilters {
    const countryEl = this.shadow.querySelector('#co-filter-country') as HTMLSelectElement | null;
    const statusEl = this.shadow.querySelector('#co-filter-status') as HTMLSelectElement | null;
    const platformEl = this.shadow.querySelector('#co-filter-platform') as HTMLSelectElement | null;
    const mediaEl = this.shadow.querySelector('#co-filter-media') as HTMLSelectElement | null;
    return {
      country: countryEl?.value ?? '',
      status: statusEl?.value ?? '',
      platform: platformEl?.value ?? '',
      mediaType: mediaEl?.value ?? '',
    };
  }

  private executeSearch(): void {
    const keyword = this.keywordInput.value.trim();
    const domain = this.domainInput.value.trim();
    const filters = this.getFilters();

    if (!keyword && !domain) return;

    const mode = this.activeMode;
    const url = buildSearchUrl(mode, keyword, domain, filters);

    const lookup = keyword ? lookupKeyword(keyword) : null;
    const nicheName = lookup?.niche ?? '';
    const subnicheName = lookup?.subniche ?? '';

    const entry: SearchHistoryEntry = {
      id: generateId(),
      mode,
      keyword,
      domain,
      niche: nicheName,
      subniche: subnicheName,
      filters,
      timestamp: Date.now(),
      url,
    };

    this.history.unshift(entry);
    if (this.history.length > 100) this.history = this.history.slice(0, 100);
    writeStored(HISTORY_KEY, this.history);

    this.options.saveHistory?.(entry);
    this.options.onSearch(url, { keyword, niche: nicheName, subniche: subnicheName });
    this.renderHistory();
  }

  private addFavoriteKeyword(keyword: string): void {
    if (!keyword || this.favorites.keywords.includes(keyword)) return;
    this.favorites.keywords.push(keyword);
    writeStored(FAVORITES_KEY, this.favorites);
    this.renderFavorites();
  }

  private addFavoriteDomain(domain: string): void {
    if (!domain || this.favorites.domains.includes(domain)) return;
    this.favorites.domains.push(domain);
    writeStored(FAVORITES_KEY, this.favorites);
    this.renderFavorites();
  }

  private removeFavorite(type: 'keywords' | 'domains' | 'searches', value: string): void {
    this.favorites[type] = this.favorites[type].filter((v) => v !== value);
    writeStored(FAVORITES_KEY, this.favorites);
    this.renderFavorites();
  }

  private renderHistory(): void {
    if (!this.historyList) return;
    this.historyList.replaceChildren();
    if (this.history.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'co-empty-msg';
      empty.textContent = 'Nenhuma pesquisa recente.';
      this.historyList.append(empty);
      return;
    }
    for (const entry of this.history.slice(0, 20)) {
      const item = document.createElement('div');
      item.className = 'co-history-item';
      const label = document.createElement('span');
      label.className = 'co-history-label';
      const modeIcon = entry.mode === 'keyword' ? '🔑' : entry.mode === 'domain' ? '🌐' : '🔑+🌐';
      label.textContent = `${modeIcon} ${entry.keyword || entry.domain}`;
      if (entry.niche) {
        const nicheTag = document.createElement('span');
        nicheTag.className = 'co-history-niche';
        nicheTag.textContent = entry.niche;
        label.append(nicheTag);
      }
      const time = document.createElement('span');
      time.className = 'co-history-time';
      time.textContent = new Date(entry.timestamp).toLocaleDateString('pt-BR');
      const openBtn = document.createElement('button');
      openBtn.className = 'co-btn-sm';
      openBtn.textContent = 'Abrir';
      openBtn.addEventListener('click', () => {
        this.keywordInput.value = entry.keyword;
        this.domainInput.value = entry.domain;
        this.options.onSearch(entry.url, { keyword: entry.keyword, niche: entry.niche, subniche: entry.subniche });
      });
      item.append(label, time, openBtn);
      this.historyList.append(item);
    }
  }

  private renderFavorites(): void {
    if (!this.favoritesList) return;
    this.favoritesList.replaceChildren();

    const sections = [
      { title: 'Palavras-chave', items: this.favorites.keywords, type: 'keywords' as const },
      { title: 'Domínios', items: this.favorites.domains, type: 'domains' as const },
    ];

    for (const section of sections) {
      if (section.items.length === 0) continue;
      const header = document.createElement('div');
      header.className = 'co-section-title';
      header.textContent = section.title;
      this.favoritesList.append(header);
      for (const item of section.items) {
        const row = document.createElement('div');
        row.className = 'co-fav-item';
        const text = document.createElement('span');
        text.textContent = item;
        text.className = 'co-fav-text';
        text.addEventListener('click', () => {
          if (section.type === 'keywords') {
            this.keywordInput.value = item;
            this.setMode('keyword');
          } else {
            this.domainInput.value = item;
            this.setMode('domain');
          }
        });
        const removeBtn = document.createElement('button');
        removeBtn.className = 'co-btn-sm co-btn-danger';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', () => this.removeFavorite(section.type, item));
        row.append(text, removeBtn);
        this.favoritesList.append(row);
      }
    }

    if (this.favorites.keywords.length === 0 && this.favorites.domains.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'co-empty-msg';
      empty.textContent = 'Nenhum favorito ainda.';
      this.favoritesList.append(empty);
    }
  }

  private renderNicheLibrary(): void {
    if (!this.nicheLibrary) return;
    this.nicheLibrary.replaceChildren();

    for (const niche of NICHE_LIBRARY) {
      const nicheCard = document.createElement('div');
      nicheCard.className = 'co-niche-card';

      const nicheHeader = document.createElement('div');
      nicheHeader.className = 'co-niche-header';
      const nicheTitle = document.createElement('span');
      nicheTitle.className = 'co-niche-title';
      nicheTitle.textContent = niche.name;
      const nicheCount = document.createElement('span');
      nicheCount.className = 'co-niche-count';
      let totalKw = 0;
      for (const sub of niche.subniches) totalKw += sub.keywords.length;
      nicheCount.textContent = `${totalKw} palavras`;
      nicheHeader.append(nicheTitle, nicheCount);

      const subsList = document.createElement('div');
      subsList.className = 'co-subs-list';
      subsList.style.display = 'none';

      nicheHeader.addEventListener('click', () => {
        const visible = subsList.style.display !== 'none';
        subsList.style.display = visible ? 'none' : 'flex';
        nicheHeader.classList.toggle('co-niche-expanded', !visible);
      });

      for (const sub of niche.subniches) {
        const subHeader = document.createElement('div');
        subHeader.className = 'co-sub-header';
        const subName = document.createElement('span');
        subName.className = 'co-sub-name';
        subName.textContent = sub.name;
        const subCount = document.createElement('span');
        subCount.className = 'co-sub-count';
        subCount.textContent = `${sub.keywords.length}`;
        subHeader.append(subName, subCount);

        const kwList = document.createElement('div');
        kwList.className = 'co-kw-list';
        kwList.style.display = 'none';

        subHeader.addEventListener('click', (e) => {
          e.stopPropagation();
          const visible = kwList.style.display !== 'none';
          kwList.style.display = visible ? 'none' : 'flex';
        });

        for (const kw of sub.keywords) {
          const kwItem = document.createElement('button');
          kwItem.className = 'co-kw-item';
          kwItem.textContent = kw.keyword;
          kwItem.addEventListener('click', () => {
            this.keywordInput.value = kw.keyword;
            this.setMode('keyword');
            this.switchTab('search');
          });
          const favBtn = document.createElement('button');
          favBtn.className = 'co-kw-fav';
          favBtn.textContent = '☆';
          favBtn.title = 'Favoritar';
          favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addFavoriteKeyword(kw.keyword);
          });
          const kwRow = document.createElement('div');
          kwRow.className = 'co-kw-row';
          kwRow.append(kwItem, favBtn);
          kwList.append(kwRow);
        }

        subsList.append(subHeader, kwList);
      }

      // Purchase intent section
      const intentHeader = document.createElement('div');
      intentHeader.className = 'co-sub-header co-intent-header';
      const intentName = document.createElement('span');
      intentName.className = 'co-sub-name';
      intentName.textContent = PURCHASE_INTENT_KEYWORDS.name;
      const intentCount = document.createElement('span');
      intentCount.className = 'co-sub-count';
      intentCount.textContent = `${PURCHASE_INTENT_KEYWORDS.keywords.length}`;
      intentHeader.append(intentName, intentCount);

      const intentList = document.createElement('div');
      intentList.className = 'co-kw-list';
      intentList.style.display = 'none';

      intentHeader.addEventListener('click', (e) => {
        e.stopPropagation();
        const visible = intentList.style.display !== 'none';
        intentList.style.display = visible ? 'none' : 'flex';
      });

      for (const intent of PURCHASE_INTENT_KEYWORDS.keywords) {
        const kwItem = document.createElement('button');
        kwItem.className = 'co-kw-item';
        kwItem.textContent = intent.keyword;
        kwItem.addEventListener('click', () => {
          this.keywordInput.value = `${this.keywordInput.value} ${intent.keyword}`.trim();
          this.switchTab('search');
        });
        intentList.append(kwItem);
      }

      nicheCard.append(nicheHeader, subsList, intentHeader, intentList);
      this.nicheLibrary.append(nicheCard);
    }
  }

  private setMode(mode: SearchMode): void {
    this.activeMode = mode;
    if (this.modeIndicator) {
      this.modeIndicator.textContent = mode === 'keyword' ? '🔑 Palavra-chave' : mode === 'domain' ? '🌐 Domínio' : '🔑+🌐 Combinado';
    }
    if (this.keywordInput) {
      this.keywordInput.disabled = mode === 'domain';
      this.keywordInput.placeholder = mode === 'domain' ? 'Modo domínio ativo' : 'Ex: crochê, emagrecimento, renda extra...';
    }
    if (this.domainInput) {
      this.domainInput.disabled = mode === 'keyword';
      this.domainInput.placeholder = mode === 'keyword' ? 'Modo palavra-chave ativo' : 'Ex: hotmart.com, kiwify.com...';
    }
  }

  private switchTab(tab: 'search' | 'library' | 'history' | 'favorites'): void {
    this.activeTab = tab;
    const tabs = this.shadow.querySelectorAll('.co-tab-btn');
    tabs.forEach((t) => t.classList.remove('co-tab-active'));
    const panels = this.shadow.querySelectorAll('.co-panel');
    panels.forEach((p) => ((p as HTMLElement).style.display = 'none'));

    const tabIdx = tab === 'search' ? 0 : tab === 'library' ? 1 : tab === 'history' ? 2 : 3;
    tabs[tabIdx]?.classList.add('co-tab-active');

    const panelMap: Record<string, HTMLElement> = {
      search: this.shadow.querySelector('#co-panel-search') as HTMLElement,
      library: this.shadow.querySelector('#co-panel-library') as HTMLElement,
      history: this.shadow.querySelector('#co-panel-history') as HTMLElement,
      favorites: this.shadow.querySelector('#co-panel-favorites') as HTMLElement,
    };
    if (panelMap[tab]) panelMap[tab].style.display = 'flex';

    if (tab === 'history') this.renderHistory();
    if (tab === 'favorites') this.renderFavorites();
    if (tab === 'library') this.renderNicheLibrary();
  }

  private build(): void {
    const style = document.createElement('style');
    style.textContent = `
      :host { all: initial; }
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      .co-search-shell {
        display: flex; flex-direction: column; gap: 8px;
        background: #17171c; color: #f4f4f5;
        border: 1px solid #ea580c; border-radius: 10px;
        padding: 10px; font-family: system-ui, sans-serif; font-size: 12px;
        max-height: calc(100vh - 60px); overflow-y: auto;
        width: 320px;
      }
      .co-tabs { display: flex; gap: 4px; }
      .co-tab-btn {
        flex: 1; padding: 6px 4px; border: 1px solid #3f3f46;
        background: #27272a; color: #a1a1aa; border-radius: 6px;
        font: inherit; font-size: 10px; cursor: pointer; text-align: center;
      }
      .co-tab-btn:hover { background: #3f3f46; color: #e4e4e7; }
      .co-tab-active { background: #ea580c; color: #fff; border-color: #ea580c; }
      .co-panel { display: none; flex-direction: column; gap: 8px; }
      .co-field { display: flex; flex-direction: column; gap: 3px; }
      .co-label { font-size: 10px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.05em; }
      .co-input {
        background: #27272a; border: 1px solid #3f3f46; border-radius: 6px;
        color: #f4f4f5; padding: 7px 8px; font: inherit; font-size: 12px;
      }
      .co-input:focus { outline: none; border-color: #ea580c; }
      .co-input:disabled { opacity: 0.4; cursor: not-allowed; }
      .co-mode-btns { display: flex; gap: 4px; }
      .co-mode-btn {
        flex: 1; padding: 6px; border: 1px solid #3f3f46;
        background: #27272a; color: #a1a1aa; border-radius: 6px;
        font: inherit; font-size: 10px; cursor: pointer;
      }
      .co-mode-btn:hover { background: #3f3f46; color: #e4e4e7; }
      .co-mode-active { background: #ea580c; color: #fff; border-color: #ea580c; }
      .co-search-btn {
        padding: 8px; border: 1px solid #ea580c;
        background: #ea580c; color: #fff; border-radius: 6px;
        font: inherit; font-size: 12px; font-weight: 600; cursor: pointer;
      }
      .co-search-btn:hover { background: #c2410c; }
      .co-filters { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
      .co-filter-select {
        background: #27272a; border: 1px solid #3f3f46; border-radius: 4px;
        color: #f4f4f5; padding: 4px 6px; font: inherit; font-size: 10px;
      }
      .co-section-title { font-size: 10px; font-weight: 700; color: #71717a; letter-spacing: 0.06em; margin-top: 4px; }
      .co-empty-msg { color: #52525b; font-size: 11px; padding: 8px 0; }
      .co-niche-card { border: 1px solid #27272a; border-radius: 6px; overflow: hidden; }
      .co-niche-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 6px 8px; background: #1e1e23; cursor: pointer;
      }
      .co-niche-header:hover { background: #27272a; }
      .co-niche-title { font-weight: 600; color: #e4e4e7; font-size: 11px; }
      .co-niche-count { color: #71717a; font-size: 10px; }
      .co-niche-expanded .co-niche-title { color: #ea580c; }
      .co-subs-list { display: none; flex-direction: column; }
      .co-sub-header {
        display: flex; justify-content: space-between; align-items: center;
        padding: 5px 8px 5px 16px; cursor: pointer; border-top: 1px solid #1e1e23;
      }
      .co-sub-header:hover { background: #1e1e23; }
      .co-sub-name { color: #d4d4d8; font-size: 11px; }
      .co-sub-count { color: #52525b; font-size: 10px; }
      .co-intent-header { background: #1c1917; }
      .co-intent-header .co-sub-name { color: #fb923c; }
      .co-kw-list { display: none; flex-direction: column; padding: 2px 0; }
      .co-kw-row { display: flex; align-items: center; gap: 4px; padding: 1px 16px 1px 28px; }
      .co-kw-item {
        flex: 1; padding: 3px 6px; border: none;
        background: transparent; color: #a1a1aa; font: inherit; font-size: 10px;
        text-align: left; cursor: pointer; border-radius: 3px;
      }
      .co-kw-item:hover { background: #27272a; color: #f4f4f5; }
      .co-kw-fav {
        background: none; border: none; color: #52525b; cursor: pointer;
        font-size: 12px; padding: 2px;
      }
      .co-kw-fav:hover { color: #fbbf24; }
      .co-history-item {
        display: flex; align-items: center; gap: 6px;
        padding: 5px 6px; border: 1px solid #27272a; border-radius: 5px;
      }
      .co-history-label { flex: 1; color: #d4d4d8; font-size: 11px; display: flex; align-items: center; gap: 4px; }
      .co-history-niche { background: #27272a; color: #a1a1aa; padding: 1px 5px; border-radius: 3px; font-size: 9px; }
      .co-history-time { color: #52525b; font-size: 9px; }
      .co-btn-sm {
        padding: 3px 6px; border: 1px solid #3f3f46; border-radius: 4px;
        background: #27272a; color: #d4d4d8; font: inherit; font-size: 9px; cursor: pointer;
      }
      .co-btn-sm:hover { background: #3f3f46; }
      .co-btn-danger:hover { background: #7f1d1d; border-color: #b91c1c; color: #fecaca; }
      .co-fav-item {
        display: flex; align-items: center; gap: 6px;
        padding: 4px 6px; border: 1px solid #27272a; border-radius: 4px;
      }
      .co-fav-text { flex: 1; color: #d4d4d8; font-size: 11px; cursor: pointer; }
      .co-fav-text:hover { color: #ea580c; }
    `;

    const shell = document.createElement('div');
    shell.className = 'co-search-shell';

    // Tabs
    const tabs = document.createElement('div');
    tabs.className = 'co-tabs';
    const tabLabels: Array<{ key: 'search' | 'library' | 'history' | 'favorites'; label: string }> = [
      { key: 'search', label: 'Pesquisa' },
      { key: 'library', label: 'Biblioteca' },
      { key: 'history', label: 'Histórico' },
      { key: 'favorites', label: 'Favoritos' },
    ];
    for (const t of tabLabels) {
      const btn = document.createElement('button');
      btn.className = 'co-tab-btn' + (t.key === this.activeTab ? ' co-tab-active' : '');
      btn.textContent = t.label;
      btn.addEventListener('click', () => this.switchTab(t.key));
      tabs.append(btn);
    }
    shell.append(tabs);

    // Search panel
    const searchPanel = document.createElement('div');
    searchPanel.id = 'co-panel-search';
    searchPanel.className = 'co-panel';
    searchPanel.style.display = 'flex';

    // Mode buttons
    const modeBtns = document.createElement('div');
    modeBtns.className = 'co-mode-btns';
    const modes: Array<{ key: SearchMode; label: string }> = [
      { key: 'keyword', label: '🔑 Palavra-chave' },
      { key: 'domain', label: '🌐 Domínio' },
      { key: 'combined', label: '🔑+🌐 Combinado' },
    ];
    for (const m of modes) {
      const btn = document.createElement('button');
      btn.className = 'co-mode-btn' + (m.key === this.activeMode ? ' co-mode-active' : '');
      btn.textContent = m.label;
      btn.addEventListener('click', () => {
        this.setMode(m.key);
        modeBtns.querySelectorAll('.co-mode-btn').forEach((b) => b.classList.remove('co-mode-active'));
        btn.classList.add('co-mode-active');
      });
      modeBtns.append(btn);
    }
    searchPanel.append(modeBtns);

    // Keyword input
    const kwField = document.createElement('div');
    kwField.className = 'co-field';
    const kwLabel = document.createElement('label');
    kwLabel.className = 'co-label';
    kwLabel.textContent = 'Palavra-chave';
    this.keywordInput = document.createElement('input');
    this.keywordInput.className = 'co-input';
    this.keywordInput.type = 'text';
    this.keywordInput.placeholder = 'Ex: crochê, emagrecimento, renda extra...';
    this.keywordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.executeSearch(); });
    kwField.append(kwLabel, this.keywordInput);
    searchPanel.append(kwField);

    // Domain input
    const domField = document.createElement('div');
    domField.className = 'co-field';
    const domLabel = document.createElement('label');
    domLabel.className = 'co-label';
    domLabel.textContent = 'Domínio';
    this.domainInput = document.createElement('input');
    this.domainInput.className = 'co-input';
    this.domainInput.type = 'text';
    this.domainInput.placeholder = 'Ex: hotmart.com, kiwify.com...';
    this.domainInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this.executeSearch(); });
    domField.append(domLabel, this.domainInput);
    searchPanel.append(domField);

    // Filters
    this.filterSelects = document.createElement('div');
    this.filterSelects.className = 'co-filters';

    const countrySelect = document.createElement('select');
    countrySelect.id = 'co-filter-country';
    countrySelect.className = 'co-filter-select';
    for (const [code, name] of Object.entries(COUNTRIES)) {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = name;
      countrySelect.append(opt);
    }
    countrySelect.value = 'BR';

    const statusSelect = document.createElement('select');
    statusSelect.id = 'co-filter-status';
    statusSelect.className = 'co-filter-select';
    for (const [val, label] of Object.entries(STATUS_OPTIONS)) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      statusSelect.append(opt);
    }

    const platformSelect = document.createElement('select');
    platformSelect.id = 'co-filter-platform';
    platformSelect.className = 'co-filter-select';
    for (const [val, label] of Object.entries(PLATFORM_OPTIONS)) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      platformSelect.append(opt);
    }

    const mediaSelect = document.createElement('select');
    mediaSelect.id = 'co-filter-media';
    mediaSelect.className = 'co-filter-select';
    for (const [val, label] of Object.entries(MEDIA_OPTIONS)) {
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = label;
      mediaSelect.append(opt);
    }

    this.filterSelects.append(countrySelect, statusSelect, platformSelect, mediaSelect);
    searchPanel.append(this.filterSelects);

    // Search button
    const searchBtn = document.createElement('button');
    searchBtn.className = 'co-search-btn';
    searchBtn.textContent = '🔎 Pesquisar na Meta Ads Library';
    searchBtn.addEventListener('click', () => this.executeSearch());
    searchPanel.append(searchBtn);

    // Quick favorite buttons
    const quickFav = document.createElement('div');
    quickFav.style.cssText = 'display:flex;gap:4px;';
    const favKwBtn = document.createElement('button');
    favKwBtn.className = 'co-btn-sm';
    favKwBtn.textContent = '☆ Favoritar palavra';
    favKwBtn.addEventListener('click', () => this.addFavoriteKeyword(this.keywordInput.value.trim()));
    const favDomBtn = document.createElement('button');
    favDomBtn.className = 'co-btn-sm';
    favDomBtn.textContent = '☆ Favoritar domínio';
    favDomBtn.addEventListener('click', () => this.addFavoriteDomain(this.domainInput.value.trim()));
    quickFav.append(favKwBtn, favDomBtn);
    searchPanel.append(quickFav);

    shell.append(searchPanel);

    // Library panel
    const libraryPanel = document.createElement('div');
    libraryPanel.id = 'co-panel-library';
    libraryPanel.className = 'co-panel';
    this.nicheLibrary = document.createElement('div');
    libraryPanel.append(this.nicheLibrary);
    shell.append(libraryPanel);

    // History panel
    const historyPanel = document.createElement('div');
    historyPanel.id = 'co-panel-history';
    historyPanel.className = 'co-panel';
    this.historyList = document.createElement('div');
    historyPanel.append(this.historyList);
    shell.append(historyPanel);

    // Favorites panel
    const favoritesPanel = document.createElement('div');
    favoritesPanel.id = 'co-panel-favorites';
    favoritesPanel.className = 'co-panel';
    this.favoritesList = document.createElement('div');
    favoritesPanel.append(this.favoritesList);
    shell.append(favoritesPanel);

    this.shadow.append(style, shell);
    this.setMode(this.activeMode);
  }
}
