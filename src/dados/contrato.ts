/**
 * O contrato de `Repositorio`, como suite reutilizavel.
 *
 * Toda implementacao roda exatamente estes testes: memoria, Dexie e, no PR 2,
 * Firestore no emulador. O que passa aqui e o que as telas podem esperar.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type { Repositorio } from './repositorio';
import { ambientePadrao, orcamentoNovo } from '../domain/fabrica';
import { calcularTotais } from '../domain/orcamento';
import { zOrcamento, type Cliente, type Orcamento } from '../domain/esquemas';

const amb = ambientePadrao;

export function orcamentoDaIgreja(): Orcamento {
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
        ],
      },
    ],
  };
}

/** Espera o proximo valor que um `observar*` entregar. */
function proximo<T>(inscrever: (ouvinte: (v: T) => void) => () => void): Promise<T> {
  return new Promise((resolver) => {
    const cancelar = inscrever((v) => {
      resolver(v);
      queueMicrotask(cancelar);
    });
  });
}

const esperar = (ms: number) => new Promise((ok) => setTimeout(ok, ms));

export function testarContrato(nome: string, criar: () => Promise<Repositorio>): void {
  describe(`contrato de Repositorio — ${nome}`, () => {
    let r: Repositorio;

    beforeEach(async () => {
      r = await criar();
      await r.limparTudo();
    });

    describe('configuracao', () => {
      it('cria a padrao na primeira leitura e mantem depois', async () => {
        const primeira = await r.lerConfiguracao();
        expect(primeira.empresa.cnpj).toBe('66.612.836/0001-55');
        expect(primeira.percentualEntradaPadrao).toBe(3000);

        await r.gravarConfiguracao({ ...primeira, proximoNumero: 42 });
        expect((await r.lerConfiguracao()).proximoNumero).toBe(42);
      });
    });

    describe('numeracao', () => {
      it('avanca dentro do mesmo ano', async () => {
        await r.lerConfiguracao();
        expect((await r.reservarNumero(2026)).sequencial).toBe(1);
        expect((await r.reservarNumero(2026)).sequencial).toBe(2);
        expect((await r.reservarNumero(2026)).sequencial).toBe(3);
      });

      it('reinicia quando vira o ano (D6)', async () => {
        await r.lerConfiguracao();
        await r.reservarNumero(2026);
        await r.reservarNumero(2026);
        expect((await r.reservarNumero(2027)).sequencial).toBe(1);
        expect((await r.lerConfiguracao()).anoNumeracao).toBe(2027);
      });

      it('duas reservas ao mesmo tempo nao repetem numero', async () => {
        await r.lerConfiguracao();
        const [a, b] = await Promise.all([r.reservarNumero(2026), r.reservarNumero(2026)]);
        expect(new Set([a.sequencial, b.sequencial]).size).toBe(2);
      });
    });

    describe('orcamentos', () => {
      it('sobrevive a ida e volta com o mesmo total', async () => {
        const config = await r.lerConfiguracao();
        const original = orcamentoDaIgreja();
        await r.gravarOrcamento(original);

        const lido = await r.lerOrcamento(original.id);
        expect(lido).toBeDefined();
        expect(zOrcamento.safeParse(lido).success).toBe(true);

        const totais = calcularTotais(lido!, {
          percentualEntradaPadrao: config.percentualEntradaPadrao,
        });
        expect(totais.totalDosServicos).toBe(2_560_000);
      });

      it('lista do mais recente para o mais antigo e observa mudancas', async () => {
        const antigo = {
          ...orcamentoDaIgreja(),
          id: 'o-antigo',
          alteradoEm: '2026-01-01T00:00:00.000Z',
        };
        const novo = {
          ...orcamentoDaIgreja(),
          id: 'o-novo',
          alteradoEm: '2026-02-01T00:00:00.000Z',
        };
        await r.gravarOrcamento(antigo);
        await r.gravarOrcamento(novo);

        expect((await r.listarOrcamentos()).map((o) => o.id)).toEqual(['o-novo', 'o-antigo']);
        expect((await proximo(r.observarOrcamentos)).map((o) => o.id)).toEqual([
          'o-novo',
          'o-antigo',
        ]);

        const recebidos: string[][] = [];
        const cancelar = r.observarOrcamentos((lista) => recebidos.push(lista.map((o) => o.id)));
        await r.excluirOrcamento('o-novo');
        await esperar(50);
        cancelar();
        expect(recebidos.at(-1)).toEqual(['o-antigo']);

        // depois de cancelar, nada mais chega
        const quantos = recebidos.length;
        await r.gravarOrcamento(novo);
        await esperar(50);
        expect(recebidos.length).toBe(quantos);
      });

      it('conta os orcamentos de um cliente', async () => {
        await r.gravarOrcamento({ ...orcamentoDaIgreja(), id: 'a', clienteId: 'c1' });
        await r.gravarOrcamento({ ...orcamentoDaIgreja(), id: 'b', clienteId: 'c1' });
        await r.gravarOrcamento({ ...orcamentoDaIgreja(), id: 'c', clienteId: 'c2' });
        expect(await r.contarOrcamentosDoCliente('c1')).toBe(2);
        expect(await r.contarOrcamentosDoCliente('ninguem')).toBe(0);
      });
    });

    describe('clientes', () => {
      it('ordena por nome e atualiza removendo campo undefined', async () => {
        await r.gravarCliente({ id: 'c2', nome: 'Zé da Serralheria', criadoEm: amb.agora() });
        await r.gravarCliente({
          id: 'c1',
          nome: 'Ana Portões',
          criadoEm: amb.agora(),
          email: 'a@x.com',
        });

        expect((await r.listarClientes()).map((c) => c.nome)).toEqual([
          'Ana Portões',
          'Zé da Serralheria',
        ]);

        await r.atualizarCliente('c1', { contato: 'Dona Ana', email: undefined });
        const ana = await r.lerCliente('c1');
        expect(ana?.contato).toBe('Dona Ana');
        expect(ana?.email).toBeUndefined();
        expect('email' in (ana ?? {})).toBe(false);
      });

      it('observa um cliente pelo id, inclusive quando some', async () => {
        await r.gravarCliente({ id: 'c1', nome: 'Ana', criadoEm: amb.agora() });
        const visto = await proximo<Cliente | undefined>((ou) => r.observarCliente('c1', ou));
        expect(visto).toMatchObject({ nome: 'Ana' });

        await r.excluirCliente('c1');
        expect(await r.lerCliente('c1')).toBeUndefined();
        expect(await proximo((ou) => r.observarCliente('c1', ou))).toBeUndefined();
      });
    });

    describe('catalogo de servicos', () => {
      it('se constroi pelo uso e conta as repeticoes', async () => {
        await r.registrarUso('PERGOLADO GARAGEM', 'UNID.', 150_000);
        await r.registrarUso('PERGOLADO GARAGEM', 'UNID.', 160_000);
        await r.registrarUso('FACHADA ALTA', 'M²', 90_000);

        const todos = await r.listarServicos();
        expect(todos).toHaveLength(2);
        expect(todos[0]?.descricao).toBe('PERGOLADO GARAGEM'); // mais usado primeiro
        expect(todos[0]?.usos).toBe(2);
        expect(todos[0]?.valorReferencia).toBe(160_000);
      });

      it('ignora descricao vazia', async () => {
        await r.registrarUso('   ', undefined, undefined);
        expect(await r.listarServicos()).toHaveLength(0);
      });

      it('exclui e o servico volta se for usado de novo', async () => {
        await r.registrarUso('PORTÃO', 'UNID.', 100);
        const [s] = await r.listarServicos();
        await r.excluirServico(s!.id);
        expect(await r.listarServicos()).toHaveLength(0);
        await r.registrarUso('PORTÃO', 'UNID.', 100);
        expect(await r.listarServicos()).toHaveLength(1);
      });
    });

    describe('backup', () => {
      it('exporta e reimporta sem perder nada', async () => {
        await r.lerConfiguracao();
        await r.gravarCliente({ id: 'c1', nome: 'Igreja Portal Pérola 2', criadoEm: amb.agora() });
        await r.gravarOrcamento(orcamentoDaIgreja());
        await r.registrarUso('FACHADA', 'M²', 1);

        const backup = await r.exportarTudo();
        expect(backup.orcamentos).toHaveLength(1);

        await r.limparTudo();
        expect(await r.listarOrcamentos()).toHaveLength(0);

        await r.importarTudo(backup, { substituir: false });
        expect(await r.listarOrcamentos()).toHaveLength(1);
        expect(await r.listarClientes()).toHaveLength(1);
        expect(await r.listarServicos()).toHaveLength(1);
        expect((await r.lerConfiguracao()).empresa.cnpj).toBe('66.612.836/0001-55');
      });

      it('mescla por id sem substituir; substitui quando pedido', async () => {
        await r.lerConfiguracao();
        await r.gravarOrcamento({ ...orcamentoDaIgreja(), id: 'meu' });
        const backup = await r.exportarTudo();
        backup.orcamentos = [{ ...orcamentoDaIgreja(), id: 'do-arquivo' }];

        await r.importarTudo(backup, { substituir: false });
        expect((await r.listarOrcamentos()).map((o) => o.id).sort()).toEqual(['do-arquivo', 'meu']);

        await r.importarTudo(backup, { substituir: true });
        expect((await r.listarOrcamentos()).map((o) => o.id)).toEqual(['do-arquivo']);
      });
    });
  });
}
