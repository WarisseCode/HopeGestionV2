// frontend/src/pages/UserDashboardRedirect.tsx
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProfile } from '../api/authApi';

const UserDashboardRedirect: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const redirectUser = async () => {
      try {
        const profile = await getProfile();
        const userType = profile.user.userType;

        if (userType === 'locataire') {
          navigate('/dashboard/locataire');
        } else if (userType === 'proprietaire') {
          navigate('/dashboard/proprietaire');
        } else if (userType === 'gestionnaire') {
          navigate('/dashboard/gestionnaire');
        } else {
          // Pour les autres types d'utilisateurs, rediriger vers le dashboard standard
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Erreur lors de la redirection:', error);
        navigate('/login');
      }
    };

    redirectUser();
  }, [navigate]);

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};

export default UserDashboardRedirect;