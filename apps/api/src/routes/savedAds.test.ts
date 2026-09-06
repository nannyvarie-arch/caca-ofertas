// CAÇAOFERTA — Testes das rotas /api/saved-ads (FASE 06).
// Usam o store em memória + resolutor de usuário injetável (test-only):
// autenticação real NUNCA lê userId do cliente em produção.

import type { FastifyInstance } from 'fastify';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildServer } from '../app';
import type { CurrentUserResolver } from '../lib/currentUser';
import { unauthorized } from '../lib/apiError';
import { createMemorySavedAdsStore } from '../services/memorySavedAdsStore';

function testUserResolver(header = 'x-test-user'): CurrentUserResolver {
  return (request) => {
    const req = request as unknown as { headers: Record<string, string | undefined> };
    const user = req.headers[header] ?? 'user-a';
    return Promise.resolve({ userId: user });
  };
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    adLibraryId: '968129471240839',
    pageId: '315236625874136',
    pageName: 'NutSmart',
    status: 'active',
    deliveryStartDate: '2026-08-22',
    deliveryStopDate: null,
    runningDays: null,
    platforms: ['facebook', 'instagram'],
    mediaType: 'image',
    creativeText: 'Oferta especial',
    headline: null,
    description: 'Descrição',
    cta: 'Saiba mais',
    destinationUrl: null,
    destinationDomain: 'nutsmart.com.br',
    adSnapshotUrl: 'https://www.facebook.com/ads/library/?id=968129471240839',
    creativeUrl: null,
    thumbnailUrl: null,
    ...overrides,
  };
}

describe('POST /api/saved-ads', () => {
  let server: FastifyInstance;
  beforeAll(async () => {
    server = buildServer({ savedAdsStore: createMemorySavedAdsStore(), resolveUser: testUserResolver() });
  });

  it('salva uma oferta válida e devolve a DTO no envelope', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/saved-ads',
      payload: validPayload(),
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.adLibraryId).toBe('968129471240839');
    expect(body.data.pageName).toBe('NutSmart');
    expect(body.data.status).toBe('active');
    expect(body.data.platforms).toEqual(['facebook', 'instagram']);
    expect(body.data.mediaType).toBe('image');
    expect(body.data.destinationDomain).toBe('nutsmart.com.br');
    expect(typeof body.data.savedAt).toBe('string');
  });

  it('rejeita payload sem adLibraryId (VALIDAÇÃO)', async () => {
    const { adLibraryId: _adLibraryId, ...rest } = validPayload();
    const response = await server.inject({ method: 'POST', url: '/api/saved-ads', payload: { ...rest, adLibraryId: '' } });
    expect(response.statusCode).toBe(400);
    expect(response.json().success).toBe(false);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejeita data de calendário inválida', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/saved-ads',
      payload: validPayload({ deliveryStartDate: '2026-13-40' }),
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejeita URL que não seja http(s)', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/saved-ads',
      payload: validPayload({ adSnapshotUrl: 'javascript:alert(1)' }),
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('rejeita status desconhecido', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/saved-ads',
      payload: validPayload({ status: 'superativo' }),
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe('VALIDATION_ERROR');
  });

  it('ignora campos administrativos enviados pelo cliente (userId/id não são aceitos)', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/saved-ads',
      payload: validPayload({ adLibraryId: 'admin-fields-0001', userId: 'hacker', id: 'fake', savedAt: '2000-01-01T00:00:00.000Z' }),
    });
    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.data.id).not.toBe('fake');
  });

  it('não duplica: segundo POST do MESMO usuário devolve ALREADY_SAVED (409)', async () => {
    await server.inject({ method: 'POST', url: '/api/saved-ads', payload: validPayload({ adLibraryId: 'dupe-0001' }) });
    const second = await server.inject({
      method: 'POST',
      url: '/api/saved-ads',
      payload: validPayload({ adLibraryId: 'dupe-0001', pageName: 'Outro', destinationDomain: 'out.com' }),
    });
    expect(second.statusCode).toBe(409);
    const body = second.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ALREADY_SAVED');
  });

  it('permite que OUTRO usuário salve o mesmo anúncio (deduplicação é por usuário)', async () => {
    const serverB = buildServer({ savedAdsStore: createMemorySavedAdsStore(), resolveUser: testUserResolver() });
    const response = await serverB.inject({
      method: 'POST',
      url: '/api/saved-ads',
      payload: validPayload({ adLibraryId: 'multiuser-0001' }),
      headers: { 'x-test-user': 'user-b' },
    });
    expect(response.statusCode).toBe(201);
  });
});

