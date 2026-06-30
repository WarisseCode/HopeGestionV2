
// frontend/src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building2, Users, FileText, Wallet, Settings, Bell, 
  LayoutDashboard, LogOut, X, ChevronDown, ChevronRight,
  CreditCard, FolderOpen, BarChart3, Wrench, ShieldCheck,
  Calendar, CalendarCheck, ClipboardList, ClipboardCheck, Briefcase, Crown, Notebook, CheckSquare,
  Home, Activity, UserCog, Receipt, UserCheck, Boxes, Trash2
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '../ui/ConfirmModal';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  userProfile: any;
  onLogout: () => void;
  alertsCount?: number;
}

// Définition des groupes de menu
type MenuGroup = {
  id: string;       // clé stable (indépendante de la langue) pour l'état d'expansion
  title: string;    // libellé affiché (traduit)
  items: MenuItem[];
};

type MenuItem = {
  icon: React.ReactNode;
  label: string;
  path: string;
  badge?: number;
};

const Sidebar: React.FC<SidebarProps & { isMobile: boolean }> = ({ isOpen, toggleSidebar, userProfile, onLogout, alertsCount = 0, isMobile }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    principal: true,
    gestion: true,
  });

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.startsWith(`/dashboard${path}`);
  };

  // Logique de construction du menu grouper
  const getMenuGroups = (): MenuGroup[] => {
    const role = userProfile?.role || 'user';
    const type = userProfile?.userType; // 'locataire', 'proprietaire', etc.
    const perms = userProfile?.permissions || {};

    // --- 1. LOCATAIRE ---
    if (type === 'locataire') {
      return [
        {
          id: "principal",
          title: t('nav.groups.principal'),
          items: [
             { icon: <LayoutDashboard size={20} />, label: t('nav.bureau'), path: '/' },
             { icon: <Bell size={20} />, label: t('nav.mesAlertes'), path: '/alertes', badge: alertsCount },
          ]
        },
        {
          id: "monEspace",
          title: t('nav.groups.monEspace'),
          items: [
            { icon: <FileText size={20} />, label: t('nav.mesContrats'), path: '/contrats' },
            { icon: <CreditCard size={20} />, label: t('nav.payerEnLigne'), path: '/paiements-loyer' },
            { icon: <Wallet size={20} />, label: t('nav.mesPaiements'), path: '/finances' },
            { icon: <Receipt size={20} />, label: t('nav.mesQuittances'), path: '/quittances' },
            { icon: <FolderOpen size={20} />, label: t('nav.documents'), path: '/documents' },
            { icon: <UserCog size={20} />, label: t('nav.monCompte'), path: '/mon-compte' },
          ]
        }
      ];
    }

    // --- 2. PROPRIÉTAIRE ---
    if (type === 'proprietaire') {
      return [
        {
          id: "principal",
          title: t('nav.groups.principal'),
          items: [
            { icon: <LayoutDashboard size={20} />, label: t('nav.bureau'), path: '/' },
            { icon: <Crown size={20} />, label: t('nav.abonnement'), path: '/abonnement' },
            { icon: <Bell size={20} />, label: t('nav.alertes'), path: '/alertes', badge: alertsCount },
          ]
        },
        {
          id: "gestion",
          title: t('nav.groups.gestion'),
          items: [
            { icon: <Building2 size={20} />, label: t('nav.mesBiens'), path: '/biens' },
            { icon: <Users size={20} />, label: t('nav.mesLocataires'), path: '/locataires' },
            { icon: <FileText size={20} />, label: t('nav.locations'), path: '/locations' },
            { icon: <ClipboardList size={20} />, label: t('nav.contrats'), path: '/contrats' },
            { icon: <CalendarCheck size={20} />, label: t('nav.reservations'), path: '/reservations' },
          ]
        },
        {
          id: "finances",
          title: t('nav.groups.finances'),
          items: [
            { icon: <Wallet size={20} />, label: t('nav.financesItem'), path: '/finances' },
            { icon: <CreditCard size={20} />, label: t('nav.mobileMoney'), path: '/mobile-money' },
            { icon: <Receipt size={20} />, label: t('nav.quittances'), path: '/quittances' },
          ]
        },
        {
          id: "organisation",
          title: t('nav.groups.organisation'),
          items: [
            { icon: <Briefcase size={20} />, label: t('nav.monEquipe'), path: '/equipe' },
            { icon: <Calendar size={20} />, label: t('nav.calendrier'), path: '/calendrier' },
            { icon: <FolderOpen size={20} />, label: t('nav.documents'), path: '/documents' },
            { icon: <Wrench size={20} />, label: t('nav.interventions'), path: '/interventions' },
            { icon: <BarChart3 size={20} />, label: t('nav.rapports'), path: '/rapports' },
          ]
        },
        {
           id: "compte",
           title: t('nav.groups.compte'),
           items: [
               { icon: <Settings size={20} />, label: t('nav.parametres'), path: '/parametres' },
               { icon: <UserCog size={20} />, label: t('nav.monProfil'), path: '/mon-compte' },
           ]
        }
      ];
    }

    // --- 3. GESTIONNAIRE / ADMIN / GUEST ---
    // On construit dynamiquement selon les permissions
    
    // Groupe Principal
    const mainItems: MenuItem[] = [
        { icon: <LayoutDashboard size={20} />, label: t('nav.bureau'), path: '/' },
        { icon: <Bell size={20} />, label: t('nav.alertes'), path: '/alertes', badge: alertsCount },
    ];
    // if guest/admin/gestionnaire have access to subscription
    if (type !== 'guest') {
         mainItems.push({ icon: <Crown size={20} />, label: t('nav.abonnement'), path: '/abonnement' });
    }

    // Groupe Gestion
    const gestionItems: MenuItem[] = [];
    if (perms.biens_read || role === 'admin' || role === 'gestionnaire') gestionItems.push({ icon: <Building2 size={20} />, label: t('nav.parcImmobilier'), path: '/biens' });
    if (perms.locataires_read || role === 'admin' || role === 'gestionnaire') {
        gestionItems.push({ icon: <Users size={20} />, label: t('nav.locataires'), path: '/locataires' });
    }
    // Consolidation of renting activities
    if (perms.locataires_read || role === 'admin' || role === 'gestionnaire') {
        gestionItems.push({ icon: <Home size={20} />, label: t('nav.bauxLocations'), path: '/locations' });
        gestionItems.push({ icon: <ClipboardList size={20} />, label: t('nav.contrats'), path: '/contrats' });
    }
    if (role === 'admin' || role === 'gestionnaire') {
        gestionItems.push({ icon: <Boxes size={20} />, label: t('nav.inventaires'), path: '/inventories' });
        gestionItems.push({ icon: <ClipboardCheck size={20} />, label: t('nav.etatsDesLieux'), path: '/etats-des-lieux' });
        gestionItems.push({ icon: <CalendarCheck size={20} />, label: t('nav.reservations'), path: '/reservations' });
    }
    if ((perms.owners_read || role === 'admin' || role === 'gestionnaire') && type !== 'proprietaire') {
        gestionItems.push({ icon: <UserCheck size={20} />, label: t('nav.proprietaires'), path: '/proprietaires' });
    }

    // Groupe Finances
    const financeItems: MenuItem[] = [];
    if (perms.finance_read || role === 'admin' || role === 'gestionnaire') {
        financeItems.push({ icon: <Wallet size={20} />, label: t('nav.transactions'), path: '/finances' });
        financeItems.push({ icon: <Receipt size={20} />, label: t('nav.quittances'), path: '/quittances' });
    }
    if (perms.finance_validate || role === 'admin' || role === 'gestionnaire') {
        financeItems.push({ icon: <CreditCard size={20} />, label: t('nav.comptesMomo'), path: '/mobile-money' });
    }

    // Groupe Organisation
    const orgItems: MenuItem[] = [];
    if (perms.documents_read || role === 'admin' || role === 'gestionnaire') orgItems.push({ icon: <FolderOpen size={20} />, label: t('nav.documents'), path: '/documents' });
    if (role === 'admin' || role === 'gestionnaire') {
        orgItems.push({ icon: <Calendar size={20} />, label: t('nav.planning'), path: '/calendrier' });
        orgItems.push({ icon: <CheckSquare size={20} />, label: t('nav.taches'), path: '/tasks' });
        orgItems.push({ icon: <Wrench size={20} />, label: t('nav.interventions'), path: '/interventions' });
        orgItems.push({ icon: <BarChart3 size={20} />, label: t('nav.donneesRapports'), path: '/rapports' });
        orgItems.push({ icon: <Trash2 size={20} />, label: t('nav.corbeille'), path: '/corbeille' });
    }

    // Groupe Admin
    const adminItems: MenuItem[] = [];
     if (role === 'admin' || role === 'gestionnaire') adminItems.push({ icon: <ShieldCheck size={20} />, label: t('nav.auditSecurite'), path: '/audit-logs' });
    adminItems.push({ icon: <Settings size={20} />, label: t('nav.parametres'), path: '/parametres' });
    adminItems.push({ icon: <UserCog size={20} />, label: t('nav.monProfil'), path: '/mon-compte' });

    return [
        { id: "principal", title: t('nav.groups.principal'), items: mainItems },
        { id: "gestion", title: t('nav.groups.gestion'), items: gestionItems },
        { id: "finances", title: t('nav.groups.finances'), items: financeItems },
        { id: "organisation", title: t('nav.groups.organisation'), items: orgItems },
        { id: "administration", title: t('nav.groups.administration'), items: adminItems },
    ].filter(group => group.items.length > 0);
  };

  const menuGroups = getMenuGroups();

  return (
    <>
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
                    <img src="/logo.png" alt="Logo" className="h-12 w-auto object-contain drop-shadow-sm" />
                    <button 
                      onClick={toggleSidebar} 
                      className="p-2 rounded-xl hover:bg-base-300/50 text-slate-400 hover:text-base-content/80 transition-colors md:hidden"
                    >
                      <X size={20} />
                    </button>
                 </div>
            ) : (
               <img src="/logo.png" alt="Logo" className="h-10 w-10 mx-auto object-contain drop-shadow-sm transition-transform hover:scale-110 cursor-pointer" onClick={toggleSidebar} />
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-6 scrollbar-thin scrollbar-thumb-base-300/50 scrollbar-track-transparent">
              {menuGroups.map((group, idx) => (
                  <div key={idx} className="group-section">
                      {/* Group Title */}
                      {(isOpen || isMobile) && (
                          <div
                              className="flex items-center justify-between px-3 mb-3 cursor-pointer text-[11px] font-bold text-base-content/60 uppercase tracking-widest hover:text-primary transition-colors"
                              onClick={() => toggleGroup(group.id)}
                          >
                              <span>{group.title}</span>
                              {expandedGroups[group.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                      )}
                      
                     {/* Divider for collapsed view */}
                     {(!isOpen && !isMobile) && idx > 0 && <div className="h-px bg-base-200/50 my-4 mx-4"></div>}

                      {/* Group Items */}
                      <AnimatePresence initial={false}>
                          {((isOpen || isMobile) ? expandedGroups[group.id] : true) && (
                               <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="space-y-1 overflow-hidden"
                               >
                                   {group.items.map((item, itemIdx) => (
                                      <div 
                                        key={item.path} 
                                        className={(!isOpen && !isMobile) ? "tooltip tooltip-right w-full flex justify-center z-50 dropdown-content" : ""} 
                                        data-tip={item.label}
                                      >
                                          <Link 
                                              to={`/dashboard${item.path}`} 
                                              onClick={() => isMobile && toggleSidebar()} 
                                              className={`
                                                flex items-center gap-3 px-3 py-2.5 mx-2 rounded-xl transition-all duration-300 group relative overflow-hidden
                                                ${isActive(item.path) 
                                                  ? 'bg-gradient-to-r from-primary-50 to-transparent text-primary-700 font-bold shadow-sm ring-1 ring-primary-100/50' 
                                                  : 'text-base-content/60 hover:bg-base-200/50 hover:text-base-content font-medium'
                                                }
                                                ${(!isOpen && !isMobile) ? 'justify-center px-0 mx-1 w-12 h-12' : ''}
                                              `}
                                          >
                                              {isActive(item.path) && (
                                                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary-500 rounded-r-full shadow-[0_0_8px_rgba(var(--color-primary-500),0.6)]" />
                                              )}

                                              {/* Hover Effect Background */}
                                              {(!isActive(item.path)) && (
                                                <span className="absolute inset-0 bg-base-content/5 scale-0 group-hover:scale-100 transition-transform duration-300 rounded-xl origin-center" />
                                              )}

                                              <span className={`relative z-10 ${isActive(item.path) ? 'text-primary-600' : 'text-slate-400 group-hover:text-primary-500'} transition-colors duration-300`}>
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
          </nav>

          {/* Bottom Actions (Profile + Logout) */}
          <div className="p-4 border-t border-base-300 bg-base-200/50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] shrink-0 flex flex-col gap-2">
              
              {/* User Profile Area */}
              <div className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${(!isOpen && !isMobile) ? 'justify-center cursor-pointer hover:bg-base-200/50' : 'hover:bg-base-100/50'} tooltip tooltip-right`} data-tip={(!isOpen && !isMobile) ? t('common.profile') : ""}>
                  <div className="avatar placeholder online shrink-0">
                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 text-primary-600 rounded-2xl w-10 h-10 flex items-center justify-center border border-primary-200/50 shadow-sm overflow-hidden ring-2 ring-transparent transition-all cursor-pointer hover:ring-primary-300">
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
        />
    </>
  );
};

export default Sidebar;
