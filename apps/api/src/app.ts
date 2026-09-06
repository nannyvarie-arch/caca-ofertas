import cors from '@fastify/cors';
import Fastify from 'fastify';
import { CORS_ORIGIN } from './config/env';
import { getPrisma } from './db/prisma';
import { registerErrorHandler } from './lib/apiError';
import { resolveCurrentUser, type CurrentUserResolver } from './lib/currentUser';
import { registerHealthRoutes } from './routes/health';
import { registerSavedAdsRoutes } from './routes/savedAds';
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

  registerSavedAdsRoutes(server, {
    store: options.savedAdsStore ?? createPrismaSavedAdsStore(getPrisma()),
    resolveUser: options.resolveUser ?? resolveCurrentUser,
  });

  return server;
}