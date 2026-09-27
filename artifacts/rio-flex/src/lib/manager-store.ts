import { useCallback, useEffect, useRef, useState } from 'react';
import { useManagerAuth } from '@/context/ManagerAuthContext';

/**
 * Preferências do gestor guardadas no navegador (favoritos, regras de alerta, estado dos alertas,
 * configuração do telão). São por usuário e por dispositivo; o backend de gestão ainda não tem
 * armazenamento de preferências. `usePersisted` fala com a mesma interface que um storage remoto
 * teria (chave -> valor), então trocar por uma API depois não muda as telas.
 */
const EVENT = 'rf-store-change';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* modo privado / cota cheia: a tela continua funcionando sem persistir */
  }
}

export function usePersisted<T>(key: string, initial: T): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => read(key, initial));
  const ref = useRef(value);
  ref.current = value;

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved = typeof next === 'function' ? (next as (prev: T) => T)(ref.current) : next;
      ref.current = resolved;
      write(key, resolved);
      setValue(resolved);
      window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
    },
    [key],
  );

  useEffect(() => {
    setValue(read(key, initial));
    const onChange = (e: Event) => {
      if ((e as CustomEvent<string>).detail === key) setValue(read(key, initial));
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, set];
}

/** Mesma coisa, mas com a chave isolada por gestor logado. */
export function useManagerPref<T>(name: string, initial: T) {
  const { user } = useManagerAuth();
  return usePersisted<T>(`rf.mgr.${user?.id ?? 'anon'}.${name}`, initial);
}
