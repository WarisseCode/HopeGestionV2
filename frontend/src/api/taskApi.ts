import { API_URL } from '../config';
import { getToken } from './authApi';

const getHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

// Message d'erreur du serveur ({ message }) s'il existe, sinon le repli fourni (T-042) :
// sans cela, un 500 explicite était remplacé par un message générique.
const errorMessage = async (res: Response, fallback: string): Promise<string> => {
  const body = await res.json().catch(() => null);
  return (body && typeof body.message === 'string' && body.message) || fallback;
};

export const taskApi = {
    getTasks: async (filters: any = {}): Promise<{ data: any[]; total: number; page: number; limit: number; totalPages: number }> => {
        const query = new URLSearchParams(filters).toString();
        const res = await fetch(`${API_URL}/tasks?${query}`, { headers: getHeaders() });
        if (!res.ok) throw new Error(await errorMessage(res, 'Erreur chargement tâches'));
        return res.json();
    },
    createTask: async (data: any) => {
        const res = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(await errorMessage(res, 'Erreur création tâche'));
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
