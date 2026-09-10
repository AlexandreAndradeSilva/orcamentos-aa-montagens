import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, excluirOrcamento } from '../dados/db';
import { BotaoExcluir } from './BotaoExcluir';
import { useEditor } from '../estado/editor';
import { calcularTotais, numeroCompleto } from '../domain/orcamento';
import { STATUS, type Orcamento, type Status } from '../domain/esquemas';
import * as fmt from '../formato';
import './lista.css';

type FiltroStatus = Status | 'todos';

export function ListaOrcamentos() {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<FiltroStatus>('todos');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');

  const orcamentos = useLiveQuery(() => db.orcamentos.reverse().sortBy('alteradoEm'), []);
  // A configuração vem do store: `lerConfiguracao` grava a padrão na primeira
  // execução, e liveQuery não aceita transação de escrita.
  const config = useEditor((e) => e.config);

  const filtrados = useMemo(() => {
    if (!orcamentos) return [];
    const termo = busca.trim().toLowerCase();
    return orcamentos.filter((o) => {
      if (o.arquivado) return false;
      if (status !== 'todos' && o.status !== status) return false;
      if (de && o.dataEmissao < de) return false;
      if (ate && o.dataEmissao > ate) return false;
      if (termo === '') return true;
      return (
        o.clienteNome.toLowerCase().includes(termo) ||
        o.numero.toLowerCase().includes(termo) ||
        o.secoes.some((s) => s.linhas.some((l) => l.descricao.toLowerCase().includes(termo)))
      );
    });
  }, [orcamentos, busca, status, de, ate]);

  const carregando = orcamentos === undefined || config === null;

  return (
    <div className="pagina">
      <header className="lista-cabecalho">
        <h1>Orçamentos</h1>
        <Link className="botao botao--primario" to="/orcamentos/novo">
          Novo orçamento
        </Link>
      </header>

      <div className="filtros painel">
        <label className="campo-envolve">
          <span className="rotulo">Buscar</span>
          <input
            className="campo"
            value={busca}
            placeholder="cliente, número ou descrição"
            onChange={(ev) => setBusca(ev.target.value)}
          />
        </label>
        <label className="campo-envolve">
          <span className="rotulo">Situação</span>
          <select
            className="campo"
            value={status}
            onChange={(ev) => setStatus(ev.target.value as FiltroStatus)}
          >
            <option value="todos">todas</option>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="campo-envolve">
          <span className="rotulo">De</span>
          <input
            className="campo"
            type="date"
            value={de}
            onChange={(ev) => setDe(ev.target.value)}
          />
        </label>
        <label className="campo-envolve">
          <span className="rotulo">Até</span>
          <input
            className="campo"
            type="date"
            value={ate}
            onChange={(ev) => setAte(ev.target.value)}
          />
        </label>
      </div>

      {carregando ? (
        <p className="vazio">Carregando…</p>
      ) : filtrados.length === 0 ? (
        <div className="painel vazio">
          <p>{textoVazio(orcamentos.length, de)}</p>
          <Link className="botao botao--primario" to="/orcamentos/novo">
            Novo orçamento
          </Link>
        </div>
      ) : (
        <div className="painel">
          <table className="lista">
            <caption className="so-leitor">Orçamentos, do mais recente para o mais antigo.</caption>
            <thead>
              <tr>
                <th scope="col">Número</th>
                <th scope="col">Cliente</th>
                <th scope="col">Emissão</th>
                <th scope="col">Situação</th>
                <th scope="col" className="num">
                  A pagar
                </th>
                <th scope="col">
                  <span className="so-leitor">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((o) => {
                const totais = calcularTotais(o, {
                  percentualEntradaPadrao: config.percentualEntradaPadrao,
                });
                return (
                  <tr key={o.id}>
                    <td>
                      <Link to={`/orcamentos/${o.id}`} className="lista__numero">
                        {numeroCompleto(o.numero, o.revisao)}
                      </Link>
                    </td>
                    <td>{o.clienteNome}</td>
                    <td>{fmt.data(o.dataEmissao)}</td>
                    <td>
                      <span className={`status status--${o.status}`}>{o.status}</span>
                    </td>
                    <td className="num">{fmt.valor(totais.aPagar)}</td>
                    <td className="lista__acoes">
                      <BotaoPdf orcamento={o} percentualEntradaPadrao={config} />
                      <BotaoExcluir
                        compacto
                        rotulo="Excluir"
                        descricao={`o orçamento ${numeroCompleto(o.numero, o.revisao)} de ${o.clienteNome}`}
                        aoConfirmar={() => excluirOrcamento(o.id)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BotaoPdf({
  orcamento,
  percentualEntradaPadrao,
}: {
  orcamento: Orcamento;
  percentualEntradaPadrao: NonNullable<ReturnType<typeof useEditor.getState>['config']>;
}) {
  const [gerando, setGerando] = useState(false);
  return (
    <button
      type="button"
      className="botao botao--texto botao--mini"
      aria-label={`Exportar o orçamento ${numeroCompleto(orcamento.numero, orcamento.revisao)} em PDF`}
      disabled={gerando}
      onClick={() => {
        setGerando(true);
        void import('../pdf/exportar')
          .then((m) => m.baixarPdf(orcamento, percentualEntradaPadrao))
          .finally(() => setGerando(false));
      }}
    >
      {gerando ? 'gerando…' : 'PDF'}
    </button>
  );
}

function textoVazio(total: number, de: string): string {
  if (total === 0) return 'Nenhum orçamento ainda.';
  if (de) return `Nenhum orçamento em ${fmt.competencia(de)}.`;
  return 'Nenhum orçamento com esses filtros.';
}
