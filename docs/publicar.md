# Publicar e controlar o acesso

> **Atualizado em 15/09/2026 (D10).** Os dados deixaram de viver no navegador: estão no Firestore da AA Montagens, e o app só abre com login verificado no servidor. As seções 1, 3 e 4 abaixo descrevem a situação **anterior** e ficam como registro do raciocínio; o que vale hoje está em [`nuvem.md`](nuvem.md). O Cloudflare Access (opção A da seção 3) virou **opcional** — só se um dia se quiser esconder até a tela de login.

---

## 1. Antes de tudo: o que exatamente vai para a internet

Este app **não tem servidor, não tem banco de dados e não tem backend**. O que se publica são arquivos estáticos — 2,5 MB no total:

```
index.html          a página
assets/*.js         o código do app
assets/*.css        o estilo
fontes/*.ttf        as duas famílias tipográficas
logo-*.svg          a marca
icone-*.png         ícone de tela de início
manifest.webmanifest
_redirects
```

**Nenhum orçamento, nenhum cliente e nenhum preço está aí.** Esses dados vivem no IndexedDB do navegador de quem usa, e nunca saem do aparelho.

Consequência prática, e é a parte importante da resposta: **se um estranho descobrir o endereço, ele abre um app vazio.** Lista de orçamentos em branco, nenhum cliente, nenhum valor. Não há vazamento de dado de cliente porque não há dado de cliente no servidor.

### O que um estranho _veria_

Duas coisas, e vale decidir se incomodam:

1. **Os dados da AA Montagens** ficam embutidos no código (é o padrão de Configurações): CNPJ, endereço, telefones e e-mail. Tudo isso já está impresso em cada orçamento que a empresa envia — é informação comercial pública —, mas fica registrado que está lá.
2. **A ferramenta em si.** Um concorrente veria como a AA Montagens orça.

Se isso for aceitável, publicar aberto é defensável. Se não for, siga para a seção 3.

---

## 2. Onde publicar

Qualquer hospedagem de arquivos estáticos serve. `npm run build` gera a pasta `dist/`, e é ela inteira que sobe.

### GitHub Pages (onde está hoje — sem controle de acesso)

`.github/workflows/publicar.yml` publica sozinho a cada push na `main`: instala, copia as fontes, roda typecheck, lint e testes, faz o build no subcaminho do repositório e sobe para o Pages. Falhou um teste, não publica.

O endereço fica `https://<usuário>.github.io/<repositório>/`. Como é um **subcaminho**, o app é construído com `BASE_PATH=/<repositório>/` — o router, a logo, as fontes do PDF e o manifest respeitam essa base. Localmente nada muda: a base é `/`.

O Pages não tem regra de rewrite; o workflow copia `index.html` para `404.html`, que é como se faz fallback de rota lá.

**Limitação do plano gratuito:** Pages só funciona em repositório **público**, e **não tem como restringir quem acessa o site**. Para trancar o acesso, o caminho é a seção 3.

**Duas coisas já estão resolvidas no projeto:**

- `public/_redirects` manda toda rota para o `index.html`. Sem isso, recarregar a página em `/clientes` daria **404** — as rotas só existem dentro do navegador. Netlify e Cloudflare Pages leem esse arquivo.
- `manifest.webmanifest` + ícones fazem o "adicionar à tela de início" do celular abrir em tela cheia, com ícone da AA Montagens e sem barra de endereço.

---

## 3. Como deixar só a sua cliente entrar

### O caminho errado, e por que é errado

**Uma tela de login dentro do app não protege nada.** Este app roda inteiro no navegador: qualquer pessoa pode abrir as ferramentas de desenvolvedor, ler o código e passar por cima da verificação. Sem servidor, não há onde guardar uma senha nem quem verifique.

Seria teatro de segurança — dá a impressão de proteção sem entregar nenhuma. Não vou implementar isso, e recomendo desconfiar de qualquer app "só front-end" que ofereça.

**URL secreta também não é segurança.** Um endereço difícil de adivinhar só atrasa quem procura. Ele vaza em histórico de navegador, em link compartilhado no WhatsApp, em log de servidor.

A proteção precisa ser **antes dos arquivos serem entregues** — no servidor, não no app.

### Opção A — Cloudflare Pages + Cloudflare Access _(recomendada)_

Gratuito até 50 pessoas, e é autenticação de verdade: o Cloudflare bloqueia no servidor dele, antes de mandar qualquer arquivo. Quem não estiver na lista vê uma tela de login e nunca chega ao app.

**O repositório já está pronto** — fontes versionadas, `_redirects` para as rotas, base `/`. Não há nada a mudar no código. O que segue é feito no site da Cloudflare, com a sua conta, em três blocos de ~5 minutos.

#### Bloco 1 — publicar o app na Cloudflare (o site passa a existir em `*.pages.dev`)

1. Crie a conta em https://dash.cloudflare.com/sign-up (só e-mail e senha; o plano Free basta).
2. No menu da esquerda: **Workers & Pages → Create → Pages → Connect to Git**.
3. Autorize o GitHub e escolha o repositório `orcamentos-aa-montagens`.
4. Em _Set up builds and deployments_:
   - **Production branch:** `main`
   - **Framework preset:** `Vite` (ou _None_)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - Variáveis de ambiente: **nenhuma** (não defina `BASE_PATH` — a Cloudflare serve na raiz)
