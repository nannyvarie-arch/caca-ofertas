// CAÇAOFERTA — Definição do protocolo de mensagens da extensão (FASE 06).
//
// O content script e o popup NUNCA falam diretamente com a API: tudo passa
// pelo service worker (message router), que centraliza o acesso ao backend
// (evita CORS e mantém o tráfego controlado). Este arquivo é o ÚNICO lugar
// que define os formatos trocados entre as três partes da extensão.

import type { NormalizedAd } from '@caca-oferta/types';
import type { SavedAdDto, SavedAdListDto } from '@caca-oferta/shared';

export const RuntimeMessageType = {
  SaveSavedAd: 'saved-ads:save',
  ListSavedAds: 'saved-ads:list',
  GetSavedAd: 'saved-ads:get',
  DeleteSavedAd: 'saved-ads:delete',
  // FASE 11 — Tags
  ListTags: 'saved-ads:tags:list',
  CreateTag: 'saved-ads:tags:create',
  DeleteTag: 'saved-ads:tags:delete',
  // FASE 11 — Notas
  ListNotes: 'saved-ads:notes:list',
  CreateNote: 'saved-ads:notes:create',
  // FASE 11 — Classificação e Score
  GetClassification: 'saved-ads:classification:get',
  SetClassification: 'saved-ads:classification:set',
  GetScore: 'saved-ads:score:get',
  // FASE 11 — Favoritos
  ToggleFavorite: 'saved-ads:favorite:toggle',
  // FASE 11 — Comparação
  CompareAds: 'saved-ads:compare',
} as const;

export type RuntimeMessageTypeValue = (typeof RuntimeMessageType)[keyof typeof RuntimeMessageType];

/**
 * Mensagens aceitas pelo service worker. O payload de save é o NormalizedAd
 * completo — o backend é a ÚNICA fonte de validação do contrato.
 */
export type RuntimeRequest =
  | { type: typeof RuntimeMessageType.SaveSavedAd; payload: NormalizedAd }
  | { type: typeof RuntimeMessageType.ListSavedAds; page?: number; pageSize?: number }
  | { type: typeof RuntimeMessageType.GetSavedAd; id: string }
  | { type: typeof RuntimeMessageType.DeleteSavedAd; id: string }
  // FASE 11 — Tags
  | { type: typeof RuntimeMessageType.ListTags; id: string }
  | { type: typeof RuntimeMessageType.CreateTag; id: string; name: string; color?: string }
  | { type: typeof RuntimeMessageType.DeleteTag; id: string; tagId: string }
  // FASE 11 — Notas
  | { type: typeof RuntimeMessageType.ListNotes; id: string }
  | { type: typeof RuntimeMessageType.CreateNote; id: string; body: string }
  // FASE 11 — Classificação e Score
  | { type: typeof RuntimeMessageType.GetClassification; id: string }
  | { type: typeof RuntimeMessageType.SetClassification; id: string; classification: number }
  | { type: typeof RuntimeMessageType.GetScore; id: string }
  // FASE 11 — Favoritos
  | { type: typeof RuntimeMessageType.ToggleFavorite; id: string }
  // FASE 11 — Comparação
  | { type: typeof RuntimeMessageType.CompareAds; ids: string[] };

export type RuntimeSuccess<T> = { ok: true; data: T };
export type RuntimeFailure = { ok: false; code: string; message: string };
export type RuntimeResponse<T = unknown> = RuntimeSuccess<T> | RuntimeFailure;

/** Códigos de falha padrão do runtime da extensão (mímicos dos erro codes da API). */
export const RUNTIME_ERROR_CODES = {
  ALREADY_SAVED: 'ALREADY_SAVED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL: 'INTERNAL',
  NETWORK_ERROR: 'NETWORK_ERROR',
  MESSAGE_FAILED: 'MESSAGE_FAILED',
  /** chrome.runtime indisponível (ex.: testes ou contexto inválido). */
  CONTEXT_UNAVAILABLE: 'CONTEXT_UNAVAILABLE',
} as const;

export function runtimeSuccess<T>(data: T): RuntimeSuccess<T> {
  return { ok: true, data };
}

export function runtimeFailure(code: string, message: string): RuntimeFailure {
  return { ok: false, code, message };
}

export type SavedAdSaveResult = RuntimeResponse<SavedAdDto>;
export type SavedAdListResult = RuntimeResponse<SavedAdListDto>;