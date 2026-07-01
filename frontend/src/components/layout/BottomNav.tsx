import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, Building2, Bell, User, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface BottomNavProps {
  toggleSidebar: () => void;
  userProfile: any;
  alertsCount?: number;
}

const BottomNav: React.FC<BottomNavProps> = ({ toggleSidebar, userProfile, alertsCount = 0 }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const role = userProfile?.role || 'user';
  const type = userProfile?.userType;

  // `label` contient une clé i18n, traduite au rendu via t(item.label).
  const getActionItem = () => {
    if (type === 'auth_proprietaire' || type === 'proprietaire') {
      return { icon: <Building2 size={24} />, label: 'nav.mesBiens', path: '/dashboard/biens' };
    }
    if (type === 'auth_locataire' || type === 'locataire') {
      return { icon: <Wallet size={24} />, label: 'nav.paiements', path: '/dashboard/finances' };
    }
    // Admin / Gestionnaire
    return { icon: <Bell size={24} />, label: 'nav.alertes', path: '/dashboard/alertes', badge: alertsCount };
  };

  const actionItem = getActionItem();

  const navItems = [
    { icon: <LayoutDashboard size={24} />, label: 'nav.accueil', path: '/dashboard' },
    actionItem,
    { icon: <User size={24} />, label: 'nav.profil', path: '/dashboard/mon-compte' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-200 px-6 py-2 pb-safe z-40 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between max-w-md mx-auto">
        
        {/* Main Navigation Items */}
        {navItems.map((item, index) => {
          // Special handling for home path matching
            const isActive = item.path === '/dashboard' 
                ? (location.pathname === '/' || location.pathname === '/dashboard' || location.pathname === '/dashboard/')
                : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={index}
              to={item.path}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 relative
                ${isActive ? 'text-primary' : 'text-base-content/50 hover:text-base-content/80'}
              `}
            >
              <div className="relative">
                {item.icon}
                {item.badge && item.badge > 0 && (
                     <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 rounded-full bg-error text-white text-[10px] font-bold px-1">
                        {item.badge}
                    </span>
                )}
              </div>
              <span className={`text-[10px] font-medium ${isActive ? 'font-bold' : ''}`}>
                {t(item.label)}
              </span>
              
              {isActive && (
                  <motion.div 
                    layoutId="bottomNavIndicator"
                    className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full shadow-sm"
                  />
              )}
            </NavLink>
          );
        })}

        {/* Menu Toggle */}
        <button
          onClick={toggleSidebar}
          className="flex flex-col items-center gap-1 p-2 text-base-content/50 hover:text-primary transition-colors"
        >
          <Menu size={24} />
          <span className="text-[10px] font-medium">{t('nav.menu')}</span>
        </button>

      </div>
    </div>
  );
};

export default BottomNav;
