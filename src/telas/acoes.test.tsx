// @vitest-environment jsdom
/**
 * Remover linha, excluir orçamento e autocompletar de unidade.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { GradeItens } from './GradeItens';
import { App } from '../App';
import { useEditor } from '../estado/editor';
import { configuracaoPadrao, db } from '../dados/db';
import { ambientePadrao, orcamentoNovo } from '../domain/fabrica';

afterEach(cleanup);

function novo() {
  return orcamentoNovo(ambientePadrao, {
    sequencial: 1,
    ano: 2026,
    clienteId: 'c',
    clienteNome: 'Igreja Portal Pérola 2',
    dataEmissao: '2026-08-14',
    condicoesPagamento: '30% ENTRADA, RESTANTE A COMBINAR',
  });
}

beforeEach(async () => {
  await Promise.all([
    db.configuracao.clear(),
    db.clientes.clear(),
    db.servicos.clear(),
    db.orcamentos.clear(),
  ]);
  useEditor.setState({
    orcamento: novo(),
    config: configuracaoPadrao(2026),
    foco: null,
    pedidoDeFoco: null,
    sujo: false,
  });
});

const linhas = () => useEditor.getState().orcamento!.secoes[0]!.linhas;

describe('remover linha', () => {
  it('cada linha tem um botão de remover', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);
    useEditor.getState().novaLinha(0);

    await usuario.click(await screen.findByLabelText('Remover o item 1.2'));

    expect(linhas()).toHaveLength(1);
  });

  it('remove a linha certa, não a última', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);
    useEditor.getState().alterarLinha(0, 0, { descricao: 'PRIMEIRA' });
    useEditor.getState().novaLinha(0);
    useEditor.getState().alterarLinha(0, 1, { descricao: 'SEGUNDA' });
    useEditor.getState().novaLinha(0);
    useEditor.getState().alterarLinha(0, 2, { descricao: 'TERCEIRA' });

    await usuario.click(await screen.findByLabelText('Remover o item 1.2'));

    expect(linhas().map((l) => l.descricao)).toEqual(['PRIMEIRA', 'TERCEIRA']);
  });

  it('a última linha da seção não pode ser removida', () => {
    render(<GradeItens />);
    expect(screen.getByLabelText('Remover o item 1.1')).toBeDisabled();
  });
});

describe('autocompletar de unidade', () => {
  it('o campo aponta para a lista de unidades cadastradas', () => {
    render(<GradeItens />);
    const campo = screen.getByLabelText('Unidade do item 1.1');
    expect(campo).toHaveAttribute('list', 'unidades-cadastradas');
  });

  it('a lista traz o que está em Configurações', () => {
    const { container } = render(<GradeItens />);
    const opcoes = [...container.querySelectorAll('datalist#unidades-cadastradas option')].map(
      (o) => o.getAttribute('value'),
    );
    expect(opcoes).toEqual(configuracaoPadrao(2026).unidades);
    expect(opcoes).toContain('M²');
  });

  it('acompanha uma unidade nova cadastrada nas configurações', () => {
    const config = configuracaoPadrao(2026);
    useEditor.setState({ config: { ...config, unidades: [...config.unidades, 'PEÇA'] } });

    const { container } = render(<GradeItens />);
    const opcoes = [...container.querySelectorAll('datalist#unidades-cadastradas option')].map(
      (o) => o.getAttribute('value'),
    );
    expect(opcoes).toContain('PEÇA');
  });

  it('ainda aceita unidade que não está na lista', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Unidade do item 1.1'));
    await usuario.keyboard('VERBA');

    expect(linhas()[0]!.unidade).toBe('VERBA');
  });
});

describe('excluir orçamento', () => {
  it('pede confirmação antes de excluir', async () => {
    const usuario = userEvent.setup();
    const orcamento = novo();
    await db.orcamentos.put(orcamento);

    render(
      <MemoryRouter initialEntries={[`/orcamentos/${orcamento.id}`]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Orçamento 001\/2026/ });
    await usuario.click(screen.getByRole('button', { name: /Excluir o orçamento 001\/2026/ }));

    // ainda não excluiu: só perguntou
    expect(await screen.findByText('Excluir mesmo?')).toBeInTheDocument();
    expect(await db.orcamentos.count()).toBe(1);
  });

  it('cancelar não exclui', async () => {
    const usuario = userEvent.setup();
    const orcamento = novo();
    await db.orcamentos.put(orcamento);

    render(
      <MemoryRouter initialEntries={[`/orcamentos/${orcamento.id}`]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Orçamento 001\/2026/ });
    await usuario.click(screen.getByRole('button', { name: /Excluir o orçamento 001\/2026/ }));
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.queryByText('Excluir mesmo?')).not.toBeInTheDocument();
    expect(await db.orcamentos.count()).toBe(1);
  });

  it('confirmar exclui e volta para a lista', async () => {
    const usuario = userEvent.setup();
    const orcamento = novo();
    await db.orcamentos.put(orcamento);

    render(
      <MemoryRouter initialEntries={[`/orcamentos/${orcamento.id}`]}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByRole('heading', { name: /Orçamento 001\/2026/ });
    await usuario.click(screen.getByRole('button', { name: /Excluir o orçamento 001\/2026/ }));
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(async () => expect(await db.orcamentos.count()).toBe(0));
    expect(await screen.findByRole('heading', { name: 'Orçamentos' })).toBeInTheDocument();
  });

  it('dá para excluir direto da lista', async () => {
    const usuario = userEvent.setup();
    await db.orcamentos.put(novo());

    render(
      <MemoryRouter initialEntries={['/orcamentos']}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByText('Igreja Portal Pérola 2');
    await usuario.click(screen.getByRole('button', { name: /Excluir o orçamento 001\/2026 de/ }));
    await usuario.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(async () => expect(await db.orcamentos.count()).toBe(0));
  });
});
