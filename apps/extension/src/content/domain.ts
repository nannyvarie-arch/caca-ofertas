// CAÇAOFERTA — Extração e normalização de domínios (FASE 03).
//
// normalizeDomain() é a função central: valida a entrada, rejeita protocolos
// que não sejam http(s), descarta protocolo/caminho/query/fragmento/porta,
// normaliza lowercase e colapsa o host para o domínio registrável usando a
// public suffix list (tldts). Subdomínios legítimos (shop., checkout., www.)
// seguem a MESMA regra definida (PSL): www é removido e subdomínios são
// colapsados para a base registrável — o que agrupa anúncios do mesmo
// anunciante sob um único domínio pesquisável.
//
// Regra de segurança: NUNCA são gerados domínios inventados. Hosts da própria
// Meta (l.facebook.com, fb.me, ...) NÃO são destinos externos válidos e
// retornam null. Domínios internacionalizados são convertidos para punycode
// pelo parser de URL nativo (sem conversão manual).

import { parse } from 'tldts';

const SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;
const TRAILING_DOT = /\.$/;

/**
 * Hosts da própria Meta que nunca representam um destino externo legítimo
 * (redirecionadores de clique, Messenger, páginas internas da Biblioteca).
 */
export function isMetaInternalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === 'facebook.com' ||
    h.endsWith('.facebook.com') ||
    h === 'fb.me' ||
    h.endsWith('.fb.me') ||
    h === 'fb.watch' ||
    h === 'm.me' ||
    h === 'on.fb.me'
  );
}

/** Converte a entrada para uma URL http(s) absoluta; null quando inválida. */
function toHttpUrlOrNull(input: string): URL | null {
  const candidate = SCHEME_PATTERN.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return null;
  }
  return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
}

/**
 * Extração: valida a entrada e devolve o hostname (minúsculo, sem porta,
 * sem ponto final). Rejeita protocolos não-http(s), entradas que não sejam
 * URLs absolutas ou equivalentes a um hostname, e hosts internos da Meta.
 */
export function extractDomain(input: string | null | undefined): string | null {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  const url = toHttpUrlOrNull(trimmed);
  if (!url) return null;
  const hostname = url.hostname.toLowerCase().replace(TRAILING_DOT, '');
  if (!hostname || isMetaInternalHost(hostname)) return null;
  return hostname;
}

/**
 * Normalização central (seção 09):
 *  1. valida  2. parseia  3. remove protocolo  4. remove www "quando apropriado"
 *  5. remove porta  6. remove caminho  7. remove query  8. remove fragmento
 *  9. lowercases  10. valida hostname registrável  11. retorna domínio ou null.
 * A remoção de www/subdomínios usa a regra do PSL (definida e consistente).
 */
export function normalizeDomain(input: string | null | undefined): string | null {
  const hostname = extractDomain(input);
  if (!hostname) return null;
  const registrable = parse(hostname).domain;
  if (!registrable) return null;
  return registrable.toLowerCase();
}

/**
 * URL https://<domínio>/ para abertura segura, sempre sob ação explícita do
 * usuário. Retorna null quando o domínio não é válido.
 */
export function domainOriginUrl(domain: string): string | null {
  const normalized = normalizeDomain(domain);
  if (!normalized) return null;
  const url = new URL(`https://${normalized}`);
  return url.toString();
}

/** Barreira de segurança: somente http/https podem ser abertas (jamais javascript:, data:, ...). */
export function isSafeHttpUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  return parsed.protocol === 'http:' || parsed.protocol === 'https:';
}