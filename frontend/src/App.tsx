// frontend/src/App.tsx

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import Dashboard from './pages/Dashboard';
import HomePage from './HomePage';
import { getToken, getRole } from './api/authApi'; 

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const token = getToken();
    const role = getRole();
    
    if (!token || role !== 'gestionnaire') {
        return <Navigate to="/login.html" replace />;
    }
    
    return <>{children}</>;
};

// Public Route (redirects to dashboard if already logged in)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const token = getToken();
    const role = getRole();
    
    if (token && role === 'gestionnaire') {
        return <Navigate to="/dashboard.html" replace />;
    }
    
    return <>{children}</>;
};

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <Routes>
                {/* Home Page */}
                <Route path="/" element={<HomePage />} />
                
                {/* Login Page */}
                <Route path="/login.html" element={
                    <PublicRoute>
                        <LoginForm />
                    </PublicRoute>
                } />
                <Route path="/login" element={<Navigate to="/login.html" replace />} />

                {/* Register Page */}
                <Route path="/register.html" element={
                    <PublicRoute>
                        <RegisterForm />
                    </PublicRoute>
                } />
                <Route path="/register" element={<Navigate to="/register.html" replace />} />

                {/* Dashboard */}
                <Route path="/dashboard.html" element={
                    <ProtectedRoute>
                        <Dashboard />
                    </ProtectedRoute>
                } />
                <Route path="/dashboard" element={<Navigate to="/dashboard.html" replace />} />

                {/* Fallback for unknown routes */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
};

export default App;
