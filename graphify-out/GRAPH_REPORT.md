# Graph Report - caca-ofertas  (2026-11-18)

## Corpus Check
- 187 files · ~80,668 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .css 5, .example 4, (none) 1)

## Summary
- 1554 nodes · 2914 edges · 102 communities (85 shown, 17 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 129 edges (avg confidence: 0.84)
- Token cost: 234,049 input · 0 output

## Community Hubs (Navigation)
- Palavras-chave por nicho
- Deps da extensão
- Deps da API
- Testes do service worker
- Config raiz e ESLint
- Deps do dashboard web
- Sidebar e overlay
- Formatação e status
- Parser Meta e validação
- Arquitetura geral (docs)
- Filtros e ordenação
- Detecção de cards
- Extração de criativos
- MetaAdsLibraryAdapter
- Deps do database
- Build da extensão
- Índice de domínios e E2E
- Editor de ebooks
- Deps do UI
- Store de anúncios salvos
- Interface AdPlatformAdapter
- Cliente HTTP e constantes
- Variáveis de ambiente
- Painel de busca
- Rotas de ingestão e mineração
- Erros da API e clonagem
- Mensagens runtime
- Servidor Fastify
- Componentes de UI
- Manifest da extensão
- Deploy e páginas HTML
- Interface SavedAdsStore
- Dashboard: páginas principais
- Dashboard: navegação e hooks
- Roadmap por fases
- Deps do utils
- Rotas de ebooks
- Datas e dias rodando
- Dashboard: rastreamento e swipe
- Deps dos testes
- Tsconfig base
- Contratos de anúncios salvos
- Deps do shared
- Entrada do content script
- Mineração e tipos de anúncio
- Segurança e troubleshooting
- Fixtures HTML do parser
- Popup da extensão
- Deps do types
- Testes de anúncios salvos
- Tipos de domínio
- Background e cache de IDs
- Registro de anúncios
- Tsconfig da extensão
- Tsconfig do web
- Workflow de mineração diária
- Rota de mineração diária
- Rota de anúncios salvos
- Favoritos
- Tsconfig da API
- Deduplicação
- Logger
- Conceitos do parser (docs)
- Segurança (docs)
- Workspace pnpm
- Tsconfig dos testes
- Domínio e URLs seguras
- Testes da sidebar
- Modelo de dados (docs)
- Painel lateral
- Health check do web
- Princípios de detecção (docs)
- Busca por domínio (docs)
- Estratégia de testes
- Tsconfig do shared
- Cliente SavedAdsApi
- Testes do painel de busca
- Tsconfig do database
- Ofertas e catálogo (docs)
- Tsconfig do utils
- Envelope de resposta da API
- Tsconfig do types
- Tsconfig do UI
- Prettier
- Configurações
- Serviço de domínio (docs)
- Clonar páginas
- Pareamento da extensão
- Lista de ebooks
- Autenticação (docs)
- Contrato de health
- upsertAd
- Vercel do web
- Vercel raiz
- CreativeService (docs)
- Store de estado (docs)
- Logs de debug
- Fases do projeto

## God Nodes (most connected - your core abstractions)
1. `CurrentUserResolver` - 34 edges
2. `ParsedAd` - 34 edges
3. `startAdMining()` - 33 edges
4. `CaçaOfertaSidebar` - 32 edges
5. `getPrisma()` - 31 edges
6. `MetaAdsLibraryAdapter` - 30 edges
7. `AdSearchPanel` - 30 edges
8. `App()` - 26 edges
9. `AdNode` - 25 edges
10. `AdPlatformAdapter` - 25 edges

## Surprising Connections (you probably didn't know these)
- `ParsedAd (pt UI model)` --semantically_similar_to--> `ParsedAd`  [INFERRED] [semantically similar]
  README.md → docs/03-PARSER-DETECTION.md
- `API Response Envelope {data, meta} / {error}` --conceptually_related_to--> `/api/saved-ads Endpoints (FASE 06)`  [AMBIGUOUS]
  docs/06-API.md → README.md
- `ALREADY_SAVED (409)` --rationale_for--> `SavedAd`  [INFERRED]
  README.md → docs/05-DATABASE.md
- `/api/saved-ads Endpoints (FASE 06)` --implements--> `Saved Ads Endpoints (/saved-ads)`  [INFERRED]
  README.md → docs/06-API.md
- `Fase 02 - Estrutura da extensão Chrome` --references--> `CaçaOferta Side Panel (panel.html)`  [INFERRED]
  docs/07-ROADMAP.md → apps/extension/panel.html

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Ad Detection and Parsing Pipeline** — docs_03_parser_detection_incremental_detection, docs_03_parser_detection_metaadslibraryadapter, readme_parseadcard, readme_normalizedad, readme_parsedad [INFERRED 0.85]
- **Domain Extraction, Normalization and Search** — docs_04_domain_extractdomain, docs_04_domain_normalizedomain, docs_04_domain_searchbydomain, docs_06_api_domains_endpoints, readme_domainindex [INFERRED 0.85]
- **Extension Messaging Flow (content to SW to backend)** — docs_02_extension_content_script, docs_02_extension_service_worker, docs_02_extension_side_panel, docs_01_architecture_apiclient, docs_01_architecture_backend_api [EXTRACTED 1.00]
- **HTML test fixtures for the Meta Ads Library ad parser** — apps_extension_src_content___fixtures___html_01_basic_ad_basic_ad, apps_extension_src_content___fixtures___html_02_video_ad_video_ad, apps_extension_src_content___fixtures___html_03_carousel_ad_carousel_ad, apps_extension_src_content___fixtures___html_04_missing_id_missing_id, apps_extension_src_content___fixtures___html_05_missing_domain_missing_domain, apps_extension_src_content___fixtures___html_06_active_ad_active_ad, apps_extension_src_content___fixtures___html_07_inactive_ad_inactive_ad, apps_extension_src_content___fixtures___html_08_multiple_ads_multiple_ads, apps_extension_src_content___fixtures___html_09_dynamic_content_dynamic_content, apps_extension_src_content___fixtures___html_10_incomplete_ad_incomplete_ad, docs_07_roadmap_parsead [INFERRED 0.85]
- **MVP sequence Fase 01 -> 06 (detection, parsing, UI, domain)** — docs_07_roadmap_mvp, docs_07_roadmap_fase_01, docs_07_roadmap_fase_02, docs_07_roadmap_fase_03, docs_07_roadmap_fase_04, docs_07_roadmap_fase_05, docs_07_roadmap_fase_06 [EXTRACTED 1.00]
- **Domain extraction and search pipeline** — docs_07_roadmap_extractdomain, docs_07_roadmap_normalizedomain, docs_07_roadmap_searchbydomain, docs_08_security_ishttpurl [INFERRED 0.75]

## Communities (102 total, 17 thin omitted)

### Community 0 - "Palavras-chave por nicho"
Cohesion: 0.05
Nodes (42): ARTESANATO, BELEZA, buildIndex(), CASA_ORGANIZACAO, CONCURSOS, DESENVOLVIMENTO_PESSOAL, EDUCACAO_INFANTIL, EMAGRECIMENTO (+34 more)

### Community 1 - "Deps da extensão"
Cohesion: 0.05
Nodes (51): dependencies, @caca-oferta/shared@workspace:*, @caca-oferta/types@workspace:*, @caca-oferta/ui@workspace:*, @caca-oferta/utils@workspace:*, lucide-react@^1.41.0, react@^19.2.8, react-dom@^19.2.8 (+43 more)

### Community 2 - "Deps da API"
Cohesion: 0.05
Nodes (40): dependencies, @caca-oferta/database@workspace:*, @caca-oferta/shared@workspace:*, fastify@^5.12.3, @fastify/cors@^11.3.0, @prisma/client@6.19.3, @supabase/supabase-js@^2.115.0, tsx@^4.23.13 (+32 more)

### Community 3 - "Testes do service worker"
Cohesion: 0.07
Nodes (23): Listener, listeners, PAYLOAD, CardFixtureOptions, carouselCardHtml(), externalDestinationCardHtml(), inactiveCardHtml(), incompleteCardHtml() (+15 more)

### Community 4 - "Config raiz e ESLint"
Cohesion: 0.06
Nodes (41): description, devDependencies, eslint@^10.10.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.1.1, globals@^17.12.0, prettier@^3.9.6, typescript@^5.9.3 (+33 more)

### Community 5 - "Deps do dashboard web"
Cohesion: 0.07
Nodes (39): dependencies, @caca-oferta/shared@workspace:*, @caca-oferta/ui@workspace:*, @caca-oferta/utils@workspace:*, lucide-react@^1.41.0, react@^19.2.8, react-dom@^19.2.8, description (+31 more)

### Community 6 - "Sidebar e overlay"
Cohesion: 0.14
Nodes (10): OverlayOptions, bridgeSavedOffersService, CaçaOfertaSidebar, el(), readStored(), writeStored(), attachToast(), Toast (+2 more)

### Community 7 - "Formatação e status"
Cohesion: 0.14
Nodes (25): StatusToken, adSummary(), isoToBr(), MediaVisual, mediaVisual(), PLATFORM_LABELS, platformLabel(), plural() (+17 more)

### Community 8 - "Parser Meta e validação"
Cohesion: 0.12
Nodes (25): computeParseConfidence(), MEDIA_MAP, STATUS_MAP, isValidCalendarDate(), isValidHttpUrl(), isValidText(), KNOWN_PLATFORMS, logValidationIssues() (+17 more)

### Community 9 - "Arquitetura geral (docs)"
Cohesion: 0.10
Nodes (24): ApiClient, Backend API, CaçaOferta General Architecture, Chrome Extension, Dashboard Web, Database (PostgreSQL), ExtensionMessaging, packages/shared (+16 more)

### Community 10 - "Filtros e ordenação"
Cohesion: 0.12
Nodes (22): copyTextToClipboard(), MessageKey, AdFilters, compareAdDate(), compareName(), compareRunningDays(), CtaFilterKey, DEFAULT_FILTERS (+14 more)

### Community 11 - "Detecção de cards"
Cohesion: 0.19
Nodes (24): adCardScore(), byDocumentOrder(), climbAndFindCard(), collectLabelElements(), countPageProfileLinks(), deduplicateNestedCards(), dumpPageDiagnostics(), elementHasMedia() (+16 more)

### Community 12 - "Extração de criativos"
Cohesion: 0.12
Nodes (23): CreativeUrls, extractCreative(), extractCreativeUrls(), extractMediaInfo(), extractMediaType(), findExternalAnchors(), isCreativeImage(), isMeaningfulImage() (+15 more)

### Community 14 - "Deps do database"
Cohesion: 0.09
Nodes (24): dependencies, @prisma/client@^6.19.3, description, devDependencies, prisma@6.19.3, @types/node@^26.4.1, typescript@^7.0.2, exports (+16 more)

### Community 15 - "Build da extensão"
Cohesion: 0.12
Nodes (10): copyDirContents(), __dirname, dist, main(), root, runVite(), viteBin, root (+2 more)

### Community 16 - "Índice de domínios e E2E"
Cohesion: 0.12
Nodes (11): adapter, fixture(), indexFromFixture(), rawFixtures, renderAll(), DomainIndex, DomainStats, searchByDomain() (+3 more)

### Community 17 - "Editor de ebooks"
Cohesion: 0.11
Nodes (13): BLOCK_TYPES, BlockEditor(), createDefaultBlock(), EBOOK_THEMES, EbookAssetItem, EbookBlock, EbookData, EbookEditor() (+5 more)

### Community 18 - "Deps do UI"
Cohesion: 0.10
Nodes (23): dependencies, @caca-oferta/shared@workspace:*, @caca-oferta/utils@workspace:*, lucide-react@^1.41.0, react@^19.2.8, description, devDependencies, @types/react@^19.2.18 (+15 more)

### Community 19 - "Store de anúncios salvos"
Cohesion: 0.12
Nodes (11): ERROR_CODES, AD_ORIGIN_PLATFORM, AdRow, ListSavedOptions, mapAd(), mapSaved(), PrismaAdScalar, PrismaSavedRowWithAd (+3 more)

### Community 21 - "Cliente HTTP e constantes"
Cohesion: 0.12
Nodes (17): ApiErrorEnvelope, createSavedAdsApiClient(), FALLBACK_MESSAGES, getApiBaseUrl(), httpRequest(), API_ADS_INGEST_PATH, API_BASE_PATH, API_BASE_URL (+9 more)

### Community 22 - "Variáveis de ambiente"
Cohesion: 0.14
Nodes (17): CORS_ORIGIN, DEV_USER_ENABLED, DEV_USER_ID, HOST, NODE_ENV, OPENAI_API_KEY, PORT, PUBLIC_USER_ID (+9 more)

### Community 23 - "Painel de busca"
Cohesion: 0.21
Nodes (3): AdSearchPanel, button(), el()

### Community 24 - "Rotas de ingestão e mineração"
Cohesion: 0.15
Nodes (14): BuildServerOptions, CurrentUserResolver, AdsIngestRouteDeps, detectLowTicket(), LOW_TICKET_CHECKOUTS, LOW_TICKET_PRICE_RANGE, EbookRouteDeps, MediaRouteDeps (+6 more)

### Community 25 - "Erros da API e clonagem"
Cohesion: 0.15
Nodes (16): ApiError, errorBody(), ErrorCode, notFound(), registerErrorHandler(), BLOCKED_SCRIPTS, CloneRouteDeps, registerCloneRoutes() (+8 more)

### Community 26 - "Mensagens runtime"
Cohesion: 0.16
Nodes (16): IngestAdsResult, RUNTIME_ERROR_CODES, runtimeFailure(), RuntimeMessageType, RuntimeMessageTypeValue, RuntimeRequest, RuntimeResponse, RuntimeSuccess (+8 more)

### Community 27 - "Servidor Fastify"
Cohesion: 0.24
Nodes (15): buildServer(), getPrisma(), registerAdsIngestRoutes(), registerDashboardRoutes(), ExtensionRouteDeps, generateToken(), registerExtensionRoutes(), registerHealthRoutes() (+7 more)

### Community 28 - "Componentes de UI"
Cohesion: 0.20
Nodes (7): OfferCard(), ScoreBadge(), STATUS_STYLES, StatusBadge(), TagBadge(), ClassValue, cn()

### Community 29 - "Manifest da extensão"
Cohesion: 0.11
Nodes (18): action, default_popup, default_title, background, service_worker, content_scripts, description, host_permissions (+10 more)

### Community 30 - "Deploy e páginas HTML"
Cohesion: 0.13
Nodes (19): CaçaOferta Side Panel (panel.html), CaçaOferta Popup (popup.html), CaçaOferta Dashboard index.html, API deploy on Railway, @caca-oferta/utils, Dashboard deploy on Vercel, Deploy checklist (279 testes passando), CaçaOferta DEPLOY (+11 more)

### Community 31 - "Interface SavedAdsStore"
Cohesion: 0.12
Nodes (3): SavedAdsStore, NoteDto, TagDto

### Community 32 - "Dashboard: páginas principais"
Cohesion: 0.16
Nodes (17): DashboardPage(), DashboardSummary, ErrorState(), IndicatorCard(), MinhasOfertasPage(), MiningJob, NAV_ITEMS, OfertasMineradasPage() (+9 more)

### Community 33 - "Dashboard: navegação e hooks"
Cohesion: 0.11
Nodes (11): AjudaPage(), AnaliseTrafegoPage(), App(), getGroupedNav(), MineracaoPage(), useDashboardSummary(), useMiningJobs(), useOffers() (+3 more)

### Community 34 - "Roadmap por fases"
Cohesion: 0.22
Nodes (16): Dependências necessárias (Node 20, React 18, Vite, Tailwind, zod, Vitest, Playwright, Prisma, Supabase, Vercel, GitHub Actions), Fase 01 - Arquitetura e configuração do projeto, Fase 02 - Estrutura da extensão Chrome, Fase 03 - Detecção de anúncios da Meta Ads Library, Fase 05 - Interface CaçaOferta dentro da Biblioteca, Fase 06 - Extração e pesquisa por domínio, Fase 07 - Salvar ofertas, Fase 08 - Backend e banco (+8 more)

### Community 35 - "Deps do utils"
Cohesion: 0.12
Nodes (17): description, devDependencies, @types/node@^26.4.1, vitest@^5.0.0, exports, files, @types/node, vitest (+9 more)

### Community 36 - "Rotas de ebooks"
Cohesion: 0.18
Nodes (11): ALLOWED_TYPES, ASSETS_DIR, ensureAssetsDir(), escapeHtml(), generateEbookHtml(), generateMockupSvg(), getThemeStyles(), mapAsset() (+3 more)

### Community 37 - "Datas e dias rodando"
Cohesion: 0.19
Nodes (15): calculateRunningDays(), calendarDateOf(), DatePrefixKind, extractDateFromElement(), extractIsoDateFromPhrase(), fromDmy(), isoToUtcMs(), prefixPatternFor() (+7 more)

### Community 38 - "Dashboard: rastreamento e swipe"
Cohesion: 0.19
Nodes (16): EmptyState(), FavoritosPage(), LoadingState(), MineracaoAutomaticaPage(), RastreamentoPage(), fetchTracked(), handleAddTracked(), handleCheck() (+8 more)

### Community 39 - "Deps dos testes"
Cohesion: 0.14
Nodes (16): dependencies, @caca-oferta/shared@workspace:*, description, devDependencies, typescript@^7.0.2, vitest@^5.0.0, @caca-oferta/shared, typescript (+8 more)

### Community 40 - "Tsconfig base"
Cohesion: 0.12
Nodes (16): compilerOptions, allowSyntheticDefaultImports, esModuleInterop, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+8 more)

