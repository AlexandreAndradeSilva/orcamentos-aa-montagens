# PR 1 — Fronteira `Repositorio` — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colocar uma interface `Repositorio` entre as telas e a persistência, com uma implementação em memória (testes) e um adaptador Dexie (produção), sem mudar nenhum comportamento do app.

**Architecture:** Hoje as telas chamam o Dexie direto (`db.orcamentos.put`, `useLiveQuery`). Passa a existir `src/dados/repositorio.ts` com a interface e um singleton trocável; `memoria.ts` implementa em `Map`s com ouvintes; `dexie.ts` adapta o `db.ts` atual (o Dexie sai no PR 2, quando entra o Firestore). Hooks em `src/dados/hooks.ts` substituem o `useLiveQuery`. Uma suíte de contrato (`contrato.ts`) roda nas duas implementações.

**Tech Stack:** TypeScript strict (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`), React 18, zustand, Dexie 4 (`liveQuery`), vitest + Testing Library, fake-indexeddb (só para `dexie.test.ts`).

**Spec:** `docs/superpowers/specs/2026-09-15-nuvem-firebase-design.md` §3.2, §3.3, §5 (PR 1).

**Regra do projeto:** nada sobe ao git sem comando explícito (CLAUDE.md). Os passos "Commit" abaixo ficam **pendentes do comando do usuário**; até lá, verificar e seguir.

---

## Mapa de arquivos

| Arquivo                     | Ação      | Responsabilidade                                                                  |
| --------------------------- | --------- | --------------------------------------------------------------------------------- |
| `src/dados/configuracao.ts` | criar     | `ID_CONFIG`, `ConfiguracaoGuardada`, `configuracaoPadrao` (saem de `db.ts`)       |
| `src/dados/repositorio.ts`  | criar     | interface `Repositorio`, `usarRepositorio`, singleton `repositorio`               |
| `src/dados/memoria.ts`      | criar     | `criarRepositorioMemoria()` — `Map`s + ouvintes                                   |
| `src/dados/dexie.ts`        | criar     | `criarRepositorioDexie()` — adaptador sobre `db.ts` (numeração, catálogo, backup) |
| `src/dados/db.ts`           | modificar | fica só a classe Dexie, a migration v2, `db` e `descontoEmCentavos`               |
| `src/dados/backup.ts`       | modificar | parse + zod + `repositorio.importarTudo` / `exportarTudo`; `baixarBackup` fica    |
| `src/dados/hooks.ts`        | criar     | `useOrcamentos`, `useClientes`, `useServicos`, `useCliente`                       |
| `src/dados/contrato.ts`     | criar     | `testarContrato(nome, criar)` — suíte compartilhada                               |
| `src/dados/memoria.test.ts` | criar     | roda o contrato em memória                                                        |
| `src/dados/dexie.test.ts`   | criar     | roda o contrato no Dexie (fake-indexeddb)                                         |
| `src/dados/db.test.ts`      | modificar | fica só `descontoEmCentavos` (migração v2) e a grafia do e-mail                   |
| `src/teste/preparo.ts`      | modificar | instala o repositório em memória antes de tudo                                    |
| `src/main.tsx`              | modificar | instala o adaptador Dexie                                                         |
| `src/estado/editor.ts`      | modificar | `salvar`/`carregarConfig` via `repositorio`                                       |
| `src/pdf/exportar.tsx`      | modificar | `repositorio.lerCliente`                                                          |
| `src/telas/*.tsx` (7 telas) | modificar | hooks + `repositorio.*` no lugar de `db.*`/`useLiveQuery`                         |
| testes de tela (7 arquivos) | modificar | `repositorio.limparTudo()` / `gravarOrcamento` no lugar de `db.*`                 |

---

### Task 1: `configuracao.ts` — tirar os padrões de `db.ts`

**Files:**

- Create: `src/dados/configuracao.ts`
- Modify: `src/dados/db.ts` (remover `ID_CONFIG`, `ConfiguracaoGuardada`, `configuracaoPadrao`; importar de `./configuracao`)

- [ ] **Step 1: Criar `src/dados/configuracao.ts`** com o conteúdo movido de `db.ts` (linhas `ID_CONFIG`, a interface e `configuracaoPadrao`, inclusive o comentário sobre o e-mail "aamonstagens"):

```ts
/**
 * Configuracao da empresa: o documento unico que toda implementacao de
 * `Repositorio` guarda, e o padrao gravado na primeira execucao.
 */
import type { Configuracao } from '../domain/esquemas';

/** Id do documento unico de configuracao. */
export const ID_CONFIG = 'unica';

export interface ConfiguracaoGuardada extends Configuracao {
  id: typeof ID_CONFIG;
}

/**
 * Dados da AA Montagens lidos da planilha de origem.
 *
 * O e-mail sai com a grafia "aamonstagens" de proposito: foi confirmado que
 * e assim mesmo (D7). Tudo aqui e editavel em Configuracoes.
 */
export function configuracaoPadrao(ano = new Date().getFullYear()): ConfiguracaoGuardada {
  return {
    id: ID_CONFIG,
    empresa: {
      razaoSocial: 'AA MONTAGENS',
      nomeFantasia: 'AA MONTAGENS',
      cnpj: '66.612.836/0001-55',
      endereco: 'RUA JOAO ANTONIO SANCHES, 1085',
      bairro: 'JARDIM SÃO BRAZ',
      cidade: 'BIRIGUI',
      uf: 'SP',
      cep: '16202-044',
      telefones: ['(18) 99823-0660', '(18) 99788-2819'],
      whatsapp: ['(18) 99823-0660', '(18) 99788-2819'],
      email: 'aamonstagens@hotmail.com',
    },
    proximoNumero: 1,
    anoNumeracao: ano,
    condicoesPagamentoPadrao: '30% ENTRADA, RESTANTE A COMBINAR',
    percentualEntradaPadrao: 3000,
    avisoReajuste:
      '*O MERCADO PODE SOFRER REAJUSTES DE PREÇOS. O ORÇAMENTO ESTÁ SUJEITO A ALTERAÇÃO DE VALORES.',
    // A planilha so registra "UNID."; o comentario de celula cita "UND, M, M²".
    // Lista aberta ate P11 ser respondida.
    unidades: ['UNID.', 'M', 'M²', 'ML', 'KG', 'VB', 'DIA', 'H'],
  };
}
```

- [ ] **Step 2: Em `db.ts`**, apagar as três definições e trocar por `import { ID_CONFIG, configuracaoPadrao, type ConfiguracaoGuardada } from './configuracao';` e `export { ID_CONFIG, configuracaoPadrao, type ConfiguracaoGuardada };` (re-export temporário — some na Task 9, quando os importadores mudam).

- [ ] **Step 3: Verificar** — `npm run typecheck` deve passar sem erro; `npx vitest run src/dados` verde (nada mudou de comportamento).

---

### Task 2: A interface `Repositorio`

**Files:**

- Create: `src/dados/repositorio.ts`

- [ ] **Step 1: Escrever a interface e o singleton**

```ts
/**
 * A fronteira entre o app e a persistencia.
 *
 * As telas, o estado e o PDF so conhecem esta interface. Quem a implementa
 * decide onde os dados vivem: em memoria (testes), no IndexedDB (Dexie, ate o
 * PR 2) ou no Firestore (nuvem). Trocar a implementacao nao encosta em tela.
 *
 * Convencoes:
 * - `observar*` chama o ouvinte com o estado atual assim que possivel e de
 *   novo a cada mudanca; devolve a funcao que cancela a inscricao.
 * - Ordenacoes: orcamentos por `alteradoEm` decrescente; clientes por `nome`
 *   (pt-BR); servicos por `usos` decrescente.
 * - `atualizarCliente`: campo `undefined` e REMOVIDO do documento (e assim que
 *   "campo em branco nao vira string vazia" chega ao banco).
 */
import type { Backup, Cliente, Orcamento, Servico } from '../domain/esquemas';
import type { ConfiguracaoGuardada } from './configuracao';

export type Ouvinte<T> = (valor: T) => void;
export type Cancelar = () => void;

export interface Repositorio {
  // ---- leitura reativa
  observarOrcamentos(ouvinte: Ouvinte<Orcamento[]>): Cancelar;
  observarClientes(ouvinte: Ouvinte<Cliente[]>): Cancelar;
  observarServicos(ouvinte: Ouvinte<Servico[]>): Cancelar;
  observarCliente(id: string, ouvinte: Ouvinte<Cliente | undefined>): Cancelar;

  // ---- leitura pontual
  lerOrcamento(id: string): Promise<Orcamento | undefined>;
  lerCliente(id: string): Promise<Cliente | undefined>;
  listarOrcamentos(): Promise<Orcamento[]>;
  listarClientes(): Promise<Cliente[]>;
  listarServicos(): Promise<Servico[]>;
  contarOrcamentosDoCliente(id: string): Promise<number>;

  // ---- escrita
  gravarOrcamento(orcamento: Orcamento): Promise<void>;
  gravarCliente(cliente: Cliente): Promise<void>;
  atualizarCliente(id: string, campos: Partial<Omit<Cliente, 'id'>>): Promise<void>;
  gravarServico(servico: Servico): Promise<void>;
  excluirOrcamento(id: string): Promise<void>;
  excluirCliente(id: string): Promise<void>;
  excluirServico(id: string): Promise<void>;
  /** Alimenta o catalogo: descricao vazia e ignorada; repetida soma `usos`. */
  registrarUso(
    descricao: string,
    unidade: string | undefined,
    valorReferencia: number | undefined,
  ): Promise<void>;

  // ---- configuracao e numeracao
  /** Le a configuracao, criando a padrao na primeira execucao. */
  lerConfiguracao(): Promise<ConfiguracaoGuardada>;
  gravarConfiguracao(config: ConfiguracaoGuardada): Promise<void>;
  /** Reserva o proximo numero do ano, atomicamente. Virou o ano, volta a 1 (D6). */
  reservarNumero(ano: number): Promise<{ sequencial: number; ano: number }>;

  // ---- backup
  exportarTudo(): Promise<Backup>;
  /** `substituir` apaga clientes, servicos e orcamentos antes de gravar. */
  importarTudo(backup: Backup, opcoes: { substituir: boolean }): Promise<void>;
  /** Apaga tudo, inclusive a configuracao. Testes e "substituir". */
  limparTudo(): Promise<void>;
}

let atual: Repositorio | null = null;

/** Escolhe a implementacao. Chamado uma vez, antes de renderizar (ou nos testes). */
export function usarRepositorio(implementacao: Repositorio): void {
  atual = implementacao;
}

function exigir(): Repositorio {
  if (!atual) throw new Error('repositorio nao configurado — chame usarRepositorio() antes');
  return atual;
}

/**
 * O repositorio em uso, com a cara de um objeto comum.
 *
 * Proxy para o singleton poder ser trocado depois de importado (os testes
 * instalam o de memoria no preparo). As implementacoes sao objetos de
 * closures, sem `this`, entao entregar o metodo solto e seguro.
 */
export const repositorio: Repositorio = new Proxy({} as Repositorio, {
  get(_alvo, propriedade: keyof Repositorio) {
    return exigir()[propriedade];
  },
});
```

- [ ] **Step 2: Verificar** — `npm run typecheck` passa (arquivo ainda sem uso).

---

### Task 3: A suíte de contrato

**Files:**

- Create: `src/dados/contrato.ts`

Os testes vêm de `db.test.ts` (configuração, numeração, catálogo, backup, ida-e-volta) reescritos contra a interface, mais os `observar*` e `atualizarCliente`.

- [ ] **Step 1: Escrever `src/dados/contrato.ts`**

```ts
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
import { zOrcamento, type Orcamento } from '../domain/esquemas';

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
        await new Promise((ok) => setTimeout(ok, 20));
        cancelar();
        expect(recebidos.at(-1)).toEqual(['o-antigo']);

        // depois de cancelar, nada mais chega
        const quantos = recebidos.length;
        await r.gravarOrcamento(novo);
        await new Promise((ok) => setTimeout(ok, 20));
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
        expect(
          (await proximo<ReturnType<typeof Object> | undefined>((ou) =>
            r.observarCliente('c1', ou),
          )) as { nome: string } | undefined,
        ).toMatchObject({ nome: 'Ana' });
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
```

> Atenção ao teste "observa um cliente": a linha com `ReturnType<typeof Object>` é desnecessariamente confusa — escreva assim, mais simples:
>
> ```ts
> const visto = await proximo<Cliente | undefined>((ou) => r.observarCliente('c1', ou));
> expect(visto).toMatchObject({ nome: 'Ana' });
> ```
>
> e importe `Cliente` de `../domain/esquemas`.

- [ ] **Step 2: Verificar** — `npm run typecheck` (o arquivo não roda ainda; só compila).

---

### Task 4: `memoria.ts` — implementação em memória

**Files:**

- Create: `src/dados/memoria.ts`
- Create: `src/dados/memoria.test.ts`

- [ ] **Step 1: Criar `src/dados/memoria.test.ts`** (o teste que vai falhar)

```ts
import { testarContrato } from './contrato';
import { criarRepositorioMemoria } from './memoria';

testarContrato('memoria', async () => criarRepositorioMemoria());
```

- [ ] **Step 2: Rodar** `npx vitest run src/dados/memoria.test.ts` — Expected: FAIL, "Cannot find module './memoria'".

- [ ] **Step 3: Escrever `src/dados/memoria.ts`**

```ts
/**
 * Repositorio em memoria.
 *
 * Para os testes de tela e de estado: rapido, deterministico, sem IndexedDB
 * nem Java. Segue o contrato de `Repositorio` a risca — a suite em
 * `contrato.ts` e quem garante.
 */
import type { Backup, Cliente, Orcamento, Servico } from '../domain/esquemas';
import { VERSAO_BACKUP } from '../domain/esquemas';
import { ID_CONFIG, configuracaoPadrao, type ConfiguracaoGuardada } from './configuracao';
import type { Cancelar, Ouvinte, Repositorio } from './repositorio';

const porNome = (a: Cliente, b: Cliente) => a.nome.localeCompare(b.nome, 'pt-BR');
const porUsos = (a: Servico, b: Servico) =>
  b.usos - a.usos || a.descricao.localeCompare(b.descricao, 'pt-BR');
const porAlteracao = (a: Orcamento, b: Orcamento) =>
  a.alteradoEm < b.alteradoEm ? 1 : a.alteradoEm > b.alteradoEm ? -1 : 0;

/** Tira as chaves com valor `undefined` — e o que "remover campo" significa. */
function semUndefined<T extends object>(objeto: T): T {
  return Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== undefined)) as T;
}

