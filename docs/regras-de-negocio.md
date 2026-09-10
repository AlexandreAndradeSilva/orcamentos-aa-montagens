# Regras de negócio extraídas da planilha

Fonte: `IGREJA SAO MIGUEL ARCANJO PORTA PEROLA 2.xlsx`, aba `ORÇAMENTO`.

Este documento traduz **apenas o que está escrito no arquivo**. Onde a planilha não define regra, está registrado como **LACUNA** e a pergunta correspondente está em `PERGUNTAS.md`. Nada foi preenchido por suposição.

---

## R1 — Total do item

**Fórmula na planilha** (`F18`, e replicada em `F23:F27`):

```excel
=SE(OU(C18="";E18="");"";C18*E18)
```

**Regra:** `total do item = quantidade × valor unitário`. Se **qualquer um dos dois** estiver vazio, o total fica **vazio** — não zero. Uma célula vazia participa da soma como zero, então o efeito prático na soma é o mesmo; a diferença é visual (a coluna TOTAL não mostra `0,00` em linhas de texto).

**Consequência de projeto:** linhas puramente descritivas (as observações, os títulos de seção) são exatamente as linhas sem quantidade ou sem valor. A planilha não distingue "item" de "observação" por tipo — distingue por preenchimento. O app deve preservar esse comportamento: **uma linha sem quantidade ou sem preço não contribui e não exibe total.**

**Não há arredondamento explícito.** Não existe `ARRED`/`ROUND` em nenhuma célula do arquivo. O Excel multiplica em ponto flutuante binário e a máscara `#,##0.00` apenas _exibe_ 2 casas. → **LACUNA L1**

## R2 — Preço de pacote (bloco mesclado)

`E18:E21` e `F18:F21` estão mescladas. Isso não é decoração: significa que os subitens **1.1, 1.2, 1.3 e 1.4 têm um preço único de R$ 25.600,00 para o conjunto**.

Cada uma das 4 linhas tem `QUANT. = 1` e `UNID. = UNID.`, mas essas quantidades **não multiplicam nada** — só `F18` existe como fórmula, e ela usa `C18 × E18 = 1 × 25.600 = 25.600`. As quantidades de 1.2, 1.3 e 1.4 são informativas.

**Regra:** o orçamento suporta agrupar N linhas descritivas sob **um preço fechado do bloco**. O total do bloco entra uma única vez na soma.

**Não há regra** para como o preço de pacote se relaciona com as quantidades das linhas internas (elas são ignoradas neste caso, mas todas valem 1 — não dá para distinguir "ignorada" de "multiplicada por 1"). → **LACUNA L2**

## R3 — Total dos serviços

```excel
F28 = SOMA(F18:F27)
```

Soma **todas as linhas da grade**, das linhas 18 a 27 — inclusive as linhas da seção "2 — DAS OBSERVAÇÕES". A grade tem **capacidade fixa de 10 linhas** neste layout (18 a 27), sendo que a mesclagem 18:21 consome 4 delas.

**Defeito documentado:** a linha 22 **nunca soma**. A fórmula de total dela foi digitada em `A22` em vez de `F22` (confirmado no `calcChain.xml`), então `F22` está permanentemente vazia. Se um orçamento futuro usar a linha 22, o valor desaparece do total silenciosamente. → **Este é um bug da planilha, não uma regra. Não será reproduzido no app.**

## R4 — Encadeamento dos totais

```excel
F32 (TOTAL)               = F28
F33 (ACRESC. NOTA FISCAL) = valor digitado à mão        ← sem fórmula
F34 (SUB-TOTAL)           = F32 + F33
F35 (ENTRADA)             = valor digitado à mão        ← sem fórmula
H35 (A PAGAR)             = F34 - F35
```

Em prosa:

1. **TOTAL** repete o total dos serviços. É uma célula redundante — existe só para posicionar o valor dentro do bloco amarelo.
2. **ACRÉSCIMO NOTA FISCAL** é somado ao total. É um acréscimo, não um imposto destacado, e no orçamento existente vale `0`.
3. **SUB-TOTAL** = total + acréscimo. (O nome está invertido em relação ao uso comum: aqui o "sub-total" vem _depois_ do total.)
4. **ENTRADA** é subtraída do sub-total.
5. **A PAGAR** = o saldo restante após a entrada.

**Não existe desconto. Não existe frete. Não existe percentual em nenhuma dessas etapas.** → **LACUNAS L3, L4, L5**

## R5 — Condições de pagamento

Texto fixo, digitado em duas células independentes com o mesmo conteúdo:

- `B25`: `COND. PAGTº: 30% ENTRADA, RESTANTE A COMBINAR` (como item 2.2, dentro da tabela)
- `A35`: `COND. PAGTº: 30% ENTRADA, RESTANTE A COMBINAR` (ao lado do bloco de totais)

