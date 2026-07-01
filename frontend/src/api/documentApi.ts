import axios from 'axios';

import { API_URL } from '../config';

const getToken = () => localStorage.getItem('userToken');

// En-tête X-Owner-Id : indique à tenantGuard le propriétaire ciblé.
// Nécessaire pour les documents liés à un owner précis (multi-propriétaires),
// car tenantGuard s'exécute avant multer et ne peut pas lire owner_id du body.
const ownerHeader = (ownerId?: number) =>
    ownerId ? { 'X-Owner-Id': String(ownerId) } : {};

export interface Document {
    id: number;
    nom: string;
    type: string;
    url: string;
    taille: string;
    categorie: string;
    entity_type: string | null;
    entity_id: number | null;
    description: string | null;
    created_at: string;
    user_id: number;
}

export interface DocumentFilters {
    entity_type?: string;
    entity_id?: number;
    categorie?: string;
}

export interface UploadData {
    file: File;
    nom?: string;
    categorie: string;
    entity_type?: string;
    entity_id?: number | string;
    description?: string;
}

export const documentApi = {
    getDocuments: async (filters: DocumentFilters = {}, ownerId?: number): Promise<Document[]> => {
        const token = getToken();
        // Construire la query string
        const params = new URLSearchParams();
        if (filters.entity_type) params.append('entity_type', filters.entity_type);
        if (filters.entity_id) params.append('entity_id', filters.entity_id.toString());
        if (filters.categorie) params.append('categorie', filters.categorie);

        const response = await axios.get(`${API_URL}/documents?${params.toString()}`, {
            headers: { Authorization: `Bearer ${token}`, ...ownerHeader(ownerId) }
        });
        return response.data;
    },

    uploadDocument: async (data: UploadData, ownerId?: number): Promise<Document> => {
        const token = getToken();
        const formData = new FormData();
        formData.append('file', data.file);
        formData.append('categorie', data.categorie);
        if (data.nom) formData.append('nom', data.nom);
        if (data.entity_type) formData.append('entity_type', data.entity_type);
        if (data.entity_id) formData.append('entity_id', data.entity_id.toString());
        if (data.description) formData.append('description', data.description);

        const response = await axios.post(`${API_URL}/documents/upload`, formData, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'multipart/form-data',
                ...ownerHeader(ownerId)
            }
        });
        return response.data;
    },

    deleteDocument: async (id: number, ownerId?: number): Promise<void> => {
        const token = getToken();
        await axios.delete(`${API_URL}/documents/${id}`, {
            headers: { Authorization: `Bearer ${token}`, ...ownerHeader(ownerId) }
        });
    },

    generateLease: async (leaseId: number): Promise<Document> => {
        const token = getToken();
        const response = await axios.post(`${API_URL}/documents/generate/lease/${leaseId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    },

    generateDocument: async (data: { templateId: number, entityId: number, type: string }): Promise<Document> => {
        const token = getToken();
        const response = await axios.post(`${API_URL}/documents/generate`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }
};
