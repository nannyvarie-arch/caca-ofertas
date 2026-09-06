import { cn } from '@caca-oferta/utils';

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-status-active/10 text-status-active border-status-active/30',
  inactive: 'bg-red-500/10 text-red-400 border-red-400/30',
  unknown: 'bg-neutral-800 text-neutral-400 border-neutral-700',
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  const label = status === 'active' ? 'Ativo' : status === 'inactive' ? 'Encerrado' : 'Desconhecido';
  return (
    <span className={cn(
      'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
      STATUS_STYLES[status ?? 'unknown'] ?? STATUS_STYLES.unknown
    )}>
      {label}
    </span>
  );
}
