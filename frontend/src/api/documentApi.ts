import { getToken } from './authApi';

import { API_URL as BASE_URL } from '../config'; 

const API_URL = `${BASE_URL}/documents`;

export interface Document {
  id: number;
  user_id: number;
  nom: string;
  type: string;
  url: string;
  taille: string;
  categorie: string;
  description?: string;
  created_at: string;
}

// Récupérer les documents
export async function getDocuments(): Promise<Document[]> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(API_URL, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }

  const data = await response.json();
  return data.documents || [];
}

// Ajout de support pour upload de fichiers
export const uploadDocument = async (
  formData: FormData
): Promise<Document> => {
  const token = getToken();
  if (!token) throw new Error('Non authentifié'); // Added missing token check
  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      // Pas de Content-Type ici, le navigateur le définit automatiquement avec le boundary pour FormData
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Erreur lors de l\'upload du document');
  }

  return response.json();
};

export const getDownloadUrl = (docId: number) => {
    const token = getToken();
    // On retourne l'URL directe, l'authentification se fera via un token en paramètre ou cookie si besoin
    // Mais ici le backend attend un Header Authorization, ce qui est compliqué pour un simple lien href
    // Solution simple : fetch blob et download via JS
    return `${API_URL}/download/${docId}`;
};

export const downloadDocument = async (docId: number, filename: string) => {
    const token = getToken();
    if (!token) throw new Error('Non authentifié'); // Added missing token check
    const response = await fetch(`${API_URL}/download/${docId}`, {
         headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) throw new Error("Erreur téléchargement");

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
};

// Ajouter un document
export async function addDocument(doc: Partial<Document>): Promise<Document> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(doc),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Erreur: ${response.status}`);
  }

  return await response.json();
}

// Supprimer un document
export async function deleteDocument(id: number): Promise<void> {
  const token = getToken();
  if (!token) throw new Error('Non authentifié');

  const response = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Erreur: ${response.status}`);
  }
}
