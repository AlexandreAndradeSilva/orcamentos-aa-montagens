// @vitest-environment jsdom
/**
 * Cadastro do cliente na tela: campos, máscara, busca por CNPJ e o que
 * chega ao banco.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../App';
import { db } from '../dados/db';
import { useEditor } from '../estado/editor';

const RESPOSTA_AA = {
  razao_social: '66.612.836 ANDRE LUIS DE ABREU',
  nome_fantasia: '',
  logradouro: 'JOAO ANTONIO SANCHES',
  numero: '1085',
  complemento: '',
  bairro: 'JARDIM SAO BRAZ',
  municipio: 'BIRIGUI',
  uf: 'SP',
  cep: '16202044',
  ddd_telefone_1: '18998230660',
  email: null,
  descricao_situacao_cadastral: 'ATIVA',
  cnae_fiscal_descricao: 'Serviços de usinagem, tornearia e solda',
};

function simularFetch(corpo: unknown, status = 200) {
  const espiao = vi.fn().mockResolvedValue({
    ok: status < 300,
    status,
    json: () => Promise.resolve(corpo),
  });
  vi.stubGlobal('fetch', espiao);
  return espiao;
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

function abrirNovo() {
  return render(
    <MemoryRouter initialEntries={['/orcamentos/novo']}>
      <App />
    </MemoryRouter>,
  );
}

describe('novo orçamento: cadastro do cliente', () => {
  it('mostra os campos que o PDF imprime', async () => {
    abrirNovo();
    await screen.findByRole('heading', { name: 'Novo orçamento' });

    for (const rotulo of [
      /Cliente \*/,
      /CNPJ ou CPF/,
      /CEP/,
      /Endereço/,
      /Cidade \/ UF/,
      /Telefone/,
      /Pessoa de contato/,
    ]) {
      expect(screen.getByLabelText(rotulo)).toBeInTheDocument();
    }
  });

  it('não pede inscrição estadual nem e-mail — saíram do cadastro', async () => {
    abrirNovo();
    await screen.findByRole('heading', { name: 'Novo orçamento' });
    expect(screen.queryByLabelText(/Inscrição estadual/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/E-mail/)).not.toBeInTheDocument();
  });

  it('exige o nome', async () => {
    const usuario = userEvent.setup();
    abrirNovo();
    await screen.findByRole('heading', { name: 'Novo orçamento' });

    await usuario.click(screen.getByRole('button', { name: 'Criar orçamento' }));

    expect(await screen.findByText('Informe o nome do cliente.')).toBeInTheDocument();
    expect(await db.orcamentos.count()).toBe(0);
  });

  it('grava os dados do cliente junto com o orçamento', async () => {
    const usuario = userEvent.setup();
    abrirNovo();
    await screen.findByRole('heading', { name: 'Novo orçamento' });

    await usuario.type(screen.getByLabelText(/Cliente \*/), 'Igreja Portal Pérola 2');
    await usuario.type(screen.getByLabelText(/CNPJ ou CPF/), '11144477735');
    await usuario.type(screen.getByLabelText(/Endereço/), 'Rua das Flores, 200');
    await usuario.type(screen.getByLabelText(/Pessoa de contato/), 'Pastor Marcelo');
    await usuario.click(screen.getByRole('button', { name: 'Criar orçamento' }));

    await waitFor(async () => expect(await db.clientes.count()).toBe(1));
    const cliente = (await db.clientes.toArray())[0]!;
    expect(cliente.nome).toBe('Igreja Portal Pérola 2');
    expect(cliente.cnpjCpf).toBe('111.444.777-35');
    expect(cliente.endereco).toBe('Rua das Flores, 200');
    expect(cliente.contato).toBe('Pastor Marcelo');
  });

  it('campo vazio não vira string vazia no banco', async () => {
    const usuario = userEvent.setup();
    abrirNovo();
    await screen.findByRole('heading', { name: 'Novo orçamento' });

    await usuario.type(screen.getByLabelText(/Cliente \*/), 'Só o nome');
    await usuario.click(screen.getByRole('button', { name: 'Criar orçamento' }));

    await waitFor(async () => expect(await db.clientes.count()).toBe(1));
    const cliente = (await db.clientes.toArray())[0]!;
    expect(cliente.cnpjCpf).toBeUndefined();
    expect(cliente.email).toBeUndefined();
    expect(cliente.ieRg).toBeUndefined();
  });
});

describe('máscara e validação', () => {
  it('formata CPF e CNPJ enquanto digita', async () => {
    const usuario = userEvent.setup();
    abrirNovo();
    await screen.findByRole('heading', { name: 'Novo orçamento' });

    const campo = screen.getByLabelText(/CNPJ ou CPF/);
    await usuario.type(campo, '11144477735');
    expect(campo).toHaveValue('111.444.777-35');

    await usuario.clear(campo);
    await usuario.type(campo, '66612836000155');
    expect(campo).toHaveValue('66.612.836/0001-55');
  });

  it('acusa dígito verificador errado', async () => {
    const usuario = userEvent.setup();
    abrirNovo();
    await screen.findByRole('heading', { name: 'Novo orçamento' });

    await usuario.type(screen.getByLabelText(/Cliente \*/), 'Fulano');
    await usuario.type(screen.getByLabelText(/CNPJ ou CPF/), '11144477736');
    await usuario.click(screen.getByRole('button', { name: 'Criar orçamento' }));

    expect(await screen.findByText(/Número inválido/)).toBeInTheDocument();
    expect(await db.orcamentos.count()).toBe(0);
  });
});

