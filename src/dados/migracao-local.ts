/**
 * Le o banco da versao anterior — o IndexedDB `aa-montagens` que o Dexie
 * criava no navegador — e devolve como `Backup`, para entrar na nuvem pelo
 * mesmo caminho do arquivo.
 *
 * API nativa, sem Dexie: o Dexie saiu do projeto e nao vale trazer de volta
 * so para ler uma vez. Os object stores tem o nome das tabelas e `id` como
 * chave; `getAll()` devolve os registros como foram gravados.
 *
 * Cuidado com `indexedDB.open` sem versao: se o banco nao existe, ele CRIA um
 * vazio. Por isso o `onupgradeneeded` aborta — e o unico jeito de "abrir so
 * se existir" que funciona em todo navegador (`indexedDB.databases()` nao e
 * universal).
 */
import { VERSAO_BACKUP, zBackup, type Backup } from '../domain/esquemas';

export const NOME_BANCO_LOCAL = 'aa-montagens';
const TABELAS = ['configuracao', 'clientes', 'servicos', 'orcamentos'] as const;

function abrirSeExistir(): Promise<IDBDatabase | null> {
  return new Promise((resolver) => {
    if (typeof indexedDB === 'undefined') {
      resolver(null);
      return;
    }
    const pedido = indexedDB.open(NOME_BANCO_LOCAL);
    pedido.onupgradeneeded = () => {
      // nao existia: aborta antes de criar um banco vazio
      pedido.transaction?.abort();
      resolver(null);
    };
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => resolver(null);
    pedido.onblocked = () => resolver(null);
  });
}

function lerTudo(db: IDBDatabase, tabela: string): Promise<unknown[]> {
  return new Promise((resolver) => {
    if (!db.objectStoreNames.contains(tabela)) {
      resolver([]);
      return;
    }
    const pedido = db.transaction(tabela, 'readonly').objectStore(tabela).getAll();
    pedido.onsuccess = () => resolver(pedido.result as unknown[]);
    pedido.onerror = () => resolver([]);
  });
}

/**
 * O que a versao anterior deixou neste aparelho, ja validado — ou `null` se
 * nao ha banco, esta vazio, ou nao bate com o esquema.
 */
export async function lerBancoLocal(): Promise<Backup | null> {
  const db = await abrirSeExistir();
  if (!db) return null;
  try {
    const [configuracoes, clientes, servicos, orcamentos] = await Promise.all(
      TABELAS.map((t) => lerTudo(db, t)),
    );
    if (orcamentos!.length === 0 && clientes!.length === 0) return null;

    const guardada = (configuracoes![0] ?? null) as Record<string, unknown> | null;
    const { id: _id, ...configuracao } = guardada ?? {};
    const bruto = {
      versao: VERSAO_BACKUP,
      exportadoEm: new Date().toISOString(),
      configuracao,
      clientes,
      servicos,
      orcamentos,
    };
    const analise = zBackup.safeParse(bruto);
    if (!analise.success) {
      console.warn('[migracao] banco local fora do esquema, ignorado', analise.error.issues[0]);
      return null;
    }
    return analise.data;
  } finally {
    db.close();
  }
}

/** Apaga o banco antigo — depois de importado, para a oferta nao voltar. */
export function apagarBancoLocal(): Promise<void> {
  return new Promise((resolver) => {
    if (typeof indexedDB === 'undefined') {
      resolver();
      return;
    }
    const pedido = indexedDB.deleteDatabase(NOME_BANCO_LOCAL);
    pedido.onsuccess = () => resolver();
    pedido.onerror = () => resolver();
    pedido.onblocked = () => resolver();
  });
}
