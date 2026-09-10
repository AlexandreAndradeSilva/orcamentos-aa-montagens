/**
 * Cadastro do cliente — os campos que o PDF imprime.
 *
 * Até aqui só dava para digitar o nome, e o PDF tinha oito campos que nunca
 * eram preenchidos. Este formulário fecha esse buraco.
 *
 * CNPJ tem botão de buscar na Receita; CPF não tem, e não é esquecimento:
 * não existe consulta pública de pessoa física por CPF (ver `dados/receita.ts`).
 */
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { Cliente } from '../domain/esquemas';
import {
  documentoValido,
  mascararCep,
  mascararDocumento,
  mascararTelefone,
  tipoDoDocumento,
} from '../domain/documentos';
import { consultarCep, consultarCnpj, MENSAGEM } from '../dados/receita';
import './formulario.css';

export type DadosCliente = Omit<Cliente, 'id' | 'criadoEm'>;

const VAZIO: DadosCliente = {
  nome: '',
  cnpjCpf: '',
  ieRg: '',
  endereco: '',
  cidade: '',
  cep: '',
  telefone: '',
  email: '',
  contato: '',
};

type Recado = { tom: 'ok' | 'erro'; texto: string } | null;

export function FormularioCliente({
  inicial,
  rotuloEnviar = 'Salvar cliente',
  aoSalvar,
  aoCancelar,
}: {
  inicial?: Partial<DadosCliente>;
  rotuloEnviar?: string;
  aoSalvar: (dados: DadosCliente) => void | Promise<void>;
  aoCancelar?: () => void;
}) {
  const { register, handleSubmit, setValue, getValues, control, formState } = useForm<DadosCliente>(
    {
      defaultValues: { ...VAZIO, ...inicial },
    },
  );
  const [buscando, setBuscando] = useState<'cnpj' | 'cep' | null>(null);
  const [recado, setRecado] = useState<Recado>(null);

  // `useWatch` e nao `watch`: e o hook de inscricao, e o unico que o React
  // Compiler consegue acompanhar.
  const documento = useWatch({ control, name: 'cnpjCpf' }) ?? '';
  const cep = useWatch({ control, name: 'cep' }) ?? '';
  const tipo = tipoDoDocumento(documento);

  /**
   * Só preenche campo vazio: não atropela o que já foi digitado.
   *
   * `getValues` e não `watch`: aqui é leitura pontual no momento do clique,
   * não uma inscrição em mudanças. `watch` dentro de função também impede o
   * React Compiler de memoizar o componente.
   */
  function preencherSeVazio(campo: keyof DadosCliente, valor: string) {
    if (valor === '') return;
    const atual = (getValues(campo) ?? '').toString().trim();
    if (atual === '') setValue(campo, valor, { shouldDirty: true });
  }

  async function buscarCnpj() {
    setBuscando('cnpj');
    setRecado(null);
    const r = await consultarCnpj(documento);
    setBuscando(null);

    if (!r.ok) {
      setRecado({ tom: 'erro', texto: MENSAGEM[r.motivo] });
      return;
    }

    const d = r.dados;
    // O nome fantasia é o que o cliente reconhece; a razão social é o que vale
    // no documento. Prefere a fantasia se houver, senão a razão social.
    preencherSeVazio('nome', d.nomeFantasia || d.razaoSocial);
    preencherSeVazio('endereco', d.endereco);
    preencherSeVazio('cidade', [d.cidade, d.uf].filter(Boolean).join('/'));
    preencherSeVazio('cep', mascararCep(d.cep));
    preencherSeVazio('telefone', mascararTelefone(d.telefone));
    preencherSeVazio('email', d.email);

    const alerta =
      d.situacao !== '' && d.situacao !== 'ATIVA' ? ` Atenção: situação ${d.situacao}.` : '';
    setRecado({
      tom: alerta === '' ? 'ok' : 'erro',
      texto: `${d.razaoSocial}${d.atividade === '' ? '' : ` — ${d.atividade}`}.${alerta}`,
    });
  }

  async function buscarCep() {
    setBuscando('cep');
    setRecado(null);
    const r = await consultarCep(cep);
    setBuscando(null);

    if (!r.ok) {
      setRecado({ tom: 'erro', texto: MENSAGEM[r.motivo] });
      return;
    }
    preencherSeVazio('endereco', r.dados.endereco);
    preencherSeVazio('cidade', [r.dados.cidade, r.dados.uf].filter(Boolean).join('/'));
    setRecado({ tom: 'ok', texto: `${r.dados.bairro} — ${r.dados.cidade}/${r.dados.uf}` });
  }

  return (
    <form
      className="formulario"
      onSubmit={(ev) => {
        void handleSubmit(async (dados) => {
          await aoSalvar({
            ...dados,
            nome: dados.nome.trim(),
          });
        })(ev);
      }}
    >
      <div className="campos">
        <label className="campo-envolve" style={{ gridColumn: '1 / -1' }}>
          <span className="rotulo">Cliente *</span>
          <input
            className="campo"
            autoFocus
            placeholder="ex.: Igreja Portal Pérola 2"
            aria-invalid={formState.errors.nome ? true : undefined}
            {...register('nome', {
              required: 'Informe o nome do cliente.',
              setValueAs: (v: string) => v,
            })}
          />
          {formState.errors.nome && (
            <span className="campo-erro" role="alert">
              {formState.errors.nome.message}
            </span>
          )}
        </label>

        <label className="campo-envolve">
          <span className="rotulo">CNPJ ou CPF</span>
          <span className="campo-com-botao">
            <input
              className="campo num"
              inputMode="numeric"
              placeholder="00.000.000/0000-00"
              aria-invalid={formState.errors.cnpjCpf ? true : undefined}
              {...register('cnpjCpf', {
                validate: (v) =>
                  documentoValido(v ?? '') || 'Número inválido — confira os dígitos.',
                onChange: (ev: { target: { value: string } }) =>
                  setValue('cnpjCpf', mascararDocumento(ev.target.value)),
              })}
            />
            <button
              type="button"
              className="botao"
              disabled={tipo !== 'cnpj' || buscando !== null}
              title={
                tipo === 'cnpj'
                  ? 'Buscar os dados na Receita'
                  : 'Disponível só para CNPJ — CPF não tem consulta pública'
              }
              onClick={() => void buscarCnpj()}
            >
              {buscando === 'cnpj' ? 'Buscando…' : 'Buscar'}
            </button>
          </span>
          {formState.errors.cnpjCpf ? (
            <span className="campo-erro" role="alert">
              {formState.errors.cnpjCpf.message}
            </span>
          ) : (
            <span className="campo-dica">
              {tipo === 'cpf'
                ? 'CPF não tem consulta pública — preencha os campos à mão.'
                : 'Com o CNPJ completo, dá para buscar na Receita.'}
            </span>
          )}
        </label>

        <label className="campo-envolve">
          <span className="rotulo">Inscrição estadual / RG</span>
          <input className="campo" {...register('ieRg')} />
        </label>

        <label className="campo-envolve">
          <span className="rotulo">CEP</span>
          <span className="campo-com-botao">
            <input
              className="campo num"
              inputMode="numeric"
              placeholder="00000-000"
              {...register('cep', {
                onChange: (ev: { target: { value: string } }) =>
                  setValue('cep', mascararCep(ev.target.value)),
              })}
            />
            <button
              type="button"
              className="botao"
              disabled={cep.replace(/\D/g, '').length !== 8 || buscando !== null}
              title="Buscar o endereço pelo CEP"
              onClick={() => void buscarCep()}
            >
              {buscando === 'cep' ? 'Buscando…' : 'Buscar'}
            </button>
          </span>
        </label>

        <label className="campo-envolve" style={{ gridColumn: '1 / -1' }}>
          <span className="rotulo">Endereço</span>
          <input className="campo" placeholder="rua, número" {...register('endereco')} />
        </label>

        <label className="campo-envolve">
          <span className="rotulo">Cidade / UF</span>
          <input className="campo" placeholder="Birigui/SP" {...register('cidade')} />
        </label>

        <label className="campo-envolve">
          <span className="rotulo">Telefone</span>
          <input
            className="campo num"
            inputMode="tel"
            placeholder="(00) 00000-0000"
            {...register('telefone', {
              onChange: (ev: { target: { value: string } }) =>
                setValue('telefone', mascararTelefone(ev.target.value)),
            })}
          />
        </label>

        <label className="campo-envolve">
          <span className="rotulo">E-mail</span>
          <input className="campo" type="email" {...register('email')} />
        </label>

        <label className="campo-envolve">
          <span className="rotulo">Pessoa de contato</span>
          <input className="campo" placeholder="quem atende" {...register('contato')} />
        </label>
      </div>

      {recado && (
        <p
          className={recado.tom === 'ok' ? 'recado recado--ok' : 'recado recado--erro'}
          role={recado.tom === 'erro' ? 'alert' : 'status'}
        >
          {recado.texto}
        </p>
      )}

      <div className="formulario__acoes">
        <button type="submit" className="botao botao--primario" disabled={formState.isSubmitting}>
          {formState.isSubmitting ? 'Salvando…' : rotuloEnviar}
        </button>
        {aoCancelar && (
          <button type="button" className="botao" onClick={aoCancelar}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
