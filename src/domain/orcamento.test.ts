import { describe, expect, it } from 'vitest';
import {
  avisosDosTotais,
  calcularTotais,
  calcularValidade,
  formatarNumero,
  linhasIncompletas,
  numeroCompleto,
  percentualDaEntrada,
  totalDaLinha,
  totalDaSecao,
  totalDosServicos,
} from './orcamento';
import { zLinha, zOrcamento, type Linha, type Orcamento, type Secao } from './esquemas';

const OPCOES = { percentualEntradaPadrao: 3000 };

function secao(linhas: Partial<Linha>[], precoFechado?: number): Secao {
  return {
    id: 's',
    titulo: 'DOS SERVIÇOS A SEREM PRESTADOS',
    ...(precoFechado !== undefined ? { precoFechado } : {}),
    linhas: linhas.map((l, i) => ({ id: `l${i}`, descricao: `item ${i}`, ...l })),
  };
}

function orcamento(secoes: Secao[], extra: Partial<Orcamento> = {}): Orcamento {
  return {
    id: 'o',
    numero: '001/2026',
    revisao: 0,
    clienteId: 'c',
    clienteNome: 'Cliente',
    dataEmissao: '2026-08-14',
    secoes,
    acrescimoNotaFiscal: 0,
    desconto: 0,
    entrada: { modo: 'manual', centavos: 0 },
    condicoesPagamento: '30% ENTRADA, RESTANTE A COMBINAR',
    status: 'rascunho',
    arquivado: false,
    historico: [],
    criadoEm: '2026-08-14T00:00:00.000Z',
    alteradoEm: '2026-08-14T00:00:00.000Z',
    ...extra,
  };
}

// ---------------------------------------------------------------- regra R1

describe('total da linha (regra R1 da planilha)', () => {
  it('multiplica quantidade por valor', () => {
    expect(totalDaLinha({ id: 'l', descricao: '', quantidade: 4, valorUnitario: 15_000 })).toBe(
      60_000,
    );
  });

  it('devolve null — não zero — quando falta o valor', () => {
    expect(totalDaLinha({ id: 'l', descricao: 'item sem preço', quantidade: 3 })).toBeNull();
  });

  it('devolve null quando falta a quantidade', () => {
    expect(totalDaLinha({ id: 'l', descricao: '', valorUnitario: 9900 })).toBeNull();
  });

  it('devolve null para linha puramente descritiva (a observação da planilha)', () => {
    expect(totalDaLinha({ id: 'l', descricao: 'INCLUSOS MATERIAL E MÃO DE OBRA' })).toBeNull();
  });

  it('quantidade zero com preço dá zero, não null', () => {
    // a fórmula da planilha testa célula VAZIA, não valor zero
    expect(totalDaLinha({ id: 'l', descricao: '', quantidade: 0, valorUnitario: 50_000 })).toBe(0);
  });

  it('item sem preço não contribui para a soma', () => {
    const s = secao([
      { quantidade: 1, valorUnitario: 100_000 },
      { quantidade: 2 }, // sem preço
      { valorUnitario: 500_000 }, // sem quantidade
    ]);
    expect(totalDaSecao(s)).toBe(100_000);
  });
});

// ---------------------------------------------------------------- quantidade

describe('quantidade fracionada', () => {
  it('3,5 m² × R$ 187,33 arredonda HALF_UP para R$ 655,66', () => {
    // 3,5 × 18.733 = 65.565,5 centavos
    expect(totalDaLinha({ id: 'l', descricao: '', quantidade: 3.5, valorUnitario: 18_733 })).toBe(
      65_566,
    );
  });

  it('0,75 m × R$ 33,33 = R$ 25,00', () => {
    // 0,75 × 3.333 = 2.499,75 -> 2.500
    expect(totalDaLinha({ id: 'l', descricao: '', quantidade: 0.75, valorUnitario: 3333 })).toBe(
      2500,
    );
  });

  it('soma totais já arredondados, e não o produto bruto', () => {
    // Três linhas de 3,5 × R$ 187,33.
    // Arredondando por linha: 3 × 65.566 = 196.698
    // Se somasse o bruto: 196.696,5 -> 196.697. A diferença de 1 centavo é o
    // ponto onde D9 fixou a regra: arredonda por linha, como o Excel exibe.
    const s = secao([
      { quantidade: 3.5, valorUnitario: 18_733 },
      { quantidade: 3.5, valorUnitario: 18_733 },
      { quantidade: 3.5, valorUnitario: 18_733 },
    ]);
    expect(totalDaSecao(s)).toBe(196_698);
  });

  it('aceita até 3 casas na quantidade', () => {
    expect(totalDaLinha({ id: 'l', descricao: '', quantidade: 1.125, valorUnitario: 80_000 })).toBe(
      90_000,
    );
  });

  it('o esquema recusa quantidade negativa', () => {
    const r = zLinha.safeParse({ id: 'l', descricao: 'x', quantidade: -1, valorUnitario: 100 });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0]?.message).toMatch(/negativa/i);
    }
  });

  it('o esquema recusa valor unitário negativo', () => {
    const r = zLinha.safeParse({ id: 'l', descricao: 'x', quantidade: 1, valorUnitario: -100 });
    expect(r.success).toBe(false);
  });
});

