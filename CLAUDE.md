# Orçamentos AA Montagens — regras do projeto

## Git: nada sobe sem comando explícito

**Nunca** commitar, fazer push, abrir ou mesclar PR por conta própria.

O fluxo é: alterar → verificar (`npm run typecheck`, `npx eslint .`, `npx vitest run`, `npm run build`) → mostrar o resultado → **esperar o comando** do usuário para enviar ao Git.

Quando o comando vier, seguir o gitflow: branch a partir de `main`, PR para `main`, merge. Nunca commitar direto em `main`.

## Verificação antes de afirmar

- Layout de celular se confere com foto (`npm run fotos`, Playwright em viewport de iPhone), não de cabeça.
- Regra de negócio vinda da planilha não se inventa: o que estiver ambíguo vai para `docs/PERGUNTAS.md` e se pergunta.
- Dinheiro é inteiro em centavos; arredondamento HALF_UP só em `src/domain/dinheiro.ts`.

## Onde as coisas estão

`docs/` tem a auditoria da planilha e as decisões, fase por fase. `README.md` é para quem usa. `docs/publicar.md` explica o deploy (GitHub Pages, automático a cada merge na `main`).
