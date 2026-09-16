# Dados na nuvem e acesso restrito — Firebase

**Data:** 2026-09-15
**Estado:** aprovado pelo Alexandre em conversa; implementação em três PRs.

## 1. Problema

O app roda inteiro no navegador. Isso traz dois problemas que a AA Montagens sentiu:

1. **Os dados ficam presos ao aparelho.** Celular e computador têm conjuntos separados de orçamentos; limpar o navegador apaga tudo; a única cópia externa é o backup manual.
2. **O site é público.** Qualquer pessoa com o link abre o app (vazio, mas abre). Uma tela de login "só no front-end" não resolveria nada — seria teatro (`docs/publicar.md` §3).

## 2. Decisões

| Decisão                     | Escolha                                                                   | Por quê                                                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fornecedor                  | **Firebase** (Firestore + Firebase Auth), plano gratuito                  | Documentos JSON iguais aos de hoje; regras de acesso no servidor; não pausa por inatividade (o Supabase gratuito pausa após 7 dias sem uso).                   |
| Dono do projeto na nuvem    | **Conta Google da AA Montagens** (Roberta); Alexandre entra como _Editor_ | Os dados são da cliente. Operar continua fácil pelo papel de colaborador.                                                                                      |
| Login                       | **E-mail + senha**, cadastro público desligado                            | Login Google abre janela/redirecionamento e falha no app instalado na tela de início do iPhone. Senha funciona em todo lugar; "esqueci a senha" já vem pronto. |
| Quem entra                  | **Uma pessoa** (lista de e-mails na regra; cabe um segundo)               | Uma empresa, um conjunto de dados. Sem multi-empresa.                                                                                                          |
| Offline                     | **Só com internet.** Sem cache offline do SDK                             | Promessa limpa: sem rede, o app avisa e não finge que salvou. Ativar o cache depois é uma linha, se um dia fizer falta.                                        |
| Hospedagem                  | **Continua no GitHub Pages**                                              | Nada muda. O site público vira só uma tela de login vazia; a proteção está no servidor do Firebase.                                                            |
| Chave do Firebase no código | Vai versionada, **restrita ao domínio do site** no Google Cloud           | A chave web é pública por natureza; segurança é regra + restrição de domínio.                                                                                  |
| Regras no CI                | **Não.** Publicadas à mão por `firebase deploy --only firestore:rules`    | Evita guardar credencial da conta da cliente no GitHub.                                                                                                        |

**Fora do escopo, de propósito:** várias empresas, modo offline, PDFs guardados na nuvem, Cloudflare Access.

## 3. Arquitetura

```
navegador (GitHub Pages)                       Firebase (conta da AA Montagens)
┌──────────────────────────────┐               ┌───────────────────────────────┐
│ telas ── estado ── domínio   │               │ Auth: e-mail + senha          │
│            │                 │  HTTPS/SDK    │   cadastro desligado          │
│      Repositorio (interface) │ ────────────▶ │ Firestore                     │
│        ├─ firestore.ts  (prod)               │   configuracao/unica          │
│        └─ memoria.ts    (testes)             │   clientes/{id}               │
│                              │               │   servicos/{id}               │
│ PDF e WhatsApp continuam     │               │   orcamentos/{id}             │
│ gerados no aparelho          │               │ firestore.rules: só a lista   │
└──────────────────────────────┘               └───────────────────────────────┘
```

### 3.1 Modelo de dados no Firestore

Um para um com o que existe hoje no IndexedDB. Os tipos zod de `src/domain/esquemas.ts` não mudam.

| Coleção / documento  | Conteúdo                                           | Observações                                                                                                                                         |
| -------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `configuracao/unica` | `Configuracao` + `anoNumeracao`, `proximoNumero`   | Um documento só. `reservarNumero` é uma **transação** nele: dois aparelhos nunca tiram o mesmo número.                                              |
| `clientes/{id}`      | `Cliente`                                          | id gerado no app (como hoje).                                                                                                                       |
| `servicos/{id}`      | `Servico`                                          | **id derivado da descrição normalizada** (hash curto). `registrarUso` vira transação num documento só — o SDK web não consulta dentro de transação. |
| `orcamentos/{id}`    | `Orcamento` inteiro, com seções e linhas aninhadas | Poucos KB por documento (limite 1 MB). Ordenação por `alteradoEm` num campo só — não precisa de índice composto.                                    |

