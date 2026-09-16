// @vitest-environment jsdom
/**
 * O rodape: creditos em toda tela (inclusive na porta) e o "fale conosco"
 * apontando para o Instagram da Raavon Tech, em aba nova.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { creditos, INSTAGRAM_RAAVON } from '../creditos';

vi.mock('../dados/sessao', async (original) => ({
  ...(await original<typeof import('../dados/sessao')>()),
  useSessao: vi.fn(() => ({ estado: 'dentro', email: 'aamontagens@hotmail.com' })),
  sair: vi.fn(),
}));

import { App } from '../App';
import { useSessao } from '../dados/sessao';

afterEach(cleanup);

function montar() {
  return render(
    <MemoryRouter initialEntries={['/orcamentos']}>
      <App />
    </MemoryRouter>,
  );
}

describe('rodape', () => {
  it('os creditos trazem o ano corrente', () => {
    expect(creditos(2026)).toBe('© 2026 AA MONTAGENS - FEITO POR RAAVON TECH');
    expect(creditos()).toContain(String(new Date().getFullYear()));
  });

  it('aparece dentro do app, com o fale conosco em aba nova', async () => {
    montar();
    await screen.findByRole('heading', { name: 'Orçamentos' });
    expect(screen.getByRole('contentinfo')).toHaveTextContent(/FEITO POR RAAVON TECH/);
    const link = screen.getByRole('link', { name: 'fale conosco' });
    expect(link).toHaveAttribute('href', INSTAGRAM_RAAVON);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('aparece tambem na tela de entrar', () => {
    vi.mocked(useSessao).mockReturnValueOnce({ estado: 'fora' });
    montar();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'fale conosco' })).toBeInTheDocument();
  });
});
