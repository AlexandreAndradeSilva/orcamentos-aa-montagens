# Fase 4 — Paridade de cálculo com a planilha

**Resultado: nenhuma divergência de cálculo.** As seis células do bloco de totais e o total de cada linha batem centavo a centavo.

Duas diferenças de _comportamento_ existem, são deliberadas e estão testadas como tais — não foram descobertas depois, estão na seção 4.

---

## 1. Método

O caso de teste **não foi digitado**. `tools/extrair_casos.py` abre o `.xlsx` duas vezes — com `data_only=True` para os valores e `data_only=False` para as fórmulas — e gera `src/teste/casos-planilha.json` com:

- **as entradas**: seções, linhas, quantidade, unidade, valor unitário, e o preço de bloco quando as células estão mescladas;
- **os esperados**: os resultados que o **próprio Excel gravou em cache** nas células de total.

Então a comparação é contra o que a AA Montagens vê na tela do Excel, não contra a minha releitura das fórmulas.

```bash
npm run casos:extrair    # regenera o fixture a partir do .xlsx
npx vitest run           # confere
```

### Um bug de extração que apareceu no caminho

A primeira versão do extrator detectava mesclagem só na linha-âncora. Resultado: os itens 1.2, 1.3 e 1.4 **herdavam** o valor de R$ 25.600,00 de E18, como se cada um custasse isso. O mapa de mesclagem passou a cobrir a faixa inteira, e as linhas internas do bloco voltaram a ficar sem valor próprio — que é o que a planilha diz.

Vale registrar porque a versão errada teria produzido um caso de teste falso que passaria por cima de um erro real de R$ 76.800,00.

## 2. O que foi extraído

Único orçamento preenchido do arquivo: **Igreja Portal Pérola 2**, emitido em 14/08/2026.

| Item  | Descrição                                                                                          | Quant. | Unid. | Valor | Total |
| ----- | -------------------------------------------------------------------------------------------------- | ------ | ----- | ----- | ----- |
| **1** | **DOS SERVIÇOS A SEREM PRESTADOS** — _preço fechado de R$ 25.600,00 sobre 4 linhas (âncora `E18`)_ |        |       |       |       |
| 1.1   | (Fachada alta) estrutura metálica com viga G chapa 14…                                             | 1      | UNID. | —     | —     |
| 1.2   | (Fachada baixa) estrutura metálica com viga G chapa 14…                                            | 1      | UNID. | —     | —     |
| 1.3   | Pergolado garagem com dobras em chapa 16 (1,5 mm)                                                  | 1      | UNID. | —     | —     |
| 1.4   | Pergolado piscina tubos 100×350 chapa 14…                                                          | 1      | UNID. | —     | —     |
| **2** | **DAS OBSERVAÇÕES**                                                                                |        |       |       |       |
| 2.1   | Inclusos material e mão de obra                                                                    | —      | —     | —     | —     |
| 2.2   | Cond. pagtº: 30% entrada, restante a combinar                                                      | —      | —     | —     | —     |

O `—` nas linhas 1.1–1.4 não é ausência de dado: é a consequência de a célula estar **coberta pela mesclagem**. O preço pertence ao bloco.

## 3. Conferência célula a célula

Atenção ao mapeamento: **a nomenclatura da planilha é invertida** — o "SUB-TOTAL" vem _depois_ do "TOTAL" (anomalia R4).

| Célula                    | Fórmula na planilha | Esperado  | No domínio                           | Bate |
| ------------------------- | ------------------- | --------- | ------------------------------------ | ---- |
| `F28` TOTAL DOS SERVIÇOS  | `=SUM(F18:F27)`     | 25.600,00 | `totalDosServicos`                   | ✅   |
| `F32` TOTAL               | `=F28`              | 25.600,00 | `totalDosServicos`                   | ✅   |
| `F33` ACRÉSC. NOTA FISCAL | digitado            | 0,00      | `acrescimoNotaFiscal`                | ✅   |
| `F34` SUB-TOTAL           | `=F32+F33`          | 25.600,00 | `total` (e `subTotal`, sem desconto) | ✅   |
| `F35` ENTRADA             | digitado            | 0,00      | `entrada`                            | ✅   |
| `H35` A PAGAR             | `=F34-F35`          | 25.600,00 | `restante` (informativo, D5.1)       | ✅   |

Mais duas asserções por caso: **o total de cada linha** bate com o que a planilha mostra (incluindo os `null` das linhas cobertas por mesclagem e das observações), e **o bloco fechado entra uma vez só** na soma.

## 4. As duas diferenças de comportamento

Nenhuma é erro de cálculo. As duas estão em `src/domain/paridade.test.ts`, com teste próprio, para ninguém descobrir em campo.

### 4.1 A entrada sugerida não muda o total — muda o "restante"

A planilha traz `ENTRADA = 0` digitado à mão, apesar de a condição de pagamento dizer "30% ENTRADA". A decisão **D5** mandou o app _sugerir_ 30%; a **D5.1** mandou a entrada **não abater** do total — ela só informa.

|                                     | Total a pagar | Entrada  | Restante (H35) |
| ----------------------------------- | ------------- | -------- | -------------- |
| Documento original                  | **25.600,00** | 0,00     | 25.600,00      |
| Orçamento novo no app, mesmos itens | **25.600,00** | 7.680,00 | 17.920,00      |

