import { repositorio } from '../dados/repositorio';
import { useServicos } from '../dados/hooks';
import { BotaoExcluir } from './BotaoExcluir';
import * as fmt from '../formato';

/**
 * Catálogo de serviços.
 *
 * A planilha de origem não tinha catálogo nenhum (lacuna L10), então ele se
 * constrói pelo uso: cada descrição salva num orçamento entra aqui com o
 * último preço praticado como referência. Na grade de itens, essas descrições
 * viram sugestões enquanto se digita.
 */
export function Servicos() {
  const servicos = useServicos();

  if (!servicos) return <p className="vazio">Carregando…</p>;

  return (
    <div className="pagina">
      <h1>Serviços</h1>
      <p style={{ color: 'var(--cor-tinta-media)', marginTop: 'var(--e-2)' }}>
        Montado a partir do que você já orçou — a planilha original não trazia tabela de preços. Ao
        digitar a descrição de um item, estes serviços aparecem como sugestão, já com a unidade e o
        último valor.
      </p>

      {servicos.length === 0 ? (
        <div className="painel vazio" style={{ marginTop: 'var(--e-4)' }}>
          <p>Ainda não há serviços registrados. Eles aparecem conforme você salva orçamentos.</p>
        </div>
      ) : (
        <>
          <div className="painel" style={{ marginTop: 'var(--e-4)' }}>
            <table className="lista">
              <caption className="so-leitor">
                Serviços já orçados, do mais usado para o menos usado.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Descrição</th>
                  <th scope="col">Unid.</th>
                  <th scope="col" className="num">
                    Último valor
                  </th>
                  <th scope="col" className="num">
                    Usos
                  </th>
                  <th scope="col">Usado em</th>
                  <th scope="col">
                    <span className="so-leitor">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {servicos.map((s) => (
                  <tr key={s.id}>
                    <td data-rotulo="Descrição">{s.descricao}</td>
                    <td data-rotulo="Unid.">{s.unidade ?? '——'}</td>
                    <td className="num" data-rotulo="Último valor">
                      {s.valorReferencia === undefined ? '——' : fmt.valor(s.valorReferencia)}
                    </td>
                    <td className="num" data-rotulo="Usos">
                      {s.usos}
                    </td>
                    <td data-rotulo="Usado em">{fmt.data(s.usadoEm.slice(0, 10))}</td>
                    <td className="lista__acoes">
                      <BotaoExcluir
                        compacto
                        rotulo="Excluir"
                        descricao={`o serviço ${s.descricao.slice(0, 60)}`}
                        aoConfirmar={() => repositorio.excluirServico(s.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p
            style={{
              color: 'var(--cor-tinta-fraca)',
              fontSize: 'var(--txt-xs)',
              marginTop: 'var(--e-3)',
            }}
          >
            Excluir um serviço só o tira das sugestões — os orçamentos que já o usaram continuam
            iguais. Se você orçar a mesma descrição de novo, ela volta para cá.
          </p>
        </>
      )}
    </div>
  );
}
