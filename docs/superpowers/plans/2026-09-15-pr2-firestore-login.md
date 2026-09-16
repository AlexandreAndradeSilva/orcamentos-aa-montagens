# PR 2 — Firestore, login e regras — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a persistência local pelo Firestore, com login por e-mail e senha verificado no servidor, regras que só deixam a lista de e-mails entrar, e testes no emulador.

**Architecture:** `firestore.ts` implementa a interface `Repositorio` (PR 1) sobre o SDK web do Firebase; `sessao.ts` encapsula o Auth; a tela `Entrar` é a porta; o `App` só renderiza as rotas com sessão válida. Dexie e fake-indexeddb saem. O contrato do PR 1 roda contra o emulador, e as regras têm suíte própria com `@firebase/rules-unit-testing`.

**Tech Stack:** firebase 12 (modular), @firebase/rules-unit-testing 5, firebase-tools 15 (emulador; precisa de Java 17+), vitest com um segundo config para os testes do emulador.

**Spec:** `docs/superpowers/specs/2026-09-15-nuvem-firebase-design.md` §3.1, §3.3–3.6, §4, §5 (PR 2).

**Regra do projeto:** nada sobe ao git sem comando explícito. Os "Commit" ficam pendentes.

**Dados do projeto (fornecidos pelo Alexandre em 15/09/2026):** projectId `orcamentos-aa-montagens`; e-mail autorizado `aamontagens@hotmail.com` (sem "s" — diferente do e-mail da empresa no PDF, de propósito).

---

## Mapa de arquivos

| Arquivo                                                                        | Ação      | Responsabilidade                                                                                                 |
| ------------------------------------------------------------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `src/dados/firebase-config.ts`                                                 | criar     | o objeto `firebaseConfig` (público por natureza)                                                                 |
| `src/dados/firebase.ts`                                                        | criar     | inicializa app, Firestore (`ignoreUndefinedProperties`) e Auth                                                   |
| `src/dados/firestore.ts`                                                       | criar     | `criarRepositorioFirestore(db)` — a implementação                                                                |
| `src/dados/sessao.ts`                                                          | criar     | `observarSessao`, `entrar`, `sair`, `pedirNovaSenha`, `marcarSemAcesso`                                          |
| `src/dados/rede.ts`                                                            | criar     | `useOnline()` por `useSyncExternalStore`                                                                         |
| `src/telas/Entrar.tsx` + `entrar.css`                                          | criar     | tela de login                                                                                                    |
| `src/telas/SemAcesso.tsx`                                                      | criar     | conta autenticada fora da lista                                                                                  |
| `src/App.tsx`                                                                  | modificar | porta por sessão; faixa "sem conexão"; botão Sair na barra                                                       |
| `src/main.tsx`                                                                 | modificar | `usarRepositorio(criarRepositorioFirestore(bancoFirestore()))`                                                   |
| `src/estado/editor.ts`                                                         | modificar | `salvar` com limite de tempo                                                                                     |
| `src/teste/preparo.ts`                                                         | modificar | sem fake-indexeddb                                                                                               |
| `src/dados/db.ts`, `dexie.ts`, `dexie.test.ts`, `db.test.ts`                   | apagar    | (o teste do arquivo de backup migra para `backup.test.ts`)                                                       |
| `src/dados/backup.test.ts`                                                     | criar     | os testes do arquivo de backup que estavam em `db.test.ts`                                                       |
| `src/dados/firestore.emulador.test.ts`                                         | criar     | contrato contra o emulador                                                                                       |
| `src/dados/regras.emulador.test.ts`                                            | criar     | quem entra e quem não entra                                                                                      |
| `src/telas/entrar.test.tsx`                                                    | criar     | tela de login com `sessao` simulada                                                                              |
| `src/App.test.tsx`                                                             | modificar | monta com sessão simulada                                                                                        |
| `firestore.rules`, `firebase.json`, `.firebaserc`, `vitest.emulador.config.ts` | criar     | regras e emulador                                                                                                |
| `package.json`                                                                 | modificar | deps: +firebase, +@firebase/rules-unit-testing, +firebase-tools; −dexie, −fake-indexeddb; script `test:emulador` |
| `.github/workflows/publicar.yml`                                               | modificar | job `emulador` com Java                                                                                          |

