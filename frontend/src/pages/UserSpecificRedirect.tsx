// frontend/src/pages/UserSpecificRedirect.tsx
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getProfile } from '../api/authApi';

interface UserSpecificRedirectProps {
  baseRoute: string; // La route de base comme 'biens', 'locataires', etc.
}

const UserSpecificRedirect: React.FC<UserSpecificRedirectProps> = ({ baseRoute }) => {
  const navigate = useNavigate();
  const { page } = useParams<{ page: string }>();

  useEffect(() => {
    const redirectUser = async () => {
      try {
        const profile = await getProfile();
        const userType = profile.user.userType;

        // Déterminer la route spécifique en fonction du type d'utilisateur et de la page demandée
        let specificRoute = '';
        
        if (userType === 'locataire') {
          // Pour les locataires, rediriger vers des pages spécifiques
          switch(baseRoute) {
            case 'biens':
              specificRoute = `/dashboard/locataire/mes-biens`;
              break;
            case 'locataires':
              specificRoute = `/dashboard/locataire/mes-informations`;
              break;
            case 'contrats':
              specificRoute = `/dashboard/locataire/mes-contrats`;
              break;
            case 'finances':
              specificRoute = `/dashboard/locataire/mes-paiements`;
              break;
            case 'quittances':
              specificRoute = `/dashboard/locataire/mes-quittances`;
              break;
            default:
              specificRoute = `/dashboard/locataire`;
          }
        } else if (userType === 'proprietaire') {
          // Pour les propriétaires, rediriger vers des pages spécifiques
          switch(baseRoute) {
            case 'proprietaires':
              specificRoute = `/dashboard/proprietaire/mon-profil`;
              break;
            case 'biens':
              specificRoute = `/dashboard/proprietaire/mes-biens`;
              break;
            case 'locataires':
              specificRoute = `/dashboard/proprietaire/mes-locataires`;
              break;
            case 'contrats':
              specificRoute = `/dashboard/proprietaire/mes-contrats`;
              break;
            case 'finances':
              specificRoute = `/dashboard/proprietaire/mes-finances`;
              break;
            case 'quittances':
              specificRoute = `/dashboard/proprietaire/mes-quittances`;
              break;
            default:
              specificRoute = `/dashboard/proprietaire`;
          }
        } else if (userType === 'gestionnaire') {
          // Pour les gestionnaires, utiliser les routes standards
          specificRoute = `/dashboard/${baseRoute}`;
        } else {
          // Pour les autres types d'utilisateurs, utiliser les routes standards
          specificRoute = `/dashboard/${baseRoute}`;
        }

        navigate(specificRoute);
      } catch (error) {
        console.error('Erreur lors de la redirection:', error);
        navigate('/login');
      }
    };

    redirectUser();
  }, [navigate, baseRoute, page]);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};

export default UserSpecificRedirect;