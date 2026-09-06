// CAÇAOFERTA — Resolução do usuário atual (FASE 10).
//
// Substitui a estratégia temporária DEV_USER_ID pela leitura do token de
// sessão do Supabase Auth a partir do header Authorization Bearer.
//
// Contrato de resolução do usuário atual (injetável nos testes).
//
// Prioridade de resolução:
//   1. DEV_USER_ENABLED (dev mode) → DEV_USER_ID
//   2. Authorization Bearer token → Supabase Auth
//   3. Sem token → PUBLIC_USER_ID (fallback público, evita 500)
import type { FastifyRequest } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { DEV_USER_ID, DEV_USER_ENABLED, PUBLIC_USER_ID } from '../config/env';

export type CurrentUserResolver = (request: FastifyRequest) => Promise<{ userId: string }>;

/** Resolve o usuário a partir do token Bearer no header Authorization. */
export async function resolveCurrentUser(
  request: FastifyRequest,
): Promise<{ userId: string }> {
  if (DEV_USER_ENABLED) {
    return { userId: DEV_USER_ID };
  }

  const authHeader = request.headers.authorization ?? '';

  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice('bearer '.length).trim();

    if (token) {
      try {
        const supa = createClient(
          process.env.SUPABASE_URL ?? '',
          process.env.SUPABASE_ANON_KEY ?? '',
        );

        const { data, error } = await supa.auth.getUser(token);

        if (!error && data.user?.id) {
          return { userId: data.user.id };
        }
      } catch {
        // Token validation failed — fall through to PUBLIC_USER_ID
      }
    }
  }

  // Fallback: público (sem autenticação)
  return { userId: PUBLIC_USER_ID };
}