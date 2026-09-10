/**
 * Registro das fontes do PDF.
 *
 * As mesmas duas famílias da interface (Fase 2), em TTF estático servido pelo
 * próprio app — buscar no Google na hora de gerar quebraria o PDF offline, e
 * este app é local-first.
 *
 * Os arquivos vêm dos pacotes `@expo-google-fonts/*` e são copiados para
 * `public/fontes/` por `npm run fontes:copiar`. Ambas são SIL OFL.
 */
import { Font } from '@react-pdf/renderer';

export const DISPLAY = 'Barlow Condensed';
export const TEXTO = 'IBM Plex Sans';

let registrado = false;

/**
 * @param base Onde estão os .ttf. No navegador, `/fontes`. No Node, o caminho
 *             absoluto da pasta.
 */
export function registrarFontes(base = '/fontes'): void {
  if (registrado) return;

  Font.register({
    family: TEXTO,
    fonts: [
      { src: `${base}/ibm-plex-sans-400.ttf`, fontWeight: 400 },
      { src: `${base}/ibm-plex-sans-500.ttf`, fontWeight: 500 },
      { src: `${base}/ibm-plex-sans-600.ttf`, fontWeight: 600 },
    ],
  });

  Font.register({
    family: DISPLAY,
    fonts: [
      { src: `${base}/barlow-condensed-600.ttf`, fontWeight: 600 },
      { src: `${base}/barlow-condensed-700.ttf`, fontWeight: 700 },
    ],
  });

  // Descrições de serviço são longas e cheias de parênteses e aspas; sem isso
  // o react-pdf quebra palavra no meio de "TRAPEZIO".
  Font.registerHyphenationCallback((palavra) => [palavra]);

  registrado = true;
}
