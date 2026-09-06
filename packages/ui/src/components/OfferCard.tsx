import { StatusBadge } from './StatusBadge';
import { ScoreBadge } from './ScoreBadge';
import { TagBadge } from './TagBadge';

export function OfferCard({ ad }: { ad: { id: string; pageName: string | null; adLibraryId: string; status: string; destinationDomain: string | null; platforms: string[]; mediaType: string; runningDays: number | null; cta: string | null; score: number | null; classification: number | null; tags: string[] } }) {
  const mediaTypeLabels: Record<string, string> = {
    image: 'Imagem', video: 'Vídeo', carousel: 'Carrossel', unknown: 'Desconhecido',
  };
  const platformLabels = (ad.platforms ?? []).map((p: string) => p.charAt(0).toUpperCase() + p.slice(1));

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-5 hover:border-neutral-700 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center shrink-0 text-neutral-500 font-bold text-sm group-hover:bg-neutral-700 transition-colors">
          {ad.adLibraryId ? ad.adLibraryId.slice(0, 2).toUpperCase() : '—'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold text-white truncate">{ad.pageName ?? ad.adLibraryId ?? 'Sem nome'}</p>
            <StatusBadge status={ad.status} />
          </div>
          <p className="text-xs text-neutral-500 mb-2">
            {ad.destinationDomain ?? '—'} · {platformLabels.join(', ')} · {mediaTypeLabels[ad.mediaType ?? 'unknown']}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-neutral-400">
            {ad.runningDays != null && <span>{ad.runningDays} dias</span>}
            {ad.cta && <span>{ad.cta}</span>}
            <ScoreBadge score={ad.score} />
            {ad.classification != null && ad.classification > 0 && (
              <span className="text-yellow-400">{'★'.repeat(ad.classification)}{'☆'.repeat(5 - ad.classification)}</span>
            )}
          </div>
          {ad.tags && ad.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {ad.tags.map((tag: string) => <TagBadge key={tag} name={tag} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