### Community 41 - "Contratos de anúncios salvos"
Cohesion: 0.12
Nodes (12): ClassificationDto, isoDateField, nullableUrl, SavedAdDtoSchema, SavedAdExistsResponse, SavedAdListDtoSchema, SavedAdListResponse, SavedAdMutationResponse (+4 more)

### Community 42 - "Deps do shared"
Cohesion: 0.14
Nodes (15): dependencies, @caca-oferta/types@workspace:*, zod@^4.5.4, description, exports, files, @caca-oferta/types, zod (+7 more)

### Community 43 - "Entrada do content script"
Cohesion: 0.24
Nodes (8): normalizedToParsed(), AdMiningOptions, init(), isMetaAdsLibraryPage(), getCurrentUrl(), NavigationListener, observeSpaNavigation(), OverlayHandle

### Community 44 - "Mineração e tipos de anúncio"
Cohesion: 0.20
Nodes (7): AdMiningHandle, Ad, AdPlatform, AdStatus, MediaType, ParsedAd, SavedAd

### Community 45 - "Segurança e troubleshooting"
Cohesion: 0.14
Nodes (14): CreativeService, MetaAdsLibraryAdapter, Riscos técnicos, Bearer JWT route-protection middleware, ExtensionSession, POST /auth/login, POST /auth/register, Supabase Auth + JWT (+6 more)

