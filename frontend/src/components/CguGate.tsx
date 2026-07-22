// frontend/src/components/CguGate.tsx
// Garde-fou de consentement CGU : bloque l'accès au dashboard tant que l'utilisateur connecté
// n'a pas accepté la version en vigueur. Couvre uniformément l'inscription directe,
// l'acceptation d'invitation, Google OAuth et les comptes déjà existants (un seul point
// d'application, pas de case à cocher dupliquée à chaque formulaire de création de compte).
// Mêmes principes que MaintenanceWrapper.tsx (fail-open en cas d'erreur réseau, pas de flash
// de contenu pendant le chargement).
import React, { useEffect, useState } from 'react';
import { apiCall } from '../utils/apiUtils';
import { API_URL } from '../config';
import CguArticles from './legal/CguArticles';
import { Check, ShieldCheck } from 'lucide-react';

interface CguGateProps {
    children: React.ReactNode;
}

const CguGate: React.FC<CguGateProps> = ({ children }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [needsAcceptance, setNeedsAcceptance] = useState(false);
    const [currentVersion, setCurrentVersion] = useState<string | null>(null);
    const [checked, setChecked] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const token = localStorage.getItem('userToken');
                if (!token) { setIsLoading(false); return; }

                let isAdmin = false;
                try {
                    const payload = JSON.parse(atob(token.split('.')[1]));
                    isAdmin = payload.role === 'admin';
                } catch (e) {
                    console.error('Error parsing token:', e);
                }
                // Le personnel interne (admin) n'est pas soumis au consentement CGU des utilisateurs.
                if (isAdmin) { setIsLoading(false); return; }

                const data = await apiCall<{ accepted: boolean; currentVersion: string }>(`${API_URL}/cgu/status`);
                setNeedsAcceptance(!data.accepted);
                setCurrentVersion(data.currentVersion);
            } catch (error) {
                console.error('Error checking CGU status:', error);
                // En cas d'erreur réseau, on ne bloque pas l'accès (fail-open, cf. MaintenanceWrapper).
                setNeedsAcceptance(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkStatus();
    }, []);

    const handleAccept = async () => {
        if (!checked || !currentVersion) return;
        setSubmitting(true);
        try {
            await apiCall(`${API_URL}/cgu/accept`, {
                method: 'POST',
                body: JSON.stringify({ version: currentVersion }),
            });
            setNeedsAcceptance(false);
        } catch (error) {
            console.error('Error accepting CGU:', error);
        } finally {
            setSubmitting(false);
        }
    };

    if (isLoading) return null;

    if (needsAcceptance) {
        return (
            <div className="fixed inset-0 z-[100] bg-base-200 flex items-center justify-center p-4">
                <div className="bg-base-100 rounded-2xl shadow-xl border border-base-200 w-full max-w-2xl max-h-[90vh] flex flex-col">
                    <div className="p-6 border-b border-base-200 flex items-center gap-3">
                        <ShieldCheck className="text-primary shrink-0" size={28} />
                        <div>
                            <h1 className="text-lg font-bold text-base-content">Mise à jour de nos Conditions Générales d'Utilisation</h1>
                            <p className="text-sm text-base-content/60">Merci de les relire et de les accepter pour continuer.</p>
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 px-6 py-4 text-sm">
                        <CguArticles />
                    </div>

                    <div className="p-6 border-t border-base-200 space-y-4">
                        <label className="flex items-start gap-2.5 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => setChecked(e.target.checked)}
                                className="mt-0.5 w-4 h-4 accent-primary shrink-0"
                            />
                            <span className="text-base-content/80">
                                J'ai lu et j'accepte les Conditions Générales d'Utilisation.
                            </span>
                        </label>
                        <button
                            type="button"
                            onClick={handleAccept}
                            disabled={!checked || submitting}
                            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-content font-bold hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Check size={18} /> {submitting ? 'Enregistrement...' : "J'accepte et je continue"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default CguGate;
