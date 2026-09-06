// CAÇAOFERTA — Logging (somente em modo de desenvolvimento).
// Logs só são emitidos quando o modo debug está ativado:
//   - localStorage['co.debug'] === '1'
// Nunca logar senhas, tokens, cookies ou dados sensíveis.

const PREFIX = '[CaçaOferta]';
const STORAGE_KEY = 'co.debug';

export function isDebugEnabled(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export interface Logger {
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
}

function createConsoleMethod(method: 'info' | 'warn' | 'error' | 'debug') {
  return (message: string, ...args: unknown[]): void => {
    if (!isDebugEnabled()) return;
    console[method](`${PREFIX} ${message}`, ...args);
  };
}

const noopLogger: Logger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
};

const activeLogger: Logger = {
  info: createConsoleMethod('info'),
  warn: createConsoleMethod('warn'),
  error: createConsoleMethod('error'),
  debug: createConsoleMethod('debug'),
};

export function getLogger(context?: string): Logger {
  if (!isDebugEnabled()) return noopLogger;
  const base = activeLogger;
  if (!context) return base;
  const tag = `[${context}]`;
  return {
    info: (message, ...args) => base.info(`${tag} ${message}`, ...args),
    warn: (message, ...args) => base.warn(`${tag} ${message}`, ...args),
    error: (message, ...args) => base.error(`${tag} ${message}`, ...args),
    debug: (message, ...args) => base.debug(`${tag} ${message}`, ...args),
  };
}