### Community 46 - "Fixtures HTML do parser"
Cohesion: 0.37
Nodes (14): Basic Ad fixture (NutSmart, complete fields, l.php destination), Video Ad fixture (FitLife, video creative + poster thumbnail), Carousel Ad fixture (PacotesViagem, inactive with stop date), Missing ID fixture (no Library ID, parser must return null), Missing Domain fixture (l.php without u param), Active Ad fixture (SupremeFit, pt-BR abbreviated date), Inactive Ad fixture (AguaDeNoz, 106 running days), Multiple Ads fixture (3 isolated cards) (+6 more)

### Community 47 - "Popup da extensão"
Cohesion: 0.16
Nodes (8): rootElement, platformLabelOf(), PopupApp(), savedAtBr(), OFERTA_SALVA, render(), RootNode, SendMessageMock

### Community 48 - "Deps do types"
Cohesion: 0.15
Nodes (13): description, devDependencies, typescript@^7.0.2, exports, files, typescript, name, private (+5 more)

### Community 49 - "Testes de anúncios salvos"
Cohesion: 0.17
Nodes (4): PAYLOAD, unauthorized(), createMemorySavedAdsStore(), fastify

### Community 50 - "Tipos de domínio"
Cohesion: 0.15
Nodes (6): AdCreative, Domain, Note, AdTag, Tag, User

