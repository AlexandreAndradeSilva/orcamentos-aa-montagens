// @vitest-environment jsdom
/**
 * Dados de exemplo: pelo botão do estado vazio e pelo `?exemplo` na URL.
 *
 * A regra que importa: só entram com o banco vazio. Um link de demonstração
 * jamais pode atropelar orçamento de verdade.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { db } from '../dados/db';
import { useEditor } from '../estado/editor';
import { ambientePadrao, orcamentoNovo } from '../domain/fabrica';

const BACKUP = readFileSync(resolve(process.cwd(), 'public/backup-exemplo.json'), 'utf8');

function simularArquivoDeExemplo() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok: true, status: 200, text: () => Promise.resolve(BACKUP) }),
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

beforeEach(async () => {
  await Promise.all([
    db.configuracao.clear(),
    db.clientes.clear(),
    db.servicos.clear(),
    db.orcamentos.clear(),
  ]);
  useEditor.setState({ config: null, orcamento: null, foco: null, pedidoDeFoco: null });
});

describe('dados de exemplo', () => {
  it('o botão do estado vazio importa os dois orçamentos', async () => {
    simularArquivoDeExemplo();
    const usuario = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/orcamentos']}>
        <App />
      </MemoryRouter>,
    );

    await usuario.click(await screen.findByRole('button', { name: 'Ver com dados de exemplo' }));

    expect(await screen.findByText('Igreja Portal Pérola 2')).toBeInTheDocument();
    expect(await db.orcamentos.count()).toBe(2);
  });

  it('?exemplo carrega quando o banco está vazio', async () => {
    simularArquivoDeExemplo();
    render(
      <MemoryRouter initialEntries={['/orcamentos?exemplo']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Oficina Vale Verde')).toBeInTheDocument();
    expect(await db.orcamentos.count()).toBe(2);
  });

  it('?exemplo NÃO mexe em nada quando já há orçamentos', async () => {
    const espiao = vi.fn();
    vi.stubGlobal('fetch', espiao);
    const meu = orcamentoNovo(ambientePadrao, {
      sequencial: 7,
      ano: 2026,
      clienteId: 'c',
      clienteNome: 'Cliente de verdade',
      dataEmissao: '2026-09-12',
      condicoesPagamento: 'à vista',
    });
    await db.orcamentos.put(meu);

    render(
      <MemoryRouter initialEntries={['/orcamentos?exemplo']}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByText('Cliente de verdade');
    await waitFor(async () => expect(await db.orcamentos.count()).toBe(1));
    expect(espiao).not.toHaveBeenCalled();
    expect(screen.queryByText('Oficina Vale Verde')).not.toBeInTheDocument();
  });

  it('o botão de exemplo só aparece com o banco vazio', async () => {
    await db.orcamentos.put(
      orcamentoNovo(ambientePadrao, {
        sequencial: 1,
        ano: 2026,
        clienteId: 'c',
        clienteNome: 'Alguém',
        dataEmissao: '2026-01-01',
        condicoesPagamento: '',
      }),
    );
    render(
      <MemoryRouter initialEntries={['/orcamentos']}>
        <App />
      </MemoryRouter>,
    );
    await screen.findByText('Alguém');
    expect(
      screen.queryByRole('button', { name: 'Ver com dados de exemplo' }),
    ).not.toBeInTheDocument();
  });
});
