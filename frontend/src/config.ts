
let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Render donne parfois juste le host (ex: backend.onrender.com) sans le protocole
if (!apiUrl.startsWith('http')) {
    apiUrl = `https://${apiUrl}`;
}

// Supprimer le /api trailing si déjà présent pour éviter le double préfixe /api/api
const apiBase = apiUrl.replace(/\/api\/?$/, '');

export const API_BASE = apiBase;
export const API_URL = `${apiBase}/api`;

