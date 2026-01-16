// frontend/src/components/PermissionGate.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';

interface PermissionGateProps {
  /** The permission key to check, e.g., 'dashboard_read', 'biens_read' */
  requiredPermission: string;
  /** Where to redirect if permission is denied. Defaults to /mon-compte */
  redirectTo?: string;
  /** Content to render if permission is granted */
  children: React.ReactNode;
}

/**
 * A component that gates access to its children based on user permissions.
 * If the user does not have the required permission, they are redirected.
 * 
 * This is useful for protecting routes or sections of the UI based on
 * the granular permission matrix.
 */
const PermissionGate: React.FC<PermissionGateProps> = ({ 
  requiredPermission, 
  redirectTo = '/mon-compte', 
  children 
}) => {
  const { user, loading } = useUser();

  // While loading, show a spinner
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If no user (not logged in), redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check permission
  const hasPermission = (user.permissions as Record<string, boolean> | undefined)?.[requiredPermission] ?? false;
  
  // For admins, always allow (they have all permissions true)
  // This is a safety fallback, but ideally the permissions object already has all true.
  const isAdmin = user.role === 'admin';

  if (!hasPermission && !isAdmin) {
    // Redirect to a safe page
    return <Navigate to={redirectTo} replace />;
  }

  // Permission granted, render children
  return <>{children}</>;
};

export default PermissionGate;
