# A nuvem: Firebase, login e regras

Como o projeto na nuvem foi montado, como operá-lo e o que fazer quando algo mudar. Decisão: `decisoes.md` D10. Desenho completo: `superpowers/specs/2026-09-15-nuvem-firebase-design.md`.

---

## 1. O que existe, e onde

| Peça                       | Onde                                                                                        | Quem mexe                               |
| -------------------------- | ------------------------------------------------------------------------------------------- | --------------------------------------- |
| Projeto Firebase           | `orcamentos-aa-montagens`, na **conta Google da AA Montagens**                              | Roberta (dona); Alexandre como _Editor_ |
| Banco (Firestore)          | região `southamerica-east1` — coleções `configuracao`, `clientes`, `servicos`, `orcamentos` | o app, pelo navegador                   |
| Login (Authentication)     | e-mail + senha; **cadastro público desligado**                                              | usuários criados à mão no painel        |
| Regras (`firestore.rules`) | no repositório; publicadas à mão                                                            | Alexandre, por `npx firebase deploy`    |
| Site                       | GitHub Pages, como antes                                                                    | GitHub Actions, a cada merge na `main`  |

O site é público, mas **sem login só existe a tela de entrar**. A proteção não é a tela: é a regra no servidor do Firebase, que recusa qualquer leitura ou escrita de quem não está na lista.

A chave do Firebase que aparece em `src/dados/firebase-config.ts` é pública por natureza (é o endereço do projeto). O que a torna inofensiva: as regras, e a restrição da chave ao domínio do site (seção 5).

## 2. Quem entra

Duas condições, as duas obrigatórias:

1. **Ter conta** em _Authentication → Users_ (só o painel cria; o app não tem cadastro).
2. **Estar na lista** de `firestore.rules`:

```
function autorizado() {
  return request.auth != null
    && request.auth.token.email in ['aamontagens@hotmail.com'];
}
```

Uma conta que passa pela primeira e não pela segunda vê "Esta conta não tem acesso" — e é isso que os testes em `src/dados/regras.emulador.test.ts` fixam.

### Dar acesso a mais alguém

1. _Authentication → Users → Adicionar usuário_ (e-mail + senha inicial; a pessoa troca pelo "Esqueci a senha").
2. Acrescentar o e-mail na lista em `firestore.rules`.
3. Rodar `npm run test:emulador` (o teste da lista precisa acompanhar) e publicar: `npx firebase deploy --only firestore:rules`.

### Tirar o acesso

Basta tirar da lista e publicar as regras. Desativar a conta no painel é um segundo cadeado.

## 3. Publicar as regras

Precisa do Firebase CLI logado numa conta com papel _Editor_ no projeto:

```bash
npx firebase login                              # uma vez; abre o navegador
npx firebase deploy --only firestore:rules      # publica firestore.rules
```

As regras **não** são publicadas pelo CI, de propósito: seria guardar uma credencial da conta da cliente no GitHub. O CI só testa (job `emulador` em `publicar.yml`).

## 4. Desenvolver e testar sem encostar no banco real

Os emuladores do Firebase rodam localmente (precisam de **Java 17+**):

```bash
npm run test:emulador   # sobe firestore+auth, roda o contrato e as regras, derruba
npm run dev:emulador    # sobe os emuladores, cria a usuária de mentira e abre o vite apontando para eles
```

No modo emulador a usuária é `aamontagens@hotmail.com` com senha `emulador123` (só vale ali — `tools/semear_emulador.mjs`). Para as fotos de celular contra o emulador:

```bash
npm run emulador                          # num terminal
node tools/semear_emulador.mjs            # noutro
VITE_EMULADOR=1 npx vite build && npx vite preview
FOTOS_EMAIL=aamontagens@hotmail.com FOTOS_SENHA=emulador123 npm run fotos
```

Os testes de tela (`npx vitest run`) **não** precisam do emulador: rodam em memória, atrás da mesma interface `Repositorio`.

## 5. A troca: o que acontece com os dados que já estavam no aparelho

A versão anterior guardava tudo no IndexedDB do navegador. Na primeira entrada com a nuvem vazia, `src/dados/migracao-local.ts` lê esse banco (API nativa, sem Dexie), valida com o mesmo zod do backup e a lista oferece **"Trazer para a nuvem"**. Ao importar, o banco antigo é apagado para a oferta não voltar. Com a nuvem já povoada a oferta não aparece — a numeração dos dois lados poderia colidir —, e o caminho é o backup por arquivo.

Por garantia, antes da troca: **Configurações → Backup → Exportar backup** na versão antiga.

## 6. Restringir a chave ao domínio (uma vez, Alexandre)

No Google Cloud (mesmo projeto): _APIs e serviços → Credenciais → "Browser key (auto created by Firebase)"_ → _Restrições de aplicativo: Sites_ → adicionar:

- `alexandreandradesilva.github.io/*`
- `aamontagens.vercel.app/*` (se o site estiver na Vercel)
- `localhost:5173/*` e `localhost:4173/*` (desenvolvimento)

Sem isso, a chave funciona de qualquer site — não dá acesso aos dados (as regras seguram), mas permite gastar a cota do projeto.

## 7. Se algo der errado

| Sintoma                                            | Causa provável                                      | O que fazer                                               |
| -------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------- |
| "E-mail ou senha errados"                          | senha errada, ou conta não existe                   | "Esqueci a senha"; conferir em _Authentication → Users_   |
| "Esta conta não tem acesso"                        | entrou, mas o e-mail não está na lista das regras   | seção 2                                                   |
| Faixa "Sem conexão" no topo                        | sem internet                                        | esperar voltar; nada foi salvo enquanto a faixa estava lá |
| "Sem resposta do servidor" ao salvar               | internet caiu no meio                               | salvar de novo quando voltar                              |
| Lista vazia depois de logar num aparelho novo      | é o mesmo banco: se está vazio, está vazio em todos | importar um backup (Configurações → Backup)               |
| `npm run test:emulador` falha com "Java not found" | JDK ausente ou fora do PATH                         | instalar Temurin 21 e abrir um terminal novo              |

## 8. Custo

Plano gratuito (Spark): 1 GB de banco, 50 mil leituras e 20 mil escritas por dia. A AA Montagens faz dezenas de orçamentos por mês; cada abertura de tela é uma leitura por documento. Não chega perto — e o Firebase **não pausa** projeto parado, ao contrário do Supabase gratuito.
