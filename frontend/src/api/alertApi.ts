import { getToken } from './authApi';
import { API_URL } from '../config';

export interface Alert {
    id: string;
    reference: string;
    titre: string;
    description: string;
    destinataire: string;
    type: string;
    priorite: 'Urgente' | 'Haute' | 'Moyenne' | 'Basse';
    dateCreation: string;
    statut: string;
    link?: string;
}

export const getAlerts = async (): Promise<{ alerts: Alert[]; dismissedCount: number }> => {
    const token = getToken();
    if (!token) return { alerts: [], dismissedCount: 0 };

    const response = await fetch(`${API_URL}/alertes`, {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Erreur lors du chargement des alertes');
    }

    const data = await response.json();
    return { alerts: data.alerts || [], dismissedCount: data.dismissedCount || 0 };
};

export const dismissAlert = async (alertId: string): Promise<void> => {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');

    const response = await fetch(`${API_URL}/alertes/${alertId}/dismiss`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Erreur lors de l\'ignorance de l\'alerte');
    }
};

export const resetDismissedAlerts = async (): Promise<void> => {
    const token = getToken();
    if (!token) throw new Error('Non authentifié');

    const response = await fetch(`${API_URL}/alertes/dismissed`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Erreur lors de la réinitialisation');
    }
};
