# Fase 3 — Arquitetura

Vite + React + TypeScript `strict`, sem framework de UI. Persistência local, sem backend.

---

## 1. Camadas

```
src/
  domain/      funções puras — zero React, zero I/O
    dinheiro.ts    centavos, HALF_UP, leitura de valor em pt-BR
    esquemas.ts    zod: Empresa, Configuração, Cliente, Serviço, Orçamento, Backup
    orcamento.ts   a cadeia de cálculo e a numeração
    fabrica.ts     orçamento novo, duplicar, revisar, interpretar colagem
  dados/       persistência
    db.ts          Dexie (IndexedDB), migrations versionadas, catálogo por uso
    backup.ts      exportar / validar / importar JSON
  estado/
    editor.ts      zustand — o orçamento em edição e as ações da grade
  telas/       rotas e componentes
  estilos/     tokens.css + base.css (custom properties da Fase 2)
  formato.ts   TODO o Intl do app, em um módulo só
```

A regra que sustenta o resto: **`domain/` não importa nada de fora dele.** É por isso que a Fase 4 consegue testar cálculo sem subir navegador.

## 2. Dinheiro

Sempre `Centavos`, um inteiro. Nunca float.

`arredondarHalfUp` é a única função de arredondamento, e o empate vai para longe do zero. Ela corrige o erro de representação binária antes de decidir: sem isso, `26,75 × 100` chega como `2674,9999999999995` e o empate cai para o lado errado, tirando um centavo do total.

A quantidade vira milésimos inteiros antes de multiplicar, para o produto não herdar a imprecisão do float da quantidade:

```ts
multiplicarPorQuantidade(18_733, 3.5) === 65_566; // 3,5 × R$ 187,33 = R$ 655,66
```

**Onde o arredondamento acontece:** no total de cada linha (ou de cada bloco), antes da soma. É o que reproduz o que a pessoa enxerga na tela do Excel (D9).

### Leitura do que a pessoa digita

Regra explícita para o pt-BR, sem ambiguidade:

- havendo vírgula, ela é o decimal e os pontos são de milhar;
- sem vírgula, ponto com **exatamente 3 dígitos** depois é milhar — `1.500` é mil e quinhentos;
- sem vírgula, ponto com 1 ou 2 dígitos é decimal — quem digita no teclado numérico escreve `25600.50`.

Campo vazio devolve `null`, **não zero**: é a célula em branco da planilha (regra R1).

## 3. A cadeia de cálculo

```
totalDosServicos = Σ totais de linha e de bloco     // F28 = SUM(F18:F27)
total            = totalDosServicos + acrescimoNF   // F32 + F33
subTotal         = total − desconto                 // inserção D4
entrada          = manual, ou % do subTotal          // F35 (D5)
aPagar           = subTotal − entrada                // H35
```

Três comportamentos vieram direto da planilha e não são detalhe:

1. **`totalDaLinha` devolve `null`** quando falta quantidade ou valor — não zero. É a tradução de `=SE(OU(C18="";E18="");"";C18*E18)`, e é o que deixa observação e item dividirem a mesma grade.
2. **Quantidade zero com preço dá zero**, não `null`. A fórmula testa célula _vazia_, não valor zero.
3. **`precoFechado` na seção** faz o bloco valer o preço do bloco, com as linhas internas não somando — as células mescladas `E18:E21`/`F18:F21` (D1).

## 4. Persistência

Dexie sobre IndexedDB, quatro tabelas: `configuracao` (linha única), `clientes`, `servicos`, `orcamentos`.

Migrations versionadas: cada `version()` é um degrau permanente; degrau publicado não se edita, acrescenta-se o próximo.

**Numeração** (`reservarNumero`) roda dentro de uma transação `rw` e reinicia sozinha quando vira o ano (D6).

**Catálogo de serviços**: a planilha não tem nenhum (lacuna L10), então ele se constrói pelo uso — cada descrição salva entra com o último preço praticado como referência. Não há "importador do catálogo da planilha original" porque **não há catálogo na planilha para importar**.

**Backup**: JSON validado por zod na entrada. Arquivo inválido não entra pela metade — a validação vem antes da transação.

## 5. Estado

`zustand` para o orçamento em edição. O store não calcula nada: guarda e delega para `domain/`.

`react-hook-form` está instalado para os formulários maiores das próximas fases; a grade de itens **não** usa formulário — ela é uma planilha, com edição inline e commit por célula.

## 6. Rotas

| Rota               | Tela                                               |
| ------------------ | -------------------------------------------------- |
| `/orcamentos`      | lista com busca, filtro por situação e por período |
| `/orcamentos/novo` | escolhe ou cria o cliente e reserva o número       |
| `/orcamentos/:id`  | o editor: cabeçalho, grade densa, totais           |
| `/clientes`        | lista                                              |
| `/servicos`        | catálogo construído pelo uso                       |
| `/configuracoes`   | empresa, padrões, numeração, backup                |
| `/produtos`        | redireciona para `/servicos`                       |

### Uma divergência do escopo, declarada

O escopo pedia `/produtos`. A AA Montagens vende **serviço** — fachada, pergolado, estrutura metálica com mão de obra inclusa —, não produto de prateleira. A rota é `/servicos` e `/produtos` redireciona, então nenhum link antigo quebra. Se preferir `/produtos` como caminho principal, é uma linha.

## 7. Verificação

Tudo abaixo roda e passa neste commit:

| Comando                | Resultado                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------- |
| `npx tsc -b`           | sem erros, com `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` |
| `npm run build`        | sem warnings — 389 kB / 121 kB gzip                                                 |
| `npx eslint .`         | sem problemas                                                                       |
| `npx prettier --check` | formatado                                                                           |
| `npx vitest run`       | **32 testes, 32 passando**                                                          |

Os 32 testes cobrem três níveis: o dinheiro (18), a integração domínio + Dexie + backup (10) e a montagem do app em jsdom (4).

### Dois bugs que os testes pegaram

1. **`useLiveQuery` com transação de escrita.** A lista chamava `lerConfiguracao()` dentro de um `liveQuery`, e essa função _grava_ a configuração padrão na primeira execução. O Dexie recusa: `ReadOnlyError: Readwrite transaction in liveQuery context`. A configuração passou a vir do store, que a carrega uma vez na subida do app.
2. **`setState` dentro de `useEffect`** ao escolher um cliente já cadastrado — cascata de render sinalizada pelo `react-hooks`. Virou atribuição direta no handler do `select`.

Nenhum dos dois apareceria no `tsc`.

## 8. O que ainda não existe

- **Exportar PDF** — o botão está na tela, desabilitado. É a Fase 5.
- **Enviar no WhatsApp** — Fase 5.
- **Duplicar / revisar / arquivar** — as funções puras existem e estão testadas em `fabrica.ts`; falta ligar nos botões.
- **Edição de cliente** — a tela lista; o cadastro completo entra com `react-hook-form`.
- **Desconto em % ou em R$** — os dois modos estão implementados e alternam num clique, porque a pergunta ainda está aberta. Quando você responder, o modo que não servir sai.
