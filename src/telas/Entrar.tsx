/**
 * A porta do app. Sem sessao, e a unica tela que existe.
 *
 * E-mail + senha (spec §2): funciona no navegador e no app instalado na tela
 * de inicio do celular, onde login por janela/redirecionamento falha.
 *
 * Duas metades: a marca, no azul da AA Montagens, e o formulario, no papel.
 * No celular a marca vira a faixa de cima. `MolduraEntrar` e compartilhada
 * com a tela de "sem acesso", para as duas serem a mesma porta.
 */
import { useState, type ReactNode } from 'react';
import { entrar, mensagemDoErro, pedirNovaSenha } from '../dados/sessao';
import { Rodape } from './Rodape';
import './formulario.css';
import './entrar.css';

export function MolduraEntrar({ children }: { children: ReactNode }) {
  return (
    <div className="entrar">
      <aside className="entrar__marca" aria-hidden="true">
        {/* mascara CSS, e nao <img>: a logo mono usa currentColor, que <img> nao herda */}
        <div
          className="entrar__logo"
          style={{ ['--logo' as string]: `url(${import.meta.env.BASE_URL}logo-mono.svg)` }}
        />
        <div className="entrar__marca-texto">
          <p className="entrar__sobrelinha">AA Montagens</p>
          <p className="entrar__titulo-marca">Orçamentos</p>
          <p className="entrar__descricao">Estruturas metálicas · Birigui, SP</p>
        </div>
        <p className="entrar__rodape">Sistema interno · acesso restrito</p>
      </aside>
      <main className="entrar__painel">
        <div className="entrar__centro">{children}</div>
        <Rodape />
      </main>
    </div>
  );
}

export function Entrar() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [recado, setRecado] = useState<string | null>(null);

  async function enviar() {
    setOcupado(true);
    setErro(null);
    setRecado(null);
    try {
      await entrar(email, senha);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setOcupado(false);
    }
  }

  async function esqueci() {
    setErro(null);
    setRecado(null);
    if (email.trim() === '') {
      setErro('Digite o e-mail acima para receber o link de nova senha.');
      return;
    }
    setOcupado(true);
    try {
      await pedirNovaSenha(email);
      setRecado(`Enviamos um link para ${email.trim()}. Confira a caixa de entrada (e o spam).`);
    } catch (e) {
      setErro(mensagemDoErro(e));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <MolduraEntrar>
      <form
        className="entrar__form"
        onSubmit={(ev) => {
          ev.preventDefault();
          void enviar();
        }}
      >
        <h1 className="entrar__titulo">Entrar</h1>
        <p className="entrar__nota">Use o e-mail e a senha cadastrados.</p>

        <label className="campo-envolve">
          <span className="rotulo">E-mail</span>
          <input
            className="campo entrar__campo"
            type="email"
            autoComplete="username"
            inputMode="email"
            autoFocus
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
          />
        </label>
        <label className="campo-envolve">
          <span className="rotulo">Senha</span>
          <input
            className="campo entrar__campo"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(ev) => setSenha(ev.target.value)}
          />
        </label>

        {erro && (
          <p className="faixa-erro" role="alert">
            {erro}
          </p>
        )}
        {recado && (
          <p className="recado recado--ok" role="status">
            {recado}
          </p>
        )}

        <button type="submit" className="botao botao--primario entrar__botao" disabled={ocupado}>
          {ocupado ? 'Entrando…' : 'Entrar'}
        </button>
        <button
          type="button"
          className="botao botao--texto entrar__esqueci"
          disabled={ocupado}
          onClick={() => void esqueci()}
        >
          Esqueci a senha
        </button>
      </form>
    </MolduraEntrar>
  );
}
