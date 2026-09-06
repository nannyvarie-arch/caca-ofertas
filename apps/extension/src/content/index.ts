// CAÇAOFERTA — Content script (FASE 02).
// Carrega apenas na Biblioteca de Anúncios da Meta, marca a página e inicia o
// orquestrador de detecção/parser/overlay. Ativa logs de dev com:
//   localStorage.setItem('co.debug', '1')
//   (depois recarregue a página da Biblioteca)

import { startAdMining } from './AdCollectionObserver';
import { isMetaAdsLibraryPage } from './isMetaAdsLibraryPage';
import { getLogger } from './logging';
import { getCurrentUrl } from './navigation';

function init(): void {
  const logger = getLogger();
  logger.info('Extension loaded');

  const active = isMetaAdsLibraryPage(getCurrentUrl());
  document.documentElement.setAttribute('data-caca-oferta', active ? 'active' : 'inactive');

  if (!active) {
    logger.info('Página não suportada. CaçaOferta inativo.');
    return;
  }

  logger.info('Meta Ads Library detected');
  startAdMining();
  logger.info('Observador de anúncios iniciado.');
}

init();