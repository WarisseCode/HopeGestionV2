// frontend/src/App.tsx
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import RouteProtection from './components/RouteProtection';
import { getToken, logoutUser } from './api/authApi';
import { UserProvider } from './contexts/UserContext';
import AdminLayout from './layout/AdminLayout';
import UserSpecificLayout from './layout/UserSpecificLayout';
import { lazyWithReload } from './utils/lazyWithReload';

// Auth & onboarding
const LoginForm = lazyWithReload(() => import('./components/LoginForm'));
const SignupForm = lazyWithReload(() => import('./components/SignupForm'));
const ForgotPassword = lazyWithReload(() => import('./pages/ForgotPassword'));
const ResetPassword = lazyWithReload(() => import('./pages/ResetPassword'));
const CompleteProfile = lazyWithReload(() => import('./pages/CompleteProfile'));
const AcceptInvite = lazyWithReload(() => import('./pages/AcceptInvite'));
const VerifyEmail = lazyWithReload(() => import('./pages/VerifyEmail'));
const InvitationPage = lazyWithReload(() => import('./pages/public/InvitationPage'));

// Home & marketing
const HomePage = lazyWithReload(() => import('./HomePage'));
const FonctionnalitesPage = lazyWithReload(() => import('./pages/public/FonctionnalitesPage'));
const GestionnaireProprietairePage = lazyWithReload(() => import('./pages/public/GestionnaireProprietairePage'));
const LocatairePublicPage = lazyWithReload(() => import('./pages/public/LocatairePublicPage'));
const ModulesTransversesPage = lazyWithReload(() => import('./pages/public/ModulesTransversesPage'));
const AboutPage = lazyWithReload(() => import('./pages/public/AboutPage'));
const BiensPublicsPage = lazyWithReload(() => import('./pages/public/BiensPublicsPage'));
const PublicReservation = lazyWithReload(() => import('./pages/public/PublicReservation'));

// Admin pages
const AdminDashboard = lazyWithReload(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = lazyWithReload(() => import('./pages/admin/AdminUsers'));
const AdminAgencies = lazyWithReload(() => import('./pages/admin/AdminAgencies'));
const AdminFinances = lazyWithReload(() => import('./pages/admin/AdminFinances'));
const AdminSubscriptions = lazyWithReload(() => import('./pages/admin/AdminSubscriptions'));
const AdminAuditLogs = lazyWithReload(() => import('./pages/admin/AdminAuditLogs'));
const AdminSettings = lazyWithReload(() => import('./pages/admin/AdminSettings'));
const NotFound = lazyWithReload(() => import('./pages/NotFound'));

// Dashboard redirects & rôles
const UserDashboardRedirect = lazyWithReload(() => import('./pages/UserDashboardRedirect'));
const LocataireDashboard = lazyWithReload(() => import('./pages/LocataireDashboard'));
const ProprietaireDashboard = lazyWithReload(() => import('./pages/ProprietaireDashboard'));
const GestionnaireDashboard = lazyWithReload(() => import('./pages/GestionnaireDashboard'));

// Dashboard pages
const MonCompte = lazyWithReload(() => import('./pages/MonCompte'));
const Biens = lazyWithReload(() => import('./pages/Biens'));
const Locataires = lazyWithReload(() => import('./pages/Locataires'));
const LocataireDetails = lazyWithReload(() => import('./pages/LocataireDetails'));
const Contrats = lazyWithReload(() => import('./pages/Contrats'));
const Finances = lazyWithReload(() => import('./pages/Finances'));
const Interventions = lazyWithReload(() => import('./pages/Interventions'));
const Parametres = lazyWithReload(() => import('./pages/Parametres'));
const Rapports = lazyWithReload(() => import('./pages/Rapports'));
const Alertes = lazyWithReload(() => import('./pages/Alertes'));
const MobileMoney = lazyWithReload(() => import('./pages/MobileMoney'));
const Quittances = lazyWithReload(() => import('./pages/Quittances'));
const Proprietaires = lazyWithReload(() => import('./pages/Proprietaires'));
const Documents = lazyWithReload(() => import('./pages/Documents'));
const CalendrierPage = lazyWithReload(() => import('./pages/CalendrierPage'));
const AuditLogsPage = lazyWithReload(() => import('./pages/AuditLogsPage'));
const Locations = lazyWithReload(() => import('./pages/Locations'));
const LocationDetails = lazyWithReload(() => import('./pages/LocationDetails'));
const ReservationsList = lazyWithReload(() => import('./pages/ReservationsList'));
const InventoriesList = lazyWithReload(() => import('./pages/InventoriesList'));
const InventoryForm = lazyWithReload(() => import('./pages/InventoryForm'));
const Corbeille = lazyWithReload(() => import('./pages/Corbeille'));
const InventoryDetails = lazyWithReload(() => import('./pages/InventoryDetails'));
const EdlList = lazyWithReload(() => import('./pages/EdlList'));
const EdlCreate = lazyWithReload(() => import('./pages/EdlCreate'));
const EdlDetails = lazyWithReload(() => import('./pages/EdlDetails'));
const EdlSignature = lazyWithReload(() => import('./pages/EdlSignature'));
const EdlCompare = lazyWithReload(() => import('./pages/EdlCompare'));
const Pricing = lazyWithReload(() => import('./pages/Pricing'));
const Carnet = lazyWithReload(() => import('./pages/Carnet'));
const TasksPage = lazyWithReload(() => import('./pages/TasksPage'));
const TenantPayments = lazyWithReload(() => import('./pages/TenantPayments'));

// Spinner plein écran — utilisé à la toute première navigation
const PageLoader: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
  </div>
);

