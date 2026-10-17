// frontend/src/utils/edlStatus.ts
// Étapes et libellés d'un état des lieux, partagés par la liste et la fiche (T-072).

export type EdlStatut = 'brouillon' | 'signe' | 'cloture' | 'archive';

// Étapes dans l'ordre (les transitions sont validées côté serveur)
export const EDL_STEPS: { key: EdlStatut; label: string; hint: string }[] = [
    { key: 'brouillon', label: 'Brouillon', hint: 'constats en cours' },
    { key: 'signe', label: 'Signé', hint: 'agent et locataire' },
    { key: 'cloture', label: 'Clôturé', hint: 'plus modifiable' },
    { key: 'archive', label: 'Archivé', hint: 'rangé' },
];

export const stepIndex = (s: string) => Math.max(0, EDL_STEPS.findIndex(x => x.key === s));

export const edlTypeLabel = (type: string) =>
    type === 'entree' ? 'État des lieux d’entrée'
        : type === 'sortie' ? 'État des lieux de sortie'
            : type === 'intermediaire' ? 'Contrôle intermédiaire' : type;

// États d'un élément : 'usager' est la valeur en base de « Moyen » (contrainte CHECK conservée)
export const ITEM_ETATS: { value: string; label: string; pill: string }[] = [
    { value: 'neuf', label: 'Neuf', pill: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100' },
    { value: 'bon', label: 'Bon', pill: 'bg-sky-100 text-sky-900 dark:bg-sky-400/20 dark:text-sky-100' },
    { value: 'usager', label: 'Moyen', pill: 'bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-100' },
    { value: 'mauvais', label: 'Mauvais', pill: 'bg-orange-100 text-orange-900 dark:bg-orange-400/20 dark:text-orange-100' },
    { value: 'hs', label: 'Hors service', pill: 'bg-red-100 text-red-900 dark:bg-red-400/20 dark:text-red-100' },
];
export const itemEtat = (v: string) => ITEM_ETATS.find(e => e.value === v);
