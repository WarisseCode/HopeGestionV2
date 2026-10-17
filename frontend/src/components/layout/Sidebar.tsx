// frontend/src/components/layout/Sidebar.tsx
// Barre latérale du layout gestionnaire / admin / invité.
// Refonte T-070 (maquette T-069) : sections courtes toujours ouvertes (plus de groupes repliables),
// en-tête compact avec le bouton pour réduire en rail d'icônes, et réglages du compte regroupés
// dans le menu « Mon compte » ouvert depuis la carte du profil (avec la déconnexion).
import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, X, PanelLeft, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '../ui/ConfirmModal';
import { BRANDING } from '../../config';
import { buildDashboardMenu, buildAccountMenu } from './dashboardMenu';
import { pickActiveIndex } from './navMatching';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  userProfile: any;
  onLogout: () => void;
  alertsCount?: number;
}

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

const Sidebar: React.FC<SidebarProps & { isMobile: boolean }> = ({ isOpen, toggleSidebar, userProfile, onLogout, alertsCount = 0, isMobile }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  // Rail d'icônes : barre réduite sur grand écran (sur mobile, le tiroir est toujours complet).
  // Lignes de 36 px à la souris, 44 px au doigt dans le tiroir mobile.
  const rail = !isOpen && !isMobile;

  const menuGroups = buildDashboardMenu(userProfile, t, alertsCount);
  const accountItems = buildAccountMenu(userProfile, t);

  // Un seul élément actif : la meilleure correspondance avec l'URL, réglages du compte compris
  // (ils n'ont pas de pastille mais la carte du profil se marque comme active).
  const navPaths = menuGroups.flatMap(g => g.items.map(i => i.path));
  const allPaths = [...navPaths, ...accountItems.map(i => i.path)];
  const activeIdx = pickActiveIndex(allPaths.map(p => `/dashboard${p}`), location.pathname, location.hash);
  const activePath = activeIdx >= 0 ? allPaths[activeIdx] : null;
  const accountActive = activeIdx >= navPaths.length;

  // Menu du compte : fermé au clic à l'extérieur et à Échap (écouteurs posés seulement quand il est ouvert)
  useEffect(() => {
    if (!accountOpen) return;
    const onDown = (e: MouseEvent) => { if (!accountRef.current?.contains(e.target as Node)) setAccountOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setAccountOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [accountOpen]);

  const afterNavigate = () => {
    setAccountOpen(false);
    if (isMobile) toggleSidebar();
  };

  const name = userProfile?.nom || t('common.user');
  const roleLabel = userProfile?.role ? userProfile.role.charAt(0).toUpperCase() + userProfile.role.slice(1) : t('common.member');

  return (
    // reducedMotion="user" : si l'OS demande moins d'animations, la pastille active ne glisse plus
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
        aria-label={t('nav.mainNav')}
        className={`z-50 transition-[width,transform] duration-300 ease-in-out motion-reduce:transition-none flex flex-col items-stretch bg-base-100 border-r border-base-300/70
          ${isMobile
            ? `fixed inset-y-0 left-0 w-72 shadow-2xl transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`
            : `${isOpen ? 'w-64' : 'w-20'} relative h-full`
          }
        `}
      >
        {/* En-tête compact : logo + bouton pour réduire (fermer sur mobile) */}
        <div className={`h-16 shrink-0 flex items-center gap-2 border-b border-base-300/70 ${rail ? 'justify-center' : 'justify-between pl-4 pr-3'}`}>
          {/* Thème sombre : logo passé en blanc (même procédé que le pied de page public), sinon le « H » bleu foncé disparaît */}
          {!rail && <img src={BRANDING.logos.main} alt={BRANDING.name} className="h-9 w-auto object-contain dark:brightness-0 dark:invert" />}
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label={isMobile ? t('nav.closeMenu') : isOpen ? t('nav.collapseMenu') : t('nav.expandMenu')}
            title={isMobile ? undefined : isOpen ? t('nav.collapseMenu') : t('nav.expandMenu')}
            className={`w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-[10px] border border-base-300 text-base-content/70 hover:bg-base-200 hover:text-base-content transition-colors ${FOCUS}`}
          >
            {isMobile ? <X size={18} aria-hidden="true" /> : <PanelLeft size={18} aria-hidden="true" />}
          </button>
        </div>

        {/* Navigation : sections toujours ouvertes ; une section sans titre est précédée d'un simple séparateur */}
        <motion.nav layoutScroll className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-2.5 py-2.5 space-y-2.5 scrollbar-thin scrollbar-thumb-base-300/50 scrollbar-track-transparent">
          {menuGroups.map((group, idx) => (
            <div key={group.id} className="space-y-0.5">
              {!rail && group.title && (
                <p className="px-3 pt-0.5 pb-1 text-xs font-bold tracking-wide text-base-content/70">{group.title}</p>
              )}
              {idx > 0 && (rail || !group.title) && <div aria-hidden="true" className="h-px bg-base-300/70 mx-3 mb-1" />}

              {group.items.map(item => {
                const active = item.path === activePath;
                const hasBadge = !!item.badge && item.badge > 0;
                return (
                  <div key={item.path} className={rail ? 'tooltip tooltip-right w-full flex justify-center' : ''} data-tip={rail ? item.label : undefined}>
                    {/* T-045 : le fond actif est une pastille partagée (layoutId) qui glisse d'un élément à l'autre ;
                        layoutDependency limite l'animation au changement de page. Clair : bleu profond / blanc ;
                        sombre : bleu éclairci / bleu profond (couleurs primary du thème). */}
                    <Link
                      to={`/dashboard${item.path}`}
                      aria-current={active ? 'page' : undefined}
                      // Rail : icône seule, le nom vient de l'infobulle et de aria-label (T-054b)
                      aria-label={rail ? item.label : undefined}
                      onClick={afterNavigate}
                      className={`relative flex items-center gap-3 rounded-[10px] text-sm group ${isMobile ? 'h-11' : 'h-9'}
                        [transition:color_200ms,background-color_150ms,scale_150ms] active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 ${FOCUS}
                        ${rail ? 'w-12 justify-center' : 'px-3'}
                        ${active ? 'text-primary-content font-bold' : 'text-base-content/90 font-medium hover:bg-base-200 hover:text-base-content'}`}
                    >
                      {active && (
                        <motion.span
                          layoutId="sidebarActivePill"
                          layoutDependency={activePath}
                          className="absolute inset-0 bg-primary rounded-[10px]"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                        />
                      )}
                      <span aria-hidden="true" className={`relative z-10 shrink-0 ${active ? 'text-primary-content' : 'text-base-content/70 group-hover:text-base-content'}`}>
                        {item.icon}
                      </span>
                      {!rail && <span className="relative z-10 flex-1 min-w-0 truncate">{item.label}</span>}
                      {hasBadge && (
                        <span className={`z-10 inline-flex items-center justify-center rounded-full bg-error text-error-content font-bold tabular-nums
                          ${rail ? 'absolute top-0.5 right-0.5 min-w-4 h-4 px-1 text-[10px]' : 'relative min-w-5 h-5 px-1.5 text-[11px]'}`}>
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          ))}
        </motion.nav>

        {/* Compte : une carte cliquable qui ouvre le menu (profil, paramètres, abonnement, corbeille, déconnexion) */}
        <div ref={accountRef} className="relative shrink-0 p-2 border-t border-base-300/70">
          <AnimatePresence>
            {accountOpen && (
              <motion.div
                role="menu"
                aria-label={t('nav.accountMenu')}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className={`absolute bottom-full mb-1.5 z-50 w-60 p-1.5 rounded-xl bg-base-100 border border-base-300 shadow-xl ${rail ? 'left-2.5' : 'left-2.5 right-2.5 w-auto'}`}
              >
                {accountItems.map(item => (
                  <Link
                    key={item.path}
                    role="menuitem"
                    to={`/dashboard${item.path}`}
                    onClick={afterNavigate}
                    aria-current={item.path === activePath ? 'page' : undefined}
                    className={`flex items-center gap-2.5 h-10 px-3 rounded-lg text-sm text-base-content hover:bg-base-200 ${item.path === activePath ? 'font-bold bg-base-200' : 'font-medium'} ${FOCUS}`}
                  >
                    <span aria-hidden="true" className="text-base-content/70">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
                <div aria-hidden="true" className="h-px bg-base-300/70 mx-1.5 my-1" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setAccountOpen(false); setShowLogoutConfirm(true); }}
                  className={`w-full flex items-center gap-2.5 h-10 px-3 rounded-lg text-sm font-semibold text-error hover:bg-error/10 ${FOCUS}`}
                >
                  <LogOut size={16} aria-hidden="true" /> {t('common.logout')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={rail ? 'tooltip tooltip-right w-full flex justify-center' : ''} data-tip={rail ? t('nav.accountMenu') : undefined}>
            <button
              type="button"
              onClick={() => setAccountOpen(o => !o)}
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              aria-label={t('nav.accountOf', { name })}
              className={`w-full flex items-center gap-2.5 p-1.5 rounded-xl text-left transition-colors ${FOCUS}
                ${rail ? 'justify-center' : ''} ${accountOpen || accountActive ? 'bg-base-200' : 'hover:bg-base-200'}`}
            >
              <span className="w-9 h-9 shrink-0 rounded-full overflow-hidden bg-primary/15 text-primary dark:text-base-content inline-flex items-center justify-center text-[13px] font-bold">
                {userProfile?.photo_url
                  ? <img src={userProfile.photo_url} alt="" className="w-full h-full object-cover" />
                  : (userProfile?.nom?.substring(0, 2).toUpperCase() || 'WG')}
              </span>
              {!rail && (
                <>
                  <span className="flex-1 min-w-0 leading-tight">
                    <span className="block text-sm font-bold text-base-content truncate">{name}</span>
                    <span className="block text-xs text-base-content/70 truncate">{roleLabel}</span>
                  </span>
                  <ChevronUp size={16} aria-hidden="true" className={`shrink-0 text-base-content/70 transition-transform motion-reduce:transition-none ${accountOpen ? '' : 'rotate-180'}`} />
                </>
              )}
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
