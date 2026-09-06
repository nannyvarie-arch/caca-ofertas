import { beforeEach, describe, expect, it } from 'vitest';
import { DomainIndex, searchByDomain } from '../DomainIndex';
import type { ParsedAd } from '@caca-oferta/types';

const baseAd: ParsedAd = {
  adLibraryId: null,
  pageId: null,
  pageName: null,
  status: null,
  deliveryStartDate: null,
  deliveryStopDate: null,
  platforms: null,
  mediaType: null,
  creativeText: null,
  headline: null,
  description: null,
  destinationUrl: null,
  destinationDomain: null,
  adSnapshotUrl: null,
  cta: null,
  creativeUrl: null,
};

function makeAd(overrides: Partial<ParsedAd>): ParsedAd {
  return { ...baseAd, ...overrides };
}

describe('DomainIndex', () => {
  let index: DomainIndex;

  beforeEach(() => {
    index = new DomainIndex();
  });

  it('indexa anúncios por domínio normalizado e deduplica', () => {
    const a = makeAd({ adLibraryId: 'A', pageName: 'A', destinationDomain: 'www.exemplo.com' });
    const b = makeAd({ adLibraryId: 'B', pageName: 'B', destinationDomain: 'https://shop.exemplo.com/produto' });
    const same = makeAd({ adLibraryId: 'A', pageName: 'A', destinationDomain: 'https://exemplo.com' });

    expect(index.add(a)).toBe(true);
    expect(index.add(b)).toBe(true);
    expect(index.add(same)).toBe(false); // duplicado

    expect(index.size).toBe(2);
    expect(index.get('exemplo.com')).toHaveLength(2);
    expect(index.get('exemplo.com')[0]?.pageName).toBe('A');
    expect(index.get('exemplo.com')[1]?.pageName).toBe('B');
  });

  it('ignora anúncios sem destinationDomain', () => {
    const ad = makeAd({ adLibraryId: 'NO_DOMAIN', destinationDomain: null });
    expect(index.add(ad)).toBe(false);
    expect(index.size).toBe(0);
  });

  it('has() e hasDomain() refletem o estado do índice', () => {
    const ad = makeAd({ adLibraryId: 'ID1', destinationDomain: 'example.com' });
    expect(index.has(ad)).toBe(false);
    expect(index.hasDomain('example.com')).toBe(false);
    index.add(ad);
    expect(index.has(ad)).toBe(true);
    expect(index.hasDomain('example.com')).toBe(true);
    expect(index.hasDomain('outro.com')).toBe(false);
  });

  it('domains retorna domínios ordenados', () => {
    index.add(makeAd({ adLibraryId: 'A', destinationDomain: 'z.com' }));
    index.add(makeAd({ adLibraryId: 'B', destinationDomain: 'a.com' }));
    expect(index.domains).toEqual(['a.com', 'z.com']);
  });

  it('stats() conta ativos, encerrados e desconhecidos', () => {
    index.add(makeAd({ adLibraryId: 'A', destinationDomain: 'exemplo.com', status: 'ativo' }));
    index.add(makeAd({ adLibraryId: 'B', destinationDomain: 'exemplo.com', status: 'encerrado' }));
    index.add(makeAd({ adLibraryId: 'C', destinationDomain: 'exemplo.com', status: 'desconhecido' }));
    index.add(makeAd({ adLibraryId: 'D', destinationDomain: 'exemplo.com', status: null }));
    expect(index.stats('exemplo.com')).toEqual({ total: 4, active: 1, inactive: 1, unknown: 2 });
  });

  it('clear() esvazia o índice completamente', () => {
    index.add(makeAd({ adLibraryId: 'A', destinationDomain: 'exemplo.com' }));
    index.clear();
    expect(index.size).toBe(0);
    expect(index.get('exemplo.com')).toHaveLength(0);
  });

  it('novos anúncios são incrementados sem reconstruir o índice', () => {
    index.add(makeAd({ adLibraryId: 'A', destinationDomain: 'example.com' }));
    expect(index.get('example.com')).toHaveLength(1);

    index.add(makeAd({ adLibraryId: 'B', destinationDomain: 'example.com' }));
    expect(index.get('example.com')).toHaveLength(2);
  });
});

describe('searchByDomain', () => {
  it('retorna somente anúncios do domínio informado', () => {
    const index = new DomainIndex();
    index.add(makeAd({ adLibraryId: 'A', pageName: 'A', destinationDomain: 'exemplo.com' }));
    index.add(makeAd({ adLibraryId: 'B', pageName: 'B', destinationDomain: 'exemplo.com' }));
    index.add(makeAd({ adLibraryId: 'C', pageName: 'C', destinationDomain: 'outro.com' }));

    const results = searchByDomain('exemplo.com', index);
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.pageName)).toEqual(['A', 'B']);
  });

  it('retorna [] para domínio inexistente', () => {
    const index = new DomainIndex();
    index.add(makeAd({ adLibraryId: 'A', destinationDomain: 'exemplo.com' }));
    expect(searchByDomain('outro.com', index)).toEqual([]);
  });

  it('retorna [] para termo inválido', () => {
    expect(searchByDomain('abc', new DomainIndex())).toEqual([]);
  });
});