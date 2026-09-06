// CAÇAOFERTA — Datas: extração de frases de texto e normalização ISO.
// Nunca inferir data que não apareça na página: retorna null.

import {
  MONTH_NAMES_EN,
  MONTHS_PT_TO_EN,
  START_DATE_PREFIX_PATTERN,
  STOP_DATE_PREFIX_PATTERN,
} from './patterns';
import { findTextMatch, normalizeText } from './text';

export type DatePrefixKind = 'start' | 'stop';

function prefixPatternFor(kind: DatePrefixKind): RegExp {
  return kind === 'start' ? START_DATE_PREFIX_PATTERN : STOP_DATE_PREFIX_PATTERN;
}

/**
 * Traduz meses em pt-BR para inglês para o Date.parse() entender.
 * Ordena por tamanho decrescente primeiro: "marco" é substituído antes de
 * "mar", evitando que a abreviação corrompa o mês por extenso.
 */
function translateMonthsToEn(phrase: string): string {
  const entries = Object.entries(MONTHS_PT_TO_EN).sort((a, b) => b[0].length - a[0].length);
  let out = phrase;
  for (const [pt, en] of entries) {
    out = out.replace(new RegExp(`\\b${pt}\\b`, 'i'), en);
  }
  return out;
}

/**
 * A data extraída é uma data de calendário ("22 de agosto de 2026"), não um
 * instante. Usamos os componentes LOCAIS do Date.parse: um fuso positivo (+14)
 * não pode transformar 22/08 em 21/08 — o resultado é sempre a data informada.
 */
function calendarDateOf(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Converte DD/MM/AAAA em 'YYYY-MM-DD'. */
function fromDmy(d: string, m: string, y: string): string | null {
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Tenta extrair uma data 'YYYY-MM-DD' de uma frase; null quando indisponível/inválida.
 * Suporta "August 22, 2026", "22 de agosto de 2026", "22/08/2026", "2026-08-22".
 */
export function extractIsoDateFromPhrase(rawPhrase: string): string | null {
  const phrase = normalizeText(rawPhrase);
  if (!phrase) return null;

  // Formato numérico: DD/MM/AAAA (europeu) ou AAAA-MM-DD (ISO).
  const dmy = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/.exec(phrase);
  if (dmy) {
    const [, d, m, y] = dmy;
    if (!d || !m || !y) return null;
    return fromDmy(d, m, y);
  }
  const iso = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/.exec(phrase);
  if (iso) {
    const [, y, m, d] = iso;
    if (!y || !m || !d) return null;
    return fromDmy(d, m, y);
  }

  // Fechar contas com Date.parse: meses em EN; pt-BR traduzido antes.
  // Remove partículas pt (de/da/do/em): "22 de agosto de 2026" → "22 agosto 2026".
  const stripped = phrase.replace(/(^|\s)(?:de|da|do|em|no|na)(?=\s)/gi, ' ');
  const translated = translateMonthsToEn(stripped);
  const hasEnglishMonth = MONTH_NAMES_EN.some((m) => new RegExp(`\\b${m}\\b`, 'i').test(translated));
  if (!hasEnglishMonth) return null;

  const parsed = new Date(translated);
  if (Number.isNaN(parsed.getTime())) return null;
  const year = parsed.getFullYear();
  if (year < 1900 || year > 2100) return null;
  return calendarDateOf(parsed);
}

/**
 * Localiza no card a frase "Started running on ..." (ou equivalente) e extrai a data.
 */
export function extractDateFromElement(root: Element, kind: DatePrefixKind): string | null {
  const pattern = prefixPatternFor(kind);
  const leaf = findTextMatch(root, pattern);
  if (!leaf) return null;

  const match = pattern.exec(leaf);
  if (!match) return null;
  const rest = leaf.slice(match.index + match[0].length);
  // Recorta no primeiro limite provável (bullets/separadores), preservando "22, 2026".
  const candidate = rest.split(/[—–•·]|\s\|\s|\n| \/\s?/)[0];
  if (!candidate) return null;
  return extractIsoDateFromPhrase(candidate);
}

/** Converte 'YYYY-MM-DD' em milissegundos UTC (data de calendário). */
function isoToUtcMs(iso: string): number | null {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d);
}

/** Meia-noite local de `now` (mantém o contrato legado: hoje = data local). */
function todayMidnightMs(now: Date): number {
  const ref = now && !Number.isNaN(now.getTime()) ? now : new Date();
  return Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate());
}

export interface RunningDaysOptions {
  /** Data de encerramento informada pelo anúncio (YYYY-MM-DD) ou null. */
  stopIso?: string | null;
  /** Status detectado (active | inactive | unknown) ou null/ausente. */
  status?: 'active' | 'inactive' | 'unknown' | null;
  /** Referência de "hoje" (injetável nos testes). */
  now?: Date;
}

/**
 * Dias de veiculação calculados (seção 12 da FASE 04):
 * - anúncio ativo (ou status desconhecido/ausente): hoje − início;
 * - anúncio encerrado com data de encerramento: fim − início;
 * - anúncio encerrado sem data de encerramento → null;
 * - sem data de início válida → null.
 * Nunca negativo (datas futuras → 0).
 *
 * Compatibilidade: a assinatura antiga `calculateRunningDays(iso, Date)` ainda
 * funciona e preserva o comportamento legado (hoje − início).
 */
export function calculateRunningDays(startIso: string, nowOrOpts?: Date | RunningDaysOptions): number | null {
  const opts: RunningDaysOptions = nowOrOpts instanceof Date ? { now: nowOrOpts } : (nowOrOpts ?? {});
  const parsed = extractIsoDateFromPhrase(startIso);
  if (!parsed) return null;
  const startMs = isoToUtcMs(parsed);
  if (startMs === null) return null;

  if (opts.status === 'inactive') {
    const stop = opts.stopIso ? extractIsoDateFromPhrase(opts.stopIso) : null;
    if (!stop) return null;
    const stopMs = isoToUtcMs(stop);
    if (stopMs === null) return null;
    const diff = Math.floor((stopMs - startMs) / 86_400_000);
    return diff <= 0 ? 0 : diff;
  }

  const diff = Math.floor((todayMidnightMs(opts.now ?? new Date()) - startMs) / 86_400_000);
  return diff <= 0 ? 0 : diff;
}