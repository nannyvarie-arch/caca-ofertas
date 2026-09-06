import cors from '@fastify/cors';
import Fastify from 'fastify';
import { CORS_ORIGIN } from './config/env';
import { getPrisma } from './db/prisma';
import { registerErrorHandler } from './lib/apiError';
import { resolveCurrentUser, type CurrentUserResolver } from './lib/currentUser';
import { registerHealthRoutes } from './routes/health';
import { registerSavedAdsRoutes } from './routes/savedAds';
import { registerSearchHistoryRoutes } from './routes/searchHistory';
import { registerMiningRoutes } from './routes/mining';
import { registerTrackingRoutes } from './routes/tracking';
import { registerEbookRoutes } from './routes/ebooks';
import { registerExtensionRoutes } from './routes/extension';
import { registerTrackedOffersRoutes } from './routes/trackedOffers';
import { registerSwipeRoutes } from './routes/swipe';
import { registerMediaRoutes } from './routes/media';
import { registerCloneRoutes } from './routes/clone';
import { registerDashboardRoutes } from './routes/dashboard';
import { registerOffersRoutes } from './routes/offers';
import { registerDailyMiningRoutes } from './routes/dailyMining';
import { registerAdsIngestRoutes } from './routes/adsIngest';
import { registerSearchKeywordRoutes } from './routes/searchKeyword';
import { createPrismaSavedAdsStore, type SavedAdsStore } from './services/savedAdsStore';

export interface BuildServerOptions {
  /** Resolução do usuário atual (injetável nos testes). Default: dev/env. */
  resolveUser?: CurrentUserResolver;
  /** Armazenamento de ofertas (injetável nos testes). Default: Prisma real. */
  savedAdsStore?: SavedAdsStore;
}

export function buildServer(options: BuildServerOptions = {}): ReturnType<typeof Fastify> {
  const server = Fastify({ logger: true });

  void server.register(cors, {
    origin: CORS_ORIGIN,
  });

  registerErrorHandler(server);
  registerHealthRoutes(server);

  const resolveUser = options.resolveUser ?? resolveCurrentUser;

  registerSavedAdsRoutes(server, {
    store: options.savedAdsStore ?? createPrismaSavedAdsStore(getPrisma()),
    resolveUser,
  });

  registerSearchHistoryRoutes(server, { resolveUser });
  registerMiningRoutes(server, { resolveUser });
  registerTrackingRoutes(server, { resolveUser });
  registerEbookRoutes(server, { resolveUser });
  registerExtensionRoutes(server, { resolveUser });
  registerTrackedOffersRoutes(server, { resolveUser });
  registerSwipeRoutes(server, { resolveUser });
  registerMediaRoutes(server, { resolveUser });
  registerCloneRoutes(server, { resolveUser });
  registerDashboardRoutes(server, { resolveUser });
  registerOffersRoutes(server, { resolveUser });
  registerDailyMiningRoutes(server, { resolveUser });
  registerAdsIngestRoutes(server, { resolveUser });
  registerSearchKeywordRoutes(server, { resolveUser });

  return server;
}