export function criarRepositorioMemoria(): Repositorio {
  let configuracao: ConfiguracaoGuardada | null = null;
  const clientes = new Map<string, Cliente>();
  const servicos = new Map<string, Servico>();
  const orcamentos = new Map<string, Orcamento>();
  const ouvintes = new Set<() => void>();

  function notificar() {
    for (const o of ouvintes) o();
  }

  /** Inscreve `calcular` para rodar agora (em microtask) e a cada mudanca. */
  function observar<T>(calcular: () => T, ouvinte: Ouvinte<T>): Cancelar {
    const entregar = () => ouvinte(calcular());
    ouvintes.add(entregar);
    queueMicrotask(() => {
      if (ouvintes.has(entregar)) entregar();
    });
    return () => {
      ouvintes.delete(entregar);
    };
  }

  const listarOrcamentos = () => [...orcamentos.values()].sort(porAlteracao);
  const listarClientes = () => [...clientes.values()].sort(porNome);
  const listarServicos = () => [...servicos.values()].sort(porUsos);

  async function lerConfiguracao(): Promise<ConfiguracaoGuardada> {
    if (!configuracao) configuracao = configuracaoPadrao();
    return configuracao;
  }

  return {
    observarOrcamentos: (ouvinte) => observar(listarOrcamentos, ouvinte),
    observarClientes: (ouvinte) => observar(listarClientes, ouvinte),
    observarServicos: (ouvinte) => observar(listarServicos, ouvinte),
    observarCliente: (id, ouvinte) => observar(() => clientes.get(id), ouvinte),

    lerOrcamento: async (id) => orcamentos.get(id),
    lerCliente: async (id) => clientes.get(id),
    listarOrcamentos: async () => listarOrcamentos(),
    listarClientes: async () => listarClientes(),
    listarServicos: async () => listarServicos(),
    contarOrcamentosDoCliente: async (id) =>
      [...orcamentos.values()].filter((o) => o.clienteId === id).length,

    gravarOrcamento: async (o) => {
      orcamentos.set(o.id, structuredClone(o));
      notificar();
    },
    gravarCliente: async (c) => {
      clientes.set(c.id, structuredClone(c));
      notificar();
    },
    atualizarCliente: async (id, campos) => {
      const atual = clientes.get(id);
      if (!atual) return;
      clientes.set(id, semUndefined({ ...atual, ...structuredClone(campos), id }));
      notificar();
    },
    gravarServico: async (s) => {
      servicos.set(s.id, structuredClone(s));
      notificar();
    },
    excluirOrcamento: async (id) => {
      orcamentos.delete(id);
      notificar();
    },
    excluirCliente: async (id) => {
      clientes.delete(id);
      notificar();
    },
    excluirServico: async (id) => {
      servicos.delete(id);
      notificar();
    },
    registrarUso: async (descricao, unidade, valorReferencia) => {
      const texto = descricao.trim();
      if (texto === '') return;
      const agora = new Date().toISOString();
      const existente = [...servicos.values()].find((s) => s.descricao === texto);
      const extras = {
        ...(unidade !== undefined ? { unidade } : {}),
        ...(valorReferencia !== undefined ? { valorReferencia } : {}),
      };
      if (existente) {
        servicos.set(existente.id, {
          ...existente,
          usos: existente.usos + 1,
          usadoEm: agora,
          ...extras,
        });
      } else {
        servicos.set(crypto.randomUUID(), {
          id: '',
          descricao: texto,
          usos: 1,
          usadoEm: agora,
          ...extras,
        });
        // o id gerado precisa estar dentro do objeto tambem
        for (const [id, s] of servicos) if (s.id === '') servicos.set(id, { ...s, id });
      }
      notificar();
    },

    lerConfiguracao,
    gravarConfiguracao: async (config) => {
      configuracao = structuredClone(config);
      notificar();
    },
    reservarNumero: async (ano) => {
      // sem `await` entre ler e gravar: e o que torna atomico em memoria
      const config = configuracao ?? configuracaoPadrao(ano);
      const sequencial = config.anoNumeracao === ano ? config.proximoNumero : 1;
      configuracao = { ...config, anoNumeracao: ano, proximoNumero: sequencial + 1 };
      notificar();
      return { sequencial, ano };
    },

    exportarTudo: async () => {
      const { id: _id, ...config } = await lerConfiguracao();
      return {
        versao: VERSAO_BACKUP,
        exportadoEm: new Date().toISOString(),
        configuracao: structuredClone(config),
        clientes: structuredClone(listarClientes()),
        servicos: structuredClone(listarServicos()),
        orcamentos: structuredClone(listarOrcamentos()),
      };
    },
    importarTudo: async (backup, { substituir }) => {
      if (substituir) {
        clientes.clear();
        servicos.clear();
        orcamentos.clear();
      }
      configuracao = { id: ID_CONFIG, ...structuredClone(backup.configuracao) };
      for (const c of backup.clientes) clientes.set(c.id, structuredClone(c));
      for (const s of backup.servicos) servicos.set(s.id, structuredClone(s));
      for (const o of backup.orcamentos) orcamentos.set(o.id, structuredClone(o));
      notificar();
    },
    limparTudo: async () => {
      configuracao = null;
      clientes.clear();
      servicos.clear();
      orcamentos.clear();
      notificar();
    },
  };
}
```

> O trecho de `registrarUso` que grava `id: ''` e depois corrige é feio. Escreva direto:
>
> ```ts
> const id = crypto.randomUUID();
> servicos.set(id, { id, descricao: texto, usos: 1, usadoEm: agora, ...extras });
> ```
>
> e apague o laço `for (const [id, s] of servicos)`.

- [ ] **Step 4: Rodar** `npx vitest run src/dados/memoria.test.ts` — Expected: PASS, 14 testes.

- [ ] **Step 5: Commit** (pendente de comando): `feat(dados): interface Repositorio e implementacao em memoria`

---

### Task 5: `dexie.ts` — adaptador de produção

**Files:**

- Create: `src/dados/dexie.ts`
- Create: `src/dados/dexie.test.ts`
- Modify: `src/dados/db.ts` (apagar `lerConfiguracao`, `gravarConfiguracao`, `reservarNumero`, `excluir*`, `contarOrcamentosDoCliente`, `registrarUso` — vão para `dexie.ts`)

- [ ] **Step 1: Criar `src/dados/dexie.test.ts`**

```ts
import 'fake-indexeddb/auto';
import { testarContrato } from './contrato';
import { criarRepositorioDexie } from './dexie';
import { BancoOrcamentos } from './db';

