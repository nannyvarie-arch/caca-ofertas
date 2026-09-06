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

export interface SavedAdsStore {
  findSaved(userId: string, adLibraryId: string): Promise<SavedAdRow | null>;
  /** Lança ALREADY_SAVED (409) quando o par (userId, adLibraryId) já existe. */
  createSaved(userId: string, input: SavedAdCreateInput): Promise<SavedAdRow>;
  listSaved(userId: string, options: ListSavedOptions): Promise<SavedAdRow[]>;
  countSaved(userId: string): Promise<number>;
  findSavedById(id: string, userId: string): Promise<SavedAdRow | null>;
  deleteSavedById(id: string, userId: string): Promise<boolean>;
  upsertAd(payload: SavedAdSubmit): Promise<AdRow>;
  // FASE 11 — Tags
  listTags?(userId: string, adLibraryId?: string): Promise<TagDto[]>;
  createTag?(userId: string, input: { name: string; color?: string; adLibraryId: string }): Promise<TagDto>;
  deleteTag?(userId: string, tagId: string): Promise<boolean>;
  // FASE 11 — Notas
  listNotes?(userId: string, savedAdId?: string): Promise<NoteDto[]>;
  createNote?(userId: string, input: { body: string; savedAdId: string }): Promise<NoteDto>;
  // FASE 11 — Classificação e Score
  getClassification?(userId: string, savedAdId: string): Promise<ClassificationDto>;
  setClassification?(userId: string, input: { savedAdId: string; classification: number }): Promise<{ classification: number; score: number }>;
  calculateScore?(userId: string, savedAdId: string): Promise<number>;
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
  };
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}