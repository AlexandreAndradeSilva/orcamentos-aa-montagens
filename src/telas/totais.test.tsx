// @vitest-environment jsdom
/**
 * O bloco de totais na tela: desconto em reais e os avisos.
 *
 * Sem teto significa que o app **não trunca** — mas também não deixa passar
 * calado. Estes testes fixam as duas metades disso.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BlocoTotais } from './BlocoTotais';
import { useEditor } from '../estado/editor';
import { configuracaoPadrao } from '../dados/configuracao';
import { ambientePadrao, orcamentoNovo } from '../domain/fabrica';
import type { Orcamento } from '../domain/esquemas';

afterEach(cleanup);

function abrir(extra: Partial<Orcamento> = {}) {
  const base = orcamentoNovo(ambientePadrao, {
    sequencial: 1,
    ano: 2026,
    clienteId: 'c',
    clienteNome: 'Igreja Portal Pérola 2',
    dataEmissao: '2026-08-14',
    condicoesPagamento: '30% ENTRADA, RESTANTE A COMBINAR',
  });
  const orcamento: Orcamento = {
    ...base,
    secoes: [
      {
        id: 's',
        titulo: 'DOS SERVIÇOS A SEREM PRESTADOS',
        linhas: [{ id: 'l', descricao: 'PERGOLADO', quantidade: 1, valorUnitario: 1_000_000 }],
      },
    ],
    entrada: { modo: 'manual', centavos: 0 },
    ...extra,
  };
  useEditor.setState({ orcamento, config: configuracaoPadrao(2026), foco: null, sujo: false });
}

const orcamentoAtual = () => useEditor.getState().orcamento!;

beforeEach(() => abrir());

describe('desconto em reais', () => {
  it('há um único campo, em reais — sem alternância de modo', () => {
    render(<BlocoTotais />);
    expect(screen.getByLabelText('Desconto em reais')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /em %/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/percentual/i)).not.toBeInTheDocument();
  });

  it('aceita valor em pt-BR e guarda em centavos', async () => {
    const usuario = userEvent.setup();
    render(<BlocoTotais />);

    await usuario.clear(screen.getByLabelText('Desconto em reais'));
    await usuario.type(screen.getByLabelText('Desconto em reais'), '1.500,00');
    await usuario.tab();

    expect(orcamentoAtual().desconto).toBe(150_000);
  });

  it('valor inválido vira zero em vez de quebrar', async () => {
    const usuario = userEvent.setup();
    render(<BlocoTotais />);

    await usuario.clear(screen.getByLabelText('Desconto em reais'));
    await usuario.type(screen.getByLabelText('Desconto em reais'), 'abc');
    await usuario.tab();

    expect(orcamentoAtual().desconto).toBe(0);
  });
});

describe('avisos — sem teto, mas não em silêncio', () => {
  it('orçamento normal não mostra aviso nenhum', () => {
    render(<BlocoTotais />);
    expect(screen.queryByText(/passa do total/)).not.toBeInTheDocument();
    expect(screen.queryByText(/negativo/)).not.toBeInTheDocument();
  });

  it('desconto acima do total não é truncado — é avisado', () => {
    abrir({ desconto: 1_500_000 });
    render(<BlocoTotais />);

    // o valor entra inteiro: sem teto
    expect(useEditor.getState().totais()!.desconto).toBe(1_500_000);
    expect(useEditor.getState().totais()!.subTotal).toBe(-500_000);

    // 1.500.000 centavos = R$ 15.000,00; o total é R$ 10.000,00
    expect(
      screen.getByText(/O desconto \(15\.000,00\) passa do total \(10\.000,00\)/),
    ).toBeInTheDocument();
    // sem segundo aviso de "negativo": seria o mesmo problema dito duas vezes
    expect(screen.queryByText(/negativo/i)).not.toBeInTheDocument();
  });

  it('desconto igual ao total zera sem alarme', () => {
    abrir({ desconto: 1_000_000 });
    render(<BlocoTotais />);
    expect(useEditor.getState().totais()!.subTotal).toBe(0);
    expect(screen.queryByText(/passa do total/)).not.toBeInTheDocument();
  });

  it('entrada acima do sub-total também avisa', () => {
    abrir({ entrada: { modo: 'manual', centavos: 1_200_000 } });
    render(<BlocoTotais />);
    expect(screen.getByText(/A entrada .* passa do total a pagar/)).toBeInTheDocument();
  });

  it('o aviso é anunciado para leitor de tela', () => {
    abrir({ desconto: 1_500_000 });
    render(<BlocoTotais />);
    const lista = screen.getByText(/passa do total/).closest('ul');
    expect(lista).toHaveAttribute('aria-live', 'polite');
  });
});

describe('entrada: informa, não abate (D5.1)', () => {
  it('o total a pagar não muda com a entrada — muda o restante', () => {
    abrir({ entrada: { modo: 'sugerida' } });
    render(<BlocoTotais />);

    // R$ 10.000,00 de serviço; a entrada sugerida de 30% não sai do total
    expect(screen.getByText('R$ 10.000,00')).toBeInTheDocument();
    expect(screen.getByLabelText('Entrada')).toHaveValue('3.000,00');
    expect(screen.getByText('Restante após a entrada')).toBeInTheDocument();
    expect(screen.getByText('7.000,00')).toBeInTheDocument();
  });

  it('digitar uma entrada mantém o total e recalcula o restante', async () => {
    const usuario = userEvent.setup();
    abrir({ entrada: { modo: 'sugerida' } });
    render(<BlocoTotais />);

    await usuario.clear(screen.getByLabelText('Entrada'));
    await usuario.type(screen.getByLabelText('Entrada'), '5.000,00');
    await usuario.tab();

    expect(orcamentoAtual().entrada).toEqual({ modo: 'manual', centavos: 500_000 });
    expect(useEditor.getState().totais()!.subTotal).toBe(1_000_000);
    expect(useEditor.getState().totais()!.restante).toBe(500_000);
    expect(screen.getByText('R$ 10.000,00')).toBeInTheDocument();
    expect(screen.getByText('5.000,00')).toBeInTheDocument();
  });

  it('diz na tela que a entrada é só informativa', () => {
    render(<BlocoTotais />);
    expect(screen.getByText(/só informativa/)).toBeInTheDocument();
  });
});
