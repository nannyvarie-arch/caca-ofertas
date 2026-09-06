// CAÇAOFERTA — Cliente de mensagens central da extensão (FASE 06).
//
// Usado pelo content script e pelo popup para conversar com o service worker.
// Se `chrome.runtime` não existir (ex.: testes/jsdom), responde um erro
// CASO À PARTE e nunca lança — a UI mostra mensagem honesta, sem quebrar.

import {
  RUNTIME_ERROR_CODES,
  runtimeFailure,
  type RuntimeRequest,
  type RuntimeResponse,
} from './messages';

const CONTEXT_MESSAGE = 'Este ambiente não oferece comunicação com a extensão.';

function isRuntimeResponse(value: unknown): value is RuntimeResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'ok' in value &&
    typeof (value as { ok?: unknown }).ok === 'boolean'
  );
}

/**
 * Envia uma mensagem para o service worker e devolve resposta tipada.
 * Nunca rejeita: falhas viram RuntimeResponse de erro.
 */
export function sendRuntimeRequest<T>(message: RuntimeRequest): Promise<RuntimeResponse<T>> {
  if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
    return Promise.resolve(runtimeFailure(RUNTIME_ERROR_CODES.CONTEXT_UNAVAILABLE, CONTEXT_MESSAGE));
  }

  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(message, (response: unknown) => {
        if (chrome.runtime.lastError) {
          resolve(
            runtimeFailure(
              RUNTIME_ERROR_CODES.MESSAGE_FAILED,
              chrome.runtime.lastError?.message ?? 'Falha na comunicação com a extensão.',
            ),
          );
          return;
        }
        if (isRuntimeResponse(response)) {
          resolve(response as RuntimeResponse<T>);
          return;
        }
        resolve(runtimeFailure(RUNTIME_ERROR_CODES.MESSAGE_FAILED, 'Resposta inesperada da extensão.'));
      });
    } catch (error) {
      resolve(
        runtimeFailure(
          RUNTIME_ERROR_CODES.MESSAGE_FAILED,
          error instanceof Error ? error.message : 'Falha ao enviar mensagem para a extensão.',
        ),
      );
    }
  });
}