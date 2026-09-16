import { useEffect, useRef, useState } from 'react';
import { repositorio } from '../dados/repositorio';
import type { ConfiguracaoGuardada } from '../dados/configuracao';
import { baixarBackup, exportarBackup, importarBackup } from '../dados/backup';
import { useEditor } from '../estado/editor';
import { sair, useSessao } from '../dados/sessao';
import { lerCentavos } from '../domain/dinheiro';
import * as fmt from '../formato';

export function Configuracoes() {
  const [config, setConfig] = useState<ConfiguracaoGuardada | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const recarregarConfig = useEditor((e) => e.carregarConfig);
  const sessao = useSessao();

  useEffect(() => {
    void repositorio.lerConfiguracao().then(setConfig);
  }, []);

  if (!config) return <p className="vazio">Carregando…</p>;

  function alterar(patch: Partial<ConfiguracaoGuardada>) {
    setConfig((atual) => (atual ? { ...atual, ...patch } : atual));
  }

  function alterarEmpresa(patch: Partial<ConfiguracaoGuardada['empresa']>) {
    setConfig((atual) => (atual ? { ...atual, empresa: { ...atual.empresa, ...patch } } : atual));
  }

  async function gravar() {
    if (!config) return;
    await repositorio.gravarConfiguracao(config);
    await recarregarConfig();
    setAviso('Configurações salvas.');
    setErro(null);
  }

  return (
    <div className="pagina">
      <h1>Configurações</h1>

      {aviso && (
        <p
          className="painel"
          role="status"
          style={{ padding: 'var(--e-2) var(--e-3)', marginTop: 'var(--e-3)' }}
        >
          {aviso}
        </p>
      )}
      {erro && (
        <p className="faixa-erro" role="alert" style={{ marginTop: 'var(--e-3)' }}>
          {erro}
        </p>
      )}

      <section className="painel doc-bloco" style={{ marginTop: 'var(--e-4)' }}>
        <h2>Dados da empresa</h2>
        <p style={{ color: 'var(--cor-tinta-fraca)', fontSize: 'var(--txt-xs)' }}>
          Vieram da planilha de origem. Tudo aqui sai no PDF.
        </p>
        <div className="campos" style={{ marginTop: 'var(--e-3)' }}>
          <Texto
            rotulo="Razão social"
            valor={config.empresa.razaoSocial}
            ao={(v) => alterarEmpresa({ razaoSocial: v })}
          />
          <Texto
            rotulo="CNPJ"
            valor={config.empresa.cnpj}
            ao={(v) => alterarEmpresa({ cnpj: v })}
          />
          <Texto
            rotulo="Inscrição estadual"
            valor={config.empresa.inscricaoEstadual ?? ''}
            ao={(v) => alterarEmpresa({ inscricaoEstadual: v || undefined })}
          />
          <Texto
            rotulo="Endereço"
            valor={config.empresa.endereco}
            ao={(v) => alterarEmpresa({ endereco: v })}
          />
          <Texto
            rotulo="Bairro"
            valor={config.empresa.bairro}
            ao={(v) => alterarEmpresa({ bairro: v })}
          />
          <Texto
            rotulo="Cidade"
            valor={config.empresa.cidade}
            ao={(v) => alterarEmpresa({ cidade: v })}
          />
          <Texto
            rotulo="UF"
            valor={config.empresa.uf}
            ao={(v) => alterarEmpresa({ uf: v.toUpperCase().slice(0, 2) })}
          />
          <Texto rotulo="CEP" valor={config.empresa.cep} ao={(v) => alterarEmpresa({ cep: v })} />
          <Texto
            rotulo="E-mail"
            valor={config.empresa.email}
            ao={(v) => alterarEmpresa({ email: v })}
          />
          <Texto
            rotulo="Site"
            valor={config.empresa.site ?? ''}
            ao={(v) => alterarEmpresa({ site: v || undefined })}
          />
          <Texto
            rotulo="Telefones (separados por vírgula)"
            valor={config.empresa.telefones.join(', ')}
            ao={(v) =>
              alterarEmpresa({
                telefones: v
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          />
          <Texto
            rotulo="WhatsApp (separados por vírgula)"
            valor={config.empresa.whatsapp.join(', ')}
            ao={(v) =>
              alterarEmpresa({
                whatsapp: v
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      </section>

      <section className="painel doc-bloco" style={{ marginTop: 'var(--e-4)' }}>
        <h2>Padrões do orçamento</h2>
        <div className="campos" style={{ marginTop: 'var(--e-3)' }}>
          <label className="campo-envolve">
            <span className="rotulo">Próximo número de {config.anoNumeracao}</span>
            <input
              className="campo num"
              type="number"
              min={1}
              value={config.proximoNumero}
              onChange={(ev) => alterar({ proximoNumero: Math.max(1, Number(ev.target.value)) })}
            />
          </label>
          <label className="campo-envolve">
            <span className="rotulo">Entrada sugerida (%)</span>
            <input
              className="campo num"
              key={config.percentualEntradaPadrao}
              defaultValue={(config.percentualEntradaPadrao / 100).toFixed(2)}
              inputMode="decimal"
              onBlur={(ev) => {
                try {
                  alterar({
                    percentualEntradaPadrao: Math.max(0, lerCentavos(ev.target.value) ?? 0),
                  });
                } catch {
                  setErro('Percentual de entrada inválido.');
                }
              }}
            />
          </label>
          <label className="campo-envolve">
            <span className="rotulo">Validade padrão (dias)</span>
            <input
              className="campo num"
              type="number"
              min={0}
              value={config.validadePadraoDias ?? ''}
              onChange={(ev) =>
                alterar({
                  validadePadraoDias: ev.target.value === '' ? undefined : Number(ev.target.value),
                })
              }
            />
          </label>
          <Texto
            rotulo="Prazo de entrega padrão"
            valor={config.prazoEntregaPadrao ?? ''}
            ao={(v) => alterar({ prazoEntregaPadrao: v || undefined })}
          />
        </div>
        <Texto
          rotulo="Condições de pagamento padrão"
          valor={config.condicoesPagamentoPadrao}
          ao={(v) => alterar({ condicoesPagamentoPadrao: v })}
        />
        <label className="campo-envolve" style={{ marginTop: 'var(--e-3)' }}>
          <span className="rotulo">Aviso de reajuste (sai em vermelho no PDF)</span>
          <textarea
            className="campo campo--area"
            rows={2}
            value={config.avisoReajuste}
            onChange={(ev) => alterar({ avisoReajuste: ev.target.value })}
          />
        </label>
        <Texto
          rotulo="Unidades (separadas por vírgula)"
          valor={config.unidades.join(', ')}
          ao={(v) =>
            alterar({
              unidades: v
                .split(',')
                .map((u) => u.trim())
                .filter(Boolean),
            })
          }
        />
      </section>

      <div style={{ display: 'flex', gap: 'var(--e-2)', marginTop: 'var(--e-4)' }}>
        <button type="button" className="botao botao--primario" onClick={() => void gravar()}>
          Salvar configurações
        </button>
      </div>

      <section className="painel doc-bloco" style={{ marginTop: 'var(--e-5)' }}>
        <h2>Backup</h2>
        <p style={{ color: 'var(--cor-tinta-media)' }}>
          Os orçamentos ficam na nuvem da AA Montagens e aparecem em qualquer aparelho em que você
          entrar. O backup é uma cópia extra em arquivo — para guardar, ou para levar para outro
          sistema.
        </p>
        <div
          style={{ display: 'flex', gap: 'var(--e-2)', marginTop: 'var(--e-3)', flexWrap: 'wrap' }}
        >
          <button
            type="button"
            className="botao"
            onClick={() => {
              void (async () => {
                try {
                  baixarBackup(await exportarBackup());
                  setAviso(`Backup gerado em ${fmt.horario(new Date().toISOString())}.`);
                  setErro(null);
                } catch (e) {
                  setErro(e instanceof Error ? e.message : 'falha ao exportar');
                }
              })();
            }}
          >
            Exportar backup
          </button>
          <button type="button" className="botao" onClick={() => arquivo.current?.click()}>
            Importar backup
          </button>
          <input
            ref={arquivo}
            type="file"
            accept="application/json,.json"
            className="so-leitor"
            aria-label="Arquivo de backup para importar"
            // o botao visivel e quem dispara; tirar da ordem de tabulacao
            // evita um alvo de foco invisivel
            tabIndex={-1}
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              if (!f) return;
              void (async () => {
                try {
                  const r = await importarBackup(await f.text());
                  setAviso(
                    `Importado: ${r.orcamentos} orçamento(s), ${r.clientes} cliente(s), ${r.servicos} serviço(s).`,
                  );
                  setErro(null);
                  setConfig(await repositorio.lerConfiguracao());
                  await recarregarConfig();
                } catch (e) {
                  setErro(e instanceof Error ? e.message : 'falha ao importar');
                  setAviso(null);
                }
                ev.target.value = '';
              })();
            }}
          />
        </div>
      </section>

      <section className="painel doc-bloco" style={{ marginTop: 'var(--e-5)' }}>
        <h2>Conta</h2>
        <p style={{ color: 'var(--cor-tinta-media)' }}>
          {sessao.estado === 'dentro' ? (
            <>
              Você entrou como <strong>{sessao.email}</strong>.
            </>
          ) : (
            'Sessão encerrada.'
          )}
        </p>
        <div style={{ marginTop: 'var(--e-3)' }}>
          <button type="button" className="botao" onClick={() => void sair()}>
            Sair
          </button>
        </div>
      </section>
    </div>
  );
}

function Texto({ rotulo, valor, ao }: { rotulo: string; valor: string; ao: (v: string) => void }) {
  return (
    <label className="campo-envolve">
      <span className="rotulo">{rotulo}</span>
      <input className="campo" value={valor} onChange={(ev) => ao(ev.target.value)} />
    </label>
  );
}
