// CAÇAOFERTA — Rotas de ofertas salvas (FASE 06 a FASE 11).
//
// POST   /api/saved-ads          salvar oferta (NormalizedAd) — ALREADY_SAVED em duplicidade
// GET    /api/saved-ads          listar ofertas do usuário (createdAt/savedAt DESC, paginado)
// GET    /api/saved-ads/:id      buscar UMA oferta do usuário (404 se não existir/pertencer)
// DELETE /api/saved-ads/:id      excluir oferta do usuário (somente o proprietário)
// GET    /api/saved-ads/:id/tags   listar tags de uma oferta
// POST   /api/saved-ads/:id/tags   criar tag para uma oferta
// DELETE /api/saved-ads/:id/tags/:tagId  excluir tag de uma oferta
// GET    /api/saved-ads/:id/notes  listar notas de uma oferta
// POST   /api/saved-ads/:id/notes  criar nota para uma oferta
// GET    /api/saved-ads/:id/classification  obter classificação e score
// POST   /api/saved-ads/:id/classification  definir classificação manual
// GET    /api/saved-ads/:id/score   calcular score de oportunidade

// O userId NUNCA vem do cliente: vem do contexto resolvido pelo backend
// (resolveCurrentUser — estratégia dev documentada, autenticação real na FASE 10).

import type { FastifyInstance } from 'fastify';
import { SavedAdSubmitSchema } from '@caca-oferta/shared';
import type { SavedAdDto } from '@caca-oferta/shared';
import type { CurrentUserResolver } from '../lib/currentUser';
import { ApiError, ERROR_CODES, notFound } from '../lib/apiError';
import type { SavedAdRow, SavedAdsStore } from '../services/savedAdsStore';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { TagDto, NoteDto, ClassificationDto } from '@caca-oferta/shared';
import type { NewTagInput, NewNoteInput, NewClassificationInput } from '@caca-oferta/shared';

export interface SavedAdsRouteDeps {
  store: SavedAdsStore;
  resolveUser: CurrentUserResolver;
}

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

interface PageParams {
  page: number;
  pageSize: number;
}

function parsePositiveInt(raw: unknown, fallback: number, max?: number): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) return fallback;
  if (max !== undefined && value > max) return max;
  return value;
}

function parsePage(query: Record<string, unknown>): PageParams {
  return {
    page: parsePositiveInt(query.page, DEFAULT_PAGE),
    pageSize: parsePositiveInt(query.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE),
  };
}

function toSaveDto(row: SavedAdRow) {
  const ad = row.ad;
  return {
    id: row.id,
    adLibraryId: row.adLibraryId,
    pageId: row.pageId ?? ad?.pageId ?? null,
    pageName: ad?.pageName ?? null,
    status: (ad?.status as SavedAdDto['status']) ?? 'unknown',
    deliveryStartDate: ad?.deliveryStartDate ?? null,
    deliveryStopDate: ad?.deliveryStopDate ?? null,
    runningDays: ad?.runningDays ?? null,
    platforms: ad?.platforms ?? [],
    mediaType: (ad?.mediaType as SavedAdDto['mediaType']) ?? 'unknown',
    creativeText: ad?.creativeText ?? null,
    headline: ad?.headline ?? null,
    description: ad?.description ?? null,
    cta: ad?.cta ?? null,
    destinationUrl: ad?.destinationUrl ?? null,
    destinationDomain: ad?.destinationDomain ?? null,
    adSnapshotUrl: ad?.adSnapshotUrl ?? null,
    creativeUrl: ad?.creativeUrl ?? null,
    thumbnailUrl: ad?.thumbnailUrl ?? null,
    savedAt: row.savedAt,
    updatedAt: row.updatedAt,
  };
}

