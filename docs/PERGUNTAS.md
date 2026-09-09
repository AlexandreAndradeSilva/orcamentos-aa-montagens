# Perguntas antes de codificar

Cada pergunta existe porque a planilha **não responde** — não porque eu não olhei. A referência da lacuna (`L1`, `L2`…) aparece em `regras-de-negocio.md`.

Onde eu tenho um palpite razoável, ele está marcado como **sugestão** — mas nenhuma será implementada sem confirmação.

---

## Bloqueantes — sem estas respostas o cálculo pode sair errado

### P1 · Existe a planilha ORIGINAL da AA Montagens?

Este arquivo foi **gerado por script** (`dc:creator = openpyxl`) em 14/08/2026, com comentários de célula assinados por `OpenAI`, e traz uma aba oculta "COMO PREENCHER" com instruções genéricas. É uma reconstrução, não o arquivo que a empresa usava.

Se existir o arquivo anterior (o que a Roberta / a AA Montagens realmente usava no dia a dia), ele provavelmente tem fórmulas, campos e regras que se perderam nessa reconstrução. **Vale muito mais como fonte.** Tem esse arquivo? Ou PDFs de orçamentos antigos?

### P2 · "ACRÉSC. NOTA FISCAL" (`F33`) — valor fixo ou percentual?

Na planilha é um número digitado à mão, e no único orçamento vale `0`. Não há fórmula.

Na prática costuma ser um percentual sobre o total, para cobrir os impostos quando o cliente pede nota. Qual é a regra real?

- (a) valor em reais, digitado caso a caso _(é o que a planilha faz hoje)_
- (b) percentual fixo sobre o total dos serviços — **qual %?**
- (c) percentual variável, digitado caso a caso
- (d) uma chave liga/desliga "emite nota fiscal" que aplica um % padrão

### P3 · "ENTRADA" (`F35`) — o 30% é calculado ou digitado?

A condição de pagamento diz **"30% ENTRADA, RESTANTE A COMBINAR"**, mas o campo ENTRADA vale `0` neste orçamento. Os dois se contradizem.

- (a) a entrada é sempre 30% do SUB-TOTAL e deve ser calculada
- (b) é um valor digitado, negociado caso a caso _(é o que a planilha faz)_
- (c) a % vem da condição de pagamento escolhida (então preciso da lista de condições)

E: quando ENTRADA fica em `0`, é porque **ainda não foi negociada** ou porque **não há entrada**? Isso muda o que o PDF deve mostrar.

### P4 · Desconto — existe no negócio?

**A planilha não tem desconto em lugar nenhum.** O escopo do app pede. Antes de eu inventar:

- Existe desconto na prática? Se sim: por item ou sobre o total?
- Percentual, valor, ou os dois?
- Entra **antes** ou **depois** do acréscimo de nota fiscal?
- Tem desconto máximo? Quem autoriza?

Se a resposta for "não usamos desconto", eu **não implemento** — melhor do que um campo que ninguém preenche.

### P5 · Frete — existe?

Mesma situação: a planilha não tem. O escopo pede. A AA Montagens cobra frete/deslocamento separado, ou já está embutido no preço do serviço ("INCLUSOS MATERIAL E MÃO DE OBRA")?

### P6 · Arredondamento

Não há `ARRED`/`ROUND` na planilha — o Excel calcula em ponto flutuante e só _exibe_ 2 casas. Isso funciona enquanto as quantidades são inteiras, mas quebra com quantidade fracionada (ex.: `3,5 m² × R$ 187,33`).

**Sugestão:** arredondar HALF_UP para centavos **no total de cada linha**, e somar os totais já arredondados (é o que mais se aproxima do que o usuário vê na tela do Excel). Confirma?

### P7 · Preço de pacote (o bloco 1.1–1.4)

Achado mais importante da auditoria: as células de VALOR e TOTAL estão **mescladas sobre 4 subitens** — os R$ 25.600,00 são o preço do conjunto, não de um item.

Isso é o jeito normal de orçar da AA Montagens (descrever várias frentes de serviço e fechar um preço único), ou foi só esse orçamento?

- (a) é normal — o app precisa de "bloco com preço fechado" como recurso de primeira classe
- (b) foi exceção — cada item tem preço próprio e esse arquivo é um caso torto
- (c) os dois convivem no mesmo orçamento

Isso decide o formato da tabela de edição inteira, então é o item mais caro de mudar depois.

---

## Estruturantes — decidem o formato do app

### P8 · Numeração do orçamento

