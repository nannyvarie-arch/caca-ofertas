// CAÇAOFERTA — Cliente HTTP do service worker para a API CaçaOferta (FASE 06).
//
// ÚNICO ponto com acesso à rede no backend da extensão: content script e popup
// passam mensagens para cá e este módulo faz o fetch (MV3: fetch permitido
// apenas no service worker; aqui não há CORS pois host_permissions cobre a API).
//
// Nunca lança para falhas HTTP: erros da API (envelope { success:false, error })
// viram RuntimeFailure com o MESMO code do backend (ex.: ALREADY_SAVED).

import {
  API_BASE_URL,
  API_SAVED_ADS_PATH,
  type SavedAdDto,
  type SavedAdListDto,
} from '@caca-oferta/shared';
import type { NormalizedAd } from '@caca-oferta/types';
import { RUNTIME_ERROR_CODES, runtimeFailure, type RuntimeFailure } from '../bridge/messages';

interface ApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
  };
}

const FALLBACK_MESSAGES: Record<string, string> = {
  ALREADY_SAVED: 'Esta oferta já está salva.',
  VALIDATION_ERROR: 'Dados inválidos para salvar a oferta.',
  UNAUTHORIZED: 'Autenticação não disponível neste ambiente.',
  NOT_FOUND: 'Oferta não encontrada.',
};

async function httpRequest<T>(
  method: 'GET' | 'POST' | 'DELETE' | 'PATCH',
  path: string,
  body?: unknown,
): Promise<RuntimeFailure | { ok: true; data: T }> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return runtimeFailure(RUNTIME_ERROR_CODES.NETWORK_ERROR, 'Não foi possível conectar à plataforma.');
  }

  const code = String(response.status);
  if (response.status === 204) {
    return { ok: true, data: undefined as T };
  }

  let parsed: unknown;
  try {
    parsed = await response.json();
  } catch {
    return runtimeFailure(RUNTIME_ERROR_CODES.INTERNAL, 'Resposta inválida da plataforma.');
  }

  if (response.ok) {
    const payload = parsed as { data?: T };
    if (parsed && typeof parsed === 'object' && 'data' in parsed) {
      return { ok: true, data: payload.data as T };
    }
    return runtimeFailure(RUNTIME_ERROR_CODES.INTERNAL, 'Formato de resposta inesperado.');
  }

  const apiError = parsed as ApiErrorEnvelope;
  const errorCode = apiError?.error?.code ?? (code === '409' ? RUNTIME_ERROR_CODES.ALREADY_SAVED : code);
  const fallback = FALLBACK_MESSAGES[errorCode] ?? 'Não foi possível concluir a operação.';
  return runtimeFailure(errorCode, apiError?.error?.message ?? fallback);
}

export interface SavedAdsApiClient {
  saveAd(payload: NormalizedAd): Promise<RuntimeFailure | { ok: true; data: SavedAdDto }>;
  listSavedAds(page?: number, pageSize?: number): Promise<RuntimeFailure | { ok: true; data: SavedAdListDto }>;
  getSavedAd(id: string): Promise<RuntimeFailure | { ok: true; data: SavedAdDto }>;
  deleteSavedAd(id: string): Promise<RuntimeFailure | { ok: true; data: { id: string; deleted: true } }>;
  /** Requisição genérica para endpoints adicionais. */
  request<T>(method: 'GET' | 'POST' | 'DELETE' | 'PATCH', path: string, body?: unknown): Promise<RuntimeFailure | { ok: true; data: T }>;
}

export function createSavedAdsApiClient(): SavedAdsApiClient {
  return {
    saveAd(payload) {
      return httpRequest<SavedAdDto>('POST', API_SAVED_ADS_PATH, payload);
    },
    listSavedAds(page = 1, pageSize = 50) {
      return httpRequest<SavedAdListDto>('GET', `${API_SAVED_ADS_PATH}?page=${page}&pageSize=${pageSize}`);
    },
    getSavedAd(id) {
      return httpRequest<SavedAdDto>('GET', `${API_SAVED_ADS_PATH}/${encodeURIComponent(id)}`);
    },
    deleteSavedAd(id) {
      return httpRequest<{ id: string; deleted: true }>('DELETE', `${API_SAVED_ADS_PATH}/${encodeURIComponent(id)}`);
    },
    async request<T>(method: 'GET' | 'POST' | 'DELETE' | 'PATCH', path: string, body?: unknown): Promise<RuntimeFailure | { ok: true; data: T }> {
      return httpRequest<T>(method, path, body);
    },
  };
}