import { useCallback, useEffect, useState } from 'react';
import { BrandHeader } from '@caca-oferta/ui';
import type { SavedAdDto, SavedAdListDto } from '@caca-oferta/shared';
import type { NormalizedPlatform } from '@caca-oferta/types';
import { sendRuntimeRequest } from '../bridge/runtimeClient';
import { RUNTIME_ERROR_CODES, RuntimeMessageType } from '../bridge/messages';

type ViewState =
  | { status: 'loading' }
  | { status: 'error'; message: string; okToRetry: boolean }
  | { status: 'ready'; items: SavedAdDto[]; total: number };

const PLATFORM_LABELS: Record<NormalizedPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  messenger: 'Messenger',
  'audience-network': 'Audience',
};

function platformLabelOf(saved: SavedAdDto): string | null {
  const first = saved.platforms?.[0];
  return first ? PLATFORM_LABELS[first as NormalizedPlatform] ?? first : null;
}

function savedAtBr(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PopupApp() {
  const [view, setView] = useState<ViewState>({ status: 'loading' });

  const load = useCallback(async () => {
    setView({ status: 'loading' });
    const result = await sendRuntimeRequest<SavedAdListDto>({
      type: RuntimeMessageType.ListSavedAds,
      page: 1,
      pageSize: 50,
    });
    if (result.ok) {
      setView({ status: 'ready', items: result.data.items, total: result.data.total });
      return;
    }
    setView({
      status: 'error',
      message: result.message || 'Não foi possível carregar suas ofertas.',
      okToRetry: result.code !== RUNTIME_ERROR_CODES.CONTEXT_UNAVAILABLE,
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const removeSaved = useCallback(
    async (id: string) => {
      const result = await sendRuntimeRequest({ type: RuntimeMessageType.DeleteSavedAd, id });
      if (result.ok) void load();
    },
    [load],
  );

  return (
    <div className="flex min-h-[360px] w-[340px] flex-col gap-4 bg-neutral-950 p-4 text-neutral-200">
      <BrandHeader compact />

      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-neutral-500">Ofertas salvas</span>
        <button
          type="button"
          onClick={() => void load()}
          className="ml-auto rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800"
        >
          ↻ Atualizar
        </button>
      </div>

      {view.status === 'loading' && <p className="text-sm text-neutral-400">Carregando suas ofertas…</p>}

      {view.status === 'error' && (
        <div className="flex flex-col gap-2 rounded-lg border border-red-900/50 bg-red-950/20 px-3 py-2.5">
          <p className="text-sm text-red-300">{view.message}</p>
          {view.okToRetry && (
            <button
              type="button"
              onClick={() => void load()}
              className="self-start rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-300 hover:bg-neutral-800"
            >
              ↻ Tentar novamente
            </button>
          )}
        </div>
      )}

      {view.status === 'ready' && view.total === 0 && (
        <p className="text-sm text-neutral-500">
          Nenhuma oferta salva ainda. Salve anúncios pelo botão "+ Salvar oferta" na Biblioteca.
        </p>
      )}

      {view.status === 'ready' && view.total > 0 && (
        <ul className="flex flex-col gap-2">
          {view.items.map((saved) => (
            <li key={saved.id} className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2">
              <div className="text-sm font-medium text-white">{saved.pageName || saved.adLibraryId}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-neutral-500">
                <span>ID {saved.adLibraryId}</span>
                {platformLabelOf(saved) && <span>{platformLabelOf(saved)}</span>}
                <span>Salvo em {savedAtBr(saved.savedAt)}</span>
              </div>
              <div className="mt-2 flex gap-2">
                {saved.adSnapshotUrl && (
                  <a
                    href={saved.adSnapshotUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1 text-[11px] text-neutral-200 hover:bg-neutral-700"
                  >
                    Abrir anúncio
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => void removeSaved(saved.id)}
                  className="rounded-md border border-red-900/60 bg-red-950/40 px-2 py-1 text-[11px] text-red-200 hover:bg-red-950/70"
                >
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}