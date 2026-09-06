import type { FastifyInstance } from 'fastify';
import type { CurrentUserResolver } from '../lib/currentUser';
import { notFound } from '../lib/apiError';
import { getPrisma } from '../db/prisma';

export interface TrackedOffersDeps {
  resolveUser: CurrentUserResolver;
}

function classifyTrend(snapshots: { adCount: number; takenAt: Date }[]): string {
  if (snapshots.length < 2) return 'collecting';
  const recent = snapshots.slice(0, 3);
  const older = snapshots.slice(3, 6);
  if (recent.length === 0) return 'collecting';
  const avgRecent = recent.reduce((s, x) => s + x.adCount, 0) / recent.length;
  if (older.length === 0) return avgRecent > 0 ? 'scaling' : 'collecting';
  const avgOlder = older.reduce((s, x) => s + x.adCount, 0) / older.length;
  const diff = avgRecent - avgOlder;
  if (diff > 1) return 'scaling';
  if (diff < -1) return 'dropping';
  if (avgRecent === 0 && avgOlder > 0) return 'dead';
  return 'unknown';
}

export function registerTrackedOffersRoutes(app: FastifyInstance, deps: TrackedOffersDeps): void {
  const prisma = getPrisma();

  app.get('/api/tracked-offers', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const offers = await prisma.trackedOffer.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { snapshots: { orderBy: { takenAt: 'desc' }, take: 10 } },
    });

    const scaling = offers.filter(o => o.status === 'scaling').length;
    const dropping = offers.filter(o => o.status === 'dropping').length;
    const dead = offers.filter(o => o.status === 'dead').length;
    const collecting = offers.filter(o => o.status === 'collecting').length;

    return {
      success: true,
      data: offers.map(o => ({
        id: o.id,
        adLibraryId: o.adLibraryId,
        pageId: o.pageId,
        pageName: o.pageName,
        label: o.label,
        status: o.status,
        adCountCurrent: o.adCountCurrent,
        lastCheckedAt: o.lastCheckedAt,
        createdAt: o.createdAt,
        snapshots: o.snapshots.map(s => ({ adCount: s.adCount, takenAt: s.takenAt })),
      })),
      counters: { total: offers.length, scaling, dropping, dead, collecting },
    };
  });

  app.post('/api/tracked-offers', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const body = request.body as { adLibraryId: string; pageId?: string; pageName?: string; label?: string };

    if (!body.adLibraryId) return { success: false, error: 'adLibraryId obrigatório' };

    const existing = await prisma.trackedOffer.findUnique({ where: { userId_adLibraryId: { userId, adLibraryId: body.adLibraryId } } });
    if (existing) return { success: true, data: existing, alreadyTracked: true };

    const offer = await prisma.trackedOffer.create({
      data: {
        userId,
        adLibraryId: body.adLibraryId,
        pageId: body.pageId,
        pageName: body.pageName,
        label: body.label,
        adCountCurrent: 1,
      },
    });

    await prisma.adCountSnapshot.create({
      data: { trackedOfferId: offer.id, adCount: 1, activeCount: 1 },
    });

    return { success: true, data: offer };
  });

  app.get('/api/tracked-offers/:id', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const { id } = request.params as { id: string };
    const offer = await prisma.trackedOffer.findFirst({
      where: { id, userId },
      include: { snapshots: { orderBy: { takenAt: 'desc' } } },
    });
    if (!offer) throw notFound('Oferta rastreada não encontrada.');
    return {
      success: true,
      data: {
        ...offer,
        snapshots: offer.snapshots.map(s => ({ id: s.id, adCount: s.adCount, activeCount: s.activeCount, newCreatives: s.newCreatives, takenAt: s.takenAt })),
      },
    };
  });

  app.post('/api/tracked-offers/:id/check', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const { id } = request.params as { id: string };
    const offer = await prisma.trackedOffer.findFirst({ where: { id, userId } });
    if (!offer) throw notFound('Oferta rastreada não encontrada.');

    const ad = await prisma.ad.findFirst({ where: { adLibraryId: offer.adLibraryId } });
    const currentCount = ad ? await prisma.ad.count({ where: { pageId: ad.pageId ?? undefined } }) : 0;

    const snapshot = await prisma.adCountSnapshot.create({
      data: {
        trackedOfferId: offer.id,
        adCount: currentCount,
        activeCount: currentCount,
      },
    });

    const allSnapshots = await prisma.adCountSnapshot.findMany({
      where: { trackedOfferId: offer.id },
      orderBy: { takenAt: 'desc' },
      take: 20,
    });

    const newStatus = classifyTrend(allSnapshots);

    await prisma.trackedOffer.update({
      where: { id: offer.id },
      data: { adCountCurrent: currentCount, lastCheckedAt: new Date(), status: newStatus },
    });

    return { success: true, data: { snapshot, newStatus, adCount: currentCount } };
  });

  app.post('/api/tracking/run-due', async (request) => {
    const body = request.body as { cronSecret?: string };
    if (body.cronSecret !== process.env.CRON_SECRET) {
      return { success: false, error: 'Unauthorized' };
    }

    const due = await prisma.trackedOffer.findMany({
      where: {
        lastCheckedAt: { lt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
      },
      take: 50,
    });

    let checked = 0;
    for (const offer of due) {
      try {
        const ad = await prisma.ad.findFirst({ where: { adLibraryId: offer.adLibraryId } });
        const currentCount = ad ? await prisma.ad.count({ where: { pageId: ad.pageId ?? undefined } }) : 0;

        await prisma.adCountSnapshot.create({
          data: { trackedOfferId: offer.id, adCount: currentCount, activeCount: currentCount },
        });

        const allSnapshots = await prisma.adCountSnapshot.findMany({
          where: { trackedOfferId: offer.id },
          orderBy: { takenAt: 'desc' },
          take: 20,
        });

        const newStatus = classifyTrend(allSnapshots);
        await prisma.trackedOffer.update({
          where: { id: offer.id },
          data: { adCountCurrent: currentCount, lastCheckedAt: new Date(), status: newStatus },
        });
        checked++;
      } catch { /* skip */ }
    }

    return { success: true, checked, total: due.length };
  });

  app.delete('/api/tracked-offers/:id', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const { id } = request.params as { id: string };
    await prisma.trackedOffer.deleteMany({ where: { id, userId } });
    return { success: true };
  });
}
