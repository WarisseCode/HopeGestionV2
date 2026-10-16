
// frontend/src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, X, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '../ui/ConfirmModal';
import { BRANDING } from '../../config';
import { buildDashboardMenu } from './dashboardMenu';
import { pickActiveIndex } from './navMatching';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  userProfile: any;
  onLogout: () => void;
  alertsCount?: number;
}

const Sidebar: React.FC<SidebarProps & { isMobile: boolean }> = ({ isOpen, toggleSidebar, userProfile, onLogout, alertsCount = 0, isMobile }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // Ouvert par défaut : Activité ; le groupe de l'élément actif s'y ajoute (voir plus bas).
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    activite: true,
  });

  // Bascule calculée sur l'état affiché (et non via `prev =>`) : un rendu de navigation abandonné
  // (transition remplacée par une autre) peut laisser à React un état « dernier rendu » qui n'a
  // jamais été affiché ; avec `prev =>`, le premier clic sur un groupe était alors perdu (mesuré).
  const toggleGroup = (groupId: string) => {
    setExpandedGroups({
      ...expandedGroups,
      [groupId]: !expandedGroups[groupId]
    });
  };

  const menuGroups = buildDashboardMenu(userProfile, t, alertsCount);

  // Un seul élément actif : la meilleure correspondance avec l'URL. « Bureau » (/dashboard/)
  // reste actif sur l'accueil réel du rôle (/dashboard/gestionnaire), cible de la redirection.
  const activePath = (() => {
    const paths = menuGroups.flatMap(g => g.items.map(i => i.path));
    const idx = pickActiveIndex(paths.map(p => `/dashboard${p}`), location.pathname, location.hash);
    return idx >= 0 ? paths[idx] : null;
  })();
  const isActive = (path: string) => path === activePath;

  // Le groupe qui contient l'élément actif se rouvre à chaque changement d'élément actif
  // (chargement, profil chargé, navigation, y compris vers une autre page du même groupe replié).
  // Un repli manuel tient tant que l'élément actif ne change pas ; les autres groupes gardent leur état.
  const activeGroupId = menuGroups.find(g => g.items.some(i => i.path === activePath))?.id ?? null;
  const [lastActivePath, setLastActivePath] = useState<string | null>(null);
  if (activePath !== lastActivePath) {
    setLastActivePath(activePath);
    if (activeGroupId && !expandedGroups[activeGroupId]) {
      setExpandedGroups(prev => ({ ...prev, [activeGroupId]: true }));
    }
  }

  return (
    // reducedMotion="user" : si l'OS demande moins d'animations, la pastille ne glisse plus et la
    // hauteur des groupes saute (seule l'opacité reste animée).
    <MotionConfig reducedMotion="user">
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobile && isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      <aside 
          className={`shadow-2xl z-50 transition-all duration-300 ease-in-out flex flex-col items-stretch border-r border-base-200/50 backdrop-blur-xl
            ${isMobile 
                ? `fixed inset-y-0 left-0 w-72 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} bg-base-100/90` 
                : `${isOpen ? 'w-72' : 'w-20'} relative h-full bg-base-100/80`
            }
          `}
        >
          {/* Logo Area */}
          <div className="h-20 flex items-center justify-center px-4 border-b border-base-200/50 bg-transparent shrink-0">
            {(isOpen || isMobile) ? (
                 <div className="flex items-center justify-between w-full">
                    <img src={BRANDING.logos.main} alt={BRANDING.name} className="h-12 w-auto object-contain drop-shadow-sm" />
                    <button 
                      onClick={toggleSidebar} 
                      className="p-2 rounded-xl hover:bg-base-300/50 text-slate-400 hover:text-base-content/80 transition-colors md:hidden"
                    >
                      <X size={20} />
                    </button>
                 </div>
            ) : (
               <img src={BRANDING.logos.icon} alt={BRANDING.name} className="h-12 w-12 mx-auto object-contain drop-shadow-sm transition-transform hover:scale-110 cursor-pointer" onClick={toggleSidebar} />
            )}
          </div>

          {/* Navigation */}
          <motion.nav layoutScroll className="flex-1 overflow-y-auto px-3 py-6 space-y-6 scrollbar-thin scrollbar-thumb-base-300/50 scrollbar-track-transparent">
              {menuGroups.map((group, idx) => (
                  <div key={idx} className="group-section">
                      {/* Group Title */}
                      {(isOpen || isMobile) && (
                          <div
                              className="flex items-center justify-between px-3 mb-3 cursor-pointer text-[11px] font-bold text-base-content/60 uppercase tracking-widest hover:text-primary transition-colors"
                              onClick={() => toggleGroup(group.id)}
                          >
                              <span>{group.title}</span>
                              <motion.span
                                  className="inline-flex"
                                  initial={false}
                                  animate={{ rotate: expandedGroups[group.id] ? 0 : -90 }}
                                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                              >
                                  <ChevronDown size={14} />
                              </motion.span>
                          </div>
                      )}
                      
                     {/* Divider for collapsed view */}
                     {(!isOpen && !isMobile) && idx > 0 && <div className="h-px bg-base-200/50 my-4 mx-4"></div>}

                      {/* Group Items */}
                      <AnimatePresence initial={false}>
                          {((isOpen || isMobile) ? expandedGroups[group.id] : true) && (
                               <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{
                                    height: "auto",
                                    opacity: 1,
                                    transition: {
                                      height: { duration: 0.22, ease: [0.4, 0, 0.2, 1] },
                                      opacity: { duration: 0.16, delay: 0.06 },
                                    },
                                  }}
                                  exit={{
                                    height: 0,
                                    opacity: 0,
                                    transition: {
                                      height: { duration: 0.18, ease: [0.4, 0, 1, 1] },
                                      opacity: { duration: 0.1 },
                                    },
                                  }}
                                  className="space-y-1 overflow-hidden"
                               >
                                   {group.items.map((item, itemIdx) => (
                                      <div 
                                        key={item.path} 
                                        className={(!isOpen && !isMobile) ? "tooltip tooltip-right w-full flex justify-center z-50 dropdown-content" : ""} 
                                        data-tip={item.label}
                                      >
                                          {/* État actif = pastille des menus propriétaire/locataire (bg-primary). Les nuances
                                              primary-50/100/500/600/700 n'existent pas dans le thème (Tailwind 4) : seul ring-1
                                              s'appliquait, en currentColor, d'où un liseré noir collé au contenu. Mode réduit :
                                              classes exclusives (px-0/mx-1 étaient écrasées par px-3/mx-2).
                                              T-045 : le fond actif est une pastille partagée (layoutId) qui glisse d'un
                                              élément à l'autre ; texte en fondu 200 ms, survol = fond base-200 en 150 ms,
                                              léger enfoncement au clic (tout instantané si l'OS réduit les animations,
                                              sinon le libellé resterait 200 ms illisible après le saut de la pastille).
                                              layoutDependency : la pastille ne s'anime qu'au changement d'élément actif,
                                              pas quand un groupe au-dessus s'ouvre ou se ferme. Plus d'overflow-hidden sur le lien (il ne servait
                                              qu'à l'ancien effet de survol qui grossissait) pour ne pas couper le glissement. */}
                                          <Link
                                              to={`/dashboard${item.path}`}
                                              aria-current={isActive(item.path) ? 'page' : undefined}
                                              // Menu réduit : icône seule, l'infobulle ne nomme pas le lien ; même libellé que le
                                              // menu ouvert (buildDashboardMenu). Ouvert : nommé par son texte visible (T-054b)
                                              aria-label={(!isOpen && !isMobile) ? item.label : undefined}
                                              onClick={() => isMobile && toggleSidebar()}
                                              className={`
                                                flex items-center gap-3 rounded-xl group relative
                                                [transition:color_200ms,background-color_150ms,scale_150ms] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100
                                                ${(!isOpen && !isMobile) ? 'justify-center w-12 h-12 mx-1' : 'px-3 py-2.5 mx-2'}
                                                ${isActive(item.path)
                                                  ? 'text-primary-content font-bold'
                                                  : 'text-base-content/60 hover:bg-base-200 hover:text-base-content font-medium'
                                                }
                                              `}
                                          >
                                              {isActive(item.path) && (
                                                <motion.span
                                                  layoutId="sidebarActivePill"
                                                  layoutDependency={activePath}
                                                  className="absolute inset-0 bg-primary rounded-xl shadow-md shadow-primary/20"
                                                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                                                />
                                              )}

                                              {/* Menu réduit : l'icône porte seule le sens, slate-400 à 2,59:1 en clair ; slate-500 (sombre inchangé) (T-054a) */}
                                              <span className={`relative z-10 ${isActive(item.path) ? 'text-primary-content' : `${(!isOpen && !isMobile) ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400'} group-hover:text-primary`} transition-colors duration-200 motion-reduce:transition-none`}>
                                                  {item.icon}
                                              </span>
                                              
                                              {(isOpen || isMobile) && (
                                                  <div className="flex-1 flex justify-between items-center min-w-0 relative z-10">
                                                      <span className="truncate text-sm">{item.label}</span>
                                                      {item.badge && item.badge > 0 && (
                                                          <span className="flex items-center justify-center min-w-[20px] h-5 rounded-full bg-red-500 text-white text-[10px] font-bold px-1.5 shadow-sm">
                                                              {item.badge}
                                                          </span>
                                                      )}
                                                  </div>
                                              )}
                                          </Link>
                                      </div>
                                   ))}
                               </motion.div>
                          )}
                      </AnimatePresence>
                  </div>
              ))}
          </motion.nav>

          {/* Bottom Actions (Profile + Logout) */}
          <div className="p-4 border-t border-base-300 bg-base-200/50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0 flex flex-col gap-2">
              
              {/* User Profile Area */}
              <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${(!isOpen && !isMobile) ? 'justify-center cursor-pointer hover:bg-base-200/50' : 'hover:bg-base-100/50'} tooltip tooltip-right`} data-tip={(!isOpen && !isMobile) ? t('common.profile') : ""}>
                  <div className="avatar placeholder online shrink-0">
                    <div className="bg-gradient-to-br from-primary/10 to-primary/20 text-primary rounded-2xl w-10 h-10 flex items-center justify-center border border-primary/20 shadow-sm overflow-hidden ring-2 ring-transparent transition-all cursor-pointer hover:ring-primary/30">
                      {userProfile?.photo_url ? (
                        <img 
                          src={userProfile.photo_url} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold font-heading">
                            {userProfile?.nom?.substring(0, 2).toUpperCase() || 'WG'}
                        </span>
                      )}
                    </div>
                  </div>
                  {(isOpen || isMobile) && (
                      <div className="overflow-hidden flex-1 min-w-0 flex flex-col justify-center">
                          <p className="font-bold text-sm truncate text-base-content/90 font-heading leading-tight">{userProfile?.nom || t('common.user')}</p>
                          <p className="text-[11px] text-base-content/50 truncate capitalize font-medium mt-0.5">{userProfile?.role || t('common.member')}</p>
                      </div>
                  )}
              </div>

              {/* Logout Button */}
              <div className={(!isOpen && !isMobile) ? "tooltip tooltip-right w-full flex justify-center" : ""} data-tip={t('common.logout')}>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-error/80 hover:text-error hover:bg-error/10 w-full transition-all duration-300 group relative overflow-hidden
                    ${(!isOpen && !isMobile) ? 'justify-center w-12 h-12 px-0' : ''}
                  `}
                >
                  {/* Hover ripple */}
                  <span className="absolute inset-0 bg-error/5 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-xl origin-center" />
                  
                  <LogOut size={18} className="group-hover:scale-110 transition-transform relative z-10" />
                  {(isOpen || isMobile) && <span className="font-medium text-sm relative z-10">{t('common.logout')}</span>}
                </button>
              </div>
          </div>
        </aside>

        <ConfirmModal
          isOpen={showLogoutConfirm}
          onClose={() => setShowLogoutConfirm(false)}
          onConfirm={() => {
            setShowLogoutConfirm(false);
            onLogout();
          }}
          title={t('common.logoutTitle')}
          message={t('common.logoutMessage')}
          confirmLabel={t('common.logoutConfirm')}
          cancelLabel={t('common.cancel')}
          type="danger"
          icon={LogOut}
        />
    </MotionConfig>
  );
};

export default Sidebar;
