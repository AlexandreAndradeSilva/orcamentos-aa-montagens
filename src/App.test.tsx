// @vitest-environment jsdom
/**
 * Fumaça: o app monta, navega e chega no estado vazio sem quebrar.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { useEditor } from './estado/editor';

// A porta do app: nestes testes a sessao ja esta aberta. O login tem teste
// proprio (entrar.test.tsx); as regras, o emulador.
vi.mock('./dados/sessao', async (original) => ({
  ...(await original<typeof import('./dados/sessao')>()),
  useSessao: vi.fn(() => ({ estado: 'dentro', email: 'aamontagens@hotmail.com' })),
  sair: vi.fn(),
}));

import { useSessao, type Sessao } from './dados/sessao';

// Sem `globals: true`, o Testing Library nao registra a limpeza sozinho e as
// telas de um teste vazam para o seguinte.
afterEach(cleanup);

beforeEach(() => {
  useEditor.setState({ config: null, orcamento: null, foco: null, sujo: false });
  vi.mocked(useSessao).mockReturnValue({ estado: 'dentro', email: 'aamontagens@hotmail.com' });
});

function comSessao(sessao: Sessao) {
  vi.mocked(useSessao).mockReturnValue(sessao);
}

function montar(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <App />
    </MemoryRouter>,
  );
}

describe('App', () => {
  it('monta e mostra a navegação', async () => {
    montar('/orcamentos');
    expect(await screen.findByRole('heading', { name: 'Orçamentos' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clientes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Configurações' })).toBeInTheDocument();
  });

  it('mostra o estado vazio da lista com a ação sugerida', async () => {
    montar('/orcamentos');
    expect(await screen.findByText('Nenhum orçamento ainda.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Novo orçamento' }).length).toBeGreaterThan(0);
  });

  it('carrega as configurações vindas da planilha', async () => {
    montar('/configuracoes');
    await waitFor(() => expect(screen.getByDisplayValue('66.612.836/0001-55')).toBeInTheDocument());
    expect(screen.getByDisplayValue('aamonstagens@hotmail.com')).toBeInTheDocument();
  });

  it('redireciona /produtos para /servicos', async () => {
    montar('/produtos');
    expect(await screen.findByRole('heading', { name: 'Serviços' })).toBeInTheDocument();
  });
});

describe('a porta', () => {
  it('sem sessão, só existe a tela de entrar — nem a navegação aparece', () => {
    comSessao({ estado: 'fora' });
    montar('/orcamentos');
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Clientes' })).not.toBeInTheDocument();
  });

  it('enquanto a sessão carrega, não mostra nem login nem app', () => {
    comSessao({ estado: 'carregando' });
    montar('/orcamentos');
    expect(screen.getByText('Carregando…')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Entrar' })).not.toBeInTheDocument();
  });

  it('conta fora da lista vê o motivo e o botão de sair', () => {
    comSessao({ estado: 'sem-acesso', email: 'outro@exemplo.com' });
    montar('/orcamentos');
    expect(screen.getByRole('alert')).toHaveTextContent(/não tem acesso/);
    expect(screen.getByText('outro@exemplo.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sair/ })).toBeInTheDocument();
  });
});
