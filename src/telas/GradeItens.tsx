/**
 * A grade densa de edicao. E a tela principal, e ela e uma planilha.
 *
 * Quem usa vem do Excel: edicao inline na celula, Tab avanca, Enter cria
 * linha, Ctrl+D duplica, setas navegam, Ctrl+V cola bloco de planilha.
 */
import { useEffect, useMemo, useRef, type KeyboardEvent, type ClipboardEvent } from 'react';
import { COLUNAS, useEditor, type Coluna } from '../estado/editor';
import { lerCentavos, lerQuantidade } from '../domain/dinheiro';
import { numeroDaSecao, numeroDoItem, totalDaLinha, totalDaSecao } from '../domain/orcamento';
import type { Linha, Secao } from '../domain/esquemas';
import { useServicos } from '../dados/hooks';
import { CelulaDescricao } from './CelulaDescricao';
import type { ServicoSugerido } from './sugestoes';
import * as fmt from '../formato';
import './grade.css';

/** Id do <datalist> que alimenta o autocompletar de unidade. */
const LISTA_UNIDADES = 'unidades-cadastradas';

export function GradeItens() {
  const orcamento = useEditor((e) => e.orcamento);
  const novaSecao = useEditor((e) => e.novaSecao);
  const unidades = useEditor((e) => e.config?.unidades ?? []);
  // O catálogo alimenta as sugestões da descrição. Carrega uma vez aqui, em
  // vez de uma consulta por célula. Os 300 mais usados bastam para sugerir.
  const catalogo = useServicos();
  const servicos = useMemo(() => catalogo?.slice(0, 300), [catalogo]);

  if (!orcamento) return null;

  return (
    <div className="grade-envolve">
      {/* As unidades vêm de Configurações. `datalist` sugere sem impedir que a
          pessoa digite uma que ainda não está cadastrada. */}
      <datalist id={LISTA_UNIDADES}>
        {unidades.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
      <table className="grade">
        <caption className="so-leitor">
          Itens do orçamento. Use Tab para avançar, Enter para criar linha, Ctrl+D para duplicar a
          linha e as setas para navegar.
        </caption>
        <colgroup>
          <col style={{ width: 'var(--col-item)' }} />
          <col />
          <col style={{ width: 'var(--col-quant)' }} />
          <col style={{ width: 'var(--col-unid)' }} />
          <col style={{ width: 'var(--col-valor)' }} />
          <col style={{ width: 'var(--col-total)' }} />
          <col style={{ width: 'var(--col-acoes)' }} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Descrição do serviço</th>
            <th scope="col" className="num">
              Quant.
            </th>
            <th scope="col">Unid.</th>
            <th scope="col" className="num">
              Valor
            </th>
            <th scope="col" className="num">
              Total
            </th>
            <th scope="col">
              <span className="so-leitor">Ações</span>
            </th>
          </tr>
        </thead>
        {orcamento.secoes.map((secao, s) => (
          <BlocoSecao key={secao.id} secao={secao} indice={s} servicos={servicos ?? []} />
        ))}
      </table>

      <div className="grade__acoes">
        <button type="button" className="botao botao--texto" onClick={novaSecao}>
          + Nova seção
        </button>
      </div>
    </div>
  );
}

function BlocoSecao({
  secao,
  indice,
  servicos,
}: {
  secao: Secao;
  indice: number;
  servicos: readonly ServicoSugerido[];
}) {
  const alterarSecao = useEditor((e) => e.alterarSecao);
  const novaLinha = useEditor((e) => e.novaLinha);
  const removerSecao = useEditor((e) => e.removerSecao);
  const definirPrecoFechado = useEditor((e) => e.definirPrecoFechado);
  const totalSecoes = useEditor((e) => e.orcamento?.secoes.length ?? 0);

  const fechado = secao.precoFechado !== undefined;

  return (
    <tbody className={fechado ? 'secao secao--fechada' : 'secao'}>
      <tr className="linha-secao">
        <td className="cel-item">{numeroDaSecao(indice)}</td>
        <td colSpan={3}>
          <input
            className="cel-editavel cel-titulo"
            value={secao.titulo}
            placeholder="Título da seção — ex.: DOS SERVIÇOS A SEREM PRESTADOS"
            aria-label={`Título da seção ${numeroDaSecao(indice)}`}
            onChange={(ev) => alterarSecao(indice, { titulo: ev.target.value })}
          />
        </td>
        <td colSpan={3} className="linha-secao__controles">
          <label className="preco-fechado">
            <input
              type="checkbox"
              checked={fechado}
              onChange={(ev) =>
                definirPrecoFechado(
                  indice,
                  ev.target.checked ? (secao.precoFechado ?? 0) : undefined,
                )
              }
            />
            preço fechado
          </label>
          {totalSecoes > 1 && (
            <button
              type="button"
              className="botao botao--texto botao--mini"
              onClick={() => removerSecao(indice)}
              aria-label={`Remover a seção ${numeroDaSecao(indice)}`}
            >
              remover
            </button>
          )}
        </td>
      </tr>

      {secao.linhas.map((linha, l) => (
        <LinhaItem
          key={linha.id}
          linha={linha}
          secao={indice}
          indice={l}
          blocoFechado={fechado}
          servicos={servicos}
        />
      ))}

      {fechado && (
        <tr className="linha-preco-fechado">
          <td />
          <td colSpan={3}>
            <span className="dica">
              Um preço para o bloco inteiro — as quantidades acima ficam informativas.
            </span>
          </td>
          <td className="num" data-rotulo="Preço do bloco">
            <CelulaValor
              valor={secao.precoFechado}
              rotulo={`Preço fechado da seção ${numeroDaSecao(indice)}`}
              aoConfirmar={(centavos) => definirPrecoFechado(indice, centavos ?? 0)}
            />
          </td>
          <td className="num cel-total cel-total--forte" data-rotulo="Total do bloco">
            {fmt.valor(totalDaSecao(secao))}
          </td>
          <td />
        </tr>
      )}

      <tr className="linha-acao">
        <td />
        <td colSpan={6}>
          <button
            type="button"
            className="botao botao--texto botao--mini"
            onClick={() => novaLinha(indice)}
          >
            + Nova linha
          </button>
        </td>
      </tr>
    </tbody>
  );
}

interface PropsLinha {
  linha: Linha;
  secao: number;
  indice: number;
  blocoFechado: boolean;
  servicos: readonly ServicoSugerido[];
}

function LinhaItem({ linha, secao, indice, blocoFechado, servicos }: PropsLinha) {
  const alterarLinha = useEditor((e) => e.alterarLinha);
  const removerLinha = useEditor((e) => e.removerLinha);
  const podeRemover = useEditor((e) => (e.orcamento?.secoes[secao]?.linhas.length ?? 0) > 1);
  const total = totalDaLinha(linha);

  return (
    <tr className="linha-item">
      <td className="cel-item" data-rotulo="Item">
        {numeroDoItem(secao, indice)}
      </td>
      <td className="cel-com-sugestao" data-rotulo="Descrição">
        <Descricao
          linha={linha}
          secao={secao}
          indice={indice}
          servicos={servicos}
          aoAlterar={(patch) => alterarLinha(secao, indice, patch)}
        />
      </td>
      <td className="num" data-rotulo="Quant.">
        <CelulaQuantidade
          valor={linha.quantidade}
          rotulo={`Quantidade do item ${numeroDoItem(secao, indice)}`}
          posicao={{ secao, linha: indice, coluna: 'quantidade' }}
          aoConfirmar={(q) => alterarLinha(secao, indice, { quantidade: q ?? undefined })}
        />
      </td>
      <td data-rotulo="Unid.">
        <CelulaTexto
          valor={linha.unidade ?? ''}
          rotulo={`Unidade do item ${numeroDoItem(secao, indice)}`}
          posicao={{ secao, linha: indice, coluna: 'unidade' }}
          placeholder="UNID."
          sugestoes={LISTA_UNIDADES}
          aoConfirmar={(t) => alterarLinha(secao, indice, { unidade: t || undefined })}
        />
      </td>
      <td className="num" data-rotulo="Valor">
        <CelulaValor
          valor={linha.valorUnitario}
          rotulo={`Valor unitário do item ${numeroDoItem(secao, indice)}`}
          posicao={{ secao, linha: indice, coluna: 'valor' }}
          esmaecido={blocoFechado}
          aoConfirmar={(c) => alterarLinha(secao, indice, { valorUnitario: c ?? undefined })}
        />
      </td>
      <td className="num cel-total" data-rotulo="Total">
        {blocoFechado ? (
          <span className="cel-vazia" aria-label="incluído no preço do bloco">
            ——
          </span>
        ) : total === null ? (
          <span className="cel-vazia" aria-label="sem total">
            ——
          </span>
        ) : (
          fmt.valor(total)
        )}
      </td>
      <td className="cel-acoes">
        <button
          type="button"
          className="botao-remover"
          disabled={!podeRemover}
          title={
            podeRemover
              ? `Remover o item ${numeroDoItem(secao, indice)}`
              : 'A seção precisa de pelo menos uma linha'
          }
          aria-label={`Remover o item ${numeroDoItem(secao, indice)}`}
          onClick={() => removerLinha(secao, indice)}
        >
          <span aria-hidden="true">×</span>
        </button>
      </td>
    </tr>
  );
}

/**
 * Junta o combobox de sugestões com o teclado e o foco da grade.
 *
 * Escolher um serviço preenche a descrição sempre, e a unidade e o valor
 * **só quando estiverem vazios** — quem acabou de digitar um preço não quer
 * vê-lo sobrescrito por um preço antigo.
 */
function Descricao({
  linha,
  secao,
  indice,
  servicos,
  aoAlterar,
}: {
  linha: Linha;
  secao: number;
  indice: number;
  servicos: readonly ServicoSugerido[];
  aoAlterar: (patch: Partial<Linha>) => void;
}) {
  const posicao: Posicao = { secao, linha: indice, coluna: 'descricao' };
  const { aoTeclar, aoColar } = useTeclado(posicao, () => undefined);
  const ref = useFocoAutomatico(posicao);
  const focar = useEditor((e) => e.focar);

  return (
    <CelulaDescricao
      valor={linha.descricao}
      rotulo={`Descrição do item ${numeroDoItem(secao, indice)}`}
      placeholder="Ex.: pergolado garagem com dobras em chapa 16 (1,5 mm)"
      servicos={servicos}
      aoTeclar={aoTeclar}
      aoColar={aoColar}
      aoFocar={() => focar(posicao)}
      refCampo={ref}
      aoDigitar={(texto) => aoAlterar({ descricao: texto })}
      aoEscolher={(servico) => {
        aoAlterar({
          descricao: servico.descricao,
          ...(linha.unidade === undefined && servico.unidade !== undefined
            ? { unidade: servico.unidade }
            : {}),
          ...(linha.valorUnitario === undefined && servico.valorReferencia !== undefined
            ? { valorUnitario: servico.valorReferencia }
            : {}),
          ...(linha.quantidade === undefined ? { quantidade: 1 } : {}),
        });
      }}
    />
  );
}

// ------------------------------------------------------------------ celulas

interface Posicao {
  secao: number;
  linha: number;
  coluna: Coluna;
}

/** Teclado comum a todas as celulas: e o contrato com quem vem do Excel. */
function useTeclado(posicao: Posicao | undefined, confirmar: () => void) {
  const novaLinha = useEditor((e) => e.novaLinha);
  const duplicarLinha = useEditor((e) => e.duplicarLinha);
  const moverLinha = useEditor((e) => e.moverLinha);
  const moverFoco = useEditor((e) => e.moverFoco);
  const colar = useEditor((e) => e.colar);

  function aoTeclar(ev: KeyboardEvent<HTMLElement>) {
    if (!posicao) return;
    const { secao, linha } = posicao;

    if (ev.key === 'Enter' && !ev.shiftKey && !ev.ctrlKey) {
      ev.preventDefault();
      confirmar();
      novaLinha(secao, linha);
      return;
    }
    if (ev.key === 'Enter' && ev.ctrlKey) {
      ev.preventDefault();
      confirmar();
      useEditor.getState().novaSecao();
      return;
    }
    if (ev.key === 'd' && ev.ctrlKey) {
      ev.preventDefault();
      confirmar();
      duplicarLinha(secao, linha);
      return;
    }
    if ((ev.key === 'ArrowUp' || ev.key === 'ArrowDown') && ev.altKey) {
      ev.preventDefault();
      confirmar();
      moverLinha(secao, linha, ev.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (ev.key === 'ArrowUp' || ev.key === 'ArrowDown') {
      // num campo de varias linhas, a seta primeiro anda dentro do texto
      const alvo = ev.target as HTMLTextAreaElement;
      if (alvo.tagName === 'TEXTAREA') {
        const noTopo = alvo.selectionStart === 0;
        const noFim = alvo.selectionStart === alvo.value.length;
        if ((ev.key === 'ArrowUp' && !noTopo) || (ev.key === 'ArrowDown' && !noFim)) return;
      }
      ev.preventDefault();
      confirmar();
      moverFoco(ev.key === 'ArrowUp' ? -1 : 1, 0);
      return;
    }
    if (ev.key === 'Escape') {
      (ev.target as HTMLElement).blur();
    }
  }

  function aoColar(ev: ClipboardEvent<HTMLElement>) {
    if (!posicao) return;
    const texto = ev.clipboardData.getData('text/plain');
    // so intercepta colagem de planilha: varias linhas ou colunas por tabulacao
    if (!texto.includes('\t') && !texto.includes('\n')) return;
    ev.preventDefault();
    colar(posicao.secao, posicao.linha, texto);
  }

  return { aoTeclar, aoColar };
}

/**
 * Puxa o foco quando houver um *pedido* para esta célula, e consome o pedido.
 *
 * Duas coisas importam aqui, e as duas foram bug:
 *
 * 1. Depende do `pedidoDeFoco`, que é de uso único — não do `foco`, que é só
 *    registro. Com `foco`, qualquer re-render devolvia o foco para a célula e
 *    prendia o cursor nela.
 * 2. As dependências são primitivas. `posicao` é um objeto novo a cada render;
 *    usá-lo direto fazia o efeito rodar sempre.
 */
function useFocoAutomatico(posicao: Posicao | undefined) {
  const pedido = useEditor((e) => e.pedidoDeFoco);
  const consumir = useEditor((e) => e.consumirPedidoDeFoco);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  const secao = posicao?.secao;
  const linha = posicao?.linha;
  const coluna = posicao?.coluna;

  useEffect(() => {
    if (!pedido || secao === undefined || linha === undefined || coluna === undefined) return;
    if (pedido.secao === secao && pedido.linha === linha && pedido.coluna === coluna) {
      ref.current?.focus();
      consumir();
    }
  }, [pedido, secao, linha, coluna, consumir]);

  return ref;
}

function CelulaTexto({
  valor,
  rotulo,
  placeholder,
  multilinha = false,
  posicao,
  sugestoes,
  aoConfirmar,
}: {
  valor: string;
  rotulo: string;
  placeholder?: string;
  multilinha?: boolean;
  posicao?: Posicao;
  /** Id de um <datalist> para autocompletar. */
  sugestoes?: string;
  aoConfirmar: (texto: string) => void;
}) {
  const { aoTeclar, aoColar } = useTeclado(posicao, () => undefined);
  const ref = useFocoAutomatico(posicao);
  const focar = useEditor((e) => e.focar);

  const comum = {
    className: 'cel-editavel',
    value: valor,
    placeholder,
    'aria-label': rotulo,
    onKeyDown: aoTeclar,
    onPaste: aoColar,
    onFocus: () => posicao && focar(posicao),
    onChange: (ev: { target: { value: string } }) => aoConfirmar(ev.target.value),
  };

  return multilinha ? (
    <textarea {...comum} ref={ref} rows={1} className="cel-editavel cel-descricao" />
  ) : (
    <input {...comum} ref={ref} {...(sugestoes ? { list: sugestoes } : {})} />
  );
}

/**
 * Celula numerica: guarda o texto enquanto edita e so converte ao sair.
 * Assim ninguem perde o que digitou no meio de "1.2" virando 12.
 */
function CelulaNumerica({
  textoInicial,
  rotulo,
  posicao,
  esmaecido = false,
  aoSair,
}: {
  textoInicial: string;
  rotulo: string;
  posicao?: Posicao;
  esmaecido?: boolean;
  aoSair: (texto: string) => void;
}) {
  const ref = useFocoAutomatico(posicao);
  const focar = useEditor((e) => e.focar);
  const rascunho = useRef(textoInicial);
  const editando = useRef(false);
  const { aoTeclar, aoColar } = useTeclado(posicao, () => aoSair(rascunho.current));

  /*
   * Sincroniza o texto do campo sem `key`.
   *
   * Antes havia `key={textoInicial}`: ao sair da célula o valor mudava, a key
   * mudava, e o React desmontava e remontava o input embaixo do cursor. Aqui o
   * input é o mesmo do começo ao fim — só o texto é reescrito, e só quando
   * ninguém está digitando nele.
   */
  useEffect(() => {
    if (editando.current) return;
    rascunho.current = textoInicial;
    if (ref.current && ref.current.value !== textoInicial) {
      ref.current.value = textoInicial;
    }
  }, [textoInicial, ref]);

  return (
    <input
      ref={ref}
      className={esmaecido ? 'cel-editavel num cel-esmaecida' : 'cel-editavel num'}
      defaultValue={textoInicial}
      inputMode="decimal"
      aria-label={rotulo}
      onKeyDown={aoTeclar}
      onPaste={aoColar}
      onFocus={() => {
        editando.current = true;
        if (posicao) focar(posicao);
      }}
      onChange={(ev) => {
        rascunho.current = ev.target.value;
      }}
      onBlur={(ev) => {
        editando.current = false;
        aoSair(ev.target.value);
      }}
    />
  );
}

function CelulaQuantidade({
  valor,
  rotulo,
  posicao,
  aoConfirmar,
}: {
  valor: number | undefined;
  rotulo: string;
  posicao?: Posicao;
  aoConfirmar: (q: number | null) => void;
}) {
  return (
    <CelulaNumerica
      textoInicial={valor === undefined ? '' : fmt.quantia(valor)}
      rotulo={rotulo}
      {...(posicao ? { posicao } : {})}
      aoSair={(texto) => {
        try {
          aoConfirmar(lerQuantidade(texto));
        } catch {
          aoConfirmar(null);
        }
      }}
    />
  );
}

function CelulaValor({
  valor,
  rotulo,
  posicao,
  esmaecido,
  aoConfirmar,
}: {
  valor: number | undefined;
  rotulo: string;
  posicao?: Posicao;
  esmaecido?: boolean;
  aoConfirmar: (centavos: number | null) => void;
}) {
  return (
    <CelulaNumerica
      textoInicial={valor === undefined ? '' : fmt.valor(valor)}
      rotulo={rotulo}
      {...(posicao ? { posicao } : {})}
      {...(esmaecido !== undefined ? { esmaecido } : {})}
      aoSair={(texto) => {
        try {
          aoConfirmar(lerCentavos(texto));
        } catch {
          aoConfirmar(null);
        }
      }}
    />
  );
}

export { COLUNAS };
