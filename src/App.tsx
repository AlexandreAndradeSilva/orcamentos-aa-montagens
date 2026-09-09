import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useEditor } from './estado/editor';
import { ListaOrcamentos } from './telas/ListaOrcamentos';
import { EditorOrcamento } from './telas/EditorOrcamento';
import { NovoOrcamento } from './telas/NovoOrcamento';
import { Clientes } from './telas/Clientes';
import { Servicos } from './telas/Servicos';
import { Configuracoes } from './telas/Configuracoes';

export function App() {
  const carregarConfig = useEditor((e) => e.carregarConfig);

  useEffect(() => {
    void carregarConfig();
  }, [carregarConfig]);

  return (
    <>
      <header className="barra">
        <span className="barra__marca">
          <img src="/logo-simbolo.svg" alt="" />
          AA Montagens
        </span>
        <nav aria-label="Seções">
          <NavLink to="/orcamentos">Orçamentos</NavLink>
          <NavLink to="/clientes">Clientes</NavLink>
          <NavLink to="/servicos">Serviços</NavLink>
          <NavLink to="/configuracoes">Configurações</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/orcamentos" replace />} />
          <Route path="/orcamentos" element={<ListaOrcamentos />} />
          <Route path="/orcamentos/novo" element={<NovoOrcamento />} />
          <Route path="/orcamentos/:id" element={<EditorOrcamento />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/servicos" element={<Servicos />} />
          {/* o escopo pedia /produtos; a empresa vende serviço, não produto */}
          <Route path="/produtos" element={<Navigate to="/servicos" replace />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
          <Route path="*" element={<Navigate to="/orcamentos" replace />} />
        </Routes>
      </main>
    </>
  );
}
