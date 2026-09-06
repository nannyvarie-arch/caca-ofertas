import { Search, ChevronLeft, ChevronRight, LayoutDashboard, Flag, Zap, ShoppingCart, Heart, ArrowRightLeft, Music, ChartPie, Copy, Puzzle, HelpCircle, X, Menu, Bell, User, Wifi, WifiOff, Loader2, Star, TrendingUp, Play, Pause, Trash2, ExternalLink, Download, BookOpen, Settings, ChevronDown, Clock, AlertTriangle, CheckCircle, Filter, BarChart3, Globe, FileText, Send, RefreshCw } from 'lucide-react';
import { APP_TAGLINE } from '@caca-oferta/shared';
import { useHealth } from './hooks/useHealth';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';

/* ─── Tipos ─────────────────────────────────────────────────────── */

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

interface MiningJob {
  id: string;
  query: string;
  niche: string | null;
  maxResults: number;
  status: string;
  resultsFound: number;
  savedCount: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface TrackingEvent {
  id: string;
  savedAdId: string;
  adLibraryId: string | null;
  pageName: string | null;
  eventType: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
}

interface SearchHistoryItem {
  id: string;
  query: string;
  type: string;
  createdAt: string;
}

type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'empty' }
  | { status: 'ready'; items: SavedAdItem[]; total: number };

/* ─── Caminhos ──────────────────────────────────────────────────── */

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
  { href: PATHS.RASTREAMENTO, icon: Flag, label: 'Rastreamento', group: 'Principal' },
  { href: PATHS.MINERACAO_AUTOMATICA, icon: Zap, label: 'Min. Automática', group: 'Principal' },
  { href: PATHS.OFERTAS_MINERADAS, icon: TrendingUp, label: 'Ofertas Mineradas', group: 'Principal' },
  { href: PATHS.MINHAS_OFERTAS, icon: ShoppingCart, label: 'Minhas Ofertas', group: 'Principal' },
  { href: PATHS.FAVORITOS, icon: Heart, label: 'Favoritos', group: 'Principal' },
  { href: PATHS.SWIPE, icon: ArrowRightLeft, label: 'Swipe', group: 'Análise' },
  { href: PATHS.TRANSCRICAO, icon: Music, label: 'Transcrição', group: 'Análise' },
  { href: PATHS.ANALISE_TRAFEGO, icon: ChartPie, label: 'Análise de Tráfego', group: 'Análise' },
  { href: PATHS.CLONAR_PAGINAS, icon: Copy, label: 'Clonar Páginas', group: 'Análise' },
  { href: PATHS.EXTENSAO, icon: Puzzle, label: 'Extensão', group: 'Ferramentas' },
  { href: PATHS.AJUDA, icon: HelpCircle, label: 'Ajuda', group: 'Ferramentas' },
];

/* ─── Hooks ──────────────────────────────────────────────────────── */

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

function useMiningJobs() {
  const [jobs, setJobs] = useState<MiningJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch('/api/mining/jobs', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setJobs(data.data ?? []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchJobs();
  }, []);

  const createJob = async (query: string, niche?: string, maxResults?: number) => {
    const res = await fetch('/api/mining/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, niche, maxResults }),
    });
    if (res.ok) {
      const data = await res.json();
      setJobs(prev => [data.data, ...prev]);
      return data.data;
    }
    return null;
  };

  const runJob = async (id: string) => {
    const res = await fetch(`/api/mining/jobs/${id}/run`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'running' } : j));
    }
  };

  return { jobs, loading, createJob, runJob };
}

function useTrackingEvents() {
  const [events, setEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch('/api/tracking', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setEvents(data.data ?? []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchEvents();
  }, []);

  return { events, loading };
}

function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch('/api/search-history', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setHistory(data.data ?? []);
        }
      } catch { /* ignore */ }
      setLoading(false);
    }
    fetchHistory();
  }, []);

  const addSearch = async (query: string, type?: string) => {
    const res = await fetch('/api/search-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, type }),
    });
    if (res.ok) {
      const data = await res.json();
      setHistory(prev => [data.data, ...prev]);
    }
  };

  return { history, loading, addSearch };
}

/* ─── Componentes UI ─────────────────────────────────────────────── */

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

