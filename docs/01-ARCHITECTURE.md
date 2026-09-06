# CAÇAOFERTA — Arquitetura Geral

> **Nome comercial:** CaçaOferta
> **Nome curto (extensão):** CaçaOferta
> **Tagline:** "Encontre ofertas. Analise anúncios. Descubra oportunidades."

Plataforma SaaS de mineração de ofertas e análise de anúncios, focada em **low ticket**, construída em camadas sobre a **Meta Ads Library**.

Este documento define a arquitetura técnica oficial. É o **planejamento** do projeto — a implementação acontece em fases (ver `07-ROADMAP.md`), nunca tudo de uma vez.

---

## 1. Visão Geral

```
                    CAÇAOFERTA
```
de
```
                        CAÇAOFERTA
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
     EXTENSÃO             DASHBOARD          BACKEND
      CHROME                 WEB               API
          │                  │                  │
          │                  │                  ▼
          │                  │              DATABASE
          │                  │                  │
          │                  └──────────────────┘
          │
          ▼
    META ADS LIBRARY
```

- **Extensão Chrome** → interage com a página da Meta Ads Library, detecta anúncios, extrai dados, oferece a interface CaçaOferta sobre a página e pesquisa por domínio.
- **Dashboard Web** → visualização e gestão da biblioteca pessoal de ofertas (salvar, organizar, tags, notas, filtros, análises).
- **Backend/API** → persistência, autenticação, regras de negócio, busca por domínio, deduplicação.
- **Banco de dados** → dados permanentes e relacionais.

---

## 2. Princípios de Arquitetura

1. **Desacoplamento por plataforma.** A camada de adaptadores (`AdPlatformAdapter`) isola a lógica de mineração da Meta. O sistema não é construído "preso" à Meta.
2. **Parser resiliente e isolado.** O `MetaAdsLibraryAdapter` é o único módulo que conhece o DOM da Meta. Se a Meta mudar o markup, atualizamos **somente** esse módulo.
3. **Não reprocessar o DOM inteiro.** Só se processam elementos novos ou alterados (incremental + deduplicação).
4. **Dados reais, nunca inventados.** Campos ausentes ficam nulos/indisponíveis. Não há dados fictícios apresentados como reais.
5. **Segurança por padrão.** JWT, validação de inputs, Row Level Security, sem secrets no frontend, sem senhas/cookies da Meta na extensão.
6. **Privacidade mínima.** Coleta-se somente o necessário ao funcionamento.

---

## 3. Stack Tecnológica Recomendada

| Camada | Tecnologia | Justificativa |
|---|---|---|
| **Frontend (web)** | React + TypeScript + Vite + TailwindCSS + Lucide Icons | Ecossistema maduro, tipagem forte, build rápido |
| **Extensão** | Chrome Extension Manifest V3 + React + TypeScript + Vite | MV3 exigido pela Chrome Web Store; mesmo stack do web |
| **Backend** | Node.js + TypeScript + REST API (Fastify ou Express) | Mesma linguagem de todo o monorepo |
| **Database** | PostgreSQL | Relacional, RLS nativa, índices |
| **ORM** | Prisma | Migrations, tipagem, integração com Supabase |
| **Backend gerenciado** | Supabase (Auth + Postgres + RLS) | Autenticação e banco escaláveis sem infra própria |
| **Deploy** | Vercel (web e API) ou Cloudflare | Serverless, baixo custo |
| **Versionamento** | Git + GitHub | Controle de versão e CI |

---

## 4. Estrutura do Monorepo

```
caca-oferta/
├── apps/
│   ├── web/              → Dashboard React (Vite + Tailwind)
│   ├── extension/        → Extensão Chrome MV3 (content scripts, side panel, popup, SW)
│   └── api/              → Backend Node/TypeScript REST, integração Supabase
├── packages/
│   ├── shared/           → DTOs, schemas de validação (zod), helpers compartilhados
│   ├── types/            → Tipos TypeScript globais (Ad, Domain, User, etc.)
│   ├── ui/               → Componentes React reutilizáveis (web + extensão)
│   └── utils/            → Funções puras: domain, running days, format, etc.
├── database/
│   ├── prisma/           → Schema Prisma, migrations
│   └── seeds/            → Dados iniciais (tags padrão)
├── docs/                 → Documentação técnica (este conjunto de arquivos)
├── tests/                → Testes transversais (e2e, fixtures HTML)
├── package.json          → Workspaces npm
├── turbo.json (opcional) → Orquestração de tasks
└── .github/              → Workflows CI
```

**Responsabilidades:**

- `apps/extension` — UI, DOM parser, serviços, estado, API client, autenticação, utilitários da extensão. Modular, sem toda a lógica num único content script.
- `apps/web` — Dashboard: biblioteca, filtros, pesquisa, tags, notas, favoritos.
- `apps/api` — Endpoints REST, autenticação, regras de negócio, persistência.
- `packages/shared` — DTOs e schemas usados por extensão e API (fonte única da verdade de contratos).
- `packages/types` — Tipos compartilhados do domínio.
- `packages/ui` — Componentes de UI compartilhados entre dashboard e extensão.
- `packages/utils` — Funções puras e testáveis (domínio, dias, datas).
- `database/prisma` — Schema e migrations.
- `docs` — Esta documentação.

---

## 5. Decisões de Arquitetura-chave (ADR resumido)

| Decisão | Escolha | Motivo |
|---|---|---|
| Comunicação extensão ↔ backend | HTTPS + JWT em `Authorization: Bearer` | Simples, stateless, seguro em MV3 |
| Auth | Supabase Auth (email/senha), JWT | Não reinventar; escopo do app |
| Isolamento da Meta | `AdPlatformAdapter` + `MetaAdsLibraryAdapter` | Expansão futura (Google/TikTok/Pinterest) |
| Deduplicação | Unique `(user_id, ad_library_id)` em `SavedAd` | Evita duplicidade semântica sem depender de chave natural global |
| Estado da extensão | Chrome `storage.local` (dados leves) + estado React em memória | Rápido e persistente entre recarregamentos |
| Subscribe ao DOM | `MutationObserver` + `debounce` + `WeakSet` para deduplicar | Detecção incremental de carregamento dinâmico |

---

## 6. Módulos principais e responsabilidades

| Módulo | Responsabilidade |
|---|---|
| `AdPlatformAdapter` (abstrato) | Contrato comum de mineração (detect, parse, extract, normalize) |
| `MetaAdsLibraryAdapter` | Implementação para a Meta Ads Library (DOM parsing, urls, IDs) |
| `DomainService` | `normalizeDomain`, `extractDomain`, `searchByDomain` |
| `RunningDaysService` | `calculateRunningDays` e filtros +7/+14/+30/+60/+90 |
| `OfferService` | `saveOffer`, deduplicação, biblioteca |
| `AuthService` | Login, cadastro, logout, sessão, token |
| `ExtensionMessaging` | Comunicação interna (content script ↔ SW ↔ side panel) |
| `ApiClient` | Chamadas HTTPS ao backend, validação de respostas |

Os detalhes residem nos documentos específicos:
- `02-EXTENSION.md`
- `03-PARSER-DETECTION.md`
- `04-DOMAIN.md`
- `05-DATABASE.md`
- `06-API.md`
- `07-ROADMAP.md`
- `08-SECURITY.md`
- `09-TESTING.md`
- `10-RISKS.md`

*(Escrito para a plataforma oficial **CaçaOferta**.)*
