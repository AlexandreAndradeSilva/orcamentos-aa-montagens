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
  observarOrcamentos: (ouvinte: Ouvinte<Orcamento[]>) => Cancelar;
  observarClientes: (ouvinte: Ouvinte<Cliente[]>) => Cancelar;
  observarServicos: (ouvinte: Ouvinte<Servico[]>) => Cancelar;
  observarCliente: (id: string, ouvinte: Ouvinte<Cliente | undefined>) => Cancelar;

  // ---- leitura pontual
  lerOrcamento: (id: string) => Promise<Orcamento | undefined>;
  lerCliente: (id: string) => Promise<Cliente | undefined>;
  listarOrcamentos: () => Promise<Orcamento[]>;
  listarClientes: () => Promise<Cliente[]>;
  listarServicos: () => Promise<Servico[]>;
  contarOrcamentosDoCliente: (id: string) => Promise<number>;

  // ---- escrita
  gravarOrcamento: (orcamento: Orcamento) => Promise<void>;
  gravarCliente: (cliente: Cliente) => Promise<void>;
  atualizarCliente: (id: string, campos: Partial<Omit<Cliente, 'id'>>) => Promise<void>;
  gravarServico: (servico: Servico) => Promise<void>;
  excluirOrcamento: (id: string) => Promise<void>;
  excluirCliente: (id: string) => Promise<void>;
  excluirServico: (id: string) => Promise<void>;
  /** Alimenta o catalogo: descricao vazia e ignorada; repetida soma `usos`. */
  registrarUso: (
    descricao: string,
    unidade: string | undefined,
    valorReferencia: number | undefined,
  ) => Promise<void>;

  // ---- configuracao e numeracao
  /** Le a configuracao, criando a padrao na primeira execucao. */
  lerConfiguracao: () => Promise<ConfiguracaoGuardada>;
  gravarConfiguracao: (config: ConfiguracaoGuardada) => Promise<void>;
  /** Reserva o proximo numero do ano, atomicamente. Virou o ano, volta a 1 (D6). */
  reservarNumero: (ano: number) => Promise<{ sequencial: number; ano: number }>;

  // ---- backup
  exportarTudo: () => Promise<Backup>;
  /** `substituir` apaga clientes, servicos e orcamentos antes de gravar. */
  importarTudo: (backup: Backup, opcoes: { substituir: boolean }) => Promise<void>;
  /** Apaga tudo, inclusive a configuracao. Testes e "substituir". */
  limparTudo: () => Promise<void>;
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
