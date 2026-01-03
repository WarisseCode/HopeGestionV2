// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import LoginForm from './components/LoginForm';
import SignupForm from './components/SignupForm';
// import Dashboard from './pages/Dashboard'; // Removed as file is deleted
import LocataireDashboard from './pages/LocataireDashboard';
import ProprietaireDashboard from './pages/ProprietaireDashboard';
import GestionnaireDashboard from './pages/GestionnaireDashboard';
import UserDashboardRedirect from './pages/UserDashboardRedirect';
import RouteProtection from './components/RouteProtection';
import HomePage from './HomePage';
import DashboardLayout from './layout/DashboardLayout'; // Import Layout
import UserSpecificLayout from './layout/UserSpecificLayout';
import { getToken, logoutUser } from './api/authApi'; 
import CustomThemeProvider from './theme/Theme';
import { UserProvider } from './contexts/UserContext';
import MonCompte from './pages/MonCompte';
import BiensPage from './pages/BiensPage';
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
import DocumentsPage from './pages/DocumentsPage';
import DelegationsPage from './pages/DelegationsPage';
import LocataireDetailsPage from './pages/LocataireDetailsPage';
import CalendrierPage from './pages/CalendrierPage';
import AuditLogsPage from './pages/AuditLogsPage';
// Public marketing pages
import { 
  FonctionnalitesPage, 
  GestionnaireProprietairePage, 
  LocatairePublicPage, 
  ModulesTransversesPage,
  AboutPage,
  BiensPublicsPage 
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
        <CustomThemeProvider>
            <Router>
                <Toaster position="top-center" toastOptions={{ duration: 4000, className: 'text-sm font-medium' }} />
                <Routes>
                    {/* Routes publiques */}
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginFormWithNavigation />} />
                    <Route path="/signup" element={<SignupFormWithNavigation />} />
                    
                    {/* Pages marketing publiques */}
                    <Route path="/fonctionnalites" element={<FonctionnalitesPage />} />
                    <Route path="/fonctionnalites/gestionnaire" element={<GestionnaireProprietairePage />} />
                    <Route path="/fonctionnalites/locataire" element={<LocatairePublicPage />} />
                    <Route path="/fonctionnalites/modules" element={<ModulesTransversesPage />} />
                    <Route path="/a-propos" element={<AboutPage />} />
                    <Route path="/biens-disponibles" element={<BiensPublicsPage />} />
                    
                    {/* Routes protégées */}
                    <Route 
                        path="/dashboard/*" 
                        element={
                            <ProtectedRoute>
                                <UserProvider>
                                    <UserSpecificLayout onLogout={handleLogout}>
                                        <Routes>
                                            <Route index element={<UserDashboardRedirect />} />
                                            <Route path="mon-compte" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<MonCompte />} />} />
                                            <Route path="biens" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<BiensPage />} />} />
                                            <Route path="locataires" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<Locataires />} />} />
                                            <Route path="locataires/:id" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<LocataireDetailsPage />} />} />
                                            <Route path="calendrier" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<CalendrierPage />} />} />
                                            <Route path="contrats" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Contrats />} />} />
                                            <Route path="documents" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<DocumentsPage />} />} />
                                            <Route path="finances" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Finances />} />} />
                                            <Route path="interventions" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<Interventions />} />} />
                                            <Route path="equipe" element={<RouteProtection allowedUserTypes={['proprietaire']} children={<DelegationsPage />} />} />
                                            <Route path="parametres" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Parametres />} />} />
                                            <Route path="rapports" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<Rapports />} />} />
                                            <Route path="audit-logs" element={<RouteProtection allowedUserTypes={['gestionnaire', 'admin']} children={<AuditLogsPage />} />} />
                                            <Route path="alertes" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Alertes />} />} />
                                            <Route path="mobile-money" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire']} children={<MobileMoney />} />} />
                                            <Route path="quittances" element={<RouteProtection allowedUserTypes={['gestionnaire', 'proprietaire', 'locataire']} children={<Quittances />} />} />
                                            <Route path="proprietaires" element={<RouteProtection allowedUserTypes={['gestionnaire']} children={<Proprietaires />} />} />
                                            <Route path="locataire" element={<LocataireDashboard />} />
                                            <Route path="locataire/*" element={<LocataireDashboard />} />
                                            <Route path="proprietaire" element={<ProprietaireDashboard />} />
                                            <Route path="proprietaire/*" element={<ProprietaireDashboard />} />
                                            <Route path="gestionnaire" element={<GestionnaireDashboard />} />
                                            <Route path="gestionnaire/*" element={<GestionnaireDashboard />} />
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
    );
};

export default App;
