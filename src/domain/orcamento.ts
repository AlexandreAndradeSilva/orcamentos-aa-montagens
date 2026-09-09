/**
 * Calculo do orcamento. Funcoes puras, sem React e sem I/O.
 *
 * A cadeia reproduz a planilha (regras R1, R3 e R4 de `docs/regras-de-negocio.md`)
 * com a unica insercao confirmada em D4, o desconto:
 *
 *   totalDosServicos = soma dos totais de linha e de bloco   // F28 = SUM(F18:F27)
 *   total            = totalDosServicos + acrescimoNF        // F32 + F33
 *   subTotal         = total - desconto                      // insercao D4
 *   entrada          = manual, ou percentual do subTotal      // F35 (D5)
 *   aPagar           = subTotal - entrada                     // H35
 */
import {
  arredondarHalfUp,
  aplicarPercentual,
  assegurarCentavos,
  multiplicarPorQuantidade,
  type Centavos,
  type PercentualCentesimos,
} from './dinheiro';
import type { Desconto, Entrada, Linha, Orcamento, Secao } from './esquemas';

export interface Totais {
  totalDosServicos: Centavos;
  acrescimoNotaFiscal: Centavos;
  total: Centavos;
  desconto: Centavos;
  subTotal: Centavos;
  entrada: Centavos;
  aPagar: Centavos;
}

/**
 * Total de uma linha.
 *
 * `null` — nao vazio e nao zero — quando falta quantidade ou valor. E a
 * traducao de `=SE(OU(C18="";E18="");"";C18*E18)`: e o que permite observacao
 * e item dividirem a mesma grade, como ja acontece na planilha.
 *
 * Quantidade zero com preco preenchido da 0, e nao `null`: a formula da
 * planilha testa celula *vazia*, nao valor zero.
 */
export function totalDaLinha(linha: Linha): Centavos | null {
  if (linha.quantidade === undefined || linha.valorUnitario === undefined) return null;
  return multiplicarPorQuantidade(linha.valorUnitario, linha.quantidade);
}

/**
 * Total de uma secao.
 *
 * Com `precoFechado`, o bloco vale o preco do bloco e as linhas internas nao
 * somam (D1 — o caso 1.1 a 1.4 da Igreja Portal Perola 2, R$ 25.600,00).
 */
export function totalDaSecao(secao: Secao): Centavos {
  if (secao.precoFechado !== undefined) return assegurarCentavos(secao.precoFechado);
  let soma = 0;
  for (const linha of secao.linhas) {
    const total = totalDaLinha(linha);
    if (total !== null) soma += total;
  }
  return assegurarCentavos(soma, 'total da secao');
}

/** Soma de todas as secoes. Equivale a F28 = SUM(F18:F27). */
export function totalDosServicos(secoes: readonly Secao[]): Centavos {
  let soma = 0;
  for (const secao of secoes) soma += totalDaSecao(secao);
  return assegurarCentavos(soma, 'total dos servicos');
}

/** Desconto em centavos, seja ele digitado em reais ou em percentual. */
export function valorDoDesconto(desconto: Desconto, base: Centavos): Centavos {
  return desconto.modo === 'reais'
    ? assegurarCentavos(desconto.centavos, 'desconto')
    : aplicarPercentual(base, desconto.percentual);
}

/** Entrada em centavos: a digitada, ou o percentual padrao do sub-total. */
export function valorDaEntrada(
  entrada: Entrada,
  subTotal: Centavos,
  percentualPadrao: PercentualCentesimos,
): Centavos {
  return entrada.modo === 'manual'
    ? assegurarCentavos(entrada.centavos, 'entrada')
    : aplicarPercentual(subTotal, percentualPadrao);
}

export interface OpcoesCalculo {
  /** Percentual sugerido de entrada, em centesimos. 3000 = 30,00%. */
  percentualEntradaPadrao: PercentualCentesimos;
}

