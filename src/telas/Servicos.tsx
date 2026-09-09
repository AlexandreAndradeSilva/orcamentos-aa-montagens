import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../dados/db';
import * as fmt from '../formato';

/**
 * Catálogo de serviços.
 *
 * A planilha de origem não tem catálogo nenhum (lacuna L10), então ele se
 * constrói pelo uso: cada descrição salva num orçamento entra aqui com o
 * último preço praticado como referência.
 */
export function Servicos() {
  const servicos = useLiveQuery(() => db.servicos.orderBy('usos').reverse().toArray(), []);

  if (!servicos) return <p className="vazio">Carregando…</p>;

  return (
    <div className="pagina">
      <h1>Serviços</h1>
      <p style={{ color: 'var(--cor-tinta-media)', marginTop: 'var(--e-2)' }}>
        Montado a partir do que você já orçou. A planilha original não trazia tabela de preços.
      </p>

      {servicos.length === 0 ? (
        <div className="painel vazio" style={{ marginTop: 'var(--e-4)' }}>
          <p>Ainda não há serviços registrados. Eles aparecem conforme você salva orçamentos.</p>
        </div>
      ) : (
        <div className="painel" style={{ marginTop: 'var(--e-4)' }}>
          <table className="lista">
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
              </tr>
            </thead>
            <tbody>
              {servicos.map((s) => (
                <tr key={s.id}>
                  <td>{s.descricao}</td>
                  <td>{s.unidade ?? '——'}</td>
                  <td className="num">
                    {s.valorReferencia === undefined ? '——' : fmt.valor(s.valorReferencia)}
                  </td>
                  <td className="num">{s.usos}</td>
                  <td>{fmt.data(s.usadoEm.slice(0, 10))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
