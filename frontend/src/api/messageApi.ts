import { API_URL } from '../config';
import { apiCall } from '../utils/apiUtils';

export const messageApi = {
    getMessages: async (context_type: string, context_id: number) => {
        return apiCall<any[]>(`${API_URL}/messages?context_type=${context_type}&context_id=${context_id}`);
    },
    sendMessage: async (data: any) => {
        return apiCall<any>(`${API_URL}/messages`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};
