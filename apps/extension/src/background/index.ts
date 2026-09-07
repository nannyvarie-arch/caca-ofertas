// CAÇAOFERTA — Service worker (FASES 01 + 06 + 11 + MINERAÇÃO DIÁRIA).
//
// Router de mensagens: content script e popup falam com o backend apenas aqui.
//
//   saved-ads:save       POST   /api/saved-ads          (duplicidade → ALREADY_SAVED)
//   saved-ads:list       GET    /api/saved-ads          (listagem paginada)
//   saved-ads:get        GET    /api/saved-ads/:id
//   saved-ads:delete     DELETE /api/saved-ads/:id
//   saved-ads:tags:list  GET    /api/saved-ads/:id/tags
//   saved-ads:tags:create POST  /api/saved-ads/:id/tags
//   saved-ads:tags:delete DELETE  /api/saved-ads/:id/tags/:tagId
//   saved-ads:notes:list GET    /api/saved-ads/:id/notes
//   saved-ads:notes:create POST  /api/saved-ads/:id/notes
//   saved-ads:classification: GET/POST /api/saved-ads/:id/classification
//   saved-ads:score:get  GET    /api/saved-ads/:id/score
//   saved-ads:favorite:toggle PATCH /api/saved-ads/:id/favorite
//   saved-ads:compare    POST   /api/saved-ads/compare
//   ads:ingest           POST   /api/ads/ingest         (batch ingest para mineração diária)
//
// Estratégia de cache de IDs salvos (chrome.storage.local) evita N requisições
// por card — ver savedIdsCache.ts.
//
// Próximas fases: autenticação (AuthSession) entra aqui, antes do apiClient.

import { APP_NAME, APP_VERSION, API_SAVED_ADS_PATH, API_BASE_PATH } from '@caca-oferta/shared';
import { createSavedAdsApiClient } from './apiClient';
import { addSavedAdId, isSavedAdId, removeSavedAdId } from './savedIdsCache';
import {
  RuntimeMessageType,
  RUNTIME_ERROR_CODES,
  runtimeFailure,
  runtimeSuccess,
  type RuntimeRequest,
  type RuntimeResponse,
} from '../bridge/messages';

const api = createSavedAdsApiClient();

