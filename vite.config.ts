import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages serve em https://usuario.github.io/<repo>/ — um subcaminho.
  // O workflow de publicação define BASE_PATH="/<repo>/". Localmente fica "/".
  base: process.env['BASE_PATH'] ?? '/',
  build: {
    // O app carrega em 393 kB. O @react-pdf pesa ~1,2 MB sozinho e vive num
    // chunk próprio, carregado só quando alguém clica em "Exportar PDF" — e aí
    // fica em cache. O limite acompanha essa decisão em vez de escondê-la.
    chunkSizeWarningLimit: 1300,
  },
  test: {
    // padrão node (mais rápido); telas declaram jsdom no topo do arquivo
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // os do emulador precisam do Firebase no ar: `npm run test:emulador`
    exclude: ['**/node_modules/**', 'src/**/*.emulador.test.ts'],
    setupFiles: ['./src/teste/preparo.ts'],
  },
});
