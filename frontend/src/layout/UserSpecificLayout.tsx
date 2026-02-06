// frontend/src/layout/UserSpecificLayout.tsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getToken, getRole } from '../api/authApi';
import DashboardLayout from './DashboardLayout';
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
        
        // Selon le type d'utilisateur, rediriger vers l'espace approprié
        // mais seulement si on est sur la page principale du dashboard
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
      <div className="flex justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Render standard layout for all users, removing specific "Espace ..." headers
  return (
    <DashboardLayout onLogout={onLogout}>
      {children}
    </DashboardLayout>
  );
};

export default UserSpecificLayout;