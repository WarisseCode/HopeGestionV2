// frontend/src/layout/UserSpecificLayout.tsx
import React, { Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext';
import { lazyWithReload } from '../utils/lazyWithReload';

// Lazy-load des layouts pour sortir framer-motion du chemin critique initial.
// Les 3 layouts importent framer-motion (~100 kB) — les charger eagerly le ferait
// atterrir dans le chunk principal. Avec lazy, il est chargé après auth.
// Le fallback est identique au spinner du contexte utilisateur — UX cohérente.
const DashboardLayout    = lazyWithReload(() => import('./DashboardLayout'));
const ProprietaireLayout = lazyWithReload(() => import('./ProprietaireLayout'));
const LocataireLayout    = lazyWithReload(() => import('./LocataireLayout'));

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

  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-screen bg-base-200">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-base-content/50 font-medium">Chargement de votre espace...</p>
        </div>
      </div>
    }>
      {/* Les propriétaires ont un layout dédié — mode observateur lecture seule */}
      {user.userType === 'proprietaire' || user.role === 'proprietaire' ? (
        <ProprietaireLayout onLogout={onLogout}>{children}</ProprietaireLayout>
      ) : user.userType === 'locataire' || user.role === 'locataire' ? (
        <LocataireLayout onLogout={onLogout}>{children}</LocataireLayout>
      ) : (
        <DashboardLayout onLogout={onLogout}>{children}</DashboardLayout>
      )}
    </Suspense>
  );
};

export default UserSpecificLayout;
