import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('junta classes e ignora valores falsy', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('aceita números e strings vazias são ignoradas quando falsey', () => {
    expect(cn(0, 'x', '')).toBe('x');
  });

  it('retorna string vazia sem input', () => {
    expect(cn()).toBe('');
  });
});