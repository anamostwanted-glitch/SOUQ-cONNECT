import { useState, useEffect } from 'react';
import { handleAiError } from '../../core/utils/errorHandling';

export function usePersistedState<T>(key: string, initialValue: T) {
  const [state, setState] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;
      const parsed = JSON.parse(item);
      return (parsed === null || parsed === undefined) ? initialValue : parsed;
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
