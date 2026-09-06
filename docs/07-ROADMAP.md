# CaçaOferta — Roadmap, Fases, Riscos, Dependências e Ordem de Implementação

> Documento operacional: como construir o **CaçaOferta** em sequência exata, sem pular etapas.

---

## 1. Fases oficiais de desenvolvimento

| # | Fase | Entrega principal |
|---|---|---|
| 01 | Arquitetura e configuração do projeto | Monorepo, workspaces, tooling, CI, Prisma/Supabase setup |
| 02 | Estrutura da extensão Chrome | MV3 scaffold, service worker, content script, panel, popup, messaging |
| 03 | Detecção de anúncios da Meta Ads Library | MutationObserver, WeakSet, fila, debounce |
| 04 | Parser dos dados | `MetaAdsLibraryAdapter`, `parseAd`, campos best-effort |
| 05 | Interface CaçaOferta dentro da Biblioteca | Card sobre anúncios, dias rodando, botões (salvar/pesquisar/copiar) |
| 06 | Extração e pesquisa por domínio | `extractDomain`/`normalizeDomain`/`searchByDomain` + UI |
| 07 | Salvar ofertas | `saveOffer`, dedup, sincronia com backend |
| 08 | Backend e banco | API REST, Auth (Supabase), Prisma models, RLS |
| 09 | Dashboard | Biblioteca, filtros, ordenação, pesquisa |
| 10 | Tags, favoritos e notas | AdTag, Note, favoritar |
| 11 | Criativos e downloads permitidos | `CreativeService` (só recursos diretamente acessíveis) |
| 12 | Testes e estabilidade | Suite completa, fixtures, correções |
| 13 | Build final | Empacotamento extensão, deploy web/API, docs finais |

---

## 2. Ordem exata recomendada de implementação

1. **FASE 01** — bootstrap do monorepo (workspaces, TS config, Turbo/Vite, lint), base Prisma + Supabase local, CI básico.
2. **FASE 02** — extensão MV3 minimalista que carrega em `facebook.com/ads/library/*` e mostra o panel.
3. **FASE 03** — detecção incremental de anúncios (observer + WeakSet + batch).
4. **FASE 04** — parser resiliente + fixtures de teste.
5. **FASE 05** — UI do card CaçaOferta sobre a página + cálculo de dias rodando.
6. **FASE 06** — domínio (extract/normalize/search) e botão "Pesquisar domínio".
7. **FASE 07** — salvar ofertas localmente + sincronização futura com backend.
8. **FASE 08** — API REST + Auth + banco (endpoints do catálogo e biblioteca).
9. **FASE 09** — dashboard conectado à API.
10. **FASE 10** — tags, favoritos, notas.
11. **FASE 11** — download de criativos (permitido).
12. **FASE 12** — testes amplos (unit/integration/e2e).
13. **FASE 13** — build, empacotamento, deploy (Vercel), docs.

---

## 3. Primeiro MVP (nícleo) — escopo mínimo viável

> O MVP do CaçaOferta prioriza **detecção + extração + domínio**, não o SaaS completo.

1. Instalar extensão CaçaOferta.
2. Abrir Meta Ads Library.
3. Detectar anúncios (novos/alterados).
4. Identificar dados (página, status, datas, plataformas, mídia, CTA).
5. Identificar data / calcular **dias rodando** (`calculateRunningDays`).
6. Identificar **domínio** (`extractDomain`/`normalizeDomain`).
7. Mostrar interface CaçaOferta (`🟢 Ativo há 35 dias`).
8. Permitir **pesquisa por domínio** (botão + pesquisa manual).

> Implementação sequencial: FASE 01 → 02 → 03 → 04 → 05 → 06. O restante do SaaS acompanha depois.

---

## 4. Riscos técnicos

| Risco | Mitigação |
|---|---|
| **Meta muda o DOM** (quebra selectors) | Selectors em múltiplos sinais; isolamento no `MetaAdsLibraryAdapter`; fixtures de teste |
| **Detecção imprecisa** (não pega todos) | Fallback por múltiplos sinais + re-observação; testes com fixtures |
| **Performance** com muitas mutações | Batch, throttle/debounce, WeakSet, fila, processamento incremental |
| **CORS / DNS / infra** | CORS whitelist, HTTPS, deploy escalável |
| **Rate limits do backend/API** | Rate limiting, cache, retry com backoff |
| **Aba de anúncio com URL perdida/redirect** | Fallback de domínio (url direta vs. resolvida), documentar limitation |
| **Extensão Chrome Web Store** | MV3 compliance, mínimo de permissões, sem hooks frágeis |

---

## 5. Limitações conhecidas

- **Domínio de URLs com redirecionamento:** seguimento apenas quando tecnicamente acessível; caso contrário usa-se o domínio direto da URL.
- **Download de criativos:** somente quando o recurso é diretamente acessível e permitido. Caso contrário, `"Não foi possível obter o arquivo diretamente."` + "Abrir criativo".
- **Disponibilidade dos campos da Meta:** best-effort; campos indisponíveis ficam nulos — nunca inventar dados.
- **Dependência da existência pública do `ad_library_id`** na página (presente na URL interna).
- **Proteções da Meta** (CAPTCHA, login obrigatório, etc.): não contornadas.

---

## 6. Dependências necessárias

**Runtime**
- Node.js 20+ (LTS), npm/pnpm, TypeScript 5.x
- React 18, Vite 5+, TailwindCSS 3, Lucide Icons, zod
- Chrome (extensões), web: qualquer browser moderno
- PostgreSQL (Supabase)

**Dev/QA**
- Vitest, Playwright, Prisma CLI, ESLint + Prettier
- `chrome.storage` local para dev (extensão unpacked)

**Infra**
- Supabase (Auth + Postgres + RLS + storage para criativos, se necessário)
- Vercel ou Cloudflare (web + API)
- GitHub Actions (CI)

---

## 7. Documentação planejada

```
README.md           → visão geral e quickstart
ARCHITECTURE.md     → arquitetura geral (este conjunto)
EXTENSION.md        → extensão Chrome
API.md              → endpoints REST
DATABASE.md         → modelo de dados
INSTALL.md          → setup local (extensão, web, API, Supabase)
TROUBLESHOOTING.md  → problemas comuns
SECURITY.md         → autenticação, segurança, privacidade
TESTING.md          → estratégia de testes
```

---

## 8. Clausura da FASE 01

- Este documento é o **entregável desta primeira etapa** (arquitetura completa).
- **Não** implementar o produto inteiro agora.
- **Não** gerar centenas de arquivos.
- **Não** criar mockups como substitutos de funcionalidade.
- **Não** inventar APIs da Meta.
- **Não** tentar contornar mecanismos de segurança da Meta.

Aguardar instrução para iniciar a **FASE 01**.

---
**Marca oficial: CaçaOferta.**  
Nenhuma referência a "RatoAds"/"RatoAds Miner" deve permanecer em qualquer código ou interface.