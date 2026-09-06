export type AdPlatform = 'meta' | 'google' | 'tiktok' | 'pinterest';
export type AdStatus = 'ativo' | 'encerrado' | 'desconhecido';
export type MediaType = 'imagem' | 'video' | 'carrossel' | 'texto' | 'desconhecida';

export interface Ad {
  id: string;
  adLibraryId: string;
  platform: AdPlatform;
  pageId: string | null;
  pageName: string | null;
  status: AdStatus | null;
  deliveryStartDate: string | null;
  deliveryStopDate: string | null;
  /** Plataformas de veiculação detectadas (ex.: facebook, instagram). */
  platforms: string[] | null;
  mediaType: MediaType | null;
  creativeText: string | null;
  headline: string | null;
  description: string | null;
  destinationUrl: string | null;
  /** Domínio normalizado (ex.: exemplo.com). */
  destinationDomain: string | null;
  adSnapshotUrl: string | null;
  cta: string | null;
  userId: string | null;
  createdAt: string;
  updatedAt: string;
}