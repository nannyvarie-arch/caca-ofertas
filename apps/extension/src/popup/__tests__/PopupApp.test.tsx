// CAÇAOFERTA — Popup: lista de ofertas salvas (FASE 06).
// Renderiza React em jsdom com chrome.runtime mockado e verifica o fluxo real
// (carrega → lista → exclui → recarrega). Quando chrome não existe,
// mostra erro honesto sem tentar retry.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import PopupApp from '../PopupApp';

type SendMessageMock = ReturnType<typeof vi.fn>;
type RootNode = Root;

function stubChrome(sendMessage: SendMessageMock): void {
  (globalThis as Record<string, unknown>).chrome = {
    runtime: { sendMessage },
  };
}

function resolveList(sendMessage: SendMessageMock, items: unknown[], total: number): void {
  sendMessage.mockImplementation(
    (message: { type: string }, callback: (response: unknown) => void) => {
      if (message.type === 'saved-ads:list') {
        callback({ ok: true, data: { items, page: 1, pageSize: 50, total } });
        return;
      }
      callback({ ok: false, code: 'MESSAGE_FAILED', message: 'incomum' });
    },
  );
}

const OFERTA_SALVA = {
  id: 'sa-1',
  adLibraryId: '968129471240839',
  pageId: '315236625874136',
  pageName: 'NutSmart',
  status: 'active' as const,
  deliveryStartDate: '2026-08-22',
  deliveryStopDate: null,
  runningDays: 12,
  platforms: ['facebook', 'instagram'] as const,
  mediaType: 'image' as const,
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

describe('PopupApp — ofertas salvas (FASE 06)', () => {
  let container: HTMLElement;
  let root: RootNode;

  beforeEach(() => {
    container = document.createElement('div');
    container.id = 'root';
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    delete (globalThis as Record<string, unknown>).chrome;
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  async function render(): Promise<void> {
    await act(async () => {
      root.render(<PopupApp />);
    });
  }

  it('carrega e lista as ofertas salvas vindo do service worker', async () => {
    const sendMessage = vi.fn();
    resolveList(sendMessage, [OFERTA_SALVA], 1);
    stubChrome(sendMessage);

    await render();

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'saved-ads:list' }),
      expect.any(Function),
    );
    expect(container.textContent).toContain('NutSmart');
    expect(container.textContent).toContain('ID 968129471240839');
    expect(container.textContent).toContain('Facebook');
    expect(container.querySelector('a[href]')?.getAttribute('href')).toBe(OFERTA_SALVA.adSnapshotUrl);
  });

  it('estado vazio mostra mensagem honesta', async () => {
    const sendMessage = vi.fn();
    resolveList(sendMessage, [], 0);
    stubChrome(sendMessage);

    await render();

    expect(container.textContent).toContain('Nenhuma oferta salva ainda.');
  });

  it('exclui uma oferta usando o service worker e recarrega a lista', async () => {
    const sendMessage = vi.fn();
    sendMessage
      .mockImplementationOnce((message: { type: string }, callback: (r: unknown) => void) => {
        if (message.type === 'saved-ads:list') callback({ ok: true, data: { items: [OFERTA_SALVA], page: 1, pageSize: 50, total: 1 } });
      })
      .mockImplementationOnce((message: { type: string }, callback: (r: unknown) => void) => {
        if (message.type === 'saved-ads:delete') callback({ ok: true, data: { id: 'sa-1', deleted: true } });
      })
      .mockImplementation((message: { type: string }, callback: (r: unknown) => void) => {
        if (message.type === 'saved-ads:list') callback({ ok: true, data: { items: [], page: 1, pageSize: 50, total: 0 } });
      });
    stubChrome(sendMessage);

    await render();
    expect(container.textContent).toContain('NutSmart');

    const deleteBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Excluir'),
    ) as HTMLButtonElement;
    await act(async () => {
      deleteBtn.click();
    });

    expect(sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'saved-ads:delete', id: 'sa-1' }),
      expect.any(Function),
    );
    expect(container.textContent).toContain('Nenhuma oferta salva ainda.');
  });

  it('sem chrome.runtime mostra erro honesto e NÃO oferece retry', async () => {
    await render();
    expect(container.textContent).toContain('Este ambiente não oferece comunicação');
    expect(container.textContent).not.toContain('Tentar novamente');
  });
});