---

### Task 1: Dependências e arquivos do Firebase

- [ ] **Step 1:** `npm install firebase@12` e `npm install -D @firebase/rules-unit-testing@5 firebase-tools@15`; `npm uninstall dexie fake-indexeddb`.

- [ ] **Step 2: `src/dados/firebase-config.ts`**

```ts
/**
 * Configuracao do projeto Firebase da AA Montagens.
 *
 * Publica por natureza: e o endereco do projeto, nao um segredo. O que
 * protege os dados e `firestore.rules` (so a lista de e-mails entra) e a
 * restricao da chave ao dominio do site, no Google Cloud.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyBt9zgC6O8WFbVCBhLKequIff3EYbBTflM',
  authDomain: 'orcamentos-aa-montagens.firebaseapp.com',
  projectId: 'orcamentos-aa-montagens',
  storageBucket: 'orcamentos-aa-montagens.firebasestorage.app',
  messagingSenderId: '1085216399482',
  appId: '1:1085216399482:web:e6ef4e05c3c243377e5bc3',
};
```

- [ ] **Step 3: `src/dados/firebase.ts`**

```ts
/**
 * Inicializacao do Firebase — uma vez, sob demanda.
 *
 * `ignoreUndefinedProperties`: o dominio usa `undefined` para campo ausente
 * (`exactOptionalPropertyTypes`), e o Firestore recusaria gravar isso.
 * Sem cache offline (spec §2): sem rede, o app avisa em vez de fingir.
 */
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { initializeFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';

function app(): FirebaseApp {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

let banco: Firestore | null = null;
export function bancoFirestore(): Firestore {
  banco ??= initializeFirestore(app(), { ignoreUndefinedProperties: true });
  return banco;
}

export function auth(): Auth {
  return getAuth(app());
}
```

- [ ] **Step 4: `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Quem entra. Para acrescentar alguem, acrescente o e-mail aqui e publique:
    //   npx firebase deploy --only firestore:rules
    function autorizado() {
      return request.auth != null
        && request.auth.token.email in ['aamontagens@hotmail.com'];
    }
    match /{document=**} {
      allow read, write: if autorizado();
    }
  }
}
```

- [ ] **Step 5: `firebase.json`** e **`.firebaserc`**

```json
{
  "firestore": { "rules": "firestore.rules" },
  "emulators": {
    "firestore": { "port": 8080 },
    "auth": { "port": 9099 },
    "ui": { "enabled": false },
    "singleProjectMode": true
  }
}
```

```json
{ "projects": { "default": "orcamentos-aa-montagens" } }
```

- [ ] **Step 6: `vitest.emulador.config.ts`** e o script

```ts
import { defineConfig } from 'vitest/config';

// Testes que precisam do emulador do Firebase no ar (firestore :8080).
// `npm run test:emulador` sobe o emulador, roda e derruba.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.emulador.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
```

`package.json` → `"test:emulador": "firebase emulators:exec --only firestore,auth \"vitest run -c vitest.emulador.config.ts\""`.

- [ ] **Step 7: Verificar** — `npm run typecheck` ainda passa (Dexie ainda referenciado? não: o `npm uninstall` quebra `db.ts`/`dexie.ts` — seguir direto para a Task 2, que os apaga).

---

### Task 2: `firestore.ts`, o contrato no emulador

**Files:** create `src/dados/firestore.ts`, `src/dados/firestore.emulador.test.ts`; delete `src/dados/db.ts`, `dexie.ts`, `dexie.test.ts`; move os testes de arquivo de `db.test.ts` para `backup.test.ts`.

- [ ] **Step 1: `src/dados/firestore.emulador.test.ts`** (falha até a Task terminar)