describe('segurança do usuário (isolamento + autenticação)', () => {
  it('sem DEV_USER_ID (produção) a API responde 401 UNAUTHORIZED', async () => {
    const server = buildServer({
      resolveUser: () => {
        throw unauthorized('Autenticação necessária.');
      },
    });
    const response = await server.inject({ method: 'GET', url: '/api/saved-ads' });
    expect(response.statusCode).toBe(401);
    expect(response.json().error.code).toBe('UNAUTHORIZED');
  });
});

describe('GET /api/saved-ads (listagem)', () => {
  let server: FastifyInstance;
  beforeAll(async () => {
    server = buildServer({ savedAdsStore: createMemorySavedAdsStore(), resolveUser: testUserResolver() });
    // 3 ofertas do user-a (mesmo ID? não: IDs distintos) — são 3 anúncios distintos
    for (const id of ['list-aaa', 'list-bbb', 'list-ccc']) {
      await server.inject({ method: 'POST', url: '/api/saved-ads', payload: validPayload({ adLibraryId: id }) });
    }
    // 1 oferta do user-b (não deve vazar na listagem do user-a)
    await server.inject({
      method: 'POST',
      url: '/api/saved-ads',
      payload: validPayload({ adLibraryId: 'list-other-user' }),
      headers: { 'x-test-user': 'user-b' },
    });
  });

  it('lista apenas as ofertas do usuário atual, ordenadas por savedAt desc', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/saved-ads' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
    expect(body.data.total).toBe(3);
    expect(body.data.items.map((item: { adLibraryId: string }) => item.adLibraryId)).toEqual([
      'list-ccc',
      'list-bbb',
      'list-aaa',
    ]);
  });

  it('suporta paginação básica (page/pageSize)', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/saved-ads?page=2&pageSize=2' });
    const body = response.json();
    expect(body.data.page).toBe(2);
    expect(body.data.pageSize).toBe(2);
    expect(body.data.total).toBe(3);
    expect(body.data.items.length).toBe(1);
  });
});

describe('GET /api/saved-ads/:id', () => {
  let server: FastifyInstance;
  let savedId = '';

  beforeAll(async () => {
    server = buildServer({ savedAdsStore: createMemorySavedAdsStore(), resolveUser: testUserResolver() });
    const created = await server.inject({
      method: 'POST',
      url: '/api/saved-ads',
      payload: validPayload({ adLibraryId: 'single-0001' }),
    });
    savedId = created.json().data.id;
  });

  it('devolve a oferta quando pertence ao usuário', async () => {
    const response = await server.inject({ method: 'GET', url: `/api/saved-ads/${savedId}` });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.id).toBe(savedId);
  });

  it('devolve 404 quando a oferta é de OUTRO usuário', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/api/saved-ads/${savedId}`,
      headers: { 'x-test-user': 'user-b' },
    });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  it('devolve 404 para ID inexistente', async () => {
    const response = await server.inject({ method: 'GET', url: '/api/saved-ads/nao-existe' });
    expect(response.statusCode).toBe(404);
  });
});

describe('DELETE /api/saved-ads/:id', () => {
  let server: FastifyInstance;
  let savedId = '';

  beforeAll(async () => {
    server = buildServer({ savedAdsStore: createMemorySavedAdsStore(), resolveUser: testUserResolver() });
    const created = await server.inject({
      method: 'POST',
      url: '/api/saved-ads',
      payload: validPayload({ adLibraryId: 'delete-0001' }),
    });
    savedId = created.json().data.id;
  });

  it('exclui a oferta do próprio usuário', async () => {
    const response = await server.inject({ method: 'DELETE', url: `/api/saved-ads/${savedId}` });
    expect(response.statusCode).toBe(200);
    expect(response.json().data.deleted).toBe(true);
    const after = await server.inject({ method: 'GET', url: `/api/saved-ads/${savedId}` });
    expect(after.statusCode).toBe(404);
  });

  it('não exclui oferta de outro usuário (404)', async () => {
    const created = await server.inject({
      method: 'POST',
      url: '/api/saved-ads',
      payload: validPayload({ adLibraryId: 'delete-other' }),
    });
    const otherId = created.json().data.id;
    const response = await server.inject({
      method: 'DELETE',
      url: `/api/saved-ads/${otherId}`,
      headers: { 'x-test-user': 'user-b' },
    });
    expect(response.statusCode).toBe(404);
    const stillThere = await server.inject({ method: 'GET', url: `/api/saved-ads/${otherId}` });
    expect(stillThere.statusCode).toBe(200);
  });

  it('404 para oferta inexistente', async () => {
    const response = await server.inject({ method: 'DELETE', url: '/api/saved-ads/nao-existe' });
    expect(response.statusCode).toBe(404);
  });
});