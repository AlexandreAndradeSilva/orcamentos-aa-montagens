# Orçamentos — AA Montagens

App de orçamentos da **AA MONTAGENS** (Birigui/SP), feito a partir da planilha que a empresa usava.

Funciona no navegador, **sem servidor e sem internet**. Tudo fica gravado no computador onde o app é aberto.

**No ar:** https://alexandreandradesilva.github.io/orcamentos-aa-montagens/

Publica sozinho a cada alteração na `main` (GitHub Actions → GitHub Pages). O app é público; os dados de cada pessoa ficam só no navegador dela — ver [`docs/publicar.md`](docs/publicar.md).

---

## Como rodar

Precisa do [Node.js](https://nodejs.org) 20 ou mais novo.

```bash
npm install          # uma vez
npm run fontes:copiar  # uma vez: copia as fontes para public/fontes
npm run dev            # abre em http://localhost:5173
```

## Como gerar a versão final

```bash
npm run build      # gera a pasta dist/
npm run preview    # abre a versão final para conferir
```

A pasta `dist/` é o app inteiro. Pode ser copiada para um pendrive, para uma pasta na rede ou para qualquer hospedagem de arquivos estáticos. Não precisa de banco de dados nem de servidor.

**Para publicar na internet e restringir o acesso**, veja [`docs/publicar.md`](docs/publicar.md). Resumo: nenhum dado de cliente vai para o servidor — só o código —, e a proteção certa é no servidor (Cloudflare Access, grátis), nunca uma tela de login dentro do app, que num app só de navegador é teatro.

---

## No celular

Funciona no navegador do celular, e dá para **adicionar à tela de início** (menu do Chrome ou Safari → "Adicionar à tela de início"): abre em tela cheia, com o ícone da AA Montagens, parecendo app.

Abaixo de 720px o layout muda de forma: cada item do orçamento vira um cartão (descrição inteira em cima; quantidade, unidade e valor embaixo), as listas viram cartões e a navegação vai para o pé da tela, onde o polegar alcança. Tudo o que é tocável tem no mínimo 44px.

Para ver o app já com dados sem digitar nada: na lista vazia, **Ver com dados de exemplo** — ou abra `…/orcamentos?exemplo`. Só entra com o banco vazio; nunca sobrescreve orçamento de verdade.

Lembre que **os dados ficam no navegador de cada aparelho**: o celular e o computador são conjuntos separados, e o backup é a ponte entre eles.

## O básico do dia a dia

### Criar um orçamento

**Orçamentos → Novo orçamento**. Escolha um cliente já cadastrado ou preencha um novo. O número é reservado na hora, no formato `001/2026`, e reinicia a cada ano.

Só o **nome** é obrigatório; o resto (CNPJ/CPF, inscrição estadual, endereço, cidade, CEP, telefone, e-mail, contato) sai no PDF e pode ser completado depois em **Clientes → Editar**.

### Buscar o CNPJ na Receita

Digitando um CNPJ completo, o botão **Buscar** puxa razão social, endereço, cidade, CEP e telefone da Receita Federal (via BrasilAPI). Preenche só o que está em branco — não atropela o que você já digitou.

Há o mesmo botão no **CEP**, que traz rua, bairro e cidade.

**CPF não tem busca**, e não é limitação do app: não existe cadastro público de pessoa física por CPF no Brasil, e não deveria existir — é dado pessoal protegido pela LGPD. Cliente pessoa física se preenche à mão; o app valida os dígitos para pegar erro de digitação.

Sem internet, as buscas avisam e você preenche à mão. **Nada mais no app depende da internet.**

### A tabela de itens funciona como planilha

Quem vem do Excel não precisa reaprender nada:

| Tecla               | O que faz                                                                    |
| ------------------- | ---------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab` | Próximo campo / anterior                                                     |
| `Enter`             | Confirma e **cria uma linha** abaixo                                         |
| `Ctrl+D`            | Duplica a linha                                                              |
| `↑` `↓`             | Sobe e desce mantendo a coluna                                               |
| `Alt+↑` / `Alt+↓`   | Move a linha de lugar                                                        |
| `Ctrl+Enter`        | Cria uma seção                                                               |
| `Ctrl+V`            | **Cola direto da planilha** — várias linhas, colunas separadas por tabulação |
| `Esc`               | Cancela a edição da célula                                                   |

Valores podem ser digitados como você quiser: `25.600,00`, `25600,5` ou `25600.50`.

Ao digitar a **descrição**, aparecem os serviços que você já orçou. Escolher um traz junto a unidade e o último valor praticado — mas **não sobrescreve** o que você já tiver digitado. Setas escolhem, `Enter` aceita, `Esc` fecha.

Na **unidade**, o campo sugere as que estão em Configurações, sem impedir de digitar uma nova.

O `×` no fim de cada linha remove aquela linha.

### Preço fechado de bloco

Marque **preço fechado** no cabeçalho de uma seção quando várias frentes de serviço tiverem **um preço só** — como no orçamento da Igreja Portal Pérola 2, em que fachada alta, fachada baixa e os dois pergolados fecharam em R$ 25.600,00 juntos.

Com o preço fechado ligado, as quantidades e valores das linhas de dentro ficam informativos e não somam.

### Linhas sem preço não somam

Uma linha com descrição mas sem quantidade ou sem valor mostra `——` na coluna TOTAL e **não entra na conta**. É assim que a planilha registrava observações, e continua sendo — a seção "DAS OBSERVAÇÕES" é só uma seção sem preço.

### Exportar

- **Exportar PDF** — na tela do orçamento e na lista. Gera `orcamento-001-2026-nome-do-cliente.pdf`, com texto selecionável e leve (~32 KB).
- **Enviar no WhatsApp** — abre a conversa com o resumo pronto. **O PDF precisa ser anexado à mão**: o link do WhatsApp só carrega texto.

---

## Backup — leia isto

> **Os dados ficam só neste computador, neste navegador.** Não há cópia na nuvem.
> Limpar os dados do navegador apaga tudo. Trocar de computador não leva nada junto.
>
> **O backup é a única cópia fora daqui.**

### Fazer backup

**Configurações → Backup → Exportar backup**. Baixa um arquivo `backup-aa-montagens-2026-09-09.json` com **tudo**: configurações, clientes, serviços e orçamentos.

Guarde num pendrive, no Google Drive ou onde for. Faça isso toda semana, ou depois de um dia cheio de orçamentos.

### Restaurar

**Configurações → Backup → Importar backup** e escolha o arquivo. O conteúdo é conferido antes de entrar — arquivo estragado é recusado inteiro, e não pela metade.

Por padrão o backup é **mesclado** com o que já existe (o arquivo vence em caso de conflito de id). É assim que se leva os dados para outro computador.

---

## Catálogo de serviços

**A planilha original não tinha tabela de preços.** Por isso o catálogo se monta sozinho: toda descrição salva num orçamento entra em **Serviços**, com o último preço praticado como referência e a contagem de quantas vezes foi usada.

Não há o que "atualizar" à mão — é só orçar. Para corrigir uma descrição, corrija-a no orçamento e salve; a versão nova passa a valer.

**É esse catálogo que alimenta as sugestões** na coluna de descrição. Excluir um serviço da lista só o tira das sugestões: os orçamentos que já o usaram continuam iguais, e ele volta se for orçado de novo.

Se um dia existir uma tabela de preços de verdade em planilha, dá para importá-la — mas isso ainda não foi construído, porque não havia o que importar.

---

## Configurações

Tudo o que sai no PDF é editável em **Configurações**: razão social, CNPJ, inscrição estadual, endereço, telefones, quais números são WhatsApp, e-mail e site.

Também ficam ali:

- **próximo número** do ano (para continuar de uma numeração de papel);
- **entrada sugerida** (padrão 30% do sub-total);
- **validade padrão** em dias e **prazo de entrega padrão**;
- **condições de pagamento padrão**;
- o **aviso de reajuste** que sai em vermelho no PDF;
- a lista de **unidades**.

---

## Como o total é calculado

Na ordem exata da planilha, com o desconto acrescentado:

```
TOTAL DOS SERVIÇOS  = soma dos itens e dos blocos fechados
      + ACRÉSCIMO NOTA FISCAL
TOTAL
      − DESCONTO         (em reais, sem teto)
SUB-TOTAL
      − ENTRADA          (sugerida em 30% do sub-total; pode ser digitada)
A PAGAR
```

O desconto **não tem limite**: se passar do total, o app não corta o valor — mostra um aviso em vermelho e deixa a decisão com você.

Dinheiro é sempre inteiro em centavos, nunca número quebrado, e o arredondamento é HALF_UP no total de cada linha — o mesmo resultado que aparece na tela do Excel.

**Uma diferença em relação à planilha, de propósito:** a planilha trazia entrada `0` digitada à mão, e o app **sugere 30%**. Um orçamento novo com os mesmos itens mostra um "A PAGAR" menor que o do papel antigo. Detalhes em [`docs/paridade.md`](docs/paridade.md).

---

## Desenvolvimento

```bash
npm test           # 117 testes
npm run lint
npm run format
npm run build      # sem warnings
```

| Comando                 | O que faz                                         |
| ----------------------- | ------------------------------------------------- |
| `npm run fontes:copiar` | copia os TTF dos pacotes npm para `public/fontes` |
| `npm run casos:extrair` | relê a planilha e regenera os casos de paridade   |
| `npm run pdf:exemplo`   | gera `exemplos/orcamento-001-2026-....pdf`        |

### Onde as coisas estão

```
src/domain/   cálculo puro — zero React, zero I/O. É onde a regra mora.
src/dados/    IndexedDB (Dexie) com migrations, e o backup
src/estado/   zustand: o orçamento em edição
src/telas/    as rotas e a grade densa
src/pdf/      o documento em @react-pdf/renderer
src/formato.ts  todo o Intl do app, num módulo só
tools/        scripts de apoio (leitura da planilha, logo, contraste)
docs/         a auditoria da planilha e as decisões, fase por fase
```

### Documentação

| Arquivo                                                  | Sobre                                      |
| -------------------------------------------------------- | ------------------------------------------ |
| [`docs/mapeamento.md`](docs/mapeamento.md)               | a planilha célula a célula, e 11 anomalias |
| [`docs/regras-de-negocio.md`](docs/regras-de-negocio.md) | as fórmulas traduzidas em regra            |
| [`docs/PERGUNTAS.md`](docs/PERGUNTAS.md)                 | o que ficou em aberto                      |
| [`docs/decisoes.md`](docs/decisoes.md)                   | D1–D9, as respostas confirmadas            |
| [`docs/direcao-visual.md`](docs/direcao-visual.md)       | paleta, tipografia, o desenho da tela      |
| [`docs/logo.md`](docs/logo.md)                           | a vetorização da marca                     |
| [`docs/arquitetura.md`](docs/arquitetura.md)             | as camadas e por quê                       |
| [`docs/paridade.md`](docs/paridade.md)                   | a conferência contra a planilha            |
| [`docs/pdf.md`](docs/pdf.md)                             | o PDF e o WhatsApp                         |
| [`docs/publicar.md`](docs/publicar.md)                   | hospedar e controlar quem acessa           |

---

## Limites conhecidos

- **Um computador, um navegador.** Sem sincronização. Backup é manual.
- **O PDF não vai anexado no WhatsApp** — o link `wa.me` só carrega texto.
- **A paridade tem um caso só.** Só existia um orçamento preenchido na planilha, e o mais simples possível. Ver [`docs/paridade.md`](docs/paridade.md) §6.
- **Sem frete.** Confirmado que a AA Montagens não cobra à parte.
- **Trocar a logo** pela tela ainda não existe; o PDF usa a logo vetorial fixa.
- **Excluir um cliente não apaga os orçamentos dele** — o nome fica gravado no documento desde a emissão. O que se perde são os dados extras (CNPJ, endereço) em PDFs futuros.
