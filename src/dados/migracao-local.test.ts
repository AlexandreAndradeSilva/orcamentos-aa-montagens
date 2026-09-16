/**
 * Leitura do banco da versao anterior, com o IndexedDB povoado do jeito que
 * o Dexie povoava: um object store por tabela, `id` como chave.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apagarBancoLocal, lerBancoLocal, NOME_BANCO_LOCAL } from './migracao-local';
import { configuracaoPadrao } from './configuracao';
import { orcamentoDaIgreja } from './contrato';

function semear(registros: {
  configuracao?: object[];
  clientes?: object[];
  orcamentos?: object[];
}) {
  return new Promise<void>((resolver, rejeitar) => {
    const pedido = indexedDB.open(NOME_BANCO_LOCAL, 2);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      for (const t of ['configuracao', 'clientes', 'servicos', 'orcamentos']) {
        db.createObjectStore(t, { keyPath: 'id' });
      }
    };
    pedido.onsuccess = () => {
      const db = pedido.result;
      const tx = db.transaction(['configuracao', 'clientes', 'orcamentos'], 'readwrite');
      for (const c of registros.configuracao ?? []) tx.objectStore('configuracao').put(c);
      for (const c of registros.clientes ?? []) tx.objectStore('clientes').put(c);
      for (const o of registros.orcamentos ?? []) tx.objectStore('orcamentos').put(o);
      tx.oncomplete = () => {
        db.close();
        resolver();
      };
      tx.onerror = () => rejeitar(new Error(String(tx.error)));
    };
    pedido.onerror = () => rejeitar(new Error(String(pedido.error)));
  });
}

beforeEach(() => {
  // IndexedDB novo a cada teste
  vi.stubGlobal('indexedDB', new IDBFactory());
});

describe('lerBancoLocal', () => {
  it('sem banco, devolve null — e nao cria um vazio no caminho', async () => {
    expect(await lerBancoLocal()).toBeNull();
    const bancos = await indexedDB.databases();
    expect(bancos.find((b) => b.name === NOME_BANCO_LOCAL)).toBeUndefined();
  });

  it('banco sem orcamento nem cliente conta como nada', async () => {
    await semear({ configuracao: [configuracaoPadrao(2026)] });
    expect(await lerBancoLocal()).toBeNull();
  });

  it('devolve um Backup valido com o que estava gravado', async () => {
    await semear({
      configuracao: [{ ...configuracaoPadrao(2026), proximoNumero: 7 }],
      clientes: [
        { id: 'c1', nome: 'Igreja Portal Pérola 2', criadoEm: '2026-08-14T00:00:00.000Z' },
      ],
      orcamentos: [orcamentoDaIgreja()],
    });
    const backup = await lerBancoLocal();
    expect(backup).not.toBeNull();
    expect(backup!.orcamentos).toHaveLength(1);
    expect(backup!.clientes[0]?.nome).toBe('Igreja Portal Pérola 2');
    expect(backup!.configuracao.proximoNumero).toBe(7);
    expect('id' in backup!.configuracao).toBe(false);
  });

  it('registro fora do esquema invalida tudo, em vez de entrar pela metade', async () => {
    await semear({
      configuracao: [configuracaoPadrao(2026)],
      orcamentos: [{ id: 'quebrado', numero: 12 }],
    });
    expect(await lerBancoLocal()).toBeNull();
  });
});

describe('apagarBancoLocal', () => {
  it('apaga, e a leitura seguinte devolve null', async () => {
    await semear({ configuracao: [configuracaoPadrao(2026)], orcamentos: [orcamentoDaIgreja()] });
    expect(await lerBancoLocal()).not.toBeNull();
    await apagarBancoLocal();
    expect(await lerBancoLocal()).toBeNull();
  });
});
