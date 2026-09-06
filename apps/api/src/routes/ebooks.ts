// CAÇAOFERTA — Rotas de e-books (construtor premium).
//
// GET    /api/ebooks                 lista do usuário
// POST   /api/ebooks                 cria (title + themeId)
// GET    /api/ebooks/:id             carrega conteúdo completo
// PATCH  /api/ebooks/:id             salva parcial (autosave)
// DELETE /api/ebooks/:id             exclui
// POST   /api/ebooks/:id/assets      upload de imagem
// GET    /api/ebooks/:id/assets      lista assets
// DELETE /api/ebooks/:id/assets/:assetId
// POST   /api/ebooks/:id/mockup      gera mockup de frame
// POST   /api/ebooks/:id/generate-image   geração por IA
// POST   /api/ebooks/:id/export      gera PDF

import type { FastifyInstance } from 'fastify';
import type { CurrentUserResolver } from '../lib/currentUser';
import { notFound, ApiError, ERROR_CODES } from '../lib/apiError';
import { getPrisma } from '../db/prisma';
import { SUPABASE_SERVICE_ROLE_KEY } from '../config/env';
import { randomUUID } from 'crypto';
import { writeFile, mkdir, unlink, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export interface EbookRouteDeps {
  resolveUser: CurrentUserResolver;
}

const ASSETS_DIR = join(process.cwd(), 'tmp', 'uploads', 'ebooks');
const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

async function ensureAssetsDir() {
  if (!existsSync(ASSETS_DIR)) {
    await mkdir(ASSETS_DIR, { recursive: true });
  }
}

function slugify(text: string): string {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapEbook(row: any) {
  return {
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    author: row.author,
    description: row.description,
    themeId: row.themeId,
    coverConfig: row.coverConfig,
    content: row.content,
    status: row.status,
    pageCount: row.pageCount,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
    updatedAt: row.updatedAt?.toISOString?.() ?? row.updatedAt,
  };
}

function mapAsset(row: any) {
  return {
    id: row.id,
    ebookId: row.ebookId,
    url: row.url,
    fileName: row.fileName,
    kind: row.kind,
    width: row.width,
    height: row.height,
    sizeBytes: row.sizeBytes,
    createdAt: row.createdAt?.toISOString?.() ?? row.createdAt,
  };
}

export function registerEbookRoutes(app: FastifyInstance, deps: EbookRouteDeps): void {
  const prisma = getPrisma();

  // ─── LIST ────────────────────────────────────────────────────────
  app.get('/api/ebooks', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const rows = await prisma.ebook.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });
    return { success: true, data: rows.map(mapEbook) };
  });

  // ─── CREATE ──────────────────────────────────────────────────────
  app.post('/api/ebooks', async (request, reply) => {
    const { userId } = await deps.resolveUser(request);
    const body = request.body as { title?: string; themeId?: string };

    if (!body.title || body.title.trim().length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Título é obrigatório.' },
      });
    }

    const user = await prisma.user.upsert({
      where: { id: userId },
      update: {},
      create: { id: userId, email: `${userId}@cacaoferta.local` },
    });

    const ebook = await prisma.ebook.create({
      data: {
        userId: user.id,
        title: body.title.trim(),
        themeId: body.themeId ?? 'editorial',
        content: [
          { id: randomUUID(), type: 'cover', title: body.title.trim(), subtitle: '', author: '' },
          { id: randomUUID(), type: 'chapter', number: 1, title: 'Capítulo 1' },
          { id: randomUUID(), type: 'paragraph', text: 'Comece a escrever aqui...', dropCap: false },
        ],
        coverConfig: { gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' },
      },
    });

    return reply.status(201).send({ success: true, data: mapEbook(ebook) });
  });

  // ─── GET BY ID ───────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/ebooks/:id', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const row = await prisma.ebook.findFirst({ where: { id: request.params.id, userId } });
    if (!row) throw notFound('E-book não encontrado.');
    return { success: true, data: mapEbook(row) };
  });

  // ─── PATCH (autosave) ───────────────────────────────────────────
  app.patch<{ Params: { id: string } }>('/api/ebooks/:id', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const row = await prisma.ebook.findFirst({ where: { id: request.params.id, userId } });
    if (!row) throw notFound('E-book não encontrado.');

    const body = request.body as Record<string, any>;
    const allowed: Record<string, any> = {};
    const fields = ['title', 'subtitle', 'author', 'description', 'themeId', 'coverConfig', 'content', 'status', 'pageCount'];
    for (const f of fields) {
      if (body[f] !== undefined) allowed[f] = body[f];
    }

    const updated = await prisma.ebook.update({ where: { id: request.params.id }, data: allowed });
    return { success: true, data: mapEbook(updated) };
  });

  // ─── DELETE ──────────────────────────────────────────────────────
  app.delete<{ Params: { id: string } }>('/api/ebooks/:id', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const row = await prisma.ebook.findFirst({ where: { id: request.params.id, userId } });
    if (!row) throw notFound('E-book não encontrado.');
    await prisma.ebookAsset.deleteMany({ where: { ebookId: request.params.id } });
    await prisma.ebook.delete({ where: { id: request.params.id } });
    return { success: true, data: { id: request.params.id, deleted: true } };
  });

  // ─── UPLOAD ASSET ────────────────────────────────────────────────
  app.post<{ Params: { id: string } }>('/api/ebooks/:id/assets', async (request, reply) => {
    const { userId } = await deps.resolveUser(request);
    const row = await prisma.ebook.findFirst({ where: { id: request.params.id, userId } });
    if (!row) throw notFound('E-book não encontrado.');

    try {
      const parts = request.parts();
      let fileBuffer: Buffer | null = null;
      let fileName = '';
      let mimeType = '';
      let fileSize = 0;

      for await (const part of parts) {
        if (part.type === 'file') {
          const chunks: Buffer[] = [];
          for await (const chunk of part.file) {
            chunks.push(chunk);
            fileSize += chunk.length;
            if (fileSize > MAX_FILE_SIZE) {
              return reply.status(413).send({
                success: false,
                error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Arquivo muito grande. Máximo 8MB.' },
              });
            }
          }
          fileBuffer = Buffer.concat(chunks);
          fileName = part.filename || `asset-${Date.now()}.jpg`;
          mimeType = part.mimetype;
        }
      }

      if (!fileBuffer) {
        return reply.status(400).send({
          success: false,
          error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Nenhum arquivo enviado.' },
        });
      }

      if (!ALLOWED_TYPES.includes(mimeType)) {
        return reply.status(400).send({
          success: false,
          error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Tipo não suportado. Use JPG, PNG ou WebP.' },
        });
      }

      let publicUrl = '';

      if (SUPABASE_SERVICE_ROLE_KEY) {
        // Upload to Supabase Storage
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(
            process.env.SUPABASE_URL ?? '',
            SUPABASE_SERVICE_ROLE_KEY,
          );
          const bucketName = 'ebook-assets';
          const { data: buckets } = await supabase.storage.listBuckets();
          const bucketExists = buckets?.some((b: any) => b.name === bucketName);
          if (!bucketExists) {
            await supabase.storage.createBucket(bucketName, { public: true });
          }
          const path = `${userId}/${request.params.id}/${randomUUID()}-${fileName}`;
          const { error: uploadErr } = await supabase.storage.from(bucketName).upload(path, fileBuffer, {
            contentType: mimeType,
            upsert: false,
          });
          if (uploadErr) throw uploadErr;
          const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(path);
          publicUrl = urlData.publicUrl;
        } catch (supaErr: any) {
          request.log.warn({ err: supaErr }, 'Supabase upload failed, falling back to disk');
          await ensureAssetsDir();
          const diskName = `${randomUUID()}-${fileName}`;
          const diskPath = join(ASSETS_DIR, diskName);
          await writeFile(diskPath, fileBuffer);
          publicUrl = `/api/ebooks/assets/${diskName}`;
        }
      } else {
        // Fallback: disk storage
        await ensureAssetsDir();
        const diskName = `${randomUUID()}-${fileName}`;
        const diskPath = join(ASSETS_DIR, diskName);
        await writeFile(diskPath, fileBuffer);
        publicUrl = `/api/ebooks/assets/${diskName}`;
      }

      const asset = await prisma.ebookAsset.create({
        data: {
          ebookId: request.params.id,
          userId,
          url: publicUrl,
          fileName,
          kind: 'upload',
          sizeBytes: fileSize,
        },
      });

      return reply.status(201).send({ success: true, data: mapAsset(asset) });
    } catch (err: any) {
      request.log.error({ err }, 'Asset upload error');
      throw new ApiError(500, ERROR_CODES.INTERNAL, 'Erro ao fazer upload.');
    }
  });

  // ─── LIST ASSETS ─────────────────────────────────────────────────
  app.get<{ Params: { id: string } }>('/api/ebooks/:id/assets', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const row = await prisma.ebook.findFirst({ where: { id: request.params.id, userId } });
    if (!row) throw notFound('E-book não encontrado.');
    const assets = await prisma.ebookAsset.findMany({
      where: { ebookId: request.params.id },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, data: assets.map(mapAsset) };
  });

  // ─── DELETE ASSET ────────────────────────────────────────────────
  app.delete<{ Params: { id: string; assetId: string } }>('/api/ebooks/:id/assets/:assetId', async (request) => {
    const { userId } = await deps.resolveUser(request);
    const row = await prisma.ebook.findFirst({ where: { id: request.params.id, userId } });
    if (!row) throw notFound('E-book não encontrado.');
    const asset = await prisma.ebookAsset.findFirst({
      where: { id: request.params.assetId, ebookId: request.params.id },
    });
    if (!asset) throw notFound('Asset não encontrado.');
    await prisma.ebookAsset.delete({ where: { id: request.params.assetId } });
    return { success: true, data: { id: request.params.assetId, deleted: true } };
  });

  // ─── SERVE ASSET FROM DISK ──────────────────────────────────────
  app.get('/api/ebooks/assets/:filename', async (request, reply) => {
    const { filename } = request.params as { filename: string };
    const filePath = join(ASSETS_DIR, filename);
    if (!existsSync(filePath)) {
      throw notFound('Arquivo não encontrado.');
    }
    const data = await readFile(filePath);
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    return reply.type(mimeMap[ext] ?? 'image/jpeg').send(data);
  });

  // ─── MOCKUP GENERATION (local, sem IA) ──────────────────────────
  app.post<{ Params: { id: string } }>('/api/ebooks/:id/mockup', async (request, reply) => {
    const { userId } = await deps.resolveUser(request);
    const row = await prisma.ebook.findFirst({ where: { id: request.params.id, userId } });
    if (!row) throw notFound('E-book não encontrado.');

    const body = request.body as { assetId?: string; frame?: string };
    const frameType = body.frame ?? 'book3d';

    if (!body.assetId) {
      return reply.status(400).send({
        success: false,
        error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'assetId é obrigatório.' },
      });
    }

    const sourceAsset = await prisma.ebookAsset.findFirst({
      where: { id: body.assetId, ebookId: request.params.id },
    });
    if (!sourceAsset) throw notFound('Asset de origem não encontrado.');

    // Create a mockup SVG overlay record
    const mockupSvg = generateMockupSvg(frameType, sourceAsset.url);

    await ensureAssetsDir();
    const mockupFileName = `mockup-${randomUUID()}.svg`;
    const mockupPath = join(ASSETS_DIR, mockupFileName);
    await writeFile(mockupPath, mockupSvg);

    let mockupUrl = '';
    if (SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(process.env.SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY);
        const path = `${userId}/${request.params.id}/${mockupFileName}`;
        const { error } = await supabase.storage.from('ebook-assets').upload(path, mockupSvg, {
          contentType: 'image/svg+xml',
        });
        if (!error) {
          const { data } = supabase.storage.from('ebook-assets').getPublicUrl(path);
          mockupUrl = data.publicUrl;
        } else {
          mockupUrl = `/api/ebooks/assets/${mockupFileName}`;
        }
      } catch {
        mockupUrl = `/api/ebooks/assets/${mockupFileName}`;
      }
    } else {
      mockupUrl = `/api/ebooks/assets/${mockupFileName}`;
    }

    const asset = await prisma.ebookAsset.create({
      data: {
        ebookId: request.params.id,
        userId,
        url: mockupUrl,
        fileName: mockupFileName,
        kind: 'mockup',
        sizeBytes: Buffer.byteLength(mockupSvg),
      },
    });

    return reply.status(201).send({ success: true, data: mapAsset(asset) });
  });

  // ─── AI IMAGE GENERATION ─────────────────────────────────────────
  app.post<{ Params: { id: string } }>('/api/ebooks/:id/generate-image', async (request, reply) => {
    const apiKey = process.env.OPENAI_API_KEY ?? process.env.IMAGE_API_KEY ?? '';
    if (!apiKey) {
      return reply.status(501).send({
        success: false,
        error: {
          code: 'NOT_CONFIGURED',
          message: 'Geração de imagem por IA não configurada. Defina OPENAI_API_KEY ou IMAGE_API_KEY no Render para ativar.',
        },
      });
    }

    const { userId } = await deps.resolveUser(request);
    const row = await prisma.ebook.findFirst({ where: { id: request.params.id, userId } });
    if (!row) throw notFound('E-book não encontrado.');

    const body = request.body as { prompt?: string; size?: string };
    if (!body.prompt || body.prompt.trim().length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: ERROR_CODES.VALIDATION_ERROR, message: 'Prompt é obrigatório.' },
      });
    }

    try {
      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt: body.prompt.trim(),
          size: body.size ?? '1024x1024',
          n: 1,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        request.log.error({ err, status: response.status }, 'OpenAI image generation failed');
        throw new ApiError(502, ERROR_CODES.INTERNAL, 'Erro ao gerar imagem.');
      }

      const data = await response.json() as any;
      const imageData = data.data?.[0];
      if (!imageData?.b64_json && !imageData?.url) {
        throw new ApiError(502, ERROR_CODES.INTERNAL, 'Resposta inválida da IA.');
      }

      let imageBuffer: Buffer;
      if (imageData.b64_json) {
        imageBuffer = Buffer.from(imageData.b64_json, 'base64');
      } else {
        const imgResp = await fetch(imageData.url);
        imageBuffer = Buffer.from(await imgResp.arrayBuffer());
      }

      await ensureAssetsDir();
      const imgFileName = `ai-${randomUUID()}.png`;
      const imgPath = join(ASSETS_DIR, imgFileName);
      await writeFile(imgPath, imageBuffer);

      let publicUrl = `/api/ebooks/assets/${imgFileName}`;
      if (SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { createClient } = await import('@supabase/supabase-js');
          const supabase = createClient(process.env.SUPABASE_URL ?? '', SUPABASE_SERVICE_ROLE_KEY);
          const path = `${userId}/${request.params.id}/${imgFileName}`;
          const { error } = await supabase.storage.from('ebook-assets').upload(path, imageBuffer, {
            contentType: 'image/png',
          });
          if (!error) {
            const { data: urlData } = supabase.storage.from('ebook-assets').getPublicUrl(path);
            publicUrl = urlData.publicUrl;
          }
        } catch { /* use disk fallback */ }
      }

      const asset = await prisma.ebookAsset.create({
        data: {
          ebookId: request.params.id,
          userId,
          url: publicUrl,
          fileName: imgFileName,
          kind: 'generated',
          sizeBytes: imageBuffer.length,
        },
      });

      return reply.status(201).send({ success: true, data: mapAsset(asset) });
    } catch (err: any) {
      if (err instanceof ApiError) throw err;
      request.log.error({ err }, 'AI image generation error');
      throw new ApiError(500, ERROR_CODES.INTERNAL, 'Erro ao gerar imagem por IA.');
    }
  });

  // ─── EXPORT PDF ──────────────────────────────────────────────────
  app.post<{ Params: { id: string } }>('/api/ebooks/:id/export', async (request, reply) => {
    const { userId } = await deps.resolveUser(request);
    const row = await prisma.ebook.findFirst({ where: { id: request.params.id, userId } });
    if (!row) throw notFound('E-book não encontrado.');

    const body = request.body as { format?: string; paperSize?: string };
    const paperSize = body.paperSize ?? 'A4';

    const content = (row.content as any[]) ?? [];
    const coverConfig = (row.coverConfig as any) ?? {};
    const html = generateEbookHtml(row, content, coverConfig, paperSize);

    // Try Playwright/Puppeteer for headless PDF, fallback to return HTML
    try {
      const puppeteer = await import('puppeteer');
      const browser = await puppeteer.default.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      const pdfBuffer = await page.pdf({
        format: paperSize as any,
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });
      await browser.close();

      const slug = slugify(row.title);
      const filename = `${slug}.pdf`;
      await ensureAssetsDir();
      const pdfPath = join(ASSETS_DIR, filename);
      await writeFile(pdfPath, pdfBuffer);

      return reply
        .type('application/pdf')
        .header('Content-Disposition', `attachment; filename="${filename}"`)
        .send(pdfBuffer);
    } catch (puppeteerErr: any) {
      request.log.warn({ err: puppeteerErr }, 'Puppeteer not available, returning HTML fallback');
      // Fallback: return HTML for browser print
      return reply
        .type('text/html')
        .header('Content-Disposition', `attachment; filename="${slugify(row.title)}.html"`)
        .send(html);
    }
  });
}

