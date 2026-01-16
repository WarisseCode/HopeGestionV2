// frontend/src/api/authApi.ts

import { API_URL as BASE_URL } from '../config';
import { apiCall } from '../utils/apiUtils';

interface AuthResponse {
    token: string;
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

    // Connexion réussie : Stocker le token et le rôle
    localStorage.setItem('userToken', data.token);
    localStorage.setItem('userRole', data.role);
    
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
    userType: string
): Promise<RegisterResponse> {
    const data = await apiCall<RegisterResponse>(`${BASE_URL}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({ 
            nom, 
            prenoms, 
            email, 
            telephone, 
            password,
            userType
        }),
    });
    
    return data;
}

// Fonction pour déconnexion (nettoyer le stockage local)
export const logoutUser = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRole');
    window.location.href = '/'; 
};

// Fonctions pour récupérer les infos
export const getToken = () => localStorage.getItem('userToken');
export const getRole = () => localStorage.getItem('userRole');

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