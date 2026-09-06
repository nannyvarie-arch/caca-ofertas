// CAÇAOFERTA — Store de ofertas salvas em memória (FASE 06).
//
// Implementação da interface SavedAdsStore SEM banco externo, usada nos
// testes de rotas e no teste de integração do fluxo completo. Reproduz a
// semântica relevante do Prisma:
//   • UNIQUE(user_id, ad_library_id) com erro ALREADY_SAVED;
//   • Ad deduplicado por [adLibraryId, platform];
//   • SavedAd vinculado ao Ad (join via adId);
//   • datas de calendário preservadas (UTC midnight).
// NÃO substitui o Postgres em produção — é exclusivo de testes/hermenéutica.
//
// FASE 11 — Esta store agora também gerencia:
//   • Tags por savedAd (unique userId + name)
//   • Notas por savedAd
//   • Classificação manual (1 a 5) no SavedAd
//   • Score de oportunidade (0 a 100) calculado no SavedAd

import type { SavedAdSubmit } from '@caca-oferta/shared';
import { ApiError, ERROR_CODES } from '../lib/apiError';
import type { TagDto, NoteDto } from '@caca-oferta/shared';
import { AD_ORIGIN_PLATFORM, type AdRow, type ListSavedOptions, type SavedAdCreateInput, type SavedAdRow, type SavedAdsStore, type SavedAdUpdateInput } from './savedAdsStore';

function utcDate(iso: string | null): Date | null {
  return iso ? new Date(`${iso}T00:00:00.000Z`) : null;
}

