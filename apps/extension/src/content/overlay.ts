// CAÇAOFERTA — Overlay visual sobre os cards da Biblioteca de Anúncios.
// Isolamento total via Shadow DOM: nenhum CSS da extensão vaza para a página
// e o CSS da Meta não afeta o badge.
//
// O badge exibe SOMENTE dados realmente detectados. Na FASE 03 passou a expor
// o domínio e as ações (pesquisar domínio, copiar domínio/URL, abrir domínio e
// abrir anúncio sempre sob ação explícita do usuário e com validação de URL).
// Na FASE 05 ganhou: Copiar ID, tipo de mídia, badges de plataforma, data de
// encerramento, faixa visual dos dias rodando e o botão "Salvar oferta".
// Na FASE 06 o botão executa o fluxo REAL: envia o NormalizedAd ao service
// worker (que fala com o backend), com estados somente após resposta real
// (idle → salvando → salva / já salva / erro honesto).

import type { ParsedAd } from '@caca-oferta/types';
import type { SavedAdDto } from '@caca-oferta/shared';
import type { RuntimeFailure } from '../bridge/messages';
import { copyTextToClipboard } from './clipboard';
import { domainOriginUrl, isSafeHttpUrl } from './domain';
import { isoToBr, mediaVisual, platformLabel, statusMeta } from './format';
import { getLogger } from './logging';
import { formatRunningDays, runningDaysOf, runningDaysTier } from './runningDays';
import { attachToast, type Toast } from './toast';

export interface OverlayOptions {
  /** Acionado pelo botão "🔎 Pesquisar domínio" do card (abre a pesquisa). */
  onSearchDomain?: (domain: string) => void;
  /**
   * Persiste a oferta (FASE 06): o observer fornece este callback com o
   * NormalizedAd do card já capturado (parse único) e ele devolve o resultado
   * da extensão (service worker → API). Sem este callback o botão mostra uma
   * falha honesta e não finge salvar.
   */
  onSave?: () => Promise<RuntimeFailure | { ok: true; data: SavedAdDto }>;
}

export interface OverlayHandle {
  update(ad: ParsedAd): void;
  destroy(): void;
}

const STYLE = `
  :host { all: initial; contain: content; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .co-badge {
    position: absolute;
    top: 44px;
    right: 8px;
    width: 236px;
    background: #15151a;
    color: #f4f4f5;
    border: 1px solid #ea580c;
    border-radius: 8px;
    padding: 8px 9px;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    font-size: 11px;
    line-height: 1.4;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.45);
    user-select: none;
    pointer-events: none;
  }
  .co-head {
    font-weight: 700;
    letter-spacing: 0.06em;
    color: #ea580c;
    font-size: 10px;
    margin-bottom: 4px;
  }
  .co-row { margin: 1px 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #d4d4d8; }
  .co-label { color: #71717a; }
  .co-domain { display: flex; align-items: center; gap: 4px; margin: 3px 0 1px; color: #38bdf8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .co-status { display: flex; align-items: center; gap: 5px; font-weight: 600; margin-bottom: 3px; }
  .co-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
  .co-dot-a { background: #22c55e; }
  .co-dot-i { background: #ef4444; }
  .co-dot-u { background: #a1a1aa; }
  .co-chips { display: flex; flex-wrap: wrap; gap: 3px; margin: 2px 0; }
  .co-chip {
    border: 1px solid #3f3f46; border-radius: 999px;
    padding: 0 6px; font-size: 9px; color: #d4d4d8;
  }
  .co-tier {
    border: 1px solid #3f3f46; border-radius: 999px;
    padding: 0 6px; font-size: 9px; font-weight: 600; white-space: nowrap;
  }
  .co-tier-t1 { color: #a1a1aa; }
  .co-tier-t2 { color: #d4d4d8; }
  .co-tier-t3 { color: #d6a88a; }
  .co-tier-t4 { color: #fb923c; }
  .co-tier-t5 { color: #fb923c; border-color: #7c2d12; }
  .co-tier-t6 { color: #fdba74; border-color: #ea580c; }
  .co-actions { display: flex; flex-direction: column; gap: 3px; margin-top: 6px; }
  .co-btn {
    width: 100%;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid #3f3f46;
    background: #27272a;
    color: #e4e4e7;
    font: inherit;
    font-size: 10px;
    text-align: left;
    cursor: pointer;
    pointer-events: auto;
  }
  .co-btn:hover:not(:disabled) { background: #3f3f46; }
  .co-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .co-save {
    margin-top: 6px;
    width: 100%;
    padding: 5px 8px;
    border-radius: 6px;
    border: 1px solid #ea580c;
    background: #ea580c;
    color: #fff;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    pointer-events: auto;
  }
  .co-save:hover { background: #c2410c; }
  .co-save.co-save-done {
    border-color: #15803d;
    background: #15803d;
  }
  .co-save:hover.co-save-done { background: #15803d; }
  .co-save.co-save-done:disabled { opacity: 1; cursor: default; }
  .co-note {
    margin-top: 6px;
    padding: 5px;
    border-radius: 6px;
    background: #27272a;
    color: #fbbf24;
    font-size: 10px;
  }
  :focus-visible { outline: 2px solid #fb923c; outline-offset: 1px; }
`;