### Community 51 - "Background e cache de IDs"
Cohesion: 0.33
Nodes (10): api, handleRequest(), addSavedAdId(), inMemoryIds, isSavedAdId(), load(), persist(), removeSavedAdId() (+2 more)

### Community 53 - "Tsconfig da extensão"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, paths, types, extends, include, ../../tsconfig.base.json, @caca-oferta/shared (+3 more)

### Community 54 - "Tsconfig do web"
Cohesion: 0.17
Nodes (11): compilerOptions, jsx, paths, types, extends, include, ../../tsconfig.base.json, @caca-oferta/shared (+3 more)

### Community 55 - "Workflow de mineração diária"
Cohesion: 0.17
Nodes (11): jobs, mine, runs-on, steps, name, on, schedule, workflow_dispatch (+3 more)

### Community 56 - "Rota de mineração diária"
Cohesion: 0.25
Nodes (9): CRON_SECRET, buildAdLibraryUrl(), classifyTrend(), DAILY_TARGET, DailyMiningRouteDeps, NICHES, registerDailyMiningRoutes(), scoreOffer() (+1 more)

### Community 57 - "Rota de anúncios salvos"
Cohesion: 0.20
Nodes (10): PageParams, parsePage(), parsePositiveInt(), SavedAdsRouteDeps, toSaveDto(), SavedAdRow, NewClassificationInput, NewNoteInput (+2 more)