describe('busca na Receita', () => {
  it('o botão só liga com CNPJ completo', async () => {
    const usuario = userEvent.setup();
    abrirNovo();
    await screen.findByRole('heading', { name: 'Novo orçamento' });

    const buscar = screen.getAllByRole('button', { name: 'Buscar' })[0]!;
    expect(buscar).toBeDisabled();

    await usuario.type(screen.getByLabelText(/CNPJ ou CPF/), '66612836000155');
    expect(buscar).toBeEnabled();
  });

  it('CPF não habilita a busca — não existe consulta pública', async () => {
    const usuario = userEvent.setup();
    abrirNovo();
    await screen.findByRole('heading', { name: 'Novo orçamento' });

    await usuario.type(screen.getByLabelText(/CNPJ ou CPF/), '11144477735');

    expect(screen.getAllByRole('button', { name: 'Buscar' })[0]!).toBeDisabled();
    expect(screen.getByText(/CPF não tem consulta pública/)).toBeInTheDocument();
  });

  it('preenche os campos vazios com o que veio da Receita', async () => {
    simularFetch(RESPOSTA_AA);
    const usuario = userEvent.setup();
    abrirNovo();
    await screen.findByRole('heading', { name: 'Novo orçamento' });

    await usuario.type(screen.getByLabelText(/CNPJ ou CPF/), '66612836000155');
    await usuario.click(screen.getAllByRole('button', { name: 'Buscar' })[0]!);

    await waitFor(() =>
      expect(screen.getByLabelText(/Endereço/)).toHaveValue('JOAO ANTONIO SANCHES, 1085'),
    );
    expect(screen.getByLabelText(/Cidade \/ UF/)).toHaveValue('BIRIGUI/SP');
    expect(screen.getByLabelText(/^CEP/)).toHaveValue('16202-044');
    expect(screen.getByLabelText(/Telefone/)).toHaveValue('(18) 99823-0660');
    expect(screen.getByText(/ANDRE LUIS DE ABREU/)).toBeInTheDocument();
  });

  it('não sobrescreve o que a pessoa já digitou', async () => {
    simularFetch(RESPOSTA_AA);
    const usuario = userEvent.setup();
    abrirNovo();
    await screen.findByRole('heading', { name: 'Novo orçamento' });

    await usuario.type(screen.getByLabelText(/Endereço/), 'Endereço da obra, 42');
    await usuario.type(screen.getByLabelText(/CNPJ ou CPF/), '66612836000155');
    await usuario.click(screen.getAllByRole('button', { name: 'Buscar' })[0]!);

    await waitFor(() => expect(screen.getByLabelText(/Cidade \/ UF/)).toHaveValue('BIRIGUI/SP'));
    expect(screen.getByLabelText(/Endereço/)).toHaveValue('Endereço da obra, 42');
  });

  it('sem internet, avisa e deixa preencher à mão', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const usuario = userEvent.setup();
    abrirNovo();
    await screen.findByRole('heading', { name: 'Novo orçamento' });

    await usuario.type(screen.getByLabelText(/CNPJ ou CPF/), '66612836000155');
    await usuario.click(screen.getAllByRole('button', { name: 'Buscar' })[0]!);

    expect(await screen.findByText(/Sem internet/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Endereço/)).toBeEnabled();
  });

  it('CNPJ inexistente avisa sem quebrar', async () => {
    simularFetch(null, 404);
    const usuario = userEvent.setup();
    abrirNovo();
    await screen.findByRole('heading', { name: 'Novo orçamento' });

    await usuario.type(screen.getByLabelText(/CNPJ ou CPF/), '11222333000181');
    await usuario.click(screen.getAllByRole('button', { name: 'Buscar' })[0]!);

    expect(await screen.findByText(/Não encontrei esse CNPJ/)).toBeInTheDocument();
  });
});

describe('clientes: editar cadastro', () => {
  it('abre o formulário e grava a alteração', async () => {
    const usuario = userEvent.setup();
    await db.clientes.put({
      id: 'c1',
      nome: 'Oficina Vale Verde',
      criadoEm: '2026-09-09T12:00:00.000Z',
    });

    render(
      <MemoryRouter initialEntries={['/clientes']}>
        <App />
      </MemoryRouter>,
    );

    await screen.findByText('Oficina Vale Verde');
    await usuario.click(screen.getByRole('button', { name: /Editar o cliente/ }));

    const contato = await screen.findByLabelText(/Pessoa de contato/);
    await usuario.type(contato, 'Dona Regina');
    await usuario.click(screen.getByRole('button', { name: 'Salvar cliente' }));

    await waitFor(async () => expect((await db.clientes.get('c1'))?.contato).toBe('Dona Regina'));
  });
});
