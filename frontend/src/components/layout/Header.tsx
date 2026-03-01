
// frontend/src/components/layout/Header.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Home, ChevronRight, Settings, Crown, Sun, Moon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import NotificationBell from '../NotificationBell';
import SubscriptionBadge from '../SubscriptionBadge';
import { updateProfile } from '../../api/accountApi';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  pageTitle: string;
  userProfile: any;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen, pageTitle, userProfile, onLogout }) => {
  const location = useLocation();
  const [theme, setTheme] = React.useState<'hopegestion' | 'dark'>('hopegestion');

  React.useEffect(() => {
    const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'hopegestion';
    setTheme(currentTheme);
  }, [userProfile]);

  const handleToggleTheme = async () => {
    const newTheme = theme === 'hopegestion' ? 'dark' : 'hopegestion';
    setTheme(newTheme);
    
    // Application instantanée
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'hopegestion');
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', newTheme);

    // Sauvegarde en arrière-plan
    if (userProfile?.id) {
      try {
         const updatedProfile = {
             ...userProfile,
             preferences: {
                 ...(userProfile.preferences || {}),
                 theme: newTheme
             }
         };
         await updateProfile(updatedProfile);
      } catch (err) {
         console.error('Erreur sauvegarde thème', err);
      }
    }
  };

  // Helper pour générer le fil d'ariane simple (Home > Page Actuelle)
  const getBreadcrumbs = () => {
    return (
        <div className="hidden md:flex items-center gap-2 text-sm text-base-content/60">
            <Link to="/dashboard" className="hover:text-primary flex items-center gap-1">
                <Home size={14} />
                <span>Bureau</span>
            </Link>
            {location.pathname !== '/dashboard' && location.pathname !== '/dashboard/' && (
                <>
                    <ChevronRight size={14} />
                    <span className="font-medium text-base-content">{pageTitle}</span>
                </>
            )}
        </div>
    );
  };

  return (
    <header className="h-16 bg-gradient-to-r from-primary/5 via-base-100 to-base-100 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 md:px-6 shadow-sm border-b border-base-200 transition-all">
        {/* Left: Toggle & Breadcrumbs */}
        <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar} 
              className="p-2 rounded-lg hover:bg-base-200 text-base-content active:scale-95 transition-transform"
              aria-label="Toggle Menu"
            >
                {isSidebarOpen ? <PanelLeftClose size={22} /> : <PanelLeftOpen size={22} />}
            </button>
            {getBreadcrumbs()}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
            {/* Search (Desktop only) */}
            <div className="hidden lg:flex items-center bg-base-200/50 rounded-full px-4 py-2 w-64 border border-transparent focus-within:border-primary/30 focus-within:bg-base-100 transition-all">
                <Search size={16} className="text-base-content/40 mr-2" />
                <input 
                  type="text" 
                  placeholder="Rechercher..." 
                  className="bg-transparent border-none outline-none text-sm w-full text-base-content placeholder-base-content/40" 
                />
            </div>

            {/* Subscription Badge */}
            <div className="hidden sm:block">
                <SubscriptionBadge />
            </div>

            <div className="h-6 w-px bg-base-300 hidden sm:block"></div>

            {/* Theme Toggle */}
            <button 
                onClick={handleToggleTheme}
                className="btn btn-ghost btn-circle"
                aria-label="Basculer le thème"
            >
                {theme === 'dark' ? <Sun size={20} className="text-warning" /> : <Moon size={20} className="text-base-content/60" />}
            </button>

            {/* Notifications */}
            <NotificationBell />

            {/* Profile Dropdown */}
            <div className="dropdown dropdown-end ml-1">
                <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar online placeholder ring-2 ring-base-200 ring-offset-1 ring-offset-base-100 hover:ring-primary transition-all">
                    <div className="w-9 rounded-full bg-neutral text-neutral-content flex items-center justify-center">
                        {/* Initials */}
                        <span className="text-xs font-bold">
                            {userProfile?.nom?.substring(0, 2).toUpperCase() || 'U'}
                        </span>
                    </div>
                </div>
                <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-56 border border-base-200">
                    <li className="menu-title px-4 py-2 border-b border-base-200 mb-2">
                        <span className="text-xs font-semibold opacity-50 uppercase tracking-wider">Mon Compte</span>
                        <div className="font-bold text-base-content mt-0.5 truncate">{userProfile?.nom}</div>
                        <div className="font-normal text-xs opacity-60 truncate">{userProfile?.email}</div>
                    </li>
                    <li>
                        <Link to="/dashboard/mon-compte" className="py-2">
                            <Settings size={16} />
                            Profil et Préférences
                        </Link>
                    </li>
                    <li><Link to="/dashboard/abonnement" className="py-2"><Crown size={16} /> Mon Abonnement</Link></li>
                    <div className="divider my-1"></div> 
                    <li>
                        <button onClick={onLogout} className="text-error hover:bg-error/10 py-2 font-medium">
                            Se déconnecter
                        </button>
                    </li>
                </ul>
            </div>
        </div>
    </header>
  );
};

export default Header;
