// CAÇAOFERTA — Cliente centralizado de Supabase Auth (FASE 10).
//
// Este módulo fornece funções auxiliares para autenticação via Supabase,
// substituindo a estratégia temporária DEV_USER_ID.
//
// As chaves SUPABASE_ANON_KEY s�o seguras para uso no frontend/extensão.
// A SUPABASE_SERVICE_ROLE_KEY deve permanecer exclusivamente no backend.
//
// NÃO exponha SUPABASE_SERVICE_ROLE_KEY em código de React, Vite client,
// extensão, content script ou service worker público.
import { createClient } from '@supabase/supabase-js';

// Cliente de navegador/extensão — usa anon key (seguro para público)
export const supabase = createClient(
  process.env.SUPABASE_URL ?? '',
  process.env.SUPABASE_ANON_KEY ?? '',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

/** Obter sessão atual (do storage do navegador/extensão). */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Obter usuário atual. */
export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

/** Definir sessão a partir do callback do login (usado pelo Supabase Auth). */
export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

/** Registrar novo usuário. */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

/** Fazer logout e limpar sessão. */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Ouvinte de mudanças de sessão (para React Context / extensão). */
export type OnAuthStateChange = (
  event: 'SIGNED_IN' | 'SIGNED_OUT' | 'TOKEN_REFRESHED' | 'USER_UPDATED',
  session: any,
  user: any,
) => void;

/** Subcrever alterações de sessão. */
export async function onAuthStateChange(
  callback: OnAuthStateChange,
) {
  const { data, error } = await supabase.auth.onAuthStateChange(callback);
  if (error) throw error;
  return data.session;
}

export type { User, Session } from '@supabase/supabase-js';