import { defineConfig } from 'vitest/config';

// Testes que precisam do emulador do Firebase no ar (firestore :8080).
// `npm run test:emulador` sobe o emulador, roda e derruba.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.emulador.test.ts'],
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
