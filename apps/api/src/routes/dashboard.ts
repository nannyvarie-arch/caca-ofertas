import type { FastifyInstance } from 'fastify';
import type { CurrentUserResolver } from '../lib/currentUser';
import { getPrisma } from '../db/prisma';
import { TRAFFIC_API_KEY } from '../config/env';

export interface DashboardRouteDeps {
  resolveUser: CurrentUserResolver;
}

export function registerDashboardRoutes(app: FastifyInstance, deps: DashboardRouteDeps): void {
  const prisma = getPrisma();

  app.get('/api/dashboard/summary', async (request) => {
    const { userId } = await deps.resolveUser(request);

    const [
      totalOfertas,
      ativas,
      inativas,
      favoritas,
      qualificadas,
      totalScore,
      totalClassificacao,
      scoredAds,
      classifiedAds,
      topDomains,
      trackedOffers,
      scalingOffers,
    ] = await Promise.all([
      prisma.savedAd.count({ where: { userId } }),
      prisma.savedAd.count({ where: { userId, statusSnapshot: 'active' } }),
      prisma.savedAd.count({ where: { userId, statusSnapshot: 'inactive' } }),
      prisma.savedAd.count({ where: { userId, isFavorite: true } }),
      prisma.savedAd.count({ where: { userId, classification: { gte: 4 } } }),
      prisma.savedAd.aggregate({ where: { userId, score: { not: null } }, _sum: { score: true } }),
      prisma.savedAd.aggregate({ where: { userId, classification: { not: null } }, _sum: { classification: true } }),
      prisma.savedAd.count({ where: { userId, score: { not: null } } }),
      prisma.savedAd.count({ where: { userId, classification: { not: null } } }),
      prisma.$queryRaw`SELECT d.domain, COUNT(*)::int as count FROM "SavedAd" sa JOIN "Domain" d ON sa."domainId" = d.id WHERE sa."userId" = ${userId} GROUP BY d.domain ORDER BY count DESC LIMIT 5`,
      prisma.trackedOffer.count({ where: { userId } }),
      prisma.trackedOffer.count({ where: { userId, status: 'scaling' } }),
    ]);

    return {
      success: true,
      data: {
        totalOfertas,
        ativas,
        inativas,
        desconhecidas: totalOfertas - ativas - inativas,
        favoritas,
        qualificadas,
        totalScore: totalScore._sum.score ?? 0,
        mediaScore: scoredAds > 0 ? Math.round((totalScore._sum.score ?? 0) / scoredAds) : 0,
        mediaClassificacao: classifiedAds > 0 ? Math.round(((totalClassificacao._sum.classification ?? 0) / classifiedAds) * 10) / 10 : 0,
        scoredAds,
        classifiedAds,
        topDomains: (topDomains as any[]).map((d: any) => ({ domain: d.domain, count: d.count })),
        rastreando: trackedOffers,
        escalando: scalingOffers,
      },
    };
  });

  app.get('/api/dashboard/traffic-estimate/:domain', async (request) => {
    const { domain } = request.params as { domain: string };
    if (!TRAFFIC_API_KEY) {
      return { success: true, data: null, message: 'Estimativa de tráfego indisponível. Configure TRAFFIC_API_KEY.', configured: false };
    }
    return { success: true, data: null, configured: true, message: 'Integração com provedor de tráfego configurada.' };
  });
}
