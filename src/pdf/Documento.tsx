/**
 * O orçamento em PDF. Texto vetorial selecionável, sem raster.
 *
 * Layout desenhado a partir de `docs/direcao-visual.md` — não é o default do
 * @react-pdf. A ordem dos totais é a da planilha mais o desconto (D4).
 */
import { Document, Page, Text, View } from '@react-pdf/renderer';
import { LogoPdf } from './LogoPdf';
import { COLUNAS, COR, estilos } from './estilos';
import { DISPLAY } from './fontes';
import type { Configuracao, Orcamento, Secao } from '../domain/esquemas';
import {
  calcularTotais,
  numeroCompleto,
  numeroDaSecao,
  numeroDoItem,
  totalDaLinha,
  totalDaSecao,
} from '../domain/orcamento';
import * as fmt from '../formato';

export interface PropsDocumento {
  orcamento: Orcamento;
  configuracao: Configuracao;
  /** Dados completos do cliente, quando cadastrados. */
  cliente?: {
    cnpjCpf?: string | undefined;
    ieRg?: string | undefined;
    endereco?: string | undefined;
    cidade?: string | undefined;
    cep?: string | undefined;
    telefone?: string | undefined;
    email?: string | undefined;
    contato?: string | undefined;
  };
}

const VAZIO = '—';

export function DocumentoOrcamento({ orcamento, configuracao, cliente }: PropsDocumento) {
  const { empresa } = configuracao;
  const totais = calcularTotais(orcamento, {
    percentualEntradaPadrao: configuracao.percentualEntradaPadrao,
  });
  const numero = numeroCompleto(orcamento.numero, orcamento.revisao);

  return (
    <Document
      title={`Orçamento ${numero} — ${orcamento.clienteNome}`}
      author={empresa.razaoSocial}
      subject="Proposta de orçamento"
      creator={empresa.razaoSocial}
      producer={empresa.razaoSocial}
    >
      <Page size="A4" style={estilos.pagina}>
        <Cabecalho empresa={empresa} numero={numero} orcamento={orcamento} />

        <Text style={estilos.titulo}>PROPOSTA DE ORÇAMENTO</Text>

        <Blocos orcamento={orcamento} cliente={cliente} />

        <View style={estilos.tabela}>
          <CabecalhoTabela />
          {orcamento.secoes.map((secao, i) => (
            <BlocoSecao key={secao.id} secao={secao} indice={i} />
          ))}
        </View>

        <View style={estilos.faixaFinal} wrap={false}>
          <View style={estilos.colunaNotas}>
            <Text style={estilos.aviso}>{configuracao.avisoReajuste}</Text>

            <Text style={estilos.notaTitulo}>CONDIÇÕES DE PAGAMENTO</Text>
            <Text style={estilos.notaTexto}>{orcamento.condicoesPagamento || VAZIO}</Text>

            <Text style={estilos.notaTitulo}>PRAZO DE ENTREGA</Text>
            <Text style={estilos.notaTexto}>{orcamento.prazoEntrega || VAZIO}</Text>

            {orcamento.observacoes ? (
              <>
                <Text style={estilos.notaTitulo}>OBSERVAÇÕES</Text>
                <Text style={estilos.notaTexto}>{orcamento.observacoes}</Text>
              </>
            ) : null}
          </View>

          <View style={estilos.colunaTotais}>
            <Totais totais={totais} orcamento={orcamento} configuracao={configuracao} />
          </View>
        </View>

        <View style={estilos.aceite} wrap={false}>
          <View style={estilos.aceiteColuna}>
            <View style={estilos.aceiteRisco} />
            <Text style={estilos.aceiteRotulo}>{empresa.razaoSocial}</Text>
            <Text style={estilos.aceiteNota}>CNPJ {empresa.cnpj}</Text>
          </View>
          <View style={estilos.aceiteColuna}>
            <View style={estilos.aceiteRisco} />
            <Text style={estilos.aceiteRotulo}>CLIENTE</Text>
            <Text style={estilos.aceiteNota}>Aceite em ____ / ____ / ________</Text>
          </View>
        </View>

        <Rodape empresa={empresa} />
      </Page>
    </Document>
  );
}

// ------------------------------------------------------------------ partes

