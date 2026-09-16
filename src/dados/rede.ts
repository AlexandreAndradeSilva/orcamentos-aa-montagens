import { useSyncExternalStore } from 'react';

function inscrever(ouvinte: () => void): () => void {
  window.addEventListener('online', ouvinte);
  window.addEventListener('offline', ouvinte);
  return () => {
    window.removeEventListener('online', ouvinte);
    window.removeEventListener('offline', ouvinte);
  };
}

/** `navigator.onLine` reativo. Sem rede, nada e salvo — e o app diz isso. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    inscrever,
    () => navigator.onLine,
    () => true,
  );
}
