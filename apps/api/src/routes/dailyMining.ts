import type { FastifyInstance } from 'fastify';
import type { CurrentUserResolver } from '../lib/currentUser';
import { getPrisma } from '../db/prisma';
import { CRON_SECRET } from '../config/env';

export interface DailyMiningRouteDeps {
  resolveUser: CurrentUserResolver;
}

function buildAdLibraryUrl(pageId: string | null, adLibraryId: string, country?: string): string {
  const c = country ?? 'ALL';
  if (pageId) return `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${c}&view_all_page_id=${pageId}`;
  return `https://www.facebook.com/ads/library/?id=${adLibraryId}`;
}

function buildFunnelUrl(destinationUrl: string | null): string | null {
  if (!destinationUrl) return null;
  return destinationUrl;
}

function classifyTrend(snapshots: { activeAds: number; takenAt: Date }[]): string {
  if (snapshots.length < 2) return 'coletando';
  const recent = snapshots.slice(0, 3);
  const older = snapshots.slice(3, 6);
  if (recent.length === 0) return 'coletando';
  const avgRecent = recent.reduce((s, x) => s + x.activeAds, 0) / recent.length;
  if (older.length === 0) return avgRecent > 0 ? 'nova' : 'coletando';
  const avgOlder = older.reduce((s, x) => s + x.activeAds, 0) / older.length;
  const diff = avgRecent - avgOlder;
  const pct = avgOlder > 0 ? diff / avgOlder : diff > 0 ? 1 : 0;
  if (pct > 0.15) return 'subindo';
  if (pct < -0.15) return 'caindo';
  if (avgRecent === 0 && avgOlder > 0) return 'morta';
  return 'estavel';
}

export function registerDailyMiningRoutes(app: FastifyInstance, deps: DailyMiningRouteDeps): void {
  const prisma = getPrisma();

  app.post('/api/mining/daily/run', async (request, reply) => {
    const headerSecret = (request.headers as any)['x-cron-secret'];
    if (CRON_SECRET && headerSecret !== CRON_SECRET) {
      return reply.status(401).send({ success: false, error: 'Unauthorized' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.dailyMiningRun.findUnique({ where: { runDate: today } });
    if (existing && (existing.status === 'done' || existing.status === 'running')) {
      return { success: true, data: { ...existing, alreadyRan: true } };
    }

    const run = existing
      ? await prisma.dailyMiningRun.update({ where: { id: existing.id }, data: { status: 'running', startedAt: new Date() } })
      : await prisma.dailyMiningRun.create({ data: { runDate: today, status: 'running', startedAt: new Date() } });

    let adsFound = 0;
    let offersUpserted = 0;

    try {
      const pendingIngests = (global as any).__pendingIngests ?? [];
      if (pendingIngests.length > 0) {
        for (const ingest of pendingIngests) {
          const offer = await prisma.offer.upsert({
            where: { adLibraryId: ingest.adArchiveId },
            create: {
              adLibraryId: ingest.adArchiveId,
              pageId: ingest.pageId,
              pageName: ingest.pageName,
              advertiserName: ingest.pageName,
              primaryDomain: ingest.destinationDomain,
              funnelUrl: ingest.destinationUrl,
              adLibraryUrl: buildAdLibraryUrl(ingest.pageId, ingest.adArchiveId, ingest.country),
              country: ingest.country,
              language: ingest.language,
              mediaType: ingest.mediaType,
              isLowTicket: ingest.isLowTicket ?? false,
              lowTicketSignals: ingest.lowTicketSignals ?? [],
              lastSeenAt: new Date(),
              lastRunDate: today,
              status: 'nova',
            },
            update: {
              pageId: ingest.pageId ?? undefined,
              pageName: ingest.pageName ?? undefined,
              primaryDomain: ingest.destinationDomain ?? undefined,
              funnelUrl: ingest.destinationUrl ?? undefined,
              lastSeenAt: new Date(),
              lastRunDate: today,
            },
          });

          await prisma.offerSnapshot.create({
            data: {
              offerId: offer.id,
              activeAds: ingest.activeAds ?? 1,
              totalAds: ingest.totalAds ?? 1,
              creativeCount: ingest.creativeCount ?? 1,
              runningDays: ingest.runningDays ?? 0,
            },
          });

          const snapshots = await prisma.offerSnapshot.findMany({
            where: { offerId: offer.id },
            orderBy: { takenAt: 'desc' },
            take: 20,
          });
          const newStatus = classifyTrend(snapshots);
          await prisma.offer.update({ where: { id: offer.id }, data: { status: newStatus } });

          adsFound++;
          offersUpserted++;
        }
        (global as any).__pendingIngests = [];
      }

      await prisma.dailyMiningRun.update({
        where: { id: run.id },
        data: { status: 'done', adsFound, offersUpserted, finishedAt: new Date() },
      });
    } catch (err: any) {
      await prisma.dailyMiningRun.update({
        where: { id: run.id },
        data: { status: 'failed', errorMessage: err.message, finishedAt: new Date() },
      });
    }

    return { success: true, data: { id: run.id, status: 'done', adsFound, offersUpserted } };
  });

  app.get('/api/mining/daily/runs', async () => {
    const runs = await prisma.dailyMiningRun.findMany({ orderBy: { runDate: 'desc' }, take: 30 });
    return { success: true, data: runs.map(r => ({ ...r, runDate: r.runDate?.toISOString?.() ?? r.runDate })) };
  });
}
