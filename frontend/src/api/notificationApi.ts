
import { getToken } from './authApi';
import { API_URL as BASE_URL } from '../config';

const API_URL = `${BASE_URL}/notifications`;

export interface AppNotification {
    id: number;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    link?: string;
}

export async function getNotifications(): Promise<{ notifications: AppNotification[], unreadCount: number }> {
    const token = getToken();
    const response = await fetch(API_URL, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Erreur chargement notifications');
    return await response.json();
}

export async function markAsRead(id: number): Promise<void> {
    const token = getToken();
    await fetch(`${API_URL}/${id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
    });
}

export async function markAllAsRead(): Promise<void> {
    const token = getToken();
    await fetch(`${API_URL}/read-all`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
    });
}
