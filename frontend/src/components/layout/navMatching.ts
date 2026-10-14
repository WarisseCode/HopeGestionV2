// frontend/src/components/layout/navMatching.ts
// Logique commune « lien actif » + fil d'Ariane des 3 layouts (gestionnaire, propriétaire, locataire).
// Une seule règle : l'élément de menu actif est celui dont la cible correspond le mieux à l'URL,
// et le fil d'Ariane affiche le libellé de ce même élément (une seule source de vérité : le menu).

/** Accueils de rôle vers lesquels redirige /dashboard (cf. UserDashboardRedirect). */
const ROLE_HOME_RE = /^\/dashboard\/(gestionnaire|manager|locataire|proprietaire)(\/|$)/;

/** Vrai sur /dashboard (avant redirection) et sur l'accueil réel du rôle (/dashboard/gestionnaire…). */
export const isDashboardHome = (pathname: string): boolean =>
  pathname === '/dashboard' || pathname === '/dashboard/' || ROLE_HOME_RE.test(pathname);

const isHomeTarget = (path: string): boolean =>
  path === '/dashboard' || path === '/dashboard/' || ROLE_HOME_RE.test(path);

/**
 * Score de correspondance d'une cible de lien (« /dashboard/biens », « /dashboard/locataire#logement »)
 * avec l'URL courante ; -1 = pas de correspondance. Plus le segment correspondant est long, plus le
 * score est élevé ; une ancre (#…) identique l'emporte sur la même page sans ancre.
 */
const matchScore = (target: string, pathname: string, hash: string): number => {
  const [path, anchor] = target.split('#');
  let score: number;
  if (isHomeTarget(path)) {
    score = isDashboardHome(pathname) ? 1 : -1;
  } else {
    const base = path.replace(/\/+$/, '');
    score = pathname === base || pathname.startsWith(`${base}/`) ? base.length : -1;
  }
  if (score < 0) return -1;
  if (anchor) return hash === `#${anchor}` ? score + 10_000 : -1;
  return score;
};

/** Index de l'unique élément actif parmi `targets` (premier en cas d'égalité), ou -1. */
export const pickActiveIndex = (targets: string[], pathname: string, hash = ''): number => {
  let best = -1;
  let bestScore = -1;
  targets.forEach((target, i) => {
    const s = matchScore(target, pathname, hash);
    if (s > bestScore) { best = i; bestScore = s; }
  });
  return best;
};

/**
 * Libellés des routes accessibles mais absentes du menu du rôle courant (clés i18n du menu,
 * réutilisées telles quelles). Utilisé seulement si aucun élément du menu ne correspond.
 */
const ROUTE_FALLBACK_KEYS: Record<string, string> = {
  '/dashboard/biens': 'nav.parcImmobilier',
  '/dashboard/locataires': 'nav.locataires',
  '/dashboard/locations': 'nav.bauxLocations',
  '/dashboard/contrats': 'nav.contrats',
  '/dashboard/inventories': 'nav.inventaires',
  '/dashboard/etats-des-lieux': 'nav.etatsDesLieux',
  '/dashboard/reservations': 'nav.reservations',
  '/dashboard/proprietaires': 'nav.proprietaires',
  '/dashboard/finances': 'nav.financesItem',
  '/dashboard/quittances': 'nav.quittances',
  '/dashboard/mobile-money': 'nav.mobileMoney',
  '/dashboard/paiements-loyer': 'nav.payerEnLigne',
  '/dashboard/documents': 'nav.documents',
  '/dashboard/calendrier': 'nav.calendrier',
  '/dashboard/tasks': 'nav.taches',
  '/dashboard/interventions': 'nav.interventions',
  '/dashboard/rapports': 'nav.rapports',
  '/dashboard/corbeille': 'nav.corbeille',
  '/dashboard/carnet': 'nav.carnet',
  '/dashboard/alertes': 'nav.alertes',
  '/dashboard/abonnement': 'nav.abonnement',
  '/dashboard/parametres': 'nav.parametres',
  '/dashboard/mon-compte': 'nav.monProfil',
};

/** Libellé lisible d'une sous-page (au lieu de l'identifiant numérique brut). */
const subPageKey = (rest: string[]): string => {
  if (rest.includes('compare')) return 'nav.sub.compare';
  const last = rest[rest.length - 1];
  if (last === 'new' || last === 'nouveau') return 'nav.sub.new';
  if (last === 'edit') return 'nav.sub.edit';
  if (last === 'signer') return 'nav.sub.sign';
  return 'nav.sub.detail';
};

export interface NavTarget {
  path: string;   // cible complète du lien, ex. « /dashboard/biens »
  label: string;  // libellé déjà traduit, tel qu'affiché dans le menu
}

export interface Crumb {
  label: string;
  to?: string;    // lien si l'élément n'est pas la page courante
}

/**
 * Fil d'Ariane de la page courante, sans la racine (« Bureau » / « Portail … ») :
 * - page du menu → [libellé du menu] ; accueil → [] (ou [libellé] si `keepHome`) ;
 * - sous-page (/locataires/51, /inventories/new…) → [libellé parent (lien), Détail/Nouveau…].
 */
export const resolveBreadcrumb = (
  items: NavTarget[],
  pathname: string,
  hash: string,
  t: (key: string) => string,
  keepHome = false,
): Crumb[] => {
  const idx = pickActiveIndex(items.map(i => i.path), pathname, hash);
  let base: string | null = null;
  let label: string | null = null;
  if (idx >= 0) {
    const item = items[idx];
    if (isHomeTarget(item.path.split('#')[0])) {
      return keepHome || item.path.includes('#') ? [{ label: item.label }] : [];
    }
    base = item.path.split('#')[0].replace(/\/+$/, '');
    label = item.label;
  } else {
    const fallback = Object.keys(ROUTE_FALLBACK_KEYS)
      .filter(p => pathname === p || pathname.startsWith(`${p}/`))
      .sort((a, b) => b.length - a.length)[0];
    if (fallback) { base = fallback; label = t(ROUTE_FALLBACK_KEYS[fallback]); }
  }
  if (base === null || label === null) {
    // Route inconnue de toutes les tables : dernier segment lisible (tous les tirets remplacés).
    const seg = pathname.split('/').filter(Boolean).pop() ?? '';
    return seg ? [{ label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' ') }] : [];
  }
  const rest = pathname.slice(base.length).split('/').filter(Boolean);
  if (rest.length === 0) return [{ label }];
  return [{ label, to: base }, { label: t(subPageKey(rest)) }];
};
