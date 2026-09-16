/**
 * A porta do app. Sem sessao, e a unica tela que existe.
 *
 * E-mail + senha (spec §2): funciona no navegador e no app instalado na tela
 * de inicio do celular, onde login por janela/redirecionamento falha.
 */
import { useState } from 'react';
import { entrar, mensagemDoErro, pedirNovaSenha } from '../dados/sessao';
import './formulario.css';
import './entrar.css';

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
    <div className="entrar">
      <form
        className="entrar__cartao painel"
        onSubmit={(ev) => {
          ev.preventDefault();
          void enviar();
        }}
      >
        <img className="entrar__logo" src={`${import.meta.env.BASE_URL}logo-simbolo.svg`} alt="" />
        <h1>Orçamentos AA Montagens</h1>
        <p className="entrar__nota">Entre com o e-mail e a senha da oficina.</p>

        <label className="campo-envolve">
          <span className="rotulo">E-mail</span>
          <input
            className="campo"
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
            className="campo"
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

        <div className="entrar__acoes">
          <button type="submit" className="botao botao--primario" disabled={ocupado}>
            {ocupado ? 'Entrando…' : 'Entrar'}
          </button>
          <button
            type="button"
            className="botao botao--texto"
            disabled={ocupado}
            onClick={() => void esqueci()}
          >
            Esqueci a senha
          </button>
        </div>
      </form>
    </div>
  );
}
