/**
 * Estado do orcamento em edicao. Zustand, sem Redux.
 *
 * O store nao calcula nada por conta propria: ele guarda o orcamento e
 * delega para `src/domain`, que e puro e testado.
 */
import { create } from 'zustand';
import type { Linha, Orcamento, Secao } from '../domain/esquemas';
import { calcularTotais, type Totais } from '../domain/orcamento';
import {
  ambientePadrao,
  interpretarColagem,
  linhaVazia,
  secaoVazia,
  type Ambiente,
} from '../domain/fabrica';
import { lerCentavos, lerQuantidade } from '../domain/dinheiro';
import { db, lerConfiguracao, registrarUso, type ConfiguracaoGuardada } from '../dados/db';

/** Coluna focada na grade, para a navegacao por teclado. */
export type Coluna = 'descricao' | 'quantidade' | 'unidade' | 'valor';
export const COLUNAS: Coluna[] = ['descricao', 'quantidade', 'unidade', 'valor'];

export interface Foco {
  secao: number;
  linha: number;
  coluna: Coluna;
}

interface Estado {
  orcamento: Orcamento | null;
  config: ConfiguracaoGuardada | null;
  foco: Foco | null;
  sujo: boolean;
  salvoEm: string | null;
  erro: string | null;

  carregarConfig: () => Promise<void>;
  abrir: (orcamento: Orcamento) => void;
  fechar: () => void;

  alterar: (patch: Partial<Orcamento>) => void;
  alterarLinha: (s: number, l: number, patch: Partial<Linha>) => void;
  alterarSecao: (s: number, patch: Partial<Omit<Secao, 'linhas'>>) => void;

  novaLinha: (s: number, apos?: number) => void;
  removerLinha: (s: number, l: number) => void;
  duplicarLinha: (s: number, l: number) => void;
  moverLinha: (s: number, l: number, direcao: -1 | 1) => void;

  novaSecao: () => void;
  removerSecao: (s: number) => void;
  definirPrecoFechado: (s: number, centavos: number | undefined) => void;

  colar: (s: number, l: number, texto: string) => void;
  focar: (foco: Foco | null) => void;
  moverFoco: (deltaLinha: number, deltaColuna: number) => void;

  totais: () => Totais | null;
  salvar: () => Promise<void>;
}

const amb: Ambiente = ambientePadrao;

/** Aplica uma funcao a uma secao, devolvendo secoes novas. */
function comSecao(secoes: Secao[], indice: number, fn: (s: Secao) => Secao): Secao[] {
  return secoes.map((s, i) => (i === indice ? fn(s) : s));
}

