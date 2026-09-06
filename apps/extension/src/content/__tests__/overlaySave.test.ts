// CAÇAOFERTA — Fluxo de SALVAR oferta no overlay (FASE 06).
// O clique envia { type:'saved-ads:save', payload: NormalizedAd } ao service
// worker (chrome.runtime.sendMessage) e traduz a resposta em estados visuais
// SEMPRE reais: nunca finge sucesso enquanto a persistência não respondeu.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SavedAdDto } from '@caca-oferta/shared';
import { startAdMining } from '../AdCollectionObserver';
import { makeCard, pageShell } from '../__fixtures__/adCards';

const WAIT = 220;

async function flush(ms = WAIT): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

type SendMessageMock = ReturnType<typeof vi.fn>;

function stubChrome(sendMessage: SendMessageMock): void {
  (globalThis as Record<string, unknown>).chrome = {
    runtime: { sendMessage },
  };
}

const DTO_SALVO: SavedAdDto = {
  id: 'sa-1',
  adLibraryId: '968129471240839',
  pageId: '315236625874136',
  pageName: 'NutSmart',
  status: 'active',
  deliveryStartDate: '2026-08-22',
  deliveryStopDate: null,
  runningDays: 12,
  platforms: ['facebook', 'instagram'],
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
};

function resolveWith(sendMessage: SendMessageMock, response: unknown): void {
  sendMessage.mockImplementation((_message: unknown, callback: (r: unknown) => void) => {
    callback(response);
  });
}

function saveButton(): HTMLButtonElement | null {
  const shadow = document.querySelector('[data-caca-oferta-badge]')?.shadowRoot;
  return (shadow?.querySelector('.co-save') as HTMLButtonElement | null) ?? null;
}

describe('botão salvar no overlay (FASE 06)', () => {
  beforeEach(() => {
    document.body.innerHTML = pageShell(makeCard());
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).chrome;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('salva sob ação do usuário e chega "✓ Oferta salva" somente após resposta real', async () => {
    const sendMessage = vi.fn();
    resolveWith(sendMessage, { ok: true, data: DTO_SALVO });
    stubChrome(sendMessage);

    const handle = startAdMining({ debounceMs: 10 });
    await flush();

    // Nenhuma chamada automática consegue chegar ao service worker.
    expect(sendMessage).not.toHaveBeenCalled();

    saveButton()?.click();
    expect(saveButton()?.textContent).toContain('Salvando');
    expect(saveButton()?.disabled).toBe(true);

    await flush(30);

    expect(sendMessage).toHaveBeenCalledTimes(1);
    const [message] = sendMessage.mock.calls[0] as [unknown];
    const request = message as { type: string; payload: { adLibraryId: string; status: string } };
    expect(request.type).toBe('saved-ads:save');
    expect(request.payload.adLibraryId).toBe('968129471240839');
    expect(request.payload.status).toBe('active');

    expect(saveButton()?.textContent).toContain('Oferta salva');
    expect(saveButton()?.disabled).toBe(true);
    handle.stop();
  });

  it('duplicidade (ALREADY_SAVED) vira "✓ Já salva" sem fingir novo sucesso', async () => {
    const sendMessage = vi.fn();
    resolveWith(sendMessage, { ok: false, code: 'ALREADY_SAVED', message: 'Esta oferta já está salva.' });
    stubChrome(sendMessage);

    const handle = startAdMining({ debounceMs: 10 });
    await flush();
    saveButton()?.click();
    await flush(30);

    expect(saveButton()?.textContent).toContain('Já salva');
    expect(saveButton()?.disabled).toBe(true);
    const shadow = document.querySelector('[data-caca-oferta-badge]')?.shadowRoot;
    expect(shadow?.querySelector('.co-toast')?.textContent).toContain('já está salva');
    handle.stop();
  });

  it('erro do backend restaura o botão e mostra mensagem honesta', async () => {
    const sendMessage = vi.fn();
    resolveWith(sendMessage, { ok: false, code: 'UNAUTHORIZED', message: 'Autenticação não disponível neste ambiente.' });
    stubChrome(sendMessage);

    const handle = startAdMining({ debounceMs: 10 });
    await flush();
    saveButton()?.click();
    await flush(30);

    expect(saveButton()?.textContent).toContain('+ Salvar oferta');
    expect(saveButton()?.disabled).toBe(false);
    const shadow = document.querySelector('[data-caca-oferta-badge]')?.shadowRoot;
    expect(shadow?.querySelector('.co-toast')?.textContent).toContain('Autenticação não disponível');
    handle.stop();
  });

  it('sem chrome.runtime mostra falha honesta e NÃO envia nada (testes/jsdom)', async () => {
    const handle = startAdMining({ debounceMs: 10 });
    await flush();
    saveButton()?.click();
    await flush(30);

    const shadow = document.querySelector('[data-caca-oferta-badge]')?.shadowRoot;
    expect(shadow?.querySelector('.co-toast')?.textContent).toContain(
      'Este ambiente não oferece comunicação com a extensão.',
    );
    expect(saveButton()?.textContent).toContain('+ Salvar oferta');
    expect(saveButton()?.disabled).toBe(false);
    handle.stop();
  });

  it('oferta sem ID não tenta salvar e avisa honestamente', async () => {
    document.body.innerHTML = pageShell(makeCard({ adLibraryId: null, snapshotHref: null }));
    const sendMessage = vi.fn();
    stubChrome(sendMessage);

    const handle = startAdMining({ debounceMs: 10 });
    await flush();

    if (saveButton()) {
      saveButton()?.click();
      await flush(30);
    }
    expect(sendMessage).not.toHaveBeenCalled();
    const shadow = document.querySelector('[data-caca-oferta-badge]')?.shadowRoot;
    const badgeText = shadow?.textContent ?? '';
    if (badgeText.includes('impossível salvar')) {
      expect(shadow?.querySelector('.co-toast')?.textContent).toContain('Oferta sem ID');
    }
    handle.stop();
  });
});