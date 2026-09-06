import { Search } from 'lucide-react';
import { BrandHeader } from '@caca-oferta/ui';
import { useHealth, type HealthState } from './hooks/useHealth';
import { useEffect, useState } from 'react';

function ApiStatusPill({ health }: { health: HealthState }) {
  if (health.status === 'checking') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-400">
        <span className="h-2 w-2 rounded-full bg-neutral-500" />
        Verificando API…
      </span>
    );
  }
  if (health.status === 'online') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-status-active/30 bg-status-active/10 px-3 py-1 text-xs text-status-active">
        <span className="h-2 w-2 rounded-full bg-status-active" />
        API online — {health.service}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-status-inactive/30 bg-status-inactive/10 px-3 py-1 text-xs text-status-inactive">
      <span className="h-2 w-2 rounded-full bg-status-inactive" />
      API offline — suba com pnpm dev:api
    </span>
  );
}

const PATHS = {
  DASHBOARD: '/dashboard',
  MINHAS_OFERTAS: '/minhas-ofertas',
  PESQUISA: '/pesquisa',
};

function useDashboardSummary() {
  const [data, setData] = useState<any>(null);
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
        const ativas = ads.filter((a: any) => a.status === 'active').length;
        const inativas = ads.filter((a: any) => a.status === 'inactive').length;
        const desconhecidas = ads.filter((a: any) => a.status === 'unknown').length;
        const totalCreativos = ads.reduce((sum: number, a: any) => sum + (a.runningDays != null ? 1 : 0), 0);
        const domniosUnicos = ads
        .map((a: any) => a.destinationDomain ?? '')
        .filter((d: any) => d.length > 0)
        .reduce((unique: any[], d: any) => {
          if (!unique.includes(d)) unique.push(d);
          return unique;
        }, []).length;
        const mediaDias = totalOfertas > 0
          ? ads.reduce((sum: number, a: any) => sum + (a.runningDays ?? 0), 0) / totalOfertas
          : 0;

        // FASE 11 — Novos indicadores
        const ofertasComScore = ads.filter((a: any) => a.score != null);
        const mediaScore = ofertasComScore.length > 0
          ? ofertasComScore.reduce((sum: number, a: any) => sum + (a.score ?? 0), 0) / ofertasComScore.length
          : 0;
        
        const ofertasComClassificacao = ads.filter((a: any) => a.classification != null && a.classification > 0);
        const mediaClassificacao = ofertasComClassificacao.length > 0
          ? ofertasComClassificacao.reduce((sum: number, a: any) => sum + (a.classification ?? 0), 0) / ofertasComClassificacao.length
          : 0;
        
        // Distribuição de classificações (1-5)
        const distClassificacao = [1, 2, 3, 4, 5].map(star => ({
          star,
          count: ads.filter((a: any) => a.classification === star).length
        }));
        
        // Top 5 domínios por contagem de ofertas
        const domainCounts = ads
          .filter((a: any) => a.destinationDomain)
          .reduce((acc: Record<string, number>, a: any) => {
            acc[a.destinationDomain!] = (acc[a.destinationDomain!] || 0) + 1;
            return acc;
          }, {});
        const topDomains = Object.entries(domainCounts as Record<string, number>)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([domain, count]) => ({ domain, count }));

        setData({
          totalOfertas,
          ativas,
          inativas,
          desconhecidas,
          totalCreativos,
          domniosUnicos,
          mediaDias: Number(mediaDias.toFixed(1)),
          // FASE 11
          mediaScore: Number(mediaScore.toFixed(1)),
          mediaClassificacao: Number(mediaClassificacao.toFixed(1)),
          distClassificacao,
          topDomains,
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

function useSavedAds(filters?: any) {
  const [ads, setAds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function fetchAds() {
      try {
        const params = new URLSearchParams();
        if (filters) {
          if (filters.status) params.append('status', filters.status);
          if (filters.platform) params.append('platform', filters.platform);
          if (filters.mediaType) params.append('mediaType', filters.mediaType);
          if (filters.cta) params.append('cta', filters.cta);
          if (filters.domain) params.append('domain', filters.domain);
          if (filters.startDateFrom) params.append('startDateFrom', filters.startDateFrom);
          if (filters.startDateTo) params.append('startDateTo', filters.startDateTo);
          if (filters.runningDaysMin != null) params.append('runningDaysMin', String(filters.runningDaysMin));
          if (filters.runningDaysMax != null) params.append('runningDaysMax', String(filters.runningDaysMax));
          if (filters.pageName) params.append('pageName', filters.pageName);
        }
        params.append('page', String(page));
        params.append('pageSize', String(pageSize));

        const res = await fetch(`/api/saved-ads?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error('API error');
        const data = await res.json();

        setAds(data.data?.items ?? []);
        setTotal(data.data?.total ?? 0);
        setPage(data.data?.page ?? page);
        setPageSize(data.data?.pageSize ?? pageSize);
      } catch (e: any) {
        setError(e.message ?? 'Erro ao carregar ofertas');
      } finally {
        setLoading(false);
      }
    }

    fetchAds();
    const refetchId = setInterval(fetchAds, 60_000);
    return () => clearInterval(refetchId);
  }, [page, pageSize, JSON.stringify(filters)]);

  return { ads, loading, error, page, setPage, pageSize, setPageSize, total };
}

function IndicatorCard({ title, value, description }: { title: string; value: any; description: string }) {
  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-extrabold text-white">{value}</p>
        </div>
        <small className="text-neutral-400">{description}</small>
      </div>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-12 text-neutral-500">
      <p className="text-2xl font-medium">{title}</p>
      <p className="text-neutral-400">{description}</p>
    </div>
  );
}

function OfferRow({ ad }: { ad: any }) {
  const mediaTypeLabels: Record<string, string> = {
    image: 'Imagem',
    video: 'Vídeo',
    carousel: 'Carrossel',
    unknown: 'Desconhecido',
  };
  const platformLabels = (ad.platforms ?? []).map((p: string) => p.charAt(0).toUpperCase() + p.slice(1));

  return (
    <div className="border rounded-lg p-4 hover:bg-neutral-900 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded bg-neutral-800 flex items-center justify-center shrink-0">
          {ad.adLibraryId ? ad.adLibraryId.slice(0, 2) : '—'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{ad.pageName ?? ad.adLibraryId ?? 'Sem nome'}</p>
          <p className="text-xs text-neutral-400">
            Domínio: {ad.destinationDomain ?? '—'} | {platformLabels.join(', ')} | {mediaTypeLabels[ad.mediaType ?? 'unknown']}
          </p>
          <p className="text-xs text-neutral-400">
            {ad.runningDays != null ? `${ad.runningDays} dias rodando` : 'Sem data'} | {ad.cta ?? '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const health = useHealth();
  const { data: summary, loading: summaryLoading, error: summaryError } = useDashboardSummary();
  const { ads: ofertas, loading: ofertasLoading, error: ofertasError, total: totalOfertas } = useSavedAds();

  const pathname = window.location.pathname;
  const isDashboard = pathname === PATHS.DASHBOARD || pathname === '';
  const isMinhasOfertas = pathname === PATHS.MINHAS_OFERTAS;
  const isPesquisa = pathname === PATHS.PESQUISA;

  // Determine page content
  let dashboardContent = null;
  let ofertasContent = null;
  let pesquisaContent = null;

  if (isDashboard) {
    if (summaryLoading) {
      dashboardContent = <div className="alert">Carregando resumo…</div>;
    } else if (summaryError) {
      dashboardContent = <div className="alert alert-error"><p>Erro: {summaryError}</p></div>;
    } else if (!summary) {
      dashboardContent = <EmptyState title="Sem dados" description="Conecte a API ou salve ofertas." />;
    } else {
      dashboardContent = (
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <IndicatorCard title="Ofertas salvas" value={summary.totalOfertas} description="Total ofertas salvas" />
            <IndicatorCard title="Ativas" value={summary.ativas} description="Com status ativo" />
            <IndicatorCard title="Inativas" value={summary.inativas} description="Com status encerrado" />
            <IndicatorCard title="Criativos" value={summary.totalCreativos} description="Ofertas com criativos" />
            <IndicatorCard title="Domínios" value={summary.domniosUnicos} description="Domínios diferentes" />
            <IndicatorCard title="Média dias rodando" value={summary.mediaDias} description="Média por oferta" />
            {/* FASE 11 — Novos indicadores */}
            <IndicatorCard title="Score médio" value={summary.mediaScore ?? '—'} description="Oportunidade (0-100)" />
            <IndicatorCard title="Classificação média" value={summary.mediaClassificacao ?? '—'} description="De 1 a 5 estrelas" />
          </div>
          
          {/* FASE 11 — Distribuição de classificações e Top domínios */}
          {totalOfertas > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Distribuição de Classificações</h3>
                <div className="space-y-3">
                  {summary.distClassificacao?.map((item: any) => (
                    <div key={item.star} className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: item.star }, (_, i) => (
                          <svg key={i} className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                        ))}
                      </div>
                      <div className="flex-1 bg-neutral-800 rounded h-6">
                        <div 
                          className="bg-brand-600 h-full rounded" 
                          style={{ width: `${summary.totalOfertas > 0 ? (item.count / summary.totalOfertas) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm text-neutral-400 w-10 text-right">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Top 5 Domínios</h3>
                <div className="space-y-3">
                  {summary.topDomains?.length > 0 ? (
                    summary.topDomains.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm text-neutral-300 truncate max-w-[200px]">{item.domain}</span>
                        <span className="text-sm font-medium text-brand-400">{item.count} ofertas</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-neutral-500 text-sm">Nenhum domínio encontrado</p>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {totalOfertas > 0 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-3">Últimas ofertas salvas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ofertas.map((ad: any, idx: number) => <OfferRow key={idx} ad={ad} />)}
              </div>
            </div>
          )}
        </div>
      );
    }
  }

  if (isMinhasOfertas) {
    if (ofertasLoading) {
      ofertasContent = <div className="alert">Carregando ofertas…</div>;
    } else if (ofertasError) {
      ofertasContent = <div className="alert alert-error"><p>Erro: {ofertasError}</p></div>;
    } else if (totalOfertas === 0) {
      ofertasContent = <EmptyState title="Nenhuma oferta salva" description="Salve ofertas usando o botão ✨ nos anúncios." />;
    } else {
      ofertasContent = (
        <div className="space-y-4">
          {ofertas.map((ad: any, idx: number) => <OfferRow key={idx} ad={ad} />)}
        </div>
      );
    }
  }

  if (isPesquisa) {
    pesquisaContent = (
      <form
        onSubmit={async (e: React.FormEvent) => {
          e.preventDefault();
          const form = e.target as HTMLFormElement;
          const formData = new FormData(form);
          const query = Object.fromEntries(formData.entries()) as Record<string, string>;
          window.location.pathname = PATHS.DASHBOARD;
          window.location.search = new URLSearchParams(query).toString();
        }}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Termo de busca</label>
            <input
              type="text"
              name="q"
              placeholder="Digite um domínio, página ou CTA..."
              required
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white placeholder-neutral-500 focus:ring-2 focus:ring-brand-600 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-300 mb-1">Status</label>
            <select
              name="status"
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white focus:ring-2 focus:ring-brand-600 focus:outline-none">
              <option value="all">Todos</option>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
              <option value="unknown">Desconhecido</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-brand-600 text-white font-medium py-2 rounded hover:bg-brand-700">
            Aplicar filtros
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950">
      <header className="border-b border-neutral-800">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4">
          <BrandHeader />
          <span className="rounded-full border border-brand-600/40 bg-brand-600/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-400">
            FASE 09 · Dashboard
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-12">
        <aside className="w-64 flex-shrink-0 bg-neutral-900 border-r border-neutral-800 flex flex-col">
          <nav className="flex-1 px-4 py-3">
            <a href={PATHS.DASHBOARD} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium">
              <Search className="h-4 w-4 mr-2" aria-hidden="true" /> Dashboard
            </a>
            <a href={PATHS.MINHAS_OFERTAS} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium">Minhas ofertas</a>
            <a href={PATHS.PESQUISA} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium">Pesquisa</a>
          </nav>
        </aside>

        <main className="flex-1 px-6 py-8">
          <header className="mb-8">
            <BrandHeader compact />
            <ApiStatusPill health={health} />
          </header>

          {dashboardContent}

          {isMinhasOfertas && ofertasContent}

          {isPesquisa && pesquisaContent}
        </main>
      </main>

      <footer className="border-t border-neutral-800">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4 text-xs text-neutral-600">
          <span>© 2026 CaçaOferta</span>
          <span>Encontre ofertas. Analise anúncios. Descubra oportunidades.</span>
        </div>
      </footer>
    </div>
  );
}