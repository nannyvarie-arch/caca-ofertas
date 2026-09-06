import { useEffect, useState } from 'react';
import { HealthResponseSchema } from '@caca-oferta/shared';

export type HealthState =
  | { status: 'checking' }
  | { status: 'online'; service: string }
  | { status: 'offline' };

const DEFAULT_HEALTH_URL = '/health';

export function useHealth(): HealthState {
  const [state, setState] = useState<HealthState>({ status: 'checking' });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);

    async function check(): Promise<void> {
      const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '';
      const url = base ? `${base}/health` : DEFAULT_HEALTH_URL;
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: { accept: 'application/json' },
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const json: unknown = await response.json();
        const parsed = HealthResponseSchema.safeParse(json);
        if (!active) return;
        if (parsed.success) {
          setState({ status: 'online', service: parsed.data.service });
        } else {
          setState({ status: 'offline' });
        }
      } catch {
        if (active) {
          setState({ status: 'offline' });
        }
      }
    }

    void check();

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  return state;
}