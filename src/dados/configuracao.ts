/**
 * Configuracao da empresa: o documento unico que toda implementacao de
 * `Repositorio` guarda, e o padrao gravado na primeira execucao.
 */
import type { Configuracao } from '../domain/esquemas';

/** Linha unica da tabela de configuracao. */
export const ID_CONFIG = 'unica';

export interface ConfiguracaoGuardada extends Configuracao {
  id: typeof ID_CONFIG;
}

/**
 * Dados da AA Montagens lidos da planilha de origem.
 *
 * O e-mail sai com a grafia "aamonstagens" de proposito: foi confirmado que
 * e assim mesmo (D7). Tudo aqui e editavel em Configuracoes.
 */
export function configuracaoPadrao(ano = new Date().getFullYear()): ConfiguracaoGuardada {
  return {
    id: ID_CONFIG,
    empresa: {
      razaoSocial: 'AA MONTAGENS',
      nomeFantasia: 'AA MONTAGENS',
      cnpj: '66.612.836/0001-55',
      endereco: 'RUA JOAO ANTONIO SANCHES, 1085',
      bairro: 'JARDIM SÃO BRAZ',
      cidade: 'BIRIGUI',
      uf: 'SP',
      cep: '16202-044',
      telefones: ['(18) 99823-0660', '(18) 99788-2819'],
      whatsapp: ['(18) 99823-0660', '(18) 99788-2819'],
      email: 'aamonstagens@hotmail.com',
    },
    proximoNumero: 1,
    anoNumeracao: ano,
    condicoesPagamentoPadrao: '30% ENTRADA, RESTANTE A COMBINAR',
    percentualEntradaPadrao: 3000,
    avisoReajuste:
      '*O MERCADO PODE SOFRER REAJUSTES DE PREÇOS. O ORÇAMENTO ESTÁ SUJEITO A ALTERAÇÃO DE VALORES.',
    // A planilha so registra "UNID."; o comentario de celula cita "UND, M, M²".
    // Lista aberta ate P11 ser respondida.
    unidades: ['UNID.', 'M', 'M²', 'ML', 'KG', 'VB', 'DIA', 'H'],
  };
}
