/**
 * Estilos do PDF. Os mesmos tokens da Fase 2, convertidos para pontos.
 *
 * A4 = 595,28 x 841,89 pt. Margem de 36 pt (~12,7 mm) nas laterais e no topo,
 * 52 pt embaixo para o rodapé fixo caber sem encostar no conteúdo.
 */
import { StyleSheet } from '@react-pdf/renderer';
import { DISPLAY, TEXTO } from './fontes';

export const COR = {
  acao: '#135885',
  tinta: '#1C1A17',
  tintaMedia: '#57514A',
  tintaFraca: '#736B63',
  papel: '#FCFBF9',
  fundo: '#F1EEE9',
  linhaSutil: '#E2DCD3',
  linha: '#948B81',
  linhaForte: '#8E877D',
  alerta: '#A33520',
  branco: '#FFFFFF',
} as const;

export const MARGEM = { topo: 36, lado: 36, base: 52 } as const;
export const LARGURA_UTIL = 595.28 - MARGEM.lado * 2;

/** Larguras da tabela de itens, em pontos. Somam LARGURA_UTIL. */
export const COLUNAS = {
  item: 34,
  descricao: LARGURA_UTIL - 34 - 46 - 42 - 68 - 74,
  quantidade: 46,
  unidade: 42,
  valor: 68,
  total: 74,
} as const;

