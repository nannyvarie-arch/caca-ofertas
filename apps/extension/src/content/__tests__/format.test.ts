import { describe, expect, it } from 'vitest';
import { isoToBr, mediaVisual, platformLabel, plural, statusMeta } from '../format';

describe('statusMeta (renderização de status)', () => {
  it('ativo → ATIVO (verde)', () => {
    const meta = statusMeta('ativo');
    expect(meta.label).toBe('ATIVO');
    expect(meta.cls).toBe('a');
  });

  it('encerrado → ENCERRADO (vermelho)', () => {
    const meta = statusMeta('encerrado');
    expect(meta.label).toBe('ENCERRADO');
    expect(meta.cls).toBe('i');
  });

  it('null e desconhecido → DESCONHECIDO (cinza)', () => {
    expect(statusMeta(null).label).toBe('DESCONHECIDO');
    expect(statusMeta('desconhecido').label).toBe('DESCONHECIDO');
    expect(statusMeta(null).cls).toBe('u');
  });
});

describe('mediaVisual (renderização de mídia)', () => {
  it('converte tipos conhecidos com ícone', () => {
    expect(mediaVisual('imagem')).toEqual({ icon: '🖼', label: 'Imagem' });
    expect(mediaVisual('video')).toEqual({ icon: '🎥', label: 'Vídeo' });
    expect(mediaVisual('carrossel')).toEqual({ icon: '▦', label: 'Carrossel' });
  });

  it('desconhecida/ausente → null (UI decide mostrar "não identificada")', () => {
    expect(mediaVisual('desconhecida')).toBeNull();
    expect(mediaVisual('texto')).toBeNull();
    expect(mediaVisual(null)).toBeNull();
    expect(mediaVisual(undefined)).toBeNull();
  });
});

describe('platformLabel (badges de plataforma — só o detectado)', () => {
  it('rótulos amigáveis das plataformas conhecidas', () => {
    expect(platformLabel('facebook')).toBe('Facebook');
    expect(platformLabel('instagram')).toBe('Instagram');
    expect(platformLabel('messenger')).toBe('Messenger');
    expect(platformLabel('audience-network')).toBe('Audience Network');
  });

  it('não inventa plataforma desconhecida (repete o valor cru)', () => {
    expect(platformLabel('xing')).toBe('xing');
  });
});

describe('isoToBr', () => {
  it('converte ISO para data brasileira', () => {
    expect(isoToBr('2026-08-22')).toBe('22/08/2026');
  });

  it('não fabrica formato quando a entrada não é ISO', () => {
    expect(isoToBr('não identificada')).toBe('não identificada');
    expect(isoToBr(null)).toBe('');
  });
});

describe('plural', () => {
  it('singular para 1, plural caso contrário', () => {
    expect(plural(1, 'anúncio', 'anúncios')).toBe('anúncio');
    expect(plural(2, 'anúncio', 'anúncios')).toBe('anúncios');
    expect(plural(0, 'anúncio', 'anúncios')).toBe('anúncios');
  });
});