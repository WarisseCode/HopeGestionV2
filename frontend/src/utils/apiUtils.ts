// frontend/src/utils/apiUtils.ts

/**
 * Fonction utilitaire pour effectuer des appels API avec une gestion d'erreur détaillée
 */
export async function apiCall<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      // Construire un message d'erreur détaillé
      const parts: string[] = [];
      if (errorData.message) parts.push(errorData.message);
      if (errorData.detail) parts.push(`[Détail: ${errorData.detail}]`);
      if (errorData.errorCode) parts.push(`[Code: ${errorData.errorCode}]`);
      
      const errorMessage = parts.length > 0 
        ? parts.join(' — ') 
        : `Erreur HTTP ${response.status}: ${response.statusText}`;
      
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error: any) {
    // Gérer les erreurs réseau (ex: "Failed to fetch")
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Impossible de se connecter au serveur. Vérifiez votre connexion internet et réessayez.');
    }
    
    // Gérer les autres erreurs
    if (error.message) {
      throw error;
    }
    
    throw new Error('Une erreur inconnue est survenue.');
  }
}