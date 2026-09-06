# CAÇAOFERTA

> **Nome comercial:** CaçaOferta
> **Tagline:** Encontre ofertas. Analise anúncios. Descubra oportunidades.

Ferramenta SaaS para profissionais de marketing, afiliados, gestores de tráfego e produtores de **low ticket** — pesquisa e mineração de anúncios na **Meta Ads Library**.

## Arquitetura em uma linha

Uma **extensão Chrome (Manifest V3)** adiciona uma camada de ferramentas sobre a Biblioteca de Anúncios da Meta; um **dashboard web** organiza e analisa a biblioteca pessoal de ofertas; um **backend/API** (Node + Fastify) e um **banco (PostgreSQL via Supabase + Prisma)** persistem os dados.

```
CAÇAOFERTA
  ├─ Extensão Chrome ── conteúdo na Meta Ads Library
  ├─ Dashboard Web ─── visualização e gestão
  ├─ Backend/API ───── persistência, autenticação, regras
  └─ Database ──────── PostgreSQL (Supabase) + Prisma
```

## Monorepo

- **pnpm workspaces**
- `/apps/web` — dashboard React + Vite + TailwindCSS
- `/apps/extension` — extensão Chrome Manifest V3 (React + Vite)
- `/apps/api` — backend Node.js + TypeScript + Fastify
- `/packages/types` — tipos TS compartilhados
- `/packages/shared` — contratos/DTOs/schemas compartilhados
- `/packages/utils` — utilitários puros e testáveis
- `/packages/ui` — componentes de UI compartilhados (tema + marca)
- `/database` — schema Prisma (PostgreSQL/Supabase)
- `/tests` — testes transversais
- `/docs` — documentação técnica

## Pré-requisitos

- Node.js 20+ (testado com Node 24)
- pnpm (instale com `npm install -g pnpm`)
- Google Chrome

## Instalação

```bash
pnpm install
```

## Variáveis de ambiente

Copie o modelo:

```bash
cp .env.example .env
```

| Variável | Onde é usada | Visibilidade |
| --- | --- | --- |
| `DATABASE_URL` | `database/` (Prisma) e backend | **Privada** — nunca no frontend/extensão |
| `SUPABASE_URL` | client (web/extensão) | Pública |
| `SUPABASE_ANON_KEY` | client (web/extensão) | Pública |
| `SUPABASE_SERVICE_ROLE_KEY` | somente backend | **Privada** — nunca expor |
| `VITE_API_URL` | web (`apps/web/.env`) | Pública (prefixo `VITE_`) |
| `API_HOST` / `API_PORT` | backend | Privada |
| `CORS_ORIGIN` | backend | Privada |

**Regra:** `DATABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` nunca devem aparecer em código de React, Vite client, extensão, content script ou service worker público.

## Comandos