// um banco por suite: o contrato limpa tudo no beforeEach
testarContrato('dexie', async () => criarRepositorioDexie(new BancoOrcamentos('teste-contrato')));
```

- [ ] **Step 2: Rodar** `npx vitest run src/dados/dexie.test.ts` — Expected: FAIL, "Cannot find module './dexie'".

- [ ] **Step 3: Escrever `src/dados/dexie.ts`** — a lógica atual de `db.ts` (numeração, catálogo) e `backup.ts` (exportar/importar), atrás da interface:

```ts
/**
 * Repositorio sobre o IndexedDB (Dexie).
 *
 * E o que roda em producao ate o PR 2 trocar pelo Firestore. A logica de
 * numeracao, catalogo e backup veio inteira de `db.ts` e `backup.ts`.
 */
import { liveQuery } from 'dexie';
import type { Backup, Cliente, Orcamento, Servico } from '../domain/esquemas';
import { VERSAO_BACKUP } from '../domain/esquemas';
import { ID_CONFIG, configuracaoPadrao, type ConfiguracaoGuardada } from './configuracao';
import { db as bancoPadrao, type BancoOrcamentos } from './db';
import type { Cancelar, Ouvinte, Repositorio } from './repositorio';

/** Tira as chaves `undefined`: no `update` do Dexie elas ficariam gravadas. */
function semUndefined<T extends object>(objeto: T): T {
  return Object.fromEntries(Object.entries(objeto).filter(([, v]) => v !== undefined)) as T;
}

