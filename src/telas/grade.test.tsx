// @vitest-environment jsdom
/**
 * O contrato de teclado da grade, testado como contrato.
 *
 * Quem usa isso vem do Excel. Se Enter parar de criar linha ou Ctrl+D parar de
 * duplicar, o app deixa de servir — e isso não pode passar despercebido.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GradeItens } from './GradeItens';
import { useEditor } from '../estado/editor';
import { configuracaoPadrao } from '../dados/db';
import { ambientePadrao, orcamentoNovo } from '../domain/fabrica';

afterEach(cleanup);

function abrirComItens() {
  const orcamento = orcamentoNovo(ambientePadrao, {
    sequencial: 1,
    ano: 2026,
    clienteId: 'c',
    clienteNome: 'Igreja Portal Pérola 2',
    dataEmissao: '2026-08-14',
    condicoesPagamento: '30% ENTRADA, RESTANTE A COMBINAR',
  });
  useEditor.setState({
    orcamento,
    config: configuracaoPadrao(2026),
    foco: null,
    sujo: false,
  });
}

beforeEach(abrirComItens);

const secoes = () => useEditor.getState().orcamento!.secoes;
const linhas = () => secoes()[0]!.linhas;

describe('teclado da grade', () => {
  it('Enter cria uma linha abaixo', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);
    expect(linhas()).toHaveLength(1);

    await usuario.click(screen.getByLabelText('Descrição do item 1.1'));
    await usuario.keyboard('{Enter}');

    expect(linhas()).toHaveLength(2);
    expect(useEditor.getState().foco).toEqual({ secao: 0, linha: 1, coluna: 'descricao' });
  });

  it('Ctrl+D duplica a linha, com id novo', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);
    useEditor.getState().alterarLinha(0, 0, {
      descricao: 'PERGOLADO GARAGEM',
      quantidade: 2,
      valorUnitario: 150_000,
    });

    await usuario.click(screen.getByLabelText('Descrição do item 1.1'));
    await usuario.keyboard('{Control>}d{/Control}');

    expect(linhas()).toHaveLength(2);
    expect(linhas()[1]).toMatchObject({
      descricao: 'PERGOLADO GARAGEM',
      quantidade: 2,
      valorUnitario: 150_000,
    });
    expect(linhas()[1]!.id).not.toBe(linhas()[0]!.id);
  });

  it('Ctrl+Enter cria uma seção', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);
    expect(secoes()).toHaveLength(1);

    await usuario.click(screen.getByLabelText('Descrição do item 1.1'));
    await usuario.keyboard('{Control>}{Enter}{/Control}');

    expect(secoes()).toHaveLength(2);
  });

  it('Alt+seta move a linha de lugar', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);
    useEditor.getState().alterarLinha(0, 0, { descricao: 'PRIMEIRA' });
    useEditor.getState().novaLinha(0);
    useEditor.getState().alterarLinha(0, 1, { descricao: 'SEGUNDA' });

    // consulta assíncrona: a linha nova só aparece depois do re-render
    await usuario.click(await screen.findByLabelText('Descrição do item 1.2'));
    await usuario.keyboard('{Alt>}{ArrowUp}{/Alt}');

    expect(linhas().map((l) => l.descricao)).toEqual(['SEGUNDA', 'PRIMEIRA']);
  });

  it('setas navegam entre linhas mantendo a coluna', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);
    useEditor.getState().novaLinha(0);

    await usuario.click(screen.getByLabelText('Quantidade do item 1.1'));
    await usuario.keyboard('{ArrowDown}');

    expect(useEditor.getState().foco).toEqual({ secao: 0, linha: 1, coluna: 'quantidade' });
  });

  it('colar da planilha distribui as colunas', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    const bloco = [
      'PERGOLADO GARAGEM COM DOBRAS\t1\tUNID.\t15.000,00',
      'FACHADA ALTA\t3,5\tM²\t187,33',
    ].join('\n');

    const celula = screen.getByLabelText('Descrição do item 1.1');
    await usuario.click(celula);
    await usuario.paste(bloco);

    expect(linhas()).toHaveLength(2);
    expect(linhas()[0]).toMatchObject({
      descricao: 'PERGOLADO GARAGEM COM DOBRAS',
      quantidade: 1,
      unidade: 'UNID.',
      valorUnitario: 1_500_000,
    });
    expect(linhas()[1]).toMatchObject({
      descricao: 'FACHADA ALTA',
      quantidade: 3.5,
      unidade: 'M²',
      valorUnitario: 18_733,
    });
  });

  it('colar texto simples não é interceptado', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    const celula = screen.getByLabelText('Descrição do item 1.1');
    await usuario.click(celula);
    await usuario.paste('PERGOLADO PISCINA');

    expect(linhas()).toHaveLength(1);
    expect(linhas()[0]!.descricao).toBe('PERGOLADO PISCINA');
  });

  it('valor digitado em pt-BR vira centavos ao sair da célula', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Valor unitário do item 1.1'));
    await usuario.keyboard('25.600,00');
    await usuario.tab();

    expect(linhas()[0]!.valorUnitario).toBe(2_560_000);
  });

  it('valor inválido não quebra a célula, apenas esvazia', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Valor unitário do item 1.1'));
    await usuario.keyboard('abc');
    await usuario.tab();

    expect(linhas()[0]!.valorUnitario).toBeUndefined();
  });

  it('todas as células da grade são alcançáveis por teclado', () => {
    render(<GradeItens />);
    const rotulos = [
      'Descrição do item 1.1',
      'Quantidade do item 1.1',
      'Unidade do item 1.1',
      'Valor unitário do item 1.1',
    ];
    for (const rotulo of rotulos) {
      const campo = screen.getByLabelText(rotulo);
      expect(campo.tabIndex).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('preço fechado pelo teclado e pelo mouse', () => {
  it('a caixa liga e desliga o bloco', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    const caixa = screen.getByRole('checkbox', { name: /preço fechado/i });
    await usuario.click(caixa);
    expect(secoes()[0]!.precoFechado).toBe(0);

    await usuario.click(caixa);
    expect(secoes()[0]!.precoFechado).toBeUndefined();
  });
});
