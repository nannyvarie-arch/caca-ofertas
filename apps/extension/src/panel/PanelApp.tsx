import { Eye, Radar, Route } from 'lucide-react';
import { BrandHeader } from '@caca-oferta/ui';
import { APP_VERSION } from '@caca-oferta/shared';

const NEXT_STEPS = [
  { icon: Radar, title: 'FASE 03 — Detecção', description: 'MutationObserver + processamento incremental de anúncios.' },
  { icon: Eye, title: 'FASE 04 — Parser', description: 'MetaAdsLibraryAdapter extraindo dados das páginas.' },
  { icon: Route, title: 'FASE 06 — Domínio', description: 'Identificação, normalização e pesquisa por domínio.' },
];

export default function PanelApp() {
  return (
    <div className="flex min-h-screen flex-col gap-5 bg-neutral-950 p-5 text-neutral-200">
      <BrandHeader />

      <section>
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">Side Panel</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Camada CaçaOferta sobre a Biblioteca de Anúncios da Meta.
        </p>
      </section>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <p className="text-sm font-semibold text-white">FASE 01 — Fundação concluída.</p>
        <p className="mt-1 text-sm text-neutral-400">
          A detecção e extração de anúncios será adicionada nas próximas fases.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {NEXT_STEPS.map((step) => (
          <li
            key={step.title}
            className="flex items-start gap-3 rounded-lg border border-neutral-900 bg-neutral-950 p-3"
          >
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-600/15 text-brand-500">
              <step.icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{step.title}</p>
              <p className="text-xs text-neutral-500">{step.description}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-auto pt-4 text-[11px] text-neutral-600">FASE 01 · build {APP_VERSION}</p>
    </div>
  );
}