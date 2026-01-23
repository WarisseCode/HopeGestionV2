import { API_URL } from '../config';
import { getToken } from './authApi';

const getHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const taskApi = {
    getTasks: async (filters: any = {}) => {
        const query = new URLSearchParams(filters).toString();
        const res = await fetch(`${API_URL}/tasks?${query}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Erreur chargement tâches');
        return res.json();
    },
    createTask: async (data: any) => {
        const res = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erreur création tâche');
        return res.json();
    },
    updateTask: async (id: number, data: any) => {
        const res = await fetch(`${API_URL}/tasks/${id}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erreur mise à jour tâche');
        return res.json();
    }
};
