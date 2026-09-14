/**
 * O bloco de totais, na ordem exata da planilha mais o desconto (D4).
 *
 * `aria-live` no total: quem edita a tabela precisa ouvir o total mudar sem
 * sair da celula.
 */
import { useEditor } from '../estado/editor';
import { lerCentavos } from '../domain/dinheiro';
import {
  avisosDosTotais,
  percentualDaEntrada,
  type AvisoTotais,
  type Totais,
} from '../domain/orcamento';
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

      {/* Desconto em reais, sem teto — confirmado. Valor acima do total não é
          truncado: aparece o aviso abaixo e a pessoa decide. */}
      <div className="totais__linha">
        <span className="totais__rotulo">Desconto</span>
        <input
          className="campo num totais__campo"
          key={orcamento.desconto}
          defaultValue={fmt.valor(orcamento.desconto)}
          inputMode="decimal"
          aria-label="Desconto em reais"
          onBlur={(ev) => {
            try {
              alterar({ desconto: Math.max(0, lerCentavos(ev.target.value) ?? 0) });
            } catch {
              alterar({ desconto: 0 });
            }
          }}
        />
      </div>

      <hr className="totais__regua totais__regua--forte" />
      <div className="totais__linha totais__linha--destaque">
        <span className="totais__rotulo">Total a pagar</span>
        <output className="totais__hero num" aria-live="polite">
          {fmt.valorComSimbolo(totais.subTotal)}
        </output>
      </div>

      {/* A entrada só informa: não abate do total (D5.1). Continua editável
          porque a sugestão de 30% nem sempre é o que foi combinado. */}
      <div className="totais__info" role="group" aria-label="Entrada, informativo">
        <hr className="totais__regua" />
        <div className="totais__linha">
          <span className="totais__rotulo">
            Entrada
            <span className="totais__nota">
              {entradaSugerida
                ? `sugerida ${fmt.percentual(config.percentualEntradaPadrao)}`
                : `${fmt.percentual(percentualDaEntrada(totais.entrada, totais.subTotal))} do total a pagar`}
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
                alterar({
                  entrada: { modo: 'manual', centavos: lerCentavos(ev.target.value) ?? 0 },
                });
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
            voltar para a sugestão de {fmt.percentual(config.percentualEntradaPadrao)}
          </button>
        )}

        <Linha rotulo="Restante após a entrada" valor={totais.restante} />
        <p className="totais__info-nota">
          A entrada é só informativa — não abate do total a pagar.
        </p>
      </div>

      <Avisos totais={totais} />
    </section>
  );
}

/**
 * Nada aqui bloqueia nem trunca: o desconto é sem teto, confirmado. O aviso
 * existe porque valor acima do total costuma ser dedo errado, e um total
 * negativo passando batido para o PDF seria pior.
 */
function Avisos({ totais }: { totais: Totais }) {
  const avisos = avisosDosTotais(totais);
  if (avisos.length === 0) return null;

  return (
    <ul className="totais__avisos" aria-live="polite">
      {avisos.map((aviso) => (
        <li key={aviso.tipo}>{textoDoAviso(aviso)}</li>
      ))}
    </ul>
  );
}

function textoDoAviso(aviso: AvisoTotais): string {
  switch (aviso.tipo) {
    case 'desconto-maior-que-total':
      return `O desconto (${fmt.valor(aviso.desconto)}) passa do total (${fmt.valor(aviso.total)}).`;
    case 'entrada-maior-que-subtotal':
      return `A entrada (${fmt.valor(aviso.entrada)}) passa do total a pagar (${fmt.valor(aviso.subTotal)}).`;
  }
}

function Linha({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="totais__linha">
      <span className="totais__rotulo">{rotulo}</span>
      <span className="num totais__valor">{fmt.valor(valor)}</span>
    </div>
  );
}