```ts
/**
 * O contrato de `Repositorio` contra o Firestore de verdade — no emulador.
 * Sem regras aqui (`withSecurityRulesDisabled`); as regras tem suite propria.
 */
import { afterAll, beforeAll } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import type { Firestore } from 'firebase/firestore';
import { testarContrato } from './contrato';
import { criarRepositorioFirestore } from './firestore';

let ambiente: RulesTestEnvironment;
let banco: Firestore;

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'contrato-firestore',
    firestore: { host: '127.0.0.1', port: 8080 },
  });
  await ambiente.withSecurityRulesDisabled(async (contexto) => {
    // o SDK de teste devolve o tipo "compat"; a implementacao usa o modular
    banco = contexto.firestore() as unknown as Firestore;
  });
});

afterAll(() => ambiente.cleanup());

testarContrato('firestore (emulador)', () => Promise.resolve(criarRepositorioFirestore(banco)));
```

Se o `withSecurityRulesDisabled` fechar o contexto ao sair do callback (e as chamadas seguintes falharem com "client has been terminated"), trocar por `ambiente.authenticatedContext('teste').firestore()` **com** regras carregadas do arquivo e o e-mail `aamontagens@hotmail.com` no token: `authenticatedContext('teste', { email: 'aamontagens@hotmail.com' })`, passando `firestore: { rules: readFileSync('firestore.rules', 'utf8'), host, port }` no `initializeTestEnvironment`. Essa segunda forma é a preferida — exercita as regras de passagem.

- [ ] **Step 2: `src/dados/firestore.ts`**

```ts
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
  type DocumentData,
  type Firestore,
  type Query,
  type QuerySnapshot,
} from 'firebase/firestore';
import type { ZodType } from 'zod';
import {
  VERSAO_BACKUP,
  zCliente,
  zConfiguracao,
  zOrcamento,
  zServico,
  type Cliente,
  type Orcamento,
  type Servico,
} from '../domain/esquemas';
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
    await setDoc(configuracao, dados);
    return padrao;
  }

  async function apagarTodos(...colecoes: ReturnType<typeof collection>[]): Promise<void> {
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
      const escritas: Array<() => void> = [];
      let lote = writeBatch(db);
      let n = 0;
      const gravar = (ref: ReturnType<typeof doc>, dados: object) => {
        lote.set(ref, semUndefined(dados));
        if (++n % LOTE === 0) {
          const pronto = lote;
          escritas.push(() => void pronto);
          lote = writeBatch(db);
        }
      };
      // (ver nota abaixo: simplificar para uma lista de lotes)
      gravar(configuracao, backup.configuracao);
      for (const c of backup.clientes) gravar(doc(clientes, c.id), c);
      for (const s of backup.servicos)
        gravar(doc(servicos, idDoServico(s.descricao)), { ...s, id: idDoServico(s.descricao) });
      for (const o of backup.orcamentos) gravar(doc(orcamentos, o.id), o);
      await lote.commit();
    },
    limparTudo: async () => {
      await apagarTodos(clientes, servicos, orcamentos);
      await deleteDoc(configuracao);
    },
  };
}
```

> **Nota sobre `importarTudo`:** a versão acima com `escritas` está errada de propósito para não ser copiada sem ler — os lotes anteriores nunca são commitados. Escreva assim:
>
> ```ts
> importarTudo: async (backup, { substituir }) => {
>   if (substituir) await apagarTodos(clientes, servicos, orcamentos);
>   const lotes = [writeBatch(db)];
>   let n = 0;
>   const gravar = (ref: DocumentReference, dados: object) => {
>     if (n > 0 && n % LOTE === 0) lotes.push(writeBatch(db));
>     lotes[lotes.length - 1]!.set(ref, semUndefined(dados));
>     n += 1;
>   };
>   gravar(configuracao, backup.configuracao);
>   for (const c of backup.clientes) gravar(doc(clientes, c.id), c);
>   for (const s of backup.servicos) {
>     const id = idDoServico(s.descricao);
>     gravar(doc(servicos, id), { ...s, id });
>   }
>   for (const o of backup.orcamentos) gravar(doc(orcamentos, o.id), o);
>   for (const lote of lotes) await lote.commit();
> },
> ```
>
> e importe `type DocumentReference` de `firebase/firestore`.

