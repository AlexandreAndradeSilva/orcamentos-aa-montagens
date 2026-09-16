/**
 * Fotografa o app num viewport de celular, para conferir layout sem adivinhar.
 *
 * Uso: npm run fotos            (com `npm run preview` no ar em :4173)
 *      npm run fotos -- URL     (outra base, ex. o site publicado)
 * Saída: exemplos/fotos/*.png
 */
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = (process.argv[2] ?? 'http://localhost:4173').replace(/\/$/, '');
const SAIDA = resolve(RAIZ, 'exemplos', 'fotos');
mkdirSync(SAIDA, { recursive: true });

const navegador = await chromium.launch();
const contexto = await navegador.newContext({
  ...devices['iPhone 13'],
  locale: 'pt-BR',
});
const pagina = await contexto.newPage();

// 'load' e nao 'networkidle': o Firestore mantem uma conexao aberta o tempo
// todo, entao a rede nunca fica ociosa. A espera curta e para os dados chegarem.
async function foto(nome: string, caminho: string, opcoes: { inteira?: boolean } = {}) {
  await pagina.goto(`${BASE}${caminho}`, { waitUntil: 'load' });
  await pagina.waitForTimeout(900);
  const arquivo = resolve(SAIDA, `${nome}.png`);
  await pagina.screenshot({ path: arquivo, fullPage: opcoes.inteira ?? true });
  console.log('  ', arquivo.replace(RAIZ, '.'));
}

// A porta: com FOTOS_EMAIL/FOTOS_SENHA no ambiente, entra pela tela de login
// (no emulador: `node tools/semear_emulador.mjs` cria a usuaria). Sem as
// variaveis, assume que o app abre direto — o que so acontece com sessao viva.
const email = process.env['FOTOS_EMAIL'];
const senha = process.env['FOTOS_SENHA'];
if (email && senha) {
  await pagina.goto(`${BASE}/orcamentos`, { waitUntil: 'load' });
  await pagina.getByLabel('E-mail').fill(email);
  await pagina.getByLabel('Senha').fill(senha);
  await pagina.screenshot({ path: resolve(SAIDA, 'celular-entrar.png') });
  console.log('   ./exemplos/fotos/celular-entrar.png');
  await pagina.getByRole('button', { name: 'Entrar' }).click();
  await pagina.waitForSelector('text=Orçamentos', { timeout: 15_000 });
}

// carrega o exemplo uma vez (so entra se o banco estiver vazio)
await pagina.goto(`${BASE}/orcamentos?exemplo`, { waitUntil: 'load' });
await pagina.waitForSelector('text=Igreja Portal Pérola 2', { timeout: 15_000 });

await foto('celular-lista', '/orcamentos');
await foto('celular-editor', '/orcamentos/orc-oficina');
await foto('celular-editor-topo', '/orcamentos/orc-oficina', { inteira: false });

// a grade, rolada até ela: é a parte que mais muda no celular
await pagina.goto(`${BASE}/orcamentos/orc-oficina`, { waitUntil: 'load' });
await pagina.locator('.grade').scrollIntoViewIfNeeded();
await pagina.waitForTimeout(900);
await pagina.screenshot({ path: resolve(SAIDA, 'celular-grade.png') });
console.log('   ./exemplos/fotos/celular-grade.png');
await pagina.locator('.totais').scrollIntoViewIfNeeded();
await pagina.waitForTimeout(900);
await pagina.screenshot({ path: resolve(SAIDA, 'celular-totais.png') });
console.log('   ./exemplos/fotos/celular-totais.png');
await foto('celular-novo', '/orcamentos/novo');
await foto('celular-clientes', '/clientes');
await foto('celular-configuracoes', '/configuracoes', { inteira: false });

await navegador.close();
