/**
 * Paridade com a planilha de origem.
 *
 * Os casos vem de `src/teste/casos-planilha.json`, gerado por
 * `python tools/extrair_casos.py` diretamente do .xlsx. Entradas e valores
 * esperados sao extraidos, nao digitados: os esperados sao o proprio cache de
 * resultado que o Excel gravou nas celulas.
 *
 * Se algum caso divergir, a divergencia vai para `docs/paridade.md` e para a
 * conversa. O teste nao se ajusta para passar.
 */
import { describe, expect, it } from 'vitest';
import casos from '../teste/casos-planilha.json';
import { calcularTotais, totalDaLinha, totalDaSecao } from './orcamento';
import type { Linha, Orcamento, Secao } from './esquemas';

interface LinhaExtraida {
  numeroNaPlanilha: string;
  descricao: string;
  quantidade: number | null;
  unidade: string | null;
  valorUnitario: number | null;
  totalNaPlanilha: number | null;
  linhaPlanilha: number;
}

interface SecaoExtraida {
  numeroNaPlanilha: string;
  titulo: string;
  linhas: LinhaExtraida[];
  precoFechado: number | null;
  alturaDoBloco?: number;
}

interface CasoExtraido {
  arquivo: string;
  cliente: string;
  dataEmissao: string;
  condicoesPagamento: string;
  secoes: SecaoExtraida[];
  esperados: {
    totalDosServicos: number;
    total: number;
    acrescimoNotaFiscal: number;
    subTotal: number;
    entrada: number;
    aPagar: number;
  };
  formulas: Record<string, string>;
}

const CASOS = casos.casos as CasoExtraido[];

/** Monta o orcamento do dominio a partir do que foi extraido da planilha. */
function montar(caso: CasoExtraido): Orcamento {
  const secoes: Secao[] = caso.secoes.map((s, i) => ({
    id: `s${i}`,
    titulo: s.titulo,
    ...(s.precoFechado !== null ? { precoFechado: s.precoFechado } : {}),
    linhas: s.linhas.map((l, j): Linha => ({
      id: `s${i}l${j}`,
      descricao: l.descricao,
      ...(l.quantidade !== null ? { quantidade: l.quantidade } : {}),
      ...(l.unidade !== null ? { unidade: l.unidade } : {}),
      ...(l.valorUnitario !== null ? { valorUnitario: l.valorUnitario } : {}),
    })),
  }));

  return {
    id: 'paridade',
    numero: '001/2026',
    revisao: 0,
    clienteId: 'c',
    clienteNome: caso.cliente,
    dataEmissao: caso.dataEmissao,
    secoes,
    acrescimoNotaFiscal: caso.esperados.acrescimoNotaFiscal,
    desconto: { modo: 'reais', centavos: 0 }, // a planilha nao tem desconto
    // F35 e um valor digitado a mao; na planilha vale 0.
    entrada: { modo: 'manual', centavos: caso.esperados.entrada },
    condicoesPagamento: caso.condicoesPagamento,
    status: 'aprovado',
    arquivado: false,
    historico: [],
    criadoEm: '2026-08-14T00:00:00.000Z',
    alteradoEm: '2026-08-14T00:00:00.000Z',
  };
}

const OPCOES = { percentualEntradaPadrao: 3000 };

