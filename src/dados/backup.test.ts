/**
 * O arquivo de backup: texto para dentro e para fora. O contrato do
 * repositorio (o que e gravado) esta em `contrato.ts`.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { configuracaoPadrao } from './configuracao';
import { backupParaTexto, exportarBackup, importarBackup } from './backup';
import { repositorio, usarRepositorio } from './repositorio';
import { criarRepositorioMemoria } from './memoria';

beforeEach(() => usarRepositorio(criarRepositorioMemoria()));

describe('configuracao padrao', () => {
  it('mantem a grafia do e-mail que veio da planilha (D7)', () => {
    expect(configuracaoPadrao().empresa.email).toBe('aamonstagens@hotmail.com');
  });
});

describe('arquivo de backup', () => {
  it('exporta para texto e reimporta', async () => {
    await repositorio.lerConfiguracao();
    const texto = backupParaTexto(await exportarBackup());
    await repositorio.limparTudo();
    const r = await importarBackup(texto);
    expect(r).toEqual({ clientes: 0, servicos: 0, orcamentos: 0 });
    expect((await repositorio.lerConfiguracao()).empresa.cnpj).toBe('66.612.836/0001-55');
  });

  it('recusa arquivo que nao e JSON', async () => {
    await expect(importarBackup('nao sou json')).rejects.toThrow(/JSON/i);
  });

  it('recusa backup com formato invalido, sem gravar nada pela metade', async () => {
    const ruim = JSON.stringify({ versao: 1, exportadoEm: 'ontem', configuracao: {} });
    await expect(importarBackup(ruim)).rejects.toThrow(/backup inválido|backup invalido/i);
    expect(await repositorio.listarOrcamentos()).toHaveLength(0);
  });
});