function Cabecalho({
  empresa,
  numero,
  orcamento,
}: {
  empresa: Configuracao['empresa'];
  numero: string;
  orcamento: Orcamento;
}) {
  const bairroCidade = `${empresa.bairro} — ${empresa.cidade}/${empresa.uf}  ·  CEP ${empresa.cep}`;

  return (
    <View style={estilos.cabecalho}>
      <View style={estilos.cabecalhoMarca}>
        <LogoPdf largura={132} />
      </View>

      <View style={estilos.cabecalhoEmpresa}>
        <Text style={estilos.empresaNome}>{empresa.razaoSocial}</Text>
        <Text style={estilos.empresaLinha}>CNPJ {empresa.cnpj}</Text>
        <Text style={estilos.empresaLinha}>{empresa.endereco}</Text>
        <Text style={estilos.empresaLinha}>{bairroCidade}</Text>
        <Text style={estilos.empresaLinha}>{empresa.telefones.join('  ·  ')}</Text>
        <Text style={estilos.empresaLinha}>{empresa.email}</Text>
      </View>

      <View style={estilos.selo}>
        <Text style={estilos.seloRotulo}>ORÇAMENTO Nº</Text>
        <Text style={estilos.seloNumero}>{numero}</Text>
        <Text style={estilos.seloData}>Emissão {fmt.data(orcamento.dataEmissao)}</Text>
        <Text style={estilos.seloData}>Validade {orcamento.validade || VAZIO}</Text>
      </View>
    </View>
  );
}

function Blocos({
  orcamento,
  cliente,
}: {
  orcamento: Orcamento;
  cliente: PropsDocumento['cliente'];
}) {
  return (
    <View style={estilos.faixaBlocos}>
      <View style={[estilos.bloco, { flexGrow: 1, flexShrink: 1 }]}>
        <Text style={estilos.blocoTitulo}>CLIENTE</Text>
        <Campo rotulo="Nome" valor={orcamento.clienteNome} />
        <Campo rotulo="CNPJ / CPF" valor={cliente?.cnpjCpf} />
        <Campo rotulo="I.E. / RG" valor={cliente?.ieRg} />
        <Campo rotulo="Endereço" valor={cliente?.endereco} />
        <Campo
          rotulo="Cidade / CEP"
          valor={[cliente?.cidade, cliente?.cep].filter(Boolean).join(' — ') || undefined}
        />
        <Campo rotulo="Fone" valor={cliente?.telefone} />
        <Campo rotulo="E-mail" valor={cliente?.email} />
        <Campo rotulo="Contato" valor={cliente?.contato} />
      </View>

      <View style={[estilos.bloco, { width: 168 }]}>
        <Text style={estilos.blocoTitulo}>DATAS</Text>
        <Campo rotulo="Emissão" valor={fmt.data(orcamento.dataEmissao)} />
        <Campo rotulo="Validade" valor={orcamento.validade} />
        <Campo rotulo="Prazo entrega" valor={orcamento.prazoEntrega} />
      </View>
    </View>
  );
}

function Campo({ rotulo, valor }: { rotulo: string; valor?: string | undefined }) {
  return (
    <View style={estilos.campoLinha}>
      <Text style={estilos.campoRotulo}>{rotulo}</Text>
      <Text style={estilos.campoValor}>{valor && valor.trim() !== '' ? valor : VAZIO}</Text>
    </View>
  );
}

/**
 * `fixed` repete o cabeçalho no topo de cada página, como pede o escopo — é o
 * que a planilha faz com Print_Titles nas linhas 1:16.
 */
function CabecalhoTabela() {
  return (
    <View style={estilos.cabecalhoTabela} fixed>
      <Text style={[estilos.th, { width: COLUNAS.item }]}>ITEM</Text>
      <Text style={[estilos.th, { width: COLUNAS.descricao }]}>DESCRIÇÃO DO SERVIÇO</Text>
      <Text style={[estilos.th, estilos.num, { width: COLUNAS.quantidade }]}>QUANT.</Text>
      <Text style={[estilos.th, estilos.centro, { width: COLUNAS.unidade }]}>UNID.</Text>
      <Text style={[estilos.th, estilos.num, { width: COLUNAS.valor }]}>VALOR</Text>
      <Text style={[estilos.th, estilos.num, { width: COLUNAS.total }]}>TOTAL</Text>
    </View>
  );
}

