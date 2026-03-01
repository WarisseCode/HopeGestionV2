import React, { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { getProfile } from '../api/authApi';
import { getAlerts } from '../api/alertApi';
import ChatBot from '../components/ChatBot';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useMobile } from '../hooks/useMobile';
import { OnboardingTour, useOnboarding } from '../components/ui/OnboardingTour';
import type { OnboardingStep } from '../components/ui/OnboardingTour';

interface DashboardLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, onLogout }) => {
  const isMobile = useMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [alertsCount, setAlertsCount] = useState(0);
  const location = useLocation();
  
  // Onboarding tour
  const { showTour, completeTour, skipTour } = useOnboarding();
  
  // Define onboarding steps
  const onboardingSteps: OnboardingStep[] = useMemo(() => [
    {
      target: '',
      title: '🎉 Bienvenue sur HopeGestion !',
      description: 'Nous sommes ravis de vous accueillir. Ce guide rapide vous présentera les fonctionnalités clés de la plateforme pour vous aider à démarrer.',
      placement: 'center',
    },
    {
      target: '#onboarding-sidebar',
      title: '📋 Navigation Latérale',
      description: 'Utilisez ce menu pour accéder à tous les modules : Propriétaires, Biens, Locataires, Locations, Finances... Chaque section regroupe les fonctionnalités associées.',
      placement: 'right',
    },
    {
      target: '#onboarding-header',
      title: '🔍 Actions Rapides',
      description: 'Ici vous trouverez la recherche globale, les notifications et l\'accès rapide à votre profil. Restez informé et réactif !',
      placement: 'bottom',
    },
    {
      target: '#onboarding-main-content',
      title: '📊 Votre Espace de Travail',
      description: 'C\'est ici que s\'affiche le contenu principal. Tableaux de bord, listes, formulaires... tout est accessible depuis cet espace central.',
      placement: 'center',
    },
  ], []);

  // Reset sidebar open state when mobile state changes
  useEffect(() => {
    setIsSidebarOpen(!isMobile);
  }, [isMobile]);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const profile = await getProfile();
        setUserProfile(profile.user);
      } catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
      }
    };

    fetchUserProfile();

    // Fetch alerts count
    const fetchAlertsCount = async () => {
        try {
            const { alerts } = await getAlerts();
            setAlertsCount(alerts.length);
        } catch (error) {
            console.error('Error fetching alerts count', error);
        }
    };
    fetchAlertsCount();
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Titre de page simple basé sur l'URL (mapping basique ou on laisse Header gérer via breadcrumbs)
  // Pour l'instant on passe un titre générique ou on extrait le dernier segment
  const getPageTitle = () => {
    const path = location.pathname.split('/').pop();
    if (!path) return 'Bureau';
    return path.charAt(0).toUpperCase() + path.slice(1).replace('-', ' ');
  };

  return (
    <div className="flex h-screen bg-base-200/50 font-sans text-base-content overflow-hidden">
      
      {/* Sidebar Component */}
      <div id="onboarding-sidebar">
        <Sidebar 
          isOpen={isSidebarOpen} 
          toggleSidebar={toggleSidebar} 
          userProfile={userProfile} 
          onLogout={onLogout}
          alertsCount={alertsCount}
          isMobile={isMobile}
        />
      </div>
      
      {/* Mobile Bottom Nav */}
      {isMobile && (
        <BottomNav 
          toggleSidebar={() => setIsSidebarOpen(true)} // Always open on header click
          userProfile={userProfile}
          alertsCount={alertsCount}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        
        {/* Header Component */}
        <div id="onboarding-header">
          <Header 
              toggleSidebar={toggleSidebar}
              pageTitle={getPageTitle()}
              userProfile={userProfile}
              onLogout={onLogout}
          />
        </div>

        {/* Content Scroll Area */}
        <main 
          id="onboarding-main-content"
          className={`flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative scrollbar-thin scrollbar-thumb-base-300 ${isMobile ? 'pb-24' : ''}`}
        >
           <AnimatePresence mode="wait">
             <motion.div
               key={location.pathname}
               initial={{ opacity: 0, y: 15, scale: 0.98 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.25, ease: "easeOut" }}
               className="h-full max-w-7xl mx-auto"
             >
               {children}
             </motion.div>
           </AnimatePresence>
        </main>

      </div>
      <ChatBot />
      
      {/* Onboarding Tour */}
      <OnboardingTour
        steps={onboardingSteps}
        onComplete={completeTour}
        onSkip={skipTour}
        isOpen={showTour}
      />
    </div>
  );
};

export default DashboardLayout;