
let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Render donne parfois juste le host (ex: backend.onrender.com) sans le protocole
if (!apiUrl.startsWith('http')) {
    apiUrl = `https://${apiUrl}`;
}

export const API_BASE = apiUrl;
export const API_URL = `${API_BASE}/api`;