### Community 58 - "Favoritos"
Cohesion: 0.35
Nodes (10): CaçaOfertaFavorites, DEFAULT_FAVORITES, isDomainFavorited(), isKeywordFavorited(), isOfferFavorited(), loadFavorites(), saveFavorites(), toggleDomainFavorite() (+2 more)

### Community 59 - "Tsconfig da API"
Cohesion: 0.20
Nodes (9): compilerOptions, paths, types, extends, include, ../../tsconfig.base.json, @caca-oferta/database, @caca-oferta/shared (+1 more)

### Community 60 - "Deduplicação"
Cohesion: 0.31
Nodes (6): adKey(), adSignature(), deduplicateAds(), isValidAd(), base, textHash()

### Community 61 - "Logger"
Cohesion: 0.22
Nodes (5): activeLogger, createConsoleMethod(), isDebugEnabled(), Logger, noopLogger

### Community 62 - "Conceitos do parser (docs)"
Cohesion: 0.22
Nodes (9): AdPlatformAdapter, Meta Ads Library, MetaAdsLibraryAdapter, AdPlatformAdapter Interface, ParsedAd, Parser HTML Fixtures, NormalizedAd, MetaAdsLibraryAdapter.parseAdCard() (+1 more)

### Community 63 - "Segurança (docs)"
Cohesion: 0.24
Nodes (8): extractDomain, Comunicação Extensão ↔ Backend (HTTPS, Bearer header, validated payloads), isHttpUrl, packages/shared input validation, Postgres Row Level Security (RLS), CaçaOferta Autenticação, Segurança e Privacidade, Security threat mitigations (XSS, CSRF, SQLi, malformed URL, token exposure, rate limit), WEB_URL CORS origin

