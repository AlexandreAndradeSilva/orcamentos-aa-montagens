# Decisões confirmadas

Respostas dadas em 08/09/2026. Cada uma fecha uma lacuna de `regras-de-negocio.md`.
O que ainda está aberto continua em `PERGUNTAS.md`.

---

## D1 · Itens: preço próprio **e** preço de pacote convivem _(fecha L2 / P7)_

Um orçamento pode misturar, no mesmo documento:

- **linha com preço próprio** — `total = quantidade × valor unitário` (regra R1 da planilha);
- **bloco com preço fechado** — N linhas descritivas sob um único preço, que entra uma vez na soma (o caso 1.1–1.4 = R$ 25.600,00);
- **linha sem preço** — texto puro, não soma (é como a planilha representa observações).

A tabela de edição precisa suportar os três estados por linha. Um bloco é um agrupamento de linhas consecutivas com um preço no nível do bloco; quando existe preço de bloco, as quantidades e valores das linhas internas são **informativos** e não entram na conta.

## D2 · Acréscimo de nota fiscal: valor em reais, caso a caso _(fecha L4 / P2)_

Mantido exatamente como a planilha faz: campo livre em reais, digitado a cada orçamento, sem percentual e sem cálculo. Padrão `0`.

## D3 · Sem frete _(fecha L5 / P5)_

O frete/deslocamento **não existe** no negócio — já está embutido no preço ("INCLUSOS MATERIAL E MÃO DE OBRA"). Nenhum campo de frete será criado, nem no domínio, nem na tela, nem no PDF.

## D4 · Desconto único sobre o total, **depois** do acréscimo de NF _(fecha L3 / P4)_

Um desconto por orçamento (não por item), aplicado como última etapa antes do sub-total:

```
totalDosServicos = Σ totais das linhas e dos blocos
total            = totalDosServicos + acrescimoNotaFiscal
subTotal         = total − desconto
entrada          = valor (sugerido 30% de subTotal, editável)
aPagar           = subTotal − entrada
```

Comparado à planilha, a única inserção é `− desconto`; o resto do encadeamento é idêntico (`R4`).

> Nota: com o desconto depois do acréscimo, o acréscimo incide sobre o valor cheio. Se um dia a AA Montagens quiser o contrário, é a troca de uma linha em `src/domain/`.

### D4.1 · Em reais, sem teto _(confirmado em 09/09/2026)_

O desconto é digitado **em reais** — o modo percentual foi removido do domínio, da tela e do PDF — e **não tem teto**.

Sem teto significa que o cálculo **não trunca**: um desconto acima do total produz sub-total negativo e o valor entra inteiro. Truncar em silêncio seria inventar uma regra que a AA Montagens não tem, e desconto acima do total é tão provável ser dedo errado quanto decisão comercial.

Mas também não passa calado: `avisosDosTotais()` sinaliza desconto acima do total, entrada acima do sub-total e "a pagar" negativo, e o bloco de totais mostra isso numa faixa vermelha com `aria-live`. Quem decide é quem está orçando.

Consequência técnica: o campo saiu de `{ modo, centavos | percentual }` para `Centavos` puro. A **migration v2** do IndexedDB converte o que já estiver gravado — um desconto percentual é resolvido contra o total daquele orçamento, para o valor não mudar.

## D5 · Entrada: sugere 30%, permite editar _(fecha L3 / P3)_

Ao abrir um orçamento novo, o campo ENTRADA vem pré-preenchido com **30% do sub-total** (arredondado HALF_UP para centavos), acompanhando a condição de pagamento padrão. O usuário pode sobrescrever a qualquer momento; se sobrescrever, o app **para de recalcular** aquele campo — a sugestão não volta a atropelar o valor digitado.

Entrada `0` explícita é um valor válido e significa "sem entrada", não "não negociada".

## D6 · Numeração: `001/2026`, reiniciando a cada ano _(fecha L7 / P8)_

- Formato: três dígitos, barra, ano com quatro dígitos — `001/2026`
- Sequencial dentro do ano; volta a `001` em 01/01/2027
- O próximo número é editável em **Configurações** (para continuar de uma numeração de papel)
- Revisão preserva o número e acrescenta sufixo: `001/2026-R1`
- Nome do arquivo PDF: `orcamento-001-2026-igreja-portal-perola-2.pdf`

## D7 · Contato do PDF _(fecha P14 / P15)_

| Campo    | Valor                                     | Observação                                                                                |
| -------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| E-mail   | `aamonstagens@hotmail.com`                | **mantido como está na planilha** — confirmado que não é erro. Editável em Configurações. |
| WhatsApp | `(18) 99823-0660` **e** `(18) 99788-2819` | os **dois** são WhatsApp                                                                  |

Consequência: o botão "Enviar no WhatsApp" oferece a escolha entre os dois números, com o primeiro (`99823-0660`) como padrão. Ambos aparecem no rodapé do PDF.

**Todos os dados da empresa** — razão social, CNPJ, endereço, telefones, e-mail, logo — ficam editáveis na tela de **Configurações**, nenhum fixo no código.

## D8 · Sem arquivos adicionais _(fecha P1 / P17)_

Não há planilha original, orçamentos antigos nem logo vetorial. Consequências, assumidas explicitamente:

- **Fase 1** vetoriza a partir do PNG 1024×1024 com fundo bege. Dá para fazer bem — o contraste e a resolução permitem —, mas o SVG será uma _redesenho fiel_, não uma conversão do arquivo de origem do designer.
- **Fase 4** terá **um único caso de paridade** (Igreja Portal Pérola 2, R$ 25.600,00, acréscimo 0, entrada 0). É o caso mais simples possível: não exercita acréscimo, desconto, entrada, preço de pacote com mais de um bloco nem quantidade fracionada. Os demais testes serão de regra (derivados das fórmulas), não de paridade com documento real. **Isso vai declarado no README.**

## D9 · Arredondamento _(fecha L1)_

A planilha não tem `ROUND`; o Excel calcula em float e só exibe 2 casas. Adotado, conforme o escopo:

- **HALF_UP para centavos**, em uma única função utilitária do domínio
- aplicada **no total de cada linha** (ou de cada bloco), antes da soma — é o que reproduz o que o usuário enxerga na tela do Excel
- somas, desconto, acréscimo e entrada operam sobre inteiros em centavos, sem novo arredondamento

Com quantidades inteiras — o caso de todos os itens da planilha — o resultado é idêntico ao do Excel. Divergências só podem aparecer com quantidade fracionada, e aí o comportamento arredondado é o correto.
