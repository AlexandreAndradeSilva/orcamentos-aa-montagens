/**
 * Cria a usuaria da AA Montagens no emulador de Auth (127.0.0.1:9099), para o
 * app em modo emulador ter com quem entrar. A senha e de mentira: so vale
 * aqui. O emulador aceita qualquer chave de API.
 *
 * Uso: node tools/semear_emulador.mjs   (com os emuladores no ar)
 */
const EMAIL = process.env.SEMEAR_EMAIL ?? 'aamontagens@hotmail.com';
const SENHA = process.env.SEMEAR_SENHA ?? 'emulador123';

const resposta = await fetch(
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulador',
  {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: SENHA, returnSecureToken: true }),
  },
);
const corpo = await resposta.json();
if (!resposta.ok && corpo?.error?.message !== 'EMAIL_EXISTS') {
  console.error('nao consegui criar a usuaria no emulador:', corpo);
  process.exit(1);
}
console.log(`usuaria ${EMAIL} pronta no emulador de Auth (senha: ${SENHA})`);
