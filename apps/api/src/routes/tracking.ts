// CAÇAOFERTA — Rotas de rastreamento de ofertas.
//
// GET    /api/tracking              listar ofertas rastreadas
// POST   /api/tracking/:savedAdId   registrar evento de mudança
// GET    /api/tracking/:savedAdId/history  histórico de mudanças

import type { FastifyInstance } from 'fastify';
import type { CurrentUserResolver } from '../lib/currentUser';
import { notFound } from '../lib/apiError';
import { getPrisma } from '../db/prisma';

export interface TrackingRouteDeps {
  resolveUser: CurrentUserResolver;
}

export function registerTrackingRoutes(app: FastifyInstance, deps: TrackingRouteDeps): void {
  const prisma = getPrisma();

  app.get('/api/tracking', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const query = (request.query ?? {}) as Record<string, unknown>;
    const limit = Math.min(Number(query.limit) || 50, 100);

    const rows = await prisma.trackingEvent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        savedAd: {
          include: { ad: true },
        },
      },
    });

    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        savedAdId: r.savedAdId,
        adLibraryId: r.savedAd?.adLibraryId ?? null,
        pageName: r.savedAd?.ad?.pageName ?? null,
        eventType: r.eventType,
        field: r.field,
        oldValue: r.oldValue,
        newValue: r.newValue,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });

  app.post<{ Params: { savedAdId: string } }>('/api/tracking/:savedAdId', async (request, reply) => {
    const { userId } = await deps.resolveUser(request);
    const body = request.body as { eventType: string; field: string; oldValue?: string; newValue?: string };

    const savedAd = await prisma.savedAd.findFirst({ where: { id: request.params.savedAdId, userId } });
    if (!savedAd) throw notFound('Oferta não encontrada.');

    const row = await prisma.trackingEvent.create({
      data: {
        userId,
        savedAdId: request.params.savedAdId,
        eventType: body.eventType,
        field: body.field,
        oldValue: body.oldValue ?? null,
        newValue: body.newValue ?? null,
      },
    });

    return reply.status(201).send({
      success: true,
      data: {
        id: row.id,
        savedAdId: row.savedAdId,
        eventType: row.eventType,
        field: row.field,
        oldValue: row.oldValue,
        newValue: row.newValue,
        createdAt: row.createdAt.toISOString(),
      },
    });
  });

  app.get<{ Params: { savedAdId: string } }>('/api/tracking/:savedAdId/history', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const savedAd = await prisma.savedAd.findFirst({ where: { id: request.params.savedAdId, userId } });
    if (!savedAd) throw notFound('Oferta não encontrada.');

    const rows = await prisma.trackingEvent.findMany({
      where: { savedAdId: request.params.savedAdId, userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        eventType: r.eventType,
        field: r.field,
        oldValue: r.oldValue,
        newValue: r.newValue,
        createdAt: r.createdAt.toISOString(),
      })),
    };
  });
}
