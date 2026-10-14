import React, { useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Wallet, Building2, Bell, User, Menu } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { pickActiveIndex } from './navMatching';

interface BottomNavProps {
  toggleSidebar: () => void;
  userProfile: any;
  alertsCount?: number;
  /** Hauteur réelle de la barre (px), pour que le layout réserve cet espace sous la zone de contenu. */
  onHeightChange?: (height: number) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ toggleSidebar, userProfile, alertsCount = 0, onHeightChange }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const navRef = useRef<HTMLDivElement>(null);

  // La barre est en position fixe : sans réservation de sa hauteur, elle recouvre le bas
  // de la zone scrollable (ex. boutons Suivant/Enregistrer des formulaires multi-étapes).
  useLayoutEffect(() => {
    const el = navRef.current;
    if (!el || !onHeightChange) return;
    const report = () => onHeightChange(Math.ceil(el.getBoundingClientRect().height));
    report();
    if (typeof ResizeObserver === 'undefined') {
      // Navigateurs anciens : à défaut d'observer la barre, on remesure au redimensionnement.
      window.addEventListener('resize', report);
      return () => {
        window.removeEventListener('resize', report);
        onHeightChange(0);
      };
    }
    const observer = new ResizeObserver(report);
    observer.observe(el);
    return () => {
      observer.disconnect();
      onHeightChange(0);
    };
  }, [onHeightChange]);

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
  const activeIndex = pickActiveIndex(navItems.map(i => i.path), location.pathname, location.hash);

  return (
    <div ref={navRef} className="fixed bottom-0 left-0 right-0 bg-base-100 border-t border-base-200 px-6 py-2 pb-safe z-40 md:hidden shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
      <div className="flex items-center justify-between max-w-md mx-auto">
        
        {/* Main Navigation Items */}
        {navItems.map((item, index) => {
          // Un seul élément actif ; « Accueil » l'est aussi sur l'accueil réel du rôle (/dashboard/gestionnaire)
          const isActive = index === activeIndex;

          return (
            <Link
              key={index}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
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
            </Link>
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
