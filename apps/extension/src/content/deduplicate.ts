// CAÇAOFERTA — Deduplicação local de anúncios.
// Chave primária: adLibraryId (ID oficial). Fallback: assinatura derivada dos
// campos detectados, evitando reprocessar o mesmo card ao rolar/renderizar.

import type { ParsedAd } from '@caca-oferta/types';
import { textHash } from './text';

export function adSignature(ad: ParsedAd): string {
  return [
    ad.pageId ?? '',
    ad.pageName ?? '',
    ad.deliveryStartDate ?? '',
    ad.destinationDomain ?? '',
    (ad.creativeText ?? '').trim().slice(0, 120),
    ad.platforms?.join(',') ?? '',
  ].join('|');
}

export function adKey(ad: ParsedAd): string {
  if (ad.adLibraryId) return `id:${ad.adLibraryId}`;
  return `sig:${textHash(adSignature(ad))}`;
}

/** Anúncio só é "válido" se pelo menos um campo relevante foi detectado. */
export function isValidAd(ad: ParsedAd): boolean {
  return Boolean(
    ad.adLibraryId ||
      ad.pageId ||
      ad.pageName ||
      ad.creativeText ||
      ad.deliveryStartDate ||
      ad.destinationUrl,
  );
}

/**
 * Registro local de anúncios processados. Mantém um WeakSet dos cards que já
 * receberam overlay (nenhum card é duplicado) e um Map key→ParsedAd (nenhum
 * anúncio é reprocessado).
 */
export class AdRegistry {
  private ads = new Map<string, ParsedAd>();
  private elements = new WeakSet<Element>();

  get size(): number {
    return this.ads.size;
  }

  hasAd(ad: ParsedAd): boolean {
    return this.ads.has(adKey(ad));
  }

  hasElement(el: Element): boolean {
    return this.elements.has(el);
  }

  markElement(el: Element): void {
    this.elements.add(el);
  }

  /** Registra; retorna true quando o anúncio é novo, false em duplicado. */
  add(ad: ParsedAd): boolean {
    const key = adKey(ad);
    if (this.ads.has(key)) return false;
    this.ads.set(key, ad);
    return true;
  }

  all(): ParsedAd[] {
    return Array.from(this.ads.values());
  }

  clear(): void {
    this.ads.clear();
  }
}

/** Filtra anúncios já conhecidos (mantém só os novos). */
export function deduplicateAds(ads: ParsedAd[], registry: AdRegistry): ParsedAd[] {
  return ads.filter((ad) => registry.add(ad));
}