export function criarRepositorioDexie(db: BancoOrcamentos = bancoPadrao): Repositorio {
  function observar<T>(consulta: () => Promise<T>, ouvinte: Ouvinte<T>): Cancelar {
    const inscricao = liveQuery(consulta).subscribe({ next: ouvinte });
    return () => inscricao.unsubscribe();
  }

  const listarOrcamentos = () => db.orcamentos.orderBy('alteradoEm').reverse().toArray();
  const listarClientes = () => db.clientes.orderBy('nome').toArray();
  const listarServicos = () => db.servicos.orderBy('usos').reverse().toArray();

  async function lerConfiguracao(): Promise<ConfiguracaoGuardada> {
    const guardada = await db.configuracao.get(ID_CONFIG);
    if (guardada) return guardada;
    const padrao = configuracaoPadrao();
    await db.configuracao.put(padrao);
    return padrao;
  }

  return {
    observarOrcamentos: (ouvinte) => observar(listarOrcamentos, ouvinte),
    observarClientes: (ouvinte) => observar(listarClientes, ouvinte),
    observarServicos: (ouvinte) => observar(listarServicos, ouvinte),
    observarCliente: (id, ouvinte) => observar(() => db.clientes.get(id), ouvinte),

    lerOrcamento: (id) => db.orcamentos.get(id),
    lerCliente: (id) => db.clientes.get(id),
    listarOrcamentos,
    listarClientes,
    listarServicos,
    contarOrcamentosDoCliente: (id) => db.orcamentos.where('clienteId').equals(id).count(),

    gravarOrcamento: async (o) => {
      await db.orcamentos.put(o);
    },
    gravarCliente: async (c) => {
      await db.clientes.put(c);
    },
    atualizarCliente: async (id, campos) => {
      await db.transaction('rw', db.clientes, async () => {
        const atual = await db.clientes.get(id);
        if (!atual) return;
        await db.clientes.put(semUndefined({ ...atual, ...campos, id }));
      });
    },
    gravarServico: async (s) => {
      await db.servicos.put(s);
    },
    excluirOrcamento: async (id) => {
      await db.orcamentos.delete(id);
    },
    excluirCliente: async (id) => {
      await db.clientes.delete(id);
    },
    excluirServico: async (id) => {
      await db.servicos.delete(id);
    },
    registrarUso: async (descricao, unidade, valorReferencia) => {
      const texto = descricao.trim();
      if (texto === '') return;
      const agora = new Date().toISOString();
      const extras = {
        ...(unidade !== undefined ? { unidade } : {}),
        ...(valorReferencia !== undefined ? { valorReferencia } : {}),
      };
      await db.transaction('rw', db.servicos, async () => {
        const existente = await db.servicos.where('descricao').equals(texto).first();
        if (existente) {
          await db.servicos.update(existente.id, {
            usos: existente.usos + 1,
            usadoEm: agora,
            ...extras,
          });
          return;
        }
        await db.servicos.add({
          id: crypto.randomUUID(),
          descricao: texto,
          usos: 1,
          usadoEm: agora,
          ...extras,
        });
      });
    },

    lerConfiguracao,
    gravarConfiguracao: async (config) => {
      await db.configuracao.put(config);
    },
    reservarNumero: (ano) =>
      db.transaction('rw', db.configuracao, async () => {
        const config = (await db.configuracao.get(ID_CONFIG)) ?? configuracaoPadrao(ano);
        const sequencial = config.anoNumeracao === ano ? config.proximoNumero : 1;
        await db.configuracao.put({ ...config, anoNumeracao: ano, proximoNumero: sequencial + 1 });
        return { sequencial, ano };
      }),

    exportarTudo: async () => {
      const [config, clientes, servicos, orcamentos] = await Promise.all([
        lerConfiguracao(),
        listarClientes(),
        listarServicos(),
        listarOrcamentos(),
      ]);
      const { id: _id, ...configuracao } = config;
      return {
        versao: VERSAO_BACKUP,
        exportadoEm: new Date().toISOString(),
        configuracao,
        clientes,
        servicos,
        orcamentos,
      };
    },
    importarTudo: (backup, { substituir }) =>
      db.transaction('rw', db.configuracao, db.clientes, db.servicos, db.orcamentos, async () => {
        if (substituir) {
          await Promise.all([db.clientes.clear(), db.servicos.clear(), db.orcamentos.clear()]);
        }
        await db.configuracao.put({ id: ID_CONFIG, ...backup.configuracao });
        await db.clientes.bulkPut(backup.clientes);
        await db.servicos.bulkPut(backup.servicos);
        await db.orcamentos.bulkPut(backup.orcamentos);
      }),
    limparTudo: async () => {
      await Promise.all([
        db.configuracao.clear(),
        db.clientes.clear(),
        db.servicos.clear(),
        db.orcamentos.clear(),
      ]);
    },
  };
}
```

Tipos auxiliares não usados (`Cliente`, `Orcamento`, `Servico`, `Backup`) — remova do import o que o ESLint acusar.

- [ ] **Step 4: Em `db.ts`**, apagar tudo abaixo de `export const db = new BancoOrcamentos();` exceto o re-export da Task 1. O arquivo termina com a classe, `descontoEmCentavos`, `db` e o re-export.

- [ ] **Step 5: Rodar** `npx vitest run src/dados/dexie.test.ts src/dados/memoria.test.ts` — Expected: PASS nas duas suítes (28 testes).

  Se o teste "duas reservas ao mesmo tempo" falhar no Dexie: duas transações `rw` na mesma tabela são serializadas pelo IndexedDB — deve passar. Se a exclusão "observa um cliente... quando some" falhar por tempo, aumente o `setTimeout` do contrato para 50 ms (o `liveQuery` notifica após o commit).

- [ ] **Step 6: Commit** (pendente): `feat(dados): adaptador Dexie atras de Repositorio`

---

### Task 6: `backup.ts` via repositório; `db.test.ts` enxuto

**Files:**

- Modify: `src/dados/backup.ts`
- Modify: `src/dados/db.test.ts`

- [ ] **Step 1: Reescrever `src/dados/backup.ts`**

```ts
/**
 * Backup completo em JSON: exportar, conferir e importar.
 *
 * A importacao passa pelo zod antes de encostar no banco. Arquivo invalido
 * nao entra pela metade. Quem grava e o `repositorio` — este modulo so
 * cuida do arquivo.
 */
