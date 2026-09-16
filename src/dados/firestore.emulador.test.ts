/**
 * O contrato de `Repositorio` contra o Firestore de verdade — no emulador,
 * com as regras do arquivo carregadas e o e-mail autorizado no token. Assim
 * o contrato tambem prova que as regras deixam a lista trabalhar.
 */
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll } from 'vitest';
import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import type { Firestore } from 'firebase/firestore';
import { testarContrato } from './contrato';
import { criarRepositorioFirestore } from './firestore';

let ambiente: RulesTestEnvironment;
let banco: Firestore;

beforeAll(async () => {
  ambiente = await initializeTestEnvironment({
    projectId: 'contrato-firestore',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
  // o SDK de teste devolve a instancia "compat"; as funcoes modulares aceitam
  banco = ambiente
    .authenticatedContext('roberta', { email: 'aamontagens@hotmail.com' })
    .firestore() as unknown as Firestore;
});

afterAll(() => ambiente.cleanup());

testarContrato('firestore (emulador)', () => Promise.resolve(criarRepositorioFirestore(banco)));
