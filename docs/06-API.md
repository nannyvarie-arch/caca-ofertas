# CaçaOferta — API REST (Pinça)

Backend **Node.js + TypeScript**, schema/documentado em OpenAPI (futuro). Todos os endpoints validam payloads e retornam respostas tipadas.

---

## 1. Autenticação

- **JWT Bearer** (emitido por Supabase Auth).
- Header: `Authorization: Bearer <token>`.
- **Nunca** senhas no frontend/extensão; tokens rotacionáveis.

---

## 2. Base URL

```
https://api.caca-oferta.com/api/v1
```

---

## 3. Endpoints (planejados)

### Auth
```
POST /auth/register         → cria usuário + retorna token
POST /auth/login            → login (email+senha) → token
POST /auth/logout           → invalida sessão/token
GET  /me                    → perfil do usuário logado
```

### Ads (catálogo)
```
GET  /ads                   → lista anúncios (filtros: status, platform, domain, page, media)
GET  /ads/:id               → detalhe de um anúncio
POST /ads                   → cria/registra um anúncio (deduplicado por ad_library_id+platform)
```

### Saved Ads (biblioteca pessoal)
```
POST   /ads/:id/save        → salva na biblioteca do usuário (dedup user_id+ad_library_id)
DELETE /ads/:id/save        → remove da biblioteca
GET    /saved-ads           → biblioteca pessoal (filtros/ordenação)
GET    /saved-ads/:id       → detalhe da oferta salva
DELETE /saved-ads/:id       → exclui oferta da biblioteca
```

### Domínios
```
GET   /domains              → domínios conhecidos/mais comuns
GET   /domains/:domain      → info do domínio (normalizado)
GET   /domains/:domain/ads  → anúncios salvos que usam esse domínio
POST  /domains/normalize    → body { url } → { domain } (usa normalizeDomain)
```

### Tags, favoritos e notas
```
POST   /saved-ads/:id/tags      → adiciona tag à oferta salva
DELETE /saved-ads/:id/tags/:tagId → remove tag
POST   /saved-ads/:id/notes     → cria/atualiza nota privada
PATCH  /saved-ads/:id/favorite  → favorito true/false
```

### Extensão
```
POST /extension/session        → cria ExtensionSession (token de curta duração p/ extensão)
GET  /extension/counters       → contadores do dashboard (totais do usuário)
```

---

## 4. Padrões de Resposta

```json
{
  "data": { ... },
  "meta": { "page": 1, "limit": 50, "total": 0 }
}
```

Erros:
```json
{
  "error": { "code": "X", "message": "..." }
}
```

---

## 5. Validação & Conformidade

- Inputs validados com **schemas compartilhados** (`packages/shared`) — zod/typebox.
- CORS restrito ao domínio do dashboard + origem da extensão (se aplicável).
- Rate limiting por usuário/IP.
- Sem segredos de infra (DATABASE_URL, SERVICE_ROLE_KEY) no frontend — apenas no backend.