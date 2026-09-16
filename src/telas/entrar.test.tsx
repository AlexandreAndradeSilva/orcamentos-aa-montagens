// @vitest-environment jsdom
/**
 * A tela de entrar, com a sessao simulada: o que ela manda, o que mostra.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../dados/sessao', () => ({
  entrar: vi.fn(),
  pedirNovaSenha: vi.fn(),
  mensagemDoErro: (e: unknown) =>
    (e as { code?: string } | null)?.code === 'auth/invalid-credential'
      ? 'E-mail ou senha errados.'
      : 'Não foi possível entrar. Tente de novo.',
}));

import { Entrar } from './Entrar';
import { entrar, pedirNovaSenha } from '../dados/sessao';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('tela de entrar', () => {
  it('manda e-mail e senha para a sessao', async () => {
    const usuario = userEvent.setup();
    vi.mocked(entrar).mockResolvedValue();
    render(<Entrar />);

    await usuario.type(screen.getByLabelText('E-mail'), 'aamontagens@hotmail.com');
    await usuario.type(screen.getByLabelText('Senha'), 'segredo');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(entrar).toHaveBeenCalledWith('aamontagens@hotmail.com', 'segredo');
  });

  it('mostra o erro traduzido e nao limpa o e-mail', async () => {
    const usuario = userEvent.setup();
    vi.mocked(entrar).mockRejectedValue({ code: 'auth/invalid-credential' });
    render(<Entrar />);

    await usuario.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await usuario.type(screen.getByLabelText('Senha'), 'x');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha errados.');
    expect(screen.getByLabelText('E-mail')).toHaveValue('a@b.com');
  });

  it('esqueci a senha pede o e-mail de redefinicao', async () => {
    const usuario = userEvent.setup();
    vi.mocked(pedirNovaSenha).mockResolvedValue();
    render(<Entrar />);

    await usuario.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await usuario.click(screen.getByRole('button', { name: /Esqueci a senha/ }));

    await waitFor(() => expect(pedirNovaSenha).toHaveBeenCalledWith('a@b.com'));
    expect(await screen.findByRole('status')).toHaveTextContent(/enviamos/i);
  });

  it('esqueci a senha sem e-mail avisa em vez de chamar', async () => {
    const usuario = userEvent.setup();
    render(<Entrar />);
    await usuario.click(screen.getByRole('button', { name: /Esqueci a senha/ }));
    expect(pedirNovaSenha).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/Digite o e-mail/);
  });
});