- [ ] **Step 3:** apagar `src/dados/db.ts`, `dexie.ts`, `dexie.test.ts`. Renomear `db.test.ts` → `backup.test.ts` mantendo só `configuracao padrao` e `arquivo de backup` (o `describe('migração v2 do desconto')` e o import de `descontoEmCentavos` saem: a versão publicada sempre gravou na v2, não há dado v1 para converter).

- [ ] **Step 4:** `src/teste/preparo.ts` — remover `import 'fake-indexeddb/auto';` e o comentário sobre o Dexie.

- [ ] **Step 5:** `npm run test:emulador` — Expected: contrato PASS (14). Se "Java not found": `JAVA_HOME` e `PATH` precisam ver o JDK instalado (abra um terminal novo).

- [ ] **Step 6: Commit** (pendente): `feat(dados): repositorio Firestore, contrato no emulador`

---

### Task 3: Regras no emulador

**Files:** create `src/dados/regras.emulador.test.ts`

- [ ] **Step 1:**

```ts
/**
 * Quem entra e quem nao entra — as regras de `firestore.rules`, no emulador.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

let ambiente: RulesTestEnvironment;

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'regras-aa-montagens',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(() => ambiente.cleanup());

describe('firestore.rules', () => {
  it('sem login, nada — nem ler, nem escrever', async () => {
    const db = ambiente.unauthenticatedContext().firestore();
    await assertFails(db.collection('orcamentos').get());
    await assertFails(db.collection('orcamentos').doc('x').set({ a: 1 }));
    await assertFails(db.collection('configuracao').doc('unica').get());
  });

  it('logado com outro e-mail, nada', async () => {
    const db = ambiente.authenticatedContext('intruso', { email: 'outro@exemplo.com' }).firestore();
    await assertFails(db.collection('orcamentos').get());
    await assertFails(db.collection('clientes').doc('c1').set({ nome: 'x' }));
  });

  it('logado sem e-mail no token, nada', async () => {
    const db = ambiente.authenticatedContext('anonimo').firestore();
    await assertFails(db.collection('orcamentos').get());
  });

  it('o e-mail da lista le e escreve em toda colecao', async () => {
    const db = ambiente
      .authenticatedContext('roberta', { email: 'aamontagens@hotmail.com' })
      .firestore();
    await assertSucceeds(db.collection('clientes').doc('c1').set({ nome: 'Igreja', id: 'c1' }));
    await assertSucceeds(db.collection('orcamentos').get());
    await assertSucceeds(db.collection('configuracao').doc('unica').set({ proximoNumero: 1 }));
    await assertSucceeds(db.collection('servicos').doc('s1').delete());
  });
});
```

- [ ] **Step 2:** `npm run test:emulador` — Expected: contrato + 4 regras PASS.

- [ ] **Step 3: Commit** (pendente): `test(regras): so a lista entra`

---

### Task 4: Sessão (Auth)

**Files:** create `src/dados/sessao.ts`, `src/dados/sessao.test.ts`

- [ ] **Step 1: `src/dados/sessao.ts`**

