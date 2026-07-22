// frontend/src/components/CookieConsentBanner.tsx
// Bandeau affiché tant que l'utilisateur n'a pas fait de choix. Le cookie strictement
// nécessaire (refreshToken, authentification) reste actif quoi qu'il arrive — ce bandeau ne
// contrôle que les catégories optionnelles (analytics/marketing), non utilisées aujourd'hui
// mais préparées pour un ajout futur (cf. utils/cookieConsent.ts).
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { getCookieConsent, setCookieConsent } from '../utils/cookieConsent';

const CookieConsentBanner: React.FC = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        setVisible(getCookieConsent() === null);
    }, []);

    const acceptAll = () => {
        setCookieConsent({ analytics: true, marketing: true });
        setVisible(false);
    };

    const rejectOptional = () => {
        setCookieConsent({ analytics: false, marketing: false });
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 inset-x-0 z-[90] p-4 pointer-events-none">
            <div className="max-w-3xl mx-auto bg-base-100 border border-base-300 rounded-2xl shadow-xl p-5 flex flex-col md:flex-row items-start md:items-center gap-4 pointer-events-auto">
                <Cookie className="text-primary shrink-0" size={28} />
                <p className="text-sm text-base-content/80 flex-1">
                    Nous utilisons un cookie strictement nécessaire à votre connexion (pas de
                    consentement requis pour celui-ci). Nous n'utilisons aujourd'hui aucun cookie
                    de mesure d'audience ou publicitaire ; si nous en ajoutons, votre choix ici sera
                    respecté. Détails dans notre{' '}
                    <Link to="/cgu" className="text-primary hover:underline">politique de cookies</Link>.
                </p>
                <div className="flex gap-2 shrink-0 w-full md:w-auto">
                    <button
                        type="button"
                        onClick={rejectOptional}
                        className="flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-semibold border border-base-300 text-base-content/70 hover:bg-base-200 transition-colors"
                    >
                        Refuser les optionnels
                    </button>
                    <button
                        type="button"
                        onClick={acceptAll}
                        className="flex-1 md:flex-none px-4 py-2 rounded-xl text-sm font-bold bg-primary text-primary-content hover:bg-primary/90 transition-colors"
                    >
                        Tout accepter
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CookieConsentBanner;
