import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { signUnsubscribeToken, verifyUnsubscribeToken } from '@/src/lib/email/unsubscribe-token';

const ORIGINAL_SECRET = process.env.AUTH_SECRET;

describe('unsubscribe-token', () => {
  beforeEach(() => {
    process.env.AUTH_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.AUTH_SECRET = ORIGINAL_SECRET;
  });

  it('firma y verifica devuelve el mismo usuarioId', () => {
    const token = signUnsubscribeToken('u1');
    expect(verifyUnsubscribeToken(token)).toBe('u1');
  });

  it('rechaza un token con firma alterada', () => {
    const token = signUnsubscribeToken('u1');
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    expect(verifyUnsubscribeToken(tampered)).toBeNull();
  });

  it('rechaza un token con usuarioId alterado (firma ya no calza)', () => {
    const token = signUnsubscribeToken('u1');
    const [, sig] = token.split('.');
    expect(verifyUnsubscribeToken(`u2.${sig}`)).toBeNull();
  });

  it('rechaza un token sin separador', () => {
    expect(verifyUnsubscribeToken('basura-sin-punto')).toBeNull();
  });

  it('lanza si AUTH_SECRET no está definida', () => {
    delete process.env.AUTH_SECRET;
    expect(() => signUnsubscribeToken('u1')).toThrow(/AUTH_SECRET/);
  });
});
