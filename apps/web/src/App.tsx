import { Search, ChevronLeft, ChevronRight, LayoutDashboard, Flag, Zap, ShoppingCart, Heart, ArrowRightLeft, Music, ChartPie, Copy, Puzzle, HelpCircle, X, Menu, Bell, User, Wifi, WifiOff, Loader2, Star, TrendingUp } from 'lucide-react';
import { APP_TAGLINE } from '@caca-oferta/shared';
import { useHealth } from './hooks/useHealth';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';

/* ------------------------------------------------------------------ */
/*  Tipos                                                              */
/* ------------------------------------------------------------------ */

interface SavedAdItem {
  id: string;
  adLibraryId: string;
  pageId: string | null;
  pageName: string | null;
  status: string;
  deliveryStartDate: string | null;
  deliveryStopDate: string | null;
  runningDays: number | null;
  platforms: string[];
  mediaType: string;
  creativeText: string | null;
  headline: string | null;
  description: string | null;
  cta: string | null;
  destinationUrl: string | null;
  destinationDomain: string | null;
  adSnapshotUrl: string | null;
  creativeUrl: string | null;
  thumbnailUrl: string | null;
  savedAt: string;
  updatedAt: string;
  classification: number | null;
  score: number | null;
  isFavorite: boolean;
  tags: string[];
  notes: string[];
}

interface DashboardSummary {
  totalOfertas: number;
  ativas: number;
  inativas: number;
  desconhecidas: number;
  totalCreativos: number;
  domniosUnicos: number;
  mediaDias: number;
  mediaScore: number;
  mediaClassificacao: number;
  distClassificacao: { star: number; count: number }[];
  topDomains: { domain: string; count: number }[];
}

type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; items: SavedAdItem[]; total: number };

/* ------------------------------------------------------------------ */
/*  Caminhos                                                           */
/* ------------------------------------------------------------------ */

const PATHS = {
  DASHBOARD: '/dashboard',
  MINERACAO: '/mineracao',
  RASTREAMENTO: '/rastreamento',
  MINERACAO_AUTOMATICA: '/mineracao-automatica',
  OFERTAS_MINERADAS: '/ofertas-mineradas',
  MINHAS_OFERTAS: '/minhas-ofertas',
  FAVORITOS: '/favoritos',
  SWIPE: '/swipe',
  TRANSCRICAO: '/transcricao',
  ANALISE_TRAFEGO: '/analise-trafego',
  CLONAR_PAGINAS: '/clonar-paginas',
  EXTENSAO: '/extensao',
  AJUDA: '/ajuda',
  PESQUISA: '/pesquisa',
} as const;

const NAV_ITEMS = [
  { href: PATHS.DASHBOARD, icon: LayoutDashboard, label: 'Dashboard', group: 'Principal' },
  { href: PATHS.MINERACAO, icon: Search, label: 'Mineração', group: 'Principal' },
  { href: PATHS.RASTREAMENTO, icon: Flag, label: 'Rastreamento de Ofertas', group: 'Principal' },
  { href: PATHS.MINERACAO_AUTOMATICA, icon: Zap, label: 'Mineração Automática', group: 'Principal' },
  { href: PATHS.OFERTAS_MINERADAS, icon: TrendingUp, label: 'Ofertas Mineradas', group: 'Principal' },
  { href: PATHS.MINHAS_OFERTAS, icon: ShoppingCart, label: 'Minhas Ofertas', group: 'Principal' },
  { href: PATHS.FAVORITOS, icon: Heart, label: 'Favoritos', group: 'Principal' },
  { href: PATHS.SWIPE, icon: ArrowRightLeft, label: 'Swipe', group: 'Análise' },
  { href: PATHS.TRANSCRICAO, icon: Music, label: 'Transcrição de Mídias', group: 'Análise' },
  { href: PATHS.ANALISE_TRAFEGO, icon: ChartPie, label: 'Análise de Tráfego', group: 'Análise' },
  { href: PATHS.CLONAR_PAGINAS, icon: Copy, label: 'Clonar Páginas', group: 'Análise' },
  { href: PATHS.EXTENSAO, icon: Puzzle, label: 'Extensão', group: 'Ferramentas' },
  { href: PATHS.AJUDA, icon: HelpCircle, label: 'Ajuda / Tutoriais', group: 'Ferramentas' },
];

