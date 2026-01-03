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

export const getAlerts = async (): Promise<Alert[]> => {
    const token = getToken();
    if (!token) return [];
    
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
    return data.alerts;
};
