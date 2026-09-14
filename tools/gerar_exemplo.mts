/**
 * Gera o PDF de exemplo com os dados reais extraídos da planilha.
 *
 * Uso: npm run pdf:exemplo
 * Saída: exemplos/orcamento-001-2026-igreja-portal-perola-2.pdf
 */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToFile } from '@react-pdf/renderer';

import casos from '../src/teste/casos-planilha.json' with { type: 'json' };
import { DocumentoOrcamento } from '../src/pdf/Documento';
import { registrarFontes } from '../src/pdf/fontes';
import { configuracaoPadrao } from '../src/dados/db';
import * as fmt from '../src/formato';
import type { Linha, Orcamento, Secao } from '../src/domain/esquemas';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface LinhaExtraida {
  descricao: string;
  quantidade: number | null;
  unidade: string | null;
  valorUnitario: number | null;
}
interface SecaoExtraida {
  titulo: string;
  linhas: LinhaExtraida[];
  precoFechado: number | null;
}

const caso = casos.casos[0] as unknown as {
  cliente: string;
  dataEmissao: string;
  condicoesPagamento: string;
  secoes: SecaoExtraida[];
  esperados: { acrescimoNotaFiscal: number; entrada: number };
};

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

const orcamento: Orcamento = {
  id: 'exemplo',
  numero: '001/2026',
  revisao: 0,
  clienteId: 'c1',
  clienteNome: 'Igreja Portal Pérola 2',
  dataEmissao: caso.dataEmissao,
  validade: '15 dias',
  prazoEntrega: '45 dias após aprovação',
  secoes,
  acrescimoNotaFiscal: caso.esperados.acrescimoNotaFiscal,
  desconto: 0,
  // a planilha traz ENTRADA = 0 digitado à mão, mas como a entrada não abate
  // do total (D5.1), a sugestão de 30% reproduz o mesmo total do papel e ainda
  // mostra as duas linhas informativas (ver docs/paridade.md §4.1)
  entrada: { modo: 'sugerida' },
  condicoesPagamento: '30% ENTRADA, RESTANTE A COMBINAR',
  observacoes: 'Inclusos material e mão de obra.',
  status: 'enviado',
  arquivado: false,
  historico: [],
  criadoEm: '2026-08-14T00:00:00.000Z',
  alteradoEm: '2026-08-14T00:00:00.000Z',
};

const configuracao = configuracaoPadrao(2026);

registrarFontes(resolve(RAIZ, 'public/fontes'));

const destino = resolve(
  RAIZ,
  'exemplos',
  fmt.nomeArquivoPdf(orcamento.numero, orcamento.revisao, orcamento.clienteNome),
);
mkdirSync(dirname(destino), { recursive: true });

// `renderToFile` espera DocumentProps; o componente devolve um <Document>,
// mas o React nao carrega essa informacao pelo createElement.
const elemento = createElement(DocumentoOrcamento, {
  orcamento,
  configuracao,
}) as unknown as Parameters<typeof renderToFile>[0];

await renderToFile(elemento, destino);

console.log('->', destino.replace(RAIZ, '.'));
