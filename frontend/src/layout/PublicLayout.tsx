import React from 'react';
import PublicNavbar from '../components/public/PublicNavbar';
import PublicFooter from '../components/public/PublicFooter';
import ChatBot from '../components/ChatBot';

interface PublicLayoutProps {
    children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
    return (
        <div className="min-h-screen bg-base-100 font-sans text-base-content overflow-x-hidden flex flex-col">
            <PublicNavbar />
            <main className="flex-grow">
                {children}
            </main>
            <PublicFooter />
            {/* Pas de barre de navigation mobile en bas sur les pages publiques → FAB en coin bas. */}
            <ChatBot mobileBottomNav={false} />
        </div>
    );
};

export default PublicLayout;

