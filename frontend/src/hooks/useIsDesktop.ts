// frontend/src/hooks/useIsDesktop.ts
// Vrai à partir de 1024 px de fenêtre. Abonnement à la media query (useSyncExternalStore) :
// pas de setState dans un effet, et la valeur suit le passage mobile ↔ bureau.
import { useSyncExternalStore } from 'react';

const DESKTOP_QUERY = '(min-width: 1024px)';
export const isDesktop = () => typeof window !== 'undefined' && window.matchMedia(DESKTOP_QUERY).matches;

export const useIsDesktop = () => useSyncExternalStore(
  (cb) => { const m = window.matchMedia(DESKTOP_QUERY); m.addEventListener('change', cb); return () => m.removeEventListener('change', cb); },
  isDesktop,
  () => false,
);

