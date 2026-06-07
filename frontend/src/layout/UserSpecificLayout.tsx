// frontend/src/layout/UserSpecificLayout.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import ProprietaireLayout from './ProprietaireLayout';
import LocataireLayout from './LocataireLayout';
import { useUser } from '../contexts/UserContext';

interface UserSpecificLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const UserSpecificLayout: React.FC<UserSpecificLayoutProps> = ({ children, onLogout }) => {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-base-200">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-base-content/50 font-medium">Chargement de votre espace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Les propriétaires ont un layout dédié — mode observateur lecture seule
  if (user.userType === 'proprietaire' || user.role === 'proprietaire') {
    return <ProprietaireLayout onLogout={onLogout}>{children}</ProprietaireLayout>;
  }

  // Les locataires ont leur propre espace personnel
  if (user.userType === 'locataire' || user.role === 'locataire') {
    return <LocataireLayout onLogout={onLogout}>{children}</LocataireLayout>;
  }

  // Gestionnaires et admins utilisent le layout standard
  return <DashboardLayout onLogout={onLogout}>{children}</DashboardLayout>;
};

export default UserSpecificLayout;
