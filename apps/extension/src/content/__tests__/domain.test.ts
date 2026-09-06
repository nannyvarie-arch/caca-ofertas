import { describe, expect, it } from 'vitest';
import {
  domainOriginUrl,
  extractDomain,
  isMetaInternalHost,
  isSafeHttpUrl,
  normalizeDomain,
} from '../domain';

describe('isMetaInternalHost', () => {
  const internals = [
    'facebook.com',
    'www.facebook.com',
    'l.facebook.com',
    'm.facebook.com',
    'fb.me',
    'example.fb.me',
    'fb.watch',
    'm.me',
    'on.fb.me',
  ];
  const externals = [
    'exemplo.com',
    'shop.exemplo.com.br',
    'messenger.com',
    'instagram.com',
    'example.com',
  ];

  it.each(internals)('rejeita host interno %s', (host) => {
    expect(isMetaInternalHost(host)).toBe(true);
  });
  it.each(externals)('aceita host externo %s', (host) => {
    expect(isMetaInternalHost(host)).toBe(false);
  });
});

describe('extractDomain', () => {
  const valid: Array<[string, string]> = [
    ['https://exemplo.com/', 'exemplo.com'],
    ['https://www.exemplo.com/', 'www.exemplo.com'],
    ['https://shop.exemplo.com', 'shop.exemplo.com'],
    ['http://EXEMPLO.COM', 'exemplo.com'],
    ['https://example.com:443/path', 'example.com'],
    ['https://example.com:80/path', 'example.com'],
    ['https://exemplo.com./oferta', 'exemplo.com'],
    ['exemplo.com', 'exemplo.com'],
  ];
  const invalid = [
    '',
    '   ',
    'https://',
    'javascript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'blob:https://exemplo.com/a',
    'ftp://exemplo.com',
    'mailto:oi@exemplo.com',
    'https://facebook.com',
    'https://l.facebook.com/l.php?u=https%3A%2F%2Fex.com',
    'https://fb.me/link',
    'https://www.facebook.com/ads/library/?id=1',
  ];
  const validNullable = [
    null as unknown as string,
    undefined as unknown as string,
    'https://',
    '  ',
  ];

  it.each(valid)('extrai %s → %s', (input, expected) => {
    expect(extractDomain(input)).toBe(expected);
  });

  it.each(invalid)('rejeita %s → null', (input) => {
    expect(extractDomain(input)).toBeNull();
  });

  it.each(validNullable)('recebe entrada nula/vazia (%j) → null', (input) => {
    expect(extractDomain(input)).toBeNull();
  });
});

describe('normalizeDomain', () => {
  const cases: Array<[string, string | null]> = [
    ['https://www.exemplo.com', 'exemplo.com'],
    ['https://www.exemplo.com/produto', 'exemplo.com'],
    ['https://exemplo.com/?utm_source=facebook', 'exemplo.com'],
    ['https://EXEMPLO.COM/oferta', 'exemplo.com'],
    ['http://www.exemplo.com:80/', 'exemplo.com'],
    ['https://exemplo.com:443/oferta', 'exemplo.com'],
    ['https://exemplo.com/?utm_source=facebook&fbclid=123', 'exemplo.com'],
    ['https://www.exemplo.com/produto/oferta?utm_source=facebook&utm_campaign=teste#frag', 'exemplo.com'],
    ['https://www.example.com:443/path?x=1#f', 'example.com'],
    ['https://shop.exemplo.com/produto', 'exemplo.com'],
    ['https://checkout.exemplo.com/carrinho', 'exemplo.com'],
    ['https://dominio.com.br', 'dominio.com.br'],
    ['https://exemplo.co.uk/oferta', 'exemplo.co.uk'],
    ['https://www.Exemplo.Com/oferta', 'exemplo.com'],
    ['exemplo.com', 'exemplo.com'],
    ['https://example.com:8080/non-standard-port', 'example.com'],
    ['https://example.com:443/path?x=1#f', 'example.com'],
    ['', null],
    ['   ', null],
    ['https://', null],
    ['https://abc', null],
    ['exemplo', null],
    ['não é url', null],
    ['javascript:alert(1)', null],
    ['data:text/html;base64,PHNjcmlwdD4=', null],
    ['blob:https://exemplo.com/a', null],
    ['ftp://exemplo.com', null],
    ['mailto:oi@exemplo.com', null],
    ['https://facebook.com', null],
    ['https://l.facebook.com/l.php?u=https%3A%2F%2Fexemplo.com', null],
    ['https://fb.me/link', null],
    [null as unknown as string, null],
    [undefined as unknown as string, null],
  ];

  it.each(cases)('normaliza %j → %j', (input, expected) => {
    expect(normalizeDomain(input)).toBe(expected);
  });
});

describe('IDN / punycode', () => {
  it('normaliza domínio internacionalizado para punycode', () => {
    expect(normalizeDomain('https://xn--strae-oqa.de/')).toBe('xn--strae-oqa.de');
  });

  it('normaliza domínio com TLD unicode', () => {
    expect(normalizeDomain('https://exemplo.xn--fiqs8s/')).toBe('exemplo.xn--fiqs8s');
  });
});

describe('domainOriginUrl', () => {
  it('converte domínio para URL https://base', () => {
    expect(domainOriginUrl('exemplo.com')).toBe('https://exemplo.com/');
  });

  it('normaliza antes de gerar a URL', () => {
    expect(domainOriginUrl('https://shop.exemplo.com/produto')).toBe('https://exemplo.com/');
  });

  it('retorna null para domínio inválido', () => {
    expect(domainOriginUrl('abc')).toBeNull();
  });
});

describe('isSafeHttpUrl', () => {
  it('aceita http e https', () => {
    expect(isSafeHttpUrl('https://exemplo.com')).toBe(true);
    expect(isSafeHttpUrl('http://exemplo.com/path')).toBe(true);
  });

  it('rejeita javascript, data, blob, ftp, mailto e URLs inválidas', () => {
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html')).toBe(false);
    expect(isSafeHttpUrl('blob:https://exemplo.com/a')).toBe(false);
    expect(isSafeHttpUrl('ftp://exemplo.com')).toBe(false);
    expect(isSafeHttpUrl('mailto:oi@exemplo.com')).toBe(false);
    expect(isSafeHttpUrl('não é url')).toBe(false);
  });
});