async function handleRequest(message: RuntimeRequest): Promise<RuntimeResponse> {
  switch (message?.type) {
    case RuntimeMessageType.SaveSavedAd: {
      const adLibraryId = (message as { payload: { adLibraryId: string } }).payload.adLibraryId;
      if (!adLibraryId) {
        return runtimeFailure(RUNTIME_ERROR_CODES.VALIDATION_ERROR, 'Oferta sem ID — impossível salvar.');
      }
      if (await isSavedAdId(adLibraryId)) {
        return runtimeFailure(RUNTIME_ERROR_CODES.ALREADY_SAVED, 'Esta oferta já está salva.');
      }
      const result = await api.saveAd((message as { payload: any }).payload);
      if (result.ok) {
        await addSavedAdId(adLibraryId);
      } else if (result.code === RUNTIME_ERROR_CODES.ALREADY_SAVED) {
        await addSavedAdId(adLibraryId);
      }
      return result;
    }
    case RuntimeMessageType.ListSavedAds: {
      return api.listSavedAds((message as { page?: number; pageSize?: number }).page ?? 1, (message as { page?: number; pageSize?: number }).pageSize ?? 50);
    }
    case RuntimeMessageType.GetSavedAd: {
      return api.getSavedAd((message as { id: string }).id);
    }
    case RuntimeMessageType.DeleteSavedAd: {
      const result = await api.deleteSavedAd((message as { id: string }).id);
      if (result.ok) {
        await removeSavedAdId((message as { id: string }).id);
      }
      return result;
    }
    // FASE 11 — Tags
    case RuntimeMessageType.ListTags: {
      const savedId = (message as { id: string }).id;
      return api.request('GET', `${API_SAVED_ADS_PATH}/${encodeURIComponent(savedId)}/tags`);
    }
    case RuntimeMessageType.CreateTag: {
      const { id, ...body } = message as { id: string; name: string; color?: string };
      return api.request('POST', `${API_SAVED_ADS_PATH}/${encodeURIComponent(id)}/tags`, body);
    }
    case RuntimeMessageType.DeleteTag: {
      const { id, tagId } = message as { id: string; tagId: string };
      return api.request('DELETE', `${API_SAVED_ADS_PATH}/${encodeURIComponent(id)}/tags/${encodeURIComponent(tagId)}`);
    }
    // FASE 11 — Notas
    case RuntimeMessageType.ListNotes: {
      const savedId = (message as { id: string }).id;
      return api.request('GET', `${API_SAVED_ADS_PATH}/${encodeURIComponent(savedId)}/notes`);
    }
    case RuntimeMessageType.CreateNote: {
      const { id, body } = message as { id: string; body: string };
      return api.request('POST', `${API_SAVED_ADS_PATH}/${encodeURIComponent(id)}/notes`, { body });
    }
    // FASE 11 — Classificação e Score
    case RuntimeMessageType.GetClassification: {
      const savedId = (message as { id: string }).id;
      return api.request('GET', `${API_SAVED_ADS_PATH}/${encodeURIComponent(savedId)}/classification`);
    }
    case RuntimeMessageType.SetClassification: {
      const { id, classification } = message as { id: string; classification: number };
      return api.request('POST', `${API_SAVED_ADS_PATH}/${encodeURIComponent(id)}/classification`, { classification });
    }
    case RuntimeMessageType.GetScore: {
      const savedId = (message as { id: string }).id;
      return api.request('GET', `${API_SAVED_ADS_PATH}/${encodeURIComponent(savedId)}/score`);
    }
    // FASE 11 — Favoritos
    case RuntimeMessageType.ToggleFavorite: {
      const savedId = (message as { id: string }).id;
      return api.request('PATCH', `${API_SAVED_ADS_PATH}/${encodeURIComponent(savedId)}/favorite`);
    }
    // FASE 11 — Comparação
    case RuntimeMessageType.CompareAds: {
      const { ids } = message as { ids: string[] };
      return api.request('POST', `${API_SAVED_ADS_PATH}/compare`, { ids });
    }
    // MINERAÇÃO DIÁRIA — Batch ingest
    case RuntimeMessageType.IngestAds: {
      const { ads } = message as { payload: { ads: any[] } };
      if (!ads || !Array.isArray(ads) || ads.length === 0) {
        return runtimeFailure(RUNTIME_ERROR_CODES.VALIDATION_ERROR, 'Nenhum anúncio para ingestar.');
      }
      const result = await api.request('POST', `${API_BASE_PATH}/ads/ingest`, { ads });
      if (result.ok) {
        const data = result.data as { data: { ingested: number } };
        return runtimeSuccess({ ingested: data.data?.ingested ?? ads.length });
      }
      return result;
    }
    default:
      return runtimeFailure(RUNTIME_ERROR_CODES.MESSAGE_FAILED, 'Tipo de mensagem desconhecido.');
  }
}

console.info(`[${APP_NAME}] Service worker v${APP_VERSION} carregado.`);

chrome.runtime.onInstalled.addListener(() => {
  console.info(`[${APP_NAME}] Extensão instalada. Pronta para iniciar.`);
});

// Resposta assíncrona: `return true` mantém o canal aberto até sendResponse.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  void handleRequest(message as RuntimeRequest)
    .then(sendResponse)
    .catch((error: unknown) =>
      sendResponse(
        runtimeFailure(
          RUNTIME_ERROR_CODES.INTERNAL,
          error instanceof Error ? error.message : 'Falha interna do service worker.',
        ),
      ),
    );
  return true;
});