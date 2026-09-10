/**
 * Gera um backup de exemplo, para importar no app e ver algo real na tela.
 *
 * Traz o orçamento da Igreja Portal Pérola 2 extraído da planilha, mais um
 * segundo orçamento inventado que exercita o que o primeiro não exercita:
 * preço por linha, quantidade fracionada, acréscimo de nota fiscal e desconto.
 *
 * Uso: npm run backup:exemplo
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import casos from '../src/teste/casos-planilha.json' with { type: 'json' };
import { configuracaoPadrao } from '../src/dados/db';
import { VERSAO_BACKUP, zBackup } from '../src/domain/esquemas';
import type { Backup, Cliente, Linha, Orcamento, Secao } from '../src/domain/esquemas';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface LinhaExtraida {
  descricao: string;
  quantidade: number | null;
  unidade: string | null;
  valorUnitario: number | null;
}
interface SecaoExtraida {
  titulo: string;
  linhas: LinhaExtraida[];
  precoFechado: number | null;
}

const caso = casos.casos[0] as unknown as {
  cliente: string;
  dataEmissao: string;
  secoes: SecaoExtraida[];
};

const AGORA = '2026-09-09T12:00:00.000Z';

const clientes: Cliente[] = [
  {
    id: 'cliente-igreja',
    nome: 'Igreja Portal Pérola 2',
    cidade: 'Birigui',
    contato: 'Pastor Marcelo',
    telefone: '(18) 99712-4455',
    criadoEm: AGORA,
  },
  {
    id: 'cliente-oficina',
    nome: 'Oficina Vale Verde',
    cnpjCpf: '12.345.678/0001-90',
    endereco: 'Av. Brasília, 2200',
    cidade: 'Araçatuba',
    cep: '16015-000',
    telefone: '(18) 3607-8890',
    email: 'contato@valeverde.com.br',
    contato: 'Dona Regina',
    criadoEm: AGORA,
  },
];

// ---- orçamento 1: o da planilha, com bloco de preço fechado -----------------

const secoesDaPlanilha: Secao[] = caso.secoes.map((s, i) => ({
  id: `s${i}`,
  titulo: s.titulo,
  ...(s.precoFechado !== null ? { precoFechado: s.precoFechado } : {}),
  linhas: s.linhas.map(
    (l, j): Linha => ({
      id: `s${i}l${j}`,
      descricao: l.descricao,
      ...(l.quantidade !== null ? { quantidade: l.quantidade } : {}),
      ...(l.unidade !== null ? { unidade: l.unidade } : {}),
      ...(l.valorUnitario !== null ? { valorUnitario: l.valorUnitario } : {}),
    }),
  ),
}));

const igreja: Orcamento = {
  id: 'orc-igreja',
  numero: '001/2026',
  revisao: 0,
  clienteId: 'cliente-igreja',
  clienteNome: 'Igreja Portal Pérola 2',
  dataEmissao: caso.dataEmissao,
  validade: '15 dias',
  prazoEntrega: '45 dias após aprovação',
  secoes: secoesDaPlanilha,
  acrescimoNotaFiscal: 0,
  desconto: 0,
  // a planilha traz ENTRADA = 0 digitado à mão (docs/paridade.md §4.1)
  entrada: { modo: 'manual', centavos: 0 },
  condicoesPagamento: '30% ENTRADA, RESTANTE A COMBINAR',
  observacoes: 'Inclusos material e mão de obra.',
  status: 'aprovado',
  arquivado: false,
  historico: [{ em: AGORA, o_que: 'importado da planilha de origem' }],
  criadoEm: AGORA,
  alteradoEm: AGORA,
};

// ---- orçamento 2: preço por linha, fração, acréscimo e desconto -------------

const oficina: Orcamento = {
  id: 'orc-oficina',
  numero: '002/2026',
  revisao: 0,
  clienteId: 'cliente-oficina',
  clienteNome: 'Oficina Vale Verde',
  dataEmissao: '2026-09-08',
  validade: '15 dias',
  prazoEntrega: '30 dias após aprovação',
  secoes: [
    {
      id: 'os1',
      titulo: 'DOS SERVIÇOS A SEREM PRESTADOS',
      linhas: [
        {
          id: 'ol1',
          descricao:
            'COBERTURA EM TELHA TRAPÉZIO "SANDUÍCHE" SOBRE ESTRUTURA METÁLICA COM VIGA G CHAPA 14',
          quantidade: 48.5,
          unidade: 'M²',
          valorUnitario: 18_733,
        },
        {
          id: 'ol2',
          descricao: 'PORTÃO DE CORRER EM CHAPA 16 (1,5 MM) COM GUIA E ROLDANAS',
          quantidade: 1,
          unidade: 'UNID.',
          valorUnitario: 480_000,
        },
        {
          id: 'ol3',
          descricao: 'GRADE DE PROTEÇÃO EM TUBO 40X40 CHAPA 18',
          quantidade: 12.75,
          unidade: 'M',
          valorUnitario: 21_500,
        },
        {
          id: 'ol4',
          descricao: 'PINTURA ELETROSTÁTICA — a confirmar com o cliente',
        },
      ],
    },
    {
      id: 'os2',
      titulo: 'DAS OBSERVAÇÕES',
      linhas: [
        { id: 'ol5', descricao: 'INCLUSOS MATERIAL E MÃO DE OBRA' },
        { id: 'ol6', descricao: 'ANDAIME POR CONTA DA CONTRATANTE' },
      ],
    },
  ],
  acrescimoNotaFiscal: 145_000,
  desconto: 200_000,
  entrada: { modo: 'sugerida' },
  condicoesPagamento: '30% ENTRADA, RESTANTE A COMBINAR',
  status: 'enviado',
  arquivado: false,
  historico: [{ em: AGORA, o_que: 'orçamento criado' }],
  criadoEm: AGORA,
  alteradoEm: AGORA,
};

const { id: _id, ...configuracao } = configuracaoPadrao(2026);

const backup: Backup = {
  versao: VERSAO_BACKUP,
  exportadoEm: AGORA,
  configuracao: { ...configuracao, proximoNumero: 3 },
  clientes,
  servicos: [],
  orcamentos: [igreja, oficina],
};

// Passa pelo mesmo esquema que o app usa na importação: se não valida aqui,
// também não entraria lá.
const conferido = zBackup.safeParse(backup);
if (!conferido.success) {
  console.error(conferido.error.issues);
  throw new Error('o backup de exemplo não passou no próprio esquema');
}

const destino = resolve(RAIZ, 'exemplos', 'backup-exemplo.json');
mkdirSync(dirname(destino), { recursive: true });
writeFileSync(destino, `${JSON.stringify(backup, null, 2)}\n`, 'utf8');

console.log('->', destino.replace(RAIZ, '.'));
console.log(`   ${backup.orcamentos.length} orçamentos, ${backup.clientes.length} clientes`);
