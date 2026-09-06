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

/**
 * Usuário fallback para requisições sem Authorization header.
 * Quando definido, a API funciona sem autenticação (modo público).
 * Prioridade: DEV_USER_ENABLED > Supabase Auth > PUBLIC_USER_ID.
 * Fallback hardcoded: 'default-user' para evitar 500 quando a variável não está configurada.
 */
export const PUBLIC_USER_ID = process.env.PUBLIC_USER_ID || 'default-user';

/** URL do projeto Supabase (público - pode ser usado no frontend/extensão). */
export const SUPABASE_URL = process.env.SUPABASE_URL ?? '';

/** Chave pública do Supabase (pública - pode ser usada no frontend/extensão). */
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? '';

/** Chave de serviço do Supabase (SECRETA - somente backend). */
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/** URL do serviço de transcrição (STT). Ex: faster-whisper self-host ou API. */
export const TRANSCRIBE_API_URL = process.env.TRANSCRIBE_API_URL ?? '';

/** Chave do serviço de transcrição. */
export const TRANSCRIBE_API_KEY = process.env.TRANSCRIBE_API_KEY ?? '';

/** Chave da API OpenAI (para geração de imagem e transcrição). */
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? '';

/** Chave do provedor de estimativa de tráfego (SimilarWeb-like). */
export const TRAFFIC_API_KEY = process.env.TRAFFIC_API_KEY ?? '';

/** Segredo para proteger endpoints de cron (tracking automático). */
export const CRON_SECRET = process.env.CRON_SECRET ?? '';