function OfferCard({ ad, onToggleFavorite }: { ad: SavedAdItem; onToggleFavorite?: (id: string) => void }) {
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
        <button
          onClick={() => onToggleFavorite?.(ad.id)}
          className={`shrink-0 p-1.5 rounded-lg transition-colors ${ad.isFavorite ? 'text-red-400 hover:text-red-300' : 'text-neutral-600 hover:text-neutral-400'}`}
          title={ad.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          <Heart className={`h-4 w-4 ${ad.isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>
    </div>
  );
}

function EmptyState({ title, description, icon, action }: { title: string; description: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon ?? <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-600 mb-4">
        <Search className="h-8 w-8" />
      </div>}
      <p className="text-xl font-semibold text-white mb-2">{title}</p>
      <p className="text-sm text-neutral-400 max-w-md mb-4">{description}</p>
      {action}
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
        <AlertTriangle className="h-8 w-8" />
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    running: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    completed: 'text-green-400 bg-green-400/10 border-green-400/30',
    failed: 'text-red-400 bg-red-400/10 border-red-400/30',
  };
  const labels: Record<string, string> = {
    pending: 'Pendente', running: 'Executando', completed: 'Concluído', failed: 'Falhou',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${styles[status] ?? styles.pending}`}>
      {labels[status] ?? status}
    </span>
  );
}

/* ─── Páginas ────────────────────────────────────────────────────── */

function DashboardPage({ summary, summaryLoading, summaryError, ofertas, totalOfertas, page, setPage, handleNavigate }: any) {
  if (summaryLoading) return <LoadingState />;
  if (summaryError) return <ErrorState message={summaryError} onRetry={() => window.location.reload()} />;
  if (!summary) return <EmptyState title="Sem dados" description="Conecte a API ou salve ofertas para começar." />;

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <IndicatorCard title="Ofertas salvas" value={summary.totalOfertas} description="Total" />
        <IndicatorCard title="Ativas" value={summary.ativas} description="Com status ativo" />
        <IndicatorCard title="Inativas" value={summary.inativas} description="Encerradas" />
        <IndicatorCard title="Domínios" value={summary.domniosUnicos} description="Únicos" />
        <IndicatorCard title="Score médio" value={summary.mediaScore ? `${summary.mediaScore}` : '—'} description="Oportunidade (0-100)" />
        <IndicatorCard title="Classif. média" value={summary.mediaClassificacao ? `${summary.mediaClassificacao}/5` : '—'} description="De 1 a 5 estrelas" />
      </div>
      {totalOfertas > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold text-white mb-4">Ofertas em Destaque</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ofertas.slice(0, 6).map((ad: SavedAdItem) => <OfferCard key={ad.id} ad={ad} />)}
          </div>
        </div>
      )}
      {totalOfertas === 0 && (
        <EmptyState
          title="Nenhuma oferta ainda"
          description="Comece uma mineração na Meta Ads Library para encontrar e salvar suas primeiras ofertas."
          action={
            <button onClick={() => handleNavigate(PATHS.MINERACAO)} className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors">
              Começar mineração
            </button>
          }
        />
      )}
    </div>
  );
}

