import { getToken } from './authApi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Note {
    id: number;
    title: string;
    content: string;
    type: 'note' | 'reminder' | 'observation';
    entity_type?: string;
    entity_id?: number;
    visibility: 'private' | 'shared';
    created_at: string;
    user_id: number;
}

export interface Contact {
    id: number;
    name: string;
    role: string;
    phone: string;
    email?: string;
    address?: string;
    description?: string;
}

export interface FieldAction {
    id: number;
    type: 'visite' | 'intervention' | 'check';
    description: string;
    photo_url?: string;
    location_lat?: number;
    location_lng?: number;
    location_address?: string;
    status: 'pending' | 'done';
    created_at: string;
    user_id: number;
}

export const notebookApi = {
    // NOTES
    getNotes: async (): Promise<Note[]> => {
        const token = getToken();
        if (!token) return [];
        const res = await fetch(`${API_URL}/carnet/notes`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.ok ? await res.json() : [];
    },

    createNote: async (data: Partial<Note>): Promise<Note> => {
        const token = getToken();
        const res = await fetch(`${API_URL}/carnet/notes`, {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    deleteNote: async (id: number): Promise<void> => {
        const token = getToken();
        await fetch(`${API_URL}/carnet/notes/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        });
    },

    // CONTACTS
    getContacts: async (): Promise<Contact[]> => {
        const res = await fetch(`${API_URL}/carnet/contacts`, {
             headers: { Authorization: `Bearer ${getToken()}` }
        });
        return res.ok ? await res.json() : [];
    },

    createContact: async (data: Partial<Contact>): Promise<Contact> => {
        const res = await fetch(`${API_URL}/carnet/contacts`, {
            method: 'POST',
            headers: { 
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(data)
        });
        return await res.json();
    },

    // FIELD ACTIONS
    getFieldActions: async (): Promise<FieldAction[]> => {
        const res = await fetch(`${API_URL}/carnet/field-actions`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        return res.ok ? await res.json() : [];
    },

    createFieldAction: async (data: Partial<FieldAction>): Promise<FieldAction> => {
        const res = await fetch(`${API_URL}/carnet/field-actions`, {
             method: 'POST',
            headers: { 
                Authorization: `Bearer ${getToken()}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify(data)
        });
        return await res.json();
    }
};
