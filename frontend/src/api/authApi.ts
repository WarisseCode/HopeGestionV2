// frontend/src/api/authApi.ts

import { API_URL as BASE_URL } from '../config';
import { apiCall } from '../utils/apiUtils';

interface AuthResponse {
    token: string;
    refreshToken?: string;
    role: 'gestionnaire' | 'locataire';
    userId: number;
    message: string;
}

interface RegisterResponse {
    message: string;
    userId: number;
}

/**
 * Tente de connecter l'utilisateur en envoyant les identifiants au backend.
 * Stocke le token et le rôle en cas de succès.
 */
export async function loginUser(email: string, password: string): Promise<AuthResponse> {
    const data = await apiCall<AuthResponse>(`${BASE_URL}/auth/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    // Connexion réussie : stocker le token, le refresh token et le rôle
    localStorage.setItem('userToken', data.token);
    localStorage.setItem('userRole', data.role);
    if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
    }

    return data;
}

/**
 * Tente d'inscrire un nouvel utilisateur.
 */
export async function registerUser(
    nom: string, 
    prenoms: string, 
    email: string, 
    telephone: string, 
    password: string,
    userType: string,
    invitationCode?: string
): Promise<RegisterResponse> {
    const data = await apiCall<RegisterResponse>(`${BASE_URL}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ 
            nom, 
            prenoms, 
            email, 
            telephone, 
            password,
            userType,
            invitationCode
        }),
    });
    
    return data;
}

// Fonction pour déconnexion — révoque le refresh token côté serveur
export const logoutUser = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
        if (refreshToken) {
            await fetch(`${BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            });
        }
    } catch (_) {
        // Échec silencieux : la déconnexion locale se fait quoi qu'il arrive
    } finally {
        localStorage.removeItem('userToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userRole');
        window.location.href = '/';
    }
};

// Fonctions pour récupérer les infos
export const getToken        = () => localStorage.getItem('userToken');
export const getRefreshToken = () => localStorage.getItem('refreshToken');
export const getRole         = () => localStorage.getItem('userRole');

// Renouvelle l'access token à partir du refresh token
export async function refreshAccessToken(): Promise<string | null> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
        const res = await fetch(`${BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
        });

        if (!res.ok) {
            // Refresh token invalide ou expiré → déconnexion
            localStorage.removeItem('userToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userRole');
            return null;
        }

        const data = await res.json();
        localStorage.setItem('userToken', data.token);
        if (data.refreshToken) {
            localStorage.setItem('refreshToken', data.refreshToken);
        }
        return data.token;
    } catch {
        return null;
    }
}

// Interface pour le profil utilisateur
interface UserProfile {
    message: string;
    user: {
        id: number;
        nom: string;
        email: string;
        userType: string;
        role: string;
        isGuest?: boolean;
    };
}

// Fonction pour récupérer le profil de l'utilisateur
export async function getProfile(): Promise<UserProfile> {
    const token = getToken();
    
    if (!token) {
        throw new Error('Aucun token d\'authentification trouve');
    }
    
    const data = await apiCall<UserProfile>(`${BASE_URL}/auth/profile`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    
    return data;
}

// Lier un locataire via code d'invitation (post-inscription)
export async function linkTenant(_userId: number, invitationCode: string): Promise<{ message: string; tenantId: number }> {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');

    const data = await apiCall<{ message: string; tenantId: number }>(`${BASE_URL}/auth/link-tenant`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invitationCode })
    });
    
    return data;
}

// Vérifier le code OTP
export async function verifyEmail(email: string, otp: string): Promise<AuthResponse> {
    const data = await apiCall<AuthResponse>(`${BASE_URL}/auth/verify-email`, {
        method: 'POST',
        body: JSON.stringify({ email, otp }),
    });
    if (data.token) localStorage.setItem('userToken', data.token);
    if ((data as any).refreshToken) localStorage.setItem('refreshToken', (data as any).refreshToken);
    if (data.role) localStorage.setItem('userRole', data.role);
    return data;
}

// Renvoyer le code OTP
export async function resendOtp(email: string): Promise<{ message: string }> {
    const data = await apiCall<{ message: string }>(`${BASE_URL}/auth/resend-otp`, {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
    return data;
}