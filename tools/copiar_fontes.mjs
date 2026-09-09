/** Copia os TTF estáticos dos pacotes @expo-google-fonts para public/fontes. */
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = resolve(RAIZ, 'public/fontes');

const FONTES = [
  ['ibm-plex-sans/400Regular/IBMPlexSans_400Regular.ttf', 'ibm-plex-sans-400.ttf'],
  ['ibm-plex-sans/500Medium/IBMPlexSans_500Medium.ttf', 'ibm-plex-sans-500.ttf'],
  ['ibm-plex-sans/600SemiBold/IBMPlexSans_600SemiBold.ttf', 'ibm-plex-sans-600.ttf'],
  ['barlow-condensed/600SemiBold/BarlowCondensed_600SemiBold.ttf', 'barlow-condensed-600.ttf'],
  ['barlow-condensed/700Bold/BarlowCondensed_700Bold.ttf', 'barlow-condensed-700.ttf'],
];

mkdirSync(DESTINO, { recursive: true });
for (const [origem, nome] of FONTES) {
  copyFileSync(resolve(RAIZ, 'node_modules/@expo-google-fonts', origem), resolve(DESTINO, nome));
  console.log('  ', nome);
}
console.log('fontes copiadas para public/fontes');
