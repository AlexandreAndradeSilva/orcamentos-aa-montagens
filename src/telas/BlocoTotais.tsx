/**
 * O bloco de totais, na ordem exata da planilha mais o desconto (D4).
 *
 * `aria-live` no total: quem edita a tabela precisa ouvir o total mudar sem
 * sair da celula.
 */
import { useEditor } from '../estado/editor';
import { lerCentavos } from '../domain/dinheiro';
import { percentualDaEntrada } from '../domain/orcamento';
import * as fmt from '../formato';

export function BlocoTotais() {
  const orcamento = useEditor((e) => e.orcamento);
  const config = useEditor((e) => e.config);
  const alterar = useEditor((e) => e.alterar);
  const totais = useEditor((e) => e.totais)();

  if (!orcamento || !config || !totais) return null;

  const entradaSugerida = orcamento.entrada.modo === 'sugerida';

  return (
    <section className="painel totais" aria-label="Totais do orçamento">
      <Linha rotulo="Total dos serviços" valor={totais.totalDosServicos} />
      <Linha rotulo="Acréscimo nota fiscal" valor={totais.acrescimoNotaFiscal} />
      <hr className="totais__regua" />
      <Linha rotulo="Total" valor={totais.total} />

      <div className="totais__linha">
        <span className="totais__rotulo">
          Desconto
          <button
            type="button"
            className="botao botao--texto botao--mini totais__modo"
            onClick={() =>
              alterar({
                desconto:
                  orcamento.desconto.modo === 'reais'
                    ? { modo: 'percentual', percentual: 0 }
                    : { modo: 'reais', centavos: 0 },
              })
            }
          >
            {orcamento.desconto.modo === 'reais' ? 'em R$' : 'em %'}
          </button>
        </span>
        {orcamento.desconto.modo === 'reais' ? (
          <input
            className="campo num totais__campo"
            key={`r${orcamento.desconto.centavos}`}
            defaultValue={fmt.valor(orcamento.desconto.centavos)}
            inputMode="decimal"
            aria-label="Desconto em reais"
            onBlur={(ev) => {
              try {
                alterar({
                  desconto: { modo: 'reais', centavos: lerCentavos(ev.target.value) ?? 0 },
                });
              } catch {
                alterar({ desconto: { modo: 'reais', centavos: 0 } });
              }
            }}
          />
        ) : (
          <input
            className="campo num totais__campo"
            key={`p${orcamento.desconto.percentual}`}
            defaultValue={(orcamento.desconto.percentual / 100).toFixed(2)}
            inputMode="decimal"
            aria-label="Desconto em percentual"
            onBlur={(ev) => {
              try {
                const centesimos = lerCentavos(ev.target.value) ?? 0;
                alterar({ desconto: { modo: 'percentual', percentual: Math.max(0, centesimos) } });
              } catch {
                alterar({ desconto: { modo: 'percentual', percentual: 0 } });
              }
            }}
          />
        )}
      </div>

      <hr className="totais__regua" />
      <Linha rotulo="Sub-total" valor={totais.subTotal} />

      <div className="totais__linha">
        <span className="totais__rotulo">
          Entrada
          <span className="totais__nota">
            {entradaSugerida
              ? `sugerido ${fmt.percentual(config.percentualEntradaPadrao)}`
              : `${fmt.percentual(percentualDaEntrada(totais.entrada, totais.subTotal))} do sub-total`}
          </span>
        </span>
        <input
          className="campo num totais__campo"
          key={totais.entrada}
          defaultValue={fmt.valor(totais.entrada)}
          inputMode="decimal"
          aria-label="Entrada"
          onBlur={(ev) => {
            try {
              alterar({ entrada: { modo: 'manual', centavos: lerCentavos(ev.target.value) ?? 0 } });
            } catch {
              alterar({ entrada: { modo: 'manual', centavos: 0 } });
            }
          }}
        />
      </div>

      {!entradaSugerida && (
        <button
          type="button"
          className="botao botao--texto botao--mini"
          onClick={() => alterar({ entrada: { modo: 'sugerida' } })}
        >
          voltar para {fmt.percentual(config.percentualEntradaPadrao)} do sub-total
        </button>
      )}

      <hr className="totais__regua totais__regua--forte" />
      <div className="totais__linha totais__linha--destaque">
        <span className="totais__rotulo">A pagar</span>
        <output className="totais__hero num" aria-live="polite">
          {fmt.valorComSimbolo(totais.aPagar)}
        </output>
      </div>
    </section>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="totais__linha">
      <span className="totais__rotulo">{rotulo}</span>
      <span className="num totais__valor">{fmt.valor(valor)}</span>
    </div>
  );
}