function spanEl(className: string, text: string): HTMLSpanElement {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  return span;
}

function detailRow(label: string, nodes: Array<Node | string> | string): HTMLDivElement {
  const div = document.createElement('div');
  div.className = 'co-row';
  if (label) div.append(spanEl('co-label', `${label}: `));
  if (typeof nodes === 'string') {
    div.append(nodes);
  } else {
    div.append(
      ...nodes.map((node) => (typeof node === 'string' ? document.createTextNode(node) : node)),
    );
  }
  div.title = div.textContent ?? '';
  return div;
}

function button(label: string, className: string, onClick: () => void, disabled = false): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.textContent = label;
  b.disabled = disabled;
  b.title = label.replace(/^[\p{Emoji_Presentation}\s]+/u, '');
  b.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    onClick();
  });
  return b;
}

interface OverlayActions {
  onSearchDomain: () => void;
  onCopyId: () => void;
  onCopyDomain: () => void;
  onCopyUrl: () => void;
  onOpenDomain: () => void;
  onOpenAd: () => void;
  onSave: () => void;
}

/** Estados visuais reais do botão salvar (nunca finge sucesso). */
export type SaveUiState = 'idle' | 'saving' | 'saved' | 'already';

const SAVE_LABELS: Record<Exclude<SaveUiState, 'saving'>, string> = {
  idle: '+ Salvar oferta',
  saved: '✓ Oferta salva',
  already: '✓ Já salva',
};

function saveButton(state: SaveUiState, onSave: () => void): HTMLButtonElement {
  const disabled = state !== 'idle';
  const label = state === 'saving' ? '⏳ Salvando…' : SAVE_LABELS[state];
  const b = button(label, 'co-save', onSave, disabled);
  if (state === 'saved' || state === 'already') b.classList.add('co-save-done');
  return b;
}

function buildBody(ad: ParsedAd, actions: OverlayActions, saveState: SaveUiState): HTMLElement {
  const body = document.createElement('div');

  const head = document.createElement('div');
  head.className = 'co-head';
  head.textContent = 'CAÇAOFERTA';
  body.append(head);

  const statusRow = document.createElement('div');
  statusRow.className = 'co-status';
  const meta = statusMeta(ad.status);
  const dot = document.createElement('span');
  dot.className = `co-dot co-dot-${meta.cls}`;
  statusRow.append(dot);
  statusRow.append(meta.label);
  body.append(statusRow);

  if (ad.pageName) body.append(detailRow('Página', ad.pageName));
  if (ad.pageId) body.append(detailRow('ID', ad.pageId));

  if (ad.deliveryStartDate) {
    body.append(detailRow('📅 Início', isoToBr(ad.deliveryStartDate)));
    const days = runningDaysOf(ad);
    const tier = runningDaysTier(days);
    const nodes: Array<Node | string> = [`⏱ ${formatRunningDays(days)}`];
    if (tier && days !== null) {
      const chip = spanEl(`co-tier co-tier-${tier.key}`, tier.label);
      chip.title = 'Tempo de veiculação do anúncio — não é classificação de oferta.';
      nodes.push(chip);
    }
    body.append(detailRow('Rodando', nodes));
  } else {
    body.append(detailRow('📅 Início', 'Data não identificada'));
  }

  if (ad.deliveryStopDate) {
    body.append(detailRow('📅 Encerrou', isoToBr(ad.deliveryStopDate)));
  }

  const media = mediaVisual(ad.mediaType);
  const platforms = ad.platforms ?? [];
  if (media || platforms.length) {
    const chips = document.createElement('div');
    chips.className = 'co-chips';
    if (media) chips.append(spanEl('co-chip', `${media.icon} ${media.label}`));
    for (const platform of platforms) {
      chips.append(spanEl('co-chip', platformLabel(platform)));
    }
    body.append(chips);
  }

  // Seção 19: o domínio é exibido sempre — null nunca é escondido em silêncio.
  const domainDiv = document.createElement('div');
  domainDiv.className = 'co-domain';
  domainDiv.textContent = ad.destinationDomain
    ? `🌐 ${ad.destinationDomain}`
    : '🌐 Domínio não identificado';
  domainDiv.title = domainDiv.textContent ?? '';
  body.append(domainDiv);

  const hasDomain = Boolean(ad.destinationDomain);
  const hasUrl = Boolean(ad.destinationUrl);
  const hasSnapshot = Boolean(ad.adSnapshotUrl);
  const hasId = Boolean(ad.adLibraryId);
  if (hasDomain || hasUrl || hasSnapshot || hasId) {
    const actionsBox = document.createElement('div');
    actionsBox.className = 'co-actions';
    if (hasId) {
      actionsBox.append(button('📋 Copiar ID', 'co-btn co-btn-copy-id', actions.onCopyId));
    }
    if (hasDomain) {
      actionsBox.append(button('🔎 Pesquisar domínio', 'co-btn co-btn-search', actions.onSearchDomain));
      actionsBox.append(button('📋 Copiar domínio', 'co-btn co-btn-copy-domain', actions.onCopyDomain));
      actionsBox.append(button('🌐 Abrir domínio', 'co-btn co-btn-open-domain', actions.onOpenDomain));
    }
    if (hasUrl) {
      actionsBox.append(button('📋 Copiar URL', 'co-btn co-btn-copy-url', actions.onCopyUrl));
    }
    if (hasSnapshot) {
      actionsBox.append(button('🌐 Abrir anúncio', 'co-btn co-btn-open-ad', actions.onOpenAd));
    }
    body.append(actionsBox);
  }

  body.append(saveButton(saveState, actions.onSave));
  return body;
}

