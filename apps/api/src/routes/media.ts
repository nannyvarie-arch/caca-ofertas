import type { FastifyInstance } from 'fastify';
import type { CurrentUserResolver } from '../lib/currentUser';
import { notFound } from '../lib/apiError';
import { getPrisma } from '../db/prisma';
import { TRANSCRIBE_API_URL, TRANSCRIBE_API_KEY, OPENAI_API_KEY } from '../config/env';

export interface MediaRouteDeps {
  resolveUser: CurrentUserResolver;
}

export function registerMediaRoutes(app: FastifyInstance, deps: MediaRouteDeps): void {
  const prisma = getPrisma();

  app.post('/api/media/transcribe', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const body = request.body as { sourceType?: string; sourceRef?: string; language?: string; audioBase64?: string };

    const sttUrl = TRANSCRIBE_API_URL || (OPENAI_API_KEY ? 'https://api.openai.com/v1/audio/transcriptions' : null);
    if (!sttUrl) {
      return { success: false, error: 'Serviço de transcrição não configurado. Defina TRANSCRIBE_API_URL ou OPENAI_API_KEY.', configured: false };
    }

    const transcript = await prisma.mediaTranscript.create({
      data: {
        userId,
        sourceType: body.sourceType ?? 'upload',
        sourceRef: body.sourceRef,
        language: body.language ?? 'pt',
        status: 'pending',
      },
    });

    return { success: true, data: { id: transcript.id, status: 'pending' }, configured: true };
  });

  app.get('/api/media/transcripts', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const transcripts = await prisma.mediaTranscript.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return {
      success: true,
      data: transcripts.map(t => ({
        id: t.id,
        sourceType: t.sourceType,
        fileName: t.fileName,
        language: t.language,
        status: t.status,
        segmentsCount: Array.isArray(t.text) ? t.text.length : 0,
        createdAt: t.createdAt,
      })),
    };
  });

  app.get('/api/media/transcripts/:id', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const { id } = request.params as { id: string };
    const transcript = await prisma.mediaTranscript.findFirst({ where: { id, userId } });
    if (!transcript) throw notFound('Transcrição não encontrada.');
    return { success: true, data: transcript };
  });

  app.delete('/api/media/transcripts/:id', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const { id } = request.params as { id: string };
    await prisma.mediaTranscript.deleteMany({ where: { id, userId } });
    return { success: true };
  });
}
