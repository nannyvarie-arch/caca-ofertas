import type { FastifyInstance } from 'fastify';
import type { CurrentUserResolver } from '../lib/currentUser';
import { getPrisma } from '../db/prisma';
import { randomUUID } from 'crypto';

export interface ExtensionRouteDeps {
  resolveUser: CurrentUserResolver;
}

function generateToken(): string {
  return 'ext_' + randomUUID().replace(/-/g, '').slice(0, 32);
}

export function registerExtensionRoutes(app: FastifyInstance, deps: ExtensionRouteDeps): void {
  const prisma = getPrisma();

  app.post('/api/extension/pair', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const body = request.body as { device?: string };
    const token = generateToken();
    const session = await prisma.extensionSession.create({
      data: {
        userId,
        sessionToken: token,
        device: body.device ?? 'chrome',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    return { success: true, data: { token: session.sessionToken, expiresAt: session.expiresAt } };
  });

  app.get('/api/extension/verify', async (request) => {
    const auth = request.headers.authorization;
    if (!auth?.startsWith('Bearer ')) return { success: false, connected: false };
    const token = auth.slice(7);
    const session = await prisma.extensionSession.findUnique({ where: { sessionToken: token } });
    if (!session || session.expiresAt < new Date()) return { success: false, connected: false };
    return { success: true, connected: true, userId: session.userId };
  });

  app.get('/api/extension/sessions', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const sessions = await prisma.extensionSession.findMany({
      where: { userId, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return { success: true, data: sessions.map(s => ({ id: s.id, device: s.device, createdAt: s.createdAt, expiresAt: s.expiresAt })) };
  });

  app.delete('/api/extension/sessions/:id', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const { id } = request.params as { id: string };
    await prisma.extensionSession.deleteMany({ where: { id, userId } });
    return { success: true };
  });
}
