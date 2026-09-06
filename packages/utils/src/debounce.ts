export interface DebouncedFn<A extends unknown[]> {
  (...args: A): void;
  cancel(): void;
}

/**
 * Cria uma função com debounce. Usado futuramente na detecção
 * incremental de anúncios (scroll/filtros) da Biblioteca de Anúncios.
 */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, waitMs: number): DebouncedFn<A> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const debounced = (...args: A): void => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, waitMs);
  };

  debounced.cancel = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };

  return debounced;
}