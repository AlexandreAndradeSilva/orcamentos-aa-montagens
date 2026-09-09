/**
 * Esquemas e tipos do dominio. Zero React, zero I/O.
 *
 * O modelo espelha a planilha (ver `docs/mapeamento.md` secao 8) mais as
 * decisoes confirmadas em `docs/decisoes.md`.
 */
import { z } from 'zod';

// ---------------------------------------------------------------- primitivos

/** Inteiro em centavos. */
export const zCentavos = z.number().int('precisa ser inteiro em centavos').safe();

/** Percentual em centesimos: 3000 = 30,00%. */
export const zPercentual = z.number().int().min(0).max(1_000_000);

const zId = z.string().min(1);
const zTexto = (max: number) => z.string().trim().max(max);
/** Data civil ISO, sem fuso: o orcamento e um documento, nao um instante. */
const zDataISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'use AAAA-MM-DD');
const zInstante = z.string().datetime();

// ---------------------------------------------------------------- empresa

export const zEmpresa = z.object({
  razaoSocial: zTexto(160),
  nomeFantasia: zTexto(160),
  cnpj: zTexto(24),
  inscricaoEstadual: zTexto(24).optional(),
  endereco: zTexto(160),
  bairro: zTexto(80),
  cidade: zTexto(80),
  uf: z.string().length(2),
  cep: zTexto(12),
  telefones: z.array(zTexto(24)).max(4),
  /** Numeros habilitados para WhatsApp. Os dois da AA Montagens sao (D7). */
  whatsapp: z.array(zTexto(24)).max(4),
  email: zTexto(120),
  site: zTexto(120).optional(),
});
export type Empresa = z.infer<typeof zEmpresa>;

/** Padroes do documento, todos editaveis em Configuracoes. */
export const zConfiguracao = z.object({
  empresa: zEmpresa,
  /** Proximo sequencial do ano corrente (D6). */
  proximoNumero: z.number().int().min(1),
  /** Ano a que `proximoNumero` se refere. Vira 1 quando o ano muda. */
  anoNumeracao: z.number().int().min(2000).max(2999),
  condicoesPagamentoPadrao: zTexto(400),
  /** Entrada sugerida sobre o sub-total (D5). 3000 = 30,00%. */
  percentualEntradaPadrao: zPercentual,
  validadePadraoDias: z.number().int().min(0).max(365).optional(),
  prazoEntregaPadrao: zTexto(120).optional(),
  avisoReajuste: zTexto(400),
  unidades: z.array(zTexto(12)),
});
export type Configuracao = z.infer<typeof zConfiguracao>;

// ---------------------------------------------------------------- cliente

export const zCliente = z.object({
  id: zId,
  nome: zTexto(160).min(1, 'informe o nome do cliente'),
  cnpjCpf: zTexto(24).optional(),
  ieRg: zTexto(24).optional(),
  endereco: zTexto(200).optional(),
  cidade: zTexto(80).optional(),
  cep: zTexto(12).optional(),
  telefone: zTexto(24).optional(),
  email: zTexto(120).optional(),
  contato: zTexto(120).optional(),
  criadoEm: zInstante,
});
export type Cliente = z.infer<typeof zCliente>;

// ---------------------------------------------------------------- servico

/**
 * Catalogo de servicos. A planilha nao tem nenhum (lacuna L10), entao ele se
 * constroi sozinho a partir das descricoes ja usadas — ver `PERGUNTAS.md` P13.
 */
export const zServico = z.object({
  id: zId,
  descricao: zTexto(2000).min(1),
  unidade: zTexto(12).optional(),
  /** Ultimo preco praticado, so como referencia. */
  valorReferencia: zCentavos.optional(),
  usos: z.number().int().min(0),
  usadoEm: zInstante,
});
export type Servico = z.infer<typeof zServico>;

// ---------------------------------------------------------------- orcamento

