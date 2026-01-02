// frontend/src/layout/DashboardLayout.tsx
import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  FileText, 
  Wallet, 
  Settings, 
  Bell, 
  Search,
  Menu,
  X,
  LogOut,
  Wrench,
  User,
  BarChart3,
  CreditCard,
  FolderOpen,
  Calendar,
  Briefcase,
  ShieldCheck
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from '../components/ui/ThemeToggle';
import { getProfile } from '../api/authApi';
import ChatBot from '../components/ChatBot';

interface DashboardLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, onLogout }) => {
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

  // Fonction pour obtenir les éléments de menu en fonction du type d'utilisateur
  const getMenuItems = () => {
    const baseItems = [
      { icon: <LayoutDashboard size={20} />, label: 'Bureau', path: '/' },
      { icon: <User size={20} />, label: 'Mon Compte', path: '/mon-compte' },
    ];

    if (userProfile?.userType === 'locataire') {
      // Menu spécifique pour les locataires
      return [
        ...baseItems,
        { icon: <FileText size={20} />, label: 'Mes Contrats', path: '/contrats' },
        { icon: <FolderOpen size={20} />, label: 'Mes Documents', path: '/documents' },
        { icon: <Wallet size={20} />, label: 'Mes Paiements', path: '/finances' },
        { icon: <FileText size={20} />, label: 'Mes Quittances', path: '/quittances' },
        { icon: <Bell size={20} />, label: 'Mes Alertes', path: '/alertes' },
      ];
    } else if (userProfile?.userType === 'proprietaire') {
      // Menu spécifique pour les propriétaires
      return [
        ...baseItems,
        { icon: <Building2 size={20} />, label: 'Mes Biens', path: '/biens' },
        { icon: <Users size={20} />, label: 'Mes Locataires', path: '/locataires' },
        { icon: <Briefcase size={20} />, label: 'Mon Équipe', path: '/equipe' },
        { icon: <Calendar size={20} />, label: 'Calendrier', path: '/calendrier' },
        { icon: <FileText size={20} />, label: 'Mes Contrats', path: '/contrats' },
        { icon: <Wallet size={20} />, label: 'Mes Finances', path: '/finances' },
        { icon: <Wrench size={20} />, label: 'Mes Interventions', path: '/interventions' },
        { icon: <CreditCard size={20} />, label: 'Mobile Money', path: '/mobile-money' },
        { icon: <FolderOpen size={20} />, label: 'Documents', path: '/documents' },
        { icon: <FileText size={20} />, label: 'Mes Quittances', path: '/quittances' },
        { icon: <BarChart3 size={20} />, label: 'Mes Rapports', path: '/rapports' },
        { icon: <Bell size={20} />, label: 'Mes Alertes', path: '/alertes' },
        { icon: <Settings size={20} />, label: 'Paramètres', path: '/parametres' },
      ];
    } else if (userProfile?.userType === 'gestionnaire') {
      // Menu spécifique pour les gestionnaires
      return [
        ...baseItems,
        { icon: <Users size={20} />, label: 'Propriétaires', path: '/proprietaires' },
        { icon: <Building2 size={20} />, label: 'Biens', path: '/biens' },
        { icon: <Users size={20} />, label: 'Locataires', path: '/locataires' },
        { icon: <Calendar size={20} />, label: 'Calendrier', path: '/calendrier' },
        { icon: <FileText size={20} />, label: 'Contrats', path: '/contrats' },
        { icon: <Wallet size={20} />, label: 'Finances', path: '/finances' },
        { icon: <Wrench size={20} />, label: 'Interventions', path: '/interventions' },
        { icon: <CreditCard size={20} />, label: 'Mobile Money', path: '/mobile-money' },
        { icon: <FolderOpen size={20} />, label: 'Documents', path: '/documents' },
        { icon: <FileText size={20} />, label: 'Quittances', path: '/quittances' },
        { icon: <BarChart3 size={20} />, label: 'Rapports', path: '/rapports' },
        { icon: <ShieldCheck size={20} />, label: 'Audit & Sécurité', path: '/audit-logs' },
        { icon: <Bell size={20} />, label: 'Alertes', path: '/alertes' },
        { icon: <Settings size={20} />, label: 'Paramètres', path: '/parametres' },
      ];
    }

    // Par défaut, retourner le menu complet
    return [
      ...baseItems,
      { icon: <Users size={20} />, label: 'Propriétaires', path: '/proprietaires' },
      { icon: <Building2 size={20} />, label: 'Biens', path: '/biens' },
      { icon: <Users size={20} />, label: 'Locataires', path: '/locataires' },
      { icon: <FileText size={20} />, label: 'Contrats', path: '/contrats' },
      { icon: <Wallet size={20} />, label: 'Finances', path: '/finances' },
      { icon: <Wrench size={20} />, label: 'Interventions', path: '/interventions' },
      { icon: <CreditCard size={20} />, label: 'Mobile Money', path: '/mobile-money' },
      { icon: <FolderOpen size={20} />, label: 'Documents', path: '/documents' },
      { icon: <FileText size={20} />, label: 'Quittances', path: '/quittances' },
      { icon: <BarChart3 size={20} />, label: 'Rapports', path: '/rapports' },
      { icon: <Bell size={20} />, label: 'Alertes', path: '/alertes' },
      { icon: <Settings size={20} />, label: 'Paramètres', path: '/parametres' },
    ];
  };

