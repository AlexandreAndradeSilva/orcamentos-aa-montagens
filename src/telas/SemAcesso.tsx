import { sair } from '../dados/sessao';
import { MolduraEntrar } from './Entrar';

/** Autenticou, mas as regras do servidor recusaram: e-mail fora da lista. */
export function SemAcesso({ email }: { email: string }) {
  return (
    <MolduraEntrar>
      <div className="entrar__aviso" role="alert">
        <h1>Esta conta não tem acesso</h1>
        <p>
          <strong>{email}</strong> entrou, mas não está na lista de quem pode usar o app da AA
          Montagens. Se for engano, fale com quem administra o sistema.
        </p>
        <div>
          <button type="button" className="botao" onClick={() => void sair()}>
            Sair e entrar com outra conta
          </button>
        </div>
      </div>
    </MolduraEntrar>
  );
}
