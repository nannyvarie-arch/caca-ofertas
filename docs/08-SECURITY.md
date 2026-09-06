# CaçaOferta — Autenticação, Segurança e Privacidade

> **CaçaOferta** — como autenticar, comunicar extensão↔backend e proteger os dados.

---

## 1. Autenticação

**Estratégia: Supabase Auth (email/senha) + JWT.**

- **Cadastro/login** no backend (`POST /auth/register`, `POST /auth/login`) delegando ao Supabase.
- **Sessão**: JWT (access) + refresh token.
- **Expiração**: access token curto (ex.: 1h), refresh rotacionável para renovar.
- **Proteção de rotas**: middleware valida `Authorization: Bearer <jwt>` e rejeita 401 expirado/inválido.
- **Extensão**: 
  - nunca armazena senha;
  - guarda o JWT (e refresh) em `storage.local` criptografado/caixa isolada, expirável;
  - extende sessão via refresh transparente quando autenticado.
- **Logout**: revogação da sessão (invalidar token/ExtensionSession no backend).

### Sem armazenamento local inseguro
- Nada de `localStorage` para token na web sem necessidade; preferir cookie `HttpOnly` + `Secure` **ou** JWT em memória com refresh em cookie. (Decisão final na FASE 08.)
- Nunca logar/expor: senha, `DATABASE_URL`, `SERVICE_ROLE_KEY`, secrets.

---

## 2. Comunicação Extensão ↔ Backend

```
Content Script / Panel ──https──▶ API CaçaOferta
   Authorization: Bearer <jwt>
   Payloads validados (packages/shared)
```

- **HTTPS** somente.
- **Tokens de sessão** por header, nunca em query string.
- **Mensagens seguras**: payloads validadas no envio (extensão) e no recebimento (backend), e vice-versa.
- **Forwarding** de sessão para o panel/background apenas quando autenticado.
- Se o token expirar no meio do scroll/parse: fila de operações pendentes, re-autentica silenciosa.

---

## 3. Segurança

| Ameaça | Mitigação |
|---|---|
| **XSS** | React, sanitização de textos vindos da Meta, CSP restritiva na extensão e no web; nunca `innerHTML` com dados externos |
| **CSRF** | Requerimentos: JWT em header + CORS restrito + SameSite cookies (se cookie) |
| **Injeção SQL** | Prisma parameterizado; sem concatenação de SQL |
| **URL malformada** | `extractDomain`/`normalizeDomain` robustos; validação de destino (`isHttpUrl`, hostname whitelist) antes de abrir/persistir |
| **Dados maliciosos / XSS via creative text** | Sanitização + escape na UI |
| **Tokens expostos** | Header only, sem console, sem storage inseguro, rotação |
| **Acesso indevido a ofertas de outro usuário** | RLS no Postgres + scoping por `user_id` em todas as queries do backend |
| **Abuso de endpoint (rate limit)** | Rate limiting por usuário/IP no gateway/backend |
| **Credenciais da Meta** | Nunca armazenadas; nem chrome.storage, nem backend |

### ADRs Segurança
- **JWT** sim; **RLS** sim (defesa em profundidade no banco).
- **CORS**: whitelist do dashboard + origem da extensão.
- **Input validation** centralizada em `packages/shared`.

---

## 4. Privacidade

- Coleta-se somente o necessário: anúncios públicos, dados básicos do usuário, ofertas salvas.
- **Não** se coletam: senha da Meta, cookies da Meta, tokens da Meta, conteúdos privados fora da Ads Library.
- A extensão acessa somente `facebook.com/ads/library/*` e a própria API do CaçaOferta.
- Dados privados (notas, favoritos, historico de pesquisa) pertencem ao usuário; políticas RLS garantem isolamento.