export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface AdTag {
  savedAdId: string;
  tagId: string;
  createdAt: string;
}