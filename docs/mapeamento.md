# Mapeamento da planilha de origem

**Arquivo:** `IGREJA SAO MIGUEL ARCANJO PORTA PEROLA 2.xlsx` (1,9 MB — 99% do peso é a logo embutida)
**Emitente (o cliente deste projeto):** AA MONTAGENS — CNPJ 66.612.836/0001-55
**Segmento inferido pelos itens:** serralheria / estruturas metálicas e montagem (fachadas em viga G, telha trapézio sanduíche, pergolados, dobras em chapa 14 e 16)

---

## 1. Procedência do arquivo (leia primeiro)

Os metadados mostram que **este .xlsx não é a planilha original da AA Montagens**:

| Propriedade | Valor |
|---|---|
| `dc:creator` | `openpyxl` (gerado por script Python, não pelo Excel) |
| Autor dos comentários de célula | `OpenAI` |
| Criado em | 2026-08-14 07:42 UTC |
| Última impressão | 2026-08-14 08:12 UTC |
| Modificado em | 2026-09-02 15:25 (por `Dell`) |
| Aba oculta | `COMO PREENCHER` — tutorial genérico, com passos de "Salvar como PDF" |

Ou seja: alguém já reconstruiu a planilha uma vez com apoio de IA. **As regras de negócio aqui podem ser uma reconstrução parcial das regras reais.** Isso está em `PERGUNTAS.md` como a pergunta nº 1.

---

## 2. Abas

| Aba | Estado | Intervalo | Conteúdo |
|---|---|---|---|
| `ORÇAMENTO` | visível | `A1:H38` | O orçamento inteiro — cabeçalho, cliente, itens, totais, assinaturas |
| `COMO PREENCHER` | **oculta** | `A1:A7` | 5 linhas de instruções de uso. Sem dados, sem fórmula |

Não existe aba de apoio: **sem catálogo de produtos, sem tabela de preços, sem lista de condições de pagamento, sem transportadoras, sem vendedores.**

## 3. Configurações de planilha

- Nomes definidos: `Print_Area = ORÇAMENTO!$A$1:$H$38`, `Print_Titles = ORÇAMENTO!$1:$16` (repete as 16 primeiras linhas em cada página impressa)
- Página: A4 retrato, escala 72%, margens 0,25" nos quatro lados
- Linhas de grade ocultas na visualização; painel congelado em `A12`
- 41 intervalos mesclados; **0 validações de dados**; **0 formatação condicional**; 0 gráficos; 1 imagem (a logo)
- Larguras: A=10,1 · B=43,0 · C=9,0 · D=padrão · E=13,0 · F=14,0 · G=12,0 · H=padrão

## 4. Estrutura do documento, bloco a bloco

### 4.1 Cabeçalho — linhas 1 a 7

| Célula | Conteúdo | Observação |
|---|---|---|
| `A1:B7` | logo (PNG 1024×1024, ancorada em A1, 1988820×1645920 EMU ≈ 5,3 × 4,4 cm) | fundo bege opaco, **sem transparência** |
| `C1:H1` | `AA MONTAGENS` | negrito 14 |
| `C2:H2` | `CNPJ: 66.612.836/0001-55` | negrito 10 |
| `C3:H3` | `RUA JOAO ANTONIO SANCHES, 1085` | |
| `C4:H4` | `JARDIM SÃO BRAZ - BIRIGUI/SP - CEP 16202-044` | |
| `C5:H5` | `TEL.: (18) 99823-0660  \|  (18) 99788-2819` | dois números, sem indicar qual é WhatsApp |
| `C6:H6` | `E-MAIL: aamonstagens@hotmail.com` | **provável erro de digitação** — "monstagens" |
| `C7:H7` | *(vazia)* | |
| `A8:H9` | `PROPOSTA DE ORÇAMENTO` | negrito 15, centralizado |

**Não existe número de orçamento em lugar nenhum do documento.**

### 4.2 Bloco do cliente — linhas 10 a 15

| Rótulo | Célula do rótulo | Célula do valor | Preenchido neste arquivo |
|---|---|---|---|
| `CLIENTE:` | A10 | `B10:D10` | `IGREJA PORTAL PEROLA 2` |
| `DATA:` | E10 | `F10:H10` | `2026-08-14` — máscara `mm-dd-yy` (**americana**) |
| `CNPJ/CPF:` | A11 | `B11:D11` | vazio |
| `I.E. / RG:` | E11 | `F11:H11` | vazio |
| `END.:` | A12 | `B12:H12` | vazio |
| `CIDADE:` | A13 | `B13:C13` | vazio |
| `CEP:` | D13 | `E13` | vazio |
| `FONE:` | F13 | `G13:H13` | vazio |
| `E-MAIL:` | A14 | `B14:H14` | vazio |
| `CONTATO:` | A15 | `B15:H15` | vazio |

