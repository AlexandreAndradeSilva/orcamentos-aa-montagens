// @vitest-environment jsdom
/**
 * Foco na grade: sair da célula tem que funcionar.
 *
 * Bug relatado: ao chegar na quantidade, o foco fica preso — não dá para
 * voltar à descrição nem seguir para a unidade.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GradeItens } from './GradeItens';
import { useEditor } from '../estado/editor';
import { configuracaoPadrao } from '../dados/configuracao';
import { ambientePadrao, orcamentoNovo } from '../domain/fabrica';

afterEach(cleanup);

beforeEach(() => {
  const orcamento = orcamentoNovo(ambientePadrao, {
    sequencial: 1,
    ano: 2026,
    clienteId: 'c',
    clienteNome: 'Igreja Portal Pérola 2',
    dataEmissao: '2026-08-14',
    condicoesPagamento: '30% ENTRADA, RESTANTE A COMBINAR',
  });
  useEditor.setState({ orcamento, config: configuracaoPadrao(2026), foco: null, sujo: false });
});

describe('sair da célula de quantidade', () => {
  it('Tab leva da quantidade para a unidade', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Descrição do item 1.1'));
    await usuario.keyboard('PERGOLADO GARAGEM');
    await usuario.tab();

    expect(screen.getByLabelText('Quantidade do item 1.1')).toHaveFocus();

    await usuario.keyboard('2');
    await usuario.tab();

    expect(screen.getByLabelText('Unidade do item 1.1')).toHaveFocus();
  });

  it('dá para voltar da quantidade para a descrição com o mouse', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Quantidade do item 1.1'));
    await usuario.keyboard('3');
    await usuario.click(screen.getByLabelText('Descrição do item 1.1'));

    expect(screen.getByLabelText('Descrição do item 1.1')).toHaveFocus();
  });

  it('a descrição continua editável depois de mexer na quantidade', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Quantidade do item 1.1'));
    await usuario.keyboard('2');
    await usuario.click(screen.getByLabelText('Descrição do item 1.1'));
    await usuario.keyboard('FACHADA ALTA');

    expect(useEditor.getState().orcamento!.secoes[0]!.linhas[0]!.descricao).toBe('FACHADA ALTA');
  });

  it('Shift+Tab volta da quantidade para a descrição', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Quantidade do item 1.1'));
    await usuario.keyboard('5');
    await usuario.tab({ shift: true });

    expect(screen.getByLabelText('Descrição do item 1.1')).toHaveFocus();
  });

  it('Tab atravessa a linha inteira: descrição, quantidade, unidade, valor', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Descrição do item 1.1'));
    await usuario.tab();
    expect(screen.getByLabelText('Quantidade do item 1.1')).toHaveFocus();
    await usuario.tab();
    expect(screen.getByLabelText('Unidade do item 1.1')).toHaveFocus();
    await usuario.tab();
    expect(screen.getByLabelText('Valor unitário do item 1.1')).toHaveFocus();
  });

  it('o valor digitado é guardado ao sair, sem prender o foco', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Valor unitário do item 1.1'));
    await usuario.keyboard('1.500,00');
    await usuario.tab();

    expect(useEditor.getState().orcamento!.secoes[0]!.linhas[0]!.valorUnitario).toBe(150_000);
    expect(screen.getByLabelText('Valor unitário do item 1.1')).not.toHaveFocus();
  });
});