export const estilos = StyleSheet.create({
  pagina: {
    paddingTop: MARGEM.topo,
    paddingBottom: MARGEM.base,
    paddingHorizontal: MARGEM.lado,
    backgroundColor: COR.branco,
    fontFamily: TEXTO,
    fontSize: 8.5,
    lineHeight: 1.35,
    color: COR.tinta,
  },

  // ---- cabeçalho ----
  cabecalho: { flexDirection: 'row', alignItems: 'flex-start' },
  cabecalhoMarca: { width: 132 },
  // flexBasis 0 + flexShrink 1: a coluna encolhe em vez de invadir o selo
  cabecalhoEmpresa: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    paddingLeft: 14,
    paddingRight: 10,
    paddingTop: 2,
  },
  empresaNome: {
    fontFamily: DISPLAY,
    fontWeight: 700,
    fontSize: 17,
    lineHeight: 1.15,
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  empresaLinha: { fontSize: 7.5, lineHeight: 1.3, color: COR.tintaMedia, marginTop: 1 },

  // o número é o que se procura numa pilha de papel
  selo: {
    width: 128,
    borderWidth: 1,
    borderColor: COR.acao,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  seloRotulo: {
    fontFamily: DISPLAY,
    fontWeight: 600,
    fontSize: 7.5,
    letterSpacing: 1,
    color: COR.acao,
  },
  seloNumero: {
    fontFamily: DISPLAY,
    fontWeight: 700,
    fontSize: 22,
    color: COR.acao,
    lineHeight: 1.1,
  },
  seloData: { fontSize: 7, color: COR.tintaMedia, marginTop: 1 },

  titulo: {
    fontFamily: DISPLAY,
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: 1.6,
    textAlign: 'center',
    marginTop: 12,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COR.linhaForte,
  },

  // ---- blocos cliente / datas, lado a lado ----
  faixaBlocos: { flexDirection: 'row', marginTop: 10, gap: 10 },
  bloco: {
    borderWidth: 0.75,
    borderColor: COR.linhaSutil,
    padding: 7,
  },
  blocoTitulo: {
    fontFamily: DISPLAY,
    fontWeight: 600,
    fontSize: 7.5,
    letterSpacing: 1,
    color: COR.tintaMedia,
    marginBottom: 4,
  },
  campoLinha: { flexDirection: 'row', marginBottom: 1.5 },
  campoRotulo: { width: 58, fontSize: 7, color: COR.tintaFraca },
  campoValor: { flexGrow: 1, flexShrink: 1, fontSize: 8.5 },

  // ---- tabela ----
  tabela: { marginTop: 12 },
  cabecalhoTabela: {
    flexDirection: 'row',
    borderBottomWidth: 1.25,
    borderColor: COR.linhaForte,
    paddingBottom: 3,
    paddingTop: 3,
    backgroundColor: COR.branco,
  },
  th: {
    fontFamily: DISPLAY,
    fontWeight: 600,
    fontSize: 7.5,
    letterSpacing: 0.9,
    color: COR.tintaMedia,
  },
  linhaSecao: {
    flexDirection: 'row',
    backgroundColor: COR.fundo,
    borderBottomWidth: 0.5,
    borderColor: COR.linhaForte,
    paddingVertical: 3,
  },
  tituloSecao: {
    fontFamily: DISPLAY,
    fontWeight: 600,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  linhaItem: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: COR.linhaSutil,
    paddingVertical: 4,
  },
  celItem: { fontSize: 7.5, color: COR.tintaFraca },
  celDescricao: { fontSize: 8.5 },
  num: { textAlign: 'right' },
  centro: { textAlign: 'center' },

  linhaBloco: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderColor: COR.linhaForte,
    paddingVertical: 4,
    backgroundColor: COR.papel,
  },
  notaBloco: { fontSize: 7.5, color: COR.tintaMedia, fontStyle: 'normal' },

  // ---- rodapé do documento ----
  faixaFinal: { flexDirection: 'row', marginTop: 12, gap: 12 },
  colunaNotas: { flexGrow: 1, flexShrink: 1, flexBasis: 0, paddingRight: 4 },
  colunaTotais: { width: 232 },

  totaisLinha: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2.5,
  },
  totaisRotulo: {
    fontFamily: DISPLAY,
    fontWeight: 600,
    fontSize: 8,
    letterSpacing: 0.8,
    color: COR.tintaMedia,
  },
  totaisValor: { fontSize: 9, textAlign: 'right' },
  reguaFina: { borderTopWidth: 0.5, borderColor: COR.linhaSutil, marginVertical: 2 },
  reguaForte: { borderTopWidth: 1.25, borderColor: COR.linhaForte, marginVertical: 3 },

  aPagarCaixa: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COR.acao,
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  aPagarRotulo: {
    fontFamily: DISPLAY,
    fontWeight: 600,
    fontSize: 9,
    letterSpacing: 1.2,
    color: COR.branco,
  },
  aPagarValor: {
    fontFamily: DISPLAY,
    fontWeight: 700,
    fontSize: 19,
    lineHeight: 1.15,
    color: COR.branco,
    textAlign: 'right',
  },

  aviso: { fontSize: 7.5, color: COR.alerta, marginBottom: 6, lineHeight: 1.3 },
  notaTitulo: {
    fontFamily: DISPLAY,
    fontWeight: 600,
    fontSize: 7.5,
    letterSpacing: 1,
    color: COR.tintaMedia,
    marginBottom: 1.5,
  },
  notaTexto: { fontSize: 8.5, marginBottom: 6 },

  // ---- aceite ----
  aceite: { flexDirection: 'row', marginTop: 22, gap: 26 },
  aceiteColuna: { flexGrow: 1, flexBasis: 0 },
  aceiteRisco: { borderTopWidth: 0.75, borderColor: COR.tinta, marginBottom: 3 },
  aceiteRotulo: {
    fontFamily: DISPLAY,
    fontWeight: 600,
    fontSize: 8,
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  aceiteNota: { fontSize: 6.5, color: COR.tintaFraca, textAlign: 'center', marginTop: 1 },

  // ---- rodapé fixo ----
  rodape: {
    position: 'absolute',
    bottom: 22,
    left: MARGEM.lado,
    right: MARGEM.lado,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderColor: COR.linhaSutil,
    paddingTop: 4,
  },
  rodapeTexto: { fontSize: 6.5, color: COR.tintaFraca },
});