```ts
/**
 * A sessao: quem esta logado, entrar, sair, esquecer a senha.
 *
 * Encapsula o Firebase Auth para as telas nao importarem o SDK. `semAcesso`
 * e o estado de quem autenticou mas as regras recusaram (e-mail fora da
 * lista): o Firestore avisa por `marcarSemAcesso()` e a tela mostra o motivo.
 */
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';
import { useSyncExternalStore } from 'react';
import { auth as authPadrao } from './firebase';

export type Sessao =
  | { estado: 'carregando' }
  | { estado: 'fora' }
  | { estado: 'dentro'; email: string }
  | { estado: 'sem-acesso'; email: string };

let atual: Sessao = { estado: 'carregando' };
const ouvintes = new Set<() => void>();
let inscrito = false;
let obterAuth: () => Auth = authPadrao;

function definir(s: Sessao) {
  atual = s;
  for (const o of ouvintes) o();
}

/** Nos testes, troca o Auth por um simulado. */
export function usarAuth(fabrica: () => Auth): void {
  obterAuth = fabrica;
  inscrito = false;
}

function garantirInscricao() {
  if (inscrito) return;
  inscrito = true;
  onAuthStateChanged(obterAuth(), (usuario) => {
    definir(usuario?.email ? { estado: 'dentro', email: usuario.email } : { estado: 'fora' });
  });
}

export function lerSessao(): Sessao {
  garantirInscricao();
  return atual;
}

export function observarSessao(ouvinte: () => void): () => void {
  garantirInscricao();
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/** Hook para as telas. */
export function useSessao(): Sessao {
  return useSyncExternalStore(observarSessao, lerSessao);
}

/** Chamado pelo repositorio quando o servidor recusa (permission-denied). */
export function marcarSemAcesso(): void {
  if (atual.estado === 'dentro') definir({ estado: 'sem-acesso', email: atual.email });
}

const MENSAGENS: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha errados.',
  'auth/wrong-password': 'E-mail ou senha errados.',
  'auth/user-not-found': 'E-mail ou senha errados.',
  'auth/invalid-email': 'Esse e-mail não parece válido.',
  'auth/too-many-requests': 'Muitas tentativas. Espere alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem internet. Confira a conexão e tente de novo.',
  'auth/user-disabled': 'Esta conta foi desativada.',
};

/** Traduz o erro do Firebase para gente. */
export function mensagemDoErro(erro: unknown): string {
  const codigo = (erro as { code?: string } | null)?.code ?? '';
  return MENSAGENS[codigo] ?? 'Não foi possível entrar. Tente de novo.';
}

export async function entrar(email: string, senha: string): Promise<void> {
  await signInWithEmailAndPassword(obterAuth(), email.trim(), senha);
}

export async function sair(): Promise<void> {
  await signOut(obterAuth());
  definir({ estado: 'fora' });
}

export async function pedirNovaSenha(email: string): Promise<void> {
  await sendPasswordResetEmail(obterAuth(), email.trim());
}
```

- [ ] **Step 2: `src/dados/sessao.test.ts`** — só o que é puro:

```ts
import { describe, expect, it } from 'vitest';
import { mensagemDoErro } from './sessao';

describe('mensagemDoErro', () => {
  it('traduz os codigos comuns', () => {
    expect(mensagemDoErro({ code: 'auth/invalid-credential' })).toBe('E-mail ou senha errados.');
    expect(mensagemDoErro({ code: 'auth/network-request-failed' })).toMatch(/Sem internet/);
  });
  it('tem fallback para o desconhecido', () => {
    expect(mensagemDoErro(new Error('x'))).toMatch(/Não foi possível entrar/);
    expect(mensagemDoErro(null)).toMatch(/Não foi possível entrar/);
  });
});
```

Cuidado: importar `sessao.ts` puxa `./firebase` → `firebase/app`. Sem `initializeApp` chamado, nada acontece — o import é inofensivo em node.

- [ ] **Step 3:** `npx vitest run src/dados/sessao.test.ts` — PASS.

---

### Task 5: Tela `Entrar`, `SemAcesso`, faixa de rede

**Files:** create `src/telas/Entrar.tsx`, `src/telas/entrar.css`, `src/telas/SemAcesso.tsx`, `src/dados/rede.ts`, `src/telas/entrar.test.tsx`

- [ ] **Step 1: `src/telas/entrar.test.tsx`** (com `sessao` simulado)