// Spinner compact — utilisé dans les layouts (sidebar reste visible)
const ContentLoader: React.FC = () => (
  <div className="flex flex-1 items-center justify-center p-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
  </div>
);

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = getToken();
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

const LoginFormWithNavigation: React.FC = () => {
  const navigate = useNavigate();
  return (
    <LoginForm
      onLoginSuccess={() => navigate('/dashboard')}
      onGoBackToHome={() => navigate('/')}
      onNavigateToSignup={() => navigate('/signup')}
    />
  );
};

const SignupFormWithNavigation: React.FC = () => {
  const navigate = useNavigate();
  return (
    <SignupForm
      onSignupSuccess={() => navigate('/login')}
      onGoBackToHome={() => navigate('/')}
      onNavigateToLogin={() => navigate('/login')}
    />
  );
};

const App: React.FC = () => {
  const handleLogout = () => {
    logoutUser();
  };

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <Router>
        <Toaster position="top-center" toastOptions={{ duration: 4000, className: 'text-sm font-medium' }} />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Routes publiques */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginFormWithNavigation />} />
            <Route path="/signup" element={<SignupFormWithNavigation />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />
            <Route path="/invitation/:token" element={<InvitationPage />} />

            {/* Pages marketing publiques */}
            <Route path="/fonctionnalites" element={<FonctionnalitesPage />} />
            <Route path="/fonctionnalites/gestionnaire" element={<GestionnaireProprietairePage />} />
            <Route path="/fonctionnalites/locataire" element={<LocatairePublicPage />} />
            <Route path="/fonctionnalites/modules" element={<ModulesTransversesPage />} />
            <Route path="/a-propos" element={<AboutPage />} />
            <Route path="/biens-disponibles" element={<BiensPublicsPage />} />

            {/* Public Reservation */}
            <Route path="/reserver/:lotId" element={<PublicReservation />} />

            {/* Routes protégées - ADMIN */}
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute>
                  <UserProvider>
                    <RouteProtection allowedUserTypes={['admin']}>
                      <AdminLayout onLogout={handleLogout}>
                        <Suspense fallback={<ContentLoader />}>
                          <Routes>
                            <Route index element={<AdminDashboard />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route path="agencies" element={<AdminAgencies />} />
                            <Route path="finances" element={<AdminFinances />} />
                            <Route path="subscriptions" element={<AdminSubscriptions />} />
                            <Route path="logs" element={<AdminAuditLogs />} />
                            <Route path="settings" element={<AdminSettings />} />
                            <Route path="*" element={<Navigate to="/admin" replace />} />
                          </Routes>
                        </Suspense>
                      </AdminLayout>
                    </RouteProtection>
                  </UserProvider>
                </ProtectedRoute>
              }
            />

            {/* Routes protégées - DASHBOARD */}
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute>
                  <UserProvider>
                    <UserSpecificLayout onLogout={handleLogout}>
                      <Suspense fallback={<ContentLoader />}>
                        <Routes>
                          <Route index element={<UserDashboardRedirect />} />
                          <Route path="mon-compte" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<MonCompte />} />} />
                          <Route path="biens" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<Biens />} />} />
                          <Route path="locataires" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<Locataires />} />} />
                          <Route path="locataires/:id" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<LocataireDetails />} />} />
                          <Route path="calendrier" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<CalendrierPage />} />} />
                          <Route path="locations" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<Locations />} />} />
                          <Route path="locations/:id" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<LocationDetails />} />} />
                          <Route path="reservations" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<ReservationsList />} />} />
                          <Route path="inventories" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<InventoriesList />} />} />
                          <Route path="inventaires" element={<Navigate to="/dashboard/inventories" replace />} />
                          {/* Routes d'écriture — gestionnaire uniquement */}
                          <Route path="inventories/new" element={<RouteProtection allowedUserTypes={['gestionnaire']} children={<InventoryForm />} />} />
                          <Route path="inventaires/new" element={<Navigate to="/dashboard/inventories/new" replace />} />
                          <Route path="inventories/:id/edit" element={<RouteProtection allowedUserTypes={['gestionnaire']} children={<InventoryForm />} />} />
                          {/* Routes de consultation — gestionnaire + proprietaire (lecture) */}
                          <Route path="inventories/:id" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<InventoryDetails />} />} />
                          <Route path="etats-des-lieux" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<EdlList />} />} />
                          <Route path="etats-des-lieux/nouveau" element={<RouteProtection allowedUserTypes={['gestionnaire']} children={<EdlCreate />} />} />
                          <Route path="etats-des-lieux/:id" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<EdlDetails />} />} />
                          <Route path="etats-des-lieux/:id/signer" element={<RouteProtection allowedUserTypes={['gestionnaire']} children={<EdlSignature />} />} />
                          <Route path="etats-des-lieux/compare/:idEntree/:idSortie" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<EdlCompare />} />} />
                          <Route path="contrats" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Contrats />} />} />
                          <Route path="documents" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Documents />} />} />
                          <Route path="carnet" element={<RouteProtection allowedUserTypes={['gestionnaire', 'admin']} children={<Carnet />} />} />
                          <Route path="tasks" element={<RouteProtection allowedUserTypes={['gestionnaire', 'admin']} children={<TasksPage />} />} />
                          <Route path="finances" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Finances />} />} />
                          <Route path="interventions" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<Interventions />} />} />
                          <Route path="parametres" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Parametres />} />} />
                          <Route path="rapports" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<Rapports />} />} />
                          <Route path="audit-logs" element={<RouteProtection allowedUserTypes={['gestionnaire', 'admin']} children={<AuditLogsPage />} />} />
                          <Route path="alertes" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Alertes />} />} />
                          <Route path="mobile-money" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<MobileMoney />} />} />
                          <Route path="quittances" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Quittances />} />} />
                          <Route path="corbeille" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<Corbeille />} />} />
                          <Route path="paiements-loyer" element={<RouteProtection allowedUserTypes={['locataire']} children={<TenantPayments />} />} />
                          <Route path="abonnement" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<Pricing />} />} />
                          <Route path="proprietaires" element={<RouteProtection allowedUserTypes={['gestionnaire']} children={<Proprietaires />} />} />
                          <Route path="locataire/*" element={<LocataireDashboard />} />
                          <Route path="proprietaire/*" element={<ProprietaireDashboard />} />
                          <Route path="gestionnaire/*" element={<GestionnaireDashboard />} />
                          <Route path="manager/*" element={<GestionnaireDashboard />} />
                        </Routes>
                      </Suspense>
                    </UserSpecificLayout>
                  </UserProvider>
                </ProtectedRoute>
              }
            />

            {/* Page 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Router>
    </GoogleOAuthProvider>
  );
};

export default App;
