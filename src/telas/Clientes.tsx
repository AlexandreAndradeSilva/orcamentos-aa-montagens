import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../dados/db';
import * as fmt from '../formato';

export function Clientes() {
  const clientes = useLiveQuery(() => db.clientes.orderBy('nome').toArray(), []);

  if (!clientes) return <p className="vazio">Carregando…</p>;

  return (
    <div className="pagina">
      <h1>Clientes</h1>
      {clientes.length === 0 ? (
        <div className="painel vazio" style={{ marginTop: 'var(--e-4)' }}>
          <p>Nenhum cliente ainda. Eles entram sozinhos quando você cria um orçamento.</p>
        </div>
      ) : (
        <div className="painel" style={{ marginTop: 'var(--e-4)' }}>
          <table className="lista">
            <thead>
              <tr>
                <th scope="col">Nome</th>
                <th scope="col">CNPJ / CPF</th>
                <th scope="col">Cidade</th>
                <th scope="col">Fone</th>
                <th scope="col">Contato</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{c.cnpjCpf ?? '——'}</td>
                  <td>{c.cidade ?? '——'}</td>
                  <td>{c.telefone ?? '——'}</td>
                  <td>{c.contato ?? '——'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ color: 'var(--cor-tinta-fraca)', fontSize: 'var(--txt-xs)' }}>
        {clientes.length > 0 &&
          `${clientes.length} cliente(s) — último cadastro em ${fmt.data(
            clientes
              .reduce((a, c) => (c.criadoEm > a ? c.criadoEm : a), clientes[0]!.criadoEm)
              .slice(0, 10),
          )}`}
      </p>
    </div>
  );
}
