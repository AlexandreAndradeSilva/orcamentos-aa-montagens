import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import './estilos/tokens.css';
import './estilos/base.css';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('elemento #raiz não encontrado');

createRoot(raiz).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
