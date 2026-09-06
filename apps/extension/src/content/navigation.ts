// CAÇAOFERTA — Observação de navegação SPA (a Meta troca conteúdo sem reload).
// Intercepta pushState/replaceState e escuta popstate/hashchange. Sem
// setInterval agressivo: a comparação de URL também roda no scan com debounce.

export type NavigationListener = (url: string) => void;

export function getCurrentUrl(): string {
  return typeof window !== 'undefined' ? window.location.href : '';
}

/** Instala a observação de navegação. Retorna função de cleanup. */
export function observeSpaNavigation(listener: NavigationListener): () => void {
  const change = (): void => listener(getCurrentUrl());

  const originalPushState = window.history.pushState.bind(window.history);
  const originalReplaceState = window.history.replaceState.bind(window.history);

  window.history.pushState = (data, _unusedTitle, url) => {
    const result = originalPushState(data, _unusedTitle, url);
    change();
    return result;
  };

  window.history.replaceState = (data, _unusedTitle, url) => {
    const result = originalReplaceState(data, _unusedTitle, url);
    change();
    return result;
  };

  window.addEventListener('popstate', change);
  window.addEventListener('hashchange', change);

  return () => {
    window.history.pushState = originalPushState;
    window.history.replaceState = originalReplaceState;
    window.removeEventListener('popstate', change);
    window.removeEventListener('hashchange', change);
  };
}