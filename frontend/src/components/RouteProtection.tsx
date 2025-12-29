// frontend/src/components/RouteProtection.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getProfile } from '../api/authApi';
import { getToken } from '../api/authApi';

interface RouteProtectionProps {
  allowedUserTypes: string[]; // Types d'utilisateurs autorisés à accéder à cette route
  children: React.ReactNode;
}

const RouteProtection: React.FC<RouteProtectionProps> = ({ allowedUserTypes, children }) => {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Vérifier si l'utilisateur est connecté
        const token = getToken();
        if (!token) {
          navigate('/login');
          return;
        }

        // Récupérer le profil de l'utilisateur
        const profile = await getProfile();
        const userType = profile.user.userType;

        // Vérifier si l'utilisateur a accès à cette route
        if (allowedUserTypes.includes(userType)) {
          setHasAccess(true);
        } else {
          // Rediriger vers l'espace approprié selon le type d'utilisateur
          if (userType === 'locataire') {
            navigate('/dashboard/locataire');
          } else if (userType === 'proprietaire') {
            navigate('/dashboard/proprietaire');
          } else if (userType === 'gestionnaire') {
            navigate('/dashboard/gestionnaire');
          } else {
            navigate('/dashboard');
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification des autorisations:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return hasAccess ? <>{children}</> : null;
};

export default RouteProtection;