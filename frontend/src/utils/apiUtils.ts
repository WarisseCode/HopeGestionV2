// frontend/src/utils/apiUtils.ts

/**
 * Fonction utilitaire pour effectuer des appels API avec une gestion d'erreur améliorée
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

    // Si la réponse est une erreur réseau (ex: serveur inaccessible)
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || `Erreur HTTP ${response.status}: ${response.statusText}`;
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