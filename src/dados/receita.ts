/**
 * Consulta de CNPJ e CEP na BrasilAPI.
 *
 * É o único ponto do app que fala com a internet, e é **opcional**: falhou,
 * a pessoa preenche à mão e nada trava. O app continua funcionando offline.
 *
 * Não existe consulta de CPF — e não é limitação da BrasilAPI. Não há
 * cadastro público de pessoa física por CPF no Brasil, e não deveria haver:
 * é dado pessoal protegido pela LGPD. Cliente pessoa física se preenche à mão.
 *
 * Privacidade: consultar um CNPJ envia esse número para a BrasilAPI. CNPJ é
 * registro público, então é aceitável — mas fica dito.
 */

const BASE = 'https://brasilapi.com.br/api';
const TEMPO_LIMITE_MS = 8000;

export interface DadosCnpj {
  razaoSocial: string;
  nomeFantasia: string;
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone: string;
  email: string;
  /** "ATIVA", "BAIXADA"... vale avisar quando não está ativa. */
  situacao: string;
  atividade: string;
}

export interface DadosCep {
  endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export type Motivo =
  | 'documento-invalido'
  | 'nao-encontrado'
  | 'muitas-consultas'
  | 'sem-conexao'
  | 'servico-indisponivel';

export type Resultado<T> = { ok: true; dados: T } | { ok: false; motivo: Motivo };

/** Mensagem pronta para a tela, em português de gente. */
export const MENSAGEM: Record<Motivo, string> = {
  'documento-invalido': 'Número incompleto ou inválido.',
  'nao-encontrado': 'Não encontrei esse CNPJ na Receita. Confira o número ou preencha à mão.',
  'muitas-consultas': 'Muitas consultas seguidas. Espere um instante e tente de novo.',
  'sem-conexao': 'Sem internet. Dá para preencher à mão normalmente.',
  'servico-indisponivel': 'A consulta está fora do ar. Preencha à mão por enquanto.',
};

async function buscar(url: string): Promise<Resultado<unknown>> {
  const cancelador = new AbortController();
  const relogio = setTimeout(() => cancelador.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(url, { signal: cancelador.signal });
    if (resposta.status === 404) return { ok: false, motivo: 'nao-encontrado' };
    if (resposta.status === 429) return { ok: false, motivo: 'muitas-consultas' };
    if (!resposta.ok) return { ok: false, motivo: 'servico-indisponivel' };
    return { ok: true, dados: (await resposta.json()) as unknown };
  } catch {
    // aborto por tempo e falha de rede caem no mesmo lugar: sem resposta
    return { ok: false, motivo: 'sem-conexao' };
  } finally {
    clearTimeout(relogio);
  }
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : '';
}

/** Junta logradouro e número como a AA Montagens escreve: "RUA X, 1085". */
function montarEndereco(logradouro: unknown, numero: unknown, complemento: unknown): string {
  const rua = texto(logradouro);
  const num = texto(numero);
  const comp = texto(complemento);
  if (rua === '') return '';
  return [num === '' ? rua : `${rua}, ${num}`, comp].filter((p) => p !== '').join(' — ');
}

export async function consultarCnpj(cnpj: string): Promise<Resultado<DadosCnpj>> {
  const digitos = cnpj.replace(/\D/g, '');
  if (digitos.length !== 14) return { ok: false, motivo: 'documento-invalido' };

  const resposta = await buscar(`${BASE}/cnpj/v1/${digitos}`);
  if (!resposta.ok) return resposta;

  const d = resposta.dados as Record<string, unknown>;
  // A Receita devolve o CNPJ sem razão social quando o número não existe.
  if (texto(d['razao_social']) === '') return { ok: false, motivo: 'nao-encontrado' };

  return {
    ok: true,
    dados: {
      razaoSocial: texto(d['razao_social']),
      nomeFantasia: texto(d['nome_fantasia']),
      endereco: montarEndereco(d['logradouro'], d['numero'], d['complemento']),
      bairro: texto(d['bairro']),
      cidade: texto(d['municipio']),
      uf: texto(d['uf']),
      cep: texto(d['cep']),
      telefone: texto(d['ddd_telefone_1']),
      email: texto(d['email']),
      situacao: texto(d['descricao_situacao_cadastral']),
      atividade: texto(d['cnae_fiscal_descricao']),
    },
  };
}

export async function consultarCep(cep: string): Promise<Resultado<DadosCep>> {
  const digitos = cep.replace(/\D/g, '');
  if (digitos.length !== 8) return { ok: false, motivo: 'documento-invalido' };

  const resposta = await buscar(`${BASE}/cep/v2/${digitos}`);
  if (!resposta.ok) return resposta;

  const d = resposta.dados as Record<string, unknown>;
  return {
    ok: true,
    dados: {
      endereco: texto(d['street']),
      bairro: texto(d['neighborhood']),
      cidade: texto(d['city']),
      uf: texto(d['state']),
    },
  };
}
