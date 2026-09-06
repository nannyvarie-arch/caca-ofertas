import type { AdStatus, MediaType } from './ad';

/**
 * Resultado do parser de um anúncio (best-effort).
 * Todos os campos podem ser null quando indisponíveis na página.
 * Nunca inventar dados: o que não for detectado fica null.
 */
export interface ParsedAd {
  adLibraryId: string | null;
  pageId: string | null;
  pageName: string | null;
  status: AdStatus | null;
  deliveryStartDate: string | null;
  deliveryStopDate: string | null;
  platforms: string[] | null;
  mediaType: MediaType | null;
  creativeText: string | null;
  headline: string | null;
  description: string | null;
  destinationUrl: string | null;
  destinationDomain: string | null;
  adSnapshotUrl: string | null;
  cta: string | null;
}