# CaçaOferta — Estratégia de Testes

> Testar principalmente as funcionalidades **reais** — sendo a interface apenas um sinal, não a conclusão.

---

## 1. Framework

- **Unit & Integration:** Vitest (TS) — funciona bem com Vite/monorepo.
- **E2E:** Playwright (web) + testes do parser com fixtures HTML locais.
- **Testes de API:** Vitest + supertest ou Fastify inject (sem subir servidor real).
- **Testes de banco:** banco Postgres local (via `docker` ou Supabase local) com Prisma.

---

## 2. Cobertura planejada

### Unit
- `extractDomain`, `normalizeDomain` (URLs válidas/inválidas, UTM, query, hash, paths, www, case, punycode, trailing dot).
- `calculateRunningDays` (ex.: 01/08/2026 → 05/09/2026 = 35 dias; datas passadas/futuras/indisponíveis).
- `parseAd` (via fixtures HTML simulando DOM da Meta: campos presentes, ausentes, nulos).
- `deduplicateAds` (WeakSet/Map — não reprocessa já vistos).
- `saveOffer` (dedup por user_id+ad_library_id).
- `searchByDomain`.
- Regras de validação de payloads (`packages/shared`).

### Integration
- Parser + detectAds com fixtures HTML reais-estilo da Biblioteca.
- Observer com simulação de mutações (scroll/filters).
- API: endpoints Auth (register/login/logout), SavedAds, Domain, Tags, Notes; casos de erro 401/403/422/409.
- Banco: constraints únicas, FK, RLS (acesso de outro usuário bloqueado).

### E2E (web)
- Login → abrir dashboard → biblioteca → filtros/ordenação → salvar/remover oferta → domínio → notas/tags.

---

## 3. Fixtures HTML

- Em `tests/fixtures/` — arquivos `.html` snapshot da **estrutura pública** da Ads Library.
- Versões A/B para simular mudança de DOM → valida a resiliência do parser.
- **Nunca** usar prints/conteúdo proprietário da ferramenta de referência.

---

## 4. Qualidade

- Funcionalidade só é **concluída** quando passa nos testes reais (não apenas por aparecer na UI).
- `npm test`, `npm run typecheck`, `npm run lint` vinculados ao CI.
- Fases finais: `07-ROADMAP.md` FASE 12 testes/estabilidade e FASE 13 build final.