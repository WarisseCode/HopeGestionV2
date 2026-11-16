// frontend/src/utils/pageCache.ts
//
// Mémoire des données des pages de liste (Biens, Propriétaires, Locataires, Baux).
//
// Pourquoi : ces pages rechargeaient tout (4 à 6 requêtes) à chaque visite, avec le
// squelette de chargement, même si on les quittait deux secondes plus tôt. Désormais, à
// l'ouverture, la dernière version connue s'affiche tout de suite, et la page la remplace
// par la version fraîche dès qu'elle arrive (« afficher l'ancien, rafraîchir derrière »).
//
// Sécurité :
//  - mémoire vive de l'onglet uniquement (client React Query, jamais persisté sur disque) ;
//  - rangée par utilisateur connecté (identifiant lu dans le jeton) : un autre compte
//    ouvert dans le même onglet ne relit jamais ces données ;
//  - vidée à la déconnexion (authApi.logoutUser) ;
//  - le serveur revérifie les droits à chaque rafraîchissement : le cache ne montre que ce
//    que le serveur a déjà accepté d'envoyer à cet utilisateur.
import { queryClient } from '../api/queryClient';
import { getToken } from '../api/authApi';

/** Identifiant de l'utilisateur du jeton courant ('anon' si absent ou illisible). */
function currentUserScope(): string {
  const token = getToken();
  if (!token) return 'anon';
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { id } = JSON.parse(atob(payload));
    return id !== undefined && id !== null ? String(id) : 'anon';
  } catch {
    return 'anon';
  }
}

const keyFor = (page: string) => ['page-cache', page, currentUserScope()];

/** Dernière version connue des données de la page, pour l'utilisateur connecté. */
export function readPageCache<T>(page: string): T | undefined {
  if (currentUserScope() === 'anon') return undefined;
  return queryClient.getQueryData<T>(keyFor(page));
}

/** Mémorise la version fraîche des données de la page. */
export function writePageCache<T>(page: string, data: T): void {
  if (currentUserScope() === 'anon') return;
  queryClient.setQueryData<T>(keyFor(page), data);
}

/** Vide toute la mémoire des pages (déconnexion). */
export function clearPageCache(): void {
  queryClient.removeQueries({ queryKey: ['page-cache'] });
}
