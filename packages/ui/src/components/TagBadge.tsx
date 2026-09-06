import { cn } from '@caca-oferta/utils';

export function TagBadge({ name, color }: { name: string; color?: string }) {
  return (
    <span className={cn(
      'text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded border border-neutral-700',
      color && 'border-current'
    )} style={color ? { color } : undefined}>
      {name}
    </span>
  );
}