/**
 * Uma linha da grade. Sem quantidade ou sem valor, ela nao soma e a coluna
 * TOTAL fica vazia — e assim que a planilha representa observacao (regra R1).
 */
export const zLinha = z.object({
  id: zId,
  descricao: zTexto(2000),
  quantidade: z.number().nonnegative('quantidade nao pode ser negativa').max(9_999_999).optional(),
  unidade: zTexto(12).optional(),
  valorUnitario: zCentavos.nonnegative('valor nao pode ser negativo').optional(),
});
export type Linha = z.infer<typeof zLinha>;

/**
 * Secao numerada ("1 DOS SERVICOS A SEREM PRESTADOS").
 *
 * `precoFechado` traduz as celulas mescladas E18:E21/F18:F21: varias linhas
 * descritas sob um preco unico, que entra uma vez na soma (D1). Quando ele
 * existe, quantidade e valor das linhas internas viram informativos.
 */
export const zSecao = z.object({
  id: zId,
  titulo: zTexto(200),
  linhas: z.array(zLinha),
  precoFechado: zCentavos.nonnegative().optional(),
});
export type Secao = z.infer<typeof zSecao>;

/** Desconto unico sobre o total, depois do acrescimo de NF (D4). */
export const zDesconto = z.discriminatedUnion('modo', [
  z.object({ modo: z.literal('reais'), centavos: zCentavos.nonnegative() }),
  z.object({ modo: z.literal('percentual'), percentual: zPercentual }),
]);
export type Desconto = z.infer<typeof zDesconto>;

/**
 * Entrada. Em `sugerida`, acompanha o percentual padrao do sub-total; assim
 * que a pessoa digita, vira `manual` e o app para de recalcular (D5).
 */
export const zEntrada = z.discriminatedUnion('modo', [
  z.object({ modo: z.literal('sugerida') }),
  z.object({ modo: z.literal('manual'), centavos: zCentavos.nonnegative() }),
]);
export type Entrada = z.infer<typeof zEntrada>;

export const STATUS = ['rascunho', 'enviado', 'aprovado', 'perdido'] as const;
export const zStatus = z.enum(STATUS);
export type Status = z.infer<typeof zStatus>;

export const zAlteracao = z.object({
  em: zInstante,
  o_que: zTexto(200),
});
export type Alteracao = z.infer<typeof zAlteracao>;

export const zOrcamento = z.object({
  id: zId,
  /** Sequencial do ano, formatado "001/2026" (D6). */
  numero: z.string().regex(/^\d{3,}\/\d{4}$/, 'use 001/2026'),
  /** 0 = original; 1 em diante vira sufixo "-R1". */
  revisao: z.number().int().min(0),
  clienteId: zId,
  /** Nome congelado no momento da emissao, para o PDF nao mudar depois. */
  clienteNome: zTexto(160),
  dataEmissao: zDataISO,
  validade: zTexto(120).optional(),
  prazoEntrega: zTexto(120).optional(),
  secoes: z.array(zSecao),
  /** Digitado em reais, caso a caso, como na planilha (D2). */
  acrescimoNotaFiscal: zCentavos.nonnegative(),
  desconto: zDesconto,
  entrada: zEntrada,
  condicoesPagamento: zTexto(400),
  observacoes: zTexto(2000).optional(),
  status: zStatus,
  arquivado: z.boolean(),
  historico: z.array(zAlteracao),
  criadoEm: zInstante,
  alteradoEm: zInstante,
});
export type Orcamento = z.infer<typeof zOrcamento>;

// ---------------------------------------------------------------- backup

export const VERSAO_BACKUP = 1;

export const zBackup = z.object({
  versao: z.literal(VERSAO_BACKUP),
  exportadoEm: zInstante,
  configuracao: zConfiguracao,
  clientes: z.array(zCliente),
  servicos: z.array(zServico),
  orcamentos: z.array(zOrcamento),
});
export type Backup = z.infer<typeof zBackup>;