Não há lista de condições, não há vínculo entre as duas células, e **o campo ENTRADA vale 0 apesar de o texto dizer 30%**. A planilha não calcula a entrada a partir da condição. → **LACUNA L3**

## R6 — Validade da proposta e prazo de entrega

Ambos existem apenas como **rótulo**, com a célula de valor em branco:

- `A32:D32` — `VALIDADE DO ORÇAMENTO:`
- `A33:D33` — `PRAZO DE ENTREGA:`

São campos de texto livre no layout (não há máscara de data, não há cálculo a partir da data de emissão). Como estão vazios no único orçamento do arquivo, **não há padrão a inferir**. → **LACUNA L6**

## R7 — Aviso de reajuste

Texto fixo, sempre presente, em vermelho `#FF0000`, negrito, tamanho 8, na linha 29:

> `*O MERCADO PODE SOFRER REAJUSTES DE PREÇOS. O ORÇAMENTO ESTÁ SUJEITO A ALTERAÇÃO DE VALORES.`

Faz par com a validade: é a cláusula que protege o preço. Deve aparecer em todo orçamento.

## R8 — Numeração dos itens

Duas hierarquias, digitadas à mão na coluna A:

- **Seção**: inteiro (`1`, `2`), na linha do título em negrito (`DOS SERVIÇOS A SEREM PRESTADOS`, `DAS OBSERVAÇÕES`)
- **Linha**: `<seção>.<sequência>` como texto (`1.1`, `1.2`, `2.1`, `2.2`)

São **strings**, não números — `1.1` está armazenado como texto. Não há fórmula que gere a numeração; o usuário digita. No app isso deve ser derivado da posição.

## R9 — Numeração do orçamento

**Não existe.** O documento não tem número, código, série nem referência. O arquivo é identificado apenas pelo nome (`IGREJA SAO MIGUEL ARCANJO PORTA PEROLA 2.xlsx`) e o processo de "novo orçamento" descrito na aba oculta é _salvar uma cópia do arquivo_. → **LACUNA L7**

## R10 — Formatação de saída

| O quê     | Como está na planilha                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| Moeda     | máscara `#,##0.00` — **sem `R$`**, separador de milhar por ponto e decimal por vírgula (locale pt-BR do Excel) |
| Data      | máscara `mm-dd-yy` — **americana**, sobre um valor de data real                                                |
| Impressão | A4 retrato, escala 72%, margens 0,25", linhas 1:16 repetidas no topo de cada página                            |
| Grade     | linhas de grade desligadas na tela                                                                             |

A máscara de data americana é quase certamente acidental (é o default do openpyxl para datas). → **LACUNA L8**

## R11 — Assinaturas

Duas linhas de assinatura lado a lado no rodapé: `AA MONTAGENS` (esquerda) e `CLIENTE` (direita). Sem campo de data de aceite.

---

## Quadro-resumo do que a planilha define vs. o que o escopo pede

| Conceito                    | Planilha        | Escopo do app        | Situação                                    |
| --------------------------- | --------------- | -------------------- | ------------------------------------------- |
| Total do item = qtd × valor | ✅ `R1`         | ✅                   | definido                                    |
| Preço de pacote por bloco   | ✅ `R2`         | —                    | **definido na planilha, ausente do escopo** |
| Soma dos itens              | ✅ `R3`         | ✅                   | definido                                    |
| Acréscimo (nota fiscal)     | ✅ valor manual | "acréscimo"          | regra do valor é **LACUNA L4**              |
| Entrada / a pagar           | ✅ `R4`         | —                    | **definido na planilha, ausente do escopo** |
| Condições de pagamento      | ✅ texto fixo   | ✅                   | definido                                    |
| Validade                    | rótulo vazio    | ✅                   | **LACUNA L6**                               |
| Prazo de entrega            | rótulo vazio    | ✅                   | **LACUNA L6**                               |
| Aviso de reajuste           | ✅ `R7`         | —                    | **definido na planilha, ausente do escopo** |
| **Desconto**                | ❌ inexistente  | ✅ pedido            | **LACUNA L3**                               |
| **Frete**                   | ❌ inexistente  | ✅ pedido            | **LACUNA L5**                               |
| **Arredondamento**          | ❌ inexistente  | ✅ HALF_UP           | **LACUNA L1**                               |
| **Número sequencial**       | ❌ inexistente  | ✅ pedido            | **LACUNA L7**                               |
| **Vendedor**                | ❌ inexistente  | ✅ pedido            | **LACUNA L9**                               |
| **Status**                  | ❌ inexistente  | ✅ pedido            | **LACUNA L9**                               |
| **Catálogo de produtos**    | ❌ inexistente  | ✅ importador pedido | **LACUNA L10**                              |

Sete conceitos que o escopo pede **não têm nenhuma contrapartida na planilha** — e três coisas que a planilha faz **não estão no escopo**. Por isso a Fase 0 termina aqui, em `PERGUNTAS.md`.
