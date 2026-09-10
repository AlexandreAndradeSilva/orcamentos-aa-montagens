import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useEditor } from '../estado/editor';
import { db, excluirOrcamento } from '../dados/db';
import { BotaoExcluir } from './BotaoExcluir';
import { GradeItens } from './GradeItens';
import { BlocoTotais } from './BlocoTotais';
import { lerCentavos } from '../domain/dinheiro';
import { linhasIncompletas, numeroCompleto, numeroDoItem } from '../domain/orcamento';
import { STATUS, type Status } from '../domain/esquemas';
import { linkWhatsApp } from '../whatsapp';
import * as fmt from '../formato';
import './editor.css';

const ROTULO_STATUS: Record<Status, string> = {
  rascunho: 'rascunho',
  enviado: 'enviado',
  aprovado: 'aprovado',
  perdido: 'perdido',
};

export function EditorOrcamento() {
  const { id } = useParams();
  const navegar = useNavigate();
  const orcamento = useEditor((e) => e.orcamento);
  const config = useEditor((e) => e.config);
  const sujo = useEditor((e) => e.sujo);
  const salvoEm = useEditor((e) => e.salvoEm);
  const erro = useEditor((e) => e.erro);
  const abrir = useEditor((e) => e.abrir);
  const alterar = useEditor((e) => e.alterar);
  const salvar = useEditor((e) => e.salvar);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    void (async () => {
      if (!id) return;
      const achado = await db.orcamentos.get(id);
      if (!ativo) return;
      if (achado) abrir(achado);
      else setNaoEncontrado(true);
    })();
    return () => {
      ativo = false;
    };
  }, [id, abrir]);

  if (naoEncontrado) {
    return (
      <div className="pagina">
        <div className="painel vazio">
          <p>Esse orçamento não está mais aqui. Pode ter sido excluído.</p>
          <Link className="botao" to="/orcamentos">
            Ver todos os orçamentos
          </Link>
        </div>
      </div>
    );
  }

  if (!orcamento || !config) {
    return (
      <div className="pagina">
        <p className="vazio">Abrindo o orçamento…</p>
      </div>
    );
  }

  const pendencias = linhasIncompletas(orcamento.secoes);

  return (
    <div className="pagina">
      <header className="doc-cabecalho">
        <div>
          <h1 className="doc-numero">
            Orçamento {numeroCompleto(orcamento.numero, orcamento.revisao)}
          </h1>
          <p className="doc-cliente">{orcamento.clienteNome}</p>
        </div>

        <div className="doc-acoes">
          <label className="so-leitor" htmlFor="status">
            Situação do orçamento
          </label>
          <select
            id="status"
            className="campo campo--status"
            value={orcamento.status}
            onChange={(ev) => alterar({ status: ev.target.value as Status })}
          >
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {ROTULO_STATUS[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="botao"
            disabled={gerando}
            onClick={() => {
              setGerando(true);
              setFalha(null);
              // import dinâmico: o @react-pdf só entra quando alguém exporta
              void import('../pdf/exportar')
                .then((m) => m.baixarPdf(orcamento, config))
                .catch((e: unknown) =>
                  setFalha(e instanceof Error ? e.message : 'não foi possível gerar o PDF'),
                )
                .finally(() => setGerando(false));
            }}
          >
            {gerando ? 'Gerando…' : 'Exportar PDF'}
          </button>
          <a
            className="botao"
            href={linkWhatsApp(orcamento, config, config.empresa.whatsapp[0])}
            target="_blank"
            rel="noreferrer"
          >
            Enviar no WhatsApp
          </a>
          <button
            type="button"
            className="botao botao--primario"
            onClick={() => void salvar()}
            disabled={!sujo}
          >
            {sujo ? 'Salvar' : 'Salvo'}
          </button>
          <BotaoExcluir
            rotulo="Excluir"
            descricao={`o orçamento ${numeroCompleto(orcamento.numero, orcamento.revisao)}`}
            aoConfirmar={async () => {
              await excluirOrcamento(orcamento.id);
              navegar('/orcamentos', { replace: true });
            }}
          />
        </div>

        <p className="doc-salvo" aria-live="polite">
          {sujo
            ? 'alterações não salvas'
            : salvoEm
              ? `salvo às ${fmt.horario(salvoEm)}`
              : `alterado em ${fmt.data(orcamento.alteradoEm.slice(0, 10))}`}
        </p>
      </header>

      {erro && (
        <p className="faixa-erro" role="alert">
          {erro}
        </p>
      )}
      {falha && (
        <p className="faixa-erro" role="alert">
          {falha}
        </p>
      )}

      <section className="painel doc-bloco" aria-label="Dados do orçamento">
        <div className="campos">
          <Campo rotulo="Emissão">
            <input
              className="campo"
              type="date"
              value={orcamento.dataEmissao}
              onChange={(ev) => alterar({ dataEmissao: ev.target.value })}
            />
          </Campo>
          <Campo rotulo="Validade do orçamento">
            <input
              className="campo"
              value={orcamento.validade ?? ''}
              placeholder="ex.: 15 dias"
              onChange={(ev) => alterar({ validade: ev.target.value || undefined })}
            />
          </Campo>
          <Campo rotulo="Prazo de entrega">
            <input
              className="campo"
              value={orcamento.prazoEntrega ?? ''}
              placeholder="ex.: 30 dias após aprovação"
              onChange={(ev) => alterar({ prazoEntrega: ev.target.value || undefined })}
            />
          </Campo>
          <Campo rotulo="Acréscimo nota fiscal">
            <input
              className="campo num"
              defaultValue={fmt.valor(orcamento.acrescimoNotaFiscal)}
              key={orcamento.acrescimoNotaFiscal}
              inputMode="decimal"
              onBlur={(ev) => {
                try {
                  alterar({ acrescimoNotaFiscal: lerCentavos(ev.target.value) ?? 0 });
                } catch {
                  alterar({ acrescimoNotaFiscal: 0 });
                }
              }}
            />
          </Campo>
        </div>
        <Campo rotulo="Condições de pagamento">
          <input
            className="campo"
            value={orcamento.condicoesPagamento}
            onChange={(ev) => alterar({ condicoesPagamento: ev.target.value })}
          />
        </Campo>
      </section>

      <GradeItens />

      {pendencias.length > 0 && (
        <ul className="pendencias" aria-live="polite">
          {pendencias.map((p) => (
            <li key={`${p.secao}-${p.linha}-${p.motivo}`}>
              Item {numeroDoItem(p.secao, p.linha)}{' '}
              {p.motivo === 'sem-valor' ? 'sem valor' : 'sem quantidade'} — não entra no total.
            </li>
          ))}
        </ul>
      )}

      <div className="doc-rodape">
        <div className="doc-rodape__notas">
          <p className="aviso-reajuste">{config.avisoReajuste}</p>
          <Campo rotulo="Observações">
            <textarea
              className="campo campo--area"
              rows={3}
              value={orcamento.observacoes ?? ''}
              onChange={(ev) => alterar({ observacoes: ev.target.value || undefined })}
            />
          </Campo>
        </div>
        <BlocoTotais />
      </div>
    </div>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="campo-envolve">
      <span className="rotulo">{rotulo}</span>
      {children}
    </label>
  );
}
