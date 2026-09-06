export const HOST = process.env.API_HOST ?? '0.0.0.0';
export const PORT = Number.parseInt(process.env.API_PORT ?? '3333', 10);
export const CORS_ORIGIN = process.env.WEB_URL ?? '*';
export const NODE_ENV = process.env.NODE_ENV ?? 'development';

/**
 * [DEPRECATED FASE 10] Identificador de usuário de desenvolvimento.
 * Esta variável NÃO é mais usada para autenticação real.
 * Substituída pela leitura do token Bearer do Supabase Auth a partir do header Authorization.
 * Mantenha vazia ou definida apenas para testes automatizados isolados.
 */
export const DEV_USER_ID = process.env.DEV_USER_ID ?? '';

/** true apenas em desenvolvimento e quando DEV_USER_ID está definido (modo legado). */
export const DEV_USER_ENABLED = NODE_ENV !== 'production' && DEV_USER_ID.length > 0;

/** URL do projeto Supabase (público - pode ser usado no frontend/extensão). */
export const SUPABASE_URL = process.env.SUPABASE_URL ?? '';

/** Chave pública do Supabase (pública - pode ser usada no frontend/extensão). */
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

/** Chave de serviço do Supabase (SECRETA - somente backend). */
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';