/**
 * A grade densa de edicao. E a tela principal, e ela e uma planilha.
 *
 * Quem usa vem do Excel: edicao inline na celula, Tab avanca, Enter cria
 * linha, Ctrl+D duplica, setas navegam, Ctrl+V cola bloco de planilha.
 */
import { useEffect, useRef, type KeyboardEvent, type ClipboardEvent } from 'react';
import { COLUNAS, useEditor, type Coluna } from '../estado/editor';
import { lerCentavos, lerQuantidade } from '../domain/dinheiro';
import { numeroDaSecao, numeroDoItem, totalDaLinha, totalDaSecao } from '../domain/orcamento';
import type { Linha, Secao } from '../domain/esquemas';
import * as fmt from '../formato';
import './grade.css';

export function GradeItens() {
  const orcamento = useEditor((e) => e.orcamento);
  const novaSecao = useEditor((e) => e.novaSecao);

  if (!orcamento) return null;

  return (
    <div className="grade-envolve">
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
          </tr>
        </thead>
        {orcamento.secoes.map((secao, s) => (
          <BlocoSecao key={secao.id} secao={secao} indice={s} />
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

function BlocoSecao({ secao, indice }: { secao: Secao; indice: number }) {
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
        <td colSpan={2} className="linha-secao__controles">
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
          primeiraDoBloco={l === 0}
          alturaDoBloco={secao.linhas.length}
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
          <td className="num">
            <CelulaValor
              valor={secao.precoFechado}
              rotulo={`Preço fechado da seção ${numeroDaSecao(indice)}`}
              aoConfirmar={(centavos) => definirPrecoFechado(indice, centavos ?? 0)}
            />
          </td>
          <td className="num cel-total cel-total--forte">{fmt.valor(totalDaSecao(secao))}</td>
        </tr>
      )}

      <tr className="linha-acao">
        <td />
        <td colSpan={5}>
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
  primeiraDoBloco: boolean;
  alturaDoBloco: number;
}

function LinhaItem({ linha, secao, indice, blocoFechado }: PropsLinha) {
  const alterarLinha = useEditor((e) => e.alterarLinha);
  const total = totalDaLinha(linha);

  return (
    <tr>
      <td className="cel-item">{numeroDoItem(secao, indice)}</td>
      <td>
        <CelulaTexto
          valor={linha.descricao}
          multilinha
          rotulo={`Descrição do item ${numeroDoItem(secao, indice)}`}
          posicao={{ secao, linha: indice, coluna: 'descricao' }}
          placeholder="Ex.: pergolado garagem com dobras em chapa 16 (1,5 mm)"
          aoConfirmar={(texto) => alterarLinha(secao, indice, { descricao: texto })}
        />
      </td>
      <td className="num">
        <CelulaQuantidade
          valor={linha.quantidade}
          rotulo={`Quantidade do item ${numeroDoItem(secao, indice)}`}
          posicao={{ secao, linha: indice, coluna: 'quantidade' }}
          aoConfirmar={(q) => alterarLinha(secao, indice, { quantidade: q ?? undefined })}
        />
      </td>
      <td>
        <CelulaTexto
          valor={linha.unidade ?? ''}
          rotulo={`Unidade do item ${numeroDoItem(secao, indice)}`}
          posicao={{ secao, linha: indice, coluna: 'unidade' }}
          placeholder="UNID."
          aoConfirmar={(t) => alterarLinha(secao, indice, { unidade: t || undefined })}
        />
      </td>
      <td className="num">
        <CelulaValor
          valor={linha.valorUnitario}
          rotulo={`Valor unitário do item ${numeroDoItem(secao, indice)}`}
          posicao={{ secao, linha: indice, coluna: 'valor' }}
          esmaecido={blocoFechado}
          aoConfirmar={(c) => alterarLinha(secao, indice, { valorUnitario: c ?? undefined })}
        />
      </td>
      <td className="num cel-total">
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
    </tr>
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

function useFocoAutomatico(posicao: Posicao | undefined) {
  const foco = useEditor((e) => e.foco);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);

  useEffect(() => {
    if (!posicao || !foco) return;
    if (
      foco.secao === posicao.secao &&
      foco.linha === posicao.linha &&
      foco.coluna === posicao.coluna
    ) {
      ref.current?.focus();
    }
  }, [foco, posicao]);

  return ref;
}

function CelulaTexto({
  valor,
  rotulo,
  placeholder,
  multilinha = false,
  posicao,
  aoConfirmar,
}: {
  valor: string;
  rotulo: string;
  placeholder?: string;
  multilinha?: boolean;
  posicao?: Posicao;
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
    <input {...comum} ref={ref} />
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

  useEffect(() => {
    if (!editando.current) rascunho.current = textoInicial;
  }, [textoInicial]);

  return (
    <input
      ref={ref}
      className={esmaecido ? 'cel-editavel num cel-esmaecida' : 'cel-editavel num'}
      defaultValue={textoInicial}
      key={textoInicial}
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
