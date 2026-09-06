import { Search, ChevronLeft, ChevronRight, LayoutDashboard, Flag, Zap, ShoppingCart, Heart, ArrowRightLeft, Music, ChartPie, Copy, Puzzle, HelpCircle, X, Menu, Bell, User, Wifi, WifiOff, Loader2, Star, TrendingUp, Play, Pause, Trash2, ExternalLink, Download, BookOpen, Settings, ChevronDown, Clock, AlertTriangle, CheckCircle, Filter, BarChart3, Globe, FileText, Send, RefreshCw, Save, Upload, Sparkles } from 'lucide-react';
import { APP_TAGLINE } from '@caca-oferta/shared';
import { useHealth } from './hooks/useHealth';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { EbookEditor, EbookListPage } from './EbookEditor';

/* ─── Tipos ─────────────────────────────────────────────────────── */

interface OfferSnapshot {
  id: string;
  activeAds: number;
  totalAds: number;
  creativeCount: number;
  runningDays: number;
  takenAt: string;
}

interface OfferItem {
  id: string;
  adLibraryId: string;
  pageId: string | null;
  pageName: string | null;
  advertiserName: string | null;
  primaryDomain: string | null;
  funnelUrl: string | null;
  adLibraryUrl: string | null;
  niche: string | null;
  subniche: string | null;
  country: string | null;
  language: string | null;
  mediaType: string | null;
  isLowTicket: boolean;
  lowTicketSignals: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  lastRunDate: string | null;
  status: string;
  qualification: string | null;
  isSaved: boolean;
  isFavorite: boolean;
  snapshots: OfferSnapshot[];
}

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
  EBOOKS: '/ebooks',
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
  { href: PATHS.EBOOKS, icon: BookOpen, label: 'Criar E-book', group: 'Produção' },
  { href: PATHS.AJUDA, icon: HelpCircle, label: 'Ajuda', group: 'Ferramentas' },
];

/* ─── Hooks ──────────────────────────────────────────────────────── */

