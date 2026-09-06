// CAÇAOFERTA — Rotas de histórico de pesquisas.
//
// GET    /api/search-history          listar pesquisas do usuário
// POST   /api/search-history          registrar nova pesquisa
// DELETE /api/search-history/:id      excluir registro

import type { FastifyInstance } from 'fastify';
import type { CurrentUserResolver } from '../lib/currentUser';
import { notFound } from '../lib/apiError';
import { getPrisma } from '../db/prisma';

export interface SearchHistoryRouteDeps {
  resolveUser: CurrentUserResolver;
}

export function registerSearchHistoryRoutes(app: FastifyInstance, deps: SearchHistoryRouteDeps): void {
  const prisma = getPrisma();

  app.get('/api/search-history', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const query = (request.query ?? {}) as Record<string, unknown>;
    const limit = Math.min(Number(query.limit) || 50, 100);

    const rows = await prisma.searchHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        query: r.query,
        type: r.type,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });

  app.post('/api/search-history', async (request, reply) => {
    const { userId } = await deps.resolveUser(request);
    const body = request.body as { query: string; type?: string };

    if (!body.query || body.query.trim().length === 0) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Query é obrigatória.' } });
    }

    const row = await prisma.searchHistory.create({
      data: {
        userId,
        query: body.query.trim(),
        type: body.type ?? 'manual',
      },
    });

    return reply.status(201).send({
      success: true,
      data: { id: row.id, query: row.query, type: row.type, createdAt: row.createdAt.toISOString() },
    });
  });

  app.delete<{ Params: { id: string } }>('/api/search-history/:id', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const result = await prisma.searchHistory.deleteMany({ where: { id: request.params.id, userId } });
    if (result.count === 0) throw notFound('Registro não encontrado.');
    return { success: true, data: { id: request.params.id, deleted: true } };
  });
}