O `H35` da planilha (`= F34 − F35`, "A PAGAR") corresponde ao **restante** do app, que sai como linha informativa. Reproduzir o documento original exige entrada digitada como 0 — e é assim que o caso de paridade é montado. Um orçamento novo com os mesmos itens mostra o **mesmo total** do papel (R$ 25.600,00) e, abaixo, "entrada sugerida 7.680,00 · restante 17.920,00". Se isso não for o desejado, o ajuste é em D5/D5.1.

### 4.2 A linha 22 defeituosa não foi reproduzida

Na planilha, a fórmula de total da linha 22 foi digitada em `A22` em vez de `F22` (anomalia **A3**, confirmada no `calcChain.xml`). Um item naquela linha **nunca entra no total, em silêncio**.

O app não reproduz o defeito: toda linha com quantidade e valor soma. Há teste fixando essa escolha — dez linhas de R$ 100,00 somam R$ 1.000,00, e não R$ 900,00.

## 5. Casos de borda

Os que o escopo pediu, mais os que a auditoria sugeriu:

| Caso                                        | Comportamento                                                                                               | Onde                |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------- |
| Item sem preço                              | não contribui; total da linha é `null`                                                                      | `orcamento.test.ts` |
| Item sem quantidade                         | idem                                                                                                        | idem                |
| Linha puramente descritiva                  | `null` — é como a planilha guarda observação                                                                | idem                |
| **Quantidade zero** com preço               | dá **0**, não `null` — a fórmula testa célula _vazia_, não valor zero                                       | idem                |
| **Quantidade negativa**                     | recusada pelo esquema zod                                                                                   | idem                |
| Valor unitário negativo                     | recusado pelo esquema                                                                                       | idem                |
| **3,5 m² × R$ 187,33**                      | R$ 655,66 (HALF_UP sobre 655,655)                                                                           | idem                |
| 0,75 × R$ 33,33                             | R$ 25,00 (2.499,75 → 2.500)                                                                                 | idem                |
| Soma de fracionadas                         | arredonda **por linha**, não no bruto — diferença real de 1 centavo em 3 linhas, e é o lado que D9 escolheu | idem                |
| Bloco fechado com valor preenchido dentro   | o valor da linha é ignorado                                                                                 | idem                |
| Bloco fechado de preço zero                 | válido, soma zero                                                                                           | idem                |
| Bloco fechado + seção normal juntos         | somam corretamente                                                                                          | idem                |
| Numeração `001/2026`, revisão `-R1`         | formatada e validada pelo esquema                                                                           | idem                |
| Validade sobre virada de ano e ano bissexto | `2026-12-20 + 30 = 2027-01-19`; `2028-02-28 + 1 = 2028-02-29`                                               | idem                |

### Desconto máximo

**A planilha não tem desconto. Confirmado depois: em reais e sem teto** (`decisoes.md` D4.1).

Sem teto, o cálculo **não limita nada — ele avisa**. `avisosDosTotais()` sinaliza desconto maior que o total e entrada maior que o total a pagar. Truncar em silêncio seria inventar uma regra de negócio, e desconto acima do total é tão provável ser erro de digitação quanto decisão comercial.

Desconto de 100% zera o sub-total **sem** aviso: é um valor limite legítimo.

## 6. A limitação honesta desta fase

**Há um único orçamento preenchido no arquivo, e é o caso mais simples possível:** acréscimo 0, entrada 0, desconto inexistente, quantidades todas inteiras e iguais a 1, um único bloco de preço fechado.

Ou seja: a paridade prova que o app reproduz **este** documento, e que a interpretação do bloco mesclado está certa — o que já não é pouco, porque uma leitura errada da mesclagem daria R$ 102.400,00 em vez de R$ 25.600,00. Mas ela **não exercita** acréscimo de nota fiscal, entrada real, quantidade fracionada nem múltiplos blocos, porque não há documento com nada disso.

Os outros 68 testes cobrem essas regras — mas contra as fórmulas que eu li da planilha, não contra um documento real conferido pela AA Montagens. É uma diferença de peso probatório, e ela fica registrada.

**Três a cinco orçamentos antigos** (xlsx, PDF, ou foto de impresso com os números legíveis) transformariam essa fase de teste de fumaça em paridade de verdade. A pergunta foi feita na Fase 0 e a resposta foi seguir sem eles; a porta continua aberta — o extrator já aceita um caminho: `python tools/extrair_casos.py OUTRO.xlsx`.

## 7. Estado da suíte

```
Test Files  5 passed (5)
Tests      80 passed (80)
```

| Arquivo                    | Testes | O que cobre                                             |
| -------------------------- | ------ | ------------------------------------------------------- |
| `domain/dinheiro.test.ts`  | 18     | centavos, HALF_UP, leitura de pt-BR                     |
| `domain/orcamento.test.ts` | 36     | regras R1/R4, blocos, borda, desconto máximo, numeração |
| `domain/paridade.test.ts`  | 12     | o documento real, célula a célula                       |
| `dados/db.test.ts`         | 10     | Dexie, numeração transacional, catálogo, backup         |
| `App.test.tsx`             | 4      | montagem do app em jsdom                                |

`tsc -b`, `eslint` e `npm run build` limpos.
