/**
 * Repositorio sobre o Firestore.
 *
 * Um documento por registro, igual ao objeto do dominio (spec §3.1). Tudo que
 * volta do banco passa pelo zod: documento que nao bate com o esquema e
 * ignorado com aviso no console, em vez de derrubar a tela inteira.
 */
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
  type CollectionReference,
  type DocumentData,
  type DocumentReference,
  type Firestore,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';
import type { ZodType } from 'zod';
import { VERSAO_BACKUP, zCliente, zConfiguracao, zOrcamento, zServico } from '../domain/esquemas';
import { ID_CONFIG, configuracaoPadrao, type ConfiguracaoGuardada } from './configuracao';
import type { Cancelar, Ouvinte, Repositorio } from './repositorio';
import { marcarSemAcesso } from './sessao';

/**
 * Id do servico: derivado da descricao, para `registrarUso` ser uma transacao
 * num documento so (o SDK web nao consulta dentro de transacao). FNV-1a em
 * base 36 — curto, estavel, e colisao num catalogo de centenas e desprezivel.
 */
export function idDoServico(descricao: string): string {
  let h = 0x811c9dc5;
  for (const ch of descricao.trim()) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `s${h.toString(36)}`;
}

/** Tira `undefined` (o Firestore ja ignora, mas o zod do lado de la nao). */
function semUndefined<T extends object>(objeto: T): T {
  return Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== undefined)) as T;
}

function validar<T>(esquema: ZodType<T>, bruto: DocumentData, onde: string): T | undefined {
  const r = esquema.safeParse(bruto);
  if (r.success) return r.data;
  console.warn(`[firestore] ${onde}: documento fora do esquema, ignorado`, r.error.issues[0]);
  return undefined;
}

function lista<T>(snap: QuerySnapshot, esquema: ZodType<T>, onde: string): T[] {
  const itens: T[] = [];
  snap.forEach((d) => {
    const v = validar(esquema, d.data(), `${onde}/${d.id}`);
    if (v !== undefined) itens.push(v);
  });
  return itens;
}

const LOTE = 450; // abaixo do limite de 500 escritas por batch

