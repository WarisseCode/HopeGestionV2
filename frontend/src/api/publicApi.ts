import axios from 'axios';
import { API_URL } from '../config';

// Public API for fetching properties without authentication
export const getPublicBiens = async (filters?: any) => {
    try {
        const response = await axios.get(`${API_URL}/public/biens`, { params: filters });
        return response.data;
    } catch (error) {
        console.error('Error fetching public biens:', error);
        return [];
    }
};

export const getPublicBienDetails = async (id: number) => {
    try {
        const response = await axios.get(`${API_URL}/public/biens/${id}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching public bien details:', error);
        throw error;
    }
};
