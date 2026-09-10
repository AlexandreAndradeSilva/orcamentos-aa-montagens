/**
 * Integracao: dominio + persistencia + backup, sem navegador.
 *
 * Prova que o encanamento fecha — nao so que compila.
 */
import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  db,
  configuracaoPadrao,
  descontoEmCentavos,
  lerConfiguracao,
  registrarUso,
  reservarNumero,
  ID_CONFIG,
} from './db';
import { exportarBackup, importarBackup, backupParaTexto } from './backup';
import { orcamentoNovo, ambientePadrao } from '../domain/fabrica';
import { calcularTotais } from '../domain/orcamento';
import { zOrcamento } from '../domain/esquemas';

const amb = ambientePadrao;

async function limpar() {
  await Promise.all([
    db.configuracao.clear(),
    db.clientes.clear(),
    db.servicos.clear(),
    db.orcamentos.clear(),
  ]);
}

function orcamentoDaIgreja() {
  const o = orcamentoNovo(amb, {
    sequencial: 1,
    ano: 2026,
    clienteId: 'c1',
    clienteNome: 'Igreja Portal Pérola 2',
    dataEmissao: '2026-08-14',
    condicoesPagamento: '30% ENTRADA, RESTANTE A COMBINAR',
  });
  // O bloco 1.1 a 1.4 com preco fechado de R$ 25.600,00 (D1)
  return {
    ...o,
    secoes: [
      {
        id: 's1',
        titulo: 'DOS SERVIÇOS A SEREM PRESTADOS',
        precoFechado: 2_560_000,
        linhas: [
          {
            id: 'l1',
            descricao: '(FACHADA ALTA) ESTRUTURA METALICA...',
            quantidade: 1,
            unidade: 'UNID.',
          },
          {
            id: 'l2',
            descricao: '(FACHADA BAIXA) ESTRUTURA METALICA...',
            quantidade: 1,
            unidade: 'UNID.',
          },
          { id: 'l3', descricao: 'PERGOLADO GARAGEM...', quantidade: 1, unidade: 'UNID.' },
          { id: 'l4', descricao: 'PERGOLADO PISCINA...', quantidade: 1, unidade: 'UNID.' },
        ],
      },
      {
        id: 's2',
        titulo: 'DAS OBSERVAÇÕES',
        linhas: [
          { id: 'l5', descricao: 'INCLUSOS MATERIAL E MÃO DE OBRA' },
          { id: 'l6', descricao: 'COND. PAGTº: 30% ENTRADA, RESTANTE A COMBINAR' },
        ],
      },
    ],
  };
}

beforeEach(async () => {
  await limpar();
});

describe('configuracao', () => {
  it('cria a padrao na primeira leitura e mantem depois', async () => {
    const primeira = await lerConfiguracao();
    expect(primeira.empresa.cnpj).toBe('66.612.836/0001-55');
    expect(primeira.percentualEntradaPadrao).toBe(3000);

    await db.configuracao.put({ ...primeira, proximoNumero: 42 });
    const segunda = await lerConfiguracao();
    expect(segunda.proximoNumero).toBe(42);
  });

  it('mantem a grafia do e-mail que veio da planilha (D7)', () => {
    expect(configuracaoPadrao().empresa.email).toBe('aamonstagens@hotmail.com');
  });
});

describe('numeracao', () => {
  it('avanca dentro do mesmo ano', async () => {
    await lerConfiguracao();
    expect((await reservarNumero(2026)).sequencial).toBe(1);
    expect((await reservarNumero(2026)).sequencial).toBe(2);
    expect((await reservarNumero(2026)).sequencial).toBe(3);
  });

  it('reinicia quando vira o ano (D6)', async () => {
    await lerConfiguracao();
    await reservarNumero(2026);
    await reservarNumero(2026);
    expect((await reservarNumero(2027)).sequencial).toBe(1);
    expect((await db.configuracao.get(ID_CONFIG))?.anoNumeracao).toBe(2027);
  });
});

describe('orcamento gravado', () => {
  it('sobrevive a ida e volta do banco com o mesmo total', async () => {
    const config = await lerConfiguracao();
    const original = orcamentoDaIgreja();
    await db.orcamentos.put(original);

    const lido = await db.orcamentos.get(original.id);
    expect(lido).toBeDefined();
    expect(zOrcamento.safeParse(lido).success).toBe(true);

    const totais = calcularTotais(lido!, {
      percentualEntradaPadrao: config.percentualEntradaPadrao,
    });
    expect(totais.totalDosServicos).toBe(2_560_000);
    expect(totais.aPagar).toBe(2_560_000 - 768_000);
  });
});

