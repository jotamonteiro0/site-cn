/**
 * Utilitário seguro para acesso ao localStorage.
 * Previne falhas fatais de renderização (SecurityError / DOMException)
 * em navegadores com restrição de cookies, modo anônimo estrito
 * ou contextos de preview isolados (Vercel Preview / iframes).
 */

export const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return null;
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      window.localStorage.setItem(key, value);
    } catch {
      // Falha silenciosa em quota excedida ou restrição de segurança
    }
  },

  removeItem: (key: string): void => {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      window.localStorage.removeItem(key);
    } catch {
      // Falha silenciosa
    }
  },
};