function MineracaoPage({ addSearch }: { addSearch: (q: string, t?: string) => void }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const niches = ['Infoprodutos', 'E-commerce', 'Fitness', 'Finanças', 'Educação', 'Beleza', 'Saúde', 'Tecnologia', 'Viagens', 'Alimentação'];

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    addSearch(query.trim(), 'manual');
    window.open(`https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q=${encodeURIComponent(query.trim())}`, '_blank');
    setSearching(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Mineração de Ofertas</h1>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Pesquisar na Meta Ads Library</h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ex: emagrecimento, curso online, dropshipping..."
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Pesquisar
          </button>
        </div>
        <p className="text-xs text-neutral-500 mt-2">Abrirá a Meta Ads Library em nova aba com os resultados da pesquisa.</p>
      </div>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Nichos Populares</h2>
        <div className="flex flex-wrap gap-2">
          {niches.map((niche) => (
            <button
              key={niche}
              onClick={() => { setQuery(niche); }}
              className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              {niche}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function RastreamentoPage({ events, loading }: { events: TrackingEvent[]; loading: boolean }) {
  if (loading) return <LoadingState />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Rastreamento de Ofertas</h1>
      {events.length === 0 ? (
        <EmptyState
          title="Nenhum evento de rastreamento"
          description="Salve ofertas e configure rastreamento para monitorar mudanças de status, criativos e domínios."
          icon={<Flag className="h-8 w-8" />}
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{event.pageName ?? event.adLibraryId ?? 'Oferta'}</p>
                  <p className="text-xs text-neutral-500">{event.field}: {event.oldValue ?? '—'} → {event.newValue ?? '—'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={event.eventType} />
                  <span className="text-xs text-neutral-500">{new Date(event.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MineracaoAutomaticaPage({ jobs, loading, createJob, runJob }: { jobs: MiningJob[]; loading: boolean; createJob: (q: string, n?: string, m?: number) => Promise<any>; runJob: (id: string) => Promise<void> }) {
  const [query, setQuery] = useState('');
  const [niche, setNiche] = useState('');
  const [maxResults, setMaxResults] = useState(50);

  const handleCreate = async () => {
    if (!query.trim()) return;
    await createJob(query.trim(), niche || undefined, maxResults);
    setQuery('');
  };

  const statusOrder: Record<string, number> = { running: 0, pending: 1, completed: 2, failed: 3 };
  const sortedJobs = [...jobs].sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Mineração Automática</h1>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Novo Job de Mineração</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Palavra-chave ou frase"
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none"
          />
          <input
            type="text"
            value={niche}
            onChange={(e) => setNiche(e.target.value)}
            placeholder="Nicho (opcional)"
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none"
          />
          <input
            type="number"
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            min={10}
            max={200}
            placeholder="Máx. resultados"
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none"
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={!query.trim()}
          className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <Zap className="h-4 w-4" />
          Criar Job
        </button>
      </div>

      {loading ? <LoadingState /> : (
        <div className="space-y-3">
          {sortedJobs.length === 0 ? (
            <EmptyState
              title="Nenhum job de mineração"
              description="Crie um job acima para começar a mineração automática de ofertas."
              icon={<Zap className="h-8 w-8" />}
            />
          ) : (
            sortedJobs.map((job) => (
              <div key={job.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{job.query}</p>
                    <p className="text-xs text-neutral-500">
                      {job.niche && `Nicho: ${job.niche} · `}
                      {job.resultsFound} resultados · {job.savedCount} salvos
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={job.status} />
                    {job.status === 'pending' && (
                      <button onClick={() => runJob(job.id)} className="p-2 text-green-400 hover:text-green-300 transition-colors" title="Executar">
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                    {job.status === 'running' && (
                      <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />
                    )}
                  </div>
                </div>
                {job.errorMessage && (
                  <p className="text-xs text-red-400 mt-2">{job.errorMessage}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function OfertasMineradasPage({ ofertas, loading, error }: { ofertas: SavedAdItem[]; loading: boolean; error: string | null }) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Ofertas Mineradas</h1>
        <span className="text-sm text-neutral-400">{ofertas.length} ofertas coletadas</span>
      </div>
      {ofertas.length === 0 ? (
        <EmptyState
          title="Nenhuma oferta minerada"
          description="Use a ferramenta de Mineração para buscar ofertas na Meta Ads Library."
          icon={<TrendingUp className="h-8 w-8" />}
          action={
            <button onClick={() => window.location.hash = '#/mineracao'} className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors">
              Ir para Mineração
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ofertas.map((ad: SavedAdItem) => <OfferCard key={ad.id} ad={ad} />)}
        </div>
      )}
    </div>
  );
}

function MinhasOfertasPage({ ofertas, loading, error, totalOfertas, page, setPage, handleToggleFavorite }: any) {
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Minhas Ofertas</h1>
        <span className="text-sm text-neutral-400">{totalOfertas} ofertas</span>
      </div>
      {totalOfertas === 0 ? (
        <EmptyState
          title="Nenhuma oferta salva"
          description="Comece uma mineração na Meta Ads Library para salvar suas primeiras ofertas."
          icon={<Heart className="h-8 w-8" />}
          action={
            <button onClick={() => window.location.hash = '#/mineracao'} className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors">
              Começar mineração
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ofertas.map((ad: SavedAdItem) => <OfferCard key={ad.id} ad={ad} onToggleFavorite={handleToggleFavorite} />)}
        </div>
      )}
    </div>
  );
}

function FavoritosPage({ ofertas, loading }: { ofertas: SavedAdItem[]; loading: boolean }) {
  if (loading) return <LoadingState />;
  const favorites = ofertas.filter((a: SavedAdItem) => a.isFavorite);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Favoritos</h1>
      {favorites.length === 0 ? (
        <EmptyState title="Nenhum favorito" description="Clique no ícone de coração nas ofertas para adicioná-las aos favoritos." icon={<Heart className="h-8 w-8" />} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((ad: SavedAdItem) => <OfferCard key={ad.id} ad={ad} />)}
        </div>
      )}
    </div>
  );
}

function SwipePage({ ofertas, loading }: { ofertas: SavedAdItem[]; loading: boolean }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [decisions, setDecisions] = useState<{ id: string; decision: 'like' | 'save' | 'skip' }[]>([]);

  const unprocessed = ofertas.filter((ad) => !decisions.find((d) => d.id === ad.id));
  const currentAd = unprocessed[0];

  const handleDecision = (decision: 'like' | 'save' | 'skip') => {
    if (!currentAd) return;
    setDecisions((prev) => [...prev, { id: currentAd.id, decision }]);
  };

  if (loading) return <LoadingState />;
  if (ofertas.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Swipe</h1>
        <EmptyState title="Nenhuma oferta para analisar" description="Salve ofertas primeiro para usar o modo swipe." icon={<ArrowRightLeft className="h-8 w-8" />} />
      </div>
    );
  }

  if (!currentAd) {
    const likes = decisions.filter((d) => d.decision === 'like').length;
    const saves = decisions.filter((d) => d.decision === 'save').length;
    const skips = decisions.filter((d) => d.decision === 'skip').length;
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Swipe — Concluído</h1>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <p className="text-xl font-bold text-white mb-2">Todas as ofertas analisadas!</p>
          <div className="flex justify-center gap-6 mt-4">
            <div><p className="text-2xl font-bold text-green-400">{likes}</p><p className="text-xs text-neutral-500">Curtidas</p></div>
            <div><p className="text-2xl font-bold text-blue-400">{saves}</p><p className="text-xs text-neutral-500">Salvas</p></div>
            <div><p className="text-2xl font-bold text-neutral-400">{skips}</p><p className="text-xs text-neutral-500">Ignoradas</p></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Swipe</h1>
      <div className="max-w-lg mx-auto">
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-6">
          <OfferCard ad={currentAd} />
        </div>
        <div className="flex justify-center gap-4">
          <button onClick={() => handleDecision('skip')} className="px-8 py-3 bg-neutral-800 text-neutral-300 rounded-xl font-medium hover:bg-neutral-700 transition-colors flex items-center gap-2">
            <X className="h-5 w-5" /> Ignorar
          </button>
          <button onClick={() => handleDecision('save')} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" /> Salvar
          </button>
          <button onClick={() => handleDecision('like')} className="px-8 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors flex items-center gap-2">
            <Heart className="h-5 w-5" /> Curtir
          </button>
        </div>
        <p className="text-center text-xs text-neutral-500 mt-4">{decisions.length} de {ofertas.length} analisadas</p>
      </div>
    </div>
  );
}

function TranscricaoPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Transcrição de Mídias</h1>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
        <div className="text-center py-8">
          <Music className="h-12 w-12 text-neutral-600 mx-auto mb-4" />
          <p className="text-lg font-semibold text-white mb-2">Serviço de Transcrição</p>
          <p className="text-sm text-neutral-400 max-w-md mx-auto mb-6">
            Para usar a transcrição de mídias, configure um provedor de Speech-to-Text (ex: OpenAI Whisper, Google Speech-to-Text).
          </p>
          <div className="bg-neutral-900 rounded-xl p-4 max-w-md mx-auto text-left">
            <p className="text-xs text-neutral-500 mb-2">Variáveis de ambiente necessárias:</p>
            <code className="text-xs text-brand-400 block">STT_PROVIDER=openai</code>
            <code className="text-xs text-brand-400 block">STT_API_KEY=sua-chave-aqui</code>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnaliseTrafegoPage({ ofertas }: { ofertas: SavedAdItem[] }) {
  const [url, setUrl] = useState('');
  const domainCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ofertas.forEach((ad) => {
      if (ad.destinationDomain) {
        counts[ad.destinationDomain] = (counts[ad.destinationDomain] || 0) + 1;
      }
    });
    return Object.entries(counts).sort(([, a], [, b]) => b - a);
  }, [ofertas]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Análise de Tráfego</h1>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Analisar Domínio</h2>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="exemplo.com.br"
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none"
          />
          <button className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors flex items-center gap-2">
            <Globe className="h-4 w-4" /> Analisar
          </button>
        </div>
      </div>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Domínios Mais Frequentes</h2>
        {domainCounts.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum domínio encontrado nas ofertas salvas.</p>
        ) : (
          <div className="space-y-2">
            {domainCounts.slice(0, 10).map(([domain, count]) => (
              <div key={domain} className="flex items-center justify-between bg-neutral-900 rounded-lg px-4 py-2">
                <span className="text-sm text-white font-mono">{domain}</span>
                <span className="text-xs text-brand-400 font-bold">{count} anúncios</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClonarPaginasPage() {
  const [url, setUrl] = useState('');
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Clonar Páginas</h1>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Análise Estrutural</h2>
        <p className="text-sm text-neutral-400 mb-4">Insira a URL de uma página para analisar sua estrutura, títulos, links e tecnologias utilizadas.</p>
        <div className="flex gap-3">
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://exemplo.com/pagina"
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none"
          />
          <button className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors flex items-center gap-2">
            <Copy className="h-4 w-4" /> Analisar
          </button>
        </div>
      </div>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
        <EmptyState
          title="Pronto para análise"
          description="Cole uma URL acima e clique em Analisar para ver a estrutura da página."
          icon={<Copy className="h-8 w-8" />}
        />
      </div>
    </div>
  );
}

function ExtensaoPage({ health }: { health: any }) {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Extensão Chrome</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            {health.status === 'online' ? <Wifi className="h-5 w-5 text-status-active" /> : <WifiOff className="h-5 w-5 text-status-inactive" />}
            <span className={`font-medium ${health.status === 'online' ? 'text-status-active' : 'text-status-inactive'}`}>
              {health.status === 'online' ? 'API Online' : 'API Offline'}
            </span>
          </div>
          <p className="text-sm text-neutral-400 mb-4">
            A extensão CaçaOferta detecta anúncios automaticamente na Meta Ads Library e permite salvar ofertas diretamente.
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
              <span className="text-sm text-neutral-300">Detecção</span>
              <span className="text-xs text-brand-400">4 camadas fallback</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-900 rounded-lg p-3">
              <span className="text-sm text-neutral-300">Palavras-chave</span>
              <span className="text-xs text-brand-400">150+ palavras, 15 nichos</span>
            </div>
          </div>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Como Instalar</h2>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center shrink-0 text-white text-xs font-bold">1</div>
              <div>
                <p className="text-sm text-white font-medium">Baixe a extensão</p>
                <p className="text-xs text-neutral-500">Faça download do pacote da extensão</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center shrink-0 text-white text-xs font-bold">2</div>
              <div>
                <p className="text-sm text-white font-medium">Abra chrome://extensions</p>
                <p className="text-xs text-neutral-500">Ative o "Modo do desenvolvedor"</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center shrink-0 text-white text-xs font-bold">3</div>
              <div>
                <p className="text-sm text-white font-medium">Carregue descompactada</p>
                <p className="text-xs text-neutral-500">Clique em "Carregar extensão descompactada" e selecione a pasta</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center shrink-0 text-white text-xs font-bold">4</div>
              <div>
                <p className="text-sm text-white font-medium">Acesse a Meta Ads Library</p>
                <p className="text-xs text-neutral-500">A extensão ativa automaticamente na página</p>
              </div>
            </div>
          </div>
          <div className="mt-6 p-3 bg-neutral-900 rounded-lg">
            <p className="text-xs text-neutral-500">
              <strong className="text-neutral-400">Dica:</strong> A extensão funciona apenas em{' '}
              <code className="text-brand-400">facebook.com/ads/library</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AjudaPage() {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const topics = [
    { id: 'mining', title: 'Como minerar ofertas', icon: Search, content: 'Use o menu Mineração para buscar palavras-chave na Meta Ads Library. A pesquisa abre uma nova aba com os resultados. Salve as ofertas interessantes para análise posterior.' },
    { id: 'tracking', title: 'Rastreamento de ofertas', icon: Flag, content: 'Salve uma oferta e use o sistema de rastreamento para monitorar mudanças de status, criativos e domínios ao longo do tempo.' },
    { id: 'auto-mining', title: 'Mineração automática', icon: Zap, content: 'Crie jobs de mineração automática definindo palavras-chave e nichos. O sistema busca resultados periodicamente e salva ofertas automaticamente.' },
    { id: 'favorites', title: 'Gerenciar favoritos', icon: Heart, content: 'Clique no ícone de coração em qualquer oferta para adicioná-la aos favoritos. Acesse seus favoritos rapidamente pelo menu lateral.' },
    { id: 'swipe', title: 'Modo Swipe', icon: ArrowRightLeft, content: 'Analise ofertas rapidamente deslizando para curtir, salvar ou ignorar. Uma forma eficiente de processar muitas ofertas.' },
    { id: 'classification', title: 'Classificação e Score', icon: Star, content: 'Classifique ofertas de 1 a 5 estrelas. O score de oportunidade (0-100) é calculado automaticamente baseado em recência, status e plataforma.' },
    { id: 'domains', title: 'Análise de domínios', icon: Globe, content: 'Use a Análise de Tráfego para ver quais domínios aparecem mais nas ofertas coletadas. Identifique nichos mais lucrativos.' },
    { id: 'extension', title: 'Instalar extensão', icon: Puzzle, content: 'Baixe a extensão, ative o modo desenvolvedor no Chrome e carregue a pasta descompactada. A extensão ativa automaticamente na Meta Ads Library.' },
    { id: 'pages', title: 'Clonar páginas', icon: Copy, content: 'Cole a URL de uma página de vendas para analisar sua estrutura, títulos, links e tecnologias utilizadas.' },
    { id: 'transcription', title: 'Transcrição de mídias', icon: Music, content: 'Configure um provedor de Speech-to-Text para transcrever áudio e vídeo de criativos de anúncios.' },
    { id: 'keyboard', title: 'Atalhos de teclado', icon: Settings, content: 'Ctrl+K: Abrir pesquisa global. Use o menu lateral para navegar entre as seções.' },
    { id: 'data', title: 'Exportar dados', icon: Download, content: 'Suas ofertas são salvas no banco de dados. Use a API para exportar dados em formato JSON para análise externa.' },
    { id: 'support', title: 'Suporte', icon: HelpCircle, content: 'Em caso de dúvidas ou problemas, acesse o repositório no GitHub ou entre em contato pelo canal de suporte.' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Ajuda / Tutoriais</h1>
      <div className="space-y-3">
        {topics.map((topic) => (
          <div key={topic.id} className="bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-neutral-900 transition-colors"
            >
              <topic.icon className="h-5 w-5 text-brand-400 shrink-0" />
              <span className="font-medium text-white flex-1">{topic.title}</span>
              <ChevronDown className={`h-4 w-4 text-neutral-500 transition-transform ${expandedTopic === topic.id ? 'rotate-180' : ''}`} />
            </button>
            {expandedTopic === topic.id && (
              <div className="px-4 pb-4">
                <p className="text-sm text-neutral-400 leading-relaxed">{topic.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── App Principal ──────────────────────────────────────────────── */

function getGroupedNav(): Record<string, typeof NAV_ITEMS> {
  return NAV_ITEMS.reduce((acc, item) => {
    const group = acc[item.group] ?? [];
    group.push(item);
    acc[item.group] = group;
    return acc;
  }, {} as Record<string, typeof NAV_ITEMS>);
}

export default function App() {
  const health = useHealth();
  const { data: summary, loading: summaryLoading, error: summaryError } = useDashboardSummary();
  const { items: ofertas, loading: ofertasLoading, error: ofertasError, total: totalOfertas, page, setPage } = useSavedAds();
  const { jobs, loading: jobsLoading, createJob, runJob } = useMiningJobs();
  const { events, loading: trackingLoading } = useTrackingEvents();
  const { history, loading: historyLoading, addSearch } = useSearchHistory();

  const [pathname, setPathname] = useState(window.location.pathname);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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

  const handleToggleFavorite = useCallback(async (id: string) => {
    try {
      await fetch(`/api/saved-ads/${id}/favorite`, { method: 'PATCH' });
      window.location.reload();
    } catch { /* ignore */ }
  }, []);

  const currentPath = pathname || PATHS.DASHBOARD;
  const isActive = (href: string) => currentPath === href;
  const groupedNav = useMemo(() => getGroupedNav(), []);

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
    if (isActive(PATHS.DASHBOARD) || currentPath === '') {
      return <DashboardPage summary={summary} summaryLoading={summaryLoading} summaryError={summaryError} ofertas={ofertas} totalOfertas={totalOfertas} page={page} setPage={setPage} handleNavigate={handleNavigate} />;
    }
    if (isActive(PATHS.MINERACAO)) return <MineracaoPage addSearch={addSearch} />;
    if (isActive(PATHS.RASTREAMENTO)) return <RastreamentoPage events={events} loading={trackingLoading} />;
    if (isActive(PATHS.MINERACAO_AUTOMATICA)) return <MineracaoAutomaticaPage jobs={jobs} loading={jobsLoading} createJob={createJob} runJob={runJob} />;
    if (isActive(PATHS.OFERTAS_MINERADAS)) return <OfertasMineradasPage ofertas={ofertas} loading={ofertasLoading} error={ofertasError} />;
    if (isActive(PATHS.MINHAS_OFERTAS)) return <MinhasOfertasPage ofertas={ofertas} loading={ofertasLoading} error={ofertasError} totalOfertas={totalOfertas} page={page} setPage={setPage} handleToggleFavorite={handleToggleFavorite} />;
    if (isActive(PATHS.FAVORITOS)) return <FavoritosPage ofertas={ofertas} loading={ofertasLoading} />;
    if (isActive(PATHS.SWIPE)) return <SwipePage ofertas={ofertas} loading={ofertasLoading} />;
    if (isActive(PATHS.TRANSCRICAO)) return <TranscricaoPage />;
    if (isActive(PATHS.ANALISE_TRAFEGO)) return <AnaliseTrafegoPage ofertas={ofertas} />;
    if (isActive(PATHS.CLONAR_PAGINAS)) return <ClonarPaginasPage />;
    if (isActive(PATHS.EXTENSAO)) return <ExtensaoPage health={health} />;
    if (isActive(PATHS.AJUDA)) return <AjudaPage />;
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
        <div className="flex items-center gap-3 px-4 py-4 border-b border-neutral-800 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          {!sidebarCollapsed && <span className="font-extrabold text-white tracking-wide text-sm">CAÇAOFERTA</span>}
        </div>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="mx-3 mt-2 flex items-center justify-center w-10 h-8 rounded-lg bg-neutral-800 text-neutral-400 hover:text-white hover:bg-neutral-700 transition-colors"
          aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
        {sidebarContent}
        <div className="px-3 py-4 border-t border-neutral-800 shrink-0">
          {!sidebarCollapsed && <p className="text-[10px] text-neutral-600 text-center">© 2026 CaçaOferta</p>}
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
        <header className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur border-b border-neutral-800">
          <div className="flex items-center justify-between px-4 lg:px-6 h-14">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileDrawerOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-neutral-800 text-neutral-300" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </button>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Buscar... (Ctrl+K)"
                  className="bg-neutral-900 border border-neutral-800 rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none w-48 lg:w-72"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1.5">
                {health.status === 'checking' && <Loader2 className="h-4 w-4 text-neutral-500 animate-spin" />}
                {health.status === 'online' && <Wifi className="h-4 w-4 text-status-active" />}
                {health.status === 'offline' && <WifiOff className="h-4 w-4 text-status-inactive" />}
                <span className={`text-[11px] ${health.status === 'online' ? 'text-status-active' : health.status === 'offline' ? 'text-status-inactive' : 'text-neutral-500'}`}>
                  {health.status === 'checking' ? '...' : health.status === 'online' ? 'API' : 'Offline'}
                </span>
              </div>
              <button className="relative p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors" aria-label="Notificações">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-brand-500 rounded-full" />
              </button>
              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-neutral-800">
                <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center">
                  <User className="h-4 w-4 text-brand-400" />
                </div>
                <span className="text-xs text-neutral-300">Visitante</span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-6 py-6 lg:py-8 overflow-y-auto">
          {pageContent()}
        </main>

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
