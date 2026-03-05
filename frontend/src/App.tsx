// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import CompleteProfile from './pages/CompleteProfile';
import AcceptInvite from './pages/AcceptInvite';
import VerifyEmail from './pages/VerifyEmail';
import LocataireDashboard from './pages/LocataireDashboard';
import ProprietaireDashboard from './pages/ProprietaireDashboard';
import GestionnaireDashboard from './pages/GestionnaireDashboard';
import UserDashboardRedirect from './pages/UserDashboardRedirect';
import RouteProtection from './components/RouteProtection';
import PermissionGate from './components/PermissionGate';
import HomePage from './HomePage';
import DashboardLayout from './layout/DashboardLayout'; // Import Layout
import AdminLayout from './layout/AdminLayout';
import UserSpecificLayout from './layout/UserSpecificLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminAgencies from './pages/admin/AdminAgencies';
import AdminFinances from './pages/admin/AdminFinances';
import AdminSubscriptions from './pages/admin/AdminSubscriptions';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminSettings from './pages/admin/AdminSettings';
import { getToken, logoutUser } from './api/authApi'; 
import CustomThemeProvider from './theme/Theme';
import { UserProvider } from './contexts/UserContext';
import MonCompte from './pages/MonCompte';
import Biens from './pages/Biens';
import Locataires from './pages/Locataires';
import Contrats from './pages/Contrats';
import Finances from './pages/Finances';
import Interventions from './pages/Interventions';
import Parametres from './pages/Parametres';
import Rapports from './pages/Rapports';
import Alertes from './pages/Alertes';
import MobileMoney from './pages/MobileMoney';
import Quittances from './pages/Quittances';
import Proprietaires from './pages/Proprietaires';
import LotsPage from './pages/LotsPage';
import Documents from './pages/Documents';
import DelegationsPage from './pages/DelegationsPage';
import LocataireDetails from './pages/LocataireDetails';
import CalendrierPage from './pages/CalendrierPage';
import AuditLogsPage from './pages/AuditLogsPage';
import Locations from './pages/Locations';
import LocationDetails from './pages/LocationDetails';
import ReservationsList from './pages/ReservationsList';
import InventoriesList from './pages/InventoriesList';
import InventoryForm from './pages/InventoryForm';
import InventoryDetails from './pages/InventoryDetails';
import EdlList from './pages/EdlList';
import EdlCreate from './pages/EdlCreate';
import EdlDetails from './pages/EdlDetails';
import EdlSignature from './pages/EdlSignature';
import Pricing from './pages/Pricing';
import Carnet from './pages/Carnet'; // Module XI
import TasksPage from './pages/TasksPage'; // Module XIV
import TenantPayments from './pages/TenantPayments'; // Paiement en ligne des loyers
// Public marketing pages
import { 
  FonctionnalitesPage, 
  GestionnaireProprietairePage, 
  LocatairePublicPage, 
  ModulesTransversesPage,
  AboutPage,
  BiensPublicsPage,
  PublicReservation
} from './pages/public';

type View = 'home' | 'login' | 'dashboard';

const ProtectedRoute: React.FC<{children: React.ReactNode}> = ({ children }) => {
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
            <CustomThemeProvider>
                <Router>
                <Toaster position="top-center" toastOptions={{ duration: 4000, className: 'text-sm font-medium' }} />
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
                                            <Route path="inventaires" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<InventoriesList />} />} />
                                            <Route path="inventories/new" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<InventoryForm />} />} />
                                            <Route path="inventaires/new" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<InventoryForm />} />} />
                                            <Route path="inventories/:id/edit" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<InventoryForm />} />} />
                                            <Route path="inventories/:id" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<InventoryDetails />} />} />
                                            <Route path="etats-des-lieux" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<EdlList />} />} />
                                            <Route path="etats-des-lieux/nouveau" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<EdlCreate />} />} />
                                            <Route path="etats-des-lieux/:id" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<EdlDetails />} />} />
                                            <Route path="etats-des-lieux/:id/signer" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<EdlSignature />} />} />
                                            <Route path="contrats" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Contrats />} />} />
                                            <Route path="documents" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Documents />} />} />
                                            <Route path="carnet" element={<RouteProtection allowedUserTypes={['gestionnaire', 'admin']} children={<Carnet />} />} />
                                            <Route path="tasks" element={<RouteProtection allowedUserTypes={['gestionnaire', 'admin']} children={<TasksPage />} />} />
                                            <Route path="finances" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Finances />} />} />
                                            <Route path="interventions" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<Interventions />} />} />
                                            <Route path="equipe" element={<RouteProtection allowedUserTypes={['proprietaire']} children={<DelegationsPage />} />} />
                                            <Route path="parametres" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Parametres />} />} />
                                            <Route path="rapports" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<Rapports />} />} />
                                            <Route path="audit-logs" element={<RouteProtection allowedUserTypes={['gestionnaire', 'admin']} children={<AuditLogsPage />} />} />
                                            <Route path="alertes" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Alertes />} />} />
                                            <Route path="mobile-money" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<MobileMoney />} />} />
                                            <Route path="quittances" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Quittances />} />} />
                                            <Route path="paiements-loyer" element={<RouteProtection allowedUserTypes={['locataire']} children={<TenantPayments />} />} />
                                            <Route path="abonnement" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<Pricing />} />} />
                                            <Route path="proprietaires" element={<RouteProtection allowedUserTypes={['gestionnaire']} children={<Proprietaires />} />} />
                                            <Route path="locataire" element={<LocataireDashboard />} />
                                            <Route path="locataire/*" element={<LocataireDashboard />} />
                                            <Route path="proprietaire" element={<ProprietaireDashboard />} />
                                            <Route path="proprietaire/*" element={<ProprietaireDashboard />} />
                                            <Route path="gestionnaire" element={<GestionnaireDashboard />} />
                                            <Route path="gestionnaire/*" element={<GestionnaireDashboard />} />
                                            <Route path="manager" element={<GestionnaireDashboard />} />
                                            <Route path="manager/*" element={<GestionnaireDashboard />} />
                                        </Routes>
                                    </UserSpecificLayout>
                                </UserProvider>
                            </ProtectedRoute>
                        } 
                    />
                    
                    {/* Redirection par défaut */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </CustomThemeProvider>
    </GoogleOAuthProvider>
    );
};

export default App;
