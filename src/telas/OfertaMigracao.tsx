/**
 * A ponte da versao anterior: se este aparelho guardava orcamentos no
 * navegador e a nuvem esta vazia, oferece trazer tudo. Uma vez so — depois
 * de importar, o banco antigo e apagado e a oferta some.
 *
 * So aparece com a nuvem vazia (spec §3.7): com dados la, a numeracao dos
 * dois lados poderia colidir, e ai o caminho certo e o backup por arquivo.
 */
import { useEffect, useState } from 'react';
import type { Backup } from '../domain/esquemas';
import { apagarBancoLocal, lerBancoLocal } from '../dados/migracao-local';
import { repositorio } from '../dados/repositorio';
import { useEditor } from '../estado/editor';

type Situacao =
  | { fase: 'procurando' }
  | { fase: 'nada' }
  | { fase: 'achou'; backup: Backup }
  | { fase: 'trazendo'; backup: Backup }
  | { fase: 'pronto'; quantos: number }
  | { fase: 'erro'; backup: Backup; mensagem: string };

export function OfertaMigracao({ nuvemVazia }: { nuvemVazia: boolean }) {
  const [situacao, setSituacao] = useState<Situacao>({ fase: 'procurando' });

  // So procura no aparelho enquanto a nuvem esta vazia. Depois de trazer, a
  // lista se enche e `nuvemVazia` vira false — mas a fase ja e 'pronto', e o
  // recado fica ate a pessoa sair da tela.
  useEffect(() => {
    if (!nuvemVazia) return;
    let ativo = true;
    void lerBancoLocal().then((backup) => {
      if (ativo) setSituacao(backup ? { fase: 'achou', backup } : { fase: 'nada' });
    });
    return () => {
      ativo = false;
    };
  }, [nuvemVazia]);

  async function trazer(backup: Backup) {
    setSituacao({ fase: 'trazendo', backup });
    try {
      await repositorio.importarTudo(backup, { substituir: false });
      await apagarBancoLocal();
      // a configuracao veio junto (numeracao, padroes): o store precisa reler
      await useEditor.getState().carregarConfig();
      setSituacao({ fase: 'pronto', quantos: backup.orcamentos.length });
    } catch (e) {
      setSituacao({
        fase: 'erro',
        backup,
        mensagem: e instanceof Error ? e.message : 'não foi possível trazer os dados',
      });
    }
  }

  if (situacao.fase === 'procurando' || situacao.fase === 'nada') return null;
  if (!nuvemVazia && situacao.fase !== 'pronto') return null;

  if (situacao.fase === 'pronto') {
    return (
      <p className="recado recado--ok" role="status">
        Pronto: {situacao.quantos} orçamento(s) deste aparelho agora estão na nuvem.
      </p>
    );
  }

  const { backup } = situacao;
  const ocupado = situacao.fase === 'trazendo';
  return (
    <section className="painel doc-bloco oferta-migracao" aria-label="Dados da versão anterior">
      <h2>Encontrei orçamentos guardados neste aparelho</h2>
      <p>
        A versão anterior do app guardava tudo no navegador. Há{' '}
        <strong>{backup.orcamentos.length} orçamento(s)</strong> e{' '}
        <strong>{backup.clientes.length} cliente(s)</strong> aqui que ainda não estão na nuvem.
      </p>
      {situacao.fase === 'erro' && (
        <p className="faixa-erro" role="alert">
          {situacao.mensagem}
        </p>
      )}
      <div className="vazio__acoes">
        <button
          type="button"
          className="botao botao--primario"
          disabled={ocupado}
          onClick={() => void trazer(backup)}
        >
          {ocupado ? 'Trazendo…' : 'Trazer para a nuvem'}
        </button>
      </div>
    </section>
  );
}
