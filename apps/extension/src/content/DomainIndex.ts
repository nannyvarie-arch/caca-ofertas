// CAÇAOFERTA — Indexação local de anúncios por domínio (FASE 03).
//
// Estrutura (seção 27): Map<domain, Set<adKey>>. Os objetos ParsedAd ficam em
// um armazenamento único (byKey); o índice guarda apenas chaves, evitando
// duplicar objetos. searchByDomain() consulta o índice diretamente — nunca
// percorre todos os anúncios (seção 29).

import type { ParsedAd } from '@caca-oferta/types';
import { adKey } from './deduplicate';
import { normalizeDomain } from './domain';

export interface DomainStats {
  total: number;
  active: number;
  inactive: number;
  unknown: number;
}

export class DomainIndex {
  private byDomain = new Map<string, Set<string>>();
  private byKey = new Map<string, ParsedAd>();
  private insertionOrder: string[] = [];

  get size(): number {
    return this.byKey.size;
  }

  get domains(): string[] {
    return Array.from(this.byDomain.keys()).sort();
  }

  /**
   * Indexa um anúncio (domínio normalizado). O mesmo anúncio nunca é
   * duplicado. Retorna false quando já existia ou não possui domínio.
   */
  add(ad: ParsedAd): boolean {
    const domain = ad.destinationDomain ? normalizeDomain(ad.destinationDomain) : null;
    if (!domain) return false;
    const key = adKey(ad);
    if (this.byKey.has(key)) return false;

    this.byKey.set(key, ad);
    this.insertionOrder.push(key);
    let keys = this.byDomain.get(domain);
    if (!keys) {
      keys = new Set<string>();
      this.byDomain.set(domain, keys);
    }
    keys.add(key);
    return true;
  }

  has(ad: ParsedAd): boolean {
    return this.byKey.has(adKey(ad));
  }

  hasDomain(domain: string): boolean {
    const normalized = normalizeDomain(domain);
    return normalized ? this.byDomain.has(normalized) : false;
  }

  /** Anúncios relacionados a um domínio, em ordem de detecção (seção 12). */
  get(domain: string): ParsedAd[] {
    const normalized = normalizeDomain(domain);
    if (!normalized) return [];
    const keys = this.byDomain.get(normalized);
    if (!keys) return [];
    const ads: ParsedAd[] = [];
    for (const key of this.insertionOrder) {
      if (keys.has(key)) {
        const ad = this.byKey.get(key);
        if (ad) ads.push(ad);
      }
    }
    return ads;
  }

  /** Contagem por status real detectado (seção 16). */
  stats(domain: string): DomainStats {
    const stats: DomainStats = { total: 0, active: 0, inactive: 0, unknown: 0 };
    for (const ad of this.get(domain)) {
      stats.total += 1;
      if (ad.status === 'ativo') stats.active += 1;
      else if (ad.status === 'encerrado') stats.inactive += 1;
      else stats.unknown += 1;
    }
    return stats;
  }

  /** Não reconstrói o índice: atualização incremental via add(). */
  clear(): void {
    this.byDomain.clear();
    this.byKey.clear();
    this.insertionOrder = [];
  }
}

/**
 * Pesquisa local (seção 12): normaliza o termo informado e consulta o índice.
 * Retorna SOMENTE anúncios que o CaçaOferta indexou e detectou de verdade.
 */
export function searchByDomain(domain: string, index: DomainIndex): ParsedAd[] {
  return index.get(domain);
}