/**
 * Persistencia local em IndexedDB. Sem backend.
 *
 * Migrations versionadas: cada `version()` abaixo e um degrau permanente.
 * Nunca edite um degrau ja publicado — acrescente o proximo.
 */
import Dexie, { type EntityTable } from 'dexie';
import type { Cliente, Configuracao, Orcamento, Servico } from '../domain/esquemas';

/** Linha unica da tabela de configuracao. */
export const ID_CONFIG = 'unica';

export interface ConfiguracaoGuardada extends Configuracao {
  id: typeof ID_CONFIG;
}

export class BancoOrcamentos extends Dexie {
  configuracao!: EntityTable<ConfiguracaoGuardada, 'id'>;
  clientes!: EntityTable<Cliente, 'id'>;
  servicos!: EntityTable<Servico, 'id'>;
  orcamentos!: EntityTable<Orcamento, 'id'>;

  constructor(nome = 'aa-montagens') {
    super(nome);

    // v1 — esquema inicial (Fase 3)
    this.version(1).stores({
      configuracao: 'id',
      clientes: 'id, nome, criadoEm',
      servicos: 'id, descricao, usos, usadoEm',
      orcamentos: 'id, numero, clienteId, dataEmissao, status, arquivado, alteradoEm',
    });

    // v2 — o desconto virou centavos simples.
    //
    // Antes existiam dois modos, `{ modo: 'reais', centavos }` e
    // `{ modo: 'percentual', percentual }`, porque a regra estava em aberto.
    // Confirmado que e em reais e sem teto, o objeto perdeu a razao de ser.
    // Orcamentos gravados na v1 sao convertidos aqui: o percentual e resolvido
    // contra o total daquele orcamento, para o valor nao mudar.
    this.version(2)
      .stores({})
      .upgrade((tx) =>
        tx
          .table('orcamentos')
          .toCollection()
          .modify((orcamento: Record<string, unknown>) => {
            orcamento['desconto'] = descontoEmCentavos(orcamento);
          }),
      );
  }
}

/**
 * Converte o desconto da v1 para centavos.
 *
 * Fica fora da classe para poder ser testado sem subir o banco.
 */
export function descontoEmCentavos(orcamento: Record<string, unknown>): number {
  const bruto = orcamento['desconto'];
  if (typeof bruto === 'number') return Math.max(0, Math.round(bruto));
  if (bruto === null || typeof bruto !== 'object') return 0;

  const antigo = bruto as { modo?: string; centavos?: number; percentual?: number };
  if (antigo.modo === 'reais') return Math.max(0, Math.round(antigo.centavos ?? 0));
  if (antigo.modo === 'percentual') {
    // resolve contra o total do proprio orcamento, para o valor nao mudar
    const secoes = (orcamento['secoes'] ?? []) as {
      precoFechado?: number;
      linhas?: { quantidade?: number; valorUnitario?: number }[];
    }[];
    let servicos = 0;
    for (const secao of secoes) {
      if (typeof secao.precoFechado === 'number') {
        servicos += secao.precoFechado;
        continue;
      }
      for (const linha of secao.linhas ?? []) {
        if (linha.quantidade !== undefined && linha.valorUnitario !== undefined) {
          servicos += Math.round(linha.quantidade * linha.valorUnitario);
        }
      }
    }
    const acrescimo = (orcamento['acrescimoNotaFiscal'] as number | undefined) ?? 0;
    const total = servicos + acrescimo;
    return Math.max(0, Math.round((total * (antigo.percentual ?? 0)) / 10_000));
  }
  return 0;
}

export const db = new BancoOrcamentos();

// ---------------------------------------------------------------- padroes

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

/** Le a configuracao, criando a padrao na primeira execucao. */
export async function lerConfiguracao(): Promise<ConfiguracaoGuardada> {
  const guardada = await db.configuracao.get(ID_CONFIG);
  if (guardada) return guardada;
  const padrao = configuracaoPadrao();
  await db.configuracao.put(padrao);
  return padrao;
}

export async function gravarConfiguracao(config: ConfiguracaoGuardada): Promise<void> {
  await db.configuracao.put(config);
}

// ---------------------------------------------------------------- numeracao

/**
 * Reserva o proximo numero do ano, numa transacao.
 *
 * A numeracao reinicia a cada ano (D6): virou o ano, volta para 1.
 */
export async function reservarNumero(ano: number): Promise<{ sequencial: number; ano: number }> {
  return db.transaction('rw', db.configuracao, async () => {
    const config = (await db.configuracao.get(ID_CONFIG)) ?? configuracaoPadrao(ano);
    const mesmoAno = config.anoNumeracao === ano;
    const sequencial = mesmoAno ? config.proximoNumero : 1;
    await db.configuracao.put({
      ...config,
      anoNumeracao: ano,
      proximoNumero: sequencial + 1,
    });
    return { sequencial, ano };
  });
}

// ---------------------------------------------------------------- catalogo

/**
 * Alimenta o catalogo com as descricoes usadas.
 *
 * A planilha nao tem catalogo nenhum (lacuna L10), entao ele se constroi pelo
 * uso — a recomendacao registrada em `PERGUNTAS.md` P13.
 */
export async function registrarUso(
  descricao: string,
  unidade: string | undefined,
  valorReferencia: number | undefined,
): Promise<void> {
  const texto = descricao.trim();
  if (texto === '') return;
  const agora = new Date().toISOString();
  await db.transaction('rw', db.servicos, async () => {
    const existente = await db.servicos.where('descricao').equals(texto).first();
    if (existente) {
      await db.servicos.update(existente.id, {
        usos: existente.usos + 1,
        usadoEm: agora,
        ...(unidade !== undefined ? { unidade } : {}),
        ...(valorReferencia !== undefined ? { valorReferencia } : {}),
      });
      return;
    }
    await db.servicos.add({
      id: crypto.randomUUID(),
      descricao: texto,
      usos: 1,
      usadoEm: agora,
      ...(unidade !== undefined ? { unidade } : {}),
      ...(valorReferencia !== undefined ? { valorReferencia } : {}),
    });
  });
}
