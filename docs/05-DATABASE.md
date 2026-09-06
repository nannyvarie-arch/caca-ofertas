# CaçaOferta — Modelo de Banco de Dados (PostgreSQL / Supabase)

> **CaçaOferta** — persistência relacional com Row Level Security (RLS) via Supabase + Prisma.

---

## 1. Entidades

### User
| coluna | tipo | notas |
|---|---|---|
| `id` | uuid PK | = Supabase `auth.users.id` |
| `email` | text unique | |
| `display_name` | text null | |
| `avatar_url` | text null | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### Ad (catálogo bruto de anúncios — público/global)
| coluna | tipo | notas |
|---|---|---|
| `id` | uuid PK | |
| `ad_library_id` | text | de plataforma |
| `platform` | text | `meta` (futuro: google, tiktok, ...) |
| `page_id` | text null | |
| `page_name` | text null | |
| `status` | text null | ativo / encerrado |
| `delivery_start_date` | date null | |
| `delivery_stop_date` | date null | |
| `platforms` | jsonb null | `["facebook","instagram"]` |
| `media_type` | text null | imagem/vídeo/carrossel |
| `creative_text` | text null | |
| `headline` | text null | |
| `description` | text null | |
| `destination_url` | text null | |
| `destination_domain_id` | uuid FK→Domain null | normalizado |
| `ad_snapshot_url` | text null | |
| `cta` | text null | |
| `user_id` | uuid FK→User null | quem criou (se privado) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Índices:** `(ad_library_id, platform)` unique; `(destination_domain_id)`; `(page_id)`.

### AdCreative
| coluna | tipo | notas |
|---|---|---|
| `id` | uuid PK | |
| `ad_id` | uuid FK→Ad | |
| `kind` | text | imagem/vídeo/thumbnail |
| `url` | text | |
| `mime_type` | text null | |
| `size_bytes` | bigint null | |
| `created_at` | timestamptz | |

**Índice:** `(ad_id)`.

### Domain
| coluna | tipo | notas |
|---|---|---|
| `id` | uuid PK | |
| `domain` | text unique | normalizado (`exemplo.com`) |
| `count_ads` | int default 0 | denormalizado (agg) |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### SavedAd (biblioteca pessoal do usuário — chave de deduplicação)
| coluna | tipo | notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→User | |
| `ad_id` | uuid FK→Ad | |
| `ad_library_id` | text | denormalizado p/ busca fácil |
| `page_id` | text null | |
| `domain_id` | uuid FK→Domain null | |
| `note_text` | text null | |
| `is_favorite` | bool default false | |
| `status_snapshot` | text null | |
| `saved_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Chave única de deduplicação:** `UNIQUE (user_id, ad_library_id)`.
> Avaliação: `user_id + ad_library_id` é a chave natural correta para "o mesmo anúncio não aparece 2x para o mesmo usuário". Como o `ad_library_id` é da plataforma (estável), é superior a depender só do `ad_id` uuid.
**Índices:** `(user_id)`, `(domain_id)`, `(ad_library_id)`, `(is_favorite)`.

### Tag
| coluna | tipo | notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→User | dono |
| `name` | text | |
| `color` | text null | |
| `is_default` | bool default false | tags padrão |
| `created_at` | timestamptz | |

**Unique:** `(user_id, name)`.

### AdTag (relação N:N SavedAd ↔ Tag)
| coluna | tipo | notas |
|---|---|---|
| `saved_ad_id` | uuid FK→SavedAd | |
| `tag_id` | uuid FK→Tag | |
| PK composta | `(saved_ad_id, tag_id)` | |

### Note (notas privadas)
| coluna | tipo | notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→User | |
| `saved_ad_id` | uuid FK→SavedAd | |
| `body` | text | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Índice:** `(saved_ad_id)`.

### SearchHistory
| coluna | tipo | notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→User | |
| `query` | text | |
| `type` | text | domain/keyword/page/id |
| `created_at` | timestamptz | |

**Índice:** `(user_id, created_at desc)`.

### ExtensionSession
| coluna | tipo | notas |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK→User | |
| `session_token` | text unique | emitido na autenticação da extensão |
| `expires_at` | timestamptz | |
| `device` | text null | |
| `created_at` | timestamptz | |

**Índice:** `(session_token)`, `(user_id)`.

---

## 2. Relacionamentos (Resumo ER)

```
User 1──N SavedAd
User 1──N Tag
User 1──N Note
User 1──N SearchHistory
User 1──N ExtensionSession
Ad 1──N AdCreative
Ad N──1 Domain (via destination_domain_id)
SavedAd N──1 Ad
SavedAd N──1 Domain
SavedAd N──N Tag  (via AdTag)
SavedAd 1──N Note
```

---

## 3. Row Level Security (Supabase)

- Toda tabela é restrita por `user_id = auth.uid()` (ou `auth.uid()` via política).
- Tabelas públicas de leitura do catálogo (`Ad`, `Domain`) com política de leitura para usuários autenticados.
- **Nunca** usar `SERVICE_ROLE_KEY` no frontend/backend público.
- Backend (API server) usa role com permissões mínimas.

---

## 4. Timestamps

- `created_at` / `updated_at` em todas as entidades principais.
- `updated_at` atualizado por trigger, quando aplicável.

---

## 5. Deduplicação

- **`SavedAd`:** `UNIQUE(user_id, ad_library_id)` — principal regra anti-duplicidade.
- **`Domain`:** coluna `domain` unique.
- **`Ad`:** `(ad_library_id, platform)` unique.
- Tags: `UNIQUE(user_id, name)`.

---

## 6. Migrations

- Prisma migrations em `database/prisma/migrations`.
- Seeds: tags padrão (Vencedor, Testar, Escalar, Low Ticket, Infoproduto, E-commerce, Criativo, Funil, Página, Outros).
