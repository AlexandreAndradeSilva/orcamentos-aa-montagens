import '@testing-library/jest-dom/vitest';
import { beforeEach } from 'vitest';
import { usarRepositorio } from '../dados/repositorio';
import { criarRepositorioMemoria } from '../dados/memoria';

// Todo teste comeca com um repositorio em memoria vazio. O Firestore de
// verdade so entra nos testes do emulador (`npm run test:emulador`).
beforeEach(() => {
  usarRepositorio(criarRepositorioMemoria());
});
