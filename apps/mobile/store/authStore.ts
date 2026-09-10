/**
 * Store d'authentification — Zustand
 * Gère le token JWT stocké dans expo-secure-store
 */
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { initApiClient } from '@hopegestion/api-client';

const TOKEN_KEY = 'hopegestion_access_token';
const ROLE_KEY = 'hopegestion_user_role';
const USER_KEY = 'hopegestion_user_data';

export interface AuthUser {
  id: number;
  nom: string;
  prenoms?: string;
  email: string;
  role: 'gestionnaire' | 'proprietaire' | 'locataire' | 'admin';
  photo_url?: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  // Actions
  initialize: () => Promise<void>;
  setAuth: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  /**
   * Restaure la session depuis SecureStore au démarrage de l'app.
   * Initialise aussi le client API avec le token et le callback de déconnexion.
   */
  initialize: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);

      if (token && userJson) {
        const user: AuthUser = JSON.parse(userJson);
        // Initialiser le client API partagé
        initApiClient({
          baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.hopegestion.com',
          getToken: () => get().token,
          onUnauthorized: () => get().logout(),
          platform: 'mobile',
        });
        set({ token, user, isAuthenticated: true });
      } else {
        // Initialiser le client API sans token (pour login)
        initApiClient({
          baseUrl: process.env.EXPO_PUBLIC_API_URL || 'https://api.hopegestion.com',
          getToken: () => get().token,
          onUnauthorized: () => get().logout(),
          platform: 'mobile',
        });
      }
    } catch (error) {
      console.error('[AuthStore] Erreur initialisation:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  setAuth: async (token: string, user: AuthUser) => {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(ROLE_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ token: null, user: null, isAuthenticated: false });
  },

  updateUser: (updates: Partial<AuthUser>) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updates };
    set({ user: updated });
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated)).catch(console.error);
  },
}));
