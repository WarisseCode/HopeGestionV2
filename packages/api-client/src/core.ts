/**
 * @hopegestion/api-client — HTTP core
 *
 * Adaptateur HTTP isomorphe : fonctionne sur web (fetch natif)
 * et sur React Native (fetch natif aussi, mais sans localStorage ni cookies httpOnly).
 * La gestion du token est déléguée à l'appelant via `getToken`.
 */

export type ApiPlatform = 'web' | 'mobile';

let _baseUrl = '';
let _getToken: () => string | null = () => null;
let _onUnauthorized: () => void = () => {};
let _platform: ApiPlatform = 'web';

/**
 * Initialise le client API — à appeler une fois au démarrage de l'app.
 */
export function initApiClient(config: {
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized: () => void;
  platform: ApiPlatform;
}) {
  _baseUrl = config.baseUrl.replace(/\/api\/?$/, '');
  _getToken = config.getToken;
  _onUnauthorized = config.onUnauthorized;
  _platform = config.platform;
}

export function getApiUrl(): string {
  return `${_baseUrl}/api`;
}

export interface ApiCallOptions extends RequestInit {
  skipAuth?: boolean;
}

/**
 * Fonction d'appel API centrale.
 * Gère automatiquement le header Authorization et les erreurs 401.
 */
export async function apiCall<T>(endpoint: string, options: ApiCallOptions = {}): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  if (!skipAuth) {
    const token = _getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const url = endpoint.startsWith('http') ? endpoint : `${getApiUrl()}${endpoint}`;

  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401) {
    _onUnauthorized();
    throw new Error('Session expirée. Veuillez vous reconnecter.');
  }

  if (!response.ok) {
    let errorMessage = `Erreur ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // ignore parse errors
    }
    throw new Error(errorMessage);
  }

  // Réponse vide (204 No Content)
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
