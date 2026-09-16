import { describe, expect, it } from 'vitest';
import { mensagemDoErro } from './sessao';

describe('mensagemDoErro', () => {
  it('traduz os codigos comuns', () => {
    expect(mensagemDoErro({ code: 'auth/invalid-credential' })).toBe('E-mail ou senha errados.');
    expect(mensagemDoErro({ code: 'auth/network-request-failed' })).toMatch(/Sem internet/);
  });

  it('tem fallback para o desconhecido', () => {
    expect(mensagemDoErro(new Error('x'))).toMatch(/Não foi possível entrar/);
    expect(mensagemDoErro(null)).toMatch(/Não foi possível entrar/);
  });
});
