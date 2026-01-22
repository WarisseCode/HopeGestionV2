// frontend/src/layout/DashboardLayout.tsx
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { getProfile } from '../api/authApi';
import { getAlerts } from '../api/alertApi';
import ChatBot from '../components/ChatBot';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [alertsCount, setAlertsCount] = useState(0);
  const location = useLocation();

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
            const alerts = await getAlerts();
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
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar} 
        userProfile={userProfile} 
        onLogout={onLogout}
        alertsCount={alertsCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        
        {/* Header Component */}
        <Header 
            toggleSidebar={toggleSidebar}
            pageTitle={getPageTitle()}
            userProfile={userProfile}
            onLogout={onLogout}
        />

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative scrollbar-thin scrollbar-thumb-base-300">
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
    </div>
  );
};

export default DashboardLayout;