// ---------------------------------------------------------------- blocos

describe('bloco com preço fechado (D1)', () => {
  it('vale o preço do bloco e ignora as linhas internas', () => {
    const s = secao(
      [
        { quantidade: 1, unidade: 'UNID.' },
        { quantidade: 1, unidade: 'UNID.' },
        { quantidade: 1, unidade: 'UNID.' },
        { quantidade: 1, unidade: 'UNID.' },
      ],
      2_560_000,
    );
    expect(totalDaSecao(s)).toBe(2_560_000);
  });

  it('ignora até valor unitário preenchido dentro do bloco', () => {
    const s = secao([{ quantidade: 2, valorUnitario: 999_999 }], 100_000);
    expect(totalDaSecao(s)).toBe(100_000);
  });

  it('bloco de preço zero é válido e soma zero', () => {
    expect(totalDaSecao(secao([{ quantidade: 1 }], 0))).toBe(0);
  });

  it('convive com seção de preço por linha no mesmo orçamento', () => {
    const fechada = { ...secao([{ quantidade: 1 }], 2_560_000), id: 'a' };
    const aberta = { ...secao([{ quantidade: 2, valorUnitario: 50_000 }]), id: 'b' };
    expect(totalDosServicos([fechada, aberta])).toBe(2_660_000);
  });

  it('não acusa item incompleto dentro de bloco fechado', () => {
    const s = secao([{ quantidade: 1 }, { quantidade: 1 }], 2_560_000);
    expect(linhasIncompletas([s])).toHaveLength(0);
  });

  it('acusa item pela metade fora de bloco fechado', () => {
    const s = secao([{ quantidade: 1 }, { valorUnitario: 100 }]);
    expect(linhasIncompletas([s])).toEqual([
      { secao: 0, linha: 0, motivo: 'sem-valor' },
      { secao: 0, linha: 1, motivo: 'sem-quantidade' },
    ]);
  });
});

// ---------------------------------------------------------------- cadeia

describe('cadeia de totais (R4 + D4)', () => {
  const base = secao([{ quantidade: 1, valorUnitario: 1_000_000 }]);

  it('acréscimo de nota fiscal entra antes do desconto', () => {
    const t = calcularTotais(
      orcamento([base], {
        acrescimoNotaFiscal: 100_000,
        desconto: 50_000,
      }),
      OPCOES,
    );
    expect(t.totalDosServicos).toBe(1_000_000);
    expect(t.total).toBe(1_100_000); // serviços + acréscimo
    expect(t.desconto).toBe(50_000);
    expect(t.subTotal).toBe(1_050_000); // total − desconto
  });

  it('o esquema recusa desconto negativo', () => {
    const r = zOrcamento.safeParse(orcamento([base], { desconto: -1 }));
    expect(r.success).toBe(false);
  });

  it('entrada sugerida é 30% do sub-total', () => {
    const t = calcularTotais(
      orcamento([secao([{ quantidade: 1, valorUnitario: 2_560_000 }])], {
        entrada: { modo: 'sugerida' },
      }),
      OPCOES,
    );
    expect(t.entrada).toBe(768_000);
    expect(t.aPagar).toBe(1_792_000);
  });

  it('entrada manual manda, mesmo que seja zero', () => {
    const t = calcularTotais(
      orcamento([base], { entrada: { modo: 'manual', centavos: 0 } }),
      OPCOES,
    );
    expect(t.entrada).toBe(0);
    expect(t.aPagar).toBe(1_000_000);
  });

  it('orçamento vazio dá tudo zero, sem estourar', () => {
    const t = calcularTotais(orcamento([secao([{}])]), OPCOES);
    expect(t).toMatchObject({ totalDosServicos: 0, total: 0, subTotal: 0, aPagar: 0 });
  });
});

