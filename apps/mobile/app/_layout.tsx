/**
 * Root Layout — Expo Router
 * Initialise le store d'auth + React Query + redirige selon l'état de connexion
 */
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

// Empêcher le splash screen de se fermer automatiquement
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min
      gcTime: 30 * 60 * 1000,         // 30 min
      retry: (failureCount, error) => {
        if (error instanceof Error && error.message.includes('401')) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});

export default function RootLayout() {
  const { initialize, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      // Cacher le splash screen une fois l'initialisation terminée
      SplashScreen.hideAsync();
      // Rediriger selon l'état d'auth
      if (isAuthenticated) {
        router.replace('/(app)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [isLoading, isAuthenticated]);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" backgroundColor="#0F172A" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </QueryClientProvider>
  );
}
