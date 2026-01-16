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
        const isGuest = profile.user.isGuest || profile.user.role === 'guest'; // Check guest flag
        const role = profile.user.role;

        if (role === 'admin' || userType === 'admin') {
            navigate('/admin');
        } else if (isGuest) {
             // Guests access the issuer's dashboard (typically gestionnaire/proprietaire view)
             // For now, default to gestionnaire dashboard as they are delegating access
             navigate('/dashboard/gestionnaire'); 
        } else if (userType === 'locataire') {
          navigate('/dashboard/locataire');
        } else if (userType === 'proprietaire') {
          navigate('/dashboard/proprietaire');
        } else if (userType === 'gestionnaire') {
          navigate('/dashboard/gestionnaire');
        } else if (userType === 'manager') {
            navigate('/dashboard/manager');
        } else {
          // Pour les autres types d'utilisateurs, rediriger vers la page d'accueil pour éviter une boucle
          navigate('/');
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