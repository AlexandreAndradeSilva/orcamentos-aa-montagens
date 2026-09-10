// @vitest-environment jsdom
/**
 * Sugestões do catálogo na célula de descrição.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GradeItens } from './GradeItens';
import { filtrarServicos, type ServicoSugerido } from './sugestoes';
import { useEditor } from '../estado/editor';
import { configuracaoPadrao, db } from '../dados/db';
import { ambientePadrao, orcamentoNovo } from '../domain/fabrica';

afterEach(cleanup);

const CATALOGO = [
  {
    id: 'sv1',
    descricao: 'PÉRGOLA DE GARAGEM COM DOBRAS EM CHAPA 16 (1,5MM)',
    unidade: 'UNID.',
    valorReferencia: 480_000,
    usos: 9,
    usadoEm: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 'sv2',
    descricao: 'COBERTURA EM TELHA TRAPÉZIO SANDUÍCHE',
    unidade: 'M²',
    valorReferencia: 18_733,
    usos: 5,
    usadoEm: '2026-09-02T00:00:00.000Z',
  },
  {
    id: 'sv3',
    descricao: 'PORTÃO DE CORRER EM CHAPA 16',
    unidade: 'UNID.',
    usos: 2,
    usadoEm: '2026-09-03T00:00:00.000Z',
  },
];

beforeEach(async () => {
  await db.servicos.clear();
  await db.servicos.bulkPut(CATALOGO);
  useEditor.setState({
    orcamento: orcamentoNovo(ambientePadrao, {
      sequencial: 1,
      ano: 2026,
      clienteId: 'c',
      clienteNome: 'Igreja Portal Pérola 2',
      dataEmissao: '2026-08-14',
      condicoesPagamento: '30% ENTRADA, RESTANTE A COMBINAR',
    }),
    config: configuracaoPadrao(2026),
    foco: null,
    pedidoDeFoco: null,
    sujo: false,
  });
});

const linha0 = () => useEditor.getState().orcamento!.secoes[0]!.linhas[0]!;

describe('filtrarServicos', () => {
  const lista: ServicoSugerido[] = CATALOGO;

  it('ignora acento e caixa', () => {
    expect(filtrarServicos(lista, 'pergola')).toHaveLength(1);
    expect(filtrarServicos(lista, 'PERGOLA')[0]?.id).toBe('sv1');
    expect(filtrarServicos(lista, 'trapezio')[0]?.id).toBe('sv2');
  });

  it('acha no meio da descrição', () => {
    expect(filtrarServicos(lista, 'chapa 16').map((s) => s.id)).toEqual(['sv1', 'sv3']);
  });

  it('não sugere com menos de duas letras', () => {
    expect(filtrarServicos(lista, 'p')).toHaveLength(0);
    expect(filtrarServicos(lista, '')).toHaveLength(0);
  });

  it('não sugere o que já está escrito por inteiro', () => {
    expect(filtrarServicos(lista, 'PORTÃO DE CORRER EM CHAPA 16')).toHaveLength(0);
  });

  it('devolve no máximo seis', () => {
    const muitos = Array.from({ length: 20 }, (_, i) => ({
      id: `x${i}`,
      descricao: `PERGOLADO MODELO ${i}`,
    }));
    expect(filtrarServicos(muitos, 'pergolado')).toHaveLength(6);
  });
});

describe('na grade', () => {
  it('sugere enquanto digita', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Descrição do item 1.1'));
    await usuario.keyboard('pergola');

    const lista = await screen.findByRole('listbox', { name: 'Serviços já orçados' });
    expect(lista).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /PÉRGOLA DE GARAGEM/ })).toBeInTheDocument();
  });

  it('escolher com clique traz descrição, unidade e valor', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Descrição do item 1.1'));
    await usuario.keyboard('pergola');
    await usuario.click(await screen.findByRole('option', { name: /PÉRGOLA DE GARAGEM/ }));

    expect(linha0().descricao).toBe('PÉRGOLA DE GARAGEM COM DOBRAS EM CHAPA 16 (1,5MM)');
    expect(linha0().unidade).toBe('UNID.');
    expect(linha0().valorUnitario).toBe(480_000);
    expect(linha0().quantidade).toBe(1);
  });

  it('escolher pelo teclado: seta e Enter', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Descrição do item 1.1'));
    await usuario.keyboard('chapa 16');
    await screen.findByRole('listbox', { name: 'Serviços já orçados' });

    // primeira opção é a PÉRGOLA; a seta desce para o PORTÃO
    await usuario.keyboard('{ArrowDown}{Enter}');

    expect(linha0().descricao).toBe('PORTÃO DE CORRER EM CHAPA 16');
    expect(linha0().unidade).toBe('UNID.');
  });

  it('Enter com a lista aberta escolhe, e não cria linha nova', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Descrição do item 1.1'));
    await usuario.keyboard('pergola');
    await screen.findByRole('listbox', { name: 'Serviços já orçados' });
    await usuario.keyboard('{Enter}');

    expect(useEditor.getState().orcamento!.secoes[0]!.linhas).toHaveLength(1);
  });

  it('Enter sem lista aberta continua criando linha', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Descrição do item 1.1'));
    await usuario.keyboard('zzz nada parecido');
    await usuario.keyboard('{Enter}');

    expect(useEditor.getState().orcamento!.secoes[0]!.linhas).toHaveLength(2);
  });

  it('Esc fecha a lista sem escolher', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Descrição do item 1.1'));
    await usuario.keyboard('pergola');
    await screen.findByRole('listbox', { name: 'Serviços já orçados' });
    await usuario.keyboard('{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(linha0().descricao).toBe('pergola');
  });

  it('não sobrescreve valor que a pessoa já digitou', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    useEditor.getState().alterarLinha(0, 0, { valorUnitario: 999_900, unidade: 'VB' });

    await usuario.click(screen.getByLabelText('Descrição do item 1.1'));
    await usuario.keyboard('pergola');
    await usuario.click(await screen.findByRole('option', { name: /PÉRGOLA DE GARAGEM/ }));

    expect(linha0().descricao).toBe('PÉRGOLA DE GARAGEM COM DOBRAS EM CHAPA 16 (1,5MM)');
    expect(linha0().valorUnitario).toBe(999_900);
    expect(linha0().unidade).toBe('VB');
  });

  it('a lista mostra unidade e último valor', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    await usuario.click(screen.getByLabelText('Descrição do item 1.1'));
    await usuario.keyboard('trapezio');

    const opcao = await screen.findByRole('option', { name: /COBERTURA EM TELHA/ });
    expect(opcao).toHaveTextContent('M²');
    expect(opcao).toHaveTextContent('187,33');
  });

  it('o campo se declara combobox para o leitor de tela', async () => {
    const usuario = userEvent.setup();
    render(<GradeItens />);

    const campo = screen.getByLabelText('Descrição do item 1.1');
    expect(campo).toHaveAttribute('role', 'combobox');
    expect(campo).toHaveAttribute('aria-expanded', 'false');

    await usuario.click(campo);
    await usuario.keyboard('pergola');
    await screen.findByRole('listbox', { name: 'Serviços já orçados' });

    expect(campo).toHaveAttribute('aria-expanded', 'true');
    expect(campo.getAttribute('aria-activedescendant')).toBeTruthy();
  });
});
