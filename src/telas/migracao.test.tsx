// @vitest-environment jsdom
/**
 * A oferta de trazer os dados da versao anterior para a nuvem.
 *
 * `migracao-local` e simulado: o que ele le do IndexedDB tem teste proprio.
 * Aqui interessa a regra de quando a oferta aparece e o que ela faz.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Backup } from '../domain/esquemas';

vi.mock('../dados/sessao', async (original) => ({
  ...(await original<typeof import('../dados/sessao')>()),
  useSessao: () => ({ estado: 'dentro', email: 'aamontagens@hotmail.com' }),
  sair: vi.fn(),
}));

vi.mock('../dados/migracao-local', () => ({
  lerBancoLocal: vi.fn(),
  apagarBancoLocal: vi.fn(),
}));

import { App } from '../App';
import { repositorio } from '../dados/repositorio';
import { apagarBancoLocal, lerBancoLocal } from '../dados/migracao-local';
import { orcamentoDaIgreja } from '../dados/contrato';
import { configuracaoPadrao } from '../dados/configuracao';
import { useEditor } from '../estado/editor';

function backupLocal(): Backup {
  const { id: _id, ...configuracao } = configuracaoPadrao(2026);
  return {
    versao: 1,
    exportadoEm: '2026-09-15T00:00:00.000Z',
    configuracao: { ...configuracao, proximoNumero: 3 },
    clientes: [{ id: 'c1', nome: 'Igreja Portal Pérola 2', criadoEm: '2026-08-14T00:00:00.000Z' }],
    servicos: [],
    orcamentos: [orcamentoDaIgreja(), { ...orcamentoDaIgreja(), id: 'o2', numero: '002/2026' }],
  };
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

beforeEach(() => {
  useEditor.setState({ config: null, orcamento: null, foco: null, pedidoDeFoco: null });
  vi.mocked(apagarBancoLocal).mockResolvedValue();
});

function abrirLista() {
  return render(
    <MemoryRouter initialEntries={['/orcamentos']}>
      <App />
    </MemoryRouter>,
  );
}

describe('oferta de migração', () => {
  it('sem banco antigo, não aparece', async () => {
    vi.mocked(lerBancoLocal).mockResolvedValue(null);
    abrirLista();
    await screen.findByText('Nenhum orçamento ainda.');
    expect(screen.queryByText(/Encontrei orçamentos/)).not.toBeInTheDocument();
  });

  it('com a nuvem vazia e dados no aparelho, oferece — e traz tudo de uma vez', async () => {
    const usuario = userEvent.setup();
    vi.mocked(lerBancoLocal).mockResolvedValue(backupLocal());
    abrirLista();

    expect(await screen.findByText(/Encontrei orçamentos guardados/)).toBeInTheDocument();
    expect(screen.getByText(/2 orçamento\(s\)/)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Trazer para a nuvem' }));

    await waitFor(async () => expect(await repositorio.listarOrcamentos()).toHaveLength(2));
    expect(await repositorio.listarClientes()).toHaveLength(1);
    // a numeração vem junto: o próximo é o que a versão anterior deixou
    expect((await repositorio.lerConfiguracao()).proximoNumero).toBe(3);
    // o banco antigo some, para a oferta não voltar
    expect(apagarBancoLocal).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent(/2 orçamento\(s\).*na nuvem/);
  });

  it('com a nuvem já povoada, não oferece (o caminho é o backup por arquivo)', async () => {
    vi.mocked(lerBancoLocal).mockResolvedValue(backupLocal());
    await repositorio.gravarOrcamento({ ...orcamentoDaIgreja(), id: 'ja-na-nuvem' });
    abrirLista();

    await screen.findByText('Igreja Portal Pérola 2');
    expect(screen.queryByText(/Encontrei orçamentos/)).not.toBeInTheDocument();
    expect(lerBancoLocal).not.toHaveBeenCalled();
  });
});
