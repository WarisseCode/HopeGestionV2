// frontend/src/utils/cookieConsent.ts
// Le seul cookie posé aujourd'hui (refreshToken, httpOnly, backend) est strictement nécessaire
// à l'authentification et ne requiert pas de consentement. Cette structure sert à préparer
// l'ajout futur de cookies optionnels (analytics, marketing) : le jour où l'un d'eux est
// introduit, le code qui l'active doit vérifier hasConsent('analytics') avant de charger le
// script correspondant, au lieu de le charger inconditionnellement.
const STORAGE_KEY = 'cookie_consent';
const CONSENT_VERSION = '1';

export interface CookieConsent {
    version: string;
    decidedAt: string;
    necessary: true; // toujours actif, non désactivable (authentification)
    analytics: boolean;
    marketing: boolean;
}

export function getCookieConsent(): CookieConsent | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as CookieConsent;
        if (parsed.version !== CONSENT_VERSION) return null;
        return parsed;
    } catch {
        return null;
    }
}

export function setCookieConsent(choice: { analytics: boolean; marketing: boolean }): void {
    const consent: CookieConsent = {
        version: CONSENT_VERSION,
        decidedAt: new Date().toISOString(),
        necessary: true,
        analytics: choice.analytics,
        marketing: choice.marketing,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
}

export function hasConsent(category: 'analytics' | 'marketing'): boolean {
    return getCookieConsent()?.[category] ?? false;
}