export const useEditor = create<Estado>((set, get) => ({
  orcamento: null,
  config: null,
  foco: null,
  sujo: false,
  salvoEm: null,
  erro: null,

  carregarConfig: async () => {
    set({ config: await lerConfiguracao() });
  },

  abrir: (orcamento) => set({ orcamento, sujo: false, erro: null, foco: null }),
  fechar: () => set({ orcamento: null, foco: null, sujo: false }),

  alterar: (patch) => {
    const { orcamento } = get();
    if (!orcamento) return;
    set({ orcamento: { ...orcamento, ...patch }, sujo: true });
  },

  alterarLinha: (s, l, patch) => {
    const { orcamento } = get();
    if (!orcamento) return;
    const secoes = comSecao(orcamento.secoes, s, (secao) => ({
      ...secao,
      linhas: secao.linhas.map((linha, i) => (i === l ? { ...linha, ...patch } : linha)),
    }));
    set({ orcamento: { ...orcamento, secoes }, sujo: true });
  },

  alterarSecao: (s, patch) => {
    const { orcamento } = get();
    if (!orcamento) return;
    const secoes = comSecao(orcamento.secoes, s, (secao) => ({ ...secao, ...patch }));
    set({ orcamento: { ...orcamento, secoes }, sujo: true });
  },

  novaLinha: (s, apos) => {
    const { orcamento } = get();
    if (!orcamento) return;
    const secao = orcamento.secoes[s];
    if (!secao) return;
    const destino = apos === undefined ? secao.linhas.length : apos + 1;
    const linhas = [...secao.linhas];
    linhas.splice(destino, 0, linhaVazia(amb));
    set({
      orcamento: { ...orcamento, secoes: comSecao(orcamento.secoes, s, (x) => ({ ...x, linhas })) },
      sujo: true,
      foco: { secao: s, linha: destino, coluna: 'descricao' },
    });
  },

  removerLinha: (s, l) => {
    const { orcamento } = get();
    if (!orcamento) return;
    const secao = orcamento.secoes[s];
    if (!secao || secao.linhas.length <= 1) return;
    const linhas = secao.linhas.filter((_, i) => i !== l);
    set({
      orcamento: { ...orcamento, secoes: comSecao(orcamento.secoes, s, (x) => ({ ...x, linhas })) },
      sujo: true,
      foco: { secao: s, linha: Math.max(0, l - 1), coluna: 'descricao' },
    });
  },

  /** Ctrl+D: copia a linha de cima, como no Excel. */
  duplicarLinha: (s, l) => {
    const { orcamento } = get();
    if (!orcamento) return;
    const secao = orcamento.secoes[s];
    const molde = secao?.linhas[l];
    if (!secao || !molde) return;
    const linhas = [...secao.linhas];
    linhas.splice(l + 1, 0, { ...molde, id: amb.novoId() });
    set({
      orcamento: { ...orcamento, secoes: comSecao(orcamento.secoes, s, (x) => ({ ...x, linhas })) },
      sujo: true,
      foco: { secao: s, linha: l + 1, coluna: 'descricao' },
    });
  },

  moverLinha: (s, l, direcao) => {
    const { orcamento } = get();
    if (!orcamento) return;
    const secao = orcamento.secoes[s];
    if (!secao) return;
    const alvo = l + direcao;
    if (alvo < 0 || alvo >= secao.linhas.length) return;
    const linhas = [...secao.linhas];
    const [movida] = linhas.splice(l, 1);
    if (!movida) return;
    linhas.splice(alvo, 0, movida);
    set({
      orcamento: { ...orcamento, secoes: comSecao(orcamento.secoes, s, (x) => ({ ...x, linhas })) },
      sujo: true,
      foco: { secao: s, linha: alvo, coluna: get().foco?.coluna ?? 'descricao' },
    });
  },

  novaSecao: () => {
    const { orcamento } = get();
    if (!orcamento) return;
    const secoes = [...orcamento.secoes, secaoVazia(amb)];
    set({
      orcamento: { ...orcamento, secoes },
      sujo: true,
      foco: { secao: secoes.length - 1, linha: 0, coluna: 'descricao' },
    });
  },

  removerSecao: (s) => {
    const { orcamento } = get();
    if (!orcamento || orcamento.secoes.length <= 1) return;
    set({
      orcamento: { ...orcamento, secoes: orcamento.secoes.filter((_, i) => i !== s) },
      sujo: true,
      foco: null,
    });
  },

  /** Liga ou desliga o preco de bloco da secao (D1). */
  definirPrecoFechado: (s, centavos) => {
    const { orcamento } = get();
    if (!orcamento) return;
    const secoes = comSecao(orcamento.secoes, s, (secao) => {
      if (centavos === undefined) {
        const { precoFechado: _fora, ...resto } = secao;
        return resto;
      }
      return { ...secao, precoFechado: centavos };
    });
    set({ orcamento: { ...orcamento, secoes }, sujo: true });
  },

  /** Ctrl+V vindo da planilha: distribui as colunas a partir da celula atual. */
  colar: (s, l, texto) => {
    const { orcamento } = get();
    if (!orcamento) return;
    const secao = orcamento.secoes[s];
    if (!secao) return;
    const blocos = interpretarColagem(texto);
    if (blocos.length === 0) return;

    const linhas = [...secao.linhas];
    blocos.forEach((bloco, i) => {
      const alvo = l + i;
      const base = linhas[alvo] ?? linhaVazia(amb);
      let quantidade: number | undefined;
      let valorUnitario: number | undefined;
      try {
        quantidade = lerQuantidade(bloco.quantidade) ?? undefined;
      } catch {
        quantidade = undefined;
      }
      try {
        valorUnitario = lerCentavos(bloco.valor) ?? undefined;
      } catch {
        valorUnitario = undefined;
      }
      linhas[alvo] = {
        ...base,
        descricao: bloco.descricao || base.descricao,
        ...(quantidade !== undefined ? { quantidade } : {}),
        ...(bloco.unidade !== '' ? { unidade: bloco.unidade } : {}),
        ...(valorUnitario !== undefined ? { valorUnitario } : {}),
      };
    });
    set({
      orcamento: { ...orcamento, secoes: comSecao(orcamento.secoes, s, (x) => ({ ...x, linhas })) },
      sujo: true,
    });
  },

  focar: (foco) => set({ foco }),

  moverFoco: (deltaLinha, deltaColuna) => {
    const { orcamento, foco } = get();
    if (!orcamento || !foco) return;
    let { secao, linha } = foco;
    let coluna = COLUNAS.indexOf(foco.coluna) + deltaColuna;

    while (coluna < 0) {
      coluna += COLUNAS.length;
      linha -= 1;
    }
    while (coluna >= COLUNAS.length) {
      coluna -= COLUNAS.length;
      linha += 1;
    }
    linha += deltaLinha;

    // atravessa a fronteira entre secoes
    while (linha < 0 && secao > 0) {
      secao -= 1;
      linha += orcamento.secoes[secao]?.linhas.length ?? 0;
    }
    while (
      secao < orcamento.secoes.length - 1 &&
      linha >= (orcamento.secoes[secao]?.linhas.length ?? 0)
    ) {
      linha -= orcamento.secoes[secao]?.linhas.length ?? 0;
      secao += 1;
    }
    const total = orcamento.secoes[secao]?.linhas.length ?? 0;
    if (linha < 0 || total === 0) return;
    if (linha >= total) linha = total - 1;
    set({ foco: { secao, linha, coluna: COLUNAS[coluna] ?? 'descricao' } });
  },

  totais: () => {
    const { orcamento, config } = get();
    if (!orcamento || !config) return null;
    return calcularTotais(orcamento, {
      percentualEntradaPadrao: config.percentualEntradaPadrao,
    });
  },

  salvar: async () => {
    const { orcamento } = get();
    if (!orcamento) return;
    const agora = new Date().toISOString();
    const gravado: Orcamento = { ...orcamento, alteradoEm: agora };
    try {
      await db.orcamentos.put(gravado);
      // alimenta o catalogo com o que foi realmente usado
      for (const secao of gravado.secoes) {
        for (const linha of secao.linhas) {
          if (linha.descricao.trim() !== '') {
            await registrarUso(linha.descricao, linha.unidade, linha.valorUnitario);
          }
        }
      }
      set({ orcamento: gravado, sujo: false, salvoEm: agora, erro: null });
    } catch (e) {
      set({ erro: e instanceof Error ? e.message : 'não foi possível salvar' });
    }
  },
}));
