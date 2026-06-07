// frontend/src/components/RouteProtection.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

interface RouteProtectionProps {
  allowedUserTypes: string[];
  children: React.ReactNode;
}

const RouteProtection: React.FC<RouteProtectionProps> = ({ allowedUserTypes, children }) => {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  let userType = user.userType;
  const isGuest = user.isGuest || user.role === 'guest';
  if (isGuest) userType = 'gestionnaire';

  if (allowedUserTypes.includes(userType) || (user.role === 'admin' && allowedUserTypes.includes('admin'))) {
    return <>{children}</>;
  }

  // Rediriger vers l'espace approprié si l'accès est refusé
  const redirectTo =
    userType === 'locataire' ? '/dashboard/locataire' :
    userType === 'proprietaire' ? '/dashboard/proprietaire' :
    userType === 'gestionnaire' ? '/dashboard/gestionnaire' :
    '/dashboard';

  return <Navigate to={redirectTo} replace />;
};

export default RouteProtection;
