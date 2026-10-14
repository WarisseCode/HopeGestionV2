// frontend/src/hooks/useCreateFromUrl.ts
// Ouverture directe du formulaire de création d'une page de liste via l'URL (?action=nouveau),
// utilisée par les « Actions rapides » du tableau de bord. Le paramètre est consommé puis retiré
// de l'URL (remplacement d'historique) : retour arrière ou rafraîchissement ne rouvrent pas le formulaire.
import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIsPresent } from 'framer-motion';

export const CREATE_ACTION_PARAM = 'action';
export const CREATE_ACTION_VALUE = 'nouveau';

/** Lien vers une page de liste avec ouverture directe de son formulaire de création. */
export const withCreateAction = (path: string): string =>
  `${path}?${CREATE_ACTION_PARAM}=${CREATE_ACTION_VALUE}`;

/**
 * @param ready  vrai quand la page peut décider (droits connus, données nécessaires chargées)
 * @param open   ouvre le formulaire — mêmes règles que le bouton « Nouveau » de la page
 */
export function useCreateFromUrl(ready: boolean, open: () => void): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get(CREATE_ACTION_PARAM) === CREATE_ACTION_VALUE;
  // Les layouts animent les changements de page (AnimatePresence, mode « wait ») : pendant la sortie
  // de l'ancienne page, son conteneur rend déjà la nouvelle route, qui est donc montée une première
  // fois puis remontée. Seule l'instance définitive (présente) consomme le paramètre, sinon il serait
  // retiré par l'instance éphémère et la page finale s'afficherait sans formulaire.
  const isPresent = useIsPresent();
  // Une seule ouverture par demande, même si l'effet est rejoué (StrictMode en développement)
  // avant que le retrait du paramètre n'ait été appliqué.
  const handledRef = useRef(false);

  useEffect(() => {
    if (!requested) { handledRef.current = false; return; }
    if (!ready || !isPresent || handledRef.current) return;
    handledRef.current = true;
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete(CREATE_ACTION_PARAM);
      return next;
    }, { replace: true });
    open();
    // Une fois le paramètre retiré, `requested` repasse à faux : pas de réouverture aux rendus suivants.
  }, [requested, ready, isPresent, open, setSearchParams]);
}
