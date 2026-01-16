// frontend/src/layout/AdminLayout.tsx
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Building,
  DollarSign,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  Activity,
  Bell
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from '../components/ui/ThemeToggle';
import { getProfile } from '../api/authApi';

interface AdminLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, onLogout }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
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
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Tableau de bord', path: '/admin' },
    { icon: <Users size={20} />, label: 'Utilisateurs', path: '/admin/users' },
    { icon: <Building size={20} />, label: 'Agences', path: '/admin/agencies' },
    { icon: <DollarSign size={20} />, label: 'Finances', path: '/admin/finances' },
    { icon: <Activity size={20} />, label: 'Audit Logs', path: '/admin/logs' },
    { icon: <Settings size={20} />, label: 'Configuration', path: '/admin/settings' },
  ];

  const isActive = (path: string) => {
    if (path === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-base-200 font-sans text-base-content overflow-hidden">
      
      {/* Admin Sidebar - Distinctive Purple Theme */}
      <aside 
        className={`bg-primary text-primary-content shadow-xl z-30 transition-all duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'w-64' : 'w-20'} 
          fixed md:relative h-full
        `}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-primary-content/10 bg-primary-focus">
          {isSidebarOpen ? (
            <div className="flex items-center gap-2 font-bold text-xl">
              <ShieldAlert className="text-warning" />
              <span>SUPER ADMIN</span>
            </div>
          ) : (
             <ShieldAlert className="mx-auto text-warning" />
          )}
          <button 
            onClick={toggleSidebar} 
            className="p-1 rounded-lg hover:bg-primary-focus md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-primary-content/10 flex items-center gap-3 bg-primary-focus/50">
            <div className="avatar placeholder">
              <div className="bg-warning text-warning-content rounded-full w-10 flex items-center justify-center">
                <span className="text-xs font-bold">SA</span>
              </div>
            </div>
            {isSidebarOpen && (
                <div className="overflow-hidden">
                    <p className="font-semibold text-sm truncate">{userProfile?.nom || 'Admin'}</p>
                    <p className="text-xs opacity-70 truncate">Super Administrateur</p>
                </div>
            )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {menuItems.map((item, index) => (
            <Link 
              key={index} 
              to={item.path} 
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200
                ${isActive(item.path) 
                  ? 'bg-white text-primary font-bold shadow-md translate-x-1' 
                  : 'hover:bg-primary-focus text-primary-content/80 hover:text-white hover:translate-x-1'
                }
                ${!isSidebarOpen && 'justify-center'}
              `}
            >
              {item.icon}
              {isSidebarOpen && <span className="font-medium text-sm">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-primary-content/10 bg-primary-focus/30">
           <button 
             onClick={onLogout}
             className={`flex items-center gap-3 px-3 py-2 rounded-lg text-primary-content hover:bg-error/20 hover:text-error w-full transition-colors
               ${!isSidebarOpen && 'justify-center'}
             `}
           >
             <LogOut size={20} />
             {isSidebarOpen && <span className="font-medium text-sm">Déconnexion</span>}
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        {/* Top Header */}
        <header className="h-16 bg-base-100 shadow-sm z-10 flex items-center justify-between px-4 md:px-8 border-b border-base-200">
            <div className="flex items-center gap-4">
                <button 
                  onClick={toggleSidebar} 
                  className="p-2 rounded-lg hover:bg-base-200 text-base-content"
                >
                  <Menu size={24} />
                </button>
                <div className="hidden md:flex flex-col">
                  <span className="text-xs text-base-content/50 font-bold uppercase tracking-wider">Espace Administration</span>
                  <span className="font-bold text-lg text-primary">Vue Globale</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <ThemeToggle />
                <div className="indicator">
                    <Bell className="text-base-content/70" />
                    <span className="badge badge-xs badge-error indicator-item"></span>
                </div>
            </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-base-200/50">
           <AnimatePresence mode="wait">
             <motion.div
               key={location.pathname}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -10 }}
               transition={{ duration: 0.2 }}
               className="h-full"
             >
               {children}
             </motion.div>
           </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
