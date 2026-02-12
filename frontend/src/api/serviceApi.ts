import axios from 'axios';
import { API_URL } from '../config';

// Interface for Service Catalog Item
export interface ServiceItem {
    id: number;
    name: string;
    description: string;
    price_base: number;
    unit: string;
    category: 'cleaning' | 'security' | 'childcare' | 'transport' | 'other';
    image?: string;
}

// Interface for Service Booking
export interface ServiceBooking {
    id?: number;
    service_id: number;
    lot_id: number;
    booking_date: string; // ISO Date
    notes?: string;
    status?: string;
}

export const getServiceCatalog = async () => {
    try {
        const response = await axios.get(`${API_URL}/services/catalog`);
        return response.data;
    } catch (error) {
        console.error('Error fetching service catalog:', error);
        // Return Mock Data if backend not ready
        return [
            { id: 1, name: 'Ménage Standard', description: 'Nettoyage complet du sol et des surfaces.', price_base: 5000, unit: 'heure', category: 'cleaning' },
            { id: 2, name: 'Grand Nettoyage', description: 'Nettoyage de printemps, vitres incluses.', price_base: 15000, unit: 'forfait', category: 'cleaning' },
            { id: 3, name: 'Gardiennage Nuit', description: 'Agent de sécurité pour surveillance de nuit.', price_base: 10000, unit: 'nuit', category: 'security' },
            { id: 4, name: 'Plomberie Urgence', description: 'Intervention rapide pour fuite.', price_base: 5000, unit: 'intervention', category: 'other' },
        ];
    }
};

export const bookService = async (bookingData: ServiceBooking) => {
    try {
        const response = await axios.post(`${API_URL}/services/book`, bookingData);
        return response.data;
    } catch (error) {
        console.error('Error booking service:', error);
        throw error;
    }
};

export const getMyBookings = async () => {
    try {
        const response = await axios.get(`${API_URL}/services/my-bookings`);
        return response.data;
    } catch (error) {
        console.error('Error fetching my bookings:', error);
        return [];
    }
};
