// CAÇAOFERTA — Testes do service worker da extensão (FASE 06).
//
// O router central processa mensagens do content/popup e fala com a API via
// fetch. Aqui o fetch global é stubado e o chrome.runtime é mockado para
// exercitar dispatch + cache de IDs + resposta assíncrona verdadeira.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NormalizedAd } from '@caca-oferta/types';

type Listener = (message: unknown, sender: unknown, sendResponse: (r: unknown) => void) => boolean | void;

const listeners: Listener[] = [];

function stubChromeRuntime(): void {
  (globalThis as Record<string, unknown>).chrome = {
    runtime: {
      onMessage: {
        addListener(listener: Listener) {
          listeners.push(listener);
        },
      },
      onInstalled: { addListener: vi.fn() },
      lastError: null,
    },
    storage: {
      local: {
        async get(_key: string) {
          return {};
        },
        async set(_value: Record<string, unknown>) {
          // no-op.
        },
      },
    },
  };
}

function dispatch(message: unknown): Promise<unknown> {
  return new Promise((resolve) => {
    const sendResponse = (response: unknown): void => resolve(response);
    for (const listener of listeners) listener(message, {}, sendResponse);
    // O listener retorna true (canal assíncrono); a resposta chega via sendResponse.
  });
}

const PAYLOAD: NormalizedAd = {
  adLibraryId: '968129471240839',
  pageId: '315236625874136',
  pageName: 'NutSmart',
  status: 'active',
  deliveryStartDate: '2026-08-22',
  deliveryStopDate: null,
  runningDays: 12,
  platforms: ['facebook', 'instagram'],
  mediaType: 'image',
  creativeText: 'Oferta da semana',
  headline: null,
  description: null,
  cta: 'Saiba mais',
  destinationUrl: null,
  destinationDomain: 'nutsmart.com.br',
  adSnapshotUrl: 'https://www.facebook.com/ads/library/?id=968129471240839',
  creativeUrl: null,
  thumbnailUrl: null,
  parseConfidence: 'high',
};

function fakeFetchOk(body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(body), { status: 201, headers: { 'content-type': 'application/json' } }),
    ),
  );
}

function fakeFetchError(code: string, message: string, status = 409): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { code, message } }), { status }),
    ),
  );
}

describe('service worker — router de mensagens (FASE 06)', () => {
  let listenersLoaded: Promise<void>;

  beforeEach(async () => {
    stubChromeRuntime();
    // Registra o router do service worker UMA única vez ("instalação").
    if (!listenersLoaded) {
      listenersLoaded = import('../index').then(() => undefined);
    }
    await listenersLoaded;
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).chrome;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('salva uma oferta: envia POST e responde sucesso com a DTO', async () => {
    fakeFetchOk({ success: true, data: { id: 'sa-1', adLibraryId: PAYLOAD.adLibraryId } });

    const response = (await dispatch({
      type: 'saved-ads:save',
      payload: PAYLOAD,
    })) as { ok: boolean; data: { id: string; adLibraryId: string } };

    expect(response.ok).toBe(true);
    expect(response.data.id).toBe('sa-1');
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:3333/api/saved-ads',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('duplicidade vinda do backend vira ALREADY_SAVED e popula o cache', async () => {
    // ID FRESCO (diferente do teste de salvar) para não depender do estado
    // do cache compartilhado entre os testes deste arquivo.
    const payloadComIdFresco: NormalizedAd = { ...PAYLOAD, adLibraryId: '888000111222333' };
    fakeFetchError('ALREADY_SAVED', 'Esta oferta já foi salva.');

    const first = (await dispatch({ type: 'saved-ads:save', payload: payloadComIdFresco })) as {
      ok: boolean;
      code: string;
    };
    expect(first.ok).toBe(false);
    expect(first.code).toBe('ALREADY_SAVED');

    // Fast-path local: o SEGUNDO save de um ID já em cache NÃO vai à rede.
    const second = (await dispatch({ type: 'saved-ads:save', payload: payloadComIdFresco })) as {
      ok: boolean;
      code: string;
    };
    expect(second.ok).toBe(false);
    expect(second.code).toBe('ALREADY_SAVED');
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('lista ofertas do backend com paginação', async () => {
    fakeFetchOk({
      success: true,
      data: { items: [], page: 1, pageSize: 50, total: 0 },
    });

    const response = (await dispatch({ type: 'saved-ads:list', page: 1, pageSize: 50 })) as {
      ok: boolean;
      data: { total: number };
    };
    expect(response.ok).toBe(true);
    expect(response.data.total).toBe(0);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'http://127.0.0.1:3333/api/saved-ads?page=1&pageSize=50',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('exclui uma oferta do backend e limpa o cache local', async () => {
    fakeFetchOk({ success: true, data: { id: 'sa-1', deleted: true } });

    const response = (await dispatch({ type: 'saved-ads:delete', id: 'sa-1' })) as {
      ok: boolean;
      data: { deleted: boolean };
    };
    expect(response.ok).toBe(true);
    expect(response.data.deleted).toBe(true);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      'http://127.0.0.1:3333/api/saved-ads/sa-1',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('obtém uma oferta por ID', async () => {
    fakeFetchOk({ success: true, data: { id: 'sa-1' } });
    const response = (await dispatch({ type: 'saved-ads:get', id: 'sa-1' })) as { ok: boolean };
    expect(response.ok).toBe(true);
  });

  it('tipo desconhecido responde MESSAGE_FAILED sem chamar a rede', async () => {
    const response = (await dispatch({ type: 'desconhecido' })) as { ok: boolean; code: string };
    expect(response.ok).toBe(false);
    expect(response.code).toBe('MESSAGE_FAILED');
  });

  it('falha de rede (online) vira erro honesto sem lançar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const response = (await dispatch({ type: 'saved-ads:list' })) as { ok: boolean; code: string };
    expect(response.ok).toBe(false);
    expect(response.code).toBe('NETWORK_ERROR');
  });
});