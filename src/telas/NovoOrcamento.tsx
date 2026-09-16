import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { repositorio } from '../dados/repositorio';
import { useClientes } from '../dados/hooks';
import { ambientePadrao, orcamentoNovo } from '../domain/fabrica';
import { calcularValidade } from '../domain/orcamento';
import { FormularioCliente, type DadosCliente } from './FormularioCliente';
import * as fmt from '../formato';

export function NovoOrcamento() {
  const navegar = useNavigate();
  const clientes = useClientes();
  const [clienteId, setClienteId] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const escolhido = clientes?.find((c) => c.id === clienteId);
  const novoCliente = clienteId === '';

  async function criar(dados: DadosCliente) {
    const nome = dados.nome.trim();
    if (nome === '') {
      setErro('Informe o cliente.');
      return;
    }
    try {
      const config = await repositorio.lerConfiguracao();
      const hoje = fmt.hojeISO();
      const ano = Number(hoje.slice(0, 4));

      // campo em branco não vira string vazia no banco: vira ausente
      const limpo = Object.fromEntries(
        Object.entries(dados).filter(([, v]) => typeof v === 'string' && v.trim() !== ''),
      ) as Partial<DadosCliente>;

      let id = clienteId;
      if (novoCliente) {
        id = ambientePadrao.novoId();
        await repositorio.gravarCliente({ ...limpo, id, nome, criadoEm: ambientePadrao.agora() });
      } else {
        // editar aqui atualiza o cadastro: os dados vão para o PDF
        await repositorio.atualizarCliente(id, { ...limpo, nome });
      }

      const { sequencial } = await repositorio.reservarNumero(ano);
      const novo = orcamentoNovo(ambientePadrao, {
        sequencial,
        ano,
        clienteId: id,
        clienteNome: nome,
        dataEmissao: hoje,
        condicoesPagamento: config.condicoesPagamentoPadrao,
        ...(config.validadePadraoDias !== undefined
          ? { validade: fmt.data(calcularValidade(hoje, config.validadePadraoDias)) }
          : {}),
        ...(config.prazoEntregaPadrao !== undefined
          ? { prazoEntrega: config.prazoEntregaPadrao }
          : {}),
      });
      await repositorio.gravarOrcamento(novo);
      navegar(`/orcamentos/${novo.id}`, { replace: true });
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'não foi possível criar o orçamento');
    }
  }

  return (
    <div className="pagina">
      <h1>Novo orçamento</h1>
      <p style={{ color: 'var(--cor-tinta-media)', marginTop: 'var(--e-2)' }}>
        Só o nome é obrigatório. O resto sai no PDF — e dá para completar depois.
      </p>

      <div className="painel doc-bloco" style={{ maxWidth: 760, marginTop: 'var(--e-4)' }}>
        {clientes && clientes.length > 0 && (
          <label className="campo-envolve" style={{ marginBottom: 'var(--e-4)' }}>
            <span className="rotulo">Cliente já cadastrado</span>
            <select
              className="campo"
              value={clienteId}
              onChange={(ev) => {
                setClienteId(ev.target.value);
                setErro(null);
              }}
            >
              <option value="">— cadastrar um novo —</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        )}

        {erro && (
          <p className="faixa-erro" role="alert" style={{ marginBottom: 'var(--e-3)' }}>
            {erro}
          </p>
        )}

        <FormularioCliente
          // remonta o formulário ao trocar de cliente, para os campos trocarem junto
          key={clienteId}
          rotuloEnviar="Criar orçamento"
          {...(escolhido
            ? {
                inicial: {
                  nome: escolhido.nome,
                  cnpjCpf: escolhido.cnpjCpf ?? '',
                  endereco: escolhido.endereco ?? '',
                  cidade: escolhido.cidade ?? '',
                  cep: escolhido.cep ?? '',
                  telefone: escolhido.telefone ?? '',
                  contato: escolhido.contato ?? '',
                },
              }
            : {})}
          aoSalvar={criar}
          aoCancelar={() => navegar('/orcamentos')}
        />
      </div>
    </div>
  );
}
