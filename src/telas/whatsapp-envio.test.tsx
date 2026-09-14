// @vitest-environment jsdom
/**
 * Enviar no WhatsApp: PDF junto, do jeito que a plataforma permitir.
 *
 * Celular: folha de compartilhamento com o arquivo.
 * Computador: baixa o PDF e abre a conversa com o texto.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { db } from '../dados/db';
import { useEditor } from '../estado/editor';
import { ambientePadrao, orcamentoNovo } from '../domain/fabrica';

// O PDF de verdade precisa das fontes por HTTP, que o jsdom não serve.
// Aqui só importa que um Blob de PDF chegue ao compartilhamento.
vi.mock('@react-pdf/renderer', async (original) => ({
  ...(await original<typeof import('@react-pdf/renderer')>()),
  pdf: () => ({
    toBlob: () => Promise.resolve(new Blob(['%PDF-falso'], { type: 'application/pdf' })),
  }),
}));

// O primeiro clique carrega o @react-pdf por import dinamico (1,2 MB). Sob a
// carga da suite inteira isso passa de 1 s; a folga abaixo e por isso.
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

async function abrirEditor(telefone?: string) {
  const o = novo();
  await db.clientes.put({
    id: o.clienteId,
    nome: o.clienteNome,
    ...(telefone ? { telefone } : {}),
    criadoEm: '2026-09-09T12:00:00.000Z',
  });
  await db.orcamentos.put(o);
  render(
    <MemoryRouter initialEntries={[`/orcamentos/${o.id}`]}>
      <App />
    </MemoryRouter>,
  );
  return screen.findByRole('button', { name: 'Enviar no WhatsApp' });
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

beforeEach(async () => {
  await Promise.all([db.configuracao.clear(), db.clientes.clear(), db.orcamentos.clear()]);
  useEditor.setState({ config: null, orcamento: null, foco: null, pedidoDeFoco: null });
  URL.createObjectURL = vi.fn(() => 'blob:falso');
  URL.revokeObjectURL = vi.fn();
});

describe('no celular (folha de compartilhamento com arquivo)', () => {
  it('compartilha o PDF com o resumo como texto', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });

    const usuario = userEvent.setup();
    await usuario.click(await abrirEditor('(18) 99712-4455'));

    await waitFor(() => expect(share).toHaveBeenCalledTimes(1), { timeout: 10_000 });
    const dados = share.mock.calls[0]![0] as ShareData;
    expect(dados.files).toHaveLength(1);
    expect(dados.files![0]!.name).toBe('orcamento-001-2026-igreja-portal-perola-2.pdf');
    expect(dados.files![0]!.type).toBe('application/pdf');
    expect(dados.text).toContain('Orçamento 001/2026');
    expect(dados.text).toContain('Igreja Portal Pérola 2');
    expect(dados.title).toBe('Orçamento 001/2026');
  });

  it('fechar a folha não é erro', async () => {
    const abortado = new Error('cancelado');
    abortado.name = 'AbortError';
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(abortado),
      configurable: true,
    });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });

    const usuario = userEvent.setup();
    const botao = await abrirEditor('(18) 99712-4455');
    await usuario.click(botao);

    await waitFor(() => expect(botao).toBeEnabled(), { timeout: 10_000 });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('no computador (sem folha com arquivo)', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  });

  it('baixa o PDF e abre a conversa com o cliente', async () => {
    const abrir = vi.fn();
    vi.stubGlobal('open', abrir);
    const clique = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    const usuario = userEvent.setup();
    await usuario.click(await abrirEditor('(18) 99712-4455'));

    await waitFor(() => expect(abrir).toHaveBeenCalledTimes(1), { timeout: 10_000 });
    expect(clique).toHaveBeenCalled();
    const url = abrir.mock.calls[0]![0] as string;
    expect(url).toMatch(/^https:\/\/wa\.me\/5518997124455\?text=/);
    // (nao por role=status: o <output> do A PAGAR tambem tem esse papel)
    expect(await screen.findByText(/PDF baixado/)).toBeInTheDocument();
  });

  it('sem telefone do cliente, abre o WhatsApp para escolher o contato', async () => {
    const abrir = vi.fn();
    vi.stubGlobal('open', abrir);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const usuario = userEvent.setup();
    await usuario.click(await abrirEditor());

    await waitFor(() => expect(abrir).toHaveBeenCalledTimes(1), { timeout: 10_000 });
    expect(abrir.mock.calls[0]![0]).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it('nunca manda para o número da própria AA Montagens', async () => {
    const abrir = vi.fn();
    vi.stubGlobal('open', abrir);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const usuario = userEvent.setup();
    await usuario.click(await abrirEditor('(18) 99712-4455'));

    await waitFor(() => expect(abrir).toHaveBeenCalled(), { timeout: 10_000 });
    const url = abrir.mock.calls[0]![0] as string;
    expect(url).not.toContain('5518998230660');
    expect(url).not.toContain('5518997882819');
  });
});
