import { describe, expect, it } from 'vitest';
import { filterAds, sortAds } from '../sortFilter';
import type { ParsedAd } from '@caca-oferta/types';

function makeAd(overrides: Partial<ParsedAd>): ParsedAd {
  return {
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
    ...overrides,
  };
}

const AD_ATIVO_IMG_FB = makeAd({
  adLibraryId: 'A',
  pageName: 'Alfa',
  status: 'ativo',
  deliveryStartDate: '2026-09-01',
  platforms: ['facebook'],
  mediaType: 'imagem',
});

const AD_ENCERRADO_VIDEO_IG = makeAd({
  adLibraryId: 'B',
  pageName: 'Beta',
  status: 'encerrado',
  deliveryStartDate: '2026-06-10',
  deliveryStopDate: '2026-08-05',
  platforms: ['instagram'],
  mediaType: 'video',
});

const AD_DESCONHECIDO_CARROSSEL_FB = makeAd({
  adLibraryId: 'C',
  pageName: 'Gama',
  status: 'desconhecido',
  deliveryStartDate: '2026-08-22',
  platforms: ['facebook'],
  mediaType: 'carrossel',
});

const AD_SEM_DATA = makeAd({
  adLibraryId: 'D',
  pageName: 'Delta',
  status: 'ativo',
  platforms: ['facebook'],
  mediaType: 'imagem',
});

const ADS = [AD_ATIVO_IMG_FB, AD_ENCERRADO_VIDEO_IG, AD_DESCONHECIDO_CARROSSEL_FB, AD_SEM_DATA];

describe('filterAds', () => {
  it('retorna todos quando filtro é "all"', () => {
    expect(filterAds(ADS, { status: 'all', platform: 'all', media: 'all', maxDays: 'all' })).toHaveLength(4);
  });

  it('filtra por status', () => {
    expect(filterAds(ADS, { status: 'ativo', platform: 'all', media: 'all', maxDays: 'all' })).toEqual([AD_ATIVO_IMG_FB, AD_SEM_DATA]);
    expect(filterAds(ADS, { status: 'encerrado', platform: 'all', media: 'all', maxDays: 'all' })).toEqual([AD_ENCERRADO_VIDEO_IG]);
  });

  it('filtra por plataforma', () => {
    expect(filterAds(ADS, { status: 'all', platform: 'instagram', media: 'all', maxDays: 'all' })).toEqual([AD_ENCERRADO_VIDEO_IG]);
    expect(filterAds(ADS, { status: 'all', platform: 'facebook', media: 'all', maxDays: 'all' })).toEqual([AD_ATIVO_IMG_FB, AD_DESCONHECIDO_CARROSSEL_FB, AD_SEM_DATA]);
  });

  it('filtra por mídia', () => {
    expect(filterAds(ADS, { status: 'all', platform: 'all', media: 'video', maxDays: 'all' })).toEqual([AD_ENCERRADO_VIDEO_IG]);
    expect(filterAds(ADS, { status: 'all', platform: 'all', media: 'imagem', maxDays: 'all' })).toEqual([AD_ATIVO_IMG_FB, AD_SEM_DATA]);
  });

  it('filtra por dias rodando', () => {
    // AD_ATIVO_IMG_FB started 2026-09-01 → ~4 days; AD_DESCONHECIDO 2026-08-22 → ~14 days;
    // AD_ENCERRADO 2026-06-10 → ~87 days; AD_SEM_DATA não tem data → excluído quando maxDays ativo.
    const maxDays7 = filterAds(ADS, { status: 'all', platform: 'all', media: 'all', maxDays: '7' });
    expect(maxDays7.map((a) => a.adLibraryId)).toEqual(['A']);
    const maxDays30 = filterAds(ADS, { status: 'all', platform: 'all', media: 'all', maxDays: '30' });
    expect(maxDays30.map((a) => a.adLibraryId)).toEqual(['A', 'C']);
  });

  it('filtra sem data de início quando maxDays não é "all"', () => {
    expect(filterAds([AD_SEM_DATA], { status: 'all', platform: 'all', media: 'all', maxDays: '7' })).toHaveLength(0);
  });
});

describe('sortAds', () => {
  it('ordena por data mais recente', () => {
    const sorted = sortAds([AD_ENCERRADO_VIDEO_IG, AD_ATIVO_IMG_FB, AD_DESCONHECIDO_CARROSSEL_FB], 'latest');
    expect(sorted.map((a) => a.adLibraryId)).toEqual(['A', 'C', 'B']); // 09-01 > 08-22 > 06-10
  });

  it('ordena por data mais antiga', () => {
    const sorted = sortAds([AD_ATIVO_IMG_FB, AD_ENCERRADO_VIDEO_IG, AD_DESCONHECIDO_CARROSSEL_FB], 'oldest');
    expect(sorted.map((a) => a.adLibraryId)).toEqual(['B', 'C', 'A']); // 06-10 < 08-22 < 09-01
  });

  it('ordena por maior tempo rodando', () => {
    const sorted = sortAds([AD_ATIVO_IMG_FB, AD_ENCERRADO_VIDEO_IG, AD_DESCONHECIDO_CARROSSEL_FB], 'longest');
    expect(sorted.map((a) => a.adLibraryId)).toEqual(['B', 'C', 'A']);
  });

  it('ordena por menor tempo rodando', () => {
    const sorted = sortAds([AD_ENCERRADO_VIDEO_IG, AD_ATIVO_IMG_FB, AD_DESCONHECIDO_CARROSSEL_FB], 'shortest');
    expect(sorted.map((a) => a.adLibraryId)).toEqual(['A', 'C', 'B']);
  });

  it('ordena alfabeticamente A-Z e Z-A', () => {
    const az = sortAds([AD_ENCERRADO_VIDEO_IG, AD_ATIVO_IMG_FB, AD_DESCONHECIDO_CARROSSEL_FB], 'az');
    expect(az.map((a) => a.pageName)).toEqual(['Alfa', 'Beta', 'Gama']);
    const za = sortAds([...az], 'za');
    expect(za.map((a) => a.pageName)).toEqual(['Gama', 'Beta', 'Alfa']);
  });

  it('empurra anúncios sem data para o fim nas ordenações por data', () => {
    const sorted = sortAds([AD_SEM_DATA, AD_ATIVO_IMG_FB], 'latest');
    expect(sorted.map((a) => a.adLibraryId)).toEqual(['A', 'D']);
  });

  it('empurra anúncios sem data para o fim nas ordenações por dias rodando', () => {
    const sorted = sortAds([AD_SEM_DATA, AD_ATIVO_IMG_FB], 'longest');
    expect(sorted.map((a) => a.adLibraryId)).toEqual(['A', 'D']);
  });
});