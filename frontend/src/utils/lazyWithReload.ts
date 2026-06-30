// frontend/src/utils/lazyWithReload.ts
// Enveloppe React.lazy pour gérer les chunks périmés après un redéploiement.
//
// Pourquoi : Vite nomme les chunks avec un hash (ex. Parametres-DkHqaFiX.js) qui
// change à chaque build. Après un déploiement, un onglet ouvert sur l'ancienne
// index.html — ou un cache navigateur/CDN — référence un chunk qui n'existe plus
// sur le serveur → 404 → "Failed to fetch dynamically imported module".
//
// Stratégie : au premier échec d'import, on force UN SEUL rechargement complet de
// la page pour récupérer la nouvelle index.html (et donc les bons hash). Un drapeau
// en sessionStorage évite toute boucle de reload : si l'échec persiste après le
// rechargement (vrai 404, réseau coupé...), on relaie l'erreur à l'ErrorBoundary.

import React from 'react';

const RELOAD_FLAG = 'chunk-reload-attempted';

export function lazyWithReload<T extends React.ComponentType<any>>(
    factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
    return React.lazy(async () => {
        try {
            const component = await factory();
            // Import réussi : on efface le drapeau pour réautoriser un reload
            // lors d'un futur déploiement.
            window.sessionStorage.removeItem(RELOAD_FLAG);
            return component;
        } catch (err) {
            const alreadyTried = window.sessionStorage.getItem(RELOAD_FLAG);
            if (!alreadyTried) {
                window.sessionStorage.setItem(RELOAD_FLAG, '1');
                window.location.reload();
                // Promesse jamais résolue : on "gèle" le rendu le temps que le
                // rechargement de la page prenne le relais.
                return new Promise<{ default: T }>(() => {});
            }
            // Déjà rechargé une fois et ça échoue encore → vrai problème,
            // on laisse l'ErrorBoundary afficher l'écran d'erreur.
            throw err;
        }
    });
}
