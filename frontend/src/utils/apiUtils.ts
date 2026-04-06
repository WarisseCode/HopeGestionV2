// frontend/src/utils/apiUtils.ts

import { getToken, refreshAccessToken } from '../api/authApi';

// Verrou pour éviter plusieurs appels /refresh simultanés
let isRefreshing = false;
let refreshQueue: Array<(token: string | null) => void> = [];

function processQueue(newToken: string | null) {
    refreshQueue.forEach(resolve => resolve(newToken));
    refreshQueue = [];
}

/**
 * Fonction utilitaire pour effectuer des appels API avec gestion d'erreur détaillée.
 * Tente automatiquement un refresh du token en cas de 401 (token expiré).
 */
export async function apiCall<T>(
    url: string,
    options: RequestInit = {}
): Promise<T> {
    const makeRequest = async (token: string | null): Promise<Response> => {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string>),
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return fetch(url, { ...options, headers });
    };

    try {
        let currentToken = getToken();
        let response = await makeRequest(currentToken);

        // ── Tentative de refresh si 401 ───────────────────────────────────
        if (response.status === 401) {
            if (isRefreshing) {
                // Une autre requête est déjà en train de rafraîchir → on attend
                const newToken = await new Promise<string | null>(resolve => {
                    refreshQueue.push(resolve);
                });

                if (!newToken) throw new Error('Session expirée. Veuillez vous reconnecter.');

                response = await makeRequest(newToken);
            } else {
                isRefreshing = true;
                try {
                    const newToken = await refreshAccessToken();
                    processQueue(newToken);

                    if (!newToken) {
                        // Refresh échoué → redirection vers login
                        window.location.href = '/';
                        throw new Error('Session expirée. Veuillez vous reconnecter.');
                    }

                    response = await makeRequest(newToken);
                } finally {
                    isRefreshing = false;
                }
            }
        }

        // ── Gestion des erreurs HTTP ──────────────────────────────────────
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const parts: string[] = [];
            if (errorData.message) parts.push(errorData.message);
            if (errorData.detail)    parts.push(`[Détail: ${errorData.detail}]`);
            if (errorData.errorCode) parts.push(`[Code: ${errorData.errorCode}]`);

            const errorMessage = parts.length > 0
                ? parts.join(' — ')
                : `Erreur HTTP ${response.status}: ${response.statusText}`;

            throw new Error(errorMessage);
        }

        return await response.json();

    } catch (error: any) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion internet et réessayez.');
        }
        if (error.message) throw error;
        throw new Error('Une erreur inconnue est survenue.');
    }
}
