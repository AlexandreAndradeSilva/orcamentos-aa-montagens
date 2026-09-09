# Fase 2 — Direção visual

Referência de linguagem: um bom ERP, o Linear, uma planilha bem feita. **Não** uma landing page de SaaS.
Quem usa isso abre o app de manhã, digita orçamento e fecha. A tela tem que ser densa, previsível e rápida no teclado.

---

## 1. Paleta

Três cores vêm da marca (medidas no raster, ver `logo.md`), dois neutros derivam do bege da arte, uma cor de alerta. Nada mais. Cada tom abaixo é um passo de luminosidade dessas mesmas matizes — não há matiz nova entrando pela porta dos fundos.

### Da marca

| Token               | HEX       | Função                                                                                                                |
| ------------------- | --------- | --------------------------------------------------------------------------------------------------------------------- |
| `--cor-acao`        | `#135885` | **Primário.** Botão de ação, anel de foco, linha selecionada, valor em destaque. É o azul-aço da logo, sem alteração. |
| `--cor-acao-forte`  | `#0D4166` | Hover e estado pressionado do primário.                                                                               |
| `--cor-acao-fraca`  | `#E4EDF4` | Fundo da linha/célula selecionada.                                                                                    |
| `--cor-tinta`       | `#1C1A17` | Texto principal. É o preto quente da logo.                                                                            |
| `--cor-tinta-media` | `#57514A` | Texto secundário, valores desativados.                                                                                |
| `--cor-tinta-fraca` | `#736B63` | Rótulos de campo, placeholder, unidades.                                                                              |

### Neutros (derivados do bege osso `#E8E4DF`)

| Token               | HEX       | Função                                                           |
| ------------------- | --------- | ---------------------------------------------------------------- |
| `--cor-papel`       | `#FCFBF9` | Superfície de trabalho: a tabela, os cartões, os campos.         |
| `--cor-fundo`       | `#F1EEE9` | O fundo atrás da superfície. Dá o degrau sem precisar de sombra. |
| `--cor-linha-sutil` | `#E2DCD3` | Grade interna da tabela. Estrutural.                             |
| `--cor-linha`       | `#948B81` | Borda de campo editável, borda no hover.                         |
| `--cor-linha-forte` | `#8E877D` | Divisores estruturais, régua sob o cabeçalho da tabela.          |

O bege chapado do PNG **não** virou cor de marca — era papel simulado dentro da imagem. Virou a origem dos neutros, que é o papel dele.

### Alerta

| Token                | HEX       | Função                                                                                                                          |
| -------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `--cor-alerta`       | `#A33520` | Vermelho-óxido. Ação destrutiva, erro de validação, status `perdido`, e o aviso de reajuste que a planilha já traz em vermelho. |
| `--cor-alerta-fraca` | `#F7E7E2` | Fundo de faixa de erro.                                                                                                         |

### O amarelo que ficou de fora

A planilha marca o bloco de totais com amarelo `#FFF200`. É uma convenção real da casa, e considerei mantê-la. Ficou de fora por dois motivos: naquela saturação, texto em cima não passa em contraste nenhum; e a hierarquia do total pode ser carregada por **tipografia e régua**, que é mais forte e não custa uma matiz nova. Se a Roberta sentir falta do amarelo, é uma linha de CSS — mas eu não começaria por ele.

### Status, sem badge colorida

Nada de pílula colorida. Um marcador quadrado de 8 px + o rótulo em texto. A progressão é codificada por **preenchimento**, não por matiz nova:

| Status     | Marcador   | Cor                 |
| ---------- | ---------- | ------------------- |
| `rascunho` | contorno   | `--cor-tinta-fraca` |
| `enviado`  | contorno   | `--cor-acao`        |
| `aprovado` | preenchido | `--cor-acao`        |
| `perdido`  | contorno   | `--cor-alerta`      |

> Pendente: `P12` ainda não foi respondida — se a AA Montagens não for usar status, isso sai inteiro e a lista fica só com busca e período.

### Contraste — medido, não estimado

| Par                                                | Razão   | Nível          |
| -------------------------------------------------- | ------- | -------------- |
| tinta sobre papel — texto da tabela                | 16,79:1 | AAA            |
| tinta-media sobre papel — texto secundário         | 7,57:1  | AAA            |
| tinta-fraca sobre papel — rótulo                   | 5,06:1  | AA             |
| tinta-fraca sobre fundo — rótulo                   | 4,52:1  | AA             |
| ação sobre papel — valor em destaque, anel de foco | 7,35:1  | AAA            |
| branco sobre ação — botão primário                 | 7,60:1  | AAA            |
| tinta sobre ação-fraca — célula selecionada        | 14,65:1 | AAA            |
| alerta sobre papel — aviso e erro                  | 6,58:1  | AA             |
| branco sobre alerta — botão destrutivo             | 6,80:1  | AA             |
| linha sobre papel — borda de campo                 | 3,24:1  | AA (não-texto) |
| linha-forte sobre papel — divisor                  | 3,43:1  | AA (não-texto) |

