// CAÇAOFERTA — Padrões de referência para detecção/parser da Meta Ads Library.
//
// IMPORTANTE (FASE 02): a Meta ofusca nomes de classes e pode alterar o DOM.
// Por isso a detecção NÃO depende de uma classe CSS específica: combina
// textos públicos ("Library ID", "Sponsored", "Started running"), padrões de
// URL de links (perfil da página, snapshot do anúncio) e relações estruturais
// do card. Esses são dados visíveis legítimos da página (nada de bypass).
//
// Os seletores abaixo são apenas "pistas" de baixa confiança usadas para
// acelerar a varredura; o candidato só é aceito quando os marcadores
// textuais/estruturais confirmam.

/** Links de perfil de página do Facebook: /Nome-Digits/ ou /people/Nome-Digits/ */
export const PAGE_PROFILE_HREF_PATTERN =
  /^https:\/\/(?:[a-z0-9-]+\.)*facebook\.com\/(?:people\/)?[^/?#]+?-(\d{4,})\/?[?#]?.*$/i;

/** Link de visualização/snapshot do anúncio: /ads/library/?id=NNN... */
export const AD_SNAPSHOT_HREF_PATTERN =
  /^https:\/\/(?:[a-z0-9-]+\.)*facebook\.com\/ads\/library\/\?id=(\d+)/i;

/** Rótulo público do ID do anúncio (EN/PT). */
export const LIBRARY_ID_LABEL_PATTERN =
  /(?:library\s*id|id(?:entificador)?\s*da\s*biblioteca)\s*:?\s*(\d{5,})/i;

export const SPONSORED_TEXT_PATTERN = /\b(?:sponsored|patrocinad[oa])\b/i;

export const PAGE_ID_IN_HREF_PATTERN = /-(\d{4,})(?:\/|$)/;

// ── Status ────────────────────────────────────────────────────────────────
export const STATUS_ACTIVE_PATTERN = /^(?:active|ativo)$/i;
export const STATUS_INACTIVE_PATTERN = /^(?:inactive|inativo|encerrado|finalizado)$/i;

// ── Datas ─────────────────────────────────────────────────────────────────
// Ex.: "Started running on August 22, 2026" | "Iniciada em 22 de agosto de 2026"
//      "Começou a veicular em 22 de ago de 2026" | "Veiculação encerrada em ..."
export const START_DATE_PREFIX_PATTERN =
  /(?:started\s*running|veicula(?:ção|cão)\s+iniciada|come(?:ç|c)ou\s+(?:a\s+)?(?:veicular|rodar)|iniciada)\s*(?:on|em|as\s+of)?\s*/i;
export const STOP_DATE_PREFIX_PATTERN =
  /(?:stopped\s*running|veicula(?:ção|cão)\s+encerrada|(?:parou|terminou)\s+(?:de\s+)?(?:veicular|rodar|exibir)|encerrada)\s*(?:on|em|as\s+of)?\s*/i;

/**
 * Meses em pt-BR (por extenso e abreviados). A substituição é feita em ordem
 * decrescente de tamanho para evitar que "mar" corrompa "março"/"marco".
 */
export const MONTHS_PT_TO_EN: Record<string, string> = {
  janeiro: 'January',
  fevereiro: 'February',
  'março': 'March',
  marco: 'March',
  abril: 'April',
  maio: 'May',
  junho: 'June',
  julho: 'July',
  agosto: 'August',
  setembro: 'September',
  outubro: 'October',
  novembro: 'November',
  dezembro: 'December',
  jan: 'January',
  fev: 'February',
  mar: 'March',
  abr: 'April',
  mai: 'May',
  jun: 'June',
  jul: 'July',
  ago: 'August',
  set: 'September',
  out: 'October',
  nov: 'November',
  dez: 'December',
};

export const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December',
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Sept', 'Oct', 'Nov', 'Dec',
];

// ── Plataformas de veiculação ─────────────────────────────────────────────
export const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'facebook',
  instagram: 'instagram',
  messenger: 'messenger',
  'audience network': 'audience-network',
  'meta audience network': 'audience-network',
};

export const KNOWN_PLATFORM_NAMES = Object.keys(PLATFORM_LABELS);

// ── Mídia ────────────────────────────────────────────────────────────────
export const CAROUSEL_INDICATOR_PATTERN = /^\s*\d+\s*\/\s*\d+\s*$/;

// Pistas de baixa confiança (classes/atributos observados publicamente).
export const SELECTOR_HINTS = {
  /** Rótulo "Library ID" / "ID da biblioteca". */
  libraryIdLabel: '[class*="LibraryId"], [class*="library-id"]',
  /** Área de mídia do anúncio (modo mínimo; reforçada por marcadores estruturais). */
  mediaArea: 'video, iframe[allow*="autoplay"], img',
} as const;

export const CREATIVE_TEXT_MIN_LENGTH = 20;