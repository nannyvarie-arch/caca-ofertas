// CAÇAOFERTA — Cliente Prisma (FASE 06).
// Único ponto de criação do PrismaClient (backend DB), lazy (só instancia
// quando o store real é necessário — testes herméticos não o criam).
// Secrets (DATABASE_URL) ficam exclusivamente no servidor — o cliente NUNCA
// chega à extensão.

import { PrismaClient } from '@caca-oferta/database';

let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!client) client = new PrismaClient();
  return client;
}