Nenhuma reprovação. Dois tons foram **ajustados durante a fase** justamente porque reprovaram na primeira medição: `--cor-tinta-fraca` saiu de `#857D73` (3,92:1 — falha) para `#736B63`, e as bordas saíram de `#DBD5CC` (1,41:1) para os tons atuais.

Uma restrição de uso a respeitar: `--cor-tinta-fraca` sobre `--cor-acao-fraca` dá 4,42:1 e fica logo abaixo do alvo. **Em linha selecionada, rótulo usa `--cor-tinta-media`.**

A grade interna (`--cor-linha-sutil`, 1,32:1) é deliberadamente clara: ela é estrutura, não é o que indica que a célula é editável. Quem indica isso é o hover (borda `--cor-linha`, 3,24:1) e o foco (anel `--cor-acao`, 7,35:1) — os dois acima de 3:1.

---

## 2. Tipografia

Duas famílias, com contraste real de largura e de textura. Ambas SIL OFL, com TTF estático — requisito para `Font.register` do `@react-pdf/renderer` na Fase 5.

### Display — **Barlow Condensed**

Condensada, grotesca, de origem em sinalização viária. Escolhida por três motivos concretos:

1. **Ecoa o logotipo.** "AA MONTAGENS" é uma grotesca condensada bold; o cabeçalho do app passa a falar a mesma língua da marca sem precisar repetir a logo em tudo.
2. **Ganha densidade.** Condensada cabe título e número grande sem roubar largura da coluna de descrição, que é a coluna que manda nesta tela.
3. **Tem faixa de peso larga** (100–900), então o "A PAGAR" consegue peso de verdade sem virar outra fonte.

Usada em: título de página, número do orçamento, cabeçalho de coluna, título de seção da tabela, bloco de totais.

### Texto — **IBM Plex Sans**

Desenhada para contexto técnico e de engenharia, com **algarismos tabulares de fato** (`tnum`). Tem detalhe humanista suficiente (o `a`, o `g`, os terminais angulados) para não se confundir com a display, e não é Inter — nem parece.

Usada em: tudo o mais. Células da tabela, formulários, botões, rótulos, observações, listas.

**Os algarismos da tabela são dela**, sempre com `font-variant-numeric: tabular-nums`. Quantidade, valor unitário e total têm que alinhar coluna abaixo; é o que faz a tabela ser lida como planilha e não como formulário.

> **Verificado na Fase 3** (inspeção das tabelas `GSUB`/`hmtx` das duas fontes):
>
> | Fonte            | Larguras dos dígitos                                   | `tnum`       | Conclusão                              |
> | ---------------- | ------------------------------------------------------ | ------------ | -------------------------------------- |
> | IBM Plex Sans    | todas 600 — **tabular por padrão**                     | ausente      | não precisa da feature; alinha sozinha |
> | Barlow Condensed | 9 larguras distintas (`1`=284, `4`=484) — proporcional | **presente** | `tabular-nums` é **obrigatório**       |
>
> Ou seja, o oposto do que o nome das features sugeria: a Plex não expõe `tnum` justamente porque já é tabular, e a Barlow só alinha com a feature ligada. As duas servem, e o CSS aplica `font-variant-numeric: tabular-nums` em `.num` e no total em destaque. O bloco de totais **fica na Barlow Condensed**, como desenhado.

### Escala

Base **14px**, não 16 — é ferramenta de trabalho densa. Entrelinhas caem em múltiplos de 4px.

```css
/* texto — IBM Plex Sans */
--txt-2xs: 11px/16px; /* unidade, legenda de tabela */
--txt-xs: 12px/16px; /* rótulo de campo, texto de ajuda */
--txt-sm: 13px/20px; /* célula secundária */
--txt-md: 14px/20px; /* BASE: célula, formulário, botão */
--txt-lg: 16px/24px; /* nome do cliente */

/* display — Barlow Condensed */
--dsp-xs: 14px/16px; /* cabeçalho de coluna, versalete + tracking .06em */
--dsp-sm: 18px/20px; /* título de seção da tabela */
--dsp-md: 24px/28px; /* título de página */
--dsp-lg: 32px/36px; /* número do orçamento */
--dsp-xl: 44px/44px; /* A PAGAR */
```

