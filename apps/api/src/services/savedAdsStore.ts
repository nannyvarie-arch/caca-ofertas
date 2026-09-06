// CAÇAOFERTA — Armazenamento de ofertas salvas (FASE 06).
//
// Camada que isola TODO o conhecimento do Prisma das rotas. Duas
// implementações da mesma interface:
//   - PrismaSavedAdsStore (produção);
//   - MemorySavedAdsStore (testes herméticos, SEM banco externo).
//
// Regras arquiteturais:
//   • deduplicação por UNIQUE(user_id, ad_library_id) → ALREADY_SAVED (409);
//   • isolamento total por usuário (todas as consultas filtram por userId);
//   • `Ad` (chave [adLibraryId, origin='meta']) armazena o snapshot canônico
//     do NormalizedAd; `SavedAd` é o vínculo do usuário com a oferta;
//   • datas de calendário são gravadas como UTC midnight (YYYY-MM-DD) para
//     preservar o dia sem fuso e lidas de volta com toISOString().slice(0,10).

import { Prisma, PrismaClient } from '@caca-oferta/database';
import type { SavedAdSubmit } from '@caca-oferta/shared';
import type { TagDto, NoteDto, ClassificationDto } from '@caca-oferta/shared';
import { ApiError, ERROR_CODES } from '../lib/apiError';

export const AD_ORIGIN_PLATFORM = 'meta';

export interface AdRow {
  id: string;
  adLibraryId: string;
  pageId: string | null;
  pageName: string | null;
  status: string | null;
  deliveryStartDate: string | null;
  deliveryStopDate: string | null;
  platforms: string[];
  mediaType: string | null;
  creativeText: string | null;
  headline: string | null;
  description: string | null;
  destinationUrl: string | null;
  destinationDomain: string | null;
  adSnapshotUrl: string | null;
  cta: string | null;
  runningDays: number | null;
  creativeUrl: string | null;
  thumbnailUrl: string | null;
}

export interface SavedAdRow {
  id: string;
  userId: string;
  adId: string;
  adLibraryId: string;
  pageId: string | null;
  statusSnapshot: string | null;
  isFavorite: boolean;
  classification?: number | null;
  score?: number | null;
  savedAt: string;
  updatedAt: string;
  ad: AdRow | null;
}

export interface SavedAdCreateInput {
  adId: string;
  adLibraryId: string;
  pageId: string | null;
  statusSnapshot: string | null;
}

export interface ListSavedOptions {
  skip: number;
  take: number;
}

export interface SavedAdUpdateInput {
  statusSnapshot?: string;
  isFavorite?: boolean;
  classification?: number | null;
  score?: number | null;
}

export interface SavedAdsStore {
  findSaved(userId: string, adLibraryId: string): Promise<SavedAdRow | null>;
  createSaved(userId: string, input: SavedAdCreateInput): Promise<SavedAdRow>;
  listSaved(userId: string, options: ListSavedOptions): Promise<SavedAdRow[]>;
  countSaved(userId: string): Promise<number>;
  findSavedById(id: string, userId: string): Promise<SavedAdRow | null>;
  deleteSavedById(id: string, userId: string): Promise<boolean>;
  upsertAd(payload: SavedAdSubmit): Promise<AdRow>;
  toggleFavorite(id: string, userId: string): Promise<SavedAdRow>;
  updateSaved(id: string, userId: string, input: SavedAdUpdateInput): Promise<SavedAdRow>;
  // FASE 11 — Tags
  listTags(userId: string, adLibraryId?: string): Promise<TagDto[]>;
  createTag(userId: string, input: { name: string; color?: string; adLibraryId: string }): Promise<TagDto>;
  deleteTag(userId: string, tagId: string): Promise<boolean>;
  // FASE 11 — Notas
  listNotes(userId: string, savedAdId?: string): Promise<NoteDto[]>;
  createNote(userId: string, input: { body: string; savedAdId: string }): Promise<NoteDto>;
  // FASE 11 — Classificação e Score
  getClassification(userId: string, savedAdId: string): Promise<ClassificationDto>;
  setClassification(userId: string, input: { savedAdId: string; classification: number }): Promise<{ classification: number; score: number }>;
  calculateScore(userId: string, savedAdId: string): Promise<number>;
}

