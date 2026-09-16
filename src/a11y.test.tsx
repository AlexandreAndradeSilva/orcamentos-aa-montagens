// @vitest-environment jsdom
/**
 * Acessibilidade conferida por ferramenta, não por inspeção.
 *
 * Roda o axe-core sobre cada tela montada de verdade, no perfil WCAG 2.1 AA.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import axe, { type Result } from 'axe-core';
import { App } from './App';
import { repositorio } from './dados/repositorio';
import { useEditor } from './estado/editor';
import { orcamentoNovo, ambientePadrao } from './domain/fabrica';

// A porta do app: nestes testes a sessao ja esta aberta. O login tem teste
// proprio (entrar.test.tsx); as regras, o emulador.
vi.mock('./dados/sessao', async (original) => ({
  ...(await original<typeof import('./dados/sessao')>()),
  useSessao: () => ({ estado: 'dentro', email: 'aamontagens@hotmail.com' }),
  sair: vi.fn(),
}));

afterEach(cleanup);

beforeEach(() => {
  useEditor.setState({ config: null, orcamento: null, foco: null, sujo: false });
});

/** Descreve as violações de um jeito que dá para consertar. */
function descrever(violacoes: Result[]): string {
  return violacoes
    .map((v) => {
      const onde = v.nodes.map((n) => n.html.slice(0, 120)).join('\n      ');
      return `[${v.impact}] ${v.id}: ${v.help}\n      ${onde}`;
    })
    .join('\n');
}

async function auditar(container: HTMLElement): Promise<Result[]> {
  const resultado = await axe.run(container, {
    runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
    // O contraste é conferido por tools/contraste.py sobre os tokens; o jsdom
    // não calcula cor computada e o axe daria falso negativo aqui.
    rules: { 'color-contrast': { enabled: false } },
  });
  return resultado.violations;
}

function montar(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <App />
    </MemoryRouter>,
  );
}

describe('acessibilidade (axe-core, WCAG 2.1 AA)', () => {
  it('lista de orçamentos, vazia', async () => {
    const { container } = montar('/orcamentos');
    await screen.findByText('Nenhum orçamento ainda.');
    const v = await auditar(container);
    expect(descrever(v)).toBe('');
  }, 30_000);

  it('lista de orçamentos, com registros', async () => {
    const o = orcamentoNovo(ambientePadrao, {
      sequencial: 1,
      ano: 2026,
      clienteId: 'c1',
      clienteNome: 'Igreja Portal Pérola 2',
      dataEmissao: '2026-08-14',
      condicoesPagamento: '30% ENTRADA, RESTANTE A COMBINAR',
    });
    await repositorio.gravarOrcamento(o);

    const { container } = montar('/orcamentos');
    await screen.findByText('Igreja Portal Pérola 2');
    const v = await auditar(container);
    expect(descrever(v)).toBe('');
  }, 30_000);

  it('editor do orçamento, com a grade densa', async () => {
    const o = orcamentoNovo(ambientePadrao, {
      sequencial: 1,
      ano: 2026,
      clienteId: 'c1',
      clienteNome: 'Igreja Portal Pérola 2',
      dataEmissao: '2026-08-14',
      condicoesPagamento: '30% ENTRADA, RESTANTE A COMBINAR',
    });
    await repositorio.gravarOrcamento(o);

    const { container } = montar(`/orcamentos/${o.id}`);
    await screen.findByRole('heading', { name: /Orçamento 001\/2026/ });
    const v = await auditar(container);
    expect(descrever(v)).toBe('');
  }, 30_000);

  it('novo orçamento', async () => {
    const { container } = montar('/orcamentos/novo');
    await screen.findByRole('heading', { name: 'Novo orçamento' });
    const v = await auditar(container);
    expect(descrever(v)).toBe('');
  }, 30_000);

  it('configurações', async () => {
    const { container } = montar('/configuracoes');
    await waitFor(() => expect(screen.getByDisplayValue('66.612.836/0001-55')).toBeInTheDocument());
    const v = await auditar(container);
    expect(descrever(v)).toBe('');
  }, 30_000);

  it('clientes', async () => {
    const { container } = montar('/clientes');
    await screen.findByRole('heading', { name: 'Clientes' });
    const v = await auditar(container);
    expect(descrever(v)).toBe('');
  }, 30_000);

  it('serviços', async () => {
    const { container } = montar('/servicos');
    await screen.findByRole('heading', { name: 'Serviços' });
    const v = await auditar(container);
    expect(descrever(v)).toBe('');
  }, 30_000);
});
