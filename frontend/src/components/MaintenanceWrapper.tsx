// frontend/src/components/MaintenanceWrapper.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

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
        const token = localStorage.getItem('token');
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
        const response = await fetch('/api/public/maintenance/status');
        const data = await response.json();
        
        if (data.maintenance && !currentIsAdmin) {
          setIsMaintenanceMode(true);
          // Rediriger vers la page de maintenance sauf si on y est déjà
          if (location.pathname !== '/maintenance') {
            navigate('/maintenance', { replace: true });
          }
        } else {
          setIsMaintenanceMode(false);
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

  // Si en mode maintenance et non admin, ne rien afficher (la redirection se fait)
  if (isMaintenanceMode && !isAdmin) {
    return null;
  }

  // Sinon, afficher les enfants normalement
  return <>{children}</>;
};

export default MaintenanceWrapper;
