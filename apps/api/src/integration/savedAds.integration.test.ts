// CAÇAOFERTA — Teste de INTEGRAÇÃO do fluxo FASE 06 (camada API + store).
//
// Reproduz o percurso completo do usuário SEM depender de banco real
// (Postgres/Supabase): o fluxo de dados (enviar → validar → gravar → listar →
// duplicar → abrir → excluir) é exercitado de ponta a ponta contra o store em
// memória, que implementa a MESMA semântica do Prisma usada em produção.
//
// BLOQUEIO EXTERNO DOCUMENTADO: a validação contra um PostgreSQL/Supabase real
// (committing das migrations) exige DATABASE_URL válida — configuração externa
// ainda não disponível neste ambiente (ver docs/API.md). Este teste prova a
// lógica completa do backend sem esse requisito.

import { describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildServer } from '../app';
import { createMemorySavedAdsStore } from '../services/memorySavedAdsStore';

function user(name: string) {
  return (): Promise<{ userId: string }> => Promise.resolve({ userId: name });
}

const PAYLOAD = {
  adLibraryId: 'integration-968129471240839',
  pageId: '315236625874136',
  pageName: 'NutSmart',
  status: 'active',
  deliveryStartDate: '2026-08-22',
  deliveryStopDate: null,
  runningDays: 14,
  platforms: ['facebook', 'instagram'],
  mediaType: 'image',
  creativeText: 'Oferta exclusiva nesta semana',
  headline: 'Economize agora',
  description: 'Confira os detalhes da oferta.',
  cta: 'Comprar',
  destinationUrl: 'https://nutsmart.com.br/oferta',
  destinationDomain: 'nutsmart.com.br',
  adSnapshotUrl: 'https://www.facebook.com/ads/library/?id=integration-968129471240839',
  creativeUrl: 'https://scontent.example/video.mp4',
  thumbnailUrl: 'https://scontent.example/thumb.jpg',
};

async function saveAndReturnId(server: FastifyInstance): Promise<string> {
  const created = await server.inject({ method: 'POST', url: '/api/saved-ads', payload: PAYLOAD });
  expect(created.statusCode).toBe(201);
  return created.json().data.id;
}

describe('fluxo completo de "salvar oferta" (persistência → dedup → listagem → exclusão)', () => {
  it('salvar → listar → duplicar → abrir → excluir → sumir da listagem', async () => {
    const server = buildServer({ savedAdsStore: createMemorySavedAdsStore(), resolveUser: user('user-a') });

    // 1. Salvar a oferta.
    const savedId = await saveAndReturnId(server);

    // 2. Listagem mostra a oferta com todos os campos do contrato.
    const list = await server.inject({ method: 'GET', url: '/api/saved-ads' });
    const listBody = list.json();
    expect(listBody.data.total).toBe(1);
    const item = listBody.data.items[0];
    expect(item.id).toBe(savedId);
    expect(item.adLibraryId).toBe(PAYLOAD.adLibraryId);
    expect(item.pageName).toBe('NutSmart');
    expect(item.status).toBe('active');
    expect(item.runningDays).toBe(14);
    expect(item.platforms).toEqual(['facebook', 'instagram']);
    expect(item.mediaType).toBe('image');
    expect(item.creativeText).toBe('Oferta exclusiva nesta semana');
    expect(item.headline).toBe('Economize agora');
    expect(item.description).toBe('Confira os detalhes da oferta.');
    expect(item.cta).toBe('Comprar');
    expect(item.destinationUrl).toBe('https://nutsmart.com.br/oferta');
    expect(item.destinationDomain).toBe('nutsmart.com.br');
    expect(item.adSnapshotUrl).toBe(PAYLOAD.adSnapshotUrl);
    expect(item.creativeUrl).toBe(PAYLOAD.creativeUrl);
    expect(item.thumbnailUrl).toBe(PAYLOAD.thumbnailUrl);

    // 3. Tentar salvar novamente → duplicidade detectada.
    const duplicated = await server.inject({ method: 'POST', url: '/api/saved-ads', payload: PAYLOAD });
    expect(duplicated.statusCode).toBe(409);
    expect(duplicated.json().error.code).toBe('ALREADY_SAVED');

    // 4. Buscar por ID (abrir a oferta).
    const byId = await server.inject({ method: 'GET', url: `/api/saved-ads/${savedId}` });
    expect(byId.statusCode).toBe(200);
    expect(byId.json().data.id).toBe(savedId);

    // 5. Excluir.
    const deleted = await server.inject({ method: 'DELETE', url: `/api/saved-ads/${savedId}` });
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json().data.deleted).toBe(true);

    // 6. Desapareceu da listagem.
    const after = await server.inject({ method: 'GET', url: '/api/saved-ads' });
    expect(after.json().data.total).toBe(0);
  });
});