### Community 64 - "Workspace pnpm"
Cohesion: 0.20
Nodes (9): allowBuilds, esbuild, msgpackr-extract, prisma, @prisma/client, @prisma/engines, sharp, workerd (+1 more)

### Community 65 - "Tsconfig dos testes"
Cohesion: 0.20
Nodes (9): compilerOptions, lib, paths, types, extends, include, ../tsconfig.base.json, @caca-oferta/shared (+1 more)

### Community 66 - "Domínio e URLs seguras"
Cohesion: 0.50
Nodes (7): domainOriginUrl(), extractDomain(), isMetaInternalHost(), isSafeHttpUrl(), normalizeDomain(), toHttpUrlOrNull(), attachOverlay()

### Community 67 - "Testes da sidebar"
Cohesion: 0.28
Nodes (5): CaçaOfertaSidebarOptions, ADS_EXEMPLO, offersButton(), shadowOf(), statValue()

### Community 68 - "Modelo de dados (docs)"
Cohesion: 0.22
Nodes (9): AdTag, Default Tags Seed, ExtensionSession, Note, SearchHistory, Tag, User, Extension Endpoints (/extension/session) (+1 more)

### Community 69 - "Painel lateral"
Cohesion: 0.32
Nodes (5): rootElement, NEXT_STEPS, PanelApp(), APP_VERSION, BrandHeader()

### Community 70 - "Health check do web"
Cohesion: 0.25
Nodes (3): HealthState, useHealth(), rootElement

### Community 71 - "Princípios de detecção (docs)"
Cohesion: 0.25
Nodes (3): DetectionService, ParseService, MetaAdsLibraryAdapter

### Community 72 - "Busca por domínio (docs)"
Cohesion: 0.32
Nodes (8): packages/utils, RunningDaysService, CaçaOferta Ad Card UI Layer, Extracted Ad Fields (ad_library_id, page_id, status, ...), Domain Search Flow, extractDomain, normalizeDomain, Domains Endpoints (/domains/:domain/ads)

