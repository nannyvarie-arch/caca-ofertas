import type { AdStatus } from './ad';

export interface SavedAd {
  id: string;
  userId: string;
  adId: string;
  adLibraryId: string;
  pageId: string | null;
  domainId: string | null;
  noteText: string | null;
  isFavorite: boolean;
  statusSnapshot: AdStatus | null;
  savedAt: string;
  updatedAt: string;
}