Campos com valor preenchido usam fundo `#F7F7F7` (cinza claro) como marcação de "campo editável".

### 4.3 Tabela de itens — linhas 16 a 27

Cabeçalho na linha 16:

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| `ITEM` | `DESCRIÇÃO DO SERVIÇO` | `QUANT.` | `UNID.` | `VALOR` | `TOTAL` | — | — |

As colunas G e H **não fazem parte da tabela** (sem bordas). A tabela tem 6 colunas úteis.

Conteúdo real (o único orçamento preenchido do arquivo):

| Linha | ITEM | DESCRIÇÃO | QUANT. | UNID. | VALOR | TOTAL |
|---|---|---|---|---|---|---|
| 17 | `1` | **DOS SERVIÇOS A SEREM PRESTADOS** *(cabeçalho de seção, negrito)* | | | | |
| 18 | `1.1` | (FACHADA ALTA) ESTRUTURA METALICA COM VIGA G CHAPA 14 TELHA TRAPEZIO "SANDUICHE" DOBRAS CHAPA 14 (2mm) | 1 | UNID. | **25.600,00** | **25.600,00** |
| 19 | `1.2` | (FACHADA BAIXA) ESTRUTURA METALICA COM VIGA G CHAPA 14 TELHA TRAPEZIO "SANDUICHE" COM DOBRAS CHAPA 14 (2mm) | 1 | UNID. | ⟵ mesclada | ⟵ mesclada |
| 20 | `1.3` | PERGOLADO GARAGEM COM DOBRAS EM CHAPA 16 (1,5MM) | 1 | UNID. | ⟵ mesclada | ⟵ mesclada |
| 21 | `1.4` | PERGOLADO PISCINA TUBOS 100X350 CHAPA 14 (2MM) E TUBO 100X180 CHAPA 16 (1,5MM) | 1 | UNID. | ⟵ mesclada | ⟵ mesclada |
| 22 | | *(linha vazia — ver anomalia A3)* | | | | |
| 23 | `2` | **DAS OBSERVAÇÕES** *(cabeçalho de seção, negrito)* | | | | |
| 24 | `2.1` | INCLUSOS MATERIAL E MÃO DE OBRA | | | | |
| 25 | `2.2` | COND. PAGTº: 30% ENTRADA, RESTANTE A COMBINAR | | | | |
| 26–27 | | *(vazias)* | | | | |

**Achado estrutural mais importante:** `E18:E21` e `F18:F21` estão **mescladas**. Os quatro subitens 1.1 a 1.4 **compartilham um único preço de R$ 25.600,00** — é preço de pacote, não quatro preços somados. Uma tabela de itens comum (um preço por linha) **não reproduz este orçamento**.

**Segundo achado:** a seção "2 — DAS OBSERVAÇÕES" está fisicamente **dentro** da tabela de itens, ocupando linhas que a fórmula de soma cobre. Observação e item compartilham a mesma grade.

### 4.4 Totais — linhas 28 a 35

| Célula | Rótulo | Fórmula / valor | Resultado |
|---|---|---|---|
| `A28:E28` | `TOTAL DOS SERVIÇOS` (alinhado à direita) | — | |
| `F28` | | `=SUM(F18:F27)` | 25.600,00 |
| `A29:F29` | `*O MERCADO PODE SOFRER REAJUSTES DE PREÇOS. O ORÇAMENTO ESTÁ SUJEITO A ALTERAÇÃO DE VALORES.` | texto fixo, negrito 8, **vermelho `#FF0000`** | |
| `A31:F31` | `OBRIGADO PELA PREFERÊNCIA !!!` | texto fixo | |
| `A32:D32` | `VALIDADE DO ORÇAMENTO:` | **valor não preenchido** | |
| `E32` / `F32` | `TOTAL` | `=F28` | 25.600,00 |
| `A33:D33` | `PRAZO DE ENTREGA:` | **valor não preenchido** | |
| `E33` / `F33` | `ACRESC. NOTA FISCAL` | **digitado à mão** | 0 |
| `A34:D34` | *(vazia)* | | |
| `E34` / `F34` | `SUB-TOTAL` | `=F32+F33` | 25.600,00 |
| `A35:D35` | `COND. PAGTº: 30% ENTRADA, RESTANTE A COMBINAR` | texto fixo (repete B25) | |
| `E35` / `F35` | `ENTRADA` | **digitado à mão** | 0 |
| `G35` / `H35` | `A PAGAR` | `=F34-F35` | 25.600,00 |

