import { getToken } from './authApi';
import { API_URL as BASE_URL } from '../config';

const API_URL = `${BASE_URL}/owners`;

export interface Owner {
    id: number;
    name: string;
    first_name?: string;
    type: 'individual' | 'company';
    email?: string;
    phone: string;
}

export const ownerApi = {
    getOwners: async (): Promise<Owner[]> => {
        const token = getToken();
        if (!token) throw new Error("Non authentifié");

        const response = await fetch(API_URL, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error("Erreur lors de la récupération des propriétaires");
        }

        const data = await response.json();
        return data.owners || [];
    }
};
