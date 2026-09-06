// CAÇAOFERTA — Contrato de persistência de ofertas salvas (FASE 06).
//
// Regra arquitetural: a payload de /api/saved-ads respeita EXATAMENTE o
// contrato `NormalizedAd` (tokens normalizados em EN). Não existe uma segunda
// definição dos dados — os enums abaixo referenciam @caca-oferta/types para
// garantir uma única fonte de verdade.
//
// O identificador primário da oferta é `adLibraryId`. Deduplicação:
// UNIQUE(user_id, ad_library_id). A UI trata ALREADY_SAVED como estado normal.

import { NORMALIZED_PLATFORMS } from '@caca-oferta/types';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Validação de datas de calendário (YYYY-MM-DD). NUNCA inferir fuso: a data é
// um dia no calendário da Meta, não um instante.
// ---------------------------------------------------------------------------
function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12) return false;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

const isoDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data deve estar no formato YYYY-MM-DD.')
  .refine(isCalendarDate, 'Data de calendário inválida.');

function httpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

const nullableUrl = z
  .string()
  .max(2048)
  .refine(httpUrl, 'URL deve ser http(s).')
  .nullish()
  .transform((value) => value ?? null);

// ---------------------------------------------------------------------------
// Schema de entrada do POST /api/saved-ads (dados do NormalizedAd).
// Campos administrativos (userId, id, savedAt, ...) NÃO são aceitos: o userId
// vem do contexto do backend (resolveCurrentUser), nunca do corpo.
// ---------------------------------------------------------------------------
export const SavedAdSubmitSchema = z.object({
  adLibraryId: z.string().trim().min(1, 'adLibraryId é obrigatório.').max(128),
  pageId: z.string().trim().max(64).nullish().transform((value) => value ?? null),
  pageName: z.string().trim().max(500).nullish().transform((value) => value ?? null),
  status: z.enum(['active', 'inactive', 'unknown']),
  deliveryStartDate: isoDateField.nullish().transform((value) => value ?? null),
  deliveryStopDate: isoDateField.nullish().transform((value) => value ?? null),
  runningDays: z.number().int().min(0).max(365_000).nullish().transform((value) => value ?? null),
  platforms: z
    .array(z.enum(NORMALIZED_PLATFORMS))
    .max(8)
    .default([]),
  mediaType: z.enum(['image', 'video', 'carousel', 'unknown']),
  creativeText: z.string().max(20_000).nullish().transform((value) => value ?? null),
  headline: z.string().max(1_000).nullish().transform((value) => value ?? null),
  description: z.string().max(5_000).nullish().transform((value) => value ?? null),
  cta: z.string().max(200).nullish().transform((value) => value ?? null),
  destinationUrl: nullableUrl,
  destinationDomain: z
    .string()
    .trim()
    .max(253)
    .regex(
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/,
      'Domínio de destino inválido.',
    )
    .nullish()
    .transform((value) => value ?? null),
  adSnapshotUrl: nullableUrl,
  creativeUrl: nullableUrl,
  thumbnailUrl: nullableUrl,
  // parseConfidence é aceito (extensão manda o NormalizedAd completo) mas NÃO
  // é persistido: é apenas para depuração do parser.
  parseConfidence: z.enum(['high', 'medium', 'low']).optional(),
});

export type SavedAdSubmit = z.infer<typeof SavedAdSubmitSchema>;

// ---------------------------------------------------------------------------
// DTO de resposta — forma canônica de uma oferta salva para a UI (extensão).
// Não expõe userId (least privilege): o cliente consome apenas os dados do
// anúncio + metadados da oferta salva.
// ---------------------------------------------------------------------------
export const SavedAdDtoSchema = z.object({
  id: z.string(),
  adLibraryId: z.string(),
  pageId: z.string().nullable(),
  pageName: z.string().nullable(),
  status: z.enum(['active', 'inactive', 'unknown']),
  deliveryStartDate: z.string().nullable(),
  deliveryStopDate: z.string().nullable(),
  runningDays: z.number().int().nullable(),
  platforms: z.array(z.enum(NORMALIZED_PLATFORMS)),
  mediaType: z.enum(['image', 'video', 'carousel', 'unknown']),
  creativeText: z.string().nullable(),
  headline: z.string().nullable(),
  description: z.string().nullable(),
  cta: z.string().nullable(),
  destinationUrl: z.string().nullable(),
  destinationDomain: z.string().nullable(),
  adSnapshotUrl: z.string().nullable(),
  creativeUrl: z.string().nullable(),
  thumbnailUrl: z.string().nullable(),
  savedAt: z.string(),
  updatedAt: z.string(),
});

export type SavedAdDto = z.infer<typeof SavedAdDtoSchema>;

export const SavedAdListDtoSchema = z.object({
  items: z.array(SavedAdDtoSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});

export type SavedAdListDto = z.infer<typeof SavedAdListDtoSchema>;

// ---------------------------------------------------------------------------
// Envelopes de resposta (padrão único da API CaçaOferta para /saved-ads).
// ---------------------------------------------------------------------------
export interface SavedAdMutationResponse {
  success: true;
  data: SavedAdDto;
}

export interface SavedAdListResponse {
  success: true;
  data: SavedAdListDto;
}

export interface SavedAdExistsResponse {
  success: false;
  code: 'ALREADY_SAVED';
  message: string;
}

export interface SavedAdValidationResponse {
  success: false;
  code: 'VALIDATION_ERROR';
  message: string;
  issues?: Array<{ path: string; message: string }>;
}

export interface SavedAdNotFoundResponse {
  success: false;
  code: 'NOT_FOUND';
  message: string;
}

export interface SavedAdUnauthorizedResponse {
  success: false;
  code: 'UNAUTHORIZED';
  message: string;
}

// ---------------------------------------------------------------------------
// FASE 11 — Novos tipos: tags, notas, classificação, score
// ---------------------------------------------------------------------------

export interface TagDto {
  id: string;
  name: string;
  color?: string;
  isDefault: boolean;
  createdAt: string;
  adLibraryId: string;
}

export type NewTagInput = {
  name: string;
  color?: string;
  adLibraryId: string;
};

export interface NoteDto {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  savedAdId: string;
}

export type NewNoteInput = {
  body: string;
};

export interface ClassificationDto {
  classification: number; // 1 a 5
  score: number; // 0 a 100
}

export type NewClassificationInput = {
  classification: number; // 1 a 5;
};

export interface ScoreDto {
  score: number; // 0 a 100
  computedAt: string;
}