| Comando | Ação |
| --- | --- |
| `pnpm dev:web` | Sobe o dashboard (http://localhost:5173) |
| `pnpm dev:api` | Sobe a API com watch (http://localhost:3333) |
| `pnpm dev:extension` | Compila a extensão (`apps/extension/dist`) |
| `pnpm build` | Build de todos os apps |
| `pnpm build:extension` | Build da extensão Chrome |
| `pnpm test` | Roda os testes (vitest) |
| `pnpm lint` | Roda ESLint |
| `pnpm typecheck` | Roda typecheck TypeScript |
| `pnpm format` | Formata com Prettier |
| `pnpm db:generate` | Gera o Prisma Client |
| `pnpm db:validate` | Valida o schema Prisma |

## Extensão no Chrome

1. `pnpm build:extension`
2. Abra `chrome://extensions`
3. Ative **Modo do desenvolvedor** (canto superior direito)
4. Clique em **Carregar sem compactação**
5. Selecione a pasta `apps/extension/dist`
6. Abra `https://www.facebook.com/ads/library/`

**Teste manual (FASE 03 + FASE 05):** abra a Biblioteca, role a página e use as
ações do badge **CAÇAOFERTA** em cada card: `🔎 Pesquisar domínio` abre a
**sidebar** já preenchida, `📋 Copiar ID`/`📋 Copiar domínio`/`📋 Copiar URL`,
`🌐 Abrir domínio`/`🌐 Abrir anúncio` (sempre sob ação explícita do usuário).

**Interface (FASE 05):** além dos cards (status, página, ID, início/encerramento,
dias rodando com faixa visual, mídia, plataformas, domínio e ações), a extensão
monta uma **sidebar dedicada** (`CaçaOfertaSidebar`, `data-caca-oferta-sidebar`)
fixa na lateral direita: 🔎 CAÇAOFERTA com `● Extensão ativa`, busca por domínio
(reusa o pipeline da FASE 03 — mesmo `DomainIndex`/`searchByDomain`, sem segunda
implementação), **ANÚNCIOS DETECTADOS** com total/ativos/encerrados/desconhecidos
atualizados ao vivo, e links ⚙ Configurações / ⭐ Minhas ofertas (mensagem
honesta: ainda não implementados). A sidebar é recolhível, redimensionável,
com scroll interno, e não bloqueia a página. Todo o CSS é isolado em Shadow DOM
(nenhum estilo global sobre a Meta). A busca consulta somente o **índice local**
de anúncios detectados na sessão — nada é afirmado sobre a base completa da Meta.

**Parser (FASE 04):** cada card é extraído pelo `MetaAdsLibraryAdapter.parseAdCard()`
em uma estrutura canônica `NormalizedAd` (status `active/inactive/unknown`,
mídia `image/video/carousel/unknown`, plataformas normalizadas, `runningDays`,
`creativeUrl`/`thumbnailUrl`, `parseConfidence`) e então derivada para o
`ParsedAd` em pt usado na interface. Datas pt-BR (por extenso e abreviadas),
decodificação de `l.php?u=`, exclusão de avatares das imagens do criativo,
validação e confiança estão cobertos por **fixtures HTML** em
`apps/extension/src/content/__fixtures__/html/` (anúncio completo, vídeo,
carrossel, sem ID, sem domínio, ativo, encerrado, múltiplos, dinâmico e
incompleto) + testes E2E do parser. O pipeline da FASE 02/03 (detecção,
overlay, índice por domínio) não mudou de comportamento.

**Logs de desenvolvimento** (por padrão desligados): no console da página da
Biblioteca, execute `localStorage.setItem('co.debug','1')` e recarregue. Logs
`[CaçaOferta]` mostram detecção de cards, parsing, duplicados ignorados,
inválidos e domínios indexados. Também marcam a página (`<html data-caca-oferta="active">`).

Detalhes completos em [`docs/INSTALL.md`](docs/INSTALL.md).

## Fases

| Fase | Status |
| --- | --- |
| 01 — Arquitetura e configuração do projeto | ✅ concluída |
| 02 — Detecção dos anúncios da Meta Ads Library | ✅ concluída |
| 03 — Extração, normalização e pesquisa por domínio | ✅ concluída |
| 04 — Parser dos dados | ✅ concluída |
| 05 — Interface CaçaOferta na Biblioteca | ✅ concluída |
| 06 — Pesquisa por domínio (avançada) | aguardando |
| 07 — Salvar ofertas | aguardando |
| 08 — Backend e banco | aguardando |
| 09 — Dashboard | aguardando |
| 10 — Tags, favoritos e notas | aguardando |
| 11 — Criativos e downloads permitidos | aguardando |
| 12 — Testes e estabilidade | aguardando |
| 13 — Build final | aguardando |

## API — FASE 06

Endpoints de ofertas salvas (`/api/saved-ads`). Todos os caminhos usam o usuário dev temporário (`DEV_USER_ID`) quando não há autenticação real; em produção, `resolveCurrentUser` retorna 401.

### POST /api/saved-ads

- **Finalidade**: Salvar uma nova oferta. Valida payload via Zod, verifica duplicidade pelo `@@unique([userId, adLibraryId])`.
- **Payload esperado** (objeto `NormalizedAd`): `adLibraryId`, `pageId`, `pageName`, `status`, `deliveryStartDate`, `deliveryStopDate`, `runningDays`, `platforms`, `mediaType`, `creativeText`, `headline`, `description`, `cta`, `destinationUrl`, `destinationDomain`, `adSnapshotUrl`, `creativeUrl`, `thumbnailUrl`, `savedAt`, `updatedAt`.
- **Resposta de sucesso**: `{ success: true, data: { id, adLibraryId, ... } }` — código 201.
- **Resposta de duplicidade**: `{ success: false, error: { code: 'ALREADY_SAVED', message: 'Esta oferta já foi salva.' } }` — código 409. O front termina em estado "✓ Já salva".
- **Erros**: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401 — sem `DEV_USER_ID` ou inválido), `NOT_FOUND` (404), `INTERNAL` (500).
- **Variáveis de ambiente**: `DEV_USER_ID` (padrão `dev-` prefixo para IDs não‑UUID); `API_BASE_URL`/`API_SAVED_ADS_PATH` (já definidos nos constants compartilhados).
- **Execução local**: `pnpm dev:api` sobe a API em `http://localhost:3333`. O front usa `API_BASE_URL = 'http://127.0.0.1:3333'`.

### GET /api/saved-ads

- **Finalidade**: Listar ofertas salvas do usuário atual, com paginação e isolamento por usuário.
- **Payload opcional**: `page` (padrão 1) e `pageSize` (padrão 50).
- **Resposta de sucesso**: `{ success: true, data: { items: [...], page, pageSize, total } }` — código 200. Ordenação: `savedAt desc`, tiebreak `adLibraryId desc`.
- **Isolamento**: Apenas ofertas do `DEV_USER_ID` (ou do usuário autenticado) são retornadas.
- **Erros**: `UNAUTHORIZED` (401), `INTERNAL` (500).

### GET /api/saved-ads/:id

- **Finalidade**: Obter uma oferta salva específica por ID.
- **Resposta de sucesso**: `{ success: true, data: { id, adLibraryId, ... } }` — código 200.
- **Not found**: `{ success: false, error: { code: 'NOT_FOUND', message: 'Oferta não encontrada.' } }` — código 404.
- **Erros**: `UNAUTHORIZED` (401), `INTERNAL` (500).

### DELETE /api/saved-ads/:id

- **Finalidade**: Remover uma oferta salva.
- **Resposta de sucesso**: `{ success: true, data: { id, deleted: true } }` — código 200 (ou 204 sem corpo).
- **Após delete**: a lista é recarregada e a UI mostra "Nenhuma oferta salva ainda." se não houver mais ofertas.
- **Erros**: `UNAUTHORIZED` (401), `NOT_FOUND` (404 — id não pertence ao usuário), `INTERNAL` (500).

### Configuração de variáveis de ambiente

Copiar `.env.example` para `.env`:

```
DEV_USER_ID=
API_BASE_URL=http://127.0.0.1:3333
API_SAVED_ADS_PATH=/api/saved-ads
```

### Execução local

```bash
pnpm install
cp .env.example .env    # verificar DEV_USER_ID
pnpm dev:api            # sobe API (Fastify + Prisma)
pnpm dev:extension      # compila/roda extensão em modo dev
pnpm dev:web            # sobe dashboard (http://localhost:5173)
```

### Migration

O schema Prisma está em `/database/prisma/schema.prisma`. A migration inicial foi gerada (`prisma migrate dev init` ou equivalente). Para aplicar em banco real:

1. Configurar `DATABASE_URL` no `.env` com credenciais de PostgreSQL/Supabase.
2. `pnpm --filter @caca-oferta/database prisma:migrate dev init`
3. Após aprovação do schema, `pnpm --filter @caca-oferta/database prisma:migrate deploy`

**NÃO** definir `DATABASE_URL` com credenciais falsas nem executar comandos destrutivos. Caso `DATABASE_URL` continue como placeholder, a migration não é aplicada e o fluxo é coberto por testes in-memory (como os 251 testes da extensão e 19 da API).

---

## Documentação

- [`docs/01-ARCHITECTURE.md`](docs/01-ARCHITECTURE.md) — arquitetura geral
- [`docs/02-EXTENSION.md`](docs/02-EXTENSION.md) — arquitetura da extensão
- [`docs/03-PARSER-DETECTION.md`](docs/03-PARSER-DETECTION.md) — parser e detecção
- [`docs/04-DOMAIN.md`](docs/04-DOMAIN.md) — domínio/normalização
- [`docs/05-DATABASE.md`](docs/05-DATABASE.md) — modelo de dados
- [`docs/06-API.md`](docs/06-API.md) — endpoints REST completos
- [`docs/07-ROADMAP.md`](docs/07-ROADMAP.md) — fases e riscos
- [`docs/08-SECURITY.md`](docs/08-SECURITY.md) — segurança e privacidade
- [`docs/09-TESTING.md`](docs/09-TESTING.md) — estratégia de testes
- [`docs/INSTALL.md`](docs/INSTALL.md) — instalação passo a passo

- [`docs/01-ARCHITECTURE.md`](docs/01-ARCHITECTURE.md) — arquitetura geral
- [`docs/02-EXTENSION.md`](docs/02-EXTENSION.md) — arquitetura da extensão
- [`docs/03-PARSER-DETECTION.md`](docs/03-PARSER-DETECTION.md) — parser e detecção
- [`docs/04-DOMAIN.md`](docs/04-DOMAIN.md) — domínio/normalização
- [`docs/05-DATABASE.md`](docs/05-DATABASE.md) — modelo de dados
- [`docs/06-API.md`](docs/06-API.md) — endpoints REST
- [`docs/07-ROADMAP.md`](docs/07-ROADMAP.md) — fases e riscos
- [`docs/08-SECURITY.md`](docs/08-SECURITY.md) — segurança e privacidade
- [`docs/09-TESTING.md`](docs/09-TESTING.md) — estratégia de testes
- [`docs/INSTALL.md`](docs/INSTALL.md) — instalação passo a passo