```tsx
// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../dados/sessao', () => ({
  entrar: vi.fn(),
  pedirNovaSenha: vi.fn(),
  mensagemDoErro: (e: unknown) =>
    (e as { code?: string })?.code === 'auth/invalid-credential'
      ? 'E-mail ou senha errados.'
      : 'Não foi possível entrar. Tente de novo.',
}));

import { Entrar } from './Entrar';
import { entrar, pedirNovaSenha } from '../dados/sessao';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('tela de entrar', () => {
  it('manda e-mail e senha para a sessao', async () => {
    const usuario = userEvent.setup();
    vi.mocked(entrar).mockResolvedValue();
    render(<Entrar />);

    await usuario.type(screen.getByLabelText('E-mail'), 'aamontagens@hotmail.com');
    await usuario.type(screen.getByLabelText('Senha'), 'segredo');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(entrar).toHaveBeenCalledWith('aamontagens@hotmail.com', 'segredo');
  });

  it('mostra o erro traduzido e nao limpa o e-mail', async () => {
    const usuario = userEvent.setup();
    vi.mocked(entrar).mockRejectedValue({ code: 'auth/invalid-credential' });
    render(<Entrar />);

    await usuario.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await usuario.type(screen.getByLabelText('Senha'), 'x');
    await usuario.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha errados.');
    expect(screen.getByLabelText('E-mail')).toHaveValue('a@b.com');
  });

  it('esqueci a senha pede o e-mail de redefinicao', async () => {
    const usuario = userEvent.setup();
    vi.mocked(pedirNovaSenha).mockResolvedValue();
    render(<Entrar />);

    await usuario.type(screen.getByLabelText('E-mail'), 'a@b.com');
    await usuario.click(screen.getByRole('button', { name: /Esqueci a senha/ }));

    await waitFor(() => expect(pedirNovaSenha).toHaveBeenCalledWith('a@b.com'));
    expect(await screen.findByRole('status')).toHaveTextContent(/enviamos/i);
  });

  it('esqueci a senha sem e-mail avisa em vez de chamar', async () => {
    const usuario = userEvent.setup();
    render(<Entrar />);
    await usuario.click(screen.getByRole('button', { name: /Esqueci a senha/ }));
    expect(pedirNovaSenha).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent(/Digite o e-mail/);
  });
});
```

- [ ] **Step 2: `src/telas/Entrar.tsx`**

```tsx
/**
 * A porta do app. Sem sessao, e a unica tela que existe.
 *
 * E-mail + senha (spec §2): funciona no navegador e no app instalado na tela
 * de inicio do celular, onde login por janela/redirecionamento falha.
 */
import { useState } from 'react';
import { entrar, mensagemDoErro, pedirNovaSenha } from '../dados/sessao';
import './entrar.css';

export function Entrar() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  async function enviar() {
    setOcupado(true);
    setErro(null);
    setRecado(null);
    try {
      await entrar(email, senha);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setOcupado(false);
    }
  }

  async function esqueci() {
    setErro(null);
    setRecado(null);
    if (email.trim() === '') {
      setErro('Digite o e-mail acima para receber o link de nova senha.');
      return;
    }
    setOcupado(true);
    try {
      await pedirNovaSenha(email);
      setRecado(`Enviamos um link para ${email.trim()}. Confira a caixa de entrada (e o spam).`);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="entrar">
      <form
        className="entrar__cartao painel"
        onSubmit={(ev) => {
          ev.preventDefault();
          void enviar();
        }}
      >
        <img className="entrar__logo" src={`${import.meta.env.BASE_URL}logo-simbolo.svg`} alt="" />
        <h1>Orçamentos AA Montagens</h1>
        <p className="entrar__nota">Entre com o e-mail e a senha da oficina.</p>

        <label className="campo-envolve">
          <span className="rotulo">E-mail</span>
          <input
            className="campo"
            type="email"
            autoComplete="username"
            inputMode="email"
            autoFocus
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
          />
        </label>
        <label className="campo-envolve">
          <span className="rotulo">Senha</span>
          <input
            className="campo"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(ev) => setSenha(ev.target.value)}
          />
        </label>

        {erro && (
          <p className="faixa-erro" role="alert">
            {erro}
          </p>
        )}
        {recado && (
          <p className="recado recado--ok" role="status">
            {recado}
          </p>
        )}

        <div className="entrar__acoes">
          <button type="submit" className="botao botao--primario" disabled={ocupado}>
            {ocupado ? 'Entrando…' : 'Entrar'}
          </button>
          <button
            type="button"
            className="botao botao--texto"
            disabled={ocupado}
            onClick={() => void esqueci()}
          >
            Esqueci a senha
          </button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: `src/telas/entrar.css`**

```css
.entrar {
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: var(--e-4);
  background: var(--cor-fundo);
}