  const menuItems = getMenuItems();

  // Fonction pour déterminer si un item de menu est actif
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.startsWith(`/dashboard${path}`);
  };

  const getCurrentPageTitle = () => {
    const currentItem = menuItems.find(item => {
        if (item.path === '/') {
            return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
        }
        return location.pathname.startsWith(`/dashboard${item.path}`);
    });
    return currentItem ? currentItem.label : "Vue d'ensemble";
  };

  const pageTitle = getCurrentPageTitle();

  return (
    <div className="flex h-screen bg-base-200 font-sans text-base-content overflow-hidden">
      
      {/* Sidebar */}
      <aside 
        className={`bg-base-100 shadow-lg z-20 transition-all duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'w-64' : 'w-20'} 
          fixed md:relative h-full
        `}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-base-200">
          {isSidebarOpen ? (
            <div className="flex items-center justify-center w-full">
              <img src="/logo.png" alt="Hope Gestion" className="h-10 w-auto" />
            </div>
          ) : (
             <img src="/logo.png" alt="HG" className="h-8 w-auto mx-auto" />
          )}
          <button 
            onClick={toggleSidebar} 
            className="p-1 rounded-lg hover:bg-base-200 md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Profile (Compact) */}
        <div className="p-4 border-b border-base-200 flex items-center gap-3">
            <div className="avatar placeholder">
              <div className="bg-neutral text-neutral-content rounded-full w-10 flex items-center justify-center">
                <span className="text-xs">WG</span>
              </div>
            </div>
            {isSidebarOpen && (
                <div className="overflow-hidden">
                    <p className="font-semibold text-sm truncate text-base-content">{userProfile?.nom || 'Utilisateur'}</p>
                    <p className="text-xs text-base-content/60 truncate">{userProfile?.userType || 'Utilisateur'}</p>
                </div>
            )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {menuItems.map((item, index) => (
            <Link 
              key={index} 
              to={`/dashboard${item.path}`} 
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200
                ${isActive(item.path) 
                  ? 'bg-primary text-primary-content shadow-sm translate-x-1' 
                  : 'hover:bg-base-200 text-base-content/70 hover:text-base-content hover:translate-x-1'
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
        <div className="p-4 border-t border-base-200">
           <button 
             onClick={onLogout}
             className={`flex items-center gap-3 px-3 py-2 rounded-lg text-error hover:bg-error/10 w-full transition-colors
               ${!isSidebarOpen && 'justify-center'}
             `}
           >
             <LogOut size={20} />
             {isSidebarOpen && <span className="font-medium text-sm">Déconnexion</span>}
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative ml-0 md:ml-0">
        {/* Top Header */}
        <header className="h-16 bg-base-100 shadow-sm z-10 flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-4">
                <button 
                  onClick={toggleSidebar} 
                  className="p-2 rounded-lg hover:bg-base-200 text-base-content"
                >
                    <Menu size={24} />
                </button>
                <div className="hidden md:flex items-center gap-2 text-sm text-base-content/60">
                  <span>Bureau</span>
                  <span>/</span>
                  <span className="font-semibold text-base-content">{pageTitle}</span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Search */}
                <div className="hidden md:flex items-center bg-base-200 rounded-lg px-3 py-2 w-64">
                    <Search size={18} className="text-base-content/50 mr-2" />
                    <input 
                      type="text" 
                      placeholder="Rechercher un bien, locataire..." 
                      className="bg-transparent border-none outline-none text-sm w-full text-base-content" 
                    />
                </div>

                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Notifications Dropdown */}
                <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="btn btn-ghost btn-circle">
                        <div className="indicator">
                            {/* Notifications */}
                             <div className="btn btn-ghost btn-circle">
                                <div className="indicator">
                                    <Bell size={20} />
                                    <span className="badge badge-xs badge-error indicator-item"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-80">
                        <li>
                            <a className="justify-between">
                                Loyer reçu - Apt A01
                                <span className="badge badge-success badge-xs">New</span>
                            </a>
                        </li>
                        <li><a>Fuite d'eau signalée - Apt B02</a></li>
                        <li><a>Nouveau locataire validé</a></li>
                        <li className="text-xs text-center pt-2 border-t border-base-200 mt-2 text-primary">
                            <Link to="/dashboard/alertes">Voir toutes les notifications</Link>
                        </li>
                    </ul>
                </div>

                {/* Profile Dropdown */}
                <div className="dropdown dropdown-end">
                    <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
                        <div className="w-10 rounded-full bg-neutral text-neutral-content flex items-center justify-center">
                           <span className="text-xs font-bold">WG</span>
                        </div>
                    </div>
                    <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
                        <li>
                            <Link to="/dashboard/mon-compte" className="justify-between">
                                Mon Compte
                                <span className="badge badge-ghost badge-sm">New</span>
                            </Link>
                        </li>
                        <li><Link to="/dashboard/parametres">Paramètres</Link></li>
                        <div className="divider my-0"></div> 
                        <li><a onClick={onLogout} className="text-error">Déconnexion</a></li>
                    </ul>
                </div>
            </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative bg-base-200">
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
      <ChatBot />
    </div>
  );
};

export default DashboardLayout;