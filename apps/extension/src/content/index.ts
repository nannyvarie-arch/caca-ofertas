// CAÇAOFERTA — Content script.
// Carrega na Biblioteca de Anúncios da Meta, marca a página e inicia o
// orquestrador de detecção/parser/overlay.

import { startAdMining } from './AdCollectionObserver';
import { isMetaAdsLibraryPage } from './isMetaAdsLibraryPage';
import { getCurrentUrl } from './navigation';

const LOG_PREFIX = '[CaçaOferta]';

function init(): void {
  console.info(`${LOG_PREFIX} Content script carregado. URL: ${window.location.href}`);

  const active = isMetaAdsLibraryPage(getCurrentUrl());
  document.documentElement.setAttribute('data-caca-oferta', active ? 'active' : 'inactive');

  if (!active) {
    console.info(`${LOG_PREFIX} Página não suportada. CaçaOferta inativo.`);
    return;
  }

  console.info(`${LOG_PREFIX} Meta Ads Library detectada! Iniciando mineração...`);

  const handle = startAdMining();

  console.info(`${LOG_PREFIX} Observador de anúncios iniciado.`);
  console.info(`${LOG_PREFIX} Anúncios coletados:`, handle.getCollectedAds().length);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
