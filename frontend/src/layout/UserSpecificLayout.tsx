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

  // Pour les utilisateurs autres que locataire, on continue avec le layout standard
  // Pour les locataires, on pourrait avoir un layout spécifique
  if (userProfile?.userType === 'locataire') {
    return (
      <DashboardLayout onLogout={onLogout}>
        <div className="bg-base-100 rounded-lg p-6 shadow">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-base-content">Espace Locataire</h2>
            <span className="badge badge-primary">Locataire</span>
          </div>
          {children}
        </div>
      </DashboardLayout>
    );
  }

  // Pour les propriétaires
  if (userProfile?.userType === 'proprietaire') {
    return (
      <DashboardLayout onLogout={onLogout}>
        <div className="bg-base-100 rounded-lg p-6 shadow">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-base-content">Espace Propriétaire</h2>
            <span className="badge badge-secondary">Propriétaire</span>
          </div>
          {children}
        </div>
      </DashboardLayout>
    );
  }

  // Pour les gestionnaires
  if (userProfile?.userType === 'gestionnaire') {
    return (
      <DashboardLayout onLogout={onLogout}>
        <div className="bg-base-100 rounded-lg p-6 shadow">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-base-content">Espace Gestionnaire</h2>
            <span className="badge badge-accent">Gestionnaire</span>
          </div>
          {children}
        </div>
      </DashboardLayout>
    );
  }

  // Pour les autres types d'utilisateurs (admin, etc.)
  return (
    <DashboardLayout onLogout={onLogout}>
      {children}
    </DashboardLayout>
  );
};

export default UserSpecificLayout;