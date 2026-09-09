/**
 * Todo `Intl` do app mora aqui. Modulo unico, como manda o escopo.
 *
 * A planilha usa mascara `#,##0.00` sem o simbolo `R$` na tabela, e traz a
 * data com mascara americana `mm-dd-yy` — que e o padrao do openpyxl, quase
 * certamente sem intencao (anomalia A9). Aqui e tudo pt-BR.
 */
import type { Centavos } from './domain/dinheiro';

const LOCALE = 'pt-BR';

const numero2 = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const moeda = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantidade = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const dataCurta = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'UTC',
});

const dataLonga = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const mesAno = new Intl.DateTimeFormat(LOCALE, {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const hora = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' });

/** "25.600,00" — sem simbolo, para alinhar na coluna da tabela. */
export function valor(centavos: Centavos): string {
  return numero2.format(centavos / 100);
}

/** "R$ 25.600,00" — para o total em destaque e o texto do WhatsApp. */
export function valorComSimbolo(centavos: Centavos): string {
  return moeda.format(centavos / 100);
}

/** "3,5" / "1.250" — quantidade, ate 3 casas, sem zero a direita. */
export function quantia(n: number): string {
  return quantidade.format(n);
}

/** "12,50%" a partir de centesimos (1250). */
export function percentual(centesimos: number): string {
  return `${numero2.format(centesimos / 100)}%`;
}

/** "14/08/2026" a partir de "2026-08-14". */
export function data(iso: string): string {
  return dataCurta.format(dataUTC(iso));
}

/** "14 de agosto de 2026". */
export function dataPorExtenso(iso: string): string {
  return dataLonga.format(dataUTC(iso));
}

/** "agosto de 2026" — usado nos estados vazios da lista. */
export function competencia(iso: string): string {
  return mesAno.format(dataUTC(iso));
}

/** "14:32" a partir de um instante ISO. */
export function horario(instanteISO: string): string {
  return hora.format(new Date(instanteISO));
}

/** Data civil como UTC, para nao escorregar um dia por causa de fuso. */
function dataUTC(iso: string): Date {
  const [ano, mes, dia] = iso.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(ano, mes - 1, dia));
}

/** Data de hoje em AAAA-MM-DD, no fuso local. */
export function hojeISO(): string {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Nome de arquivo do PDF: `orcamento-001-2026-igreja-portal-perola-2.pdf` (D6).
 */
export function nomeArquivoPdf(numero: string, revisao: number, cliente: string): string {
  const num = numero.replace('/', '-');
  const rev = revisao > 0 ? `-r${revisao}` : '';
  return `orcamento-${num}${rev}-${apelido(cliente)}.pdf`;
}

/** Texto para nome de arquivo: sem acento, sem simbolo, separado por hifen. */
export function apelido(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}