import { repositorio } from './repositorio';
import { zBackup, type Backup } from '../domain/esquemas';

export function exportarBackup(): Promise<Backup> {
  return repositorio.exportarTudo();
}

/** Serializa o backup com quebra de linha, para o arquivo ficar legivel. */
export function backupParaTexto(backup: Backup): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export interface ResultadoImportacao {
  clientes: number;
  servicos: number;
  orcamentos: number;
}

/**
 * Le, valida e grava.
 *
 * `substituir` apaga o que existe antes de gravar. Sem ele, o backup e
 * mesclado por id (o do arquivo vence em caso de colisao).
 */
export async function importarBackup(
  texto: string,
  { substituir = false }: { substituir?: boolean } = {},
): Promise<ResultadoImportacao> {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new Error('o arquivo nao e um JSON valido');
  }

  const analise = zBackup.safeParse(bruto);
  if (!analise.success) {
    const primeiro = analise.error.issues[0];
    const onde = primeiro?.path.join('.') ?? 'raiz';
    throw new Error(`backup invalido em "${onde}": ${primeiro?.message ?? 'formato inesperado'}`);
  }
  const backup = analise.data;
  await repositorio.importarTudo(backup, { substituir });

  return {
    clientes: backup.clientes.length,
    servicos: backup.servicos.length,
    orcamentos: backup.orcamentos.length,
  };
}