Pesos: texto 400 / 500 / 600. Display 500 / 600 / 700.

---

## 3. Grade, espaço e forma

```css
--e-1: 4px;
--e-2: 8px;
--e-3: 12px;
--e-4: 16px;
--e-5: 24px;
--e-6: 32px;
--e-7: 48px;
--e-8: 64px;

--linha-altura-min: 32px; /* 8 × 4 */
--celula-pad-x: 8px;
--celula-pad-y: 6px;
--barra-altura: 48px;

--raio: 3px; /* campo, botão */
--raio-lg: 4px; /* cartão, menu */
--borda: 1px;
```

**Raio pequeno de propósito.** Nada de `rounded-2xl`. Ferramenta de precisão tem canto quase reto.

**Uma sombra só**, e só para o que flutua (menu, popover): `0 2px 8px rgba(28,26,23,.14)`, sempre acompanhada de borda de 1px. Cartão e tabela não têm sombra — a separação vem do degrau `--cor-fundo` → `--cor-papel` e de uma borda.

**Ícones:** traço de 1,5px, 16px, apenas em controle acionável. Nav é texto puro. Zero emoji.

### A coluna que manda

Uma decisão que vem do dado, não do gosto: na planilha a coluna B tem 43 caracteres de largura contra 9–14 das outras, e as linhas de item têm 44 a 63px de altura — ou seja, **2 a 3 linhas de texto**. As descrições reais são longas:

> `(FACHADA ALTA) ESTRUTURA METALICA COM VIGA G CHAPA 14 TELHA TRAPEZIO "SANDUICHE" DOBRAS CHAPA 14 (2mm)`

Então: a descrição fica com ~50% da largura, quebra em várias linhas, e **a altura da linha cresce**. `--linha-altura-min: 32px` é piso, não altura fixa. Um layout que force descrição em uma linha só não serve para esta empresa.

---

## 4. A tela de orçamento

