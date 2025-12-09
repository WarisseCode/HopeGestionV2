// frontend/src/App.tsx (Code corrigé)

import React, { useState } from 'react';
import LoginForm from './components/LoginForm';
import Dashboard from './pages/Dashboard';
import HomePage from './HomePage';

import { getToken, getRole } from './api/authApi'; 

// Définition des états de vue possibles
type View = 'home' | 'login' | 'dashboard';

const App: React.FC = () => {
    const token = getToken();
    const role = getRole();
    
    // FIX PRINCIPAL : L'état initial est TOUJOURS 'home'
    const [currentView, setCurrentView] = useState<View>('home');

    // Logique de routage
    switch (currentView) {
        case 'home':
            return (
                <HomePage 
                    // Quand on clique sur "Connexion" sur la Home Page, on passe à l'état 'login'
                    onNavigateToLogin={() => setCurrentView('login')} 
                />
            );

        case 'login':
            // VÉRIFICATION : Si l'utilisateur clique sur 'Connexion' mais est DÉJÀ connecté (token présent),
            // nous le dirigeons immédiatement vers le Dashboard au lieu d'afficher le formulaire.
            if (token && role === 'gestionnaire') {
                return <Dashboard />;
            }
            
            // Sinon, afficher le formulaire de connexion
            return (
                <LoginForm 
                    onLoginSuccess={() => setCurrentView('dashboard')} 
                    onGoBackToHome={() => setCurrentView('home')} 
                />
            );
        
        case 'dashboard':
            // Afficher le Dashboard UNIQUEMENT si l'état est 'dashboard' ET que l'utilisateur est connecté.
            if (token && role === 'gestionnaire') {
                return <Dashboard />;
            }
            
            // Si l'état est 'dashboard' mais que le token a disparu, on revient à l'accueil
            return <HomePage onNavigateToLogin={() => setCurrentView('login')} />;
            
        default:
            return <HomePage onNavigateToLogin={() => setCurrentView('login')} />;
    }
};

export default App;