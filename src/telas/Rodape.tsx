/**
 * O rodape de todas as telas: os creditos e o "fale conosco" da Raavon Tech.
 * O PDF tem o seu proprio (em `pdf/Documento.tsx`), sem o link — papel nao
 * clica.
 */
import { creditos, INSTAGRAM_RAAVON } from '../creditos';

export function Rodape() {
  return (
    <footer className="rodape-app">
      <span>{creditos()}</span>
      <span aria-hidden="true">·</span>
      <a href={INSTAGRAM_RAAVON} target="_blank" rel="noopener noreferrer">
        fale conosco
      </a>
    </footer>
  );
}
