/**
 * Excluir em dois passos, sem `window.confirm`.
 *
 * O primeiro clique troca o botão por "Confirmar / Cancelar". Não usa modal
 * nem `confirm()` do navegador: é acessível, dá para testar, e não sequestra
 * a janela inteira por causa de um clique errado.
 */
import { useEffect, useRef, useState } from 'react';

export function BotaoExcluir({
  rotulo,
  descricao,
  aoConfirmar,
  compacto = false,
}: {
  /** Texto do botão em repouso. */
  rotulo: string;
  /** O que será excluído, para o leitor de tela e para o title. */
  descricao: string;
  aoConfirmar: () => void | Promise<void>;
  compacto?: boolean;
}) {
  const [perguntando, setPerguntando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const refConfirmar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (perguntando) refConfirmar.current?.focus();
  }, [perguntando]);

  const classe = compacto ? 'botao botao--texto botao--mini' : 'botao';

  if (!perguntando) {
    return (
      <button
        type="button"
        className={`${classe} botao--destrutivo`}
        title={`Excluir ${descricao}`}
        aria-label={`Excluir ${descricao}`}
        onClick={() => setPerguntando(true)}
      >
        {rotulo}
      </button>
    );
  }

  return (
    <span className="excluir-confirma" role="group" aria-label={`Confirmar exclusão: ${descricao}`}>
      <span className="excluir-confirma__pergunta">Excluir mesmo?</span>
      <button
        ref={refConfirmar}
        type="button"
        className={`${classe} botao--destrutivo`}
        disabled={ocupado}
        onClick={() => {
          setOcupado(true);
          void Promise.resolve(aoConfirmar()).finally(() => setOcupado(false));
        }}
      >
        {ocupado ? 'Excluindo…' : 'Confirmar'}
      </button>
      <button
        type="button"
        className={classe}
        disabled={ocupado}
        onClick={() => setPerguntando(false)}
      >
        Cancelar
      </button>
    </span>
  );
}