/** Dispara o download do backup no navegador. */
export function baixarBackup(backup: Backup): void {
  const blob = new Blob([backupParaTexto(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-aa-montagens-${backup.exportadoEm.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Reescrever `src/dados/db.test.ts`** deixando só o que é do Dexie/migração e do arquivo de backup:

```ts
/**
 * O que e especifico do IndexedDB (migracao v2) e do arquivo de backup.
 * O contrato do repositorio esta em `contrato.ts`.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { descontoEmCentavos } from './db';
import { configuracaoPadrao } from './configuracao';
import { importarBackup, backupParaTexto, exportarBackup } from './backup';
import { repositorio, usarRepositorio } from './repositorio';
import { criarRepositorioMemoria } from './memoria';

beforeEach(() => usarRepositorio(criarRepositorioMemoria()));

describe('configuracao padrao', () => {
  it('mantem a grafia do e-mail que veio da planilha (D7)', () => {
    expect(configuracaoPadrao().empresa.email).toBe('aamonstagens@hotmail.com');
  });
});

describe('arquivo de backup', () => {
  it('exporta para texto e reimporta', async () => {
    await repositorio.lerConfiguracao();
    const texto = backupParaTexto(await exportarBackup());
    await repositorio.limparTudo();
    const r = await importarBackup(texto);
    expect(r).toEqual({ clientes: 0, servicos: 0, orcamentos: 0 });
    expect((await repositorio.lerConfiguracao()).empresa.cnpj).toBe('66.612.836/0001-55');
  });

  it('recusa arquivo que nao e JSON', async () => {
    await expect(importarBackup('nao sou json')).rejects.toThrow(/JSON/i);
  });

  it('recusa backup com formato invalido, sem gravar nada pela metade', async () => {
    const ruim = JSON.stringify({ versao: 1, exportadoEm: 'ontem', configuracao: {} });
    await expect(importarBackup(ruim)).rejects.toThrow(/backup inválido|backup invalido/i);
    expect(await repositorio.listarOrcamentos()).toHaveLength(0);
  });
});

// (manter o describe 'migração v2 do desconto' exatamente como esta hoje)
```

Copie o bloco `describe('migração v2 do desconto', ...)` do arquivo atual, sem alterar.

- [ ] **Step 3: Rodar** `npx vitest run src/dados` — Expected: PASS.

- [ ] **Step 4: Commit** (pendente): `refactor(dados): backup passa pelo repositorio`

---

### Task 7: Hooks de leitura reativa

**Files:**

- Create: `src/dados/hooks.ts`

- [ ] **Step 1: Escrever `src/dados/hooks.ts`**

```ts
/**
 * Leitura reativa do repositorio para as telas — o que o `useLiveQuery` do
 * Dexie fazia, agora sobre a interface.
 *
 * `undefined` enquanto o primeiro valor nao chegou (as telas ja tratam isso
 * como "carregando").
 */
import { useEffect, useRef, useState } from 'react';
import type { Cliente, Orcamento, Servico } from '../domain/esquemas';
import { repositorio, type Cancelar, type Ouvinte } from './repositorio';

type Inscrever<T> = (ouvinte: Ouvinte<T>) => Cancelar;

/**
 * Inscreve em `inscrever` enquanto `chave` nao muda.
 *
 * A funcao e lida por ref para nao reinscrever a cada render — a chave e
 * quem diz quando a consulta mudou. O valor guardado leva a chave junto,
 * para nao mostrar o resultado da consulta anterior enquanto a nova carrega.
 */
function useObservado<T>(inscrever: Inscrever<T>, chave: string): T | undefined {
  const [estado, setEstado] = useState<{ chave: string; valor: T } | null>(null);
  const atual = useRef(inscrever);

  useEffect(() => {
    atual.current = inscrever;
  });

  useEffect(() => atual.current((valor) => setEstado({ chave, valor })), [chave]);

  return estado?.chave === chave ? estado.valor : undefined;
}

/** Todos os orcamentos, do mais recente para o mais antigo. */
export function useOrcamentos(): Orcamento[] | undefined {
  return useObservado(repositorio.observarOrcamentos, 'orcamentos');
}

/** Todos os clientes, por nome. */
export function useClientes(): Cliente[] | undefined {
  return useObservado(repositorio.observarClientes, 'clientes');
}

/** O catalogo, do mais usado para o menos. */
export function useServicos(): Servico[] | undefined {
  return useObservado(repositorio.observarServicos, 'servicos');
}

/** Um cliente pelo id; `undefined` sem id, carregando ou inexistente. */
export function useCliente(id: string | undefined): Cliente | undefined {
  return useObservado<Cliente | undefined>(
    (ouvinte) => (id === undefined ? () => undefined : repositorio.observarCliente(id, ouvinte)),
    `cliente:${id ?? ''}`,
  );
}
```

Cuidado: `repositorio.observarOrcamentos` passado solto funciona porque o Proxy entrega a closure da implementação (sem `this`).

- [ ] **Step 2: Verificar** — `npm run typecheck` e `npm run lint` limpos. Se o `react-hooks` reclamar do `useEffect` que só escreve na ref, mantenha: é o padrão "latest ref", sem leitura durante o render.

---

### Task 8: Instalar o repositório (app e testes)

**Files:**

- Modify: `src/main.tsx`
- Modify: `src/teste/preparo.ts`

- [ ] **Step 1: `src/main.tsx`** — antes do `createRoot`:

```ts
import { usarRepositorio } from './dados/repositorio';
import { criarRepositorioDexie } from './dados/dexie';

usarRepositorio(criarRepositorioDexie());
```

- [ ] **Step 2: `src/teste/preparo.ts`**

```ts
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { usarRepositorio } from '../dados/repositorio';
import { criarRepositorioMemoria } from '../dados/memoria';

// Todo teste comeca com um repositorio em memoria vazio. Os testes de
// contrato do Dexie criam o deles por cima.
beforeEach(() => {
  usarRepositorio(criarRepositorioMemoria());
});
```

(`fake-indexeddb/auto` continua enquanto o `dexie.test.ts` existir — sai no PR 2.)

- [ ] **Step 3: Verificar** — `npm run typecheck`.

---

### Task 9: Estado e PDF

**Files:**

- Modify: `src/estado/editor.ts:18,93,319,324`
- Modify: `src/pdf/exportar.tsx:10,26`

- [ ] **Step 1: `editor.ts`** — trocar o import por
      `import { repositorio } from '../dados/repositorio';` e
      `import type { ConfiguracaoGuardada } from '../dados/configuracao';`.
      Em `carregarConfig`: `set({ config: await repositorio.lerConfiguracao() });`.
      Em `salvar`: `await repositorio.gravarOrcamento(gravado);` e `await repositorio.registrarUso(linha.descricao, linha.unidade, linha.valorUnitario);`.

- [ ] **Step 2: `exportar.tsx`** — `import { repositorio } from '../dados/repositorio';` e `const cliente = await repositorio.lerCliente(orcamento.clienteId);`.

- [ ] **Step 3: Verificar** — `npm run typecheck`.

---

### Task 10: Telas

**Files:**

- Modify: `src/telas/ListaOrcamentos.tsx`, `NovoOrcamento.tsx`, `EditorOrcamento.tsx`, `Clientes.tsx`, `Servicos.tsx`, `GradeItens.tsx`, `Configuracoes.tsx`

Em cada uma, apagar `import { useLiveQuery } from 'dexie-react-hooks'` e o import de `../dados/db`; usar `../dados/hooks` e `../dados/repositorio`.

- [ ] **Step 1: `ListaOrcamentos.tsx`**
  - `const orcamentos = useOrcamentos();` (era `useLiveQuery(() => db.orcamentos.reverse().sortBy('alteradoEm'), [])`).
  - `aoConfirmar={() => repositorio.excluirOrcamento(o.id)}`.

- [ ] **Step 2: `NovoOrcamento.tsx`**
  - `const clientes = useClientes();`
  - `const config = await repositorio.lerConfiguracao();`
  - novo cliente: `await repositorio.gravarCliente({ ...limpo, id, nome, criadoEm: ambientePadrao.agora() });`
  - existente: `await repositorio.atualizarCliente(id, { ...limpo, nome });`
  - `const { sequencial } = await repositorio.reservarNumero(ano);`
  - `await repositorio.gravarOrcamento(novo);`

- [ ] **Step 3: `EditorOrcamento.tsx`**
  - `const cliente = useCliente(orcamento?.clienteId);`
  - no `useEffect`: `const achado = await repositorio.lerOrcamento(id);`
  - `await repositorio.excluirOrcamento(orcamento.id);`

- [ ] **Step 4: `Clientes.tsx`**
  - `const clientes = useClientes(); const orcamentos = useOrcamentos();`
  - `aoConfirmar={() => repositorio.excluirCliente(c.id)}`
  - no `aoSalvar` da edição, o `limpo` já mapeia vazio para `undefined`; grave com `await repositorio.atualizarCliente(c.id, { ...limpo, nome: dados.nome.trim() });` — o `limpo` é `Record<string, string | undefined>`; tipar como `Partial<Omit<Cliente, 'id'>>` com `as` e importar `type Cliente` de `../domain/esquemas`.

- [ ] **Step 5: `Servicos.tsx`**
  - `const servicos = useServicos();`
  - `aoConfirmar={() => repositorio.excluirServico(s.id)}`

- [ ] **Step 6: `GradeItens.tsx`**
  - `const servicos = useServicos()?.slice(0, 300);` — o limite de 300 vinha do Dexie; fica na tela, onde o motivo (sugestões) está. Se `servicos` era passado a um `useMemo`/filtro por referência, mantenha um `useMemo(() => todos?.slice(0, 300), [todos])` para não criar array novo a cada render.

- [ ] **Step 7: `Configuracoes.tsx`**
  - `import { repositorio } from '../dados/repositorio'; import type { ConfiguracaoGuardada } from '../dados/configuracao';`
  - `void repositorio.lerConfiguracao().then(setConfig);`, `await repositorio.gravarConfiguracao(config);`, `setConfig(await repositorio.lerConfiguracao());`.

- [ ] **Step 8: Apagar o re-export temporário de `db.ts`** (Task 1, Step 2) e rodar `npm run typecheck` — o compilador aponta qualquer importador esquecido. Corrija até zerar.

- [ ] **Step 9: `npm run lint`** — limpo. `dexie-react-hooks` não é mais importado por ninguém: remova do `package.json` (`npm uninstall dexie-react-hooks`).

---

### Task 11: Testes de tela

**Files:**

- Modify: `src/App.test.tsx`, `src/a11y.test.tsx`, `src/telas/acoes.test.tsx`, `cliente.test.tsx`, `exemplo.test.tsx`, `sugestoes.test.tsx`, `whatsapp-envio.test.tsx`
- Modify: `src/whatsapp.test.ts`, `src/pdf/pdf.test.ts`, `src/telas/foco.test.tsx`, `grade.test.tsx`, `totais.test.tsx` (só o import de `configuracaoPadrao`)

Substituições mecânicas (o `preparo.ts` já instala um repositório em memória vazio a cada teste, então os `beforeEach` que só limpavam tabelas podem sumir — os que também zeram o `useEditor` ficam):

| Antes                                               | Depois                                                         |
| --------------------------------------------------- | -------------------------------------------------------------- |
| `import { db } from '../dados/db'`                  | `import { repositorio } from '../dados/repositorio'`           |
| `import { configuracaoPadrao } from '../dados/db'`  | `import { configuracaoPadrao } from '../dados/configuracao'`   |
| `await Promise.all([db.configuracao.clear(), ...])` | (apagar — o preparo já dá um repositório vazio)                |
| `await db.orcamentos.put(o)`                        | `await repositorio.gravarOrcamento(o)`                         |
| `await db.clientes.put(c)`                          | `await repositorio.gravarCliente(c)`                           |
| `await db.servicos.bulkPut(CATALOGO)`               | `for (const s of CATALOGO) await repositorio.gravarServico(s)` |
| `await db.orcamentos.count()`                       | `(await repositorio.listarOrcamentos()).length`                |
| `await db.clientes.count()`                         | `(await repositorio.listarClientes()).length`                  |
| `(await db.clientes.toArray())[0]!`                 | `(await repositorio.listarClientes())[0]!`                     |
| `await db.clientes.get('c1')`                       | `await repositorio.lerCliente('c1')`                           |

- [ ] **Step 1: Aplicar** as substituições nos 12 arquivos.

- [ ] **Step 2: Rodar** `npx vitest run` — Expected: tudo verde (227 de antes − os que saíram de `db.test.ts` + os do contrato ×2). Se um teste de tela que dependia do `useLiveQuery` entregar o valor **de forma síncrona** falhar por "carregando", troque `getBy` por `findBy` naquele ponto — o repositório em memória entrega em microtask, como o Firestore fará.

- [ ] **Step 3: `npm run typecheck && npm run lint && npm run build`** — limpos.

- [ ] **Step 4: Verificar no navegador que nada mudou** — `npm run preview` + `npm run fotos`; comparar `exemplos/fotos/celular-lista.png` e `celular-editor.png` com os do commit anterior (`git diff --stat exemplos/fotos` deve ser vazio ou só ruído de antialias).

- [ ] **Step 5: Commit** (pendente): `refactor: telas e estado passam pelo Repositorio`

---

### Task 12: Documentação

**Files:**

- Modify: `docs/arquitetura.md` (seção de dados), `README.md` (mapa `src/dados/`)

- [ ] **Step 1:** Em `docs/arquitetura.md`, onde descreve `src/dados/`, acrescentar: `repositorio.ts` é a fronteira; `memoria.ts` nos testes; `dexie.ts` em produção até o PR 2; `contrato.ts` roda em toda implementação.

- [ ] **Step 2:** Em `README.md`, linha `src/dados/    IndexedDB (Dexie) com migrations, e o backup` → `src/dados/    a interface Repositorio, as implementações (memória, Dexie) e o backup`.

- [ ] **Step 3: Commit** (pendente): `docs: fronteira Repositorio`

---

## Self-review

- **Cobertura da spec §3.2:** interface (T2), memoria (T4), dexie (T5), hooks (T7), telas (T10), contrato nas duas implementações (T4, T5). `gravarServico` foi acrescentado à interface da spec para os testes poderem semear o catálogo — anotar na spec ao executar.
- **Tipos:** `Ouvinte`/`Cancelar` definidos em T2 e usados em T4, T5, T7. `atualizarCliente(id, Partial<Omit<Cliente,'id'>>)` igual em T2, T4, T5, T10. `criarRepositorioDexie(db?)` recebe `BancoOrcamentos` (T5) e é chamado sem argumento em T8.
- **Sem placeholders:** cada passo traz o código ou a substituição exata.
