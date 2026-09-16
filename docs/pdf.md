# Fase 5 — Exportação em PDF e WhatsApp

Entregável: [`exemplos/orcamento-001-2026-igreja-portal-perola-2.pdf`](../exemplos/orcamento-001-2026-igreja-portal-perola-2.pdf), gerado com os dados reais extraídos da planilha na Fase 4.

---

## 1. O que foi verificado, não suposto

| Exigência                   | Como conferi                                   | Resultado                         |
| --------------------------- | ---------------------------------------------- | --------------------------------- |
| Texto vetorial selecionável | extração com `pypdf`                           | ✅ todo o conteúdo sai como texto |
| Sem raster / `html2canvas`  | contagem de `/Subtype /Image`                  | **0 imagens** — a logo é vetor    |
| Fontes embutidas            | `/DescendantFonts[0]/FontDescriptor/FontFile2` | ✅ 3 subconjuntos                 |
| Arquivo leve                | `stat`                                         | **32,2 KB** numa página           |
| Cabeçalho repete na quebra  | render de 55 itens, texto página a página      | ✅ nas 3 páginas com itens        |
| "Página X de Y"             | idem                                           | ✅ correto nas 4 páginas          |
| Totais conferem             | comparação com a paridade da Fase 4            | ✅ R$ 25.600,00                   |

> Sobre fontes embutidas: a primeira conferência deu `embutida=False` e estava **errada** — em fonte `Type0` o `FontDescriptor` mora no _descendente_, não no objeto de topo. Corrigido o local, as três aparecem embutidas, e os prefixos de subconjunto (`CZZZZZ+`) confirmam.

## 2. Fontes

As mesmas duas famílias da interface, em **TTF estático servido pelo próprio app** (`public/fontes/`). Buscar no Google na hora de gerar quebraria o PDF offline — e este app é local-first.

Os arquivos vêm dos pacotes `@expo-google-fonts/*`, versionados no `package.json`, e `npm run fontes:copiar` os coloca em `public/fontes/`. Ambas SIL OFL.

**Um desvio que não deu certo:** primeiro tentei baixar direto do Google Fonts com User-Agent antigo, que devolve `/l/font?kit=...`. Os arquivos vieram com 54 KB e as tabelas `glyf`/`cmap` lá dentro, mas o cabeçalho não é sfnt válido (`44 d3 00 00` em vez de `00 01 00 00`) — é um empacotamento próprio do Google. Trocado por pacote npm, que é verificável e reprodutível.

Também registrei `Font.registerHyphenationCallback` desligando a hifenização: sem isso o react-pdf quebra palavra no meio de `TRAPEZIO`, e as descrições da AA Montagens são cheias de termos técnicos que não podem partir.

## 3. Layout

A4, margens de 36 pt nas laterais e no topo, 52 pt embaixo para o rodapé fixo.

- **Cabeçalho** — logo vetorial à esquerda (gerada de `logo-full.svg` por `tools/gerar_logo_pdf.py`, para não transcrever 489 nós à mão), dados da empresa no meio, e o **número num selo azul com borda**, no canto — é o que se procura numa pilha de papel.
- **Cliente e Datas lado a lado**, em caixas com borda fina.
- **Tabela de itens**: texto à esquerda, números à direita, seção com fundo cinza, e a linha de **preço fechado** com fundo azul-claro mostrando o valor do bloco em negrito.
- **Totais** na ordem da planilha mais o desconto (D4). Linhas de desconto e acréscimo **só aparecem quando não são zero** — documento limpo não mostra campo vazio.
- **TOTAL A PAGAR** numa faixa azul sólida com o valor em Barlow Condensed 19 pt: é o número que o cliente procura. É o sub-total (total menos desconto): a entrada **não abate** (D5.1).
- **Entrada e restante** vêm _depois_ da faixa, em tinta mais fraca — informam a condição de pagamento, não somam. Entrada zero não imprime as duas linhas.
- **Aceite** com duas assinaturas e campo de data.
- **Rodapé fixo** com os dois telefones, e-mail, cidade e "Página X de Y", e abaixo os créditos ("© ano AA MONTAGENS - FEITO POR RAAVON TECH", de `src/creditos.ts`, o mesmo texto do rodapé das telas). Cada peça é um elemento `fixed` próprio: um `View` fixo com `Text` dentro não aparecia no @react-pdf 4.9, e o número da página com `render` só fica no lugar ancorado pelo `top`.

### Cinco defeitos que só apareceram ao olhar o PDF renderizado

Compilar e passar em teste não mostra layout quebrado. Renderizei para PNG e olhei:

