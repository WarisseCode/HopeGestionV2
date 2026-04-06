import { getToken } from './authApi';

import { API_URL } from '../config';

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
    getNotes: async (page = 1, limit = 20): Promise<{ data: Note[]; total: number; page: number; totalPages: number }> => {
        const token = getToken();
        if (!token) return { data: [], total: 0, page: 1, totalPages: 0 };
        const res = await fetch(`${API_URL}/carnet/notes?page=${page}&limit=${limit}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.ok ? await res.json() : { data: [], total: 0, page: 1, totalPages: 0 };
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
    getContacts: async (page = 1, limit = 20): Promise<{ data: Contact[]; total: number; page: number; totalPages: number }> => {
        const res = await fetch(`${API_URL}/carnet/contacts?page=${page}&limit=${limit}`, {
             headers: { Authorization: `Bearer ${getToken()}` }
        });
        return res.ok ? await res.json() : { data: [], total: 0, page: 1, totalPages: 0 };
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
    getFieldActions: async (page = 1, limit = 20): Promise<{ data: FieldAction[]; total: number; page: number; totalPages: number }> => {
        const res = await fetch(`${API_URL}/carnet/field-actions?page=${page}&limit=${limit}`, {
            headers: { Authorization: `Bearer ${getToken()}` }
        });
        return res.ok ? await res.json() : { data: [], total: 0, page: 1, totalPages: 0 };
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
