import type { FastifyInstance } from 'fastify';
import type { CurrentUserResolver } from '../lib/currentUser';
import { notFound } from '../lib/apiError';
import { getPrisma } from '../db/prisma';

export interface CloneRouteDeps {
  resolveUser: CurrentUserResolver;
}

const BLOCKED_SCRIPTS = ['facebook.net', 'googletagmanager.com', 'google-analytics.com', 'hotjar.com', 'clarity.ms', 'tiktok.com/i18n'];

function sanitizeHtml(html: string): string {
  let result = html;
  for (const domain of BLOCKED_SCRIPTS) {
    result = result.replace(new RegExp(`<script[^>]*src=["'][^"']*${domain.replace('.', '\\.')}[^"']*["'][^>]*>[\\s\\S]*?</script>`, 'gi'), '<!-- pixel removido -->');
  }
  result = result.replace(/<script[^>]*fbq\([\s\S]*?<\/script>/gi, '<!-- fb pixel removido -->');
  result = result.replace(/<script[^>]*gtag\([\s\S]*?<\/script>/gi, '<!-- gtag removido -->');
  return result;
}

export function registerCloneRoutes(app: FastifyInstance, deps: CloneRouteDeps): void {
  const prisma = getPrisma();

  app.post('/api/clone', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const body = request.body as { sourceUrl: string; mode?: string };

    if (!body.sourceUrl?.trim()) return { success: false, error: 'URL obrigatória.' };

    try {
      const response = await fetch(body.sourceUrl, {
        headers: { 'User-Agent': 'CaçaOferta/1.0 (+https://cacaofertas.com)' },
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) return { success: false, error: `HTTP ${response.status} ao acessar a URL.` };

      const html = await response.text();
      const cleaned = sanitizeHtml(html);

      const titleMatch = cleaned.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch?.[1]?.trim() ?? 'Página clonada';

      const page = await prisma.clonedPage.create({
        data: {
          userId,
          sourceUrl: body.sourceUrl.trim(),
          mode: body.mode ?? 'sales',
          title,
          structure: { htmlLength: cleaned.length, hasImages: /<img/i.test(cleaned), hasForms: /<form/i.test(cleaned) },
          assets: [],
          status: 'captured',
        },
      });

      return { success: true, data: { id: page.id, title, status: 'captured', htmlLength: cleaned.length } };
    } catch (err: any) {
      return { success: false, error: `Erro ao acessar URL: ${err.message}` };
    }
  });

  app.get('/api/clone', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const pages = await prisma.clonedPage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { success: true, data: pages };
  });

  app.get('/api/clone/:id', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const { id } = request.params as { id: string };
    const page = await prisma.clonedPage.findFirst({ where: { id, userId } });
    if (!page) throw notFound('Página clonada não encontrada.');
    return { success: true, data: page };
  });

  app.post('/api/clone/:id/export', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const { id } = request.params as { id: string };
    const page = await prisma.clonedPage.findFirst({ where: { id, userId } });
    if (!page) throw notFound('Página clonada não encontrada.');

    await prisma.clonedPage.update({ where: { id }, data: { status: 'exported' } });

    return {
      success: true,
      data: {
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${page.title ?? 'Página'}</title></head><body><!-- Estrutura exportável --></body></html>`,
        filename: `${(page.title ?? 'pagina').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.html`,
      },
    };
  });
}
