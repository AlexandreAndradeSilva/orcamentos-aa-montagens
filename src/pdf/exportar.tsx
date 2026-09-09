/**
 * Geração e download do PDF no navegador.
 *
 * `pdf().toBlob()` do @react-pdf: texto vetorial, sem html2canvas, sem
 * screenshot. O arquivo sai selecionável e leve.
 */
import { pdf } from '@react-pdf/renderer';
import { DocumentoOrcamento, type PropsDocumento } from './Documento';
import { registrarFontes } from './fontes';
import { db } from '../dados/db';
import type { Configuracao, Orcamento } from '../domain/esquemas';
import * as fmt from '../formato';

/** Nome do arquivo: orcamento-001-2026-igreja-portal-perola-2.pdf (D6). */
export function nomeDoArquivo(orcamento: Orcamento): string {
  return fmt.nomeArquivoPdf(orcamento.numero, orcamento.revisao, orcamento.clienteNome);
}

export async function gerarBlob(props: PropsDocumento): Promise<Blob> {
  registrarFontes('/fontes');
  return pdf(<DocumentoOrcamento {...props} />).toBlob();
}

/** Busca o cliente e gera o PDF do orçamento. */
export async function gerarPdf(orcamento: Orcamento, configuracao: Configuracao): Promise<Blob> {
  const cliente = await db.clientes.get(orcamento.clienteId);
  return gerarBlob({
    orcamento,
    configuracao,
    ...(cliente
      ? {
          cliente: {
            cnpjCpf: cliente.cnpjCpf,
            ieRg: cliente.ieRg,
            endereco: cliente.endereco,
            cidade: cliente.cidade,
            cep: cliente.cep,
            telefone: cliente.telefone,
            email: cliente.email,
            contato: cliente.contato,
          },
        }
      : {}),
  });
}

/** Gera e baixa. */
export async function baixarPdf(orcamento: Orcamento, configuracao: Configuracao): Promise<void> {
  const blob = await gerarPdf(orcamento, configuracao);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomeDoArquivo(orcamento);
  a.click();
  URL.revokeObjectURL(url);
}