O bloco de totais (E32:H35) usa fundo **amarelo `#FFF200`** nos rótulos e nos resultados calculados; os campos digitáveis (F33, F35) ficam em cinza `#F7F7F7`.

### 4.5 Assinaturas — linhas 37 a 38

| `A37:C37` | `__________________________________` | `A38:B38` | `AA MONTAGENS` |
| `E37:H37` | `__________________________________` | `E38:G38` | `CLIENTE` |

### 4.6 Comentários de célula (autor: `OpenAI`)

`B10` "Digite o nome do cliente." · `F10` "Digite a data do orçamento." · `B18` "Digite o item e a descrição do serviço." · `C18` "Quantidade." · `D18` "Unidade (UND, M, M² etc.)." · `E18` "Valor unitário. O total é calculado automaticamente."

O comentário de `D18` é a única fonte de unidades do arquivo, e é **exemplificativa**, não uma lista fechada.

## 5. Formatos

- Valores monetários: `#,##0.00` — **sem símbolo `R$`** em nenhuma célula
- Data: `mm-dd-yy` (americana) sobre um valor `datetime(2026, 8, 14)`
- Fonte: Calibri (tema padrão), tamanhos 8 / 9 / 10 / 11 / 14 / 15
- Nenhuma função `ROUND`/`ARRED` no arquivo → o Excel calcula em ponto flutuante e apenas **exibe** 2 casas

## 6. Logo extraída

`xl/media/image1.png` → `assets/origem/logo-original-1024.png`

- 1024 × 1024, RGBA, **0% de pixels transparentes** (fundo bege chapado `#E8E4DF`)
- Área de tinta real: 858 × 566 px, iniciando em (90, 188)
- Marca: monograma "AA" em azul-aço com silhueta preta de soldador (máscara, tocha e estouro de faísca) sobre o segundo "A"; abaixo, o logotipo "AA MONTAGENS" — "AA" azul, "MONTAGENS" preto
- Cores amostradas do raster:

| Cor | HEX | Papel na arte |
|---|---|---|
| Azul-aço | `#135885` | monograma "AA" e a palavra "AA" do logotipo |
| Preto quente | `#1C1A17` | soldador, faíscas e a palavra "MONTAGENS" |
| Bege osso | `#E8E4DF` | fundo chapado da imagem |

Resolução e contraste são **suficientes para vetorizar** (Fase 1). Há textura sutil de papel no raster — será descartada na revetorização.

---

## 7. Anomalias encontradas (nenhuma foi "corrigida" por conta própria)

| # | Onde | O quê |
|---|---|---|
| **A1** | `E18:E21` / `F18:F21` | Preço e total mesclados sobre 4 subitens → preço de pacote, não preço unitário. Quantidade e unidade continuam por linha (1 UNID. cada), mas não multiplicam nada. |
| **A2** | `F19`, `F20`, `F21` | Não existem (consumidas pela mesclagem). Só existem `F18` e `F23:F27`. |
| **A3** | `A22` | A fórmula `=IF(OR(C22="";E22="");"";C22*E22)` está na coluna **A**, não na F. Confirmado no `calcChain.xml`. `F22` não existe → a linha 22 nunca soma, mesmo se preenchida. **É um defeito da planilha.** |
| **A4** | `F23`, `F24`, `F25` | As linhas de *observação* (seção 2) carregam fórmula de total de item. Se alguém digitar quantidade e valor numa observação, ela entra na soma. |
| **A5** | `B25` e `A35` | A condição de pagamento aparece duas vezes, com texto idêntico e sem vínculo — editar uma não atualiza a outra. |
| **A6** | `F33` (ACRÉSC. NOTA FISCAL) | Valor digitado à mão, sem fórmula e sem percentual. Não há como deduzir a regra do arquivo. |
| **A7** | `F35` (ENTRADA) | Vale 0, mas a condição de pagamento diz "30% ENTRADA". Os dois se contradizem neste orçamento. |
| **A8** | `A32` / `A33` | `VALIDADE DO ORÇAMENTO` e `PRAZO DE ENTREGA` estão em branco no único orçamento existente. Não há padrão a inferir. |
| **A9** | `F10` | Data com máscara americana. `14/08/2026` é exibido como `08-14-26`. |
| **A10** | documento inteiro | Sem número de orçamento, sem vendedor, sem status, sem histórico. |
| **A11** | `C6` | `aamonstagens@hotmail.com` — grafia inconsistente com "AA MONTAGENS". |

---

## 8. Modelo de domínio proposto