function isoOf(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

function uid(): string {
  return `mem-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// FASE 11 — Score determinístico baseado nos dados da oferta
function calculateOpportunityScore(row: SavedAdRow): number {
  let score = 0;

  // Base score: ofertas recentes ganham mais peso (até 30 pontos)
  const savedAt = new Date(row.savedAt);
  const daysSinceSaved = Math.max(0, Math.floor((new Date().getTime() - savedAt.getTime()) / (1000 * 60 * 60 * 24)));
  const recencyScore = Math.max(0, 30 - daysSinceSaved);
  score += recencyScore;

  // Plataforma ativa: ofertas atinas recebem +20 pontos
  if (row.statusSnapshot === 'active' || row.statusSnapshot === 'running') {
    score += 20;
  }

  // Média de dias running: mais de 7 dias = +10 pontos
  const runningDays = row.ad?.runningDays;
  if (runningDays !== null && runningDays !== undefined && runningDays > 7) {
    score += 10;
  }

  // Média de dias running: menos de 3 dias = +5 pontos (oportunidade de entrada)
  if (runningDays !== null && runningDays !== undefined && runningDays > 0 && runningDays <= 3) {
    score += 5;
  }

  // Plataformas múltiplas = mais exposição = +5 pontos
  if (row.ad?.platforms && row.ad.platforms.length > 1) {
    score += 5;
  }

  // Cap at 100
  return Math.min(100, Math.max(0, score));
}

export function createMemorySavedAdsStore(): SavedAdsStore {
  const adsByKey = new Map<string, AdRow>();
  const savedByKey = new Map<string, SavedAdRow>();

  // FASE 11 — Tags por usuário (unique userId + name)
  const tagsByKey = new Map<string, TagDto[]>();
  // FASE 11 — Notas por savedAd
  const notesByAd = new Map<string, NoteDto[]>();
  // FASE 11 — Classificação e score por savedAd
  const classificationsByAd = new Map<string, { classification: number; score: number }>();

  function findSavedById(id: string, userId: string): SavedAdRow | null {
    return [...savedByKey.values()].find((s) => s.id === id && s.userId === userId) ?? null;
  }

  function adKeyOf(adLibraryId: string, platform: string): string {
    return `${adLibraryId}::${platform}`;
  }

  function findAdRow(adKey: string): AdRow | null {
    return adsByKey.get(adKey) ?? null;
  }

  return {
    async findSaved(userId, adLibraryId) {
      return savedByKey.get(`${userId}::${adLibraryId}`) ?? null;
    },

    async createSaved(userId, input: SavedAdCreateInput) {
      const key = `${userId}::${input.adLibraryId}`;
      if (savedByKey.has(key)) {
        throw new ApiError(409, ERROR_CODES.ALREADY_SAVED, 'Esta oferta já foi salva.');
      }
      const ad = findAdRow(adKeyOf(input.adLibraryId, AD_ORIGIN_PLATFORM));
      const now = new Date();
      const row: SavedAdRow = {
        id: uid(),
        userId,
        adId: input.adId,
        adLibraryId: input.adLibraryId,
        pageId: input.pageId,
        statusSnapshot: input.statusSnapshot,
        isFavorite: false,
        classification: null,
        score: null,
        savedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        ad,
      };
      savedByKey.set(key, row);
      return row;
    },

    async listSaved(userId, options: ListSavedOptions) {
      const rows = [...savedByKey.values()]
        .filter((row) => row.userId === userId)
        .sort((a, b) => {
          const byDate = b.savedAt.localeCompare(a.savedAt);
          if (byDate !== 0) return byDate;
          return b.adLibraryId.localeCompare(a.adLibraryId);
        });
      return rows.slice(options.skip, options.skip + options.take);
    },

    async countSaved(userId) {
      return [...savedByKey.values()].filter((row) => row.userId === userId).length;
    },

    async findSavedById(id, userId) {
      return findSavedById(id, userId);
    },

    // FASE 11 — Tags
    async listTags(userId, adLibraryId?) {
      const tagKey = `${userId}::tags`;
      const allTags = tagsByKey.get(tagKey) ?? [];
      if (adLibraryId) {
        return allTags.filter((t) => t.adLibraryId === adLibraryId);
      }
      return allTags;
    },

    async createTag(userId, input: { name: string; color?: string; adLibraryId: string }) {
      const tagKey = `${userId}::tags`;
      const existing = [...tagsByKey.get(tagKey) ?? []].find((t) => t.name === input.name);
      if (existing) {
        throw new ApiError(409, ERROR_CODES.VALIDATION_ERROR, 'Tag já existe para este usuário.');
      }
      const newTag: TagDto = {
        id: uuidv4(),
        name: input.name,
        color: input.color,
        isDefault: false,
        createdAt: new Date().toISOString(),
        adLibraryId: input.adLibraryId,
      };
      tagsByKey.set(tagKey, [...(tagsByKey.get(tagKey) ?? []), newTag]);
      return newTag;
    },

    async deleteTag(userId, tagId) {
      const tagKey = `${userId}::tags`;
      const existing = [...tagsByKey.get(tagKey) ?? []].find((t) => t.id === tagId);
      if (!existing) return false;
      tagsByKey.set(tagKey, [...(tagsByKey.get(tagKey) ?? []).filter((t) => t.id !== tagId)]);
      return true;
    },

    // FASE 11 — Notas
    async listNotes(userId, savedAdId?) {
      const notesKey = `${userId}::notes`;
      const allNotes = notesByAd.get(notesKey) ?? [];
      if (savedAdId) {
        return allNotes.filter((n) => n.savedAdId === savedAdId);
      }
      return allNotes;
    },

    async createNote(userId, input: { body: string; savedAdId: string }) {
      const notesKey = `${userId}::notes`;
      const newNote: NoteDto = {
        id: uuidv4(),
        body: input.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        savedAdId: input.savedAdId,
      };
      const existing = notesByAd.get(notesKey) ?? [];
      notesByAd.set(notesKey, [...existing, newNote]);
      return newNote;
    },

    // FASE 11 — Classificação e Score
    async setClassification(userId, input: { savedAdId: string; classification: number }) {
      if (input.classification < 1 || input.classification > 5) {
        throw new ApiError(400, ERROR_CODES.VALIDATION_ERROR, 'Classificação deve estar entre 1 e 5.');
      }
      const row = await findSavedById(input.savedAdId, userId);
      if (!row) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Oferta não encontrada.');

      classificationsByAd.set(input.savedAdId, { classification: input.classification, score: calculateOpportunityScore(row) });

      // Atualizar o row no savedByKey
      const savedKey = `${userId}::${row.adLibraryId}`;
      const existing = savedByKey.get(savedKey);
      if (existing) {
        existing.classification = input.classification;
        existing.score = calculateOpportunityScore(existing);
      }

      return { classification: input.classification, score: calculateOpportunityScore(row) };
    },

    async getClassification(userId, savedAdId) {
      const row = await findSavedById(savedAdId, userId);
      if (!row) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Oferta não encontrada.');

      const classif = classificationsByAd.get(savedAdId);
      if (classif) {
        return { classification: classif.classification, score: classif.score };
      }

      // Return default if not set
      return { classification: row.classification ?? 0, score: row.score ?? calculateOpportunityScore(row) };
    },

    async calculateScore(userId, savedAdId) {
      const row = await findSavedById(savedAdId, userId);
      if (!row) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Oferta não encontrada.');
      return calculateOpportunityScore(row);
    },

    async deleteSavedById(id, userId) {
      const target = [...savedByKey.values()].find((s) => s.id === id && s.userId === userId);
      if (!target) return false;
      savedByKey.delete(`${userId}::${target.adLibraryId}`);
      // Cleanup tags and notes associated with this saved ad
      const tagKey = `${userId}::tags`;
      tagsByKey.set(tagKey, [...(tagsByKey.get(tagKey) ?? []).filter((t) => t.adLibraryId !== target.adLibraryId)]);
      const notesKey = `${userId}::notes`;
      notesByAd.set(notesKey, [...(notesByAd.get(notesKey) ?? []).filter((n) => n.savedAdId !== id)]);
      classificationsByAd.delete(id);
      return true;
    },

    async upsertAd(payload: SavedAdSubmit) {
      const key = adKeyOf(payload.adLibraryId, AD_ORIGIN_PLATFORM);
      const existing = findAdRow(key);
      const next: AdRow = {
        id: existing?.id ?? uid(),
        adLibraryId: payload.adLibraryId,
        pageId: payload.pageId,
        pageName: payload.pageName,
        status: payload.status,
        deliveryStartDate: isoOf(utcDate(payload.deliveryStartDate)),
        deliveryStopDate: isoOf(utcDate(payload.deliveryStopDate)),
        platforms: payload.platforms,
        mediaType: payload.mediaType,
        creativeText: payload.creativeText,
        headline: payload.headline,
        description: payload.description,
        destinationUrl: payload.destinationUrl,
        destinationDomain: payload.destinationDomain,
        adSnapshotUrl: payload.adSnapshotUrl,
        cta: payload.cta,
        runningDays: payload.runningDays,
        creativeUrl: payload.creativeUrl,
        thumbnailUrl: payload.thumbnailUrl,
      };
      adsByKey.set(key, next);
      return next;
    },

    async toggleFavorite(id, userId) {
      const row = findSavedById(id, userId);
      if (!row) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Oferta não encontrada.');
      row.isFavorite = !row.isFavorite;
      row.updatedAt = new Date().toISOString();
      return row;
    },

    async updateSaved(id, userId, input) {
      const row = findSavedById(id, userId);
      if (!row) throw new ApiError(404, ERROR_CODES.NOT_FOUND, 'Oferta não encontrada.');
      if (input.statusSnapshot !== undefined) row.statusSnapshot = input.statusSnapshot;
      if (input.isFavorite !== undefined) row.isFavorite = input.isFavorite;
      if (input.classification !== undefined) row.classification = input.classification;
      if (input.score !== undefined) row.score = input.score;
      row.updatedAt = new Date().toISOString();
      return row;
    },
  };
}