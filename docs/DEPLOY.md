# CaçaOferta — DEPLOY

## API — Railway

- **Root Directory**: (monorepo root — pnpm resolve workspace)
- **Build Command**: `pnpm build`
- **Start Command**: `pnpm --filter @caca-oferta/api start`
- **Port**: `process.env.PORT` ou `3333` (variável definida no painel Railway)
- **Host**: `0.0.0.0` (API configura automaticamente via API_HOST)
- **Health Check**: `GET /health` — responde `{ status: 'ok', service: 'caçaoferta-api', timestamp: '...' }` sem autenticação
- **CORS**: Variável `WEB_URL` define o domínio permitido. Em desenvolvimento usa `*`. Em produção, definir o domínio da Vercel.

### Variáveis de ambiente (no painel Railway)

```
API_HOST=0.0.0.0
API_PORT=3333
WEB_URL=https://seu-dashboard.vercel.app
NODE_ENV=production
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua-key-anon
SUPABASE_SERVICE_ROLE_KEY=sua-key-service-role
```

## Dashboard — Vercel

- **Framework**: React + Vite (detectado automaticamente)
- **Build Command**: `pnpm build`
- **Output Directory**: `dist` (padrão Vite)
- **Framework Preset**: Vite
- **Variáveis de ambiente**: configurar no painel Vercel

### Variáveis de ambiente (no painel Vercel)

```
VITE_API_URL=https://sua-api.railway.app
```

A variável `VITE_API_URL` é lida pelo `useHealth.ts` e `@caca-oferta/utils` para comunicação com a API. Caso não definida, o fallback é `http://localhost:3333/health`.

## Banco de Dados — Supabase

- **URL**: `DATABASE_URL` no painel Supabase / Railway / Vercel (nunca no frontend)
- **Driver**: PostgreSQL via Supabase Pooler
- **Migrations**: gerenciadas via Prisma — `pnpm db:migrate` (ambiente controlado, não em produção automática)
- **Observação**: A conexão direta `db.mkujbqbxfsiqvxhwvgxn.supabase.co` não resolve neste ambiente; usar hostname do pooler `aws-0-sa-east-1.pooler.supabase.com` com a DATABASE_URL atual.

### Variáveis de ambiente

```
DATABASE_URL=postgresql://prisma.mkujbqbxfsiqvxhwvgxn:PrismaCacaOfertas2026@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

## Extensão Chrome (Manifest V3)

- **Build**: `pnpm --filter @caca-oferta/extension build`
- **Artefato**: pasta `dist/` da extension
- **API de Produção**: URL da API em produção (Railway) — configurada via VITE_API_URL ou injetada pelo painel do desenvolvedor
- **Sem secrets privados**: a extensão usa apenas `SUPABASE_URL` e `SUPABASE_ANON_KEY` (públicos)

### Variáveis de ambiente (opcional, via Vite)

```
VITE_API_URL=https://sua-api.railway.app
```

---

## Checklist Rápido

- [ ] Definir `WEB_URL` no Railway (para CORS)
- [ ] Definir `VITE_API_URL` na Vercel (para dashboard)
- [ ] Definir `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` no painel de hosting
- [ ] Verificar que `NODE_ENV=production` está definido
- [ ] Rodar `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm build` localmente antes de deploy
- [ ] Confirmar 279 testes passando