// CAÇAOFERTA — Formatação compartilhada da interface (FASE 05).
// Helpers puros usados pelo card (overlay) e pelos resultados (sidebar/painel).
// Nenhum dado externo vira HTML: textos são sempre atribuídos via textContent.

import type { AdStatus, MediaType, ParsedAd } from '@caca-oferta/types';
import type { StatusToken } from './detection';

export interface StatusMeta {
  token: StatusToken;
  /** classe do ponto (co-dot-a/i/u) e do pill (co-status-pill-a/i/u). */
  cls: string;
  label: string;
}

const STATUS_LABELS: Record<StatusToken, StatusMeta> = {
  active: { token: 'active', cls: 'a', label: 'ATIVO' },
  inactive: { token: 'inactive', cls: 'i', label: 'ENCERRADO' },
  unknown: { token: 'unknown', cls: 'u', label: 'DESCONHECIDO' },
};

/** Mapeia o status pt (ou null) para o token e rótulo exibido. */
export function statusMeta(status: AdStatus | null): StatusMeta {
  if (status === 'ativo') return STATUS_LABELS.active;
  if (status === 'encerrado') return STATUS_LABELS.inactive;
  return STATUS_LABELS.unknown;
}

export interface MediaVisual {
  icon: string;
  label: string;
}

/** Representação visual do tipo de mídia; unknown/ausente → null (exibe-se "não identificada"). */
export function mediaVisual(mediaType: MediaType | null | undefined): MediaVisual | null {
  switch (mediaType) {
    case 'imagem':
      return { icon: '🖼', label: 'Imagem' };
    case 'video':
      return { icon: '🎥', label: 'Vídeo' };
    case 'carrossel':
      return { icon: '▦', label: 'Carrossel' };
    default:
      return null;
  }
}

const PLATFORM_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  messenger: 'Messenger',
  'audience-network': 'Audience Network',
};

/** Rótulo amigável de cada plataforma detectada (nunca inventa plataforma). */
export function platformLabel(platform: string): string {
  return PLATFORM_LABELS[platform] ?? platform;
}

/** 'YYYY-MM-DD' → 'DD/MM/YYYY'; devolve o original quando não é ISO válida. */
export function isoToBr(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

export function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

/** Descrição curta de um anúncio para tooltips/acessibilidade (dados reais). */
export function adSummary(ad: ParsedAd): string {
  const parts: string[] = [];
  if (ad.pageName) parts.push(ad.pageName);
  if (ad.adLibraryId) parts.push(`ID ${ad.adLibraryId}`);
  if (ad.deliveryStartDate) parts.push(`Início ${isoToBr(ad.deliveryStartDate)}`);
  if (ad.destinationDomain) parts.push(ad.destinationDomain);
  return parts.join(' · ');
}