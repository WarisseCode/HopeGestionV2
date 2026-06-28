import React from 'react';
import { useLocation } from 'react-router-dom';
import PublicNavbar from '../components/public/PublicNavbar';
import PublicFooter from '../components/public/PublicFooter';
import ChatBot from '../components/ChatBot';

interface PublicLayoutProps {
    children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
    // Le ChatBot n'est présent QUE sur la page d'accueil (pas les autres pages publiques ni le dashboard).
    const isHome = useLocation().pathname === '/';
    return (
        <div className="min-h-screen bg-base-100 font-sans text-base-content overflow-x-hidden flex flex-col">
            <PublicNavbar />
            <main className="flex-grow">
                {children}
            </main>
            <PublicFooter />
            {/* Page d'accueil uniquement ; pas de barre de nav mobile → FAB en coin bas. */}
            {isHome && <ChatBot mobileBottomNav={false} />}
        </div>
    );
};

export default PublicLayout;

