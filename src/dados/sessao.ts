/**
 * A sessao: quem esta logado, entrar, sair, esquecer a senha.
 *
 * Encapsula o Firebase Auth para as telas nao importarem o SDK. `sem-acesso`
 * e o estado de quem autenticou mas as regras recusaram (e-mail fora da
 * lista): o Firestore avisa por `marcarSemAcesso()` e a tela mostra o motivo.
 */
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type Auth,
} from 'firebase/auth';
import { useSyncExternalStore } from 'react';
import { auth as authPadrao } from './firebase';

export type Sessao =
  | { estado: 'carregando' }
  | { estado: 'fora' }
  | { estado: 'dentro'; email: string }
  | { estado: 'sem-acesso'; email: string };

let atual: Sessao = { estado: 'carregando' };
const ouvintes = new Set<() => void>();
let inscrito = false;
let obterAuth: () => Auth = authPadrao;

function definir(s: Sessao) {
  atual = s;
  for (const o of ouvintes) o();
}

/** Nos testes, troca o Auth por um simulado. */
export function usarAuth(fabrica: () => Auth): void {
  obterAuth = fabrica;
  inscrito = false;
}

function garantirInscricao() {
  if (inscrito) return;
  inscrito = true;
  onAuthStateChanged(obterAuth(), (usuario) => {
    definir(usuario?.email ? { estado: 'dentro', email: usuario.email } : { estado: 'fora' });
  });
}

export function lerSessao(): Sessao {
  garantirInscricao();
  return atual;
}

export function observarSessao(ouvinte: () => void): () => void {
  garantirInscricao();
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/** Hook para as telas. */
export function useSessao(): Sessao {
  return useSyncExternalStore(observarSessao, lerSessao);
}

/** Chamado pelo repositorio quando o servidor recusa (permission-denied). */
export function marcarSemAcesso(): void {
  if (atual.estado === 'dentro') definir({ estado: 'sem-acesso', email: atual.email });
}

const MENSAGENS: Record<string, string> = {
  'auth/invalid-credential': 'E-mail ou senha errados.',
  'auth/wrong-password': 'E-mail ou senha errados.',
  'auth/user-not-found': 'E-mail ou senha errados.',
  'auth/invalid-email': 'Esse e-mail não parece válido.',
  'auth/too-many-requests': 'Muitas tentativas. Espere alguns minutos e tente de novo.',
  'auth/network-request-failed': 'Sem internet. Confira a conexão e tente de novo.',
  'auth/user-disabled': 'Esta conta foi desativada.',
};

/** Traduz o erro do Firebase para gente. */
export function mensagemDoErro(erro: unknown): string {
  const codigo = (erro as { code?: string } | null)?.code ?? '';
  return MENSAGENS[codigo] ?? 'Não foi possível entrar. Tente de novo.';
}

export async function entrar(email: string, senha: string): Promise<void> {
  await signInWithEmailAndPassword(obterAuth(), email.trim(), senha);
}

export async function sair(): Promise<void> {
  await signOut(obterAuth());
  definir({ estado: 'fora' });
}

export async function pedirNovaSenha(email: string): Promise<void> {
  await sendPasswordResetEmail(obterAuth(), email.trim());
}
