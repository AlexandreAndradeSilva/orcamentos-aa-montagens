/**
 * Os creditos que vao no rodape de toda tela e do PDF.
 *
 * O ano acompanha o relogio para nao envelhecer no lugar.
 */
export const INSTAGRAM_RAAVON = 'https://www.instagram.com/raavontech/';

export function creditos(ano = new Date().getFullYear()): string {
  return `© ${ano} AA MONTAGENS - FEITO POR RAAVON TECH`;
}
