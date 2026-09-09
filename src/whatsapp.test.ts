import { describe, expect, it } from 'vitest';
import { linkWhatsApp, paraWaMe, textoResumo } from './whatsapp';
import { configuracaoPadrao } from './dados/db';
import type { Orcamento } from './domain/esquemas';

const { id: _id, ...configuracao } = configuracaoPadrao(2026);

const orcamento: Orcamento = {
  id: 'o',
  numero: '001/2026',
  revisao: 0,
  clienteId: 'c',
  clienteNome: 'Igreja Portal Pérola 2',
  dataEmissao: '2026-08-14',
  validade: '15 dias',
  prazoEntrega: '45 dias após aprovação',
  secoes: [
    {
      id: 's1',
      titulo: 'DOS SERVIÇOS A SEREM PRESTADOS',
      precoFechado: 2_560_000,
      linhas: [
        { id: 'l1', descricao: '(FACHADA ALTA) ESTRUTURA METALICA COM VIGA G CHAPA 14' },
        { id: 'l2', descricao: 'PERGOLADO GARAGEM COM DOBRAS EM CHAPA 16 (1,5MM)' },
      ],
    },
  ],
  acrescimoNotaFiscal: 0,
  desconto: { modo: 'reais', centavos: 0 },
  entrada: { modo: 'sugerida' },
  condicoesPagamento: '30% ENTRADA, RESTANTE A COMBINAR',
  status: 'enviado',
  arquivado: false,
  historico: [],
  criadoEm: '2026-08-14T00:00:00.000Z',
  alteradoEm: '2026-08-14T00:00:00.000Z',
};

describe('paraWaMe', () => {
  it('acrescenta o 55 no celular com DDD', () => {
    expect(paraWaMe('(18) 99823-0660')).toBe('5518998230660');
    expect(paraWaMe('18 99788-2819')).toBe('5518997882819');
  });

  it('aceita fixo de 10 dígitos', () => {
    expect(paraWaMe('(18) 3642-1234')).toBe('551836421234');
  });

  it('não duplica o código do país', () => {
    expect(paraWaMe('+55 18 99823-0660')).toBe('5518998230660');
  });

  it('devolve null para o que não dá para discar', () => {
    expect(paraWaMe('')).toBeNull();
    expect(paraWaMe('sem número')).toBeNull();
    expect(paraWaMe('1234')).toBeNull();
  });
});

/**
 * O Intl usa espaço não separável entre "R$" e o número — o que é desejável
 * numa mensagem, porque impede o valor de quebrar em duas linhas. Normalizar
 * aqui é só para a asserção ficar legível.
 */
const semNbsp = (t: string) => t.replace(/\u00A0/g, ' ');

describe('textoResumo', () => {
  const texto = semNbsp(textoResumo(orcamento, configuracao));

  it('usa espaço não separável no valor, para não quebrar linha', () => {
    expect(textoResumo(orcamento, configuracao)).toContain('R$\u00A017.920,00');
  });

  it('traz número, cliente e total', () => {
    expect(texto).toContain('Orçamento 001/2026');
    expect(texto).toContain('Igreja Portal Pérola 2');
    // 25.600,00 − 30% de entrada = 17.920,00
    expect(texto).toContain('R$ 17.920,00');
  });

  it('lista os itens, sem repetir a tabela inteira', () => {
    expect(texto).toContain('• (FACHADA ALTA) ESTRUTURA METALICA COM VIGA G CHAPA 14');
    expect(texto.split('\n').filter((l) => l.startsWith('•'))).toHaveLength(2);
  });

  it('traz entrada, pagamento, prazo e validade', () => {
    expect(texto).toContain('Entrada: R$ 7.680,00');
    expect(texto).toContain('Pagamento: 30% ENTRADA, RESTANTE A COMBINAR');
    expect(texto).toContain('Prazo de entrega: 45 dias após aprovação');
    expect(texto).toContain('Validade: 15 dias');
  });

  it('encurta descrição comprida', () => {
    const longo = semNbsp(
      textoResumo(
        {
          ...orcamento,
          secoes: [
            {
              id: 's',
              titulo: 't',
              precoFechado: 100,
              linhas: [{ id: 'l', descricao: 'A'.repeat(200) }],
            },
          ],
        },
        configuracao,
      ),
    );
    const item = longo.split('\n').find((l) => l.startsWith('•'))!;
    expect(item.length).toBeLessThanOrEqual(72);
    expect(item.endsWith('…')).toBe(true);
  });

  it('omite entrada quando ela é zero', () => {
    const semEntrada = semNbsp(
      textoResumo({ ...orcamento, entrada: { modo: 'manual', centavos: 0 } }, configuracao),
    );
    expect(semEntrada).not.toContain('Entrada:');
  });
});

describe('linkWhatsApp', () => {
  it('monta o link com o número da empresa', () => {
    const url = linkWhatsApp(orcamento, configuracao, '(18) 99823-0660');
    expect(url.startsWith('https://wa.me/5518998230660?text=')).toBe(true);
    expect(decodeURIComponent(url.split('?text=')[1]!)).toContain('001/2026');
  });

  it('sem número, abre o seletor de contato', () => {
    expect(linkWhatsApp(orcamento, configuracao).startsWith('https://wa.me/?text=')).toBe(true);
  });

  it('escapa quebra de linha e acento', () => {
    const url = linkWhatsApp(orcamento, configuracao);
    expect(url).not.toContain('\n');
    expect(url).not.toContain('ç');
  });
});
