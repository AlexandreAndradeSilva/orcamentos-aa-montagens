/**
 * Repositorio em memoria.
 *
 * Para os testes de tela e de estado: rapido, deterministico, sem IndexedDB
 * nem Java. Segue o contrato de `Repositorio` a risca — a suite em
 * `contrato.ts` e quem garante.
 */
/* eslint-disable @typescript-eslint/require-await --
   a interface e assincrona porque o Firestore e; em memoria tudo e sincrono,
   e forcar um `await` falso em cada metodo so esconderia isso */
import type { Cliente, Orcamento, Servico } from '../domain/esquemas';
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
      const extras = {
        ...(unidade !== undefined ? { unidade } : {}),
        ...(valorReferencia !== undefined ? { valorReferencia } : {}),
      };
      const existente = [...servicos.values()].find((s) => s.descricao === texto);
      if (existente) {
        servicos.set(existente.id, {
          ...existente,
          usos: existente.usos + 1,
          usadoEm: agora,
          ...extras,
        });
      } else {
        const id = crypto.randomUUID();
        servicos.set(id, { id, descricao: texto, usos: 1, usadoEm: agora, ...extras });
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