describe('catalogo de servicos', () => {
  it('se constroi pelo uso e conta as repeticoes', async () => {
    await registrarUso('PERGOLADO GARAGEM', 'UNID.', 150_000);
    await registrarUso('PERGOLADO GARAGEM', 'UNID.', 160_000);
    await registrarUso('FACHADA ALTA', 'M²', 90_000);

    const todos = await db.servicos.toArray();
    expect(todos).toHaveLength(2);
    const pergolado = todos.find((s) => s.descricao === 'PERGOLADO GARAGEM');
    expect(pergolado?.usos).toBe(2);
    expect(pergolado?.valorReferencia).toBe(160_000);
  });

  it('ignora descricao vazia', async () => {
    await registrarUso('   ', undefined, undefined);
    expect(await db.servicos.count()).toBe(0);
  });
});

describe('backup', () => {
  it('exporta, valida e reimporta sem perder nada', async () => {
    await lerConfiguracao();
    await db.clientes.put({ id: 'c1', nome: 'Igreja Portal Pérola 2', criadoEm: amb.agora() });
    await db.orcamentos.put(orcamentoDaIgreja());

    const backup = await exportarBackup();
    const texto = backupParaTexto(backup);

    await limpar();
    expect(await db.orcamentos.count()).toBe(0);

    const resultado = await importarBackup(texto);
    expect(resultado.orcamentos).toBe(1);
    expect(resultado.clientes).toBe(1);
    expect(await db.orcamentos.count()).toBe(1);
    expect((await lerConfiguracao()).empresa.cnpj).toBe('66.612.836/0001-55');
  });

  it('recusa arquivo que nao e JSON', async () => {
    await expect(importarBackup('nao sou json')).rejects.toThrow(/JSON/i);
  });

  it('recusa backup com formato invalido, sem gravar nada pela metade', async () => {
    const ruim = JSON.stringify({ versao: 1, exportadoEm: 'ontem', configuracao: {} });
    await expect(importarBackup(ruim)).rejects.toThrow(/backup inválido|backup invalido/i);
    expect(await db.orcamentos.count()).toBe(0);
  });
});

describe('migração v2 do desconto', () => {
  /*
   * Até a v1 o desconto era um objeto com dois modos, porque a regra estava em
   * aberto. Confirmado que é em reais e sem teto, virou centavos simples — e
   * quem já tiver orçamento gravado não pode perder o valor.
   */
  it('mantém o valor de um desconto já em reais', () => {
    expect(descontoEmCentavos({ desconto: { modo: 'reais', centavos: 50_000 } })).toBe(50_000);
  });

  it('resolve o percentual contra o total daquele orçamento', () => {
    const antigo = {
      desconto: { modo: 'percentual', percentual: 1000 }, // 10,00%
      acrescimoNotaFiscal: 100_000,
      secoes: [{ linhas: [{ quantidade: 1, valorUnitario: 1_000_000 }] }],
    };
    // 10% de (1.000.000 + 100.000)
    expect(descontoEmCentavos(antigo)).toBe(110_000);
  });

  it('resolve o percentual sobre bloco com preço fechado', () => {
    const antigo = {
      desconto: { modo: 'percentual', percentual: 500 }, // 5,00%
      secoes: [{ precoFechado: 2_560_000, linhas: [{ quantidade: 1 }] }],
    };
    expect(descontoEmCentavos(antigo)).toBe(128_000);
  });

  it('já em centavos, passa direto', () => {
    expect(descontoEmCentavos({ desconto: 12_345 })).toBe(12_345);
  });

  it('ausente ou estranho vira zero, sem estourar', () => {
    expect(descontoEmCentavos({})).toBe(0);
    expect(descontoEmCentavos({ desconto: null })).toBe(0);
    expect(descontoEmCentavos({ desconto: { modo: 'sei-la' } })).toBe(0);
  });

  it('nunca devolve negativo', () => {
    expect(descontoEmCentavos({ desconto: -500 })).toBe(0);
    expect(descontoEmCentavos({ desconto: { modo: 'reais', centavos: -500 } })).toBe(0);
  });
});
