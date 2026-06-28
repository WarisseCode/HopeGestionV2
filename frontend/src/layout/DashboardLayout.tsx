import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { getProfile } from '../api/authApi';
import { getAlerts } from '../api/alertApi';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import BottomNav from '../components/layout/BottomNav';
import { useMobile } from '../hooks/useMobile';

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
              isSidebarOpen={isSidebarOpen}
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
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.15, ease: "easeOut" }}
               className="h-full max-w-7xl mx-auto"
             >
               {children}
             </motion.div>
           </AnimatePresence>
        </main>

      </div>
    </div>
  );
};

export default DashboardLayout;