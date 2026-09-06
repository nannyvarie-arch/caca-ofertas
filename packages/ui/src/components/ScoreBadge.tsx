import { Star } from 'lucide-react';
import { cn } from '@caca-oferta/utils';

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null || score === 0) return null;
  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-semibold',
      score >= 70 ? 'text-brand-400' : score >= 40 ? 'text-yellow-400' : 'text-neutral-400'
    )}>
      <Star className="h-3 w-3" /> {score}
    </span>
  );
}
