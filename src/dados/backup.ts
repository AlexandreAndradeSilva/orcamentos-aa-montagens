/**
 * Backup completo em JSON: exportar, conferir e importar.
 *
 * A importacao passa pelo zod antes de encostar no banco. Arquivo invalido
 * nao entra pela metade. Quem grava e o `repositorio` — este modulo so
 * cuida do arquivo.
 */
import { repositorio } from './repositorio';
import { zBackup, type Backup } from '../domain/esquemas';

export function exportarBackup(): Promise<Backup> {
  return repositorio.exportarTudo();
}

/** Serializa o backup com quebra de linha, para o arquivo ficar legivel. */
export function backupParaTexto(backup: Backup): string {
  return `${JSON.stringify(backup, null, 2)}\n`;
}

export interface ResultadoImportacao {
  clientes: number;
  servicos: number;
  orcamentos: number;
}

/**
 * Le, valida e grava.
 *
 * `substituir` apaga o que existe antes de gravar. Sem ele, o backup e
 * mesclado por id (o do arquivo vence em caso de colisao).
 */
export async function importarBackup(
  texto: string,
  { substituir = false }: { substituir?: boolean } = {},
): Promise<ResultadoImportacao> {
  let bruto: unknown;
  try {
    bruto = JSON.parse(texto);
  } catch {
    throw new Error('o arquivo nao e um JSON valido');
  }

  const analise = zBackup.safeParse(bruto);
  if (!analise.success) {
    const primeiro = analise.error.issues[0];
    const onde = primeiro?.path.join('.') ?? 'raiz';
    throw new Error(`backup invalido em "${onde}": ${primeiro?.message ?? 'formato inesperado'}`);
  }
  const backup = analise.data;

  await repositorio.importarTudo(backup, { substituir });

  return {
    clientes: backup.clientes.length,
    servicos: backup.servicos.length,
    orcamentos: backup.orcamentos.length,
  };
}

/** Dispara o download do backup no navegador. */
export function baixarBackup(backup: Backup): void {
  const blob = new Blob([backupParaTexto(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-aa-montagens-${backup.exportadoEm.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
