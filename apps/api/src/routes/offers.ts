import type { FastifyInstance } from 'fastify';
import type { CurrentUserResolver } from '../lib/currentUser';
import { notFound } from '../lib/apiError';
import { getPrisma } from '../db/prisma';

export interface OffersRouteDeps {
  resolveUser: CurrentUserResolver;
}

export function registerOffersRoutes(app: FastifyInstance, deps: OffersRouteDeps): void {
  const prisma = getPrisma();

  app.get('/api/offers', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const q = request.query as Record<string, string>;
    const page = Math.max(1, parseInt(q.page ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(q.pageSize ?? '50', 10) || 50));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (q.niche) where.niche = q.niche;
    if (q.subniche) where.subniche = q.subniche;
    if (q.country) where.country = q.country;
    if (q.language) where.language = q.language;
    if (q.mediaType) where.mediaType = q.mediaType;
    if (q.status) where.status = q.status;
    if (q.isLowTicket === 'true') where.isLowTicket = true;
    if (q.search) {
      where.OR = [
        { pageName: { contains: q.search, mode: 'insensitive' } },
        { advertiserName: { contains: q.search, mode: 'insensitive' } },
        { primaryDomain: { contains: q.search, mode: 'insensitive' } },
        { niche: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (q.minDays || q.maxDays) {
      where.lastSeenAt = {};
      if (q.minDays) {
        const d = new Date(); d.setDate(d.getDate() - parseInt(q.minDays, 10));
        where.lastSeenAt.gte = d;
      }
    }

    const orderBy: any = {};
    if (q.sort === 'recent') orderBy.lastSeenAt = 'desc';
    else if (q.sort === 'growth') orderBy.status = 'asc';
    else if (q.sort === 'creatives') orderBy.updatedAt = 'desc';
    else orderBy.lastRunDate = 'desc';

    const [items, total] = await Promise.all([
      prisma.offer.findMany({ where, orderBy, skip, take: pageSize, include: { snapshots: { orderBy: { takenAt: 'desc' }, take: 14 } } }),
      prisma.offer.count({ where }),
    ]);

    return { success: true, data: { items: items.map(mapOffer), page, pageSize, total } };
  });

  app.get('/api/offers/:id', async (request) => {
    const { id } = request.params as { id: string };
    const offer = await prisma.offer.findUnique({ where: { id }, include: { snapshots: { orderBy: { takenAt: 'desc' }, take: 30 } } });
    if (!offer) throw notFound('Oferta não encontrada.');
    return { success: true, data: mapOffer(offer) };
  });

  app.patch('/api/offers/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { qualification?: string; isSaved?: boolean; isFavorite?: boolean; niche?: string; subniche?: string };
    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) throw notFound('Oferta não encontrada.');

    const data: any = {};
    if (body.qualification !== undefined) data.qualification = body.qualification;
    if (body.isSaved !== undefined) data.isSaved = body.isSaved;
    if (body.isFavorite !== undefined) data.isFavorite = body.isFavorite;
    if (body.niche !== undefined) data.niche = body.niche;
    if (body.subniche !== undefined) data.subniche = body.subniche;

    const updated = await prisma.offer.update({ where: { id }, data });
    return { success: true, data: mapOffer(updated) };
  });
}

function mapOffer(row: any) {
  return {
    id: row.id,
    adLibraryId: row.adLibraryId,
    pageId: row.pageId,
    pageName: row.pageName,
    advertiserName: row.advertiserName,
    primaryDomain: row.primaryDomain,
    funnelUrl: row.funnelUrl,
    adLibraryUrl: row.adLibraryUrl,
    niche: row.niche,
    subniche: row.subniche,
    country: row.country,
    language: row.language,
    mediaType: row.mediaType,
    isLowTicket: row.isLowTicket,
    lowTicketSignals: row.lowTicketSignals,
    firstSeenAt: row.firstSeenAt?.toISOString?.() ?? row.firstSeenAt,
    lastSeenAt: row.lastSeenAt?.toISOString?.() ?? row.lastSeenAt,
    lastRunDate: row.lastRunDate?.toISOString?.() ?? row.lastRunDate,
    status: row.status,
    qualification: row.qualification,
    isSaved: row.isSaved,
    isFavorite: row.isFavorite,
    snapshots: (row.snapshots ?? []).map((s: any) => ({
      id: s.id,
      activeAds: s.activeAds,
      totalAds: s.totalAds,
      creativeCount: s.creativeCount,
      runningDays: s.runningDays,
      takenAt: s.takenAt?.toISOString?.() ?? s.takenAt,
    })),
  };
}