/** A cadeia inteira, na ordem exata da planilha mais o desconto (D4). */
export function calcularTotais(
  orcamento: Pick<Orcamento, 'secoes' | 'acrescimoNotaFiscal' | 'desconto' | 'entrada'>,
  opcoes: OpcoesCalculo,
): Totais {
  const servicos = totalDosServicos(orcamento.secoes);
  const acrescimo = assegurarCentavos(orcamento.acrescimoNotaFiscal, 'acrescimo');
  const total = assegurarCentavos(servicos + acrescimo, 'total');
  const desconto = valorDoDesconto(orcamento.desconto, total);
  const subTotal = assegurarCentavos(total - desconto, 'sub-total');
  const entrada = valorDaEntrada(orcamento.entrada, subTotal, opcoes.percentualEntradaPadrao);
  const aPagar = assegurarCentavos(subTotal - entrada, 'a pagar');
  return {
    totalDosServicos: servicos,
    acrescimoNotaFiscal: acrescimo,
    total,
    desconto,
    subTotal,
    entrada,
    aPagar,
  };
}

// ---------------------------------------------------------------- numeracao

/** "001/2026" — tres digitos, barra, ano (D6). */
export function formatarNumero(sequencial: number, ano: number): string {
  if (!Number.isInteger(sequencial) || sequencial < 1) {
    throw new Error(`sequencial invalido: ${sequencial}`);
  }
  return `${String(sequencial).padStart(3, '0')}/${ano}`;
}

/** "001/2026" ou "001/2026-R1" quando ha revisao. */
export function numeroCompleto(numero: string, revisao: number): string {
  return revisao > 0 ? `${numero}-R${revisao}` : numero;
}

/** Numero de item na grade: "1.1", "2.2". */
export function numeroDoItem(indiceSecao: number, indiceLinha: number): string {
  return `${indiceSecao + 1}.${indiceLinha + 1}`;
}

/** Numero da secao: "1", "2". */
export function numeroDaSecao(indiceSecao: number): string {
  return String(indiceSecao + 1);
}

// ---------------------------------------------------------------- derivados

/** Uma linha so conta como item quando tem quantidade e valor. */
export function ehItem(linha: Linha): boolean {
  return linha.quantidade !== undefined && linha.valorUnitario !== undefined;
}

/** Linhas com descricao mas sem preco — as observacoes da planilha. */
export function ehObservacao(linha: Linha): boolean {
  return !ehItem(linha) && linha.descricao.trim() !== '';
}

/** Itens preenchidos pela metade: alertam, mas nao impedem salvar. */
export function linhasIncompletas(
  secoes: readonly Secao[],
): { secao: number; linha: number; motivo: 'sem-valor' | 'sem-quantidade' }[] {
  const achados: { secao: number; linha: number; motivo: 'sem-valor' | 'sem-quantidade' }[] = [];
  secoes.forEach((secao, s) => {
    if (secao.precoFechado !== undefined) return; // no bloco fechado isso e normal
    secao.linhas.forEach((linha, l) => {
      if (linha.quantidade !== undefined && linha.valorUnitario === undefined) {
        achados.push({ secao: s, linha: l, motivo: 'sem-valor' });
      } else if (linha.quantidade === undefined && linha.valorUnitario !== undefined) {
        achados.push({ secao: s, linha: l, motivo: 'sem-quantidade' });
      }
    });
  });
  return achados;
}

/** Data de validade a partir da emissao, quando ha prazo padrao em dias. */
export function calcularValidade(dataEmissaoISO: string, dias: number): string {
  const [ano, mes, dia] = dataEmissaoISO.split('-').map(Number) as [number, number, number];
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Percentual que a entrada representa do sub-total, em centesimos. */
export function percentualDaEntrada(entrada: Centavos, subTotal: Centavos): number {
  if (subTotal === 0) return 0;
  return arredondarHalfUp((entrada / subTotal) * 10_000);
}
