import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, excluirCliente } from '../dados/db';
import { BotaoExcluir } from './BotaoExcluir';
import { FormularioCliente } from './FormularioCliente';
import * as fmt from '../formato';

export function Clientes() {
  const clientes = useLiveQuery(() => db.clientes.orderBy('nome').toArray(), []);
  const orcamentos = useLiveQuery(() => db.orcamentos.toArray(), []);
  const [editando, setEditando] = useState<string | null>(null);

  if (!clientes || !orcamentos) return <p className="vazio">Carregando…</p>;

  /** Quantos orçamentos apontam para cada cliente. */
  const quantosPor = new Map<string, number>();
  for (const o of orcamentos) {
    quantosPor.set(o.clienteId, (quantosPor.get(o.clienteId) ?? 0) + 1);
  }

  return (
    <div className="pagina">
      <h1>Clientes</h1>

      {clientes.length === 0 ? (
        <div className="painel vazio" style={{ marginTop: 'var(--e-4)' }}>
          <p>Nenhum cliente ainda. Eles entram sozinhos quando você cria um orçamento.</p>
        </div>
      ) : (
        <>
          <div className="painel" style={{ marginTop: 'var(--e-4)' }}>
            <table className="lista">
              <caption className="so-leitor">Clientes cadastrados, em ordem alfabética.</caption>
              <thead>
                <tr>
                  <th scope="col">Nome</th>
                  <th scope="col">CNPJ / CPF</th>
                  <th scope="col">Cidade</th>
                  <th scope="col">Fone</th>
                  <th scope="col">Contato</th>
                  <th scope="col" className="num">
                    Orçamentos
                  </th>
                  <th scope="col">
                    <span className="so-leitor">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => {
                  const quantos = quantosPor.get(c.id) ?? 0;
                  return (
                    <tr key={c.id}>
                      <td data-rotulo="Nome">{c.nome}</td>
                      <td data-rotulo="CNPJ / CPF">{c.cnpjCpf ?? '——'}</td>
                      <td data-rotulo="Cidade">{c.cidade ?? '——'}</td>
                      <td data-rotulo="Fone">{c.telefone ?? '——'}</td>
                      <td data-rotulo="Contato">{c.contato ?? '——'}</td>
                      <td className="num" data-rotulo="Orçamentos">
                        {quantos === 0 ? '——' : quantos}
                      </td>
                      <td className="lista__acoes">
                        <button
                          type="button"
                          className="botao botao--texto botao--mini"
                          aria-label={`Editar o cliente ${c.nome}`}
                          onClick={() => setEditando(editando === c.id ? null : c.id)}
                        >
                          {editando === c.id ? 'Fechar' : 'Editar'}
                        </button>
                        <BotaoExcluir
                          compacto
                          rotulo="Excluir"
                          descricao={
                            quantos === 0
                              ? `o cliente ${c.nome}`
                              : `o cliente ${c.nome}, que tem ${quantos} orçamento(s)`
                          }
                          aoConfirmar={() => excluirCliente(c.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {editando &&
            (() => {
              const c = clientes.find((x) => x.id === editando);
              if (!c) return null;
              return (
                <section
                  className="painel doc-bloco"
                  style={{ marginTop: 'var(--e-4)', maxWidth: 760 }}
                  aria-label={`Editar ${c.nome}`}
                >
                  <h2>Editar {c.nome}</h2>
                  <div style={{ marginTop: 'var(--e-3)' }}>
                    <FormularioCliente
                      key={c.id}
                      inicial={{
                        nome: c.nome,
                        cnpjCpf: c.cnpjCpf ?? '',
                        endereco: c.endereco ?? '',
                        cidade: c.cidade ?? '',
                        cep: c.cep ?? '',
                        telefone: c.telefone ?? '',
                        contato: c.contato ?? '',
                      }}
                      aoSalvar={async (dados) => {
                        const limpo = Object.fromEntries(
                          Object.entries(dados).map(([k, v]) => [
                            k,
                            typeof v === 'string' && v.trim() === '' ? undefined : v,
                          ]),
                        );
                        await db.clientes.update(c.id, { ...limpo, nome: dados.nome.trim() });
                        setEditando(null);
                      }}
                      aoCancelar={() => setEditando(null)}
                    />
                  </div>
                </section>
              );
            })()}

          <p
            style={{
              color: 'var(--cor-tinta-fraca)',
              fontSize: 'var(--txt-xs)',
              marginTop: 'var(--e-3)',
            }}
          >
            Excluir um cliente <strong>não apaga os orçamentos dele</strong> — o nome fica gravado
            no documento desde a emissão. O que se perde são os dados extras (CNPJ, endereço) em
            PDFs futuros. Último cadastro em{' '}
            {fmt.data(
              clientes
                .reduce((a, c) => (c.criadoEm > a ? c.criadoEm : a), clientes[0]!.criadoEm)
                .slice(0, 10),
            )}
            .
          </p>
        </>
      )}
    </div>
  );
}