1. A logo **sobrepunha o CNPJ** — a coluna da empresa não tinha `flexBasis: 0`, então crescia por cima.
2. O endereço **invadia o selo** do número, pelo mesmo motivo.
3. O aviso vermelho de reajuste **colidia com a coluna de totais** — `colunaNotas` também sem base zero.
4. O valor de **"A PAGAR" ficava cortado** na base da faixa azul: faltava `lineHeight` no texto de 19 pt.
5. **`ENTRADA -0,00`** — sinal de menos num zero. O `Intl` formata `-0` como `-0,00`, e o total inverte o sinal da entrada. Corrigido em `formato.ts`, que agora normaliza zero negativo.

O quinto é o mais interessante: passava em todos os testes numéricos, porque `-0 === 0` é verdadeiro em JavaScript. Só a impressão denunciou.

## 4. Espaço não separável

`Intl.NumberFormat` com `style: 'currency'` põe **U+00A0** entre `R$` e o número, não espaço comum. Isso quebrou uma asserção minha antes de eu entender o motivo.

É o comportamento **desejável** — impede o valor de partir em duas linhas na mensagem do WhatsApp — então o código ficou como está e os testes passaram a afirmar o NBSP explicitamente, para ninguém "consertar" isso depois.

## 5. WhatsApp

`linkWhatsApp()` monta uma URL `wa.me` com o resumo pronto para colar:

```
*AA MONTAGENS* — Orçamento 001/2026
Cliente: Igreja Portal Pérola 2
Emissão: 14/08/2026

• (FACHADA ALTA) ESTRUTURA METALICA COM VIGA G CHAPA 14
• PERGOLADO GARAGEM COM DOBRAS EM CHAPA 16 (1,5MM)

*Total: R$ 25.600,00*
Entrada sugerida: R$ 7.680,00 · restante R$ 17.920,00
Pagamento: 30% ENTRADA, RESTANTE A COMBINAR
Prazo de entrega: 45 dias após aprovação
Validade: 15 dias

O orçamento detalhado vai em PDF.
```

Resumo, não a tabela inteira: no máximo 6 itens, descrição cortada em 70 caracteres. Quem quer detalhe abre o PDF, que vai anexo.

`paraWaMe()` normaliza o telefone: `(18) 99823-0660` vira `5518998230660`, sem duplicar o 55 se já vier com ele. Sem número, o link abre o seletor de contato do WhatsApp — que é o certo quando o cliente ainda não tem número gravado.

**Os dois números da AA Montagens são WhatsApp** (D7); o botão usa o primeiro por padrão.

## 6. Onde os botões estão

- **Tela do orçamento**: `Exportar PDF` e `Enviar no WhatsApp`, ao lado de Salvar.
- **Lista**: coluna com botão `PDF` por linha.

O módulo de PDF entra por **import dinâmico**. Sem isso o `@react-pdf` (1,2 MB) ia para o bundle principal e o app abria em 1,6 MB. Agora:

| Chunk                | Tamanho  | Gzip   | Quando carrega                         |
| -------------------- | -------- | ------ | -------------------------------------- |
| app                  | 393 kB   | 122 kB | sempre                                 |
| exportar (react-pdf) | 1.218 kB | 450 kB | ao clicar em exportar, e fica em cache |

O `chunkSizeWarningLimit` foi ajustado para 1300 com comentário explicando — o chunk grande é uma decisão consciente, não um descuido, e preferi documentar a esconder.

## 7. Nome do arquivo

`orcamento-001-2026-igreja-portal-perola-2.pdf` — número com a barra virando hífen, acento removido, minúsculo (D6). Com revisão: `orcamento-001-2026-r2-....pdf`.

## 8. Como regenerar

```bash
npm run fontes:copiar   # TTF dos pacotes npm para public/fontes
npm run casos:extrair   # fixture a partir do .xlsx
npm run pdf:exemplo     # gera exemplos/orcamento-001-2026-....pdf
```

## 9. Estado da suíte

```
Test Files  7 passed (7)
Tests      99 passed (99)
```

`tsc -b`, `eslint` e `npm run build` limpos, sem warning.

Os 19 testes novos desta fase: 6 sobre o PDF gerado de verdade (validade, ausência de raster, paginação, tamanho por página, nome do arquivo, bloco fechado) e 13 sobre o WhatsApp.

## 10. O que ainda falta

- ~~Anexar o PDF no WhatsApp automaticamente~~ — **resolvido no celular** com a Web Share API (`navigator.share` com arquivo): a folha nativa do aparelho leva PDF e texto ao WhatsApp. No computador continua impossível pelo `wa.me`; lá o app baixa o PDF e abre a conversa.
- **Logo em Configurações** — o PDF usa a logo vetorial fixa. Trocar a logo pela tela ainda não existe.
