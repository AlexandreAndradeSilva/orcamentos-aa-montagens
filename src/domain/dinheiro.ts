/**
 * Dinheiro em centavos inteiros. Nunca float para valor.
 *
 * A planilha de origem nao tem nenhuma funcao de arredondamento: o Excel
 * multiplica em ponto flutuante e a mascara `#,##0.00` apenas *exibe* duas
 * casas. Com quantidade inteira da no mesmo; com quantidade fracionada, nao.
 * Ver `docs/decisoes.md` D9.
 */

/** Valor monetario em centavos. Sempre inteiro. */
export type Centavos = number;

/** Quantidade aceita ate 3 casas decimais (ex.: 3,5 m² / 0,75 m). */
export const CASAS_QUANTIDADE = 3;
const FATOR_QUANTIDADE = 10 ** CASAS_QUANTIDADE;

/** Percentual guardado em centesimos: 3000 = 30,00%. */
export type PercentualCentesimos = number;
const FATOR_PERCENTUAL = 10_000;

export class ValorInvalidoError extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ValorInvalidoError';
  }
}

/**
 * Arredonda para inteiro com HALF_UP: o empate vai para longe do zero.
 *
 * 2,5 -> 3 e -2,5 -> -3.
 *
 * O `toPrecision` antes da decisao corrige o erro de representacao binaria.
 * Sem ele, 26,75 * 100 chega como 2674,9999999999995 e o empate cai para o
 * lado errado, tirando um centavo do total.
 */
export function arredondarHalfUp(valor: number): Centavos {
  if (!Number.isFinite(valor)) {
    throw new ValorInvalidoError(`valor nao finito: ${valor}`);
  }
  if (valor === 0) return 0;
  const sinal = valor < 0 ? -1 : 1;
  const absoluto = Math.abs(valor);
  const corrigido = Number(absoluto.toPrecision(12));
  return sinal * Math.floor(corrigido + 0.5);
}

/** Garante que o numero e um inteiro de centavos utilizavel. */
export function assegurarCentavos(valor: number, campo = 'valor'): Centavos {
  if (!Number.isInteger(valor)) {
    throw new ValorInvalidoError(`${campo} precisa ser inteiro em centavos, veio ${valor}`);
  }
  if (!Number.isSafeInteger(valor)) {
    throw new ValorInvalidoError(`${campo} fora da faixa segura: ${valor}`);
  }
  return valor;
}

/**
 * quantidade x valor unitario, arredondado HALF_UP para centavos.
 *
 * A quantidade e convertida para milesimos inteiros antes de multiplicar,
 * para o produto nao herdar a imprecisao do float da quantidade.
 */
export function multiplicarPorQuantidade(valorUnitario: Centavos, quantidade: number): Centavos {
  assegurarCentavos(valorUnitario, 'valorUnitario');
  if (!Number.isFinite(quantidade)) {
    throw new ValorInvalidoError(`quantidade nao finita: ${quantidade}`);
  }
  const milesimos = arredondarHalfUp(quantidade * FATOR_QUANTIDADE);
  return arredondarHalfUp((milesimos * valorUnitario) / FATOR_QUANTIDADE);
}

/** Aplica um percentual em centesimos sobre uma base em centavos. */
export function aplicarPercentual(base: Centavos, percentual: PercentualCentesimos): Centavos {
  assegurarCentavos(base, 'base');
  if (!Number.isInteger(percentual)) {
    throw new ValorInvalidoError(
      `percentual precisa ser inteiro em centesimos, veio ${percentual}`,
    );
  }
  return arredondarHalfUp((base * percentual) / FATOR_PERCENTUAL);
}

/** Soma de centavos, com verificacao de faixa segura. */
export function somar(...valores: Centavos[]): Centavos {
  let total = 0;
  for (const v of valores) total += assegurarCentavos(v);
  return assegurarCentavos(total, 'soma');
}

