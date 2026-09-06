# CaçaOferta — Arquitetura da Extensão Chrome

Manifest V3, modular, evita concentrar toda a lógica num único content script.
Funciona em `https://www.facebook.com/ads/library/*` e em um *side panel* próprio.

---

## 1. Componentes do Manifest V3

```
manifest.json
├── manifest_version: 3
├── permissions:
│   ├── storage            → chrome.* storage (estado, sessão leve, cache de domínios)
│   ├── sidePanel          → painel lateral do CaçaOferta
│   ├── tabs?              → somente se necessário para readonly info
│   └── scripting?         → somente se necessário (manter mínimo)
├── host_permissions:
│   └── https://www.facebook.com/ads/library/*   → onde injetar
├── content_scripts:
│   └── matches: ["https://www.facebook.com/ads/library/*"]
│       ├── js: [contentScript.js]
│       └── css: [contentStyles.css]
├── background: { service_worker: "background.js" }   → MV3
├── action: { default_popup: "popup.html" }            → popup
├── side_panel: { default_path: "panel.html" }         → side panel
```

---

## 2. Camadas e Diretórios da Extensão

```
apps/extension/
├── manifest.json
├── public/
│   └── icons/            → ícones da extensão (sem pegar ativos da Meta)
├── src/
│   ├── content/
│   │   ├── index.ts          → entrypoint do content script
│   │   ├── inject.ts         → injeta/SOMENTE gerencia a camada UI CaçaOferta
│   │   ├── observer.ts       → MutationObserver + debounce/throttle
│   │   ├── registry.ts       → cache/WeakSet de anúncios já processados
│   │   └── styles.ts         → importa/encapsula estilos da camada
│   ├── parsers/
│   │   ├── AdPlatformAdapter.ts    → contrato abstrato (interface)
│   │   └── MetaAdsLibraryAdapter.ts→ implementação para a Meta
│   ├── services/
│   │   ├── DetectionService.ts     → detectAds()
│   │   ├── ParseService.ts         → parseAd()
│   │   ├── DomainService.ts        → normalize/extract/search (em packages/utils)
│   │   ├── RunningDaysService.ts   → calculateRunningDays()
│   │   ├── OfferService.ts         → saveOffer(), dedup
│   │   └── CreativeService.ts      → download/by throttling (permitido apenas)
│   ├── api/
│   │   └── ApiClient.ts            → HTTPS ao backend, validação de respostas
│   ├── auth/
│   │   └── AuthSession.ts          → gerencia token de sessão (nunca senha)
│   ├── messaging/
│   │   └── Messaging.ts            → routing content ↔ SW ↔ side panel
│   ├── panel/
│   │   ├── PanelApp.tsx            → React (side panel)
│   │   ├── popup/
│   │   │   └── PopupApp.tsx        → React (popup)
│   │   └── components/             → componentes de UI compartilhados
│   └── state/
│       └── store.ts                → estado leve (mini store / context, sem lib pesada)
```

**Princípio:** não colocar parsing, observação e UI num único arquivo.

---

## 3. Fluxo de Mensagens (Chrome Messaging)

```
Content Script  ──chrome.runtime.sendMessage──▶  Service Worker (background)
      ▲                                            │
      │                                            ├── validate JWT / sessão
      │                                            ├── chama ApiClient (HTTPS)
      │                                            └── responde
      │
Panel / Popup  ──porta (chrome.runtime.connect)──▶ Service Worker
      ▲                                            │
      └──────────── estado/resultados ─────────────┘
```

- **Content script** nunca fala HTTPS diretamente com o backend? → Pode, mas recomenda-se passar por um único `ApiClient` no SW ou no próprio content. Em MV3, fazer chamadas HTTPS a partir do content script é permitido, mas concentrar no `ApiClient` mantém o contrato único e validado.
- **Session token** fica em `storage.local` (assinado/expirável), **nunca senha**.
- Todas as mensagens validam payload de entrada/saída (schemas compartilhados de `packages/shared`).

---

## 4. Estado e Persistência Local

| Fonte | Uso |
|---|---|
| `chrome.storage.local` | sessão embrulhada/expirável, cache de domínios já pesquisados, preferências |
| Estado React (context/store) | UI em tempo real, lista de anúncios detectados na página atual |
| `storage.session` (MV3) | estado volátil por sessão se necessário |

Não armazenar: senha da Meta, cookies da Meta, tokens da Meta, dados desnecessários.

---

## 5. Camada de UI sobre a Biblioteca (Card do anúncio)

Interface planejada, próximo à do anúncio na Meta, mas com identidade própria **CaçaOferta**:

```
CAÇAOFERTA
🟢 ATIVO

Página:   Nome da Página
ID:       123456789
Data:     22/08/2026
Rodando:  14 dias            (+7/+14/+30/+60/+90)
Plataformas: Facebook / Instagram
Domínio:  exemplo.com

[+ Salvar oferta] [🔎 Pesquisar domínio] [🌐 Abrir Biblioteca]
[⬇ Baixar criativo] [📋 Copiar ID] [📋 Copiar domínio]
```

> Implementação em fases futuras (`07-ROADMAP.md`). Nesta etapa, apenas a arquitetura.

---

## 6. Protocolo de Comunicação Extensão ↔ Backend

Ver `06-API.md` e `08-SECURITY.md`. Resumo:
- HTTPS exclusivamente.
- `Authorization: Bearer <jwt>` (JWT emitido pelo Supabase).
- Payloads validados com schemas compartilhados em `packages/shared`.
- Rate limiting no backend. CORS restrito ao domínio do dashboard.

---

## 7. Limitações/Notas

- Não contorna autenticação, CAPTCHA, ou proteções da Meta.
- Baixar criativos somente quando o recurso é diretamente acessível e permitido; caso contrário mostrar "Não foi possível obter o arquivo diretamente." + "Abrir criativo".
- O parser é isolado no `MetaAdsLibraryAdapter` para absorver mudanças de DOM.
