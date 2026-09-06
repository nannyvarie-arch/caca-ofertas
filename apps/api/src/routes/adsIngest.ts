import type { FastifyInstance } from 'fastify';
import type { CurrentUserResolver } from '../lib/currentUser';
import { getPrisma } from '../db/prisma';

export interface AdsIngestRouteDeps {
  resolveUser: CurrentUserResolver;
}

const LOW_TICKET_CHECKOUTS = ['hotmart', 'kiwify', 'cakto', 'monetizze', 'braip', 'ticto', 'perfectpay', 'eduzz'];
const LOW_TICKET_PRICE_RANGE = { min: 9, max: 97 };

function detectLowTicket(signals: any): { isLowTicket: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (signals.destinationUrl) {
    const url = signals.destinationUrl.toLowerCase();
    for (const checkout of LOW_TICKET_CHECKOUTS) {
      if (url.includes(checkout)) { reasons.push(`checkout: ${checkout}`); break; }
    }
  }
  if (signals.mediaType === 'image' && (signals.runningDays ?? 0) > 7) {
    reasons.push('image ad running 7+ days');
  }
  if (signals.hasCheckoutPage) reasons.push('has checkout page');
  return { isLowTicket: reasons.length > 0, reasons };
}

export function registerAdsIngestRoutes(app: FastifyInstance, deps: AdsIngestRouteDeps): void {
  const prisma = getPrisma();

  app.post('/api/ads/ingest', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const body = request.body as { ads: any[] };

    if (!body.ads || !Array.isArray(body.ads) || body.ads.length === 0) {
      return { success: false, error: 'ads array obrigatório.' };
    }

    let ingested = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!(global as any).__pendingIngests) (global as any).__pendingIngests = [];

    for (const raw of body.ads) {
      if (!raw.adArchiveId) continue;

      const detection = detectLowTicket(raw);

      const ingestData = {
        adArchiveId: raw.adArchiveId,
        pageId: raw.pageId,
        pageName: raw.pageName,
        destinationUrl: raw.destinationUrl,
        destinationDomain: raw.destinationDomain,
        country: raw.country ?? 'BR',
        language: raw.language ?? 'pt',
        mediaType: raw.mediaType ?? 'unknown',
        activeAds: raw.activeAds ?? 1,
        totalAds: raw.totalAds ?? 1,
        creativeCount: raw.creativeCount ?? 1,
        runningDays: raw.runningDays ?? 0,
        isLowTicket: detection.isLowTicket,
        lowTicketSignals: detection.reasons,
      };

      (global as any).__pendingIngests.push(ingestData);

      await prisma.offer.upsert({
        where: { adLibraryId: raw.adArchiveId },
        create: {
          adLibraryId: raw.adArchiveId,
          pageId: raw.pageId,
          pageName: raw.pageName,
          advertiserName: raw.pageName,
          primaryDomain: raw.destinationDomain,
          funnelUrl: raw.destinationUrl,
          adLibraryUrl: raw.pageId
            ? `https://www.facebook.com/ads/library/?active_status=all&ad_type=all&country=${raw.country ?? 'ALL'}&view_all_page_id=${raw.pageId}`
            : `https://www.facebook.com/ads/library/?id=${raw.adArchiveId}`,
          country: raw.country ?? 'BR',
          language: raw.language ?? 'pt',
          mediaType: raw.mediaType ?? 'unknown',
          isLowTicket: detection.isLowTicket,
          lowTicketSignals: detection.reasons,
          lastSeenAt: new Date(),
          lastRunDate: today,
        },
        update: {
          pageId: raw.pageId ?? undefined,
          pageName: raw.pageName ?? undefined,
          primaryDomain: raw.destinationDomain ?? undefined,
          funnelUrl: raw.destinationUrl ?? undefined,
          lastSeenAt: new Date(),
          lastRunDate: today,
        },
      });

      ingested++;
    }

    return { success: true, data: { ingested, queued: ingested } };
  });
}
