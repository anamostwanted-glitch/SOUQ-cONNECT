import { useState, useEffect } from 'react';
import { handleAiError } from '../../core/utils/errorHandling';

export function usePersistedState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      handleAiError(error, `usePersistedState:get:${key}`, false);
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      handleAiError(error, `usePersistedState:set:${key}`, false);
    }
  }, [key, state]);

  return [state, setState] as const;
}
