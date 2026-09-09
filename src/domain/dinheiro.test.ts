import { describe, expect, it } from 'vitest';
import {
  aplicarPercentual,
  arredondarHalfUp,
  lerCentavos,
  lerQuantidade,
  multiplicarPorQuantidade,
  ValorInvalidoError,
} from './dinheiro';

describe('arredondarHalfUp', () => {
  it('leva o empate para longe do zero', () => {
    expect(arredondarHalfUp(2.5)).toBe(3);
    expect(arredondarHalfUp(3.5)).toBe(4);
    expect(arredondarHalfUp(-2.5)).toBe(-3);
  });

  it('nao arredonda o que nao e empate', () => {
    expect(arredondarHalfUp(2.4)).toBe(2);
    expect(arredondarHalfUp(2.6)).toBe(3);
    expect(arredondarHalfUp(0)).toBe(0);
  });

  it('corrige o erro de representacao binaria antes de decidir', () => {
    // 26,75 * 100 chega como 2674,9999999999995 em float
    expect(arredondarHalfUp(26.75 * 100)).toBe(2675);
    expect(arredondarHalfUp(1.005 * 1000)).toBe(1005);
  });

  it('recusa valor nao finito', () => {
    expect(() => arredondarHalfUp(Number.NaN)).toThrow(ValorInvalidoError);
    expect(() => arredondarHalfUp(Number.POSITIVE_INFINITY)).toThrow(ValorInvalidoError);
  });
});

describe('multiplicarPorQuantidade', () => {
  it('multiplica quantidade inteira', () => {
    expect(multiplicarPorQuantidade(2_560_000, 1)).toBe(2_560_000);
    expect(multiplicarPorQuantidade(15_000, 4)).toBe(60_000);
  });

  it('arredonda quantidade fracionada para o centavo', () => {
    // 3,5 x R$ 187,33 = R$ 655,655 -> R$ 655,66
    expect(multiplicarPorQuantidade(18_733, 3.5)).toBe(65_566);
    // 2,25 x R$ 10,10 = R$ 22,725 -> R$ 22,73
    expect(multiplicarPorQuantidade(1010, 2.25)).toBe(2273);
  });

  it('trata quantidade zero como zero, nao como vazio', () => {
    expect(multiplicarPorQuantidade(9999, 0)).toBe(0);
  });

  it('recusa valor unitario que nao seja inteiro de centavos', () => {
    expect(() => multiplicarPorQuantidade(10.5, 1)).toThrow(ValorInvalidoError);
  });
});

describe('aplicarPercentual', () => {
  it('calcula a entrada de 30%', () => {
    expect(aplicarPercentual(2_560_000, 3000)).toBe(768_000);
  });

  it('arredonda HALF_UP', () => {
    // 10% de R$ 10,05 = R$ 1,005 -> R$ 1,01
    expect(aplicarPercentual(1005, 1000)).toBe(101);
  });
});

describe('lerCentavos', () => {
  it('le o formato pt-BR', () => {
    expect(lerCentavos('25.600,00')).toBe(2_560_000);
    expect(lerCentavos('25600,5')).toBe(2_560_050);
    expect(lerCentavos('R$ 90,00')).toBe(9000);
    expect(lerCentavos('0,01')).toBe(1);
  });

  it('trata ponto com tres casas como milhar', () => {
    expect(lerCentavos('1.500')).toBe(150_000);
    expect(lerCentavos('1.234.567')).toBe(123_456_700);
  });

  it('trata ponto com ate duas casas como decimal (teclado numerico)', () => {
    expect(lerCentavos('25600.50')).toBe(2_560_050);
    expect(lerCentavos('10.5')).toBe(1050);
  });

  it('arredonda alem de duas casas', () => {
    expect(lerCentavos('1,555')).toBe(156);
  });

  it('devolve null para vazio — celula em branco nao e zero', () => {
    expect(lerCentavos('')).toBeNull();
    expect(lerCentavos('   ')).toBeNull();
  });

  it('recusa lixo', () => {
    expect(() => lerCentavos('abc')).toThrow(ValorInvalidoError);
    expect(() => lerCentavos('12,3,4')).toThrow(ValorInvalidoError);
  });
});

describe('lerQuantidade', () => {
  it('le decimais ate 3 casas', () => {
    expect(lerQuantidade('3,5')).toBe(3.5);
    expect(lerQuantidade('0,75')).toBe(0.75);
    expect(lerQuantidade('1.250')).toBe(1250);
    expect(lerQuantidade('2')).toBe(2);
  });

  it('devolve null para vazio', () => {
    expect(lerQuantidade('')).toBeNull();
  });
});
