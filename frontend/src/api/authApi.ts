// frontend/src/api/authApi.ts

// Utilisez l'URL de votre serveur backend
const BASE_URL = 'http://localhost:5000/api';

interface AuthResponse {
    token: string;
    role: 'gestionnaire' | 'locataire';
    userId: number;
    message: string; 
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

// Fonction pour déconnexion (nettoyer le stockage local)
export const logoutUser = () => {
    localStorage.removeItem('userToken');
    localStorage.removeItem('userRole');
    window.location.href = '/'; 
};

// Fonctions pour récupérer les infos
export const getToken = () => localStorage.getItem('userToken');
export const getRole = () => localStorage.getItem('userRole');