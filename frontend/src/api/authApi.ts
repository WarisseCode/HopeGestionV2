// frontend/src/api/authApi.ts

import { API_URL as BASE_URL } from '../config';

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
    const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || `Erreur de connexion (Statut: ${response.status})`);
    }

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
    const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            nom, 
            prenoms, 
            email, 
            telephone, 
            password,
            userType
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || `Erreur d'inscription (Statut: ${response.status})`);
    }
    
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
    };
}

// Fonction pour récupérer le profil de l'utilisateur
export async function getProfile(): Promise<UserProfile> {
    const token = getToken();
    
    if (!token) {
        throw new Error('Aucun token d\'authentification trouve');
    }
    
    const response = await fetch(`${BASE_URL}/profil`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
    
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || `Erreur lors de la récupération du profil (Statut: ${response.status})`);
    }
    
    return data;
}