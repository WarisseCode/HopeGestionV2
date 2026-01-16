// src/api/queryClient.ts
// Configuration React Query pour le cache API et la gestion des requêtes
import { QueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// Fonction de gestion des erreurs globale
const handleQueryError = (error: unknown) => {
  const message = error instanceof Error 
    ? error.message 
    : 'Une erreur est survenue';
  
  // Éviter les toasts en double
  toast.error(message, { id: 'query-error' });
  
  console.error('[QueryClient Error]:', error);
};

// Configuration du client React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Durée pendant laquelle les données sont considérées comme fraîches (5 minutes)
      staleTime: 5 * 60 * 1000,
      
      // Durée de conservation en cache (30 minutes)
      gcTime: 30 * 60 * 1000, // Anciennement cacheTime
      
      // Nombre de tentatives en cas d'échec
      retry: (failureCount, error) => {
        // Ne pas réessayer pour les erreurs 4xx
        if (error instanceof Error && error.message.includes('4')) {
          return false;
        }
        return failureCount < 3;
      },
      
      // Délai entre les tentatives
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch en arrière-plan quand l'onglet redevient actif
      refetchOnWindowFocus: false,
      
      // Refetch lors de la reconnexion réseau
      refetchOnReconnect: true,
      
      // Refetch lors du remontage du composant
      refetchOnMount: true,
    },
    mutations: {
      // Gestion des erreurs pour les mutations
      onError: handleQueryError,
      
      // Nombre de tentatives
      retry: 1,
    },
  },
});

// Types pour les clés de query standardisées
export const queryKeys = {
  // Biens
  biens: {
    all: ['biens'] as const,
    list: () => [...queryKeys.biens.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.biens.all, 'detail', id] as const,
    immeubles: () => [...queryKeys.biens.all, 'immeubles'] as const,
    lots: (immeubleId?: number) => [...queryKeys.biens.all, 'lots', immeubleId] as const,
  },
  
  // Locataires
  locataires: {
    all: ['locataires'] as const,
    list: () => [...queryKeys.locataires.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.locataires.all, 'detail', id] as const,
  },
  
  // Locations (Baux)
  locations: {
    all: ['locations'] as const,
    list: () => [...queryKeys.locations.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.locations.all, 'detail', id] as const,
  },
  
  // Finances
  finances: {
    all: ['finances'] as const,
    payments: () => [...queryKeys.finances.all, 'payments'] as const,
    stats: (period?: string) => [...queryKeys.finances.all, 'stats', period] as const,
  },
  
  // Documents
  documents: {
    all: ['documents'] as const,
    list: () => [...queryKeys.documents.all, 'list'] as const,
  },
  
  // Alertes
  alertes: {
    all: ['alertes'] as const,
    list: () => [...queryKeys.alertes.all, 'list'] as const,
    unread: () => [...queryKeys.alertes.all, 'unread'] as const,
  },
  
  // Calendrier
  calendar: {
    all: ['calendar'] as const,
    events: (month: string) => [...queryKeys.calendar.all, 'events', month] as const,
  },
  
  // KPIs
  kpis: {
    all: ['kpis'] as const,
    dashboard: (period?: string) => [...queryKeys.kpis.all, 'dashboard', period] as const,
  },
  
  // Utilisateurs
  users: {
    all: ['users'] as const,
    current: () => [...queryKeys.users.all, 'current'] as const,
    list: () => [...queryKeys.users.all, 'list'] as const,
  },
  
  // Propriétaires
  proprietaires: {
    all: ['proprietaires'] as const,
    list: () => [...queryKeys.proprietaires.all, 'list'] as const,
    detail: (id: number) => [...queryKeys.proprietaires.all, 'detail', id] as const,
  },
} as const;

// Fonctions utilitaires
export const invalidateQueries = {
  biens: () => queryClient.invalidateQueries({ queryKey: queryKeys.biens.all }),
  locataires: () => queryClient.invalidateQueries({ queryKey: queryKeys.locataires.all }),
  locations: () => queryClient.invalidateQueries({ queryKey: queryKeys.locations.all }),
  finances: () => queryClient.invalidateQueries({ queryKey: queryKeys.finances.all }),
  documents: () => queryClient.invalidateQueries({ queryKey: queryKeys.documents.all }),
  alertes: () => queryClient.invalidateQueries({ queryKey: queryKeys.alertes.all }),
  kpis: () => queryClient.invalidateQueries({ queryKey: queryKeys.kpis.all }),
  all: () => queryClient.invalidateQueries(),
};

export default queryClient;
