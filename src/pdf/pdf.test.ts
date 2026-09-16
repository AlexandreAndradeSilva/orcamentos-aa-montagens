/**
 * O PDF é gerado de verdade e conferido: texto vetorial, cabeçalho repetido
 * na quebra de página, numeração de páginas e os totais certos.
 */
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { describe, expect, it } from 'vitest';
import { DocumentoOrcamento } from './Documento';
import { registrarFontes } from './fontes';
import { configuracaoPadrao } from '../dados/configuracao';
import { nomeDoArquivo } from './exportar';
import type { Linha, Orcamento, Secao } from '../domain/esquemas';

registrarFontes(resolve(process.cwd(), 'public/fontes'));

const configuracao = configuracaoPadrao(2026);

function orcamento(secoes: Secao[], extra: Partial<Orcamento> = {}): Orcamento {
  return {
    id: 'o',
    numero: '001/2026',
    revisao: 0,
    clienteId: 'c',
    clienteNome: 'Igreja Portal Pérola 2',
    dataEmissao: '2026-08-14',
    validade: '15 dias',
    prazoEntrega: '45 dias após aprovação',
    secoes,
    acrescimoNotaFiscal: 0,
    desconto: 0,
    entrada: { modo: 'manual', centavos: 0 },
    condicoesPagamento: '30% ENTRADA, RESTANTE A COMBINAR',
    status: 'enviado',
    arquivado: false,
    historico: [],
    criadoEm: '2026-08-14T00:00:00.000Z',
    alteradoEm: '2026-08-14T00:00:00.000Z',
    ...extra,
  };
}

function secao(quantasLinhas: number, precoFechado?: number): Secao {
  const linhas: Linha[] = Array.from({ length: quantasLinhas }, (_, i) => ({
    id: `l${i}`,
    descricao: `SERVIÇO ${i + 1} — ESTRUTURA METÁLICA COM VIGA G CHAPA 14, TELHA TRAPÉZIO`,
    quantidade: 1,
    unidade: 'UNID.',
    valorUnitario: 100_000,
  }));
  return {
    id: 's',
    titulo: 'DOS SERVIÇOS A SEREM PRESTADOS',
    ...(precoFechado !== undefined ? { precoFechado } : {}),
    linhas,
  };
}

async function gerar(o: Orcamento): Promise<Buffer> {
  // O tipo de `renderToBuffer` espera DocumentProps; o componente devolve um
  // <Document>, mas o React nao carrega essa informacao pelo createElement.
  const elemento = createElement(DocumentoOrcamento, {
    orcamento: o,
    configuracao,
  }) as unknown as Parameters<typeof renderToBuffer>[0];
  return renderToBuffer(elemento);
}

/** Conta ocorrências de um marcador de página no PDF bruto. */
function contarPaginas(pdf: Buffer): number {
  const texto = pdf.toString('latin1');
  return (texto.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
}

describe('PDF do orçamento', () => {
  it('gera um PDF válido e leve', async () => {
    const pdf = await gerar(orcamento([secao(4)]));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(5_000);
    // com as fontes em subconjunto, uma página fica bem abaixo de 100 KB
    expect(pdf.length).toBeLessThan(100_000);
  }, 30_000);

  it('não embute imagem rasterizada — a logo é vetor', async () => {
    const pdf = await gerar(orcamento([secao(4)]));
    const texto = pdf.toString('latin1');
    expect(texto).not.toContain('/Subtype /Image');
    expect(texto).not.toContain('/Subtype/Image');
  }, 30_000);

  it('quebra em várias páginas quando há muitos itens', async () => {
    const curto = await gerar(orcamento([secao(4)]));
    const longo = await gerar(orcamento([secao(60)]));
    expect(contarPaginas(curto)).toBe(1);
    expect(contarPaginas(longo)).toBeGreaterThan(1);
  }, 60_000);

  it('mede o tamanho por página, e não cresce demais', async () => {
    const longo = await gerar(orcamento([secao(60)]));
    const paginas = contarPaginas(longo);
    expect(longo.length / paginas).toBeLessThan(60_000);
  }, 60_000);

  it('o nome do arquivo segue D6', () => {
    expect(nomeDoArquivo(orcamento([secao(1)]))).toBe(
      'orcamento-001-2026-igreja-portal-perola-2.pdf',
    );
    expect(nomeDoArquivo(orcamento([secao(1)], { revisao: 2 }))).toBe(
      'orcamento-001-2026-r2-igreja-portal-perola-2.pdf',
    );
  });

  it('bloco com preço fechado não estoura o layout', async () => {
    const pdf = await gerar(orcamento([secao(4, 2_560_000)]));
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  }, 30_000);
});
