/**
 * Geração e download do PDF no navegador.
 *
 * `pdf().toBlob()` do @react-pdf: texto vetorial, sem html2canvas, sem
 * screenshot. O arquivo sai selecionável e leve.
 */
import { pdf } from '@react-pdf/renderer';
import { DocumentoOrcamento, type PropsDocumento } from './Documento';
import { registrarFontes } from './fontes';
import { repositorio } from '../dados/repositorio';
import type { Configuracao, Orcamento } from '../domain/esquemas';
import * as fmt from '../formato';

/** Nome do arquivo: orcamento-001-2026-igreja-portal-perola-2.pdf (D6). */
export function nomeDoArquivo(orcamento: Orcamento): string {
  return fmt.nomeArquivoPdf(orcamento.numero, orcamento.revisao, orcamento.clienteNome);
}

export async function gerarBlob(props: PropsDocumento): Promise<Blob> {
  registrarFontes(`${import.meta.env.BASE_URL}fontes`);
  return pdf(<DocumentoOrcamento {...props} />).toBlob();
}

/** Busca o cliente e gera o PDF do orçamento. */
export async function gerarPdf(orcamento: Orcamento, configuracao: Configuracao): Promise<Blob> {
  const cliente = await repositorio.lerCliente(orcamento.clienteId);
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

export type ResultadoEnvio =
  /** Folha de compartilhamento do celular: PDF + texto foram juntos. */
  | 'compartilhado'
  /** A pessoa fechou a folha sem escolher ninguém. */
  | 'cancelado'
  /** Sem folha com arquivo (computador): PDF baixado e conversa aberta. */
  | 'baixado';

/**
 * Envia PDF e resumo pelo WhatsApp, do jeito que a plataforma permitir.
 *
 * No celular, `navigator.share` com arquivo abre a folha nativa: a pessoa
 * toca no WhatsApp, escolhe a conversa, e o PDF vai com o texto de legenda.
 * E a unica forma de anexar arquivo — o link `wa.me` so carrega texto.
 *
 * No computador nao ha folha com arquivo. Entao baixa o PDF e abre a conversa
 * com o texto; a pessoa arrasta o arquivo para dentro.
 *
 * Detalhe que nao controlo: ao compartilhar arquivo, o WhatsApp do iPhone as
 * vezes descarta o texto e leva so o PDF. E do sistema, nao do app.
 */
export async function enviarPeloWhatsApp(
  orcamento: Orcamento,
  configuracao: Configuracao,
  texto: string,
  linkSemArquivo: string,
): Promise<ResultadoEnvio> {
  const blob = await gerarPdf(orcamento, configuracao);
  const arquivo = new File([blob], nomeDoArquivo(orcamento), { type: 'application/pdf' });
  const titulo = `Orçamento ${orcamento.numero}`;

  const nav = navigator as Navigator & {
    canShare?: (dados: ShareData) => boolean;
    share?: (dados: ShareData) => Promise<void>;
  };

  if (nav.share && nav.canShare?.({ files: [arquivo] })) {
    try {
      await nav.share({ files: [arquivo], text: texto, title: titulo });
      return 'compartilhado';
    } catch (e) {
      // fechar a folha nao e erro
      if (e instanceof Error && e.name === 'AbortError') return 'cancelado';
      throw e;
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = arquivo.name;
  a.click();
  URL.revokeObjectURL(url);
  window.open(linkSemArquivo, '_blank', 'noopener');
  return 'baixado';
}
