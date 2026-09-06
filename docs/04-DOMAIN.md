# CaçaOferta — Domínio: Identificação, Normalização e Pesquisa

A identificação e pesquisa por **domínio** é funcionalidade prioritária do CaçaOferta.

---

## 1. extração e normalização

```ts
// Extract: pega o domínio puro de uma URL
extractDomain(url: string): string | null

// URL de exemplo:
// https://www.exemplo.com/produto/oferta?utm_source=facebook&utm_campaign=teste
// → exemplo.com

// Normalize: padroniza um input de busca/exibição
normalizeDomain(input: string): string | null
// "WWW.Exemplo.COM."  → "exemplo.com"
```

### Regras de `extractDomain` / `normalizeDomain`

- Remove/ignora **scheme** (`http`, `https`).
- Normaliza **`www.`** (e possíveis variações de subdomínio bem estabelecidas — tratar com critério).
- Descarta **query parameters** (`?utm_*`, etc.) e **fragments** (`#...`).
- Descarta **paths**.
- Normaliza **case** (tudo minúsculo).
- Trata **punycode/Unicode** (IDN) e remove **ponto final** final.
- **URLs inválidas** → retorna `null` (sem crashar).
- **Redirecionamentos:** só seguidos quando tecnicamente acessíveis (ex.: fetch/`HEAD` HTTP 3xx). Caso contrário, usar o domínio direto da URL. **Não assumir que qualquer URL possa ser acessada.**
- Entrada já sem scheme (ex.: `sub.exemplo.com` em busca manual) → trata como domínio.

Subdomínios são preservados quando relevantes (ex.: `shop.exemplo.com` ≠ `exemplo.com`), mas a busca deve permitir busca por domínio raiz também.

---

## 2. Pesquisa por domínio

**Fluxo (botão "Pesquisar domínio" em um anúncio):**

1. Identifica o domínio → `extractDomain(destination_url)`.
2. Normaliza → `normalizeDomain`.
3. Abre a pesquisa (side panel / dashboard).
4. Consulta backend: `GET /domains/:domain/ads` → ofertas associadas àquele domínio.
5. Apresenta resultados (anúncios conhecidos salvos/biblioteca).

**Pesquisa manual:**

```
PESQUISAR DOMÍNIO
[ exemplo.com ]  [ PESQUISAR ]
```

- Input é normalizado com `normalizeDomain`.
- Endpoint: `GET /domains/:domain/ads` (semântica viva em `06-API.md`).

```ts
searchByDomain({ domain, userId }): Promise<SavedAd[]>
```

---

## 3. Local onde vive

- Funções puras (sem I/O) em `packages/utils/domain.ts` — testáveis unitariamente.
- Orquestração (busca no backend) em `services/DomainService`.
- Mesma implementação compartilhada entre **extensão** e **dashboard** (fonte única via `packages/shared`).

---

## 4. Erros e edge cases

- URL sem domínio válido → `extractDomain` retorna `null`; UI mostra "domínio indisponível".
- Domínio não encontrado na biblioteca → estado vazio ("Nenhuma oferta salva para este domínio") — nunca fabricar resultados.
- Domínio com `null` não pode ser salvo como chave de domínio.