function toUtcDate(iso: string | null): Date | null {
  return iso ? new Date(`${iso}T00:00:00.000Z`) : null;
}

function toIso(date: Date | null | undefined): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

/** Linha canônica do `Ad` como retornada pelo Prisma (scalares). */
interface PrismaAdScalar {
  id: string;
  adLibraryId: string;
  pageId: string | null;
  pageName: string | null;
  status: string | null;
  deliveryStartDate: Date | null;
  deliveryStopDate: Date | null;
  platforms: Prisma.JsonValue;
  mediaType: string | null;
  creativeText: string | null;
  headline: string | null;
  description: string | null;
  destinationUrl: string | null;
  destinationDomainName: string | null;
  adSnapshotUrl: string | null;
  cta: string | null;
  runningDays: number | null;
  creativeUrl: string | null;
  thumbnailUrl: string | null;
}

interface PrismaSavedRowWithAd {
  id: string;
  userId: string;
  adId: string;
  adLibraryId: string;
  pageId: string | null;
  statusSnapshot: string | null;
  isFavorite: boolean;
  classification: number | null;
  score: number | null;
  savedAt: Date;
  updatedAt: Date;
  ad: PrismaAdScalar | null;
}

/** Converte a linha do Prisma para o AdRow neutro da aplicação. */
function mapAd(ad: PrismaAdScalar): AdRow {
  const rawPlatforms = Array.isArray(ad.platforms) ? ad.platforms : [];
  return {
    id: ad.id,
    adLibraryId: ad.adLibraryId,
    pageId: ad.pageId,
    pageName: ad.pageName,
    status: ad.status,
    deliveryStartDate: toIso(ad.deliveryStartDate),
    deliveryStopDate: toIso(ad.deliveryStopDate),
    platforms: rawPlatforms.filter((p): p is string => typeof p === 'string'),
    mediaType: ad.mediaType,
    creativeText: ad.creativeText,
    headline: ad.headline,
    description: ad.description,
    destinationUrl: ad.destinationUrl,
    destinationDomain: ad.destinationDomainName,
    adSnapshotUrl: ad.adSnapshotUrl,
    cta: ad.cta,
    runningDays: ad.runningDays,
    creativeUrl: ad.creativeUrl,
    thumbnailUrl: ad.thumbnailUrl,
  };
}

function mapSaved(row: PrismaSavedRowWithAd): SavedAdRow {
  return {
    id: row.id,
    userId: row.userId,
    adId: row.adId,
    adLibraryId: row.adLibraryId,
    pageId: row.pageId,
    statusSnapshot: row.statusSnapshot,
    isFavorite: row.isFavorite,
    classification: row.classification,
    score: row.score,
    savedAt: row.savedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ad: row.ad ? mapAd(row.ad) : null,
  };
}

/**
 * Implementação de produção usando Prisma (PostgreSQL/Supabase).
 * Esta é a ÚNICA camada com conhecimento do Prisma — as rotas dependem apenas
 * da interface SavedAdsStore.
 */
