export interface AdCreative {
  id: string;
  adId: string;
  kind: 'imagem' | 'video' | 'thumbnail';
  url: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}