import type { KeyboardEvent } from 'react';

// Motif onglets (activation automatique) : flèches gauche/droite (en boucle), Début/Fin déplacent
// le focus et l'onglet actif ; le tabindex itinérant (0 sur l'onglet actif, -1 ailleurs) est posé par
// l'appelant, Tab sort donc de la liste. Extrait d'Alertes (T-054a) pour servir aussi à Interventions (T-054b).
export function handleTabListKeyDown<T extends string>(
  e: KeyboardEvent<HTMLElement>,
  order: readonly T[],
  active: T,
  setActive: (tab: T) => void,
  tabId: (tab: T) => string,
) {
  const i = order.indexOf(active);
  const next = e.key === 'ArrowRight' ? order[(i + 1) % order.length]
    : e.key === 'ArrowLeft' ? order[(i - 1 + order.length) % order.length]
    : e.key === 'Home' ? order[0]
    : e.key === 'End' ? order[order.length - 1]
    : null;
  if (!next) return;
  e.preventDefault();
  setActive(next);
  document.getElementById(tabId(next))?.focus();
}
