import { Target } from 'lucide-react';
import { APP_BRAND, APP_TAGLINE } from '@caca-oferta/shared';
import { cn } from '@caca-oferta/utils';

export interface BrandHeaderProps {
  compact?: boolean;
  className?: string;
}

export function BrandHeader({ compact = false, className }: BrandHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3 text-white', className)}>
      <span
        className={cn(
          'grid shrink-0 place-items-center rounded-xl bg-brand-600 shadow-lg shadow-brand-600/20',
          compact ? 'h-8 w-8' : 'h-10 w-10',
        )}
      >
        <Target className={cn('text-white', compact ? 'h-4 w-4' : 'h-5 w-5')} aria-hidden="true" />
      </span>
      <div className="leading-tight">
        <p className={cn('font-extrabold tracking-wide', compact ? 'text-sm' : 'text-lg')}>{APP_BRAND}</p>
        {!compact && <p className="text-[11px] text-neutral-400">{APP_TAGLINE}</p>}
      </div>
    </div>
  );
}