export function registerSavedAdsRoutes(app: FastifyInstance, deps: SavedAdsRouteDeps): void {
  app.post('/api/saved-ads', async (request, reply) => {
    const result = SavedAdSubmitSchema.safeParse(request.body);
    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Dados inválidos.',
          issues: result.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
          })),
        },
      });
    }

    // userId do CONTEXTO do backend — nunca do corpo/query/header do cliente.
    const { userId } = await deps.resolveUser(request);
    const payload = result.data;

    const existing = await deps.store.findSaved(userId, payload.adLibraryId);
    if (existing) {
      throw new ApiError(409, ERROR_CODES.ALREADY_SAVED, 'Esta oferta já foi salva.');
    }

    const ad = await deps.store.upsertAd(payload);
    const row = await deps.store.createSaved(userId, {
      adId: ad.id,
      adLibraryId: payload.adLibraryId,
      pageId: payload.pageId,
      statusSnapshot: payload.status,
    });

    return reply.status(201).send({ success: true, data: toSaveDto(row) });
  });

  app.get('/api/saved-ads', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const query = (request.query ?? {}) as Record<string, unknown>;
    const { page, pageSize } = parsePage(query);
    const skip = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      deps.store.listSaved(userId, { skip, take: pageSize }),
      deps.store.countSaved(userId),
    ]);
    return {
      success: true,
      data: { items: rows.map(toSaveDto), page, pageSize, total },
    };
  });

  app.get<{ Params: { id: string } }>('/api/saved-ads/:id', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const row = await deps.store.findSavedById(request.params.id, userId);
    if (!row) throw notFound('Oferta salva não encontrada.');
    return { success: true, data: toSaveDto(row) };
  });

  app.delete<{ Params: { id: string } }>('/api/saved-ads/:id', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const deleted = await deps.store.deleteSavedById(request.params.id, userId);
    if (!deleted) throw notFound('Oferta salva não encontrada.');
    return { success: true, data: { id: request.params.id, deleted: true } };
  });

  // FASE 11 — Tags
  app.get<{ Params: { id: string } }>('/api/saved-ads/:id/tags', async (request, _reply) => {
    const { userId } = await deps.resolveUser(request);
    const tags = await deps.store.listTags!(userId, request.params.id);
    return { success: true, data: tags };
  });

  app.post<{ Params: { id: string }; Body: NewTagInput }>('/api/saved-ads/:id/tags', async (request, reply) => {
    const { userId } = await deps.resolveUser(request);
    const tag = await deps.store.createTag!(userId, { name: request.body.name, color: request.body.color, adLibraryId: request.body.adLibraryId });
    return reply.status(201).send({ success: true, data: tag });
  });

  app.delete<{ Params: { id: string; tagId: string } }>('/api/saved-ads/:id/tags/:tagId', async (request, _reply) => {
    const { userId } = await deps.resolveUser(request);
    const deleted = await deps.store.deleteTag!(userId, request.params.tagId);
    if (!deleted) throw notFound('Tag não encontrada.');
    return { success: true, data: { tagId: request.params.tagId, deleted: true } };
  });

  // FASE 11 — Notas
  app.get<{ Params: { id: string } }>('/api/saved-ads/:id/notes', async (request, _reply) => {
    const { userId } = await deps.resolveUser(request);
    const notes = await deps.store.listNotes!(userId, request.params.id);
    return { success: true, data: notes };
  });

  app.post<{ Params: { id: string }; Body: NewNoteInput }>('/api/saved-ads/:id/notes', async (request, reply) => {
    const { userId } = await deps.resolveUser(request);
    const note = await deps.store.createNote!(userId, { body: request.body.body, savedAdId: request.params.id });
    return reply.status(201).send({ success: true, data: note });
  });

  // FASE 11 — Classificação e Score
  app.get<{ Params: { id: string } }>('/api/saved-ads/:id/classification', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const classif = await deps.store.getClassification!(userId, request.params.id);
    return { success: true, data: classif };
  });

  app.post<{ Params: { id: string }; Body: NewClassificationInput }>('/api/saved-ads/:id/classification', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const result = await deps.store.setClassification!(userId, { savedAdId: request.params.id, classification: request.body.classification });
    return { success: true, data: result };
  });

  app.get<{ Params: { id: string } }>('/api/saved-ads/:id/score', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const score = await deps.store.calculateScore!(userId, request.params.id);
    return { success: true, data: { score } };
  });

  // FASE 11 — Comparação de ofertas
  app.post('/api/saved-ads/compare', async (request, reply) => {
    const { userId } = await deps.resolveUser(request);
    const body = request.body as { ids: string[] };
    
    if (!body.ids || !Array.isArray(body.ids) || body.ids.length < 2) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'É necessário fornecer pelo menos 2 IDs de ofertas para comparação.',
        },
      });
    }

    if (body.ids.length > 5) {
      return reply.status(400).send({
        success: false,
        error: {
          code: ERROR_CODES.VALIDATION_ERROR,
          message: 'Máximo de 5 ofertas por comparação.',
        },
      });
    }

    const offers = await Promise.all(
      body.ids.map((id) => deps.store.findSavedById(id, userId))
    );

    const missingOffer = offers.find((o, idx) => !o && body.ids[idx]);
    if (missingOffer) {
      throw notFound('Uma ou mais ofertas não encontradas.');
    }

    const comparison = [];
    for (const offer of offers) {
      if (!offer) continue;
      const score = offer.score ?? await deps.store.calculateScore!(userId, offer.id);
      comparison.push({
        id: offer.id,
        adLibraryId: offer.adLibraryId,
        pageName: offer.ad?.pageName ?? null,
        status: offer.ad?.status ?? 'unknown',
        mediaType: offer.ad?.mediaType ?? 'unknown',
        cta: offer.ad?.cta ?? null,
        destinationDomain: offer.ad?.destinationDomain ?? null,
        runningDays: offer.ad?.runningDays ?? null,
        platforms: offer.ad?.platforms ?? [],
        classification: offer.classification ?? null,
        score,
        savedAt: offer.savedAt,
      });
    }

    return { success: true, data: { comparison } };
  });
}