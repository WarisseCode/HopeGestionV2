// frontend/src/components/MaintenanceWrapper.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { API_URL } from '../config';

interface MaintenanceWrapperProps {
  children: React.ReactNode;
}

const MaintenanceWrapper: React.FC<MaintenanceWrapperProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkMaintenanceStatus = async () => {
      try {
        let currentIsAdmin = isAdmin;
        const token = localStorage.getItem('userToken');
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.role === 'admin') {
              setIsAdmin(true);
              currentIsAdmin = true;
            }
          } catch (e) {
            console.error('Error parsing token:', e);
          }
        }

        // Vérifier le statut de maintenance
        const response = await fetch(`${API_URL}/public/maintenance/status`);
        const data = await response.json();
        
        if (data.enabled && !currentIsAdmin) {
          setIsMaintenanceMode(true);
          // Rediriger vers la page de maintenance sauf si on y est déjà
          // ou si on est sur une route admin (laissée à ProtectedRoute)
          // Ne pas bloquer : la page maintenance elle-même, les routes admin
          // et la page de login (sinon un admin déconnecté ne peut plus se reconnecter)
          const isExcluded =
            location.pathname === '/maintenance' ||
            location.pathname.startsWith('/admin') ||
            location.pathname === '/login';
          if (!isExcluded) {
            navigate('/maintenance', { replace: true });
          }
        } else {
          setIsMaintenanceMode(false);
          // Si le mode maintenance est désactivé (ou si on est admin) et qu'on est
          // sur la page de maintenance, rediriger vers l'accueil
          // SAUF si la maintenance est encore active (l'admin peut rester sur /maintenance
          // pour voir la page, mais en pratique ce cas ne se produit pas)
          if (location.pathname === '/maintenance' && !data.enabled) {
            navigate('/', { replace: true });
          }
        }
      } catch (error) {
        console.error('Error checking maintenance status:', error);
        // En cas d'erreur, on continue normalement
        setIsMaintenanceMode(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkMaintenanceStatus();
  }, [navigate, location.pathname]);

  // Ne rien afficher pendant le chargement
  if (isLoading) {
    return null;
  }

  // Si en mode maintenance et non admin, on masque le contenu pour éviter un flash, 
  // SAUF si on est déjà sur la page de maintenance (pour pouvoir l'afficher)
  if (isMaintenanceMode && !isAdmin && location.pathname !== '/maintenance') {
    return null;
  }

  // Sinon, afficher les enfants normalement
  return <>{children}</>;
};

export default MaintenanceWrapper;
