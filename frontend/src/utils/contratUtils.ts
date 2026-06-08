import type { CreateLocationData } from '../api/locationApi';

// statut optionnel : l'impl gère déjà undefined (optional chaining + fallback),
// et certains appelants passent un statut potentiellement absent (ex. tickets).
export const statutBadge = (statut?: string): string => {
  const map: Record<string, string> = {
    actif:    'badge-success',
    signe:    'badge-info',
    resilie:  'badge-error',
    expire:   'badge-error',
    en_cours: 'badge-warning',
    termine:  'badge-neutral',
    ouvert:   'badge-warning',
    ferme:    'badge-neutral',
  };
  return map[statut?.toLowerCase() ?? ''] ?? 'badge-ghost';
};

export const formatMontant = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
};

export const EMPTY_FORM: CreateLocationData & { owner_id: number } = {
  type_contrat:       'location',
  tenant_id:          0,
  lot_id:             0,
  owner_id:           0,
  date_debut:         '',
  date_fin:           '',
  duree_contrat:      12,
  loyer_mensuel:      0,
  prix_vente:         0,
  caution:            0,
  avance:             0,
  charges_mensuelles: 0,
  devise:             'XOF',
};
