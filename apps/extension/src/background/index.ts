// CAÇAOFERTA — Service worker (FASES 01 + 06).
//
// Router de mensagens: content script e popup falam com o backend apenas aqui.
//
//   saved-ads:save    POST   /api/saved-ads          (duplicidade → ALREADY_SAVED)
//   saved-ads:list    GET    /api/saved-ads          (listagem paginada)
//   saved-ads:get     GET    /api/saved-ads/:id
//   saved-ads:delete  DELETE /api/saved-ads/:id
//
// Estratégia de cache de IDs salvos (chrome.storage.local) evita N requisições
// por card — ver savedIdsCache.ts.
//
// Próximas fases: autenticação (AuthSession) entra aqui, antes do apiClient.

import { APP_NAME, APP_VERSION } from '@caca-oferta/shared';
import { createSavedAdsApiClient } from './apiClient';
import { addSavedAdId, isSavedAdId, removeSavedAdId } from './savedIdsCache';
import {
  RuntimeMessageType,
  RUNTIME_ERROR_CODES,
  runtimeFailure,
  type RuntimeRequest,
  type RuntimeResponse,
} from '../bridge/messages';

const api = createSavedAdsApiClient();

async function handleRequest(message: RuntimeRequest): Promise<RuntimeResponse> {
  switch (message?.type) {
    case RuntimeMessageType.SaveSavedAd: {
      const adLibraryId = message.payload.adLibraryId;
      if (!adLibraryId) {
        return runtimeFailure(RUNTIME_ERROR_CODES.VALIDATION_ERROR, 'Oferta sem ID — impossível salvar.');
      }
      // Fast-path local: ID já conhecido como salvo → evita ida à rede.
      if (await isSavedAdId(adLibraryId)) {
        return runtimeFailure(RUNTIME_ERROR_CODES.ALREADY_SAVED, 'Esta oferta já está salva.');
      }
      const result = await api.saveAd(message.payload);
      if (result.ok) {
        await addSavedAdId(adLibraryId);
      } else if (result.code === RUNTIME_ERROR_CODES.ALREADY_SAVED) {
        // Backend sabe que está salva (cache defasado): sincroniza e informa.
        await addSavedAdId(adLibraryId);
      }
      return result;
    }
    case RuntimeMessageType.ListSavedAds: {
      return api.listSavedAds(message.page ?? 1, message.pageSize ?? 50);
    }
    case RuntimeMessageType.GetSavedAd: {
      return api.getSavedAd(message.id);
    }
    case RuntimeMessageType.DeleteSavedAd: {
      const result = await api.deleteSavedAd(message.id);
      if (result.ok) {
        await removeSavedAdId(message.id);
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