O modelo abaixo **cobre o que a planilha faz hoje** e marca com ⚠️ tudo que depende de uma resposta em `PERGUNTAS.md`. Onde a planilha não define regra, o campo fica anotado como pendente — nada foi inventado.

```ts
// Dinheiro sempre em centavos (inteiro). Nunca float.
type Centavos = number;

interface Empresa {              // Configurações → dados fixos do emitente
  razaoSocial: string;           // "AA MONTAGENS"
  cnpj: string;                  // "66.612.836/0001-55"
  inscricaoEstadual?: string;    // ⚠️ P12 — não consta na planilha
  endereco: string;              // "RUA JOAO ANTONIO SANCHES, 1085"
  bairro: string;                // "JARDIM SÃO BRAZ"
  cidade: string; uf: string;    // "BIRIGUI" / "SP"
  cep: string;                   // "16202-044"
  telefones: string[];           // ["(18) 99823-0660", "(18) 99788-2819"]
  whatsapp?: string;             // ⚠️ P11 — qual dos dois
  email: string;                 // ⚠️ P11 — confirmar grafia
  logoUrl: string;
}

interface Cliente {              // Espelha o bloco de linhas 10–15
  id: string;
  nome: string;                  // CLIENTE
  cnpjCpf?: string;              // CNPJ/CPF
  ieRg?: string;                 // I.E. / RG
  endereco?: string;             // END.
  cidade?: string; cep?: string; // CIDADE / CEP
  telefone?: string;             // FONE
  email?: string;                // E-MAIL
  contato?: string;              // CONTATO — pessoa de contato
  criadoEm: string;
}

// A planilha agrupa itens em SEÇÕES numeradas ("1 DOS SERVIÇOS...", "2 DAS OBSERVAÇÕES")
// e numera cada linha como "<seção>.<n>". O agrupamento é parte do documento, não enfeite.
interface Secao {
  id: string;
  numero: number;                // 1, 2, ...
  titulo: string;                // "DOS SERVIÇOS A SEREM PRESTADOS"
  linhas: Linha[];
  // ⚠️ P5: uma seção pode ter preço de pacote (o caso 1.1–1.4 = R$ 25.600 no bloco).
  precoPacote?: Centavos;        // quando definido, ignora o preço das linhas
}

interface Linha {
  id: string;
  numero: string;                // "1.1" — derivado de seção + posição
  descricao: string;             // DESCRIÇÃO DO SERVIÇO — texto livre e longo
  quantidade?: number;           // QUANT. — decimal (⚠️ P7: casas)
  unidade?: string;              // UNID. — ⚠️ P8: lista fechada ou livre
  valorUnitario?: Centavos;      // VALOR
  // total = quantidade * valorUnitario; vazio se qualquer um faltar (regra da planilha)
  // linhas sem quantidade/valor são observações — a planilha usa a mesma grade
}

interface Orcamento {
  id: string;
  numero: string;                // ⚠️ P4 — NÃO EXISTE na planilha
  revisao?: string;              // "-R1" — pedido do escopo, sem origem na planilha
  clienteId: string;
  vendedor?: string;             // ⚠️ P13 — não existe na planilha
  dataEmissao: string;           // DATA (F10)
  validade?: string;             // ⚠️ P6 — rótulo existe, valor em branco
  prazoEntrega?: string;         // ⚠️ P6 — rótulo existe, valor em branco
  secoes: Secao[];
  acrescimoNotaFiscal: Centavos; // F33 — ⚠️ P2: valor fixo ou % ?
  entrada: Centavos;             // F35 — ⚠️ P3: valor fixo ou 30% ?
  condicoesPagamento: string;    // "30% ENTRADA, RESTANTE A COMBINAR"
  avisoReajuste: string;         // texto vermelho fixo da linha 29
  observacoes?: string;          // ⚠️ P9 — hoje vive dentro da tabela
  status: 'rascunho'|'enviado'|'aprovado'|'perdido'; // ⚠️ P14 — não existe na planilha
  historico: Alteracao[];
  // Campos do escopo que NÃO existem na planilha: desconto, frete. ⚠️ P10
}
```

### Totais (exatamente o encadeamento da planilha)

```
totalDosServicos = Σ totais das linhas          // F28 = SUM(F18:F27)
total            = totalDosServicos             // F32 = F28
subTotal         = total + acrescimoNotaFiscal  // F34 = F32 + F33
aPagar           = subTotal - entrada           // H35 = F34 - F35
```

Não há desconto nem frete nessa cadeia. Ver `regras-de-negocio.md` para o detalhamento e `PERGUNTAS.md` antes de codificar qualquer arredondamento.