describe('paridade com a planilha', () => {
  it('o arquivo de casos foi gerado a partir do .xlsx de origem', () => {
    expect(CASOS.length).toBeGreaterThan(0);
    expect(CASOS[0]!.arquivo).toBe('IGREJA SAO MIGUEL ARCANJO PORTA PEROLA 2.xlsx');
  });

  for (const caso of CASOS) {
    describe(`${caso.cliente} (${caso.dataEmissao})`, () => {
      const orcamento = montar(caso);
      const totais = calcularTotais(orcamento, OPCOES);

      /*
       * Mapeamento das celulas. Cuidado: o nome "SUB-TOTAL" da planilha vem
       * DEPOIS do "TOTAL" — a nomenclatura e invertida em relacao ao uso comum
       * (anomalia registrada em regras-de-negocio.md R4).
       *
       *   F28 TOTAL DOS SERVIÇOS  = SUM(F18:F27)  ->  totalDosServicos
       *   F32 TOTAL               = F28           ->  totalDosServicos
       *   F33 ACRESC. NOTA FISCAL = digitado      ->  acrescimoNotaFiscal
       *   F34 SUB-TOTAL           = F32 + F33     ->  total (e subTotal, sem desconto)
       *   F35 ENTRADA             = digitado      ->  entrada
       *   H35 A PAGAR             = F34 - F35     ->  aPagar
       */

      it('F28 — total dos serviços', () => {
        expect(totais.totalDosServicos).toBe(caso.esperados.totalDosServicos);
      });

      it('F32 — total (repete F28 na planilha)', () => {
        expect(totais.totalDosServicos).toBe(caso.esperados.total);
      });

      it('F33 — acréscimo de nota fiscal', () => {
        expect(totais.acrescimoNotaFiscal).toBe(caso.esperados.acrescimoNotaFiscal);
      });

      it('F34 — sub-total (total + acréscimo)', () => {
        expect(totais.total).toBe(caso.esperados.subTotal);
        // sem desconto, as duas grandezas coincidem
        expect(totais.subTotal).toBe(caso.esperados.subTotal);
      });

      it('F35 — entrada', () => {
        expect(totais.entrada).toBe(caso.esperados.entrada);
      });

      it('H35 — a pagar', () => {
        expect(totais.aPagar).toBe(caso.esperados.aPagar);
      });

      it('cada linha reproduz o total que a planilha mostra', () => {
        caso.secoes.forEach((secaoExtraida, i) => {
          const secao = orcamento.secoes[i]!;
          secaoExtraida.linhas.forEach((linhaExtraida, j) => {
            const calculado = totalDaLinha(secao.linhas[j]!);
            // `null` no extraido = celula em branco ou coberta por mesclagem
            expect(calculado).toBe(linhaExtraida.totalNaPlanilha);
          });
        });
      });

      it('o bloco com preço fechado vale o preço do bloco, uma vez só', () => {
        const comBloco = caso.secoes.filter((s) => s.precoFechado !== null);
        for (const s of comBloco) {
          const indice = caso.secoes.indexOf(s);
          expect(totalDaSecao(orcamento.secoes[indice]!)).toBe(s.precoFechado);
        }
      });
    });
  }
});

describe('divergência declarada: a entrada sugerida', () => {
  /*
   * A planilha traz ENTRADA = 0 digitado a mao, apesar de a condicao de
   * pagamento dizer "30% ENTRADA". A decisao D5 mandou o app SUGERIR 30%.
   *
   * Consequencia real: um orcamento novo com os mesmos itens NAO mostra o
   * mesmo "A PAGAR" do documento original. Nao e erro de calculo — e a regra
   * nova agindo. Fica registrado aqui para ninguem descobrir isso em campo.
   */
  const caso = CASOS[0]!;

  it('com entrada 0 digitada, reproduz o documento original', () => {
    const totais = calcularTotais(montar(caso), OPCOES);
    expect(totais.aPagar).toBe(caso.esperados.aPagar);
    expect(totais.aPagar).toBe(2_560_000);
  });

  it('com a entrada sugerida de 30%, o a pagar muda — e isso é esperado', () => {
    const comSugestao: Orcamento = { ...montar(caso), entrada: { modo: 'sugerida' } };
    const totais = calcularTotais(comSugestao, OPCOES);
    expect(totais.entrada).toBe(768_000); // 30% de R$ 25.600,00
    expect(totais.aPagar).toBe(1_792_000); // R$ 17.920,00
    expect(totais.aPagar).not.toBe(caso.esperados.aPagar);
  });
});

describe('divergência declarada: a linha 22 da planilha', () => {
  /*
   * Na planilha, a formula de total da linha 22 foi digitada em A22 em vez de
   * F22 (anomalia A3, confirmada no calcChain.xml). Resultado: um item na
   * linha 22 nunca entra no total, em silencio.
   *
   * O app NAO reproduz esse defeito. Este teste existe para deixar a escolha
   * explicita e versionada.
   */
  it('no app, toda linha com quantidade e valor soma', () => {
    const secao: Secao = {
      id: 's',
      titulo: 'DOS SERVIÇOS',
      linhas: Array.from({ length: 10 }, (_, i) => ({
        id: `l${i}`,
        descricao: `item ${i + 1}`,
        quantidade: 1,
        valorUnitario: 10_000,
      })),
    };
    // Dez linhas de R$ 100,00: na planilha a de indice 4 (linha 22) sumiria.
    expect(totalDaSecao(secao)).toBe(100_000);
  });
});
