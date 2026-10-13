// frontend/src/utils/bienUtils.ts
// Constantes et helpers purs partagés entre les composants du module Biens.

export const ITEMS_PER_PAGE = 9;

// `label` = libellé FR par défaut (consommateurs non encore i18n) ;
// `labelKey` = clé i18n à utiliser via t() dans les composants déjà migrés.
export const LOT_STATUT_CONFIG: Record<string, { label: string; labelKey: string; badge: string; pill: string; dot: string }> = {
  libre:        { label: 'Libre',        labelKey: 'properties.status.libre',        badge: 'bg-green-500', pill: 'bg-green-100 text-green-700',  dot: 'bg-green-500'  },
  disponible:   { label: 'Libre',        labelKey: 'properties.status.libre',        badge: 'bg-green-500', pill: 'bg-green-100 text-green-700',  dot: 'bg-green-500'  },
  loue:         { label: 'Loué',         labelKey: 'properties.status.loue',         badge: 'bg-teal-500',  pill: 'bg-teal-100 text-teal-700',   dot: 'bg-teal-500'   },
  occupe:       { label: 'Loué',         labelKey: 'properties.status.loue',         badge: 'bg-teal-500',  pill: 'bg-teal-100 text-teal-700',   dot: 'bg-teal-500'   },
  reserve:      { label: 'Réservé',      labelKey: 'properties.status.reserve',      badge: 'bg-amber-500', pill: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500'  },
  vendu:        { label: 'Vendu',        labelKey: 'properties.status.vendu',        badge: 'bg-blue-500',  pill: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500'   },
  hors_service: { label: 'Hors service', labelKey: 'properties.status.hors_service', badge: 'bg-gray-400',  pill: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400'   },
};

export const getLotStatut = (statut?: string) =>
  LOT_STATUT_CONFIG[statut?.toLowerCase() ?? ''] ?? LOT_STATUT_CONFIG['disponible'];
