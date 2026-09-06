# CaçaOferta — Parser e Detecção de Anúncios (Meta Ads Library)

A Biblioteca de Anúncios carrega conteúdo **dinamicamente** (pesquisa, scroll, filtros, navegação, voltar). O sistema precisa detectar anúncios de forma **incremental e resiliente**, sem reprocessar todo o DOM.

---

## 1. AdPlatformAdapter (abstração)

Contrato comum para qualquer plataforma de anúncios.

```ts
interface AdPlatformAdapter {
  detectAds(container: Element): AdNode[];       // elementos novos na página
  parseAd(node: AdNode): ParsedAd | null;        // um anúncio → dados tipados
  getAdId(node: AdNode): string | null;
  getPage(node: AdNode): string | null;
  getPageId(node: AdNode): string | null;
}
```

`MetaAdsLibraryAdapter implements AdPlatformAdapter` — única parte que conhece o DOM da Meta.

---

## 2. Estratégia de Detecção (incremental)

Objetivo: processar **somente elementos novos ou alterados**.

- **`MutationObserver`** observa o contêiner da lista de resultados e registra nós adicionados.
- **`debounce`/`throttle`** → agrupa rajadas de mutações (scroll rápido) para não travar a página.
- **`WeakSet<Element>`** (ou `Set` de IDs) → registro de anúncios já processados; evita reprocessar.
- **Map de IDs** → deduplicação por `ad_library_id` em memória.
- **Fila de processamento** → processa anúncios em lotes (batch) para não bloquear a UI thread.
- **Event delegation** → um único listener no contêiner para cliques em "salvar", "pesquisar domínio", etc.
- **Re-observação pós-hidratação** → algumas mutações chegam tarde; re-escuta no container.

```
Novos nós ──observer──▶ fila (batch)
                          │
                          ├── check WeakSet (já visto?)
                          ├── MetaAdsLibraryAdapter.detectAds()
                          ├── parseAd()  (best-effort, campos ausentes = null)
                          ├── postMessage → SW/panel (UI CaçaOferta)
                          └── registra no WeakSet/Map
```

---

## 3. Parser Resiliente (múltiplos sinais)

Não depender de uma única classe CSS da Meta, que muda sem aviso. Extração por **múltiplos sinais**:

- **Links/URLs** — `href` de destino, âncoras, `data-*`.
- **Textos** — nome da página, headline, descrição, CTA, "Ativo", "Encerrado".
- **Atributos** — `aria-label`, `title`, `data-*`, `role`.
- **Estrutura** — hierarquia de nós, seções por bloco.
- **Padrões de ID** — `ad_library_id` presente na URL interna (campo real da Meta, não inventado).
- **Elementos semânticos** — `article`, cabeçalho, corpo, mídia.
- **Relações entre elementos** — ancorar CTA ao texto, mídia ao bloco pai.

**Rule engine leve:** cada campo possui um ou mais *selectors/caminhos* candidatos (lista ordenada). Se o primeiro falha, tenta o próximo. Campo indisponível → `null`. **Nunca inventar dados.**

Se a Meta alterar o DOM, atualiza-se somente `MetaAdsLibraryAdapter` (selectors/estratégia), sem tocar no resto do sistema.

---

## 4. Dados extraídos (best-effort)

| Campo | Nota |
|---|---|
| `ad_library_id` | da URL interna / elemento |
| `page_id` | quando disponível |
| `page_name` | nome da página |
| `status` | Ativo / Encerrado (detectado por textos) |
| `delivery_start_date` | data de início (parse robusto) |
| `delivery_stop_date` | pode ser vazio (ativo) |
| `platforms` | Facebook / Instagram / Audience Network |
| `media_type` | imagem / vídeo / carrossel |
| `creative_text` | texto principal |
| `headline` | headline |
| `description` | descrição |
| `destination_url` | URL de destino (se visível) |
| `destination_domain` | derivado de `destination_url` via `extractDomain` |
| `ad_snapshot_url` | snapshot da biblioteca (a partir do ID) |
| `creative_url` / `thumbnail_url` | recursos visuais (validação de acesso) |
| `CTA` | texto do botão |

Todos os campos podem ser `null`/ausentes.

---

## 5. Funções planejadas do MetaAdsLibraryAdapter

```ts
detectAds(container)
parseAd(node)
getAdId(node)
getPage(node)
getPageId(node)
getStatus(node)
getStartDate(node)
getStopDate(node)
getPlatforms(node)
getMediaType(node)
getDestinationUrl(node)
getDomain(node)           // delega ao DomainService
getCreative(node)
getSnapshotUrl(node)
```

> Não implementar agora — apenas projetar a arquitetura (`07-ROADMAP.md`).

---

## 6. Resiliência e Perfomance

- Parar de re-observar após reset de filtro/pesquisa nova (re-bind do observer no novo resultado).
- Purga periódica do `WeakSet` se a lista for muito longa (mantendo deduplicação por ID).
- Roda o parser fora do hot path de render quando possível (batch/microtask).
