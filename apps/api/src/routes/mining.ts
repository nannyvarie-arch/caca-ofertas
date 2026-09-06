// CAÇAOFERTA — Rotas de mineração.
//
// GET    /api/mining/jobs         listar jobs de mineração
// POST   /api/mining/jobs         criar novo job
// GET    /api/mining/jobs/:id     buscar job específico
// POST   /api/mining/jobs/:id/run iniciar execução do job

import type { FastifyInstance } from 'fastify';
import type { CurrentUserResolver } from '../lib/currentUser';
import { notFound } from '../lib/apiError';
import { getPrisma } from '../db/prisma';

export interface MiningRouteDeps {
  resolveUser: CurrentUserResolver;
}

export function registerMiningRoutes(app: FastifyInstance, deps: MiningRouteDeps): void {
  const prisma = getPrisma();

  app.get('/api/mining/jobs', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const query = (request.query ?? {}) as Record<string, unknown>;
    const limit = Math.min(Number(query.limit) || 20, 50);

    const rows = await prisma.miningJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        query: r.query,
        niche: r.niche,
        maxResults: r.maxResults,
        status: r.status,
        resultsFound: r.resultsFound,
        savedCount: r.savedCount,
        startedAt: r.startedAt?.toISOString() ?? null,
        completedAt: r.completedAt?.toISOString() ?? null,
        errorMessage: r.errorMessage,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });

  app.post('/api/mining/jobs', async (request, reply) => {
    const { userId } = await deps.resolveUser(request);
    const body = request.body as { query: string; niche?: string; maxResults?: number };

    if (!body.query || body.query.trim().length === 0) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Query é obrigatória.' } });
    }

    const row = await prisma.miningJob.create({
      data: {
        userId,
        query: body.query.trim(),
        niche: body.niche,
        maxResults: Math.min(body.maxResults ?? 50, 200),
      },
    });

    return reply.status(201).send({
      success: true,
      data: {
        id: row.id,
        query: row.query,
        niche: row.niche,
        maxResults: row.maxResults,
        status: row.status,
        resultsFound: row.resultsFound,
        savedCount: row.savedCount,
        createdAt: row.createdAt.toISOString(),
      },
    });
  });

  app.get<{ Params: { id: string } }>('/api/mining/jobs/:id', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const row = await prisma.miningJob.findFirst({ where: { id: request.params.id, userId } });
    if (!row) throw notFound('Job não encontrado.');
    return {
      success: true,
      data: {
        id: row.id,
        query: row.query,
        niche: row.niche,
        maxResults: row.maxResults,
        status: row.status,
        resultsFound: row.resultsFound,
        savedCount: row.savedCount,
        startedAt: row.startedAt?.toISOString() ?? null,
        completedAt: row.completedAt?.toISOString() ?? null,
        errorMessage: row.errorMessage,
        createdAt: row.createdAt.toISOString(),
      },
    };
  });

  app.post<{ Params: { id: string } }>('/api/mining/jobs/:id/run', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const row = await prisma.miningJob.findFirst({ where: { id: request.params.id, userId } });
    if (!row) throw notFound('Job não encontrado.');

    if (row.status === 'running') {
      return { success: false, error: { code: 'VALIDATION_ERROR', message: 'Job já está em execução.' } };
    }

    const updated = await prisma.miningJob.update({
      where: { id: request.params.id },
      data: { status: 'running', startedAt: new Date() },
    });

    // Simular execução — em produção, integrar com Meta Ads Library scraping
    setTimeout(async () => {
      try {
        const found = Math.floor(Math.random() * (row.maxResults || 50));
        await prisma.miningJob.update({
          where: { id: request.params.id },
          data: {
            status: 'completed',
            resultsFound: found,
            completedAt: new Date(),
          },
        });
      } catch {
        await prisma.miningJob.update({
          where: { id: request.params.id },
          data: { status: 'failed', errorMessage: 'Erro durante execução', completedAt: new Date() },
        });
      }
    }, 2000);

    return {
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        startedAt: updated.startedAt?.toISOString() ?? null,
      },
    };
  });
}
