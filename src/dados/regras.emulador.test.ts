/**
 * Quem entra e quem nao entra — as regras de `firestore.rules`, no emulador.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';

let ambiente: RulesTestEnvironment;

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'regras-aa-montagens',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(() => ambiente.cleanup());

describe('firestore.rules', () => {
  it('sem login, nada — nem ler, nem escrever', async () => {
    const db = ambiente.unauthenticatedContext().firestore();
    await assertFails(db.collection('orcamentos').get());
    await assertFails(db.collection('orcamentos').doc('x').set({ a: 1 }));
    await assertFails(db.collection('configuracao').doc('unica').get());
  });

  it('logado com outro e-mail, nada', async () => {
    const db = ambiente.authenticatedContext('intruso', { email: 'outro@exemplo.com' }).firestore();
    await assertFails(db.collection('orcamentos').get());
    await assertFails(db.collection('clientes').doc('c1').set({ nome: 'x' }));
  });

  it('logado sem e-mail no token, nada', async () => {
    const db = ambiente.authenticatedContext('anonimo').firestore();
    await assertFails(db.collection('orcamentos').get());
  });

  it('o e-mail da empresa com "s" (o do PDF) NAO e o da lista', async () => {
    const db = ambiente
      .authenticatedContext('quase', { email: 'aamonstagens@hotmail.com' })
      .firestore();
    await assertFails(db.collection('orcamentos').get());
  });

  it('o e-mail da lista le e escreve em toda colecao', async () => {
    const db = ambiente
      .authenticatedContext('roberta', { email: 'aamontagens@hotmail.com' })
      .firestore();
    await assertSucceeds(db.collection('clientes').doc('c1').set({ nome: 'Igreja', id: 'c1' }));
    await assertSucceeds(db.collection('orcamentos').get());
    await assertSucceeds(db.collection('configuracao').doc('unica').set({ proximoNumero: 1 }));
    await assertSucceeds(db.collection('servicos').doc('s1').delete());
  });
});
