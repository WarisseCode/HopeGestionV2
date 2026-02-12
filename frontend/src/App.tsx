import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AcceptInvite from './pages/AcceptInvite';
import CompleteProfile from './pages/CompleteProfile';
import UserDashboardRedirect from './pages/UserDashboardRedirect';
import UserSpecificRedirect from './pages/UserSpecificRedirect';
import Catalogue from './pages/public/Catalogue'; // New Public Catalogue

// Role specific dashboards
import GestionnaireDashboard from './pages/GestionnaireDashboard';
import ProprietaireDashboard from './pages/ProprietaireDashboard';
import LocataireDashboard from './pages/LocataireDashboard';

// Common pages
import Biens from './pages/Biens';
import Locataires from './pages/Locataires';
import Proprietaires from './pages/Proprietaires';
import Locations from './pages/Locations';
import Finances from './pages/Finances';
import Tickets from './pages/Tickets';
import Documents from './pages/Documents';
import Parametres from './pages/Parametres';
import MonCompte from './pages/MonCompte';
import TasksPage from './pages/TasksPage';
import AuditLogsPage from './pages/AuditLogsPage';
import Pricing from './pages/Pricing';
import Layout from './layout/Layout';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Chargement...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Chargement...</div>;
  return !user ? <>{children}</> : <Navigate to="/dashboard" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Catalogue />} /> {/* Home is now Catalogue */}
      <Route path="/catalogue" element={<Catalogue />} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
      <Route path="/accept-invite" element={<PublicRoute><AcceptInvite /></PublicRoute>} />
      <Route path="/complete-profile" element={<CompleteProfile />} />

      {/* Redirects */}
      <Route path="/dashboard" element={<PrivateRoute><UserDashboardRedirect /></PrivateRoute>} />
      <Route path="/redirect/:userId" element={<PrivateRoute><UserSpecificRedirect /></PrivateRoute>} />

      {/* Protected Routes with Layout */}
      <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<UserDashboardRedirect />} />

        {/* Dashboards */}
        <Route path="dashboard/gestionnaire" element={<GestionnaireDashboard />} />
        <Route path="dashboard/proprietaire" element={<ProprietaireDashboard />} />
        <Route path="dashboard/locataire" element={<LocataireDashboard />} />

        {/* Modules */}
        <Route path="biens" element={<Biens />} />
        <Route path="locataires" element={<Locataires />} />
        <Route path="proprietaires" element={<Proprietaires />} />
        <Route path="locations" element={<Locations />} />
        <Route path="finances" element={<Finances />} />
        <Route path="tickets" element={<Tickets />} />
        <Route path="documents" element={<Documents />} />
        <Route path="taches" element={<TasksPage />} />
        <Route path="mon-compte" element={<MonCompte />} />
        <Route path="parametres" element={<Parametres />} />
        <Route path="audit" element={<AuditLogsPage />} />
        <Route path="abonnement" element={<Pricing />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <Toaster position="top-right" />
          <AppRoutes />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