// ---------------------------------------------------------------- desconto máximo

describe('desconto máximo', () => {
  /*
   * A planilha não tem desconto e, portanto, não tem teto — a pergunta segue
   * aberta em PERGUNTAS.md. Enquanto não houver regra, o cálculo não limita:
   * ele avisa. Truncar em silêncio seria inventar regra de negócio.
   */
  const base = secao([{ quantidade: 1, valorUnitario: 1_000_000 }]);

  it('desconto maior que o total não é truncado — é sinalizado', () => {
    const t = calcularTotais(orcamento([base], { desconto: 1_500_000 }), OPCOES);
    expect(t.subTotal).toBe(-500_000);
    expect(avisosDosTotais(t)).toContainEqual({
      tipo: 'desconto-maior-que-total',
      desconto: 1_500_000,
      total: 1_000_000,
    });
  });

  it('avisa quando o a pagar fica negativo', () => {
    const t = calcularTotais(orcamento([base], { desconto: 1_500_000 }), OPCOES);
    expect(avisosDosTotais(t).some((a) => a.tipo === 'total-negativo')).toBe(true);
  });

  it('desconto igual ao total zera o sub-total, sem aviso', () => {
    const t = calcularTotais(orcamento([base], { desconto: 1_000_000 }), OPCOES);
    expect(t.subTotal).toBe(0);
    expect(avisosDosTotais(t)).toHaveLength(0);
  });

  it('avisa quando a entrada passa do sub-total', () => {
    const t = calcularTotais(
      orcamento([base], { entrada: { modo: 'manual', centavos: 1_200_000 } }),
      OPCOES,
    );
    expect(avisosDosTotais(t).some((a) => a.tipo === 'entrada-maior-que-subtotal')).toBe(true);
  });

  it('não inventa aviso num orçamento normal', () => {
    const t = calcularTotais(
      orcamento([base], {
        acrescimoNotaFiscal: 50_000,
        desconto: 20_000,
        entrada: { modo: 'sugerida' },
      }),
      OPCOES,
    );
    expect(avisosDosTotais(t)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------- numeração

describe('numeração (D6)', () => {
  it('formata com três dígitos e ano', () => {
    expect(formatarNumero(1, 2026)).toBe('001/2026');
    expect(formatarNumero(147, 2026)).toBe('147/2026');
    expect(formatarNumero(1000, 2026)).toBe('1000/2026');
  });

  it('recusa sequencial inválido', () => {
    expect(() => formatarNumero(0, 2026)).toThrow();
    expect(() => formatarNumero(1.5, 2026)).toThrow();
  });

  it('acrescenta o sufixo de revisão', () => {
    expect(numeroCompleto('001/2026', 0)).toBe('001/2026');
    expect(numeroCompleto('001/2026', 1)).toBe('001/2026-R1');
    expect(numeroCompleto('001/2026', 12)).toBe('001/2026-R12');
  });

  it('o esquema aceita o formato gerado', () => {
    const o = orcamento([secao([{}])], { numero: formatarNumero(7, 2026) });
    expect(zOrcamento.safeParse(o).success).toBe(true);
  });

  it('o esquema recusa número fora do formato', () => {
    const o = orcamento([secao([{}])], { numero: '7-2026' });
    expect(zOrcamento.safeParse(o).success).toBe(false);
  });
});

// ---------------------------------------------------------------- datas e %

describe('derivados', () => {
  it('valida a data somando dias sem escorregar de fuso', () => {
    expect(calcularValidade('2026-08-14', 15)).toBe('2026-08-29');
    expect(calcularValidade('2026-12-20', 30)).toBe('2027-01-19');
    expect(calcularValidade('2028-02-28', 1)).toBe('2028-02-29'); // bissexto
  });

  it('calcula o percentual que a entrada representa', () => {
    expect(percentualDaEntrada(768_000, 2_560_000)).toBe(3000); // 30,00%
    expect(percentualDaEntrada(0, 2_560_000)).toBe(0);
    expect(percentualDaEntrada(100, 0)).toBe(0); // sem estourar
  });
});
