/**
 * Filtro do catálogo para as sugestões de descrição.
 *
 * Módulo separado do componente: é função pura, dá para testar sem DOM, e
 * mantém o arquivo do componente exportando só componente (o que o
 * fast-refresh do Vite exige).
 */

export interface ServicoSugerido {
  id: string;
  descricao: string;
  unidade?: string | undefined;
  valorReferencia?: number | undefined;
}

export const MINIMO_PARA_SUGERIR = 2;
export const MAXIMO_SUGESTOES = 6;

/** Sem acento e em minúsculas, para "pergola" achar "PÉRGOLA". */
function achatar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function filtrarServicos(
  servicos: readonly ServicoSugerido[],
  termo: string,
): ServicoSugerido[] {
  const alvo = achatar(termo.trim());
  if (alvo.length < MINIMO_PARA_SUGERIR) return [];
  return servicos
    .filter((s) => {
      const d = achatar(s.descricao);
      // não sugere o que já está escrito por inteiro
      return d.includes(alvo) && d !== alvo;
    })
    .slice(0, MAXIMO_SUGESTOES);
}
