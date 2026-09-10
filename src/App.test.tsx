// @vitest-environment jsdom
/**
 * Fumaça: o app monta, navega e chega no estado vazio sem quebrar.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { db } from './dados/db';
import { useEditor } from './estado/editor';

// Sem `globals: true`, o Testing Library nao registra a limpeza sozinho e as
// telas de um teste vazam para o seguinte.
afterEach(cleanup);

beforeEach(async () => {
  await Promise.all([
    db.configuracao.clear(),
    db.clientes.clear(),
    db.servicos.clear(),
    db.orcamentos.clear(),
  ]);
  useEditor.setState({ config: null, orcamento: null, foco: null, sujo: false });
});

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
