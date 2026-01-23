import { API_URL } from '../config';
import { getToken } from './authApi';

const getHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

export const messageApi = {
    getMessages: async (context_type: string, context_id: number) => {
        const res = await fetch(`${API_URL}/messages?context_type=${context_type}&context_id=${context_id}`, { headers: getHeaders() });
        if (!res.ok) throw new Error('Erreur chargement messages');
        return res.json();
    },
    sendMessage: async (data: any) => {
        const res = await fetch(`${API_URL}/messages`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Erreur envoi message');
        return res.json();
    }
};