.entrar__cartao {
  width: min(100%, 400px);
  padding: var(--e-5);
  display: grid;
  gap: var(--e-3);
}

.entrar__logo {
  width: 56px;
  height: 56px;
}

.entrar__nota {
  color: var(--cor-tinta-media);
  margin: 0;
}

.entrar__acoes {
  display: flex;
  flex-direction: column;
  gap: var(--e-2);
  margin-top: var(--e-2);
}
```

(Confira em `src/estilos/tokens.css` o nome real do token de fundo — `--cor-fundo` ou `--cor-papel-fundo`; use o que existir.)

- [ ] **Step 4: `src/telas/SemAcesso.tsx`**

```tsx
import { sair } from '../dados/sessao';

/** Autenticou, mas as regras do servidor recusaram: e-mail fora da lista. */
export function SemAcesso({ email }: { email: string }) {
  return (
    <div className="entrar">
      <div className="entrar__cartao painel" role="alert">
        <h1>Esta conta não tem acesso</h1>
        <p>
          <strong>{email}</strong> entrou, mas não está na lista de quem pode usar o app da AA
          Montagens. Se for engano, fale com quem administra o sistema.
        </p>
        <button type="button" className="botao" onClick={() => void sair()}>
          Sair e entrar com outra conta
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: `src/dados/rede.ts`**

```ts
import { useSyncExternalStore } from 'react';

function inscrever(ouvinte: () => void): () => void {
  window.addEventListener('online', ouvinte);
  window.addEventListener('offline', ouvinte);
  return () => {
    window.removeEventListener('online', ouvinte);
    window.removeEventListener('offline', ouvinte);
  };
}

/** `navigator.onLine` reativo. Sem rede, nada e salvo — e o app diz isso. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    inscrever,
    () => navigator.onLine,
    () => true,
  );
}
```

- [ ] **Step 6:** `npx vitest run src/telas/entrar.test.tsx` — PASS (4).

---

### Task 6: `App` com porta, faixa e Sair; `main.tsx`; `salvar` com limite

**Files:** modify `src/App.tsx`, `src/main.tsx`, `src/estado/editor.ts`, `src/App.test.tsx`, `src/a11y.test.tsx` (se montam `App`)

- [ ] **Step 1: `src/App.tsx`** — envolver:

```tsx
import { useSessao } from './dados/sessao';
import { useOnline } from './dados/rede';
import { Entrar } from './telas/Entrar';
import { SemAcesso } from './telas/SemAcesso';
import { sair } from './dados/sessao';

export function App() {
  const sessao = useSessao();
  const online = useOnline();
  const carregarConfig = useEditor((e) => e.carregarConfig);
  const dentro = sessao.estado === 'dentro';

  useEffect(() => {
    if (dentro) void carregarConfig();
  }, [dentro, carregarConfig]);

  if (sessao.estado === 'carregando') return <p className="vazio">Carregando…</p>;
  if (sessao.estado === 'fora') return <Entrar />;
  if (sessao.estado === 'sem-acesso') return <SemAcesso email={sessao.email} />;

  return (
    <>
      {!online && (
        <p className="faixa-rede" role="status">
          Sem conexão — nada está sendo salvo. Assim que a internet voltar, continue de onde parou.
        </p>
      )}
      {/* ...header igual, com o botão Sair no fim da nav: */}
      <button type="button" className="botao botao--texto botao--mini" onClick={() => void sair()}>
        Sair
      </button>
      {/* ...main igual */}
    </>
  );
}
```

`.faixa-rede` em `src/estilos/base.css`: fundo `var(--cor-alerta-fraca)`, borda inferior `var(--cor-alerta)`, texto `var(--cor-alerta)`, `position: sticky; top: 0; z-index: 2; margin: 0; padding: var(--e-2) var(--e-4); font-size: var(--txt-sm);`.

- [ ] **Step 2: `src/main.tsx`** — `usarRepositorio(criarRepositorioFirestore(bancoFirestore()));` (imports de `./dados/firestore` e `./dados/firebase`; apagar os do Dexie).

- [ ] **Step 3: `src/estado/editor.ts`** — em `salvar`, envolver a gravação:

```ts
const LIMITE_MS = 8_000;
function comLimite<T>(promessa: Promise<T>): Promise<T> {
  return new Promise((resolver, rejeitar) => {
    const t = setTimeout(
      () => rejeitar(new Error('Sem resposta do servidor. Confira a internet e salve de novo.')),
      LIMITE_MS,
    );
    promessa.then(resolver, rejeitar).finally(() => clearTimeout(t));
  });
}
// ...
await comLimite(repositorio.gravarOrcamento(gravado));
```

O `registrarUso` em seguida fica sem limite: se a gravação passou, a rede está de pé.

- [ ] **Step 4: testes que montam `App`** (`App.test.tsx`, `a11y.test.tsx`, `cliente.test.tsx`, `exemplo.test.tsx`, `acoes.test.tsx`, `whatsapp-envio.test.tsx` — os que importam `App`): no topo, antes dos imports do app:

```ts
vi.mock('../dados/sessao', async (original) => ({
  ...(await original<typeof import('../dados/sessao')>()),
  useSessao: () => ({ estado: 'dentro', email: 'aamontagens@hotmail.com' }),
  sair: vi.fn(),
}));
```

(caminho relativo conforme o arquivo). Acrescentar em `App.test.tsx` dois testes: "sem sessão mostra a tela de entrar" (mock devolvendo `{ estado: 'fora' }` via `vi.mocked(useSessao).mockReturnValue`) e "sem acesso mostra o motivo".

- [ ] **Step 5:** `npm run typecheck && npx eslint . && npx vitest run && npm run build` — tudo limpo.

- [ ] **Step 6: Commit** (pendente): `feat: login por e-mail e senha; app so abre com sessao`

---

### Task 7: CI com emulador; docs

**Files:** modify `.github/workflows/publicar.yml`, `README.md`, `docs/publicar.md`, `docs/decisoes.md`

- [ ] **Step 1:** novo job no workflow, antes de `publicar` (que passa a `needs: [construir, emulador]`):

```yaml
emulador:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v5
    - uses: actions/setup-node@v5
      with:
        node-version: 22
        cache: npm
    - uses: actions/setup-java@v4
      with:
        distribution: temurin
        java-version: '21'
    - run: npm ci
    - name: Contrato e regras no emulador do Firebase
      run: npm run test:emulador
```

- [ ] **Step 2: docs** — `docs/decisoes.md`: nova decisão **D9 · Dados na nuvem (Firebase), login por e-mail e senha** resumindo a spec §2 e apontando para ela. `README.md`: seção "Como funciona" e "Backup — leia isto" reescritas: os dados ficam no Firestore da AA Montagens; precisa de internet; backup vira cópia extra, não a única. `docs/publicar.md` §3–4: o Cloudflare Access vira "opcional, se quiser esconder até a tela de login"; §4 "não sincroniza" sai (agora sincroniza).

- [ ] **Step 3: Commit** (pendente): `docs: nuvem, login e emulador no CI`

---

## Self-review

- Spec §3.1 (modelo), §3.3 (`firestore.ts`), §3.4 (sessão/Entrar), §3.5 (regras), §3.6 (rede, limite de tempo), §4 (testes) — cada um tem Task. §3.7 (migração) é o PR 3.
- Tipos: `criarRepositorioFirestore(db: Firestore)` (T2) usado em T6; `marcarSemAcesso` definida em T4 e importada em T2 — **ordem de execução:** escrever `sessao.ts` (T4) antes de compilar `firestore.ts` (T2), ou criar T4 primeiro. Executar na ordem **1 → 4 → 2 → 3 → 5 → 6 → 7**.
- `idDoServico` exportado (T2) para o PR 3 reaproveitar na migração.
