// CAÇAOFERTA — Toast reutilizável para UIs isoladas em Shadow DOM (FASE 05).
// Cada componente de interface (sidebar, painel, badge) chama attachToast no
// seu próprio shadow root: o elemento é criado com classe .co-toast (hook dos
// testes) e estilos inline para não depender de folha externa. Nunca exibe
// mensagens falsas: o chamador fornece o texto real da ação/erro.

const TOAST_STYLE: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  bottom: '18px',
  left: '50%',
  transform: 'translateX(-50%)',
  background: '#18181b',
  color: '#f4f4f5',
  border: '1px solid #ea580c',
  padding: '6px 10px',
  borderRadius: '6px',
  fontSize: '11px',
  zIndex: '2147483647',
  boxShadow: '0 2px 12px rgba(0, 0, 0, 0.5)',
  pointerEvents: 'none',
};

export interface Toast {
  show(message: string): void;
  destroy(): void;
}

export function attachToast(root: ShadowRoot, durationMs = 2500): Toast {
  let el: HTMLDivElement | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    show(message: string): void {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (!el) {
        el = document.createElement('div');
        el.className = 'co-toast';
        el.setAttribute('aria-live', 'polite');
        Object.assign(el.style, TOAST_STYLE);
        root.append(el);
      }
      el.textContent = message;
      timer = setTimeout(() => {
        el?.remove();
        el = null;
        timer = null;
      }, durationMs);
    },
    destroy(): void {
      if (timer) clearTimeout(timer);
      timer = null;
      el?.remove();
      el = null;
    },
  };
}