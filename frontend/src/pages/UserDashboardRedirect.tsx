// frontend/src/pages/UserDashboardRedirect.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

const UserDashboardRedirect: React.FC = () => {
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

  const isGuest = user.isGuest || user.role === 'guest';

  if (user.role === 'admin' || user.userType === 'admin') return <Navigate to="/admin" replace />;
  if (isGuest) return <Navigate to="/dashboard/gestionnaire" replace />;
  if (user.userType === 'locataire') return <Navigate to="/dashboard/locataire" replace />;
  if (user.userType === 'proprietaire') return <Navigate to="/dashboard/proprietaire" replace />;
  if (user.userType === 'gestionnaire') return <Navigate to="/dashboard/gestionnaire" replace />;
  if (user.userType === 'manager') return <Navigate to="/dashboard/manager" replace />;

  return <Navigate to="/" replace />;
};

export default UserDashboardRedirect;