export function attachOverlay(card: Element, ad: ParsedAd, options: OverlayOptions = {}): OverlayHandle {
  const logger = getLogger('overlay');
  const cardEl = card as HTMLElement;
  const host = document.createElement('div');
  host.setAttribute('data-caca-oferta-badge', '');
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLE;
  shadow.append(style);

  let toast: Toast | null = null;
  let bodyEl: HTMLElement | null = null;
  let saveState: SaveUiState = 'idle';
  let saving = false;

  const ensureToast = (): Toast => {
    if (!toast) toast = attachToast(shadow);
    return toast;
  };

  const performSave = (): void => {
    if (saving) return;
    if (!options.onSave) {
      saveState = 'idle';
      ensureToast().show('Salvar não disponível neste ambiente.');
      return;
    }
    if (!ad.adLibraryId) {
      saveState = 'idle';
      ensureToast().show('Oferta sem ID — impossível salvar.');
      return;
    }

    saving = true;
    saveState = 'saving';
    render();

    void options
      .onSave()
      .then((result) => {
        if (result.ok) {
          saveState = 'saved';
          ensureToast().show('Oferta salva!');
        } else if (result.code === 'ALREADY_SAVED') {
          saveState = 'already';
          ensureToast().show('Esta oferta já está salva.');
        } else {
          saveState = 'idle';
          ensureToast().show(result.message || 'Não foi possível salvar a oferta.');
        }
      })
      .catch(() => {
        saveState = 'idle';
        ensureToast().show('Não foi possível salvar a oferta.');
      })
      .finally(() => {
        saving = false;
        render();
      });
  };

  const actions: OverlayActions = {
    onSearchDomain: () => {
      if (ad.destinationDomain) options.onSearchDomain?.(ad.destinationDomain);
    },
    onCopyId: () => {
      if (!ad.adLibraryId) return;
      void copyTextToClipboard(ad.adLibraryId).then((ok) => {
        ensureToast().show(ok ? 'ID copiado.' : 'Não foi possível copiar o ID.');
      });
    },
    onCopyDomain: () => {
      if (!ad.destinationDomain) return;
      void copyTextToClipboard(ad.destinationDomain).then((ok) => {
        ensureToast().show(ok ? 'Domínio copiado.' : 'Não foi possível copiar o domínio.');
      });
    },
    onCopyUrl: () => {
      if (!ad.destinationUrl) return;
      void copyTextToClipboard(ad.destinationUrl).then((ok) => {
        ensureToast().show(ok ? 'URL copiada.' : 'Não foi possível copiar a URL.');
      });
    },
    onOpenDomain: () => {
      if (!ad.destinationDomain) return;
      const target = domainOriginUrl(ad.destinationDomain);
      if (!target) {
        ensureToast().show('Domínio inválido.');
        return;
      }
      window.open(target, '_blank', 'noopener');
    },
    onOpenAd: () => {
      if (ad.adSnapshotUrl && isSafeHttpUrl(ad.adSnapshotUrl)) {
        window.open(ad.adSnapshotUrl, '_blank', 'noopener');
      }
    },
    onSave: performSave,
  };

  const render = (): void => {
    if (bodyEl) bodyEl.remove();
    bodyEl = buildBody(ad, actions, saveState);
    shadow.append(bodyEl);
  };
  render();

  // Garante um containing block para o badge sem quebrar layout da Meta.
  const previousPosition = cardEl.style.position;
  if (getComputedStyle(cardEl).position === 'static') {
    cardEl.style.position = 'relative';
  }

  card.append(host);
  logger.debug('Badge anexado ao card', { status: ad.status, pageId: ad.pageId });

  return {
    update(next: ParsedAd): void {
      Object.assign(ad, next);
      render();
    },
    destroy(): void {
      toast?.destroy();
      toast = null;
      if (cardEl.style.position !== previousPosition) cardEl.style.position = previousPosition;
      host.remove();
      logger.debug('Badge removido do card');
    },
  };
}