// ─── HELPER: Generate Mockup SVG ──────────────────────────────────
function generateMockupSvg(frame: string, imageUrl: string): string {
  const frames: Record<string, string> = {
    book3d: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800">
        <defs>
          <linearGradient id="spine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#2a2a2a"/>
            <stop offset="100%" stop-color="#1a1a1a"/>
          </linearGradient>
          <filter id="shadow"><feDropShadow dx="8" dy="8" stdDeviation="12" flood-opacity="0.5"/></filter>
          <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="rgba(255,255,255,0.15)"/>
            <stop offset="50%" stop-color="rgba(255,255,255,0)"/>
          </linearGradient>
        </defs>
        <rect x="30" y="20" width="380" height="540" rx="4" fill="#1a1a1a" filter="url(#shadow)"/>
        <rect x="10" y="20" width="20" height="540" rx="3" fill="url(#spine)"/>
        <image href="${imageUrl}" x="30" y="20" width="380" height="540" preserveAspectRatio="xMidYMid slice"/>
        <rect x="30" y="20" width="380" height="540" rx="4" fill="url(#shine)"/>
      </svg>`,
    phone: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 800" width="400" height="800">
        <defs>
          <filter id="sh"><feDropShadow dx="4" dy="6" stdDeviation="8" flood-opacity="0.4"/></filter>
        </defs>
        <rect x="60" y="10" width="280" height="780" rx="40" fill="#111" filter="url(#sh)"/>
        <rect x="140" y="20" width="120" height="8" rx="4" fill="#333"/>
        <rect x="68" y="40" width="264" height="720" rx="28" fill="#000"/>
        <image href="${imageUrl}" x="68" y="40" width="264" height="720" preserveAspectRatio="xMidYMid slice"/>
      </svg>`,
    notebook: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" width="900" height="600">
        <defs>
          <filter id="ns"><feDropShadow dx="6" dy="10" stdDeviation="16" flood-opacity="0.4"/></filter>
        </defs>
        <rect x="40" y="40" width="820" height="520" rx="12" fill="#1a1a1a" filter="url(#ns)"/>
        <rect x="50" y="50" width="800" height="480" rx="8" fill="#000"/>
        <image href="${imageUrl}" x="50" y="50" width="800" height="480" preserveAspectRatio="xMidYMid slice"/>
        <rect x="40" y="540" width="820" height="20" rx="4" fill="#2a2a2a"/>
      </svg>`,
    frame: `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 700" width="500" height="700">
        <defs>
          <filter id="fs"><feDropShadow dx="4" dy="6" stdDeviation="10" flood-opacity="0.4"/></filter>
        </defs>
        <rect x="10" y="10" width="480" height="680" rx="4" fill="#d4af37" filter="url(#fs)"/>
        <rect x="24" y="24" width="452" height="652" rx="2" fill="#f5f0e6"/>
        <image href="${imageUrl}" x="24" y="24" width="452" height="652" preserveAspectRatio="xMidYMid slice"/>
      </svg>`,
  };
  return frames[frame] ?? frames.book3d;
}

// ─── HELPER: Generate Printable HTML ──────────────────────────────
function generateEbookHtml(ebook: any, content: any[], coverConfig: any, paperSize: string): string {
  const themeStyles = getThemeStyles(ebook.themeId ?? 'editorial');

  let bodyHtml = '';
  let pageCount = 0;

  for (const block of content) {
    switch (block.type) {
      case 'cover':
        pageCount++;
        bodyHtml += `
          <div class="page cover-page">
            <div class="cover-bg" style="background: ${coverConfig.gradient ?? themeStyles.coverGradient}">
              ${coverConfig.imageUrl ? `<img src="${coverConfig.imageUrl}" class="cover-image"/>` : ''}
              <div class="cover-content">
                <h1 class="cover-title">${escapeHtml(block.title ?? ebook.title ?? '')}</h1>
                ${block.subtitle ? `<p class="cover-subtitle">${escapeHtml(block.subtitle)}</p>` : ''}
                ${block.author ? `<p class="cover-author">${escapeHtml(block.author)}</p>` : ''}
              </div>
            </div>
          </div>`;
        break;
      case 'chapter':
        pageCount++;
        bodyHtml += `
          <div class="page chapter-page">
            <div class="chapter-number">${block.number ?? ''}</div>
            <h1 class="chapter-title">${escapeHtml(block.title ?? '')}</h1>
          </div>`;
        break;
      case 'heading':
        bodyHtml += `<div class="block"><h2 class="heading">${escapeHtml(block.text ?? '')}</h2></div>`;
        break;
      case 'heading3':
        bodyHtml += `<div class="block"><h3 class="heading3">${escapeHtml(block.text ?? '')}</h3></div>`;
        break;
      case 'paragraph':
        bodyHtml += `<div class="block"><p class="paragraph ${block.dropCap ? 'drop-cap' : ''}">${escapeHtml(block.text ?? '')}</p></div>`;
        break;
      case 'list':
        const listTag = block.ordered ? 'ol' : 'ul';
        const items = (block.items ?? []).map((i: string) => `<li>${escapeHtml(i)}</li>`).join('');
        bodyHtml += `<div class="block"><${listTag} class="list">${items}</${listTag}></div>`;
        break;
      case 'quote':
        bodyHtml += `<div class="block"><blockquote class="quote">${escapeHtml(block.text ?? '')}</blockquote></div>`;
        break;
      case 'callout':
        bodyHtml += `<div class="block callout callout-${block.variant ?? 'info'}"><strong>${escapeHtml(block.label ?? 'Dica')}</strong><p>${escapeHtml(block.text ?? '')}</p></div>`;
        break;
      case 'image':
        bodyHtml += `<div class="block image-block image-${block.layout ?? 'column'}"><img src="${escapeHtml(block.url ?? '')}" alt="${escapeHtml(block.caption ?? '')}"/>${block.caption ? `<p class="caption">${escapeHtml(block.caption)}</p>` : ''}</div>`;
        break;
      case 'divider':
        bodyHtml += `<div class="block divider"><hr/></div>`;
        break;
      case 'pagebreak':
        pageCount++;
        bodyHtml += `<div class="page-break"></div>`;
        break;
      case 'cta':
        bodyHtml += `<div class="block cta-box"><p>${escapeHtml(block.text ?? '')}</p>${block.url ? `<a href="${escapeHtml(block.url)}">${escapeHtml(block.label ?? 'Acessar')}</a>` : ''}</div>`;
        break;
      case 'table':
        const rows = (block.rows ?? []).map((row: string[]) =>
          `<tr>${row.map((cell: string) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`
        ).join('');
        bodyHtml += `<div class="block"><table class="table">${rows}</table></div>`;
        break;
      case 'toc':
        bodyHtml += `<div class="block toc"><h2>Sumário</h2><ul>${content.filter((b: any) => b.type === 'chapter').map((ch: any, i: number) => `<li><span>${escapeHtml(ch.title ?? '')}</span></li>`).join('')}</ul></div>`;
        break;
      default:
        break;
    }
  }

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>${escapeHtml(ebook.title ?? 'E-book')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;500;600;700&family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet"/>
<style>
  @page { size: ${paperSize}; margin: 20mm 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: ${themeStyles.bodyFont}; color: ${themeStyles.textColor}; line-height: 1.7; font-size: 11pt; }
  .page { page-break-after: always; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .cover-page { padding: 0; }
  .cover-bg { width: 100%; min-height: 100vh; display: flex; align-items: center; justify-content: center; position: relative; }
  .cover-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .cover-content { position: relative; z-index: 1; text-align: center; padding: 60px 40px; }
  .cover-title { font-family: ${themeStyles.headingFont}; font-size: 36pt; font-weight: 900; color: #fff; margin-bottom: 16px; text-shadow: 0 2px 20px rgba(0,0,0,0.5); }
  .cover-subtitle { font-size: 14pt; color: rgba(255,255,255,0.85); margin-bottom: 8px; }
  .cover-author { font-size: 12pt; color: rgba(255,255,255,0.7); margin-top: 32px; }
  .chapter-page { flex-direction: column; text-align: center; }
  .chapter-number { font-family: ${themeStyles.headingFont}; font-size: 72pt; font-weight: 900; color: ${themeStyles.accentColor}; opacity: 0.15; line-height: 1; }
  .chapter-title { font-family: ${themeStyles.headingFont}; font-size: 28pt; font-weight: 700; margin-top: -20px; }
  .block { margin-bottom: 16px; }
  .heading { font-family: ${themeStyles.headingFont}; font-size: 18pt; font-weight: 700; margin: 24px 0 12px; border-bottom: 2px solid ${themeStyles.accentColor}; padding-bottom: 6px; }
  .heading3 { font-family: ${themeStyles.headingFont}; font-size: 14pt; font-weight: 600; margin: 20px 0 8px; }
  .paragraph { text-align: justify; hyphens: auto; }
  .drop-cap::first-letter { float: left; font-family: ${themeStyles.headingFont}; font-size: 48pt; font-weight: 900; line-height: 0.8; margin: 0 12px 0 0; color: ${themeStyles.accentColor}; }
  .list { padding-left: 24px; margin: 8px 0; }
  .list li { margin-bottom: 4px; }
  .quote { font-family: ${themeStyles.headingFont}; font-size: 16pt; font-style: italic; color: ${themeStyles.accentColor}; border-left: 4px solid ${themeStyles.accentColor}; padding: 16px 24px; margin: 24px 0; background: ${themeStyles.accentBg}; }
  .callout { padding: 16px 20px; border-radius: 8px; margin: 16px 0; }
  .callout-info { background: #e8f4fd; border-left: 4px solid #3b82f6; }
  .callout-warning { background: #fef3cd; border-left: 4px solid #f59e0b; }
  .callout-success { background: #d1fae5; border-left: 4px solid #10b981; }
  .image-block img { max-width: 100%; border-radius: 4px; }
  .image-full-bleed img { width: 100vw; margin-left: -15mm; }
  .image-column { max-width: 60%; }
  .caption { font-size: 9pt; color: #666; text-align: center; margin-top: 4px; }
  .divider hr { border: none; border-top: 1px solid #ddd; margin: 24px 0; }
  .page-break { page-break-after: always; }
  .cta-box { background: ${themeStyles.accentBg}; border: 2px solid ${themeStyles.accentColor}; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }
  .cta-box a { display: inline-block; padding: 10px 24px; background: ${themeStyles.accentColor}; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 12px; }
  .table { width: 100%; border-collapse: collapse; margin: 16px 0; }
  .table td { padding: 8px 12px; border: 1px solid #ddd; font-size: 10pt; }
  .toc { page-break-after: always; }
  .toc h2 { font-family: ${themeStyles.headingFont}; margin-bottom: 16px; }
  .toc li { margin-bottom: 6px; list-style: none; border-bottom: 1px dotted #ccc; padding-bottom: 4px; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}

function getThemeStyles(themeId: string): Record<string, string> {
  const themes: Record<string, Record<string, string>> = {
    editorial: {
      headingFont: "'Playfair Display', Georgia, serif",
      bodyFont: "'Merriweather', 'Times New Roman', serif",
      textColor: '#1a1a1a',
      accentColor: '#8b0000',
      accentBg: '#fdf2f2',
      coverGradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    },
    moderno: {
      headingFont: "'Inter', Helvetica, sans-serif",
      bodyFont: "'Inter', Helvetica, sans-serif",
      textColor: '#111',
      accentColor: '#6366f1',
      accentBg: '#eef2ff',
      coverGradient: 'linear-gradient(135deg, #0f0f23 0%, #1e1b4b 50%, #312e81 100%)',
    },
    minimal: {
      headingFont: "'Playfair Display', Georgia, serif",
      bodyFont: "'Inter', Helvetica, sans-serif",
      textColor: '#1a1a1a',
      accentColor: '#b8860b',
      accentBg: '#faf9f5',
      coverGradient: 'linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)',
    },
    revista: {
      headingFont: "'Inter', Helvetica, sans-serif",
      bodyFont: "'Inter', Helvetica, sans-serif",
      textColor: '#222',
      accentColor: '#e11d48',
      accentBg: '#fff1f2',
      coverGradient: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)',
    },
    workbook: {
      headingFont: "'Inter', Helvetica, sans-serif",
      bodyFont: "'Inter', Helvetica, sans-serif",
      textColor: '#1a1a1a',
      accentColor: '#059669',
      accentBg: '#ecfdf5',
      coverGradient: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)',
    },
  };
  return themes[themeId] ?? themes.editorial;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
