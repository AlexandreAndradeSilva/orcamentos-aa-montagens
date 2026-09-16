/**
 * Inicializacao do Firebase — uma vez, sob demanda.
 *
 * `ignoreUndefinedProperties`: o dominio usa `undefined` para campo ausente
 * (`exactOptionalPropertyTypes`), e o Firestore recusaria gravar isso.
 * Sem cache offline (spec §2): sem rede, o app avisa em vez de fingir.
 */
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, initializeFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './firebase-config';

/**
 * `VITE_EMULADOR=1` (ou `--mode emulador`) aponta o app para os emuladores
 * locais em vez do projeto real: desenvolvimento e fotos sem encostar nos
 * dados da AA Montagens. Ver `npm run dev:emulador`.
 */
const EMULADOR = import.meta.env['VITE_EMULADOR'] === '1';

function app(): FirebaseApp {
  return getApps()[0] ?? initializeApp(firebaseConfig);
}

let banco: Firestore | null = null;
export function bancoFirestore(): Firestore {
  if (!banco) {
    banco = initializeFirestore(app(), { ignoreUndefinedProperties: true });
    if (EMULADOR) connectFirestoreEmulator(banco, '127.0.0.1', 8080);
  }
  return banco;
}

let autenticacao: Auth | null = null;
export function auth(): Auth {
  if (!autenticacao) {
    autenticacao = getAuth(app());
    if (EMULADOR) {
      connectAuthEmulator(autenticacao, 'http://127.0.0.1:9099', { disableWarnings: true });
    }
  }
  return autenticacao;
}
