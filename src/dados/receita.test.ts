/**
 * Consulta de CNPJ e CEP, com `fetch` simulado.
 *
 * Nenhum teste sai para a internet: a suíte tem que rodar offline.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { consultarCep, consultarCnpj, MENSAGEM } from './receita';

/** Resposta da BrasilAPI para o CNPJ da AA Montagens, copiada da resposta real. */
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

function simularFetch(resposta: { status?: number; corpo?: unknown } | Error) {
  const espiao = vi.fn();
  if (resposta instanceof Error) {
    espiao.mockRejectedValue(resposta);
  } else {
    const status = resposta.status ?? 200;
    espiao.mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(resposta.corpo),
    });
  }
  vi.stubGlobal('fetch', espiao);
  return espiao;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('consultarCnpj', () => {
  it('traduz a resposta da Receita para os campos do cliente', async () => {
    simularFetch({ corpo: RESPOSTA_AA });
    const r = await consultarCnpj('66.612.836/0001-55');

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados.razaoSocial).toBe('66.612.836 ANDRE LUIS DE ABREU');
    expect(r.dados.endereco).toBe('JOAO ANTONIO SANCHES, 1085');
    expect(r.dados.cidade).toBe('BIRIGUI');
    expect(r.dados.uf).toBe('SP');
    expect(r.dados.cep).toBe('16202044');
    expect(r.dados.situacao).toBe('ATIVA');
    expect(r.dados.atividade).toBe('Serviços de usinagem, tornearia e solda');
  });

  it('manda só os dígitos para a API', async () => {
    const espiao = simularFetch({ corpo: RESPOSTA_AA });
    await consultarCnpj('66.612.836/0001-55');
    expect(espiao).toHaveBeenCalledWith(
      'https://brasilapi.com.br/api/cnpj/v1/66612836000155',
      expect.anything(),
    );
  });

  it('trata e-mail nulo sem quebrar', async () => {
    simularFetch({ corpo: { ...RESPOSTA_AA, email: null } });
    const r = await consultarCnpj('66612836000155');
    expect(r.ok && r.dados.email).toBe('');
  });

  it('monta o endereço sem número quando a Receita não tem', async () => {
    simularFetch({ corpo: { ...RESPOSTA_AA, numero: '' } });
    const r = await consultarCnpj('66612836000155');
    expect(r.ok && r.dados.endereco).toBe('JOAO ANTONIO SANCHES');
  });

  it('endereço vazio quando não há logradouro', async () => {
    simularFetch({ corpo: { ...RESPOSTA_AA, logradouro: '', numero: '' } });
    const r = await consultarCnpj('66612836000155');
    expect(r.ok && r.dados.endereco).toBe('');
  });

  it('não sai para a rede com CNPJ incompleto', async () => {
    const espiao = simularFetch({ corpo: RESPOSTA_AA });
    const r = await consultarCnpj('66.612.836');
    expect(r).toEqual({ ok: false, motivo: 'documento-invalido' });
    expect(espiao).not.toHaveBeenCalled();
  });

  it('404 vira "não encontrado"', async () => {
    simularFetch({ status: 404 });
    expect(await consultarCnpj('11222333000181')).toEqual({
      ok: false,
      motivo: 'nao-encontrado',
    });
  });

  it('resposta sem razão social também vira "não encontrado"', async () => {
    simularFetch({ corpo: { ...RESPOSTA_AA, razao_social: '' } });
    expect(await consultarCnpj('11222333000181')).toEqual({
      ok: false,
      motivo: 'nao-encontrado',
    });
  });

  it('429 vira "muitas consultas"', async () => {
    simularFetch({ status: 429 });
    expect(await consultarCnpj('66612836000155')).toEqual({
      ok: false,
      motivo: 'muitas-consultas',
    });
  });

  it('500 vira "serviço indisponível"', async () => {
    simularFetch({ status: 500 });
    expect(await consultarCnpj('66612836000155')).toEqual({
      ok: false,
      motivo: 'servico-indisponivel',
    });
  });

  it('sem rede vira "sem conexão" — e não estoura', async () => {
    simularFetch(new TypeError('Failed to fetch'));
    expect(await consultarCnpj('66612836000155')).toEqual({ ok: false, motivo: 'sem-conexao' });
  });

  it('cancelamento por tempo cai em "sem conexão"', async () => {
    simularFetch(new DOMException('The operation was aborted.', 'AbortError'));
    expect(await consultarCnpj('66612836000155')).toEqual({ ok: false, motivo: 'sem-conexao' });
  });
});

describe('consultarCep', () => {
  it('traduz a resposta do CEP', async () => {
    simularFetch({
      corpo: {
        cep: '16202044',
        state: 'SP',
        city: 'Birigüi',
        neighborhood: 'Jardim São Braz',
        street: 'Rua João Antônio Sanches',
      },
    });
    const r = await consultarCep('16202-044');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.dados).toEqual({
      endereco: 'Rua João Antônio Sanches',
      bairro: 'Jardim São Braz',
      cidade: 'Birigüi',
      uf: 'SP',
    });
  });

  it('não sai para a rede com CEP incompleto', async () => {
    const espiao = simularFetch({ corpo: {} });
    expect(await consultarCep('16202')).toEqual({ ok: false, motivo: 'documento-invalido' });
    expect(espiao).not.toHaveBeenCalled();
  });
});

describe('mensagens', () => {
  it('cada motivo tem um texto útil, sem jargão', () => {
    for (const texto of Object.values(MENSAGEM)) {
      expect(texto.length).toBeGreaterThan(10);
      expect(texto).not.toMatch(/erro \d|HTTP|fetch|undefined/i);
    }
  });

  it('a mensagem de falha de rede lembra que dá para preencher à mão', () => {
    expect(MENSAGEM['sem-conexao']).toMatch(/à mão/);
    expect(MENSAGEM['servico-indisponivel']).toMatch(/à mão/);
  });
});
