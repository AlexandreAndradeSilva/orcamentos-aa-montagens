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
subTotal         = total − desconto                          ← é o TOTAL A PAGAR
entrada          = valor (sugerido 30% de subTotal, editável)   informativo (D5.1)
restante         = subTotal − entrada                           informativo (D5.1)
```

Comparado à planilha, a única inserção é `− desconto`; o resto do encadeamento é idêntico (`R4`) — com a ressalva de D5.1: o `H35` da planilha (sub-total menos entrada) virou o "restante", que só informa.

> Nota: com o desconto depois do acréscimo, o acréscimo incide sobre o valor cheio. Se um dia a AA Montagens quiser o contrário, é a troca de uma linha em `src/domain/`.

### D4.1 · Em reais, sem teto _(confirmado em 09/09/2026)_

O desconto é digitado **em reais** — o modo percentual foi removido do domínio, da tela e do PDF — e **não tem teto**.

Sem teto significa que o cálculo **não trunca**: um desconto acima do total produz sub-total negativo e o valor entra inteiro. Truncar em silêncio seria inventar uma regra que a AA Montagens não tem, e desconto acima do total é tão provável ser dedo errado quanto decisão comercial.

Mas também não passa calado: `avisosDosTotais()` sinaliza desconto acima do total e entrada acima do total a pagar, e o bloco de totais mostra isso numa faixa vermelha com `aria-live`. Quem decide é quem está orçando. (Total negativo não tem aviso próprio: só acontece com desconto acima do total, que já é o primeiro aviso.)

Consequência técnica: o campo saiu de `{ modo, centavos | percentual }` para `Centavos` puro. A **migration v2** do IndexedDB converte o que já estiver gravado — um desconto percentual é resolvido contra o total daquele orçamento, para o valor não mudar.

## D5 · Entrada: sugere 30%, permite editar _(fecha L3 / P3)_

Ao abrir um orçamento novo, o campo ENTRADA vem pré-preenchido com **30% do sub-total** (arredondado HALF_UP para centavos), acompanhando a condição de pagamento padrão. O usuário pode sobrescrever a qualquer momento; se sobrescrever, o app **para de recalcular** aquele campo — a sugestão não volta a atropelar o valor digitado.

Entrada `0` explícita é um valor válido e significa "sem entrada", não "não negociada".

### D5.1 · A entrada **não abate** do total: só informa _(pedido em 14/09/2026)_

O total do orçamento — o número grande na tela, a caixa azul do PDF, o `*Total*` do WhatsApp — é o **sub-total** (total menos desconto). A entrada aparece **depois** dele, como informação: "entrada sugerida 30%: X" e "restante após a entrada: Y", com `Y = subTotal − entrada`.

Antes, o app fazia como a planilha (`H35 = F34 − F35`): a entrada era subtraída e o "A PAGAR" mostrava só o saldo. Isso dava a impressão de que o orçamento valia menos do que vale. Agora o cliente lê o valor cheio e, ao lado, quanto seria a entrada e quanto sobra.

O campo continua editável (D5 vale): trocar a entrada muda o restante, nunca o total. Entrada zero não imprime as duas linhas no PDF nem no WhatsApp.

Consequência técnica: `Totais` perdeu `aPagar` e ganhou `restante`; quem precisa do total lê `subTotal`.

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

## D10 · Dados na nuvem (Firebase), login por e-mail e senha _(15/09/2026)_

Os orçamentos saem do navegador e vão para o **Firestore**, num projeto Firebase na conta Google da AA Montagens. Entra quem tem **e-mail e senha** criados no painel (cadastro público desligado) **e** está na lista de `firestore.rules` — a regra é verificada no servidor, antes de qualquer dado sair. Sem sessão, o app é só a tela de entrar.

Por que Firebase e não Supabase: o plano gratuito do Supabase pausa o projeto após uma semana sem uso, e uma oficina pode passar uma semana sem orçar. Por que e-mail e senha e não "entrar com Google": login por janela/redirecionamento falha no app instalado na tela de início do iPhone; senha funciona em todo lugar e "esqueci a senha" já vem pronto.

**Só com internet.** Sem cache offline: sem rede, o app avisa numa faixa e o salvar dá erro em vez de fingir. Ativar o cache do SDK é uma linha, se um dia fizer falta.

O código continua sem backend próprio: o Firestore é acessado direto do navegador, com a chave pública restrita ao domínio do site. Toda a persistência passa pela interface `Repositorio` (`src/dados/repositorio.ts`); os testes de tela rodam em memória, e a implementação Firestore e as regras são testadas no emulador (`npm run test:emulador`).

Spec completa: `docs/superpowers/specs/2026-09-15-nuvem-firebase-design.md`. Passo a passo do painel: `docs/nuvem.md`.