Não existe número na planilha; hoje "novo orçamento" = salvar uma cópia do arquivo.

- Começar em quanto? (`1`? continuar de alguma numeração de papel?)
- Formato: `0001`, `001/2026`, `2026-0001`?
- Reinicia a cada ano?

### P9 · Validade e prazo de entrega

Os rótulos existem, os valores estão em branco — não dá para inferir padrão.

- **Validade:** quantos dias por padrão? (comum: 15 ou 30) Ou é sempre digitado?
- **Prazo de entrega:** é texto livre ("30 dias após aprovação", "a combinar") ou um número de dias?

### P10 · Observações dentro ou fora da tabela?

Hoje a seção "2 — DAS OBSERVAÇÕES" fica **dentro** da grade de itens, com os mesmos números de item (`2.1`, `2.2`) e as mesmas colunas.

- (a) manter assim — seções numeradas livres, algumas com preço, outras não _(fiel à planilha)_
- (b) separar em um campo "Observações" próprio, fora da tabela

Recomendo **(a)**: é como a empresa já pensa o documento, e permite mais de uma seção de serviço.

### P11 · Unidades

O único registro de unidades é um comentário de célula: _"Unidade (UND, M, M² etc.)"_ — e o orçamento usa `UNID.`.

Quais unidades a AA Montagens realmente usa? (UNID., M, M², ML, KG, VB/verba, DIA…) Lista fechada com autocompletar, ou digitação livre?

### P12 · Vendedor e status

Nenhum dos dois existe na planilha; ambos estão no escopo.

- **Vendedor:** a empresa tem mais de uma pessoa orçando? Se é só uma, o campo é ruído.
- **Status** (`rascunho` / `enviado` / `aprovado` / `perdido`): é útil para vocês acompanharem, ou vira campo que ninguém atualiza? Se sim, "perdido" precisa de motivo?

### P13 · Catálogo de serviços

Não há aba de produtos nem tabela de preços — os itens foram digitados do zero neste orçamento, com descrições longas e muito específicas ("VIGA G CHAPA 14 TELHA TRAPEZIO SANDUICHE...").

- Existe uma lista de serviços recorrentes com preço de referência em algum lugar (outro arquivo, caderno, cabeça)?
- Ou o catálogo deve se **construir sozinho**, guardando as descrições já usadas para reaproveitar por busca? — **é o que eu recomendo**, dado que não há fonte.

O escopo pede "importador do catálogo de produtos da planilha original"; **não há catálogo nessa planilha para importar.**

---

## Dados do PDF — preciso confirmar antes de imprimir errado

### P14 · O e-mail está certo?

A planilha traz `aamonstagens@hotmail.com` — com **"monstagens"**. Parece erro de digitação de `aamontagens@hotmail.com`. Qual é o correto?

### P15 · WhatsApp

Aparecem dois números: `(18) 99823-0660` e `(18) 99788-2819`. Qual deles é o WhatsApp do botão "Enviar no WhatsApp"? Os dois vão no rodapé do PDF?

### P16 · Faltam no arquivo

- **Inscrição Estadual** da AA Montagens (o campo I.E. existe para o _cliente_, mas não para a empresa) — tem? Precisa sair no PDF?
- **Site / Instagram** — existe? Vai no rodapé?
- **Razão social completa** — "AA MONTAGENS" é o nome fantasia. A razão social do CNPJ 66.612.836/0001-55 é outra? Qual deve aparecer no documento?

### P17 · Logo em alta

O PNG embutido tem 1024×1024 mas com **fundo bege chapado** (sem transparência) e textura de papel. Dá para vetorizar bem, mas se existir o arquivo original (AI/EPS/SVG/PNG com fundo transparente), o resultado da Fase 1 fica melhor. Tem?

---

## Fase 4 (paridade de cálculo) — aviso antecipado

O escopo manda transformar **os orçamentos reais já preenchidos** em casos de teste. **Este arquivo tem exatamente um**: Igreja Portal Pérola 2, total R$ 25.600,00, com acréscimo 0 e entrada 0 — ou seja, o caso mais simples possível. Ele não exercita acréscimo, nem entrada, nem quantidade fracionada, nem múltiplos preços.

Um único caso trivial não é paridade. Se você conseguir **3 a 5 orçamentos antigos** (xlsx ou PDF, mesmo impressos e fotografados), eu transformo cada um em teste e aí a Fase 4 tem valor de verdade. Sem isso, ela vira um teste de fumaça.
