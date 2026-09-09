/**
 * Fabricas puras. Recebem o gerador de id e o relogio, para o teste poder
 * fixar os dois e comparar objetos inteiros.
 */
import type { Linha, Orcamento, Secao } from './esquemas';
import { formatarNumero } from './orcamento';

export interface Ambiente {
  novoId: () => string;
  agora: () => string;
}

export const ambientePadrao: Ambiente = {
  novoId: () => crypto.randomUUID(),
  agora: () => new Date().toISOString(),
};

export function linhaVazia(amb: Ambiente): Linha {
  return { id: amb.novoId(), descricao: '' };
}

export function secaoVazia(amb: Ambiente, titulo = ''): Secao {
  return { id: amb.novoId(), titulo, linhas: [linhaVazia(amb)] };
}

export interface DadosNovoOrcamento {
  sequencial: number;
  ano: number;
  clienteId: string;
  clienteNome: string;
  dataEmissao: string;
  condicoesPagamento: string;
  validade?: string;
  prazoEntrega?: string;
}

/**
 * Orcamento novo, ja com a primeira secao no formato da planilha.
 *
 * O titulo "DOS SERVICOS A SEREM PRESTADOS" e o que a AA Montagens usa; nao e
 * invencao — vem da linha 17 do arquivo de origem.
 */
export function orcamentoNovo(amb: Ambiente, dados: DadosNovoOrcamento): Orcamento {
  const agora = amb.agora();
  return {
    id: amb.novoId(),
    numero: formatarNumero(dados.sequencial, dados.ano),
    revisao: 0,
    clienteId: dados.clienteId,
    clienteNome: dados.clienteNome,
    dataEmissao: dados.dataEmissao,
    ...(dados.validade !== undefined ? { validade: dados.validade } : {}),
    ...(dados.prazoEntrega !== undefined ? { prazoEntrega: dados.prazoEntrega } : {}),
    secoes: [secaoVazia(amb, 'DOS SERVIÇOS A SEREM PRESTADOS')],
    acrescimoNotaFiscal: 0,
    desconto: 0,
    entrada: { modo: 'sugerida' },
    condicoesPagamento: dados.condicoesPagamento,
    status: 'rascunho',
    arquivado: false,
    historico: [{ em: agora, o_que: 'orçamento criado' }],
    criadoEm: agora,
    alteradoEm: agora,
  };
}

/** Copia para outro cliente, com numero novo e sem historico herdado. */
export function duplicar(
  amb: Ambiente,
  origem: Orcamento,
  dados: Pick<DadosNovoOrcamento, 'sequencial' | 'ano' | 'dataEmissao'>,
): Orcamento {
  const agora = amb.agora();
  return {
    ...origem,
    id: amb.novoId(),
    numero: formatarNumero(dados.sequencial, dados.ano),
    revisao: 0,
    dataEmissao: dados.dataEmissao,
    secoes: origem.secoes.map((s) => ({
      ...s,
      id: amb.novoId(),
      linhas: s.linhas.map((l) => ({ ...l, id: amb.novoId() })),
    })),
    status: 'rascunho',
    arquivado: false,
    historico: [{ em: agora, o_que: `duplicado de ${origem.numero}` }],
    criadoEm: agora,
    alteradoEm: agora,
  };
}

/**
 * Revisao: mantem o numero e incrementa o sufixo (D6). O anterior fica
 * arquivado, para o historico do cliente nao sumir.
 */
export function revisar(amb: Ambiente, origem: Orcamento): Orcamento {
  const agora = amb.agora();
  return {
    ...origem,
    id: amb.novoId(),
    revisao: origem.revisao + 1,
    secoes: origem.secoes.map((s) => ({
      ...s,
      id: amb.novoId(),
      linhas: s.linhas.map((l) => ({ ...l, id: amb.novoId() })),
    })),
    status: 'rascunho',
    arquivado: false,
    historico: [...origem.historico, { em: agora, o_que: `revisão R${origem.revisao + 1} gerada` }],
    alteradoEm: agora,
  };
}

/**
 * Interpreta um bloco colado de planilha.
 *
 * Linhas separadas por quebra, colunas por tabulacao, na ordem da grade:
 * descricao, quantidade, unidade, valor. Colunas a mais sao ignoradas;
 * a menos, ficam vazias.
 */
export function interpretarColagem(texto: string): {
  descricao: string;
  quantidade: string;
  unidade: string;
  valor: string;
}[] {
  return texto
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((linha) => {
      const col = linha.split('\t');
      return {
        descricao: (col[0] ?? '').trim(),
        quantidade: (col[1] ?? '').trim(),
        unidade: (col[2] ?? '').trim(),
        valor: (col[3] ?? '').trim(),
      };
    });
}
