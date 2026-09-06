# CaçaOferta — Troubleshooting

> Problemas comuns e soluções. Será preenchido conforme o desenvolvimento real.

---

## 1. Extensão não aparece na Biblioteca

- Verificar se a página é `https://www.facebook.com/ads/library/*`.
- Conferir `chrome://extensions` → extensão ativa e *Load unpacked* correto.
- Rebuild (Vite) se o conteúdo mudou; hard refresh da página da Meta.
- Se nada funciona, ver service worker/lógica do panel.

## 2. Nenhum anúncio detectado

- Confirmar que há resultados na Biblioteca (a página precisa de resultados carregados).
- Verificar ícones de permissão (`storage`, host permissões).
- Checar console do content script (erros de parse).

## 3. Campo ausente (data, domínio, status)

- Muitos campos da Meta são best-effort → podem ser `null` por design.
- Atualizar `MetaAdsLibraryAdapter` se a Meta mudou o DOM (selectors).
- Nunca inventar dados como fallback.

## 4. Domínio não encontrado / URL com redirect

- O sistema usa o domínio direto quando não consegue resolver redirect (limitação documentada).
- Validar que a URL tem domínio válido (senão `null`).

## 5. Erros de autenticação / "401"

- Sessão expirada → re-login na extensão/dashboard.
- Refresh token inválido → novo login (nunca senha no storage).
- Checar clock do dispositivo (JWT sensível a tempo).

## 6. Problemas de build (web/api)

- `npm run typecheck`, `npm run lint`, `npm run build` antes de reportar.
- Prisma: rodar `npx prisma generate` se o schema mudou.

---
Documento vivo — será evoluído nas fases 12/13.