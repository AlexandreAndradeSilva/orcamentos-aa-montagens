/**
 * Configuracao do projeto Firebase da AA Montagens.
 *
 * Publica por natureza: e o endereco do projeto, nao um segredo. O que
 * protege os dados e `firestore.rules` (so a lista de e-mails entra) e a
 * restricao da chave ao dominio do site, no Google Cloud.
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyBt9zgC6O8WFbVCBhLKequIff3EYbBTflM',
  authDomain: 'orcamentos-aa-montagens.firebaseapp.com',
  projectId: 'orcamentos-aa-montagens',
  storageBucket: 'orcamentos-aa-montagens.firebasestorage.app',
  messagingSenderId: '1085216399482',
  appId: '1:1085216399482:web:e6ef4e05c3c243377e5bc3',
};