### Community 73 - "Estratégia de testes"
Cohesion: 0.25
Nodes (7): saveOffer, searchByDomain, deduplicateAds, detectAds, Playwright, CaçaOferta Estratégia de Testes, Vitest

### Community 74 - "Tsconfig do shared"
Cohesion: 0.25
Nodes (7): compilerOptions, lib, paths, extends, include, ../../tsconfig.base.json, @caca-oferta/types

### Community 76 - "Testes do painel de busca"
Cohesion: 0.33
Nodes (3): SEARCH_MESSAGES, makeAd(), setup()

### Community 77 - "Tsconfig do database"
Cohesion: 0.29
Nodes (6): compilerOptions, lib, types, extends, include, ../tsconfig.base.json

### Community 78 - "Ofertas e catálogo (docs)"
Cohesion: 0.33
Nodes (6): OfferService, Ad, AdCreative, Domain, SavedAd, Ads Catalog Endpoints (/ads)

### Community 79 - "Tsconfig do utils"
Cohesion: 0.29
Nodes (6): compilerOptions, lib, types, extends, include, ../../tsconfig.base.json

### Community 80 - "Envelope de resposta da API"
Cohesion: 0.33
Nodes (6): API Response Envelope {data, meta} / {error}, Saved Ads Endpoints (/saved-ads), ALREADY_SAVED (409), DEV_USER_ID, resolveCurrentUser, /api/saved-ads Endpoints (FASE 06)

### Community 81 - "Tsconfig do types"
Cohesion: 0.33
Nodes (5): compilerOptions, lib, extends, include, ../../tsconfig.base.json

### Community 82 - "Tsconfig do UI"
Cohesion: 0.33
Nodes (5): compilerOptions, jsx, extends, include, ../../tsconfig.base.json

### Community 83 - "Prettier"
Cohesion: 0.33
Nodes (5): printWidth, semi, singleQuote, tabWidth, trailingComma

### Community 84 - "Configurações"
Cohesion: 0.50
Nodes (4): CaçaOfertaSettings, DEFAULT_SETTINGS, loadSettings(), saveSettings()

### Community 85 - "Serviço de domínio (docs)"
Cohesion: 0.40
Nodes (4): DomainService, searchByDomain, CaçaOfertaSidebar, DomainIndex

### Community 87 - "Clonar páginas"
Cohesion: 0.67
Nodes (3): ClonarPaginasPage(), fetchCloned(), handleClone()

### Community 88 - "Pareamento da extensão"
Cohesion: 0.83
Nodes (4): ExtensaoPage(), fetchSessions(), handlePair(), handleRevokeSession()

### Community 90 - "Autenticação (docs)"
Cohesion: 0.50
Nodes (4): AuthService, AuthSession, chrome.storage.local, Auth Endpoints (/auth/register, /auth/login, /me)

## Ambiguous Edges - Review These
- `/api/saved-ads Endpoints (FASE 06)` → `API Response Envelope {data, meta} / {error}`  [AMBIGUOUS]
  docs/06-API.md · relation: conceptually_related_to

## Knowledge Gaps
- **50 isolated node(s):** `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../tsconfig.base.json`, `../../tsconfig.base.json` (+45 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 587 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Fase 02 - Estrutura da extensão Chrome` connect `Roadmap por fases` to `Deploy e páginas HTML`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Are the 15 inferred relationships involving `startAdMining()` (e.g. with `.detectAds()` and `.parseAdCard()`) actually correct?**
  _`startAdMining()` has 15 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.base.json`, `../../tsconfig.base.json`, `../../tsconfig.base.json` to the rest of the system?**
  _50 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Palavras-chave por nicho` be split into smaller, more focused modules?**
  _Cohesion score 0.05384150030248034 - nodes in this community are weakly interconnected._
- **Why does `AdPlatformAdapter` connect `Interface AdPlatformAdapter` to `Parser Meta e validação`, `Tipos de domínio`, `MetaAdsLibraryAdapter`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `Deps da extensão` be split into smaller, more focused modules?**
  _Cohesion score 0.05203619909502263 - nodes in this community are weakly interconnected._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `/api/saved-ads Endpoints (FASE 06)` and `API Response Envelope {data, meta} / {error}`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._