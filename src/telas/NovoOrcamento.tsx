import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, lerConfiguracao, reservarNumero } from '../dados/db';
import { ambientePadrao, orcamentoNovo } from '../domain/fabrica';
import { calcularValidade } from '../domain/orcamento';
import * as fmt from '../formato';

export function NovoOrcamento() {
  const navegar = useNavigate();
  const clientes = useLiveQuery(() => db.clientes.orderBy('nome').toArray(), []);
  const [nome, setNome] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [criando, setCriando] = useState(false);

  /** Escolher um cliente ja cadastrado preenche o nome na hora, sem efeito. */
  function escolherCliente(id: string) {
    setClienteId(id);
    const achado = clientes?.find((c) => c.id === id);
    setNome(achado ? achado.nome : '');
  }

  async function criar() {
    const limpo = nome.trim();
    if (limpo === '') {
      setErro('Informe o cliente.');
      return;
    }
    setCriando(true);
    try {
      const config = await lerConfiguracao();
      const hoje = fmt.hojeISO();
      const ano = Number(hoje.slice(0, 4));

      let id = clienteId;
      if (!id) {
        id = ambientePadrao.novoId();
        await db.clientes.add({
          id,
          nome: limpo,
          criadoEm: ambientePadrao.agora(),
        });
      }

      const { sequencial } = await reservarNumero(ano);
      const novo = orcamentoNovo(ambientePadrao, {
        sequencial,
        ano,
        clienteId: id,
        clienteNome: limpo,
        dataEmissao: hoje,
        condicoesPagamento: config.condicoesPagamentoPadrao,
        ...(config.validadePadraoDias !== undefined
          ? { validade: fmt.data(calcularValidade(hoje, config.validadePadraoDias)) }
          : {}),
        ...(config.prazoEntregaPadrao !== undefined
          ? { prazoEntrega: config.prazoEntregaPadrao }
          : {}),
      });
      await db.orcamentos.add(novo);
      navegar(`/orcamentos/${novo.id}`, { replace: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'não foi possível criar o orçamento');
      setCriando(false);
    }
  }

  return (
    <div className="pagina">
      <h1>Novo orçamento</h1>
      <div className="painel doc-bloco" style={{ maxWidth: 560, marginTop: 'var(--e-4)' }}>
        {clientes && clientes.length > 0 && (
          <label className="campo-envolve" style={{ marginBottom: 'var(--e-3)' }}>
            <span className="rotulo">Cliente já cadastrado</span>
            <select
              className="campo"
              value={clienteId}
              onChange={(ev) => escolherCliente(ev.target.value)}
            >
              <option value="">— novo cliente —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="campo-envolve">
          <span className="rotulo">Cliente</span>
          <input
            className="campo"
            value={nome}
            autoFocus
            placeholder="ex.: Igreja Portal Pérola 2"
            onChange={(ev) => {
              setNome(ev.target.value);
              setClienteId('');
            }}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') void criar();
            }}
          />
        </label>

        {erro && (
          <p className="faixa-erro" style={{ marginTop: 'var(--e-3)' }}>
            {erro}
          </p>
        )}

        <div style={{ marginTop: 'var(--e-4)', display: 'flex', gap: 'var(--e-2)' }}>
          <button
            type="button"
            className="botao botao--primario"
            onClick={() => void criar()}
            disabled={criando}
          >
            Criar orçamento
          </button>
          <button type="button" className="botao" onClick={() => navegar('/orcamentos')}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
