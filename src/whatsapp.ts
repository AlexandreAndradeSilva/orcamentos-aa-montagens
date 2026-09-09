/**
 * Link wa.me com o resumo do orçamento, pronto para colar.
 *
 * Funções puras: montam texto e URL, não abrem nada.
 */
import type { Configuracao, Orcamento } from './domain/esquemas';
import { calcularTotais, numeroCompleto, totalDaSecao } from './domain/orcamento';
import * as fmt from './formato';

/**
 * Reduz o telefone ao formato que o wa.me aceita: só dígitos, com o 55 na
 * frente. "(18) 99823-0660" vira "5518998230660".
 */
export function paraWaMe(telefone: string): string | null {
  const digitos = telefone.replace(/\D/g, '');
  if (digitos === '') return null;
  // já veio com código do país
  if (digitos.length >= 12 && digitos.startsWith('55')) return digitos;
  // DDD + número (10 ou 11 dígitos)
  if (digitos.length === 10 || digitos.length === 11) return `55${digitos}`;
  return null;
}

/**
 * Resumo curto: número, cliente, o que foi orçado e o total.
 *
 * Cabe numa mensagem, não repete a tabela inteira — quem quer detalhe abre o
 * PDF, que vai anexo.
 */
export function textoResumo(orcamento: Orcamento, configuracao: Configuracao): string {
  const totais = calcularTotais(orcamento, {
    percentualEntradaPadrao: configuracao.percentualEntradaPadrao,
  });
  const numero = numeroCompleto(orcamento.numero, orcamento.revisao);

  const itens = orcamento.secoes
    .filter((s) => totalDaSecao(s) > 0)
    .flatMap((s) => s.linhas.filter((l) => l.descricao.trim() !== ''))
    .slice(0, 6)
    .map((l) => `• ${primeiraLinha(l.descricao)}`);

  const partes = [
    `*${configuracao.empresa.razaoSocial}* — Orçamento ${numero}`,
    `Cliente: ${orcamento.clienteNome}`,
    `Emissão: ${fmt.data(orcamento.dataEmissao)}`,
  ];

  if (itens.length > 0) {
    partes.push('', ...itens);
  }

  partes.push('', `*Total: ${fmt.valorComSimbolo(totais.aPagar)}*`);

  if (totais.entrada > 0) {
    partes.push(`Entrada: ${fmt.valorComSimbolo(totais.entrada)}`);
  }
  if (orcamento.condicoesPagamento.trim() !== '') {
    partes.push(`Pagamento: ${orcamento.condicoesPagamento}`);
  }
  if (orcamento.prazoEntrega && orcamento.prazoEntrega.trim() !== '') {
    partes.push(`Prazo de entrega: ${orcamento.prazoEntrega}`);
  }
  if (orcamento.validade && orcamento.validade.trim() !== '') {
    partes.push(`Validade: ${orcamento.validade}`);
  }

  partes.push('', 'O orçamento detalhado vai em PDF.');
  return partes.join('\n');
}

/** Corta descrições longas para o resumo não virar um parágrafo. */
function primeiraLinha(descricao: string, limite = 70): string {
  const limpo = descricao.replace(/\s+/g, ' ').trim();
  return limpo.length <= limite ? limpo : `${limpo.slice(0, limite - 1).trimEnd()}…`;
}

/**
 * URL do WhatsApp. Sem telefone, abre o seletor de contato do próprio app,
 * que é o comportamento certo quando o cliente ainda não tem número gravado.
 */
export function linkWhatsApp(
  orcamento: Orcamento,
  configuracao: Configuracao,
  telefone?: string,
): string {
  const texto = encodeURIComponent(textoResumo(orcamento, configuracao));
  const numero = telefone ? paraWaMe(telefone) : null;
  return numero ? `https://wa.me/${numero}?text=${texto}` : `https://wa.me/?text=${texto}`;
}
