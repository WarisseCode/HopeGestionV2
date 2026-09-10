/**
 * @hopegestion/api-client — Auth API
 * Compatible web + mobile (pas de localStorage ici — délégué à l'app)
 */
import { apiCall } from './core';

export interface AuthResponse {
  token: string;
  role: 'gestionnaire' | 'locataire' | 'proprietaire' | 'admin';
  userId: number;
  message: string;
}

export interface UserProfile {
  id: number;
  nom: string;
  prenoms?: string;
  email: string;
  userType: string;
  role: string;
  telephone?: string;
  photo_url?: string;
  isGuest?: boolean;
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  return apiCall<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function getProfile(): Promise<{ user: UserProfile }> {
  return apiCall<{ user: UserProfile }>('/auth/profile', { method: 'GET' });
}

export async function updateProfile(data: {
  nom: string;
  prenoms?: string;
  email: string;
  telephone?: string;
  photo_url?: string;
}): Promise<{ message: string }> {
  return apiCall<{ message: string }>('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  return apiCall<{ message: string }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiCall<{ message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
    skipAuth: true,
  });
}

/**
 * Enregistre le token push Android/iOS pour les notifications.
 * Nouvelle route à créer côté backend.
 */
export async function registerDeviceToken(
  deviceToken: string,
  platform: 'android' | 'ios'
): Promise<{ message: string }> {
  return apiCall<{ message: string }>('/auth/register-device', {
    method: 'POST',
    body: JSON.stringify({ deviceToken, platform }),
  });
}

export async function unregisterDeviceToken(): Promise<{ message: string }> {
  return apiCall<{ message: string }>('/auth/unregister-device', {
    method: 'DELETE',
  });
}