/**
 * Separa "inteiros" e "decimais" de um numero digitado em pt-BR.
 *
 * Regra, sem ambiguidade:
 *  - se houver virgula, ela e o separador decimal e os pontos sao de milhar;
 *  - sem virgula, um ponto com exatamente 3 digitos depois e milhar
 *    ("1.500" e mil e quinhentos, nao um e meio);
 *  - sem virgula, um ponto com 1 ou 2 digitos depois e decimal
 *    (quem digita no teclado numerico escreve "25600.50").
 */
function separarPartes(corpo: string): { inteiros: string; decimais: string } {
  const posVirgula = corpo.lastIndexOf(',');
  if (posVirgula !== -1) {
    const decimais = corpo.slice(posVirgula + 1);
    if (decimais.includes('.') || decimais.includes(',')) {
      throw new ValorInvalidoError(`separadores fora de ordem: "${corpo}"`);
    }
    return { inteiros: corpo.slice(0, posVirgula).replace(/\./g, ''), decimais };
  }
  const posPonto = corpo.lastIndexOf('.');
  if (posPonto === -1) return { inteiros: corpo, decimais: '' };
  const depois = corpo.length - posPonto - 1;
  if (depois === 3) return { inteiros: corpo.replace(/\./g, ''), decimais: '' };
  return {
    inteiros: corpo.slice(0, posPonto).replace(/\./g, ''),
    decimais: corpo.slice(posPonto + 1),
  };
}

function normalizar(entrada: string, rotulo: string): { negativo: boolean; corpo: string } | null {
  const limpo = entrada
    .trim()
    .replace(/^R\$\s*/i, '')
    .replace(/\s/g, '');
  if (limpo === '') return null;
  if (!/^-?[\d.,]*\d[\d.,]*$/.test(limpo)) {
    throw new ValorInvalidoError(`${rotulo} nao reconhecido: "${entrada}"`);
  }
  const negativo = limpo.startsWith('-');
  return { negativo, corpo: negativo ? limpo.slice(1) : limpo };
}

/**
 * Le um valor digitado em pt-BR e devolve centavos.
 *
 * Aceita "25.600,00", "25600,5", "1.500", "R$ 90,00" e negativo com "-".
 * Mais de duas casas sao arredondadas HALF_UP ("1,555" -> 156).
 *
 * Devolve `null` para entrada vazia — que na planilha significa celula em
 * branco, e nao zero (regra R1).
 */
export function lerCentavos(entrada: string): Centavos | null {
  const partido = normalizar(entrada, 'valor');
  if (partido === null) return null;
  const { negativo, corpo } = partido;
  const { inteiros, decimais } = separarPartes(corpo);

  const reais = Number(inteiros || '0');
  if (!Number.isSafeInteger(reais)) {
    throw new ValorInvalidoError(`valor fora da faixa segura: "${entrada}"`);
  }
  // Ate 2 casas entram como inteiro exato; o resto e arredondado HALF_UP.
  const doisPrimeiros = Number(decimais.slice(0, 2).padEnd(2, '0') || '0');
  const resto = decimais.length > 2 ? Number(`0.${decimais.slice(2)}`) : 0;
  const bruto = assegurarCentavos(reais * 100 + doisPrimeiros + arredondarHalfUp(resto), 'valor');
  return negativo ? -bruto : bruto;
}

/** Le uma quantidade digitada em pt-BR ("3,5", "1.250", "0,75"). */
export function lerQuantidade(entrada: string): number | null {
  const partido = normalizar(entrada, 'quantidade');
  if (partido === null) return null;
  const { negativo, corpo } = partido;
  const { inteiros, decimais } = separarPartes(corpo);

  const numero = Number(`${inteiros || '0'}.${decimais || '0'}`);
  if (!Number.isFinite(numero)) {
    throw new ValorInvalidoError(`quantidade nao reconhecida: "${entrada}"`);
  }
  // normaliza para no maximo 3 casas
  const normalizado = arredondarHalfUp(numero * FATOR_QUANTIDADE) / FATOR_QUANTIDADE;
  return negativo ? -normalizado : normalizado;
}