function useDashboardSummary() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function fetchSummary() {
      try {
        const res = await fetch('/api/dashboard/summary', { cache: 'no-store' });
        if (!res.ok) throw new Error('API error');
        const json = await res.json();
        if (!active) return;
        if (json.success && json.data) {
          setData({
            totalOfertas: json.data.totalOfertas ?? 0,
            ativas: json.data.ativas ?? 0,
            inativas: json.data.inativas ?? 0,
            desconhecidas: json.data.desconhecidas ?? 0,
            totalCreativos: 0,
            domniosUnicos: (json.data.topDomains ?? []).length,
            mediaDias: 0,
            mediaScore: json.data.mediaScore ?? 0,
            mediaClassificacao: json.data.mediaClassificacao ?? 0,
            distClassificacao: [],
            topDomains: json.data.topDomains ?? [],
          });
        }
      } catch (e: any) {
        if (!active) return;
        setError(e.message ?? 'Erro ao carregar resumo');
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchSummary();
    const interval = setInterval(fetchSummary, 30_000);
    return () => { active = false; clearInterval(interval); };
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

function useOffers(filters?: Record<string, string>) {
  const [items, setItems] = useState<OfferItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  useEffect(() => {
    let active = true;
    async function fetchOffers() {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
        params.append('page', String(page));
        params.append('pageSize', String(pageSize));
        const res = await fetch(`/api/offers?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();
        if (!active) return;
        setItems(data.data?.items ?? []);
        setTotal(data.data?.total ?? 0);
      } catch (e: any) {
        if (!active) return;
        setError(e.message ?? 'Erro ao carregar ofertas');
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchOffers();
    const interval = setInterval(fetchOffers, 60_000);
    return () => { active = false; clearInterval(interval); };
  }, [page, pageSize, filters]);

  return { items, total, loading, error, page, setPage };
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

function Sparkline({ data, width = 80, height = 24, color = '#22c55e' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
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
        <div className="flex flex-col gap-1 shrink-0">
          {(ad.creativeUrl || ad.thumbnailUrl) && (
            <a
              href={ad.creativeUrl ?? ad.thumbnailUrl ?? '#'}
              download
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-lg text-neutral-600 hover:text-brand-400 hover:bg-brand-600/10 transition-colors"
              title="Baixar imagem do criativo"
            >
              <Download className="h-4 w-4" />
            </a>
          )}
          <button
            onClick={() => onToggleFavorite?.(ad.id)}
            className={`p-1.5 rounded-lg transition-colors ${ad.isFavorite ? 'text-red-400 hover:text-red-300' : 'text-neutral-600 hover:text-neutral-400'}`}
            title={ad.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Heart className={`h-4 w-4 ${ad.isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
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
        <IndicatorCard title="Favoritas" value={summary.favoritas ?? 0} description="Marcadas" />
        <IndicatorCard title="Qualificadas" value={summary.qualificadas ?? 0} description="4-5 estrelas" />
        <IndicatorCard title="Rastreando" value={summary.rastreando ?? 0} description="Ofertas monitoradas" />
        <IndicatorCard title="Escalando" value={summary.escalando ?? 0} description="Em alta" />
        <IndicatorCard title="Score médio" value={summary.mediaScore ? `${summary.mediaScore}` : '—'} description="Oportunidade (0-100)" />
        <IndicatorCard title="Classif. média" value={summary.mediaClassificacao ? `${summary.mediaClassificacao}/5` : '—'} description="De 1 a 5 estrelas" />
      </div>
      {summary.topDomains?.length > 0 && (
        <div className="mt-8 bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Top Domínios</h2>
          <div className="space-y-2">
            {summary.topDomains.map((d: any) => (
              <div key={d.domain} className="flex items-center justify-between bg-neutral-900 rounded-lg px-4 py-2">
                <span className="text-sm text-white font-mono">{d.domain}</span>
                <span className="text-xs text-brand-400 font-bold">{d.count} anúncios</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
  const [searchResult, setSearchResult] = useState<{ jobId: string; status: string; message: string } | null>(null);
  const [expandedNiche, setExpandedNiche] = useState<string | null>(null);
  const [keywordSearch, setKeywordSearch] = useState('');

  const niches: Record<string, string[]> = {
    'Emagrecimento/Fitness': ['emagrecimento', 'perder peso', 'dieta para emagrecer', 'como emagrecer rápido', 'barriga chapada', 'treino em casa', 'exercícios para emagrecer', 'musculação feminina', 'treino funcional', 'whey protein', 'termogênico', 'creatina', 'suplemento para emagrecer'],
    'Receitas/Culinária': ['receitas low carb', 'receitas para emagrecer', 'receitas saudáveis', 'receitas fitness', 'receituário completo', 'livro de receitas', 'receitas fáceis', 'receitas rápidas', 'curso de confeitaria', 'receitas de bolos', 'decoração de bolos'],
    'Artesanato': ['aula de crochê', 'crochê para iniciantes', 'padrões de crochê', 'crochê rentável', 'artesanato para vender', 'ideias de artesanato', 'lucro com artesanato', 'como fazer bijuterias', 'curso de bijuterias', 'materiais para bijuterias'],
    'Educação Infantil': ['atividades para crianças', 'atividades pedagógicas', 'folhas de atividades', 'material educativo', 'apostila infantil', 'jogos educativos', 'método de alfabetização', 'como ensinar a ler', 'alfabetização divertida'],
    'Concursos/Estudos': ['preparação para concurso', 'prova de concurso', 'edital de concurso', 'apostila de concurso', 'material para concurso', 'curso para concurso', 'técnicas de estudo', 'como estudar para provas', 'cronograma de estudos'],
    'Renda Extra': ['renda extra', 'como ganhar dinheiro extra', 'trabalho extra de casa', 'dropshipping brasil', 'como começar dropshipping', 'fornecedor dropshipping', 'criar infoproduto', 'como vender infoprodutos', 'lançamento de infoproduto'],
    'Marketing Digital': ['tráfego pago', 'facebook ads', 'google ads', 'anúncios online', 'copywriting', 'como vender com texto', 'páginas de venda', 'gestão de redes sociais', 'marketing de conteúdo', 'instagram para empresas'],
    'Beleza': ['aula de maquiagem', 'maquiagem profissional', 'curso de maquiagem', 'skincare', 'rotina de skincare', 'cuidados com a pele', 'tratamento capilar', 'cuidados com o cabelo', 'produtos para cabelo'],
    'Maternidade': ['gestação saudável', 'preparação para o parto', 'cuidados na gravidez', 'cuidados com o bebê', 'deco de berço', 'primeiros meses de vida', 'amamentação', 'dicas de amamentação', 'aleitamento materno'],
    'Relacionamentos': ['dicas de relacionamento', 'como reconquistar', 'comunicação no namoro', 'autoconhecimento', 'desenvolvimento pessoal', 'autoestima'],
    'Finanças Pessoais': ['controle financeiro pessoal', 'como economizar', 'planilha de gastos', 'investimentos para iniciantes', 'renda fixa', 'como investir', 'quitar dívidas', 'negociação de dívidas', 'sair do sufoco financeiro'],
    'Desenvolvimento Pessoal': ['produtividade pessoal', 'gestão de tempo', 'hábitos produtivos', 'mindset de sucesso', 'pensamento positivo', 'motivação diária', 'liderança', 'gestão de equipes', 'desenvolvimento de liderança'],
    'Idiomas': ['aprender inglês', 'curso de inglês', 'inglês para iniciantes', 'curso de espanhol', 'aprender espanhol', 'espanhol básico', 'curso de francês', 'curso de alemão', 'curso de italiano'],
    'Espiritualidade': ['meditação guiada', 'como meditar', 'meditação para iniciantes', 'yoga em casa', 'aula de yoga', 'yoga para iniciantes', 'desenvolvimento espiritual', 'espiritualidade', 'meditação profunda'],
    'Casa/Organização': ['organização doméstica', 'como organizar a casa', 'decluttering', 'decoração de ambientes', 'dicas de decoração', 'casa organizada', 'dicas de limpeza', 'limpeza profunda', 'produtos de limpeza caseiros'],
    'Pets': ['cuidados com cachorro', 'treinamento de cachorro', 'alimentação canina', 'cuidados com gatos', 'gatos de estimação', 'alimentação felina', 'como cuidar de pet', 'pet shop em casa', 'saúde animal'],
    'Saúde/Bem-estar': ['remédio natural', 'fitoterapia', 'medicina natural', 'como controlar ansiedade', 'ansiedade tratamento', 'dicas para ansiedade', 'dor nas costas tratamento', 'exercícios para dor nas costas', 'coluna saudável'],
    'Intenção de Compra': ['ebook gratuito', 'ebook para download', 'livro digital', 'curso online barato', 'curso rápido', 'curso com certificado', 'planilha de controle', 'planilha financeira', 'planilha para celular'],
  };

  const filteredNiches: Record<string, string[]> = keywordSearch
    ? Object.fromEntries(Object.entries(niches).map(([k, v]) => [k, v.filter((kw: string) => kw.toLowerCase().includes(keywordSearch.toLowerCase()))]).filter(([, v]) => (v as string[]).length > 0))
    : niches;

  const totalKeywords = Object.values(niches).flat().length;

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch('/api/search/keyword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: query.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setSearchResult(data.data);
        addSearch(query.trim(), 'keyword_search');
      }
    } catch { /* ignore */ }
    setSearching(false);
  };

  const handleQuickSearch = async (kw: string) => {
    setQuery(kw);
    setSearching(true);
    try {
      const res = await fetch('/api/search/keyword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: kw }),
      });
      const data = await res.json();
      if (data.success) {
        setSearchResult(data.data);
        addSearch(kw, 'keyword_library');
      }
    } catch { /* ignore */ }
    setSearching(false);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Mineração de Ofertas</h1>

      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-2">Pesquisar por Palavra-chave</h2>
        <p className="text-xs text-neutral-500 mb-4">A busca será executada em background pela extensão. Os resultados aparecerão em Ofertas Mineradas.</p>
        <div className="flex gap-3">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ex: emagrecimento, curso online, dropshipping..."
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 outline-none" />
          <button onClick={handleSearch} disabled={searching || !query.trim()}
            className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Buscar
          </button>
        </div>

        {searchResult && (
          <div className="mt-4 p-3 bg-brand-600/10 border border-brand-600/30 rounded-xl">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-brand-400" />
              <span className="text-sm text-brand-300">{searchResult.message}</span>
            </div>
            <p className="text-[10px] text-neutral-500 mt-1">Job ID: {searchResult.jobId}</p>
          </div>
        )}
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Biblioteca de Palavras-chave</h2>
            <p className="text-xs text-neutral-500">{totalKeywords} termos low ticket organizados por nicho</p>
          </div>
          <input type="text" value={keywordSearch} onChange={e => setKeywordSearch(e.target.value)}
            placeholder="Filtrar..."
            className="w-48 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 outline-none" />
        </div>
        <div className="space-y-2">
          {Object.entries(filteredNiches).map(([niche, keywords]: [string, string[]]) => (
            <div key={niche} className="bg-neutral-900 rounded-xl overflow-hidden">
              <button onClick={() => setExpandedNiche(expandedNiche === niche ? null : niche)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-800 transition-colors">
                <span className="text-sm text-white font-medium">{niche}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-neutral-500">{keywords.length} termos</span>
                  <ChevronDown className={`h-4 w-4 text-neutral-500 transition-transform ${expandedNiche === niche ? 'rotate-180' : ''}`} />
                </div>
              </button>
              {expandedNiche === niche && (
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                  {keywords.map((kw) => (
                    <button key={kw} onClick={() => handleQuickSearch(kw)}
                      className="px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-lg text-xs text-neutral-300 hover:bg-brand-600/20 hover:text-brand-400 hover:border-brand-600/30 transition-colors flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3 text-brand-500" />
                      {kw}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function RastreamentoPage({ events, loading }: { events: TrackingEvent[]; loading: boolean }) {
  const [trackedOffers, setTrackedOffers] = useState<any[]>([]);
  const [counters, setCounters] = useState({ total: 0, scaling: 0, dropping: 0, dead: 0, collecting: 0 });
  const [trackedLoading, setTrackedLoading] = useState(true);
  const [addUrl, setAddUrl] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [adding, setAdding] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTracked();
  }, []);

  async function fetchTracked() {
    try {
      const res = await fetch('/api/tracked-offers', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setTrackedOffers(json.data ?? []);
        setCounters(json.counters ?? { total: 0, scaling: 0, dropping: 0, dead: 0, collecting: 0 });
      }
    } catch { /* ignore */ }
    setTrackedLoading(false);
  }

  async function handleAddTracked() {
    if (!addUrl.trim()) return;
    setAdding(true);
    try {
      const adLibraryId = addUrl.trim().match(/id=(\d+)/)?.[1] ?? addUrl.trim();
      await fetch('/api/tracked-offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adLibraryId, label: addLabel || undefined }),
      });
      setAddUrl('');
      setAddLabel('');
      fetchTracked();
    } catch { /* ignore */ }
    setAdding(false);
  }

  async function handleCheck(id: string) {
    setCheckingId(id);
    try {
      await fetch(`/api/tracked-offers/${id}/check`, { method: 'POST' });
      fetchTracked();
    } catch { /* ignore */ }
    setCheckingId(null);
  }

  async function handleRemove(id: string) {
    if (!confirm('Parar de rastrear esta oferta?')) return;
    try {
      await fetch(`/api/tracked-offers/${id}`, { method: 'DELETE' });
      fetchTracked();
    } catch { /* ignore */ }
  }

  const statusStyles: Record<string, string> = {
    scaling: 'text-green-400 bg-green-400/10',
    dropping: 'text-red-400 bg-red-400/10',
    dead: 'text-neutral-500 bg-neutral-800',
    collecting: 'text-blue-400 bg-blue-400/10',
    unknown: 'text-neutral-400 bg-neutral-800',
  };
  const statusLabels: Record<string, string> = {
    scaling: 'Escalando', dropping: 'Caindo', dead: 'Morta', collecting: 'Coletando', unknown: 'Sem dados',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Rastreamento de Ofertas</h1>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-white">{counters.total}</p>
          <p className="text-xs text-neutral-500">Rastreando</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{counters.scaling}</p>
          <p className="text-xs text-neutral-500">Escalando</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{counters.dropping}</p>
          <p className="text-xs text-neutral-500">Caindo</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-neutral-500">{counters.dead}</p>
          <p className="text-xs text-neutral-500">Mortas</p>
        </div>
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{counters.collecting}</p>
          <p className="text-xs text-neutral-500">Coletando</p>
        </div>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Adicionar ao Rastreamento</h2>
        <p className="text-xs text-neutral-500 mb-3">Cole o link da Biblioteca de Anúncios ou o ID do anúncio.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text" value={addUrl} onChange={(e) => setAddUrl(e.target.value)}
            placeholder="https://www.facebook.com/ads/library/?id=... ou ID"
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none"
          />
          <input
            type="text" value={addLabel} onChange={(e) => setAddLabel(e.target.value)}
            placeholder="Rótulo (opcional)"
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none"
          />
          <button onClick={handleAddTracked} disabled={adding || !addUrl.trim()}
            className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
            Rastrear
          </button>
        </div>
      </div>

      {trackedLoading ? <LoadingState /> : trackedOffers.length === 0 ? (
        <EmptyState
          title="Nenhuma oferta rastreada"
          description="Adicione uma oferta acima para monitorar evolução de anúncios ativos ao longo do tempo."
          icon={<Flag className="h-8 w-8" />}
        />
      ) : (
        <div className="space-y-3">
          {trackedOffers.map((offer: any) => (
            <div key={offer.id} className="bg-neutral-950 border border-neutral-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-medium truncate">{offer.label ?? offer.pageName ?? offer.adLibraryId}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusStyles[offer.status] ?? statusStyles.unknown}`}>
                      {statusLabels[offer.status] ?? offer.status}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {offer.adCountCurrent} anúncio(s) · Última checagem: {offer.lastCheckedAt ? new Date(offer.lastCheckedAt).toLocaleString('pt-BR') : 'Nunca'}
                  </p>
                  {offer.snapshots?.length > 1 && (
                    <div className="flex items-center gap-1 mt-2">
                      {offer.snapshots.slice(0, 10).reverse().map((s: any, i: number) => (
                        <div key={i} className="w-6 rounded-sm" style={{ height: `${Math.max(4, s.adCount * 3)}px`, backgroundColor: offer.status === 'scaling' ? '#22c55e' : offer.status === 'dropping' ? '#ef4444' : '#6366f1' }} title={`${s.adCount} anúncios`} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <button onClick={() => handleCheck(offer.id)} disabled={checkingId === offer.id}
                    className="p-2 text-neutral-500 hover:text-brand-400 transition-colors" title="Rechecar agora">
                    {checkingId === offer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  </button>
                  <a href={`https://www.facebook.com/ads/library/?id=${offer.adLibraryId}`} target="_blank" rel="noopener noreferrer"
                    className="p-2 text-neutral-500 hover:text-blue-400 transition-colors" title="Ver na Biblioteca">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button onClick={() => handleRemove(offer.id)}
                    className="p-2 text-neutral-500 hover:text-red-400 transition-colors" title="Parar rastreamento">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white mb-4">Histórico de Eventos</h2>
          <div className="space-y-2">
            {events.slice(0, 20).map((event) => (
              <div key={event.id} className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 flex items-center justify-between">
                <div>
                  <p className="text-sm text-white">{event.pageName ?? event.adLibraryId}</p>
                  <p className="text-xs text-neutral-500">{event.field}: {event.oldValue ?? '—'} → {event.newValue ?? '—'}</p>
                </div>
                <span className="text-xs text-neutral-500">{new Date(event.createdAt).toLocaleDateString('pt-BR')}</span>
              </div>
            ))}
          </div>
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

function OfertasMineradasPage({ offers, loading, error, total, page, setPage }: { offers: OfferItem[]; loading: boolean; error: string | null; total: number; page: number; setPage: (p: number) => void }) {
  const [nicheFilter, setNicheFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lowTicketOnly, setLowTicketOnly] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  const statusColors: Record<string, string> = {
    nova: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    subindo: 'text-green-400 bg-green-400/10 border-green-400/30',
    estavel: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    caindo: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    morta: 'text-red-400 bg-red-400/10 border-red-400/30',
    coletando: 'text-neutral-400 bg-neutral-400/10 border-neutral-400/30',
  };

  const statusLabels: Record<string, string> = {
    nova: 'Nova', subindo: 'Subindo', estavel: 'Estável', caindo: 'Caindo', morta: 'Morta', coletando: 'Coletando',
  };

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Ofertas Mineradas</h1>
        <span className="text-sm text-neutral-400">{total} ofertas</span>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <input type="text" value={searchFilter} onChange={e => setSearchFilter(e.target.value)}
              placeholder="Buscar por nome, domínio, nicho..."
              className="w-full bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 outline-none" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white">
            <option value="">Todos os status</option>
            {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={() => setLowTicketOnly(!lowTicketOnly)}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${lowTicketOnly ? 'bg-brand-600 text-white border-brand-600' : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:border-neutral-700'}`}>
            <Zap className="h-3 w-3 inline mr-1" /> Low Ticket
          </button>
        </div>
      </div>

      {offers.length === 0 ? (
        <EmptyState
          title="Nenhuma oferta minerada"
          description="Use a Mineração para buscar ofertas. A extensão coletará os dados em background."
          icon={<TrendingUp className="h-8 w-8" />}
          action={<span className="text-xs text-neutral-500">Instale a extensão para coleta automática</span>}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {offers.map((offer) => (
              <div key={offer.id} className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 hover:border-neutral-700 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{offer.pageName ?? offer.advertiserName ?? 'Desconhecido'}</p>
                    <p className="text-xs text-neutral-500 truncate">{offer.primaryDomain ?? offer.adLibraryId}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {offer.isLowTicket && <span className="px-1.5 py-0.5 bg-brand-600/20 text-brand-400 text-[10px] font-medium rounded-full border border-brand-600/30">LOW</span>}
                    <Sparkline data={offer.snapshots.map(s => s.activeAds)} width={60} height={20}
                      color={offer.status === 'subindo' ? '#22c55e' : offer.status === 'caindo' ? '#f97316' : '#737373'} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {offer.niche && <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[10px] text-neutral-400">{offer.niche}</span>}
                  {offer.subniche && <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[10px] text-neutral-400">{offer.subniche}</span>}
                  {offer.country && <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[10px] text-neutral-400">{offer.country}</span>}
                  {offer.mediaType && offer.mediaType !== 'unknown' && <span className="px-2 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-[10px] text-neutral-400">{offer.mediaType}</span>}
                </div>

                <div className="flex items-center justify-between text-xs text-neutral-500 mb-3">
                  <span>{offer.snapshots[0]?.activeAds ?? 0} ads ativos</span>
                  <span>{offer.snapshots[0]?.runningDays ?? 0}d rodando</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-lg text-[10px] font-medium border ${statusColors[offer.status] ?? 'text-neutral-400 bg-neutral-900 border-neutral-800'}`}>
                    {statusLabels[offer.status] ?? offer.status}
                  </span>
                  <div className="flex-1" />
                  {offer.adLibraryUrl && <a href={offer.adLibraryUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-white transition-colors"><ExternalLink className="h-3.5 w-3.5" /></a>}
                  {offer.funnelUrl && <a href={offer.funnelUrl} target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-white transition-colors"><Globe className="h-3.5 w-3.5" /></a>}
                </div>

                {offer.lowTicketSignals.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-neutral-800/50">
                    <p className="text-[10px] text-neutral-600">{offer.lowTicketSignals.join(' · ')}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          {total > 50 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
                className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-400 hover:border-neutral-700 disabled:opacity-50">
                <ChevronLeft className="h-4 w-4 inline" /> Anterior
              </button>
              <span className="text-sm text-neutral-500">Página {page} de {Math.ceil(total / 50)}</span>
              <button onClick={() => setPage(page + 1)} disabled={page * 50 >= total}
                className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-400 hover:border-neutral-700 disabled:opacity-50">
                Próxima <ChevronRight className="h-4 w-4 inline" />
              </button>
            </div>
          )}
        </>
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
          action={<span className="text-xs text-neutral-500">Use o menu Mineração para começar</span>}
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
  const [deck, setDeck] = useState<any[]>([]);
  const [deckLoading, setDeckLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, saved: 0, discarded: 0, favorited: 0, remaining: 0 });
  const [autoMode, setAutoMode] = useState(false);
  const [autoSpeed, setAutoSpeed] = useState(3000);

  useEffect(() => { fetchDeck(); fetchStats(); }, []);

  async function fetchDeck() {
    try {
      const res = await fetch('/api/swipe/deck?limit=20', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setDeck(json.data ?? []);
      }
    } catch { /* ignore */ }
    setDeckLoading(false);
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/swipe/stats', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setStats(json.data ?? { total: 0, saved: 0, discarded: 0, favorited: 0, remaining: 0 });
      }
    } catch { /* ignore */ }
  }

  async function handleDecision(savedAdId: string, decision: string) {
    try {
      await fetch('/api/swipe/decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: savedAdId, decision }),
      });
      setDeck(prev => prev.filter(d => d.savedAdId !== savedAdId));
      fetchStats();
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (!autoMode || deck.length === 0) return;
    const timer = setTimeout(() => {
      const first = deck[0];
      if (first) handleDecision(first.savedAdId, 'save');
    }, autoSpeed);
    return () => clearTimeout(timer);
  }, [autoMode, deck, autoSpeed]);

  const currentAd = deck[0];

  if (deckLoading) return <LoadingState />;

  if (!currentAd) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Swipe</h1>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.remaining}</p>
            <p className="text-xs text-neutral-500">Restantes</p>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{stats.saved}</p>
            <p className="text-xs text-neutral-500">Salvas</p>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.discarded}</p>
            <p className="text-xs text-neutral-500">Descartadas</p>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-pink-400">{stats.favorited}</p>
            <p className="text-xs text-neutral-500">Favoritas</p>
          </div>
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-neutral-400">{stats.total}</p>
            <p className="text-xs text-neutral-500">Total</p>
          </div>
        </div>
        <EmptyState
          title="Deck esvaziado!"
          description="Todas as ofertas foram analisadas. Volte para Minhas Ofertas para ver as salvas."
          icon={<CheckCircle className="h-8 w-8" />}
          action={<button onClick={() => fetchDeck()} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm">Recarregar deck</button>}
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Swipe</h1>
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <button onClick={() => setAutoMode(!autoMode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${autoMode ? 'bg-green-600 text-white' : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'}`}>
            {autoMode ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {autoMode ? 'Pausar' : 'Auto'}
          </button>
          {autoMode && (
            <select value={autoSpeed} onChange={(e) => setAutoSpeed(Number(e.target.value))}
              className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white">
              <option value={1500}>Rápido (1.5s)</option>
              <option value={3000}>Normal (3s)</option>
              <option value={5000}>Lento (5s)</option>
            </select>
          )}
        </div>
        <span className="text-xs text-neutral-500">{deck.length} restantes no deck</span>
      </div>
      <div className="max-w-lg mx-auto">
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-16 h-16 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0 text-neutral-500 font-bold">
              {currentAd.adLibraryId?.slice(0, 2).toUpperCase() ?? '—'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{currentAd.pageName ?? 'Sem nome'}</p>
              <p className="text-xs text-neutral-500 mt-1">{currentAd.destinationDomain ?? '—'} · {currentAd.runningDays ?? 0} dias</p>
              {currentAd.headline && <p className="text-sm text-neutral-300 mt-2 line-clamp-2">{currentAd.headline}</p>}
              {currentAd.score != null && (
                <p className="text-xs text-brand-400 mt-2 flex items-center gap-1"><Star className="h-3 w-3" /> Score: {currentAd.score}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <button onClick={() => handleDecision(currentAd.savedAdId, 'discard')}
            className="px-8 py-3 bg-neutral-800 text-neutral-300 rounded-xl font-medium hover:bg-neutral-700 transition-colors flex items-center gap-2">
            <X className="h-5 w-5" /> Descartar
          </button>
          <button onClick={() => handleDecision(currentAd.savedAdId, 'save')}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
            <Save className="h-5 w-5" /> Salvar
          </button>
          <button onClick={() => handleDecision(currentAd.savedAdId, 'favorite')}
            className="px-8 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors flex items-center gap-2">
            <Heart className="h-5 w-5" /> Favoritar
          </button>
        </div>
        <p className="text-center text-xs text-neutral-500 mt-4">Oferta {stats.total - stats.remaining + 1} de {stats.total}</p>
      </div>
    </div>
  );
}

function TranscricaoPage() {
  const [transcripts, setTranscripts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [transcribing, setTranscribing] = useState(false);
  const [configured, setConfigured] = useState(true);

  useEffect(() => { fetchTranscripts(); }, []);

  async function fetchTranscripts() {
    try {
      const res = await fetch('/api/media/transcripts', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setTranscripts(json.data ?? []);
        if (json.configured === false) setConfigured(false);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleTranscribe() {
    setTranscribing(true);
    try {
      const res = await fetch('/api/media/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceType: 'upload' }),
      });
      const json = await res.json();
      if (json.configured === false) setConfigured(false);
      fetchTranscripts();
    } catch { /* ignore */ }
    setTranscribing(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Transcrição de Mídias</h1>

      {!configured ? (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <p className="text-lg font-semibold text-white mb-2">Serviço de transcrição não configurado</p>
            <p className="text-sm text-neutral-400 max-w-md mx-auto mb-6">
              Configure uma das variáveis de ambiente para ativar a transcrição de áudio/vídeo.
            </p>
            <div className="bg-neutral-900 rounded-xl p-4 max-w-md mx-auto text-left space-y-2">
              <p className="text-xs text-neutral-500 font-medium">Opções de configuração:</p>
              <code className="text-xs text-brand-400 block">TRANSCRIBE_API_URL=https://seu-servico-stt.com/transcribe</code>
              <code className="text-xs text-brand-400 block">TRANSCRIBE_API_KEY=sua-chave</code>
              <p className="text-xs text-neutral-500 mt-2">Ou use a API OpenAI:</p>
              <code className="text-xs text-brand-400 block">OPENAI_API_KEY=sk-...</code>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Nova Transcrição</h2>
          <p className="text-sm text-neutral-400 mb-4">Faça upload de um arquivo de áudio ou vídeo (até 500MB) para transcrever.</p>
          <div className="flex gap-3">
            <input type="file" accept="audio/*,video/*" className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-brand-600 file:text-white file:text-sm file:cursor-pointer" />
            <button onClick={handleTranscribe} disabled={transcribing}
              className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2">
              {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Transcrever
            </button>
          </div>
        </div>
      )}

      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Transcrições Anteriores</h2>
        {loading ? <LoadingState /> : transcripts.length === 0 ? (
          <EmptyState title="Nenhuma transcrição" description="Faça upload de um áudio ou vídeo para transcrever." icon={<Music className="h-8 w-8" />} />
        ) : (
          <div className="space-y-2">
            {transcripts.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between bg-neutral-900 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm text-white font-medium">{t.fileName ?? `Transcrição ${t.id.slice(0, 8)}`}</p>
                  <p className="text-xs text-neutral-500">{t.language} · {t.segmentsCount} segmentos · {t.status}</p>
                </div>
                <StatusBadge status={t.status === 'done' ? 'completed' : t.status === 'error' ? 'failed' : t.status === 'transcribing' ? 'running' : 'pending'} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AnaliseTrafegoPage({ ofertas }: { ofertas: SavedAdItem[] }) {
  const [domain, setDomain] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const domainCounts = useMemo(() => {
    const counts: Record<string, { count: number; activeCount: number; platforms: Set<string>; mediaTypes: Set<string>; ctas: Set<string>; firstSeen: string; lastSeen: string }> = {};
    ofertas.forEach((ad) => {
      if (!ad.destinationDomain) return;
      const d = ad.destinationDomain;
      if (!counts[d]) counts[d] = { count: 0, activeCount: 0, platforms: new Set(), mediaTypes: new Set(), ctas: new Set(), firstSeen: ad.savedAt, lastSeen: ad.savedAt };
      const entry = counts[d];
      entry.count++;
      if (ad.status === 'active') entry.activeCount++;
      (ad.platforms ?? []).forEach((p: string) => entry.platforms.add(p));
      if (ad.mediaType) entry.mediaTypes.add(ad.mediaType);
      if (ad.cta) entry.ctas.add(ad.cta);
    });
    return Object.entries(counts).sort(([, a], [, b]) => b.count - a.count);
  }, [ofertas]);

  async function handleAnalyze() {
    if (!domain.trim()) return;
    setAnalyzing(true);
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const found = domainCounts.find(([d]) => d.includes(cleanDomain));
    setAnalysisResult(found ? { domain: found[0], ...found[1], platforms: [...found[1].platforms], mediaTypes: [...found[1].mediaTypes], ctas: [...found[1].ctas] } : null);
    setAnalyzing(false);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Análise de Tráfego</h1>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Analisar Domínio</h2>
        <div className="flex gap-3">
          <input type="text" value={domain} onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            placeholder="exemplo.com.br" className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none" />
          <button onClick={handleAnalyze} disabled={analyzing || !domain.trim()}
            className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors flex items-center gap-2 disabled:opacity-50">
            <Globe className="h-4 w-4" /> Analisar
          </button>
        </div>
      </div>

      {analysisResult && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-5 w-5 text-brand-400" />
            <h2 className="text-lg font-semibold text-white">Dado Observado: {analysisResult.domain}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-neutral-900 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-white">{analysisResult.count}</p>
              <p className="text-xs text-neutral-500">Anúncios totais</p>
            </div>
            <div className="bg-neutral-900 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-green-400">{analysisResult.activeCount}</p>
              <p className="text-xs text-neutral-500">Ativos agora</p>
            </div>
            <div className="bg-neutral-900 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-white">{analysisResult.platforms.length}</p>
              <p className="text-xs text-neutral-500">Plataformas</p>
            </div>
            <div className="bg-neutral-900 rounded-lg p-3 text-center">
              <p className="text-xl font-bold text-white">{analysisResult.mediaTypes.length}</p>
              <p className="text-xs text-neutral-500">Tipos de mídia</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {analysisResult.platforms.length > 0 && <p className="text-neutral-400"><strong className="text-neutral-300">Plataformas:</strong> {analysisResult.platforms.join(', ')}</p>}
            {analysisResult.mediaTypes.length > 0 && <p className="text-neutral-400"><strong className="text-neutral-300">Mídias:</strong> {analysisResult.mediaTypes.join(', ')}</p>}
            {analysisResult.ctas.length > 0 && <p className="text-neutral-400"><strong className="text-neutral-300">CTAs:</strong> {analysisResult.ctas.join(', ')}</p>}
          </div>
        </div>
      )}

      {!analysisResult && domain && !analyzing && (
        <div className="bg-neutral-950 border border-yellow-900/50 rounded-2xl p-6 mb-6 text-center">
          <p className="text-sm text-yellow-400">Domínio "{domain}" não encontrado nas ofertas salvas.</p>
          <p className="text-xs text-neutral-500 mt-1">Salve ofertas que apontam para este domínio para ver dados observáveis.</p>
        </div>
      )}

      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Domínios Mais Frequentes</h2>
        {domainCounts.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum domínio encontrado nas ofertas salvas.</p>
        ) : (
          <div className="space-y-2">
            {domainCounts.slice(0, 15).map(([d, info]) => (
              <div key={d} className="flex items-center justify-between bg-neutral-900 rounded-lg px-4 py-2 cursor-pointer hover:bg-neutral-800 transition-colors" onClick={() => { setDomain(d); }}>
                <div>
                  <span className="text-sm text-white font-mono">{d}</span>
                  <span className="text-xs text-neutral-500 ml-2">{info.activeCount} ativos</span>
                </div>
                <span className="text-xs text-brand-400 font-bold">{info.count} anúncios</span>
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
  const [mode, setMode] = useState('sales');
  const [cloning, setCloning] = useState(false);
  const [clonedPages, setClonedPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchCloned(); }, []);

  async function fetchCloned() {
    try {
      const res = await fetch('/api/clone', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setClonedPages(json.data ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  async function handleClone() {
    if (!url.trim()) return;
    setCloning(true);
    try {
      await fetch('/api/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceUrl: url.trim(), mode }),
      });
      setUrl('');
      fetchCloned();
    } catch { /* ignore */ }
    setCloning(false);
  }

  async function handleExport(id: string) {
    try {
      const res = await fetch(`/api/clone/${id}/export`, { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        const blob = new Blob([json.data.html], { type: 'text/html' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = json.data.filename;
        a.click();
      }
    } catch { /* ignore */ }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">Clonar Páginas</h1>
      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Capturar Página</h2>
        <p className="text-xs text-neutral-500 mb-3">A página será capturada e sanitizada (pixels e rastreadores removidos).</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://exemplo.com/pagina"
            className="md:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none" />
          <select value={mode} onChange={(e) => setMode(e.target.value)}
            className="bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-white">
            <option value="sales">Página de vendas</option>
            <option value="quiz">Quiz / Funil</option>
          </select>
          <button onClick={handleClone} disabled={cloning || !url.trim()}
            className="px-6 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
            {cloning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            Capturar
          </button>
        </div>
        <div className="bg-yellow-950/30 border border-yellow-900/50 rounded-lg p-3 mt-3">
          <p className="text-xs text-yellow-400">Aviso: pixels e rastreadores do proprietário original são removidos. Revise o conteúdo antes de utilizar.</p>
        </div>
      </div>

      <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Páginas Capturadas</h2>
        {loading ? <LoadingState /> : clonedPages.length === 0 ? (
          <EmptyState title="Nenhuma página capturada" description="Cole uma URL acima e clique em Capturar." icon={<Copy className="h-8 w-8" />} />
        ) : (
          <div className="space-y-3">
            {clonedPages.map((page: any) => (
              <div key={page.id} className="flex items-center justify-between bg-neutral-900 rounded-lg px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{page.title ?? page.sourceUrl}</p>
                  <p className="text-xs text-neutral-500">{page.mode === 'sales' ? 'Vendas' : 'Quiz'} · {page.status} · {new Date(page.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <button onClick={() => handleExport(page.id)} className="px-3 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors flex items-center gap-1">
                  <Download className="h-3 w-3" /> Exportar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ExtensaoPage({ health }: { health: any }) {
  const [pairingToken, setPairingToken] = useState<string | null>(null);
  const [pairing, setPairing] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => { fetchSessions(); }, []);

  async function fetchSessions() {
    try {
      const res = await fetch('/api/extension/sessions', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        setSessions(json.data ?? []);
      }
    } catch { /* ignore */ }
  }

  async function handlePair() {
    setPairing(true);
    try {
      const res = await fetch('/api/extension/pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: 'chrome' }),
      });
      if (res.ok) {
        const json = await res.json();
        setPairingToken(json.data.token);
        fetchSessions();
      }
    } catch { /* ignore */ }
    setPairing(false);
  }

  async function handleRevokeSession(id: string) {
    try {
      await fetch(`/api/extension/sessions/${id}`, { method: 'DELETE' });
      fetchSessions();
    } catch { /* ignore */ }
  }

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
          <div className="space-y-3 mb-6">
            <div className="flex items-center justify-between bg-neutral-900 rounded-lg p-3">
              <span className="text-sm text-neutral-300">Versão</span>
              <span className="text-xs text-brand-400 font-mono">v1.0.0</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-900 rounded-lg p-3">
              <span className="text-sm text-neutral-300">Manifest</span>
              <span className="text-xs text-brand-400">V3</span>
            </div>
            <div className="flex items-center justify-between bg-neutral-900 rounded-lg p-3">
              <span className="text-sm text-neutral-300">Detecção</span>
              <span className="text-xs text-brand-400">MutationObserver + 4 camadas</span>
            </div>
          </div>

          <h3 className="text-sm font-semibold text-white mb-3">Pareamento</h3>
          {!pairingToken ? (
            <button onClick={handlePair} disabled={pairing}
              className="w-full px-4 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
              {pairing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Puzzle className="h-4 w-4" />}
              Gerar Token de Pareamento
            </button>
          ) : (
            <div className="bg-neutral-900 rounded-xl p-4">
              <p className="text-xs text-neutral-500 mb-2">Token (copie e cole na extensão):</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-brand-400 flex-1 break-all">{pairingToken}</code>
                <button onClick={() => navigator.clipboard.writeText(pairingToken)} className="p-2 text-neutral-500 hover:text-white transition-colors" title="Copiar">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {sessions.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold text-neutral-400 mb-2">Sessões Ativas</h4>
              {sessions.map((s: any) => (
                <div key={s.id} className="flex items-center justify-between bg-neutral-900 rounded-lg px-3 py-2 mb-1">
                  <span className="text-xs text-neutral-300">{s.device} · {new Date(s.createdAt).toLocaleDateString('pt-BR')}</span>
                  <button onClick={() => handleRevokeSession(s.id)} className="text-xs text-red-400 hover:text-red-300">Revogar</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Como Instalar</h2>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Baixe a extensão', desc: 'Faça download do pacote da extensão' },
              { step: 2, title: 'Abra chrome://extensions', desc: 'Ative o "Modo do desenvolvedor"' },
              { step: 3, title: 'Carregue descompactada', desc: 'Clique em "Carregar extensão descompactada"' },
              { step: 4, title: 'Configure o token', desc: 'Cole o token de pareamento na extensão' },
              { step: 5, title: 'Acesse a Meta Ads Library', desc: 'A extensão ativa automaticamente na página' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center shrink-0 text-white text-xs font-bold">{step}</div>
                <div>
                  <p className="text-sm text-white font-medium">{title}</p>
                  <p className="text-xs text-neutral-500">{desc}</p>
                </div>
              </div>
            ))}
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
  const { items: offers, total: offersTotal, loading: offersLoading, error: offersError, page: offersPage, setPage: setOffersPage } = useOffers();
  const { jobs, loading: jobsLoading, createJob, runJob } = useMiningJobs();
  const { events, loading: trackingLoading } = useTrackingEvents();
  const { history, loading: historyLoading, addSearch } = useSearchHistory();

  const [pathname, setPathname] = useState(window.location.pathname);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [openEbookId, setOpenEbookId] = useState<string | null>(null);
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
    if (isActive(PATHS.OFERTAS_MINERADAS)) return <OfertasMineradasPage offers={offers} loading={offersLoading} error={offersError} total={offersTotal} page={offersPage} setPage={setOffersPage} />;
    if (isActive(PATHS.MINHAS_OFERTAS)) return <MinhasOfertasPage ofertas={ofertas} loading={ofertasLoading} error={ofertasError} totalOfertas={totalOfertas} page={page} setPage={setPage} handleToggleFavorite={handleToggleFavorite} />;
    if (isActive(PATHS.FAVORITOS)) return <FavoritosPage ofertas={ofertas} loading={ofertasLoading} />;
    if (isActive(PATHS.SWIPE)) return <SwipePage ofertas={ofertas} loading={ofertasLoading} />;
    if (isActive(PATHS.TRANSCRICAO)) return <TranscricaoPage />;
    if (isActive(PATHS.ANALISE_TRAFEGO)) return <AnaliseTrafegoPage ofertas={ofertas} />;
    if (isActive(PATHS.CLONAR_PAGINAS)) return <ClonarPaginasPage />;
    if (isActive(PATHS.EXTENSAO)) return <ExtensaoPage health={health} />;
    if (isActive(PATHS.AJUDA)) return <AjudaPage />;
    if (isActive(PATHS.EBOOKS)) {
      if (openEbookId) {
        return <EbookEditor ebookId={openEbookId} onBack={() => setOpenEbookId(null)} />;
      }
      return <EbookListPage onOpen={(id) => setOpenEbookId(id)} />;
    }
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