export function createPrismaSavedAdsStore(client: PrismaClient): SavedAdsStore {
  return {
    async findSaved(userId, adLibraryId) {
      const row = (await client.savedAd.findUnique({
        where: { userId_adLibraryId: { userId, adLibraryId } },
        include: { ad: true },
      })) as PrismaSavedRowWithAd | null;
      return row ? mapSaved(row) : null;
    },

    async createSaved(userId, input) {
      try {
        const row = (await client.savedAd.create({
          data: {
            userId,
            adId: input.adId,
            adLibraryId: input.adLibraryId,
            pageId: input.pageId,
            statusSnapshot: input.statusSnapshot,
          },
          include: { ad: true },
        })) as PrismaSavedRowWithAd;
        return mapSaved(row);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApiError(409, ERROR_CODES.ALREADY_SAVED, 'Esta oferta já foi salva.');
        }
        throw error;
      }
    },

    async listSaved(userId, { skip, take }) {
      const rows = (await client.savedAd.findMany({
        where: { userId },
        orderBy: [{ savedAt: 'desc' }, { adLibraryId: 'desc' }],
        skip,
        take,
        include: { ad: true },
      })) as PrismaSavedRowWithAd[];
      return rows.map(mapSaved);
    },

    async countSaved(userId) {
      return client.savedAd.count({ where: { userId } });
    },

    async findSavedById(id, userId) {
      const row = (await client.savedAd.findFirst({
        where: { id, userId },
        include: { ad: true },
      })) as PrismaSavedRowWithAd | null;
      return row ? mapSaved(row) : null;
    },

    async deleteSavedById(id, userId) {
      const result = await client.savedAd.deleteMany({ where: { id, userId } });
      return result.count > 0;
    },

    async upsertAd(payload) {
      const adData = {
        adLibraryId: payload.adLibraryId,
        pageId: payload.pageId,
        pageName: payload.pageName,
        status: payload.status,
        deliveryStartDate: toUtcDate(payload.deliveryStartDate),
        deliveryStopDate: toUtcDate(payload.deliveryStopDate),
        platforms: payload.platforms,
        mediaType: payload.mediaType,
        creativeText: payload.creativeText,
        headline: payload.headline,
        description: payload.description,
        destinationUrl: payload.destinationUrl,
        destinationDomainName: payload.destinationDomain,
        adSnapshotUrl: payload.adSnapshotUrl,
        cta: payload.cta,
        runningDays: payload.runningDays,
        creativeUrl: payload.creativeUrl,
        thumbnailUrl: payload.thumbnailUrl,
      };
      const ad = (await client.ad.upsert({
        where: {
          adLibraryId_platform: { adLibraryId: payload.adLibraryId, platform: AD_ORIGIN_PLATFORM },
        },
        create: { ...adData, platform: AD_ORIGIN_PLATFORM },
        update: adData,
      })) as PrismaAdScalar;
      return mapAd(ad);
    },

    // ─── FAVORITE TOGGLE ───────────────────────────────────────────
    async toggleFavorite(id, userId) {
      const row = (await client.savedAd.findFirst({
        where: { id, userId },
        include: { ad: true },
      })) as PrismaSavedRowWithAd | null;
      if (!row) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Oferta não encontrada.');
      const updated = (await client.savedAd.update({
        where: { id },
        data: { isFavorite: !row.isFavorite },
        include: { ad: true },
      })) as PrismaSavedRowWithAd;
      return mapSaved(updated);
    },

    // ─── UPDATE SAVED AD ───────────────────────────────────────────
    async updateSaved(id, userId, input) {
      const row = (await client.savedAd.findFirst({
        where: { id, userId },
      }));
      if (!row) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Oferta não encontrada.');
      const updated = (await client.savedAd.update({
        where: { id },
        data: {
          ...(input.statusSnapshot !== undefined && { statusSnapshot: input.statusSnapshot }),
          ...(input.isFavorite !== undefined && { isFavorite: input.isFavorite }),
          ...(input.classification !== undefined && { classification: input.classification }),
          ...(input.score !== undefined && { score: input.score }),
        },
        include: { ad: true },
      })) as PrismaSavedRowWithAd;
      return mapSaved(updated);
    },

    // ─── FASE 11 — TAGS ────────────────────────────────────────────
    async listTags(userId, adLibraryId?) {
      const where: any = { userId };
      if (adLibraryId) {
        where.savedAd = { adLibraryId };
      }
      const tags = await client.tag.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color ?? undefined,
        isDefault: t.isDefault,
        createdAt: t.createdAt.toISOString(),
        adLibraryId: adLibraryId ?? '',
      }));
    },

    async createTag(userId, input) {
      const savedAd = await client.savedAd.findFirst({
        where: { userId, adLibraryId: input.adLibraryId },
      });
      if (!savedAd) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Oferta não encontrada.');

      try {
        const tag = await client.tag.create({
          data: {
            userId,
            name: input.name,
            color: input.color,
            adTags: {
              create: { savedAdId: savedAd.id },
            },
          },
        });
        return {
          id: tag.id,
          name: tag.name,
          color: tag.color ?? undefined,
          isDefault: tag.isDefault,
          createdAt: tag.createdAt.toISOString(),
          adLibraryId: input.adLibraryId,
        };
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw new ApiError(409, ERROR_CODES.VALIDATION_ERROR, 'Tag já existe para este usuário.');
        }
        throw error;
      }
    },

    async deleteTag(userId, tagId) {
      const tag = await client.tag.findFirst({ where: { id: tagId, userId } });
      if (!tag) return false;
      await client.adTag.deleteMany({ where: { tagId } });
      await client.tag.delete({ where: { id: tagId } });
      return true;
    },

    // ─── FASE 11 — NOTAS ───────────────────────────────────────────
    async listNotes(userId, savedAdId?) {
      const where: any = { userId };
      if (savedAdId) {
        where.savedAdId = savedAdId;
      }
      const notes = await client.note.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });
      return notes.map((n) => ({
        id: n.id,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
        savedAdId: n.savedAdId,
      }));
    },

    async createNote(userId, input) {
      const savedAd = await client.savedAd.findFirst({
        where: { id: input.savedAdId, userId },
      });
      if (!savedAd) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Oferta não encontrada.');
      const note = await client.note.create({
        data: {
          userId,
          savedAdId: input.savedAdId,
          body: input.body,
        },
      });
      return {
        id: note.id,
        body: note.body,
        createdAt: note.createdAt.toISOString(),
        updatedAt: note.updatedAt.toISOString(),
        savedAdId: note.savedAdId,
      };
    },

    // ─── FASE 11 — CLASSIFICAÇÃO E SCORE ───────────────────────────
    async getClassification(userId, savedAdId) {
      const row = await client.savedAd.findFirst({
        where: { id: savedAdId, userId },
      });
      if (!row) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Oferta não encontrada.');
      return { classification: row.classification ?? 0, score: row.score ?? 0 };
    },

    async setClassification(userId, input) {
      if (input.classification < 1 || input.classification > 5) {
        throw new ApiError(400, ERROR_CODES.VALIDATION_ERROR, 'Classificação deve estar entre 1 e 5.');
      }
      const row = await client.savedAd.findFirst({
        where: { id: input.savedAdId, userId },
        include: { ad: true },
      });
      if (!row) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Oferta não encontrada.');

      const score = calculatePrismaScore(row, row.ad as PrismaAdScalar | null);
      const updated = await client.savedAd.update({
        where: { id: input.savedAdId },
        data: { classification: input.classification, score },
      });
      return { classification: updated.classification ?? input.classification, score: updated.score ?? score };
    },

    async calculateScore(userId, savedAdId) {
      const row = await client.savedAd.findFirst({
        where: { id: savedAdId, userId },
        include: { ad: true },
      });
      if (!row) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Oferta não encontrada.');
      return calculatePrismaScore(row, row.ad as PrismaAdScalar | null);
    },
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** Score determinístico para Prisma store — replicas a lógica do memory store. */
function calculatePrismaScore(row: { savedAt: Date; statusSnapshot: string | null }, ad: PrismaAdScalar | null): number {
  let score = 0;
  const daysSinceSaved = Math.max(0, Math.floor((Date.now() - row.savedAt.getTime()) / (1000 * 60 * 60 * 24)));
  score += Math.max(0, 30 - daysSinceSaved);
  if (row.statusSnapshot === 'active' || row.statusSnapshot === 'running') score += 20;
  if (ad?.runningDays !== null && ad?.runningDays !== undefined && ad.runningDays > 7) score += 10;
  if (ad?.runningDays !== null && ad?.runningDays !== undefined && ad.runningDays > 0 && ad.runningDays <= 3) score += 5;
  if (ad?.platforms && Array.isArray(ad.platforms) && ad.platforms.length > 1) score += 5;
  return Math.min(100, Math.max(0, score));
}