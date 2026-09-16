import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { usarRepositorio } from './dados/repositorio';
import { criarRepositorioFirestore } from './dados/firestore';
import { bancoFirestore } from './dados/firebase';
import './estilos/tokens.css';
import './estilos/base.css';
import './estilos/celular.css';

usarRepositorio(criarRepositorioFirestore(bancoFirestore()));

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('elemento #raiz não encontrado');

createRoot(raiz).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
