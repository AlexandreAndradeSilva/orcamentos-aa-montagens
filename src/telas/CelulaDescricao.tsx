/**
 * A célula de descrição, com sugestões do catálogo de serviços.
 *
 * É um combobox de verdade, não um `datalist`: o campo é `textarea` (as
 * descrições da AA Montagens têm duas e três linhas) e `datalist` só funciona
 * em `input`.
 *
 * O teclado tem prioridade sobre o da grade **enquanto a lista está aberta**:
 * seta escolhe sugestão em vez de mudar de linha, Enter aceita em vez de criar
 * linha nova, Esc fecha. Com a lista fechada, tudo volta ao normal.
 */
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { filtrarServicos, type ServicoSugerido } from './sugestoes';
import * as fmt from '../formato';

export function CelulaDescricao({
  valor,
  rotulo,
  placeholder,
  servicos,
  aoTeclar,
  aoColar,
  aoFocar,
  refCampo,
  aoDigitar,
  aoEscolher,
}: {
  valor: string;
  rotulo: string;
  placeholder?: string;
  servicos: readonly ServicoSugerido[];
  aoTeclar: (ev: KeyboardEvent<HTMLElement>) => void;
  aoColar: (ev: React.ClipboardEvent<HTMLElement>) => void;
  aoFocar: () => void;
  /** O mesmo ref que a grade usa para pedir foco nesta célula. */
  refCampo: React.RefObject<HTMLTextAreaElement & HTMLInputElement>;
  aoDigitar: (texto: string) => void;
  aoEscolher: (servico: ServicoSugerido) => void;
}) {
  const [aberta, setAberta] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const idLista = useId();
  const ignorarProximaAbertura = useRef(false);

  const sugestoes = aberta ? filtrarServicos(servicos, valor) : [];
  const mostrando = sugestoes.length > 0;
  // Derivado, não guardado: a lista encolhe enquanto se digita, e corrigir o
  // índice num efeito seria uma cascata de render à toa.
  const indiceAtivo = sugestoes.length === 0 ? 0 : Math.min(ativo, sugestoes.length - 1);

  function escolher(servico: ServicoSugerido) {
    aoEscolher(servico);
    setAberta(false);
    ignorarProximaAbertura.current = true;
    refCampo.current?.focus();
  }

  function teclado(ev: KeyboardEvent<HTMLTextAreaElement>) {
    if (mostrando) {
      if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        setAtivo((i) => (Math.min(i, sugestoes.length - 1) + 1) % sugestoes.length);
        return;
      }
      if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        setAtivo(
          (i) => (Math.min(i, sugestoes.length - 1) - 1 + sugestoes.length) % sugestoes.length,
        );
        return;
      }
      if (ev.key === 'Enter' && !ev.ctrlKey && !ev.shiftKey) {
        const escolhido = sugestoes[indiceAtivo];
        if (escolhido) {
          ev.preventDefault();
          escolher(escolhido);
          return;
        }
      }
      if (ev.key === 'Escape') {
        ev.preventDefault();
        setAberta(false);
        return;
      }
      if (ev.key === 'Tab') {
        setAberta(false);
        // deixa o Tab seguir para a próxima célula
      }
    }
    aoTeclar(ev);
  }

  return (
    <div className="sugestao-envolve">
      <textarea
        ref={refCampo}
        rows={1}
        className="cel-editavel cel-descricao"
        value={valor}
        placeholder={placeholder}
        aria-label={rotulo}
        role="combobox"
        aria-expanded={mostrando}
        aria-controls={mostrando ? idLista : undefined}
        aria-activedescendant={mostrando ? `${idLista}-${indiceAtivo}` : undefined}
        aria-autocomplete="list"
        onKeyDown={teclado}
        onPaste={aoColar}
        onFocus={aoFocar}
        onBlur={() => setAberta(false)}
        onChange={(ev) => {
          aoDigitar(ev.target.value);
          if (ignorarProximaAbertura.current) {
            ignorarProximaAbertura.current = false;
            return;
          }
          setAberta(true);
          setAtivo(0);
        }}
      />

      {mostrando && (
        <ul className="sugestoes" id={idLista} role="listbox" aria-label="Serviços já orçados">
          {sugestoes.map((s, i) => (
            <li
              key={s.id}
              id={`${idLista}-${i}`}
              role="option"
              aria-selected={i === indiceAtivo}
              className={i === indiceAtivo ? 'sugestao sugestao--ativa' : 'sugestao'}
              // mousedown antes do blur: sem isso o campo perde o foco e a
              // lista fecha antes do clique chegar
              onMouseDown={(ev) => {
                ev.preventDefault();
                escolher(s);
              }}
              onMouseEnter={() => setAtivo(i)}
            >
              <span className="sugestao__descricao">{s.descricao}</span>
              <span className="sugestao__meta">
                {s.unidade ?? '——'}
                {s.valorReferencia === undefined ? '' : ` · ${fmt.valor(s.valorReferencia)}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
