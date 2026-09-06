import { Loader2 } from 'lucide-react';

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-8 w-8 text-brand-500 animate-spin" />
    </div>
  );
}
