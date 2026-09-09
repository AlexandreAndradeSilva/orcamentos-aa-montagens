# Fase 1 — Vetorização da marca AA Montagens

Origem: `xl/media/image1.png` da planilha (1024×1024, PNG opaco, fundo bege `#E8E4DF`).
Entregáveis: `assets/logo/logo-full.svg`, `logo-mono.svg`, `logo-simbolo.svg`.

---

## 1. A marca

Monograma "AA" em azul-aço, com a silhueta preta de um soldador — máscara de solda, tocha e estouro de faísca — sobreposta ao segundo "A". Abaixo, o logotipo **AA MONTAGENS**, num grotesco condensado bold: "AA" em azul, "MONTAGENS" em preto.

Detalhe de construção que o traçado preservou: **o contra-forma do segundo "A" é aberta** — ela se funde com o vão entre as duas letras, em vez de ser um triângulo fechado como no primeiro "A". Isso é da arte original, não um defeito do traçado.

## 2. Paleta extraída do raster

Amostragem por frequência sobre os pixels opacos, com os tons médios descartados (antialiasing):

| Cor | HEX | Onde aparece | Participação da tinta |
|---|---|---|---|
| **Azul-aço** | `#135885` | monograma "AA" e a palavra "AA" | 47,6% |
| **Preto quente** | `#1C1A17` | soldador, tocha, faíscas, "MONTAGENS" | 52,4% |
| Bege osso | `#E8E4DF` | fundo chapado da imagem de origem | — |

O bege **não é cor de marca** — é o papel simulado no PNG. Entra na Fase 2 como candidato a neutro de superfície, não como cor da logo. Os SVGs são transparentes.

## 3. Método

Sem `potrace` e sem `vtracer` na máquina (só Node e ImageMagick), o traçado foi escrito para este arquivo:

1. **Máscaras por cor** — separação de azul e preto por limiar no espaço RGB, com remoção de ilhas e furos abaixo de 80 px (a textura de papel do raster).
2. **Crack following** — percorre as arestas entre pixel aceso e apagado, com orientação consistente (sólido à direita), de modo que contorno externo e vazado saiam com sentidos opostos e o `fill-rule` padrão resolva os furos sem gambiarra.
3. **Ramer–Douglas–Peucker**, ε = 1,2 px, ancorado no ponto mais distante do centroide para o corte não viciar o resultado.
4. **Classificação por posição medida** no raster, para nomear cada path.
5. **svgo** em modo absoluto, com `cleanupIds` desligado (os nomes são o entregável).

### O que foi tentado e descartado

- **Suavização Catmull-Rom** — piorou a fidelidade em 0,02 de IoU: inchava as formas. A arte é geometria reta, não curva.
- **Ajuste de cúbicas por mínimos quadrados (Schneider)** — numericamente instável neste caso, chegando a IoU 0,12 em algumas configurações.
- **Ajuste por arcos de círculo (Kåsa)** — o ajuste do *círculo* funciona (erro sub-pixel em teste unitário), mas o *arco entre as pontas* percorria o caminho errado em trechos que atravessam vãos: o fecho do "A", que cruza o vão entre as pernas, virava uma bolha englobando a letra. Uma validação de cobertura angular reduziu o problema sem eliminá-lo.

**Conclusão medida:** as linhas retas já reproduzem a arte no teto de fidelidade do próprio raster. As curvas não tinham o que ganhar aqui. Ficou o caminho simples, que é o verificável.

## 4. Conferência

Fidelidade medida por IoU entre o SVG rasterizado e a máscara de cor do PNG original, a 1024 px:

| Camada | Teto (contorno de pixel, sem simplificar) | SVG final | Perda |
|---|---|---|---|
| Azul | 0,9694 | **0,9729** | 0,0000 |
| Preto | 0,9433 | **0,9433** | 0,0000 |
| Marca inteira | — | **0,9572** | — |

A perda da vetorização é **zero**: o SVG final está no teto do que o contorno de pixel alcança. O azul fica ligeiramente acima do teto porque o RDP remove a escada de pixels que o contorno cru carrega.

Os ~4% que faltam para 1,0 são a convenção de meio pixel do rasterizador de conferência (ele pinta a borda inteira), não erro de forma. Isso foi isolado: aplicar deslocamento de −0,5 px sobe o contorno cru de 0,9283 para 0,9694 sem mudar geometria nenhuma.

Depois do `svgo`, **IoU entre otimizado e bruto = 1,00000** nos três arquivos, com os 15 `id` preservados.

## 5. Os arquivos

| Arquivo | viewBox | Paths | Tamanho |
|---|---|---|---|
| `logo-full.svg` | `0 0 1000 651.2` | 15 nomeados | 6,0 KB |
| `logo-mono.svg` | `0 0 1000 651.2` | 15, `fill="currentColor"` no `<svg>` | 5,8 KB |
| `logo-simbolo.svg` | `0 0 512 512` (quadrado) | 4 nomeados | 3,4 KB |

**489 nós no total.** Nomes: `monograma-aa`, `soldador`, `tocha`, `faiscas`, e `letra-a1`, `letra-a2`, `letra-m`, `letra-o`, `letra-n`, `letra-t`, `letra-a`, `letra-g`, `letra-e`, `letra-n2`, `letra-s`.

Todos: sem `width`/`height` fixos, sem `<image>` embutido, sem grupo vazio, `viewBox` correto, `role="img"` e `aria-label="AA Montagens"`.

Pré-visualizações em `assets/logo/preview-full.png` e `preview-simbolo.png`.

## 6. Ressalvas honestas

1. **A viseira da máscara é um vazado.** Na arte original ela é o bege do fundo; no SVG ela é transparente. Sobre fundo claro fica igual ao original; sobre fundo escuro, a viseira escurece junto. Se a marca for usada sobre fundo escuro, o caminho é `logo-mono.svg`.
2. **É um redesenho a partir do raster, não o arquivo do designer.** Foi confirmado que não existe original vetorial. A geometria está no limite do que o PNG de 1024 px permite: fiel na forma e na proporção, mas as bordas herdam a resolução da fonte. Se o arquivo original aparecer depois, vale refazer.
3. **O logotipo foi traçado, não remontado em fonte.** As 11 letras são contornos medidos, não texto convertido. Isso é o correto para uma marca (independe de fonte instalada), mas significa que "AA MONTAGENS" não é editável como texto.
