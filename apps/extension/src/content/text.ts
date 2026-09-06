// CAÇAOFERTA — Helpers de texto para detecção/parser.

export function normalizeText(input: string): string {
  return input.replace(/\s+/g, ' ').trim();
}

export function textContentOf(element: Element): string {
  return normalizeText(element.textContent ?? '');
}

export function textMatches(input: string, pattern: RegExp): boolean {
  return pattern.test(input);
}

/** Procura um nó de texto cujo conteúdo (normalizado) casou com o padrão. */
export function findTextMatch(root: Element, pattern: RegExp): string | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const text = normalizeText(node.textContent ?? '');
    if (text && pattern.test(text)) return text;
    node = walker.nextNode();
  }
  return null;
}

/** Coleta textos normalizados de folhas de texto de um subárvore (não vazios). */
export function collectTextLeaves(root: Element): string[] {
  const leaves: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null = walker.nextNode();
  while (node) {
    const text = normalizeText(node.textContent ?? '');
    if (text) leaves.push(text);
    node = walker.nextNode();
  }
  return leaves;
}

/** Rótulos da UI da Biblioteca que não devem ser tratados como texto criativo. */
const NON_CREATIVE_LABELS =
  /\b(library id|id da biblioteca|sponsored|patrocinado|active|ativo|inactive|inativo|encerrado|started running|stopped running|iniciada|começou a rodar|parou de rodar|see ad details|ver detalhes do anúncio|new|novo|report ad|denunciar anúncio|why am i seeing this|por que estou vendo isso)\b/i;

export function isLikelyCreativeText(text: string, minLength = 20): boolean {
  if (text.length < minLength) return false;
  if (/^\d+(?:\.\d+)?%?$/.test(text)) return false;
  return !NON_CREATIVE_LABELS.test(text);
}

export function textHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return (hash >>> 0).toString(36);
}