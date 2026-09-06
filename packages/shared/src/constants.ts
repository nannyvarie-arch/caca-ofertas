export const APP_NAME = 'CaçaOferta';
export const APP_BRAND = 'CAÇAOFERTA';
export const APP_TAGLINE = 'Encontre ofertas. Analise anúncios. Descubra oportunidades.';
export const APP_VERSION = '0.1.0';
export const API_VERSION = 'v1';
export const API_HEALTH_PATH = '/health';
export const API_BASE_PATH = `/api/${API_VERSION}`;

// URL base da API local em desenvolvimento (FASE 06). Em produção, a extensão
// apontará para a API hospedada — serviço do backend via env do servidor.
export const API_BASE_URL = 'http://127.0.0.1:3333';

// Rota de ofertas salvas — espelha EXATAMENTE o caminho registrado no backend
// (apps/api/src/routes/savedAds.ts), nunca duplicar o prefixo.
export const API_SAVED_ADS_PATH = '/api/saved-ads';