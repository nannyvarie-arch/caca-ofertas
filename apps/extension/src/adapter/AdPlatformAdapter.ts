import type { ParsedAd } from '@caca-oferta/types';

/**
 * Nó de anúncio identificado na página da plataforma.
 */
export interface AdNode {
  element: Element;
}

/**
 * Contrato comum de mineração de anúncios para qualquer plataforma.
 * CaçaOferta não deve acoplar a lógica à Meta: novas plataformas
 * (Google, TikTok, Pinterest) implementam este mesmo contrato.
 */
export interface AdPlatformAdapter {
  detectAds(container: Element): AdNode[];
  parseAd(node: AdNode): ParsedAd | null;
  getAdId(node: AdNode): string | null;
  getPage(node: AdNode): string | null;
  getPageId(node: AdNode): string | null;
  getStatus(node: AdNode): string | null;
  getStartDate(node: AdNode): string | null;
  getStopDate(node: AdNode): string | null;
  getPlatforms(node: AdNode): string[] | null;
  getMediaType(node: AdNode): string | null;
  getCreativeText(node: AdNode): string | null;
  getHeadline(node: AdNode): string | null;
  getDescription(node: AdNode): string | null;
  getCta(node: AdNode): string | null;
  getSnapshotUrl(node: AdNode): string | null;
  getThumbnailUrl(node: AdNode): string | null;
  getCreativeUrl(node: AdNode): string | null;
  getRunningDays(node: AdNode): number | null;
  /** Confiança do parser (high|medium|low) — debug/filtro, não exibível. */
  getConfidence(node: AdNode): string | null;
  getDestinationUrl(node: AdNode): string | null;
  getDomain(node: AdNode): string | null;
  getCreative(node: AdNode): unknown | null;
}