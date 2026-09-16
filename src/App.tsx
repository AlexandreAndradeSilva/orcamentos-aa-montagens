import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useEditor } from './estado/editor';
import { ListaOrcamentos } from './telas/ListaOrcamentos';
import { EditorOrcamento } from './telas/EditorOrcamento';
import { NovoOrcamento } from './telas/NovoOrcamento';
import { Clientes } from './telas/Clientes';
import { Servicos } from './telas/Servicos';
import { Configuracoes } from './telas/Configuracoes';
import { Entrar } from './telas/Entrar';
import { SemAcesso } from './telas/SemAcesso';
import { Rodape } from './telas/Rodape';
import { useSessao } from './dados/sessao';
import { useOnline } from './dados/rede';

export function App() {
  const sessao = useSessao();
  const online = useOnline();
  const carregarConfig = useEditor((e) => e.carregarConfig);
  const dentro = sessao.estado === 'dentro';

  useEffect(() => {
    if (dentro) void carregarConfig();
  }, [dentro, carregarConfig]);

  // A porta: sem sessao nao existe app, so a tela de entrar. A protecao de
  // verdade esta nas regras do servidor; isto aqui e so para nao mostrar uma
  // tela vazia esperando dados que nunca vao chegar.
  if (sessao.estado === 'carregando') return <p className="vazio">Carregando…</p>;
  if (sessao.estado === 'fora') return <Entrar />;
  if (sessao.estado === 'sem-acesso') return <SemAcesso email={sessao.email} />;

  return (
    <>
      {!online && (
        <p className="faixa-rede" role="status">
          Sem conexão — nada está sendo salvo. Quando a internet voltar, continue de onde parou.
        </p>
      )}
      <a className="pular" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="barra">
        <span className="barra__marca">
          <img src={`${import.meta.env.BASE_URL}logo-simbolo.svg`} alt="" />
          AA Montagens
        </span>
        <nav aria-label="Seções">
          <NavLink to="/orcamentos">Orçamentos</NavLink>
          <NavLink to="/clientes">Clientes</NavLink>
          <NavLink to="/servicos">Serviços</NavLink>
          <NavLink to="/configuracoes">Configurações</NavLink>
        </nav>
      </header>
      <main id="conteudo" tabIndex={-1}>
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
      <Rodape />
    </>
  );
}
