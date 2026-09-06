import type { FastifyInstance } from 'fastify';
import type { CurrentUserResolver } from '../lib/currentUser';
import { notFound } from '../lib/apiError';
import { getPrisma } from '../db/prisma';

export interface SwipeRouteDeps {
  resolveUser: CurrentUserResolver;
}

export function registerSwipeRoutes(app: FastifyInstance, deps: SwipeRouteDeps): void {
  const prisma = getPrisma();

  app.get('/api/swipe/deck', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const q = request.query as { limit?: string; niche?: string };
    const limit = Math.min(parseInt(q.limit ?? '20', 10) || 20, 50);

    const decidedAdIds = (await prisma.swipeDecision.findMany({ where: { userId }, select: { adId: true } })).map(d => d.adId);

    const where: any = {
      userId,
      ...(decidedAdIds.length > 0 ? { adId: { notIn: decidedAdIds } } : {}),
    };

    const ads = await prisma.savedAd.findMany({
      where,
      include: { ad: true },
      orderBy: { score: 'desc' },
      take: limit,
    });

    const totalUnswiped = await prisma.savedAd.count({ where });

    return {
      success: true,
      data: ads.map(a => ({
        savedAdId: a.id,
        adId: a.adId,
        adLibraryId: a.adLibraryId,
        pageName: a.ad.pageName,
        headline: a.ad.headline,
        creativeText: a.ad.creativeText,
        creativeUrl: a.ad.creativeUrl,
        thumbnailUrl: a.ad.thumbnailUrl,
        destinationUrl: a.ad.destinationUrl,
        runningDays: a.ad.runningDays,
        platforms: a.ad.platforms,
        mediaType: a.ad.mediaType,
        score: a.score,
        classification: a.classification,
        isFavorite: a.isFavorite,
      })),
      remaining: totalUnswiped,
    };
  });

  app.get('/api/swipe/stats', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const total = await prisma.savedAd.count({ where: { userId } });
    const saved = await prisma.swipeDecision.count({ where: { userId, decision: 'save' } });
    const discarded = await prisma.swipeDecision.count({ where: { userId, decision: 'discard' } });
    const favorited = await prisma.swipeDecision.count({ where: { userId, decision: 'favorite' } });
    const remaining = await prisma.savedAd.count({ where: { userId, id: { notIn: (await prisma.swipeDecision.findMany({ where: { userId }, select: { adId: true } })).map(d => d.adId) } } });

    return { success: true, data: { total, saved, discarded, favorited, remaining } };
  });

  app.post('/api/swipe/decision', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const body = request.body as { adId: string; decision: string };
    if (!body.adId || !['save', 'discard', 'favorite'].includes(body.decision)) {
      return { success: false, error: 'adId e decision (save|discard|favorite) obrigatórios.' };
    }

    const existing = await prisma.swipeDecision.findUnique({ where: { userId_adId: { userId, adId: body.adId } } });
    if (existing) {
      await prisma.swipeDecision.update({ where: { id: existing.id }, data: { decision: body.decision } });
      return { success: true, updated: true };
    }

    await prisma.swipeDecision.create({ data: { userId, adId: body.adId, decision: body.decision } });

    if (body.decision === 'favorite') {
      await prisma.savedAd.updateMany({ where: { adId: body.adId, userId }, data: { isFavorite: true } });
    }

    return { success: true };
  });

  app.get('/api/swipe/collections', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const collections = await prisma.swipeCollection.findMany({
      where: { userId },
      include: { items: { include: { savedAd: { include: { ad: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: collections.map(c => ({ ...c, itemCount: c.items.length })) };
  });

  app.post('/api/swipe/collections', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const body = request.body as { name: string };
    if (!body.name?.trim()) return { success: false, error: 'Nome obrigatório.' };
    const collection = await prisma.swipeCollection.create({ data: { userId, name: body.name.trim() } });
    return { success: true, data: collection };
  });

  app.post('/api/swipe/collections/:id/items', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const { id } = request.params as { id: string };
    const body = request.body as { savedAdId: string };
    const collection = await prisma.swipeCollection.findFirst({ where: { id, userId } });
    if (!collection) throw notFound('Coleção não encontrada.');
    await prisma.swipeCollectionItem.upsert({
      where: { collectionId_savedAdId: { collectionId: id, savedAdId: body.savedAdId } },
      create: { collectionId: id, savedAdId: body.savedAdId },
      update: {},
    });
    return { success: true };
  });

  app.delete('/api/swipe/collections/:collectionId/items/:adId', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const { collectionId, adId } = request.params as { collectionId: string; adId: string };
    const collection = await prisma.swipeCollection.findFirst({ where: { id: collectionId, userId } });
    if (!collection) throw notFound('Coleção não encontrada.');
    await prisma.swipeCollectionItem.deleteMany({ where: { collectionId, savedAdId: adId } });
    return { success: true };
  });
}