export function criarRepositorioFirestore(db: Firestore): Repositorio {
  const clientes = collection(db, 'clientes');
  const servicos = collection(db, 'servicos');
  const orcamentos = collection(db, 'orcamentos');
  const configuracao = doc(db, 'configuracao', ID_CONFIG);

  const consultaOrcamentos = query(orcamentos, orderBy('alteradoEm', 'desc'));
  const consultaClientes = query(clientes, orderBy('nome'));
  const consultaServicos = query(servicos, orderBy('usos', 'desc'));

  function observarLista<T>(
    q: Query,
    esquema: ZodType<T>,
    onde: string,
    ouvinte: Ouvinte<T[]>,
  ): Cancelar {
    return onSnapshot(
      q,
      (snap) => ouvinte(lista(snap, esquema, onde)),
      (erro) => {
        if (erro.code === 'permission-denied') marcarSemAcesso();
        else console.error(`[firestore] ${onde}`, erro);
      },
    );
  }

  async function lerLista<T>(q: Query, esquema: ZodType<T>, onde: string): Promise<T[]> {
    return lista(await getDocs(q), esquema, onde);
  }

  async function lerConfiguracao(): Promise<ConfiguracaoGuardada> {
    const snap = await getDoc(configuracao);
    if (snap.exists()) {
      const v = validar(zConfiguracao, snap.data(), 'configuracao');
      if (v) return { id: ID_CONFIG, ...v };
    }
    const padrao = configuracaoPadrao();
    const { id: _id, ...dados } = padrao;
    await setDoc(configuracao, semUndefined(dados));
    return padrao;
  }

  async function apagarTodos(...colecoes: CollectionReference[]): Promise<void> {
    for (const c of colecoes) {
      const snap = await getDocs(c);
      for (let i = 0; i < snap.docs.length; i += LOTE) {
        const lote = writeBatch(db);
        for (const d of snap.docs.slice(i, i + LOTE)) lote.delete(d.ref);
        await lote.commit();
      }
    }
  }

  return {
    observarOrcamentos: (ouvinte) =>
      observarLista(consultaOrcamentos, zOrcamento, 'orcamentos', ouvinte),
    observarClientes: (ouvinte) => observarLista(consultaClientes, zCliente, 'clientes', ouvinte),
    observarServicos: (ouvinte) => observarLista(consultaServicos, zServico, 'servicos', ouvinte),
    observarCliente: (id, ouvinte) =>
      onSnapshot(
        doc(clientes, id),
        (snap) =>
          ouvinte(snap.exists() ? validar(zCliente, snap.data(), `clientes/${id}`) : undefined),
        (erro) => {
          if (erro.code === 'permission-denied') marcarSemAcesso();
        },
      ),

    lerOrcamento: async (id) => {
      const snap = await getDoc(doc(orcamentos, id));
      return snap.exists() ? validar(zOrcamento, snap.data(), `orcamentos/${id}`) : undefined;
    },
    lerCliente: async (id) => {
      const snap = await getDoc(doc(clientes, id));
      return snap.exists() ? validar(zCliente, snap.data(), `clientes/${id}`) : undefined;
    },
    listarOrcamentos: () => lerLista(consultaOrcamentos, zOrcamento, 'orcamentos'),
    listarClientes: () => lerLista(consultaClientes, zCliente, 'clientes'),
    listarServicos: () => lerLista(consultaServicos, zServico, 'servicos'),
    contarOrcamentosDoCliente: async (id) =>
      (await getCountFromServer(query(orcamentos, where('clienteId', '==', id)))).data().count,

    gravarOrcamento: async (o) => {
      await setDoc(doc(orcamentos, o.id), semUndefined(o));
    },
    gravarCliente: async (c) => {
      await setDoc(doc(clientes, c.id), semUndefined(c));
    },
    atualizarCliente: async (id, campos) => {
      await runTransaction(db, async (tx) => {
        const ref = doc(clientes, id);
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const atual = validar(zCliente, snap.data(), `clientes/${id}`);
        if (!atual) return;
        tx.set(ref, semUndefined({ ...atual, ...campos, id }));
      });
    },
    gravarServico: async (s) => {
      // no Firestore o id do servico e sempre o hash da descricao
      const id = idDoServico(s.descricao);
      await setDoc(doc(servicos, id), semUndefined({ ...s, id }));
    },
    excluirOrcamento: async (id) => {
      await deleteDoc(doc(orcamentos, id));
    },
    excluirCliente: async (id) => {
      await deleteDoc(doc(clientes, id));
    },
    excluirServico: async (id) => {
      await deleteDoc(doc(servicos, id));
    },
    registrarUso: async (descricao, unidade, valorReferencia) => {
      const texto = descricao.trim();
      if (texto === '') return;
      const agora = new Date().toISOString();
      const extras = {
        ...(unidade !== undefined ? { unidade } : {}),
        ...(valorReferencia !== undefined ? { valorReferencia } : {}),
      };
      const id = idDoServico(texto);
      const ref = doc(servicos, id);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(ref);
        const existente = snap.exists()
          ? validar(zServico, snap.data(), `servicos/${id}`)
          : undefined;
        if (existente) {
          tx.set(ref, { ...existente, usos: existente.usos + 1, usadoEm: agora, ...extras });
        } else {
          tx.set(ref, { id, descricao: texto, usos: 1, usadoEm: agora, ...extras });
        }
      });
    },

    lerConfiguracao,
    gravarConfiguracao: async (config) => {
      const { id: _id, ...dados } = config;
      await setDoc(configuracao, semUndefined(dados));
    },
    reservarNumero: (ano) =>
      runTransaction(db, async (tx) => {
        const snap = await tx.get(configuracao);
        const guardada = snap.exists()
          ? validar(zConfiguracao, snap.data(), 'configuracao')
          : undefined;
        const { id: _id, ...padrao } = configuracaoPadrao(ano);
        const config = guardada ?? padrao;
        const sequencial = config.anoNumeracao === ano ? config.proximoNumero : 1;
        tx.set(
          configuracao,
          semUndefined({ ...config, anoNumeracao: ano, proximoNumero: sequencial + 1 }),
        );
        return { sequencial, ano };
      }),

    exportarTudo: async () => {
      const [config, cs, ss, os] = await Promise.all([
        lerConfiguracao(),
        lerLista(consultaClientes, zCliente, 'clientes'),
        lerLista(consultaServicos, zServico, 'servicos'),
        lerLista(consultaOrcamentos, zOrcamento, 'orcamentos'),
      ]);
      const { id: _id, ...dados } = config;
      return {
        versao: VERSAO_BACKUP,
        exportadoEm: new Date().toISOString(),
        configuracao: dados,
        clientes: cs,
        servicos: ss,
        orcamentos: os,
      };
    },
    importarTudo: async (backup, { substituir }) => {
      if (substituir) await apagarTodos(clientes, servicos, orcamentos);
      const lotes = [writeBatch(db)];
      let n = 0;
      const gravar = (ref: DocumentReference, dados: object) => {
        if (n > 0 && n % LOTE === 0) lotes.push(writeBatch(db));
        lotes[lotes.length - 1]!.set(ref, semUndefined(dados));
        n += 1;
      };
      gravar(configuracao, backup.configuracao);
      for (const c of backup.clientes) gravar(doc(clientes, c.id), c);
      for (const s of backup.servicos) {
        const id = idDoServico(s.descricao);
        gravar(doc(servicos, id), { ...s, id });
      }
      for (const o of backup.orcamentos) gravar(doc(orcamentos, o.id), o);
      for (const lote of lotes) await lote.commit();
    },
    limparTudo: async () => {
      await apagarTodos(clientes, servicos, orcamentos);
      await deleteDoc(configuracao);
    },
  };
}
