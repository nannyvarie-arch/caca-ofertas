// CAÇAOFERTA — Resolução do usuário atual (FASE 10).
//
// Substitui a estratégia temporária DEV_USER_ID pela leitura do token de
// sessão do Supabase Auth a partir do header Authorization Bearer.
//
// Contrato de resolução do usuário atual (injetável nos testes).
import type { FastifyRequest } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { DEV_USER_ID, DEV_USER_ENABLED } from '../config/env';

export type CurrentUserResolver = (request: FastifyRequest) => Promise<{ userId: string }>;

/** Resolve o usuário a partir do token Bearer no header Authorization. */
export async function resolveCurrentUser(
  request: FastifyRequest,
): Promise<{ userId: string }> {
  if (DEV_USER_ENABLED) {
    return { userId: DEV_USER_ID };
  }

  try {
    const authHeader = request.headers.authorization ?? '';

    if (!authHeader.toLowerCase().startsWith('bearer ')) {
      throw new Error('Header Authorization ausente ou incompleto.');
    }

    const token = authHeader.slice('bearer '.length).trim();

    if (!token) {
      throw new Error('Token de autenticação vazio.');
    }

    // Usa o cliente Supabase JS para validar o token e obter o usuário
    const supa = createClient(
      process.env.SUPABASE_URL ?? '',
      process.env.SUPABASE_ANON_KEY ?? '',
    );

    const { data, error } = await supa.auth.getUser(token);

    if (error || !data.user?.id) {
      throw new Error('Token inválido ou usuário não encontrado: ' + (error?.message ?? ''));
    }

    return { userId: data.user.id };
  } catch (e: any) {
    const errorMessage = e instanceof Error ? e.message : 'Usuário não autenticado';
    throw new Error(errorMessage, { cause: e });
  }
}