function getGroupedNav(): Record<string, typeof NAV_ITEMS> {
  return NAV_ITEMS.reduce((acc, item) => {
    const group = acc[item.group] ?? [];
    group.push(item);
    acc[item.group] = group;
    return acc;
  }, {} as Record<string, typeof NAV_ITEMS>);
}

function useDashboardSummary() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      try {
        const adsRes = await fetch('/api/saved-ads', { cache: 'no-store' });
        if (!adsRes.ok) throw new Error('Não foi possível carregar ofertas');
        const adsData = await adsRes.json();
        const ads = adsData.data?.items ?? [];

        const totalOfertas = ads.length;
        const ativas = ads.filter((a: SavedAdItem) => a.status === 'active').length;
        const inativas = ads.filter((a: SavedAdItem) => a.status === 'inactive').length;
        const desconhecidas = ads.filter((a: SavedAdItem) => a.status === 'unknown').length;
        const totalCreativos = ads.reduce((sum: number, a: SavedAdItem) => sum + (a.runningDays != null ? 1 : 0), 0);
        const domniosUnicos = ads
          .map((a: SavedAdItem) => a.destinationDomain ?? '')
          .filter((d: string) => d.length > 0)
          .reduce((unique: string[], d: string) => {
            if (!unique.includes(d)) unique.push(d);
            return unique;
          }, []).length;
        const mediaDias = totalOfertas > 0
          ? ads.reduce((sum: number, a: SavedAdItem) => sum + (a.runningDays ?? 0), 0) / totalOfertas
          : 0;
        const ofertasComScore = ads.filter((a: SavedAdItem) => a.score != null);
        const mediaScore = ofertasComScore.length > 0
          ? ofertasComScore.reduce((sum: number, a: SavedAdItem) => sum + (a.score ?? 0), 0) / ofertasComScore.length
          : 0;
        const ofertasComClassificacao = ads.filter((a: SavedAdItem) => a.classification != null && a.classification > 0);
        const mediaClassificacao = ofertasComClassificacao.length > 0
          ? ofertasComClassificacao.reduce((sum: number, a: SavedAdItem) => sum + (a.classification ?? 0), 0) / ofertasComClassificacao.length
          : 0;
        const distClassificacao = [1, 2, 3, 4, 5].map(star => ({
          star,
          count: ads.filter((a: SavedAdItem) => a.classification === star).length
        }));
        const domainCounts = ads
          .filter((a: SavedAdItem) => a.destinationDomain)
          .reduce((acc: Record<string, number>, a: SavedAdItem) => {
            acc[a.destinationDomain!] = (acc[a.destinationDomain!] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
        const topDomains = Object.entries(domainCounts)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([domain, count]) => ({ domain, count: count as number }));

        setData({
          totalOfertas, ativas, inativas, desconhecidas, totalCreativos,
          domniosUnicos, mediaDias: Number(mediaDias.toFixed(1)),
          mediaScore: Number(mediaScore.toFixed(1)),
          mediaClassificacao: Number(mediaClassificacao.toFixed(1)),
          distClassificacao, topDomains,
        });
      } catch (e: any) {
        setError(e.message ?? 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
    const interval = setInterval(fetchSummary, 30_000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error };
}

function useSavedAds(filters?: Record<string, string>) {
  const [viewState, setViewState] = useState<ViewState>({ status: 'loading' });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  useEffect(() => {
    let active = true;
    async function fetchAds() {
      try {
        setViewState({ status: 'loading' });
        const params = new URLSearchParams();
        if (filters) {
          Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
        }
        params.append('page', String(page));
        params.append('pageSize', String(pageSize));
        const res = await fetch(`/api/saved-ads?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        if (!active) return;
        setViewState({ status: 'ready', items: data.data?.items ?? [], total: data.data?.total ?? 0 });
      } catch (e: any) {
        if (!active) return;
        setViewState({ status: 'error', message: e.message ?? 'Erro ao carregar ofertas' });
      }
    }
    fetchAds();
    const refetchId = setInterval(fetchAds, 60_000);
    return () => { active = false; clearInterval(refetchId); };
  }, [page, pageSize, filters]);

  const isReady = viewState.status === 'ready';
  const isLoading = viewState.status === 'loading';
  const isError = viewState.status === 'error';
  const items = isReady ? viewState.items : [];
  const total = isReady ? viewState.total : 0;
  const error = isError ? viewState.message : null;

  return { items, loading: isLoading, error, page, setPage, pageSize, total };
}

function IndicatorCard({ title, value, description }: { title: string; value: any; description: string }) {
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 hover:border-neutral-700 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-extrabold text-white mt-1">{value ?? '—'}</p>
        </div>
        <small className="text-neutral-400">{description}</small>
      </div>
    </div>
  );
}

function OfferCard({ ad }: { ad: SavedAdItem }) {
  const mediaTypeLabels: Record<string, string> = {
    image: 'Imagem', video: 'Vídeo', carousel: 'Carrossel', unknown: 'Desconhecido',
  };
  const platformLabels = (ad.platforms ?? []).map((p: string) => p.charAt(0).toUpperCase() + p.slice(1));
  const statusColors: Record<string, string> = {
    active: 'text-status-active bg-status-active/10 border-status-active/30',
    inactive: 'text-red-400 bg-red-400/10 border-red-400/30',
    unknown: 'text-neutral-400 bg-neutral-800 border-neutral-700',
  };
  const statusCls = statusColors[ad.status] ?? statusColors.unknown;

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0 text-neutral-500 font-bold text-sm group-hover:bg-neutral-700 transition-colors">
          {ad.adLibraryId ? ad.adLibraryId.slice(0, 2).toUpperCase() : '—'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-white truncate">{ad.pageName ?? ad.adLibraryId ?? 'Sem nome'}</p>
            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusCls}`}>
              {ad.status === 'active' ? 'Ativo' : ad.status === 'inactive' ? 'Encerrado' : 'Desconhecido'}
            </span>
          </div>
          <p className="text-xs text-neutral-500 mb-2">
            {ad.destinationDomain ?? '—'} · {platformLabels.join(', ')} · {mediaTypeLabels[ad.mediaType ?? 'unknown']}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-neutral-400">
            {ad.runningDays != null && <span>{ad.runningDays} dias</span>}
            {ad.cta && <span>{ad.cta}</span>}
            {ad.score != null && (
              <span className="inline-flex items-center gap-1 text-brand-400">
                <Star className="h-3 w-3" /> {ad.score}
              </span>
            )}
            {ad.classification != null && ad.classification > 0 && (
              <span className="text-yellow-400">{'★'.repeat(ad.classification)}{'☆'.repeat(5 - ad.classification)}</span>
            )}
          </div>
          {ad.tags && ad.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {ad.tags.map((tag: string) => (
                <span key={tag} className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-700">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ title, description, icon }: { title: string; description: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon ?? <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600 mb-4">
        <Search className="h-8 w-8" />
      </div>}
      <p className="text-xl font-semibold text-white mb-2">{title}</p>
      <p className="text-sm text-neutral-400 max-w-md">{description}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-950/30 border border-red-900/50 flex items-center justify-center text-red-400 mb-4">
        <span className="text-2xl">⚠</span>
      </div>
      <p className="text-xl font-semibold text-white mb-2">Erro ao carregar</p>
      <p className="text-sm text-neutral-400 mb-4 max-w-md">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 text-sm font-medium">
          Tentar novamente
        </button>
      )}
    </div>
  );
}

export default function App() {
  const health = useHealth();
  const { data: summary, loading: summaryLoading, error: summaryError } = useDashboardSummary();
  const { items: ofertas, loading: ofertasLoading, error: ofertasError, total: totalOfertas, page, setPage } = useSavedAds();

  const [pathname, setPathname] = useState(window.location.pathname);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Redirect
  useEffect(() => {
    if (pathname === '/' || pathname === '') {
      window.history.replaceState(null, '', PATHS.DASHBOARD);
      setPathname(PATHS.DASHBOARD);
    }
  }, [pathname]);

  const handleNavigate = useCallback((href: string) => {
    window.history.pushState(null, '', href);
    setPathname(href);
    setMobileDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const currentPath = pathname || PATHS.DASHBOARD;
  const isActive = (href: string) => currentPath === href;

  const groupedNav = useMemo(() => getGroupedNav(), []);

  // Keyboard shortcut for search
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(!showSearch);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  const sidebarContent = (
    <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto" aria-label="Navegação principal">
      {Object.entries(groupedNav).map(([group, items]) => (
        <div key={group}>
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-2">{group}</p>
          {items.map(item => (
            <button
              key={item.href}
              onClick={() => handleNavigate(item.href)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                isActive(item.href)
                  ? 'bg-brand-600/15 text-brand-400'
                  : 'text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200'
              }`}
              aria-current={isActive(item.href) ? 'page' : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </nav>
  );

  const pageContent = () => {
    // Dashboard
    if (isActive(PATHS.DASHBOARD) || currentPath === '') {
      if (summaryLoading) return <LoadingState />;
      if (summaryError) return <ErrorState message={summaryError} onRetry={() => window.location.reload()} />;
      if (!summary) return <EmptyState title="Sem dados" description="Conecte a API ou salve ofertas para começar." />;

      return (
        <div>
          {/* Indicadores */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <IndicatorCard title="Ofertas salvas" value={summary.totalOfertas} description="Total" />
            <IndicatorCard title="Ativas" value={summary.ativas} description="Com status ativo" />
            <IndicatorCard title="Inativas" value={summary.inativas} description="Encerradas" />
            <IndicatorCard title="Domínios" value={summary.domniosUnicos} description="Únicos" />
            <IndicatorCard title="Score médio" value={summary.mediaScore ? `${summary.mediaScore}` : '—'} description="Oportunidade (0-100)" />
            <IndicatorCard title="Classif. média" value={summary.mediaClassificacao ? `${summary.mediaClassificacao}/5` : '—'} description="De 1 a 5 estrelas" />
          </div>

          {/* Ofertas em Destaque */}
          {totalOfertas > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-bold text-white mb-4">Ofertas em Destaque</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ofertas.slice(0, 6).map((ad: SavedAdItem) => <OfferCard key={ad.id} ad={ad} />)}
              </div>
              {totalOfertas > 6 && (
                <div className="mt-6 flex justify-center gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 text-sm hover:bg-neutral-800 disabled:opacity-40">
                    ← Anterior
                  </button>
                  <span className="px-3 py-1.5 text-sm text-neutral-400">{page}</span>
                  <button onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-300 text-sm hover:bg-neutral-800">
                    Próxima →
                  </button>
                </div>
              )}
            </div>
          )}

          {totalOfertas === 0 && (
            <EmptyState
              title="Nenhuma oferta ainda"
              description="Comece uma mineração na Meta Ads Library para encontrar e salvar suas primeiras ofertas."
              icon={
                <button
                  onClick={() => handleNavigate(PATHS.MINERACAO)}
                  className="w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 flex items-center justify-center text-brand-400 mb-4 hover:bg-brand-600/30 transition-colors"
                >
                  <Search className="h-8 w-8" />
                </button>
              }
            />
          )}
          {totalOfertas === 0 && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => handleNavigate(PATHS.MINERACAO)}
                className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors"
              >
                Começar mineração
              </button>
            </div>
          )}
        </div>
      );
    }

    // Minhas Ofertas
    if (isActive(PATHS.MINHAS_OFERTAS)) {
      if (ofertasLoading) return <LoadingState />;
      if (ofertasError) return <ErrorState message={ofertasError} />;
      return (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Minhas Ofertas</h1>
            <span className="text-sm text-neutral-400">{totalOfertas} ofertas</span>
          </div>
          {totalOfertas === 0 ? (
            <div>
              <EmptyState
                title="Nenhuma oferta salva"
                description="Comece uma mineração na Meta Ads Library para salvar suas primeiras ofertas."
                icon={<Heart className="h-8 w-8" />}
              />
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => handleNavigate(PATHS.MINERACAO)}
                  className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors"
                >
                  Começar mineração
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ofertas.map((ad: SavedAdItem) => <OfferCard key={ad.id} ad={ad} />)}
            </div>
          )}
        </div>
      );
    }

    // Favoritos
    if (isActive(PATHS.FAVORITOS)) {
      const favorites = ofertas.filter((a: SavedAdItem) => a.isFavorite);
      return (
        <div>
          <h1 className="text-2xl font-bold text-white mb-6">Favoritos</h1>
          {favorites.length === 0 ? (
            <EmptyState title="Nenhum favorito" description="Adicione ofertas aos favoritos para encontrá-las rapidamente." icon={<Heart className="h-8 w-8" />} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {favorites.map((ad: SavedAdItem) => <OfferCard key={ad.id} ad={ad} />)}
            </div>
          )}
        </div>
      );
    }

    // Pesquisa
    if (isActive(PATHS.PESQUISA)) {
      return (
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">Pesquisa</h1>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por domínio, página, CTA..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none"
            />
          </div>
          {ofertas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ofertas.slice(0, 20).map((ad: SavedAdItem) => <OfferCard key={ad.id} ad={ad} />)}
            </div>
          ) : (
            <EmptyState title="Sem resultados" description="Ajuste os filtros de busca ou conecte a extensão para minerar ofertas." />
          )}
        </div>
      );
    }

    // Rastreamento
    if (isActive(PATHS.RASTREAMENTO)) {
      return (
        <div>
          <h1 className="text-2xl font-bold text-white mb-6">Rastreamento de Ofertas</h1>
          <EmptyState title="Rastreamento" description="Marque ofertas para acompanhar e receber atualizações sobre mudanças." icon={<Flag className="h-8 w-8" />} />
        </div>
      );
    }

    // Mineração Automática
    if (isActive(PATHS.MINERACAO_AUTOMATICA)) {
      return (
        <div>
          <h1 className="text-2xl font-bold text-white mb-6">Mineração Automática</h1>
          <EmptyState title="Configure sua mineração" description="Defina palavras-chave, nichos, domínios e bibliotecas para mineração automática." icon={<Zap className="h-8 w-8" />} />
        </div>
      );
    }

    // Swipe
    if (isActive(PATHS.SWIPE)) {
      return (
        <div>
          <h1 className="text-2xl font-bold text-white mb-6">Swipe</h1>
          <EmptyState title="Analise ofertas rapidamente" description="Deslize para curtir, salvar ou ignorar ofertas." icon={<ArrowRightLeft className="h-8 w-8" />} />
        </div>
      );
    }

    // Extensão
    if (isActive(PATHS.EXTENSAO)) {
      return (
        <div>
          <h1 className="text-2xl font-bold text-white mb-6">Extensão Chrome</h1>
          <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              {health.status === 'online' ? (
                <Wifi className="h-5 w-5 text-status-active" />
              ) : (
                <WifiOff className="h-5 w-5 text-status-inactive" />
              )}
              <span className={`font-medium ${health.status === 'online' ? 'text-status-active' : 'text-status-inactive'}`}>
                {health.status === 'checking' ? 'Verificando...' : health.status === 'online' ? 'API online' : 'API offline'}
              </span>
            </div>
            <p className="text-sm text-neutral-400 mb-4">
              A extensão CaçaOferta atua como ponte entre a Meta Ads Library e a API CaçaOferta.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-neutral-900 rounded-lg p-3">
                <span className="text-sm text-neutral-300">Service Worker</span>
                <span className="text-xs text-brand-400 font-mono">Manifest V3</span>
              </div>
              <div className="flex items-center justify-between bg-neutral-900 rounded-lg p-3">
                <span className="text-sm text-neutral-300">Content Script</span>
                <span className="text-xs text-brand-400">Meta Ads Library</span>
              </div>
              <div className="flex items-center justify-between bg-neutral-900 rounded-lg p-3">
                <span className="text-sm text-neutral-300">Painel</span>
                <span className="text-xs text-neutral-500">Side Panel</span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Transcrição
    if (isActive(PATHS.TRANSCRICAO)) {
      return (
        <div>
          <h1 className="text-2xl font-bold text-white mb-6">Transcrição de Mídias</h1>
          <EmptyState title="Configure a transcrição" description="Selecione um vídeo e inicie a transcrição quando o serviço estiver configurado." icon={<Music className="h-8 w-8" />} />
        </div>
      );
    }

    // Análise de Tráfego
    if (isActive(PATHS.ANALISE_TRAFEGO)) {
      return (
        <div>
          <h1 className="text-2xl font-bold text-white mb-6">Análise de Tráfego</h1>
          <EmptyState title="Analise domínios e páginas" description="Insira uma URL para ver estrutura, tecnologias e informações disponíveis." icon={<ChartPie className="h-8 w-8" />} />
        </div>
      );
    }

    // Clonar Páginas
    if (isActive(PATHS.CLONAR_PAGINAS)) {
      return (
        <div>
          <h1 className="text-2xl font-bold text-white mb-6">Clonar Páginas</h1>
          <EmptyState title="Análise estrutural de páginas" description="Insira uma URL para analisar estrutura, títulos, links e tecnologias." icon={<Copy className="h-8 w-8" />} />
        </div>
      );
    }

    // Ajuda
    if (isActive(PATHS.AJUDA)) {
      return (
        <div>
          <h1 className="text-2xl font-bold text-white mb-6">Ajuda / Tutoriais</h1>
          <EmptyState title="Central de ajuda" description="Documentação, tutoriais e suporte para usar o CaçaOferta." icon={<HelpCircle className="h-8 w-8" />} />
        </div>
      );
    }

    // Default
    return <EmptyState title="Página não encontrada" description="Selecione uma opção no menu lateral." />;
  };

  return (
    <div className="flex min-h-screen bg-neutral-950">
      {/* Sidebar Desktop */}
      <aside
        className={`hidden lg:flex flex-col bg-neutral-900 border-r border-neutral-800 transition-all duration-200 overflow-hidden ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
        aria-label="Sidebar"
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-neutral-800 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          {!sidebarCollapsed && (
            <span className="font-extrabold text-white tracking-wide text-sm">CAÇAOFERTA</span>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="mx-3 mt-2 flex items-center justify-center w-10 h-8 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
          aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {sidebarContent}

        {/* Footer */}
        <div className="px-3 py-4 border-t border-neutral-800 shrink-0">
          {!sidebarCollapsed && (
            <p className="text-[10px] text-neutral-600 text-center">© 2026 CaçaOferta</p>
          )}
        </div>
      </aside>

      {/* Sidebar Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-neutral-900 border-r border-neutral-800 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <span className="font-extrabold text-white">CAÇAOFERTA</span>
              <button onClick={() => setMobileDrawerOpen(false)} className="text-neutral-400 hover:text-white" aria-label="Fechar menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur border-b border-neutral-800">
          <div className="flex items-center justify-between px-4 lg:px-6 h-14">
            <div className="flex items-center gap-3">
              {/* Mobile menu */}
              <button
                onClick={() => setMobileDrawerOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-neutral-800 text-neutral-300"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              {/* Search global */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearch(true)}
                  placeholder="Buscar... (Ctrl+K)"
                  className="bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none w-48 lg:w-72"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Status API */}
              <div className="hidden sm:flex items-center gap-1.5">
                {health.status === 'checking' && <Loader2 className="h-4 w-4 text-neutral-500 animate-spin" />}
                {health.status === 'online' && <Wifi className="h-4 w-4 text-status-active" />}
                {health.status === 'offline' && <WifiOff className="h-4 w-4 text-status-inactive" />}
                <span className={`text-[11px] ${
                  health.status === 'online' ? 'text-status-active' :
                  health.status === 'offline' ? 'text-status-inactive' : 'text-neutral-500'
                }`}>
                  {health.status === 'checking' ? '...' : health.status === 'online' ? 'API' : 'Offline'}
                </span>
              </div>

              {/* Notificações */}
              <button className="relative p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors" aria-label="Notificações">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-brand-500 rounded-full" />
              </button>

              {/* Perfil */}
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-neutral-800">
                <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-brand-400" />
                </div>
                <span className="text-xs text-neutral-300">Visitante</span>
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1 px-4 lg:px-6 py-6 lg:py-8 overflow-y-auto">
          {pageContent()}
        </main>

        {/* Footer */}
        <footer className="border-t border-neutral-800">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-3 text-[11px] text-neutral-600">
            <span className="flex items-center gap-2">
              <span className="font-bold text-brand-500">CAÇAOFERTA</span>
              <span>·</span>
              <span>{APP_TAGLINE}</span>
            </span>
            <span className="hidden sm:inline">© 2026</span>
          </div>
        </footer>
      </div>
    </div>
  );
}