5. **Save and Deploy.** O primeiro build leva 1–2 min. Ao terminar, aparece o endereço, algo como `https://orcamentos-aa-montagens.pages.dev`.
6. Abra o endereço: o app tem que aparecer igual ao do GitHub Pages. **Ainda está aberto para todo mundo** — o bloco 2 fecha.

#### Bloco 2 — trancar o acesso (Cloudflare Access)

7. Vá em https://one.dash.cloudflare.com (é o painel _Zero Trust_ da mesma conta). Na primeira vez ele pede um **team name** — qualquer nome, ex. `aa-montagens` — e a escolha do plano: **Free**.
8. **Access → Applications → Add an application → Self-hosted.**
9. Preencha:
   - **Application name:** `Orçamentos AA Montagens`
   - **Session duration:** `1 month` (o maior possível — a pessoa faz login uma vez por mês)
   - **Application domain:** o endereço do bloco 1, sem `https://` — ex. `orcamentos-aa-montagens.pages.dev`
   - **Identity providers:** deixe só **One-time PIN** marcado (login por código no e-mail, sem senha para decorar)
10. **Next**, e na política:
    - **Policy name:** `Quem pode entrar`
    - **Action:** `Allow`
    - **Include → Selector:** `Emails` → liste os e-mails, um por linha: o da Roberta e o seu
11. **Next → Add application.**

Pronto. A partir daqui, abrir o endereço mostra uma tela da Cloudflare pedindo o e-mail; ela manda um código de 6 dígitos; digitou, entra. Quem não está na lista para na tela.

#### Bloco 3 — desligar o GitHub Pages (senão continua aberto por lá)

12. Me avise que o bloco 2 funcionou. Eu desligo o GitHub Pages e removo o workflow dele — com o seu comando para o commit.

#### Como conferir que está protegido de verdade

Abra o endereço numa **janela anônima** (sem login): tem que aparecer a tela da Cloudflare, não o app. Posso conferir daqui também: um `curl` no endereço tem que devolver redirecionamento para `cloudflareaccess.com`, e não o HTML do app.

#### O que muda para quem usa

- **Primeira vez, e uma vez por mês:** e-mail → código → entra. No celular também.
- **Adicionar à tela de início** continua funcionando; quando a sessão vence, o "app" abre na tela de login.
- **Nada muda nos dados:** continuam no navegador de cada aparelho. O Access só decide quem baixa o app.
- Tirar o acesso de alguém: remova o e-mail da política. Não precisa avisar ninguém nem trocar senha.

#### Se preferir que eu faça o bloco 1 e 2 daqui

Dá, mas exige me passar um **token de API** da sua conta (Workers & Pages: Edit + Access: Edit). Token é segredo — passar por aqui deixa registro na conversa. Se for por esse caminho, crie o token, me passe, e **revogue depois** que eu terminar. Pelo painel, você não expõe nada.

### Opção B — servidor próprio com senha básica

Se você já tem uma VPS ou hospedagem com nginx, três linhas resolvem:

```nginx
location / {
    auth_basic "AA Montagens";
    auth_basic_user_file /etc/nginx/.htpasswd;
    try_files $uri /index.html;   # o mesmo fallback do _redirects
}
```

Uma senha só, compartilhada. Mais simples e mais frágil: trocar a senha exige avisar todo mundo, e não dá para saber quem entrou.

### Opção C — não publicar

O mais seguro é não colocar na internet.

- **No computador:** copie a pasta `dist/` para a máquina e sirva localmente. Precisa de um servidor mínimo — abrir o `index.html` direto pelo `file://` não funciona por causa das rotas.
- Some a possibilidade de usar no celular, que era justamente o que se queria.

### Comparação

|                          | Custo    | Protege de verdade   | Celular | Trabalho                    |
| ------------------------ | -------- | -------------------- | ------- | --------------------------- |
| **A. Cloudflare Access** | R$ 0     | **sim**, no servidor | sim     | ~30 min uma vez             |
| **B. nginx + senha**     | o da VPS | sim, senha única     | sim     | ~15 min, se já tem servidor |
| **C. Só local**          | R$ 0     | não há o que atacar  | **não** | pouco                       |
| ~~Login dentro do app~~  | —        | **não** — teatro     | —       | —                           |
| ~~URL secreta~~          | —        | **não**              | —       | —                           |

---

## 4. O que a publicação **não** resolve _(resolvido pela D10 — ver `nuvem.md`)_

Vale deixar explícito, porque era a fonte de confusão mais provável antes da nuvem:

**Publicar na web não sincroniza nada.** Os dados continuam presos ao navegador de cada aparelho. Se a Roberta usar no computador e no celular, são **dois conjuntos separados de orçamentos** — a numeração de cada um segue seu próprio caminho e um não enxerga o outro.

A ponte entre aparelhos continua sendo **exportar o backup num e importar no outro**.

Se a necessidade for de fato usar nos dois lugares com os mesmos dados, isso exige backend, e é outro projeto: servidor, banco, contas de usuário, sincronização e resolução de conflito. Dá para fazer, mas não é uma configuração — é uma reescrita da camada de dados. Diga se quiser que eu avalie.

---

## 5. Limpando os dados da empresa do código

Se você preferir que nem CNPJ nem endereço saiam no arquivo publicado, dá para esvaziar o padrão em `src/dados/db.ts` (`configuracaoPadrao`) e preencher tudo pela tela de Configurações na primeira execução.

O custo: quem abrir o app pela primeira vez encontra os campos em branco e precisa preencher. Como a AA Montagens vai usar num aparelho só, isso acontece uma vez. **Diga se quiser que eu faça.**
