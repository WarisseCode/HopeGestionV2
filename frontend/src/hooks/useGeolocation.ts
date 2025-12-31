// frontend/src/hooks/useGeolocation.ts
import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  loading: boolean;
  error: string | null;
  permissionGranted: boolean;
}

interface UseGeolocationReturn extends GeolocationState {
  requestLocation: () => void;
  calculateDistance: (lat: number, lng: number) => number | null;
  getDirectionsUrl: (destLat: number, destLng: number) => string;
}

/**
 * Calculates the distance between two coordinates using the Haversine formula
 * @returns Distance in kilometers
 */
const haversineDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const useGeolocation = (): UseGeolocationReturn => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    loading: false,
    error: null,
    permissionGranted: false,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: 'La géolocalisation n\'est pas supportée par votre navigateur.',
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          loading: false,
          error: null,
          permissionGranted: true,
        });
      },
      (error) => {
        let errorMessage = 'Impossible d\'obtenir votre position.';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Vous avez refusé l\'accès à votre position. Veuillez l\'activer dans les paramètres de votre navigateur.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Votre position n\'est pas disponible.';
            break;
          case error.TIMEOUT:
            errorMessage = 'La demande de position a expiré.';
            break;
        }
        
        setState((prev) => ({
          ...prev,
          error: errorMessage,
          loading: false,
          permissionGranted: false,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache position for 5 minutes
      }
    );
  }, []);

  /**
   * Calculate distance from user's current position to a destination
   * @returns Distance in km or null if position not available
   */
  const calculateDistance = useCallback(
    (destLat: number, destLng: number): number | null => {
      if (state.latitude && state.longitude) {
        return haversineDistance(state.latitude, state.longitude, destLat, destLng);
      }
      return null;
    },
    [state.latitude, state.longitude]
  );

  /**
   * Generate Google Maps directions URL
   */
  const getDirectionsUrl = useCallback(
    (destLat: number, destLng: number): string => {
      if (state.latitude && state.longitude) {
        return `https://www.google.com/maps/dir/?api=1&origin=${state.latitude},${state.longitude}&destination=${destLat},${destLng}&travelmode=driving`;
      }
      // Fallback: open destination without origin
      return `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;
    },
    [state.latitude, state.longitude]
  );

  return {
    ...state,
    requestLocation,
    calculateDistance,
    getDirectionsUrl,
  };
};

export default useGeolocation;
