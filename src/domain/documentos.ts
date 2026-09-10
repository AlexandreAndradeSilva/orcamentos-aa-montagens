/**
 * CPF e CNPJ: reconhecer, validar e formatar. Funcoes puras.
 *
 * A validacao e o digito verificador, nao "existe na Receita" — um numero
 * pode passar aqui e nao existir. Serve para pegar erro de digitacao antes
 * de gastar uma consulta ou imprimir um PDF errado.
 */

export type TipoDocumento = 'cpf' | 'cnpj' | 'indefinido';

/** Só os dígitos. */
export function apenasDigitos(texto: string): string {
  return texto.replace(/\D/g, '');
}

/** Pelo tamanho: 11 é CPF, 14 é CNPJ, o resto ainda não dá para saber. */
export function tipoDoDocumento(texto: string): TipoDocumento {
  const d = apenasDigitos(texto);
  if (d.length === 11) return 'cpf';
  if (d.length === 14) return 'cnpj';
  return 'indefinido';
}

function digitoVerificador(base: string, pesos: readonly number[]): number {
  const soma = pesos.reduce((acc, peso, i) => acc + peso * Number(base[i]), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * CPF válido pelo dígito verificador.
 *
 * Sequências repetidas (111.111.111-11) passam na conta do dígito mas não são
 * CPF de ninguém — a Receita as rejeita, e aqui também.
 */
export function cpfValido(texto: string): boolean {
  const d = apenasDigitos(texto);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;

  const primeiro = digitoVerificador(d.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (primeiro !== Number(d[9])) return false;

  const segundo = digitoVerificador(d.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return segundo === Number(d[10]);
}

/** CNPJ válido pelo dígito verificador. */
export function cnpjValido(texto: string): boolean {
  const d = apenasDigitos(texto);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;

  const primeiro = digitoVerificador(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (primeiro !== Number(d[12])) return false;

  const segundo = digitoVerificador(d.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return segundo === Number(d[13]);
}

/** Valida conforme o tamanho. Vazio é válido: o campo não é obrigatório. */
export function documentoValido(texto: string): boolean {
  const d = apenasDigitos(texto);
  if (d === '') return true;
  if (d.length === 11) return cpfValido(d);
  if (d.length === 14) return cnpjValido(d);
  return false;
}

/** "12345678000190" -> "12.345.678/0001-90"; CPF -> "123.456.789-09". */
export function formatarDocumento(texto: string): string {
  const d = apenasDigitos(texto);
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length === 14) {
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  }
  return texto;
}

/** Máscara enquanto digita, sem atrapalhar quem ainda está no meio. */
export function mascararDocumento(texto: string): string {
  const d = apenasDigitos(texto).slice(0, 14);
  if (d.length <= 11) {
    return d
      .replace(/^(\d{3})(\d)/, '$1.$2')
      .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
  }
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3/$4')
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

/** "16202044" -> "16202-044". */
export function mascararCep(texto: string): string {
  const d = apenasDigitos(texto).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function cepValido(texto: string): boolean {
  const d = apenasDigitos(texto);
  return d === '' || d.length === 8;
}

/** "18998230660" -> "(18) 99823-0660". */
export function mascararTelefone(texto: string): string {
  const d = apenasDigitos(texto).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