Campos `undefined` não existem no Firestore: o cliente é inicializado com `ignoreUndefinedProperties: true`, e o que volta passa pelo zod antes de chegar às telas.

### 3.2 A fronteira: `Repositorio`

Hoje as telas chamam o Dexie direto (`db.orcamentos.put`, `useLiveQuery`). Passa a existir `src/dados/repositorio.ts`:

```ts
export interface Repositorio {
  // leitura reativa: devolve a função de cancelar
  observarOrcamentos: (ouvinte: (lista: Orcamento[]) => void) => () => void; // por alteradoEm desc
  observarClientes: (ouvinte: (lista: Cliente[]) => void) => () => void; // por nome
  observarServicos: (ouvinte: (lista: Servico[]) => void) => () => void; // por usos desc
  observarCliente: (id: string, ouvinte: (c: Cliente | undefined) => void) => () => void;

  // leitura pontual
  lerOrcamento: (id: string) => Promise<Orcamento | undefined>;
  lerCliente: (id: string) => Promise<Cliente | undefined>;
  listarOrcamentos: () => Promise<Orcamento[]>;
  listarClientes: () => Promise<Cliente[]>;
  listarServicos: () => Promise<Servico[]>;
  contarOrcamentosDoCliente: (id: string) => Promise<number>;

  // escrita
  gravarOrcamento: (o: Orcamento) => Promise<void>;
  gravarCliente: (c: Cliente) => Promise<void>;
  atualizarCliente: (id: string, campos: Partial<Omit<Cliente, 'id'>>) => Promise<void>; // undefined remove o campo
  gravarServico: (s: Servico) => Promise<void>; // semear o catálogo (backup, testes)
  excluirOrcamento: (id: string) => Promise<void>;
  excluirCliente: (id: string) => Promise<void>;
  excluirServico: (id: string) => Promise<void>;
  registrarUso: (descricao: string, unidade?: string, valorReferencia?: number) => Promise<void>;

  // configuração e numeração
  lerConfiguracao: () => Promise<ConfiguracaoGuardada>; // cria a padrão na primeira vez
  gravarConfiguracao: (c: ConfiguracaoGuardada) => Promise<void>;
  reservarNumero: (ano: number) => Promise<{ sequencial: number; ano: number }>;

  // backup
  exportarTudo: () => Promise<Backup>;
  importarTudo: (b: Backup, opcoes: { substituir: boolean }) => Promise<void>;
  limparTudo: () => Promise<void>; // testes e "substituir"
}
```

Membros como propriedades-função (não métodos) para o Proxy do singleton poder entregá-los soltos, sem `this`. Implementações são objetos de closures. (Definido no PR 1; `observarOrcamento(id)` da primeira versão desta spec saiu por falta de uso — o editor lê uma vez e mantém o estado no store.)

Um singleton `repositorio` é escolhido na inicialização: `firestore` no app, `memoria` nos testes (`usarRepositorio(impl)`).

O hook `useColecao(observar)` (`src/telas/usarColecao.ts`) substitui o `useLiveQuery` nas telas: inscreve no `observar*`, devolve `undefined` enquanto carrega.

### 3.3 Implementações

- **`memoria.ts`** — `Map` por coleção, ouvintes notificados a cada escrita. Para testes. Sem dependência.
- **`firestore.ts`** — `onSnapshot` para observar; `runTransaction` em `reservarNumero` e `registrarUso`; `writeBatch` (≤ 500 por lote) no backup. Leitura sempre validada pelo zod.
- **`dexie.ts`** — só no PR 1, adaptador fino sobre o `db.ts` atual (`liveQuery` do Dexie para os `observar*`). Sai no PR 2 junto com o Dexie e o fake-indexeddb.

### 3.4 Sessão e login

`src/dados/sessao.ts`: `observarSessao`, `entrar(email, senha)`, `sair()`, `pedirNovaSenha(email)`. Persistência local (fica logada no aparelho).

