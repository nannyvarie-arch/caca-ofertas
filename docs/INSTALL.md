# CaçaOferta — Instalação e Execução

Guia passo a passo para instalar dependências, rodar cada parte do projeto e carregar a extensão no Chrome.

## 1. Pré-requisitos

- **Node.js 20+** (testado com Node 24)
- **pnpm** — `npm install -g pnpm`
- **Google Chrome** (para a extensão)
- **Git** (para clonar o repositório)

## 2. Instalar dependências

Na raiz do monorepo:

```bash
pnpm install
```

Isso instala todas as workspaces (`apps/*`, `packages/*`, `database`, `tests`).

## 3. Variáveis de ambiente

O projeto **não versiona `.env`**. Copie o modelo e preencha conforme necessário:

```bash
cp .env.example .env
```

Para o Prisma funcionar localmente, crie também `database/.env` (veja `database/.env.example`) com o `DATABASE_URL` do seu PostgreSQL/Supabase — necessário apenas para `migrate`/`studio`.

### Onde cada variável é usada

| Variável | Usada em | Visibilidade |
| --- | --- | --- |
| `DATABASE_URL` | `database/` e backend | privada (never frontend/extensão) |
| `SUPABASE_URL` | client web/extensão | pública |
| `SUPABASE_ANON_KEY` | client web/extensão | pública |
| `SUPABASE_SERVICE_ROLE_KEY` | somente backend | privada (never frontend/extensão) |
| `VITE_API_URL` | `apps/web/.env` | pública (prefixo `VITE_`) |
| `API_HOST` | backend | privada |
| `API_PORT` | backend | privada |
| `CORS_ORIGIN` | backend | privada |

> `DATABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` **nunca** devem aparecer no frontend, na extensão, no content script ou no service worker público.

## 4. Executar o frontend (dashboard)

```bash
pnpm dev:web
```

Abrir `http://localhost:5173`. A página inicial verifica a API (mostra "API online/offline").

## 5. Executar a API

```bash
pnpm dev:api
```

Health check: `GET http://localhost:3333/health` retorna:

```json
{
  "status": "ok",
  "service": "caçaoferta-api",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Teste rápido (PowerShell):

```powershell
Invoke-RestMethod http://localhost:3333/health
```

## 6. Banco de dados (Prisma)

```bash
# valida o schema
pnpm db:validate

# gera o Prisma Client (não precisa de banco)
pnpm db:generate

# migrations (necessita DATABASE_URL válido em database/.env)
pnpm db:migrate
```

## 7. Build da extensão

```bash
pnpm build:extension
```

Gera `apps/extension/dist/` contendo `manifest.json`, `background.js`, `content.js`, `content.css`, `popup.html`, `panel.html` e `icons/`.

## 8. Carregar a extensão no Chrome

1. `pnpm build:extension`
2. Abra `chrome://extensions`
3. Ative o **Modo do desenvolvedor** (canto superior direito)
4. Clique em **Carregar sem compactação**
5. Selecione a pasta `apps/extension/dist`
6. A extensão **CaçaOferta** aparece na lista
7. Abra `https://www.facebook.com/ads/library/` — o content script roda e o popup/side panel mostram a interface

## 9. Scripts úteis

| Comando | Ação |
| --- | --- |
| `pnpm dev` | roda `dev` de todos os apps |
| `pnpm build` | build de todos os apps |
| `pnpm test` | testes (vitest) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript typecheck |
| `pnpm format` | Prettier |

## 10. Problemas comuns

- **API não aparece online no dashboard**: suba a API (`pnpm dev:api`) e confira `VITE_API_URL` no `apps/web/.env`.
- **Extensão não aparece**: certifique-se de apontar o Chrome para `apps/extension/dist` (não `apps/extension`).
- **Prisma não gera**: verifique `PNPM`/rede e rode `pnpm db:generate`.