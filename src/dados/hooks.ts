/**
 * Leitura reativa do repositorio para as telas — o que o `useLiveQuery` do
 * Dexie fazia, agora sobre a interface.
 *
 * `undefined` enquanto o primeiro valor nao chegou (as telas ja tratam isso
 * como "carregando").
 */
import { useEffect, useRef, useState } from 'react';
import type { Cliente, Orcamento, Servico } from '../domain/esquemas';
import { repositorio, type Cancelar, type Ouvinte } from './repositorio';

type Inscrever<T> = (ouvinte: Ouvinte<T>) => Cancelar;

/**
 * Inscreve em `inscrever` enquanto `chave` nao muda.
 *
 * A funcao e lida por ref para nao reinscrever a cada render — a chave e
 * quem diz quando a consulta mudou. O valor guardado leva a chave junto,
 * para nao mostrar o resultado da consulta anterior enquanto a nova carrega.
 */
function useObservado<T>(inscrever: Inscrever<T>, chave: string): T | undefined {
  const [estado, setEstado] = useState<{ chave: string; valor: T } | null>(null);
  const atual = useRef(inscrever);

  useEffect(() => {
    atual.current = inscrever;
  });

  useEffect(() => atual.current((valor) => setEstado({ chave, valor })), [chave]);

  return estado?.chave === chave ? estado.valor : undefined;
}

/** Todos os orcamentos, do mais recente para o mais antigo. */
export function useOrcamentos(): Orcamento[] | undefined {
  return useObservado(repositorio.observarOrcamentos, 'orcamentos');
}

/** Todos os clientes, por nome. */
export function useClientes(): Cliente[] | undefined {
  return useObservado(repositorio.observarClientes, 'clientes');
}

/** O catalogo, do mais usado para o menos. */
export function useServicos(): Servico[] | undefined {
  return useObservado(repositorio.observarServicos, 'servicos');
}

/** Um cliente pelo id; `undefined` sem id, carregando ou inexistente. */
export function useCliente(id: string | undefined): Cliente | undefined {
  return useObservado<Cliente | undefined>(
    (ouvinte) => (id === undefined ? () => undefined : repositorio.observarCliente(id, ouvinte)),
    `cliente:${id ?? ''}`,
  );
}