`src/telas/Entrar.tsx`: e-mail, senha, "esqueci a senha". Mensagens em português para os erros comuns (senha errada, e-mail inexistente, muitas tentativas, sem rede). O `App` renderiza `Entrar` enquanto não há sessão; **Sair** fica em Configurações.

Conta autenticada mas fora da lista da regra recebe `permission-denied` na primeira leitura: o app mostra "Esta conta não tem acesso ao app da AA Montagens" com botão de sair — nunca tela em branco.

### 3.5 Regras (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function autorizado() {
      return request.auth != null
        && request.auth.token.email in ['<e-mail da Roberta>'];
    }
    match /{document=**} {
      allow read, write: if autorizado();
    }
  }
}
```

Cadastro público desligado em _Authentication → Settings → User actions_. A lista de e-mails é a única porta.

### 3.6 Sem internet

Sem cache offline, uma escrita sem rede fica pendente no SDK e não confirma. O app não deixa isso passar em silêncio:

- faixa fixa no topo, por `navigator.onLine` + eventos `online`/`offline`: "Sem conexão — nada está sendo salvo";
- o `salvar` do editor tem um limite de tempo (8 s); estourou, mostra o erro na faixa que já existe, e o orçamento fica marcado como não salvo.

### 3.7 Migração do que já está no navegador dela

A versão publicada hoje guarda tudo no IndexedDB `BancoOrcamentos`. `src/dados/migracao-local.ts` lê esse banco com a API nativa (`indexedDB.open`, `getAll` em cada _object store_ — sem Dexie), monta um `Backup`, valida com `zBackup` e devolve. Na primeira entrada com a nuvem vazia e dados locais presentes, a lista de orçamentos oferece **"Trazer os orçamentos deste aparelho para a nuvem"**; ao importar, o banco local é apagado (`indexedDB.deleteDatabase`) para a oferta não voltar. O backup por arquivo continua como segunda via.

## 4. Testes

| O quê                              | Como                                                                                                      | Onde roda                                            |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Telas, estado, domínio             | contra `memoria` (rápido, sem Java)                                                                       | `npx vitest run`, CI a cada PR                       |
| Contrato do `Repositorio`          | uma suíte parametrizada que roda igual em `memoria` e (no emulador) em `firestore`                        | local e CI                                           |
| `firestore.ts` e `firestore.rules` | **emulador do Firebase**; `@firebase/rules-unit-testing`: sem login nega, outro e-mail nega, o dela passa | `npm run test:emulador`; job separado no CI com Java |
| `Entrar`                           | tela com `sessao` simulada                                                                                | vitest                                               |
| Migração local                     | fake-indexeddb povoado como o Dexie povoaria, depois `migracao-local` lê                                  | vitest                                               |

## 5. Entrega em três PRs

1. **Fronteira** — `Repositorio`, `memoria`, adaptador `dexie`, `useColecao`, telas e testes migrados. Zero mudança de comportamento; o app continua local.
2. **Nuvem** — `firestore.ts`, `sessao.ts`, `Entrar`, regras, faixa de sem-conexão, testes no emulador. Dexie sai. Chave do projeto entra em `src/dados/firebase-config.ts`.
3. **Migração e documentação** — `migracao-local.ts` e a oferta na lista; `docs/nuvem.md` (passo a passo do painel, para os dois); README; `docs/decisoes.md` (D-nova); `docs/publicar.md` revisado (Cloudflare Access vira opcional).

## 6. O que depende da Roberta / do Alexandre (fora do código)

1. Conta Google da AA Montagens (existente ou nova).
2. Criar o projeto no Firebase; ativar Firestore (produção, `southamerica-east1`) e Authentication (e-mail/senha); **desligar o cadastro**; criar o usuário dela; registrar o app web e copiar a configuração.
3. Adicionar o Alexandre como colaborador (_Editor_) para publicar as regras.
4. Restringir a chave web ao domínio `alexandreandradesilva.github.io` no Google Cloud.
5. Exportar um backup da versão atual antes da troca.

O passo a passo com telas fica em `docs/nuvem.md` (PR 3) e é enviado ao Alexandre antes disso, quando o PR 2 precisar da configuração.
