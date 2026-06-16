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

// Auth & onboarding
const LoginForm = React.lazy(() => import('./components/LoginForm'));
const SignupForm = React.lazy(() => import('./components/SignupForm'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const CompleteProfile = React.lazy(() => import('./pages/CompleteProfile'));
const AcceptInvite = React.lazy(() => import('./pages/AcceptInvite'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));
const InvitationPage = React.lazy(() => import('./pages/public/InvitationPage'));

// Home & marketing
const HomePage = React.lazy(() => import('./HomePage'));
const FonctionnalitesPage = React.lazy(() => import('./pages/public/FonctionnalitesPage'));
const GestionnaireProprietairePage = React.lazy(() => import('./pages/public/GestionnaireProprietairePage'));
const LocatairePublicPage = React.lazy(() => import('./pages/public/LocatairePublicPage'));
const ModulesTransversesPage = React.lazy(() => import('./pages/public/ModulesTransversesPage'));
const AboutPage = React.lazy(() => import('./pages/public/AboutPage'));
const BiensPublicsPage = React.lazy(() => import('./pages/public/BiensPublicsPage'));
const PublicReservation = React.lazy(() => import('./pages/public/PublicReservation'));

// Admin pages
const AdminDashboard = React.lazy(() => import('./pages/admin/AdminDashboard'));
const AdminUsers = React.lazy(() => import('./pages/admin/AdminUsers'));
const AdminAgencies = React.lazy(() => import('./pages/admin/AdminAgencies'));
const AdminFinances = React.lazy(() => import('./pages/admin/AdminFinances'));
const AdminSubscriptions = React.lazy(() => import('./pages/admin/AdminSubscriptions'));
const AdminAuditLogs = React.lazy(() => import('./pages/admin/AdminAuditLogs'));
const AdminSettings = React.lazy(() => import('./pages/admin/AdminSettings'));
const NotFound = React.lazy(() => import('./pages/NotFound'));

// Dashboard redirects & rôles
const UserDashboardRedirect = React.lazy(() => import('./pages/UserDashboardRedirect'));
const LocataireDashboard = React.lazy(() => import('./pages/LocataireDashboard'));
const ProprietaireDashboard = React.lazy(() => import('./pages/ProprietaireDashboard'));
const GestionnaireDashboard = React.lazy(() => import('./pages/GestionnaireDashboard'));

// Dashboard pages
const MonCompte = React.lazy(() => import('./pages/MonCompte'));
const Biens = React.lazy(() => import('./pages/Biens'));
const Locataires = React.lazy(() => import('./pages/Locataires'));
const LocataireDetails = React.lazy(() => import('./pages/LocataireDetails'));
const Contrats = React.lazy(() => import('./pages/Contrats'));
const Finances = React.lazy(() => import('./pages/Finances'));
const Interventions = React.lazy(() => import('./pages/Interventions'));
const Parametres = React.lazy(() => import('./pages/Parametres'));
const Rapports = React.lazy(() => import('./pages/Rapports'));
const Alertes = React.lazy(() => import('./pages/Alertes'));
const MobileMoney = React.lazy(() => import('./pages/MobileMoney'));
const Quittances = React.lazy(() => import('./pages/Quittances'));
const Proprietaires = React.lazy(() => import('./pages/Proprietaires'));
const Documents = React.lazy(() => import('./pages/Documents'));
const CalendrierPage = React.lazy(() => import('./pages/CalendrierPage'));
const AuditLogsPage = React.lazy(() => import('./pages/AuditLogsPage'));
const Locations = React.lazy(() => import('./pages/Locations'));
const LocationDetails = React.lazy(() => import('./pages/LocationDetails'));
const ReservationsList = React.lazy(() => import('./pages/ReservationsList'));
const InventoriesList = React.lazy(() => import('./pages/InventoriesList'));
const InventoryForm = React.lazy(() => import('./pages/InventoryForm'));
const InventoryDetails = React.lazy(() => import('./pages/InventoryDetails'));
const EdlList = React.lazy(() => import('./pages/EdlList'));
const EdlCreate = React.lazy(() => import('./pages/EdlCreate'));
const EdlDetails = React.lazy(() => import('./pages/EdlDetails'));
const EdlSignature = React.lazy(() => import('./pages/EdlSignature'));
const EdlCompare = React.lazy(() => import('./pages/EdlCompare'));
const Pricing = React.lazy(() => import('./pages/Pricing'));
const Carnet = React.lazy(() => import('./pages/Carnet'));
const TasksPage = React.lazy(() => import('./pages/TasksPage'));
const TenantPayments = React.lazy(() => import('./pages/TenantPayments'));

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