Largura total para a tabela — por isso barra superior, não barra lateral.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ◤◣  Orçamentos   Clientes   Serviços   Configurações                                    Roberta ▾ │ 48px
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                                   │
│  ORÇAMENTO 001/2026                            ▣ aprovado ▾    Duplicar   Revisar   Exportar PDF  │
│  Igreja Portal Pérola 2                                                        Enviar no WhatsApp │
│                                                                          salvo às 14:32           │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│  CLIENTE                                    CNPJ / CPF          I.E. / RG        EMISSÃO          │
│  Igreja Portal Pérola 2                     ——                  ——               14/08/2026       │
│  ENDEREÇO                        CIDADE           CEP           FONE             VALIDADE         │
│  ——                              ——               ——            ——               ——               │
│  E-MAIL                          CONTATO                                         PRAZO DE ENTREGA │
│  ——                              ——                                              ——               │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ITEM  DESCRIÇÃO DO SERVIÇO                                  QUANT.  UNID.      VALOR       TOTAL  │ ← --dsp-xs
├───────────────────────────────────────────────────────────────────────────────────────────────────
│ 1     DOS SERVIÇOS A SEREM PRESTADOS                                                              │ ← seção
├───────────────────────────────────────────────────────────────────────────────────────────────────
│ 1.1   (Fachada alta) estrutura metálica com viga G chapa 14,      1  UNID. ╭─────────────────────╮ │
│       telha trapézio "sanduíche", dobras chapa 14 (2 mm)                   │                     │ │
│ 1.2   (Fachada baixa) estrutura metálica com viga G chapa 14,     1  UNID. │ preço fechado       │ │
│       telha trapézio "sanduíche", com dobras chapa 14 (2 mm)               │  do bloco           │ │
│ 1.3   Pergolado garagem com dobras em chapa 16 (1,5 mm)           1  UNID. │ 25.600,00 25.600,00 │ │
│ 1.4   Pergolado piscina tubos 100×350 chapa 14 (2 mm) e tubo      1  UNID. │                     │ │
│       100×180 chapa 16 (1,5 mm)                                            ╰─────────────────────╯ │
├───────────────────────────────────────────────────────────────────────────────────────────────────
│ 2     DAS OBSERVAÇÕES                                                                             │
├───────────────────────────────────────────────────────────────────────────────────────────────────
│ 2.1   Inclusos material e mão de obra                             ——   ——        ——          ——   │
│ 2.2   Cond. pagto: 30% entrada, restante a combinar               ——   ——        ——          ——   │
├───────────────────────────────────────────────────────────────────────────────────────────────────
│ +  Nova linha            + Nova seção            + Bloco com preço fechado                        │
├──────────────────────────────────────────────────┬────────────────────────────────────────────────┤
│                                                  │  TOTAL DOS SERVIÇOS               25.600,00    │
│  * O mercado pode sofrer reajustes de preços.    │  ACRÉSC. NOTA FISCAL                   0,00    │
│    O orçamento está sujeito a alteração de       │  ────────────────────────────────────────────  │
│    valores.                          ← alerta    │  TOTAL                            25.600,00    │
│                                                  │  DESCONTO                              0,00    │
│  COND. PAGTO                                     │  ────────────────────────────────────────────  │
│  30% entrada, restante a combinar                │  SUB-TOTAL                        25.600,00    │
│                                                  │  ENTRADA          sugerido 30%     7.680,00    │
│                                                  │  ════════════════════════════════════════════  │
│                                                  │  A PAGAR                     17.920,00         │ ← --dsp-xl
└──────────────────────────────────────────────────┴────────────────────────────────────────────────┘
```

Três coisas no desenho merecem nota:

**O bloco com preço fechado** (1.1–1.4) é a tradução direta das células mescladas `E18:E21`/`F18:F21`. Quatro linhas descritas, um preço só, que entra uma vez na soma. Sem isso, o orçamento da Igreja não é reproduzível — e a resposta em `D1` foi que os dois modos convivem.

**As linhas 2.1 e 2.2 não somam.** Sem quantidade e sem valor, a coluna TOTAL mostra `——`, não `0,00`. É exatamente a regra `R1` da planilha (`SE(OU(C=""; E=""); ""; C*E)`), e é o que permite observação e item dividirem a mesma grade, como já acontece hoje.

**O bloco de totais segue `D4` na ordem exata:** total dos serviços → acréscimo de NF → total → desconto → sub-total → entrada → a pagar. Os números do desenho são os do orçamento real (25.600,00), com a entrada sugerida de 30% (`D5`) preenchida.

### Vindo do Excel: o teclado

A pessoa que vai usar isso passou anos no Excel. A tabela obedece o teclado dela:

| Tecla               | O que faz                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab` | Próximo campo / anterior. No fim da linha, salta para a próxima.                                                     |
| `Enter`             | Confirma e **cria nova linha** abaixo, com o cursor na descrição.                                                    |
| `↑` `↓`             | Sobe e desce mantendo a coluna.                                                                                      |
| `Ctrl+D`            | Duplica a linha de cima.                                                                                             |
| `Alt+↑` / `Alt+↓`   | Move a linha.                                                                                                        |
| `Esc`               | Cancela a edição da célula e devolve o valor anterior.                                                               |
| `Ctrl+V`            | **Cola da planilha.** Múltiplas linhas separadas por quebra, colunas por tabulação, distribuídas nas colunas certas. |
| `Ctrl+Enter`        | Nova seção.                                                                                                          |

Edição é **inline na célula**. Nada de abrir modal para digitar uma quantidade.

### Microcopy

Português do setor, escrito por gente. Nada de "Vamos começar!" nem de "Nenhum item encontrado ✨".

| Onde                     | Texto                                                           |
| ------------------------ | --------------------------------------------------------------- |
| Lista vazia com filtro   | "Nenhum orçamento em agosto de 2026." + ação **Novo orçamento** |
| Tabela vazia             | "Sem itens. Comece pela descrição do serviço."                  |
| Placeholder de descrição | "Ex.: pergolado garagem com dobras em chapa 16 (1,5 mm)"        |
| Placeholder de unidade   | "UNID."                                                         |
| Item sem preço           | "Item 1.2 sem valor — não entra no total."                      |
| Salvamento               | "salvo às 14:32"                                                |
| Confirmação de exclusão  | "Excluir o orçamento 001/2026? Não dá para desfazer."           |
| Revisão                  | "Gera a revisão 001/2026-R1 e mantém este arquivado."           |

---

## 5. O que ficou de fora, de propósito

Gradiente violeta/índigo/ciano · glassmorphism, blur, orbe de fundo · `rounded-2xl` com sombra difusa · emoji como ícone · ícone decorativo sem ação · fonte única · badge pill colorida sem significado · tabela zebrada · **dark mode** (ninguém pediu; e o app é papel claro por natureza).

---

## 6. Pendências desta fase

1. ~~`tnum` da Barlow Condensed~~ — **resolvido na Fase 3**, ver a seção de tipografia.
2. **Status** (`P12`) — se não for usado, sai da barra do documento e da lista.
3. **Desconto** — `D4` fixou _onde_ ele entra, mas ainda falta saber se é digitado em **%** ou em **reais**, e se há teto. No desenho ele aparece como valor; vira campo duplo (%/R$) se a resposta for essa.
