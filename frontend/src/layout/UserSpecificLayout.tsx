// frontend/src/layout/UserSpecificLayout.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../api/authApi';
import DashboardLayout from './DashboardLayout';
import ProprietaireLayout from './ProprietaireLayout';
import { getProfile } from '../api/authApi';

interface UserSpecificLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

interface UserProfile {
  id: number;
  nom: string;
  email: string;
  userType: string;
  role: string;
}

const UserSpecificLayout: React.FC<UserSpecificLayoutProps> = ({ children, onLogout }) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const token = getToken();
        if (!token) {
          navigate('/');
          return;
        }

        const profile = await getProfile();
        setUserProfile(profile.user);

        // Redirection vers l'espace approprié uniquement depuis la racine /dashboard
        if (window.location.pathname === '/dashboard' || window.location.pathname === '/dashboard/') {
          if (profile.user.userType === 'locataire') {
            navigate('/dashboard/locataire');
          } else if (profile.user.userType === 'proprietaire') {
            navigate('/dashboard/proprietaire');
          } else if (profile.user.userType === 'gestionnaire') {
            navigate('/dashboard/gestionnaire');
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du profil utilisateur:', error);
        navigate('/login');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-base-200">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-base-content/50 font-medium">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  // Les propriétaires ont un layout dédié — mode observateur lecture seule
  if (userProfile?.userType === 'proprietaire' || userProfile?.role === 'proprietaire') {
    return (
      <ProprietaireLayout onLogout={onLogout}>
        {children}
      </ProprietaireLayout>
    );
  }

  // Tous les autres rôles (gestionnaire, locataire, admin...) utilisent le layout standard
  return (
    <DashboardLayout onLogout={onLogout}>
      {children}
    </DashboardLayout>
  );
};

export default UserSpecificLayout;
