
// frontend/src/components/layout/Header.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Home, ChevronRight, Settings, Crown, Sun, Moon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import NotificationBell from '../NotificationBell';
import SubscriptionBadge from '../SubscriptionBadge';
import { updateProfile } from '../../api/accountApi';
import SearchPalette from '../ui/SearchPalette';
import type { Crumb } from './navMatching';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  /** Fil d'Ariane sous « Bureau » (vide sur l'accueil), calculé par le layout à partir du menu. */
  breadcrumb: Crumb[];
  userProfile: any;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen, breadcrumb, userProfile, onLogout }) => {
  const { t } = useTranslation();
  const [theme, setTheme] = React.useState<'hopegestion' | 'dark'>('hopegestion');
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

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

  // Fil d'ariane : Bureau > libellé du menu (> sous-page : Détail, Nouveau…)
  const getBreadcrumbs = () => {
    return (
        <nav aria-label={t('header.breadcrumb')} className="hidden md:flex items-center gap-2 text-sm text-base-content/60 min-w-0">
            <Link to="/dashboard" className="hover:text-primary flex items-center gap-1 shrink-0">
                <Home size={14} />
                <span>{t('nav.bureau')}</span>
            </Link>
            {breadcrumb.map((crumb, i) => (
                <React.Fragment key={i}>
                    <ChevronRight size={14} className="shrink-0" />
                    {crumb.to ? (
                        <Link to={crumb.to} className="hover:text-primary truncate">{crumb.label}</Link>
                    ) : (
                        <span aria-current="page" className="font-medium text-base-content truncate">{crumb.label}</span>
                    )}
                </React.Fragment>
            ))}
        </nav>
    );
  };

  return (
    <header className="h-16 bg-gradient-to-r from-primary/5 via-base-100 to-base-100 backdrop-blur-md sticky top-0 z-20 flex items-center justify-between px-4 md:px-6 shadow-sm border-b border-base-200 transition-all gap-4">
        {/* Left: Toggle & Breadcrumbs — se comprime (min-w-0) pour laisser les actions de droite visibles */}
        <div className="flex items-center gap-4 min-w-0">
            <button 
              onClick={toggleSidebar} 
              className="p-2 rounded-lg hover:bg-base-200 text-base-content active:scale-95 transition-transform shrink-0"
              aria-label={t('header.toggleMenu')}
            >
                {isSidebarOpen ? <PanelLeftClose size={22} /> : <PanelLeftOpen size={22} />}
            </button>
            {getBreadcrumbs()}
        </div>

        {/* Right: Actions — jamais comprimées (thème, notifications, avatar toujours visibles) */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Search (Desktop only) */}
            <button 
                onClick={() => setIsSearchOpen(true)}
                className="hidden lg:flex items-center bg-base-200/50 rounded-full px-4 py-2 w-64 border border-transparent hover:border-primary/30 hover:bg-base-200 transition-all text-left text-sm text-base-content/50"
            >
                <Search size={16} className="mr-2" />
                <span>{t('common.search')}</span>
                <span className="ml-auto text-xs bg-base-100 px-1.5 py-0.5 rounded border border-base-200 shadow-sm font-mono">
                  ⌘K
                </span>
            </button>
            
            {/* Search Icon Mobile */}
            <button 
                onClick={() => setIsSearchOpen(true)}
                className="lg:hidden p-2 rounded-full hover:bg-base-200 text-base-content"
            >
                <Search size={20} />
            </button>

            {/* Subscription Badge — masqué de md à xl (sidebar ouverte, place insuffisante) ;
                l'abonnement reste accessible via le menu avatar */}
            <div className="hidden sm:block md:hidden xl:block">
                <SubscriptionBadge />
            </div>

            <div className="h-6 w-px bg-base-300 hidden sm:block md:hidden xl:block"></div>

            {/* Theme Toggle */}
            <button 
                onClick={handleToggleTheme}
                className="btn btn-ghost btn-circle"
                aria-label={t('header.toggleTheme')}
            >
                {theme === 'dark' ? <Sun size={20} className="text-warning" /> : <Moon size={20} className="text-base-content/60" />}
            </button>

            {/* Notifications */}
            <NotificationBell />

            {/* Profile Dropdown */}
            <div className="dropdown dropdown-end ml-1">
                <div
                    tabIndex={0}
                    role="button"
                    aria-label={t('header.userProfile')}
                    aria-haspopup="true"
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') (e.currentTarget as HTMLElement).click(); }}
                    className="btn btn-ghost btn-circle avatar online placeholder ring-2 ring-base-200 ring-offset-1 ring-offset-base-100 hover:ring-primary transition-all"
                >
                    <div className="w-9 rounded-full bg-neutral text-neutral-content flex items-center justify-center">
                        {/* Initials */}
                        <span className="text-xs font-bold">
                            {userProfile?.nom?.substring(0, 2).toUpperCase() || 'U'}
                        </span>
                    </div>
                </div>
                <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow-lg menu menu-sm dropdown-content bg-base-100 rounded-box w-56 border border-base-200">
                    <li className="menu-title px-4 py-2 border-b border-base-200 mb-2">
                        <span className="text-xs font-semibold opacity-50 uppercase tracking-wider">{t('nav.monCompte')}</span>
                        <div className="font-bold text-base-content mt-0.5 truncate">{userProfile?.nom}</div>
                        <div className="font-normal text-xs opacity-60 truncate">{userProfile?.email}</div>
                    </li>
                    <li>
                        <Link to="/dashboard/mon-compte" className="py-2">
                            <Settings size={16} />
                            {t('header.profileAndPreferences')}
                        </Link>
                    </li>
                    <li><Link to="/dashboard/abonnement" className="py-2"><Crown size={16} /> {t('header.mySubscription')}</Link></li>
                    <div className="divider my-1"></div>
                    <li>
                        <button onClick={onLogout} className="text-error hover:bg-error/10 py-2 font-medium">
                            {t('common.logoutConfirm')}
                        </button>
                    </li>
                </ul>
            </div>
        </div>
        
        {/* Global Search Palette */}
        <SearchPalette 
            isOpen={isSearchOpen} 
            onClose={() => setIsSearchOpen(false)} 
        />
    </header>
  );
};

export default Header;