function BlocoSecao({ secao, indice }: { secao: Secao; indice: number }) {
  const fechado = secao.precoFechado !== undefined;

  return (
    <View>
      <View style={estilos.linhaSecao} wrap={false}>
        <Text style={[estilos.celItem, { width: COLUNAS.item, paddingLeft: 2 }]}>
          {numeroDaSecao(indice)}
        </Text>
        <Text style={[estilos.tituloSecao, { flexGrow: 1 }]}>{secao.titulo}</Text>
      </View>

      {secao.linhas.map((linha, j) => {
        const total = totalDaLinha(linha);
        return (
          <View key={linha.id} style={estilos.linhaItem} wrap={false}>
            <Text style={[estilos.celItem, { width: COLUNAS.item, paddingLeft: 2 }]}>
              {numeroDoItem(indice, j)}
            </Text>
            <Text style={[estilos.celDescricao, { width: COLUNAS.descricao, paddingRight: 6 }]}>
              {linha.descricao}
            </Text>
            <Text style={[estilos.num, { width: COLUNAS.quantidade }]}>
              {linha.quantidade === undefined ? VAZIO : fmt.quantia(linha.quantidade)}
            </Text>
            <Text style={[estilos.centro, { width: COLUNAS.unidade }]}>
              {linha.unidade ?? VAZIO}
            </Text>
            <Text style={[estilos.num, { width: COLUNAS.valor }]}>
              {fechado || linha.valorUnitario === undefined
                ? VAZIO
                : fmt.valor(linha.valorUnitario)}
            </Text>
            <Text style={[estilos.num, { width: COLUNAS.total }]}>
              {fechado || total === null ? VAZIO : fmt.valor(total)}
            </Text>
          </View>
        );
      })}

      {fechado && (
        <View style={estilos.linhaBloco} wrap={false}>
          <Text style={{ width: COLUNAS.item }} />
          <Text
            style={[
              estilos.notaBloco,
              { width: COLUNAS.descricao + COLUNAS.quantidade + COLUNAS.unidade },
            ]}
          >
            Preço fechado para os itens acima
          </Text>
          <Text style={[estilos.num, { width: COLUNAS.valor }]}>
            {fmt.valor(secao.precoFechado ?? 0)}
          </Text>
          <Text
            style={[
              estilos.num,
              { width: COLUNAS.total, fontFamily: DISPLAY, fontWeight: 700, fontSize: 10 },
            ]}
          >
            {fmt.valor(totalDaSecao(secao))}
          </Text>
        </View>
      )}
    </View>
  );
}

function Totais({
  totais,
  orcamento,
  configuracao,
}: {
  totais: ReturnType<typeof calcularTotais>;
  orcamento: Orcamento;
  configuracao: Configuracao;
}) {
  const temDesconto = totais.desconto !== 0;

  return (
    <View>
      <Linha rotulo="TOTAL DOS SERVIÇOS" valor={totais.totalDosServicos} />
      {totais.acrescimoNotaFiscal !== 0 && (
        <Linha rotulo="ACRÉSC. NOTA FISCAL" valor={totais.acrescimoNotaFiscal} />
      )}
      <View style={estilos.reguaFina} />
      <Linha rotulo="TOTAL" valor={totais.total} />
      {temDesconto && <Linha rotulo="DESCONTO" valor={-totais.desconto} />}
      {temDesconto && <View style={estilos.reguaFina} />}
      <Linha rotulo="SUB-TOTAL" valor={totais.subTotal} />
      <Linha
        rotulo={
          orcamento.entrada.modo === 'sugerida'
            ? `ENTRADA ${fmt.percentual(configuracao.percentualEntradaPadrao)}`
            : 'ENTRADA'
        }
        valor={-totais.entrada}
      />
      <View style={estilos.reguaForte} />
      <View style={estilos.aPagarCaixa}>
        <Text style={estilos.aPagarRotulo}>A PAGAR</Text>
        <Text style={estilos.aPagarValor}>{fmt.valorComSimbolo(totais.aPagar)}</Text>
      </View>
    </View>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <View style={estilos.totaisLinha}>
      <Text style={estilos.totaisRotulo}>{rotulo}</Text>
      <Text style={estilos.totaisValor}>
        {valor < 0 ? `− ${fmt.valor(-valor)}` : fmt.valor(valor)}
      </Text>
    </View>
  );
}

function Rodape({ empresa }: { empresa: Configuracao['empresa'] }) {
  const contato = [
    empresa.telefones.join('  ·  '),
    empresa.email,
    `${empresa.cidade}/${empresa.uf}`,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <View style={estilos.rodape} fixed>
      <Text style={estilos.rodapeTexto}>{contato}</Text>
      <Text
        style={estilos.rodapeTexto}
        render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
      />
    </View>
  );
}

export { COR };
