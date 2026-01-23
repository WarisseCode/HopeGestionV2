
// frontend/src/components/layout/Sidebar.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Building2, Users, FileText, Wallet, Settings, Bell, 
  LayoutDashboard, LogOut, X, ChevronDown, ChevronRight,
  CreditCard, FolderOpen, BarChart3, Wrench, ShieldCheck,
  Calendar, CalendarCheck, ClipboardList, ClipboardCheck, Briefcase, Crown, Notebook, CheckSquare
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  userProfile: any;
  onLogout: () => void;
  alertsCount?: number;
}

// Définition des groupes de menu
type MenuGroup = {
  title: string;
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
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Principal": true,
    "Gestion": true,
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
          title: "Principal",
          items: [
             { icon: <LayoutDashboard size={20} />, label: 'Bureau', path: '/' },
             { icon: <Bell size={20} />, label: 'Mes Alertes', path: '/alertes', badge: alertsCount },
          ]
        },
        {
          title: "Mon Espace",
          items: [
            { icon: <FileText size={20} />, label: 'Mes Contrats', path: '/contrats' },
            { icon: <Wallet size={20} />, label: 'Mes Paiements', path: '/finances' },
            { icon: <FileText size={20} />, label: 'Mes Quittances', path: '/quittances' },
            { icon: <FolderOpen size={20} />, label: 'Documents', path: '/documents' },
            { icon: <Settings size={20} />, label: 'Mon Compte', path: '/mon-compte' },
          ]
        }
      ];
    }

    // --- 2. PROPRIÉTAIRE ---
    if (type === 'proprietaire') {
      return [
        {
          title: "Principal",
          items: [
            { icon: <LayoutDashboard size={20} />, label: 'Bureau', path: '/' },
            { icon: <Crown size={20} />, label: 'Abonnement', path: '/abonnement' },
            { icon: <Bell size={20} />, label: 'Alertes', path: '/alertes', badge: alertsCount },
          ]
        },
        {
          title: "Gestion",
          items: [
            { icon: <Building2 size={20} />, label: 'Mes Biens', path: '/biens' },
            { icon: <Users size={20} />, label: 'Mes Locataires', path: '/locataires' },
            { icon: <FileText size={20} />, label: 'Locations', path: '/locations' },
            { icon: <CalendarCheck size={20} />, label: 'Réservations', path: '/reservations' },
          ]
        },
        {
          title: "Finances",
          items: [
            { icon: <Wallet size={20} />, label: 'Finances', path: '/finances' },
            { icon: <CreditCard size={20} />, label: 'Mobile Money', path: '/mobile-money' },
            { icon: <FileText size={20} />, label: 'Quittances', path: '/quittances' },
          ]
        },
        {
          title: "Organisation",
          items: [
            { icon: <Briefcase size={20} />, label: 'Mon Équipe', path: '/equipe' },
            { icon: <Calendar size={20} />, label: 'Calendrier', path: '/calendrier' },
            { icon: <FolderOpen size={20} />, label: 'Documents', path: '/documents' },
            { icon: <Wrench size={20} />, label: 'Interventions', path: '/interventions' },
            { icon: <BarChart3 size={20} />, label: 'Rapports', path: '/rapports' },
          ]
        },
        {
           title: "Compte",
           items: [
               { icon: <Settings size={20} />, label: 'Paramètres', path: '/parametres' },
               { icon: <Settings size={20} />, label: 'Mon Profil', path: '/mon-compte' },
           ]
        }
      ];
    }

    // --- 3. GESTIONNAIRE / ADMIN / GUEST ---
    // On construit dynamiquement selon les permissions
    
    // Groupe Principal
    const mainItems: MenuItem[] = [
        { icon: <LayoutDashboard size={20} />, label: 'Bureau', path: '/' },
        { icon: <Bell size={20} />, label: 'Alertes', path: '/alertes', badge: alertsCount },
    ];
    // if guest/admin/gestionnaire have access to subscription
    if (type !== 'guest') {
         mainItems.push({ icon: <Crown size={20} />, label: 'Abonnement', path: '/abonnement' });
    }

    // Groupe Gestion
    const gestionItems: MenuItem[] = [];
    if (perms.biens_read || role === 'admin' || role === 'gestionnaire') gestionItems.push({ icon: <Building2 size={20} />, label: 'Biens', path: '/biens' });
    if (perms.locataires_read || role === 'admin' || role === 'gestionnaire') {
        gestionItems.push({ icon: <Users size={20} />, label: 'Locataires', path: '/locataires' });
        gestionItems.push({ icon: <FileText size={20} />, label: 'Locations', path: '/locations' });
    }
    if (role === 'admin' || role === 'gestionnaire') gestionItems.push({ icon: <CalendarCheck size={20} />, label: 'Réservations', path: '/reservations' });
    if (role === 'admin' || role === 'gestionnaire') gestionItems.push({ icon: <ClipboardList size={20} />, label: 'Inventaires', path: '/inventaires' });
    if (role === 'admin' || role === 'gestionnaire') gestionItems.push({ icon: <ClipboardCheck size={20} />, label: 'États des Lieux', path: '/etats-des-lieux' });
    if ((perms.owners_read || role === 'admin' || role === 'gestionnaire') && type !== 'proprietaire') {
        // Pour un gestionnaire, les proprios sont dans "Clientèle" ou "Gestion"
        gestionItems.push({ icon: <Users size={20} />, label: 'Propriétaires', path: '/proprietaires' }); 
    }

    // Groupe Finances
    const financeItems: MenuItem[] = [];
    if (perms.finance_read || role === 'admin' || role === 'gestionnaire') {
        financeItems.push({ icon: <Wallet size={20} />, label: 'Finances', path: '/finances' });
        financeItems.push({ icon: <FileText size={20} />, label: 'Quittances', path: '/quittances' });
    }
    if (perms.finance_validate || role === 'admin' || role === 'gestionnaire') {
        financeItems.push({ icon: <CreditCard size={20} />, label: 'Mobile Money', path: '/mobile-money' });
    }

    // Groupe Organisation
    const orgItems: MenuItem[] = [];
    if (perms.contrats_read || role === 'admin' || role === 'gestionnaire') orgItems.push({ icon: <FileText size={20} />, label: 'Contrats', path: '/contrats' });
    if (perms.documents_read || role === 'admin' || role === 'gestionnaire') orgItems.push({ icon: <FolderOpen size={20} />, label: 'Documents', path: '/documents' });
    if (role === 'admin' || role === 'gestionnaire') orgItems.push({ icon: <Notebook size={20} />, label: 'Carnet', path: '/carnet' }); // Module XI
    if (role === 'admin' || role === 'gestionnaire') orgItems.push({ icon: <CheckSquare size={20} />, label: 'Tâches', path: '/tasks' }); // Module XIV
    if (role === 'admin' || role === 'gestionnaire') orgItems.push({ icon: <Wrench size={20} />, label: 'Interventions', path: '/interventions' });
    if (role === 'admin' || role === 'gestionnaire') orgItems.push({ icon: <Calendar size={20} />, label: 'Calendrier', path: '/calendrier' });
    if (role === 'admin' || role === 'gestionnaire') orgItems.push({ icon: <BarChart3 size={20} />, label: 'Rapports', path: '/rapports' });

    // Groupe Admin
    const adminItems: MenuItem[] = [];
     if (role === 'admin' || role === 'gestionnaire') adminItems.push({ icon: <ShieldCheck size={20} />, label: 'Audit & Sécurité', path: '/audit-logs' });
    adminItems.push({ icon: <Settings size={20} />, label: 'Paramètres', path: '/parametres' });
    adminItems.push({ icon: <Settings size={20} />, label: 'Mon Profil', path: '/mon-compte' });

    return [
        { title: "Principal", items: mainItems },
        { title: "Gestion", items: gestionItems },
        { title: "Finances", items: financeItems },
        { title: "Organisation", items: orgItems },
        { title: "Administration", items: adminItems },
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
          className={`bg-base-100 shadow-xl z-50 transition-all duration-300 ease-in-out flex flex-col items-stretch 
            ${isMobile 
                ? `fixed inset-y-0 left-0 w-72 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}` 
                : `${isOpen ? 'w-72' : 'w-20'} relative h-full border-r border-base-200`
            }
          `}
        >
          {/* Logo Area */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-base-200 bg-base-100 shrink-0">
            {(isOpen || isMobile) ? (
                 <img src="/logo.png" alt="Hg" className="h-10 w-auto object-contain" />
            ) : (
               <img src="/logo.png" alt="HG" className="h-8 w-8 mx-auto object-contain" />
            )}
            <button 
              onClick={toggleSidebar} 
              className="p-1.5 rounded-lg hover:bg-base-200 md:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* User Profile (Compact) - Only visible when collapsed or at top */}
          <div className="py-4 px-3 border-b border-base-200 flex items-center gap-3 bg-base-100/50 shrink-0">
              <div className="avatar placeholder online">
                <div className="bg-primary/10 text-primary rounded-full w-10 h-10 flex items-center justify-center border border-primary/20">
                  <span className="text-sm font-bold">
                      {userProfile?.nom?.substring(0, 2).toUpperCase() || 'WG'}
                  </span>
                </div>
              </div>
              {(isOpen || isMobile) && (
                  <div className="overflow-hidden flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate text-base-content">{userProfile?.nom || 'Utilisateur'}</p>
                      <p className="text-xs text-base-content/60 truncate capitalize">{userProfile?.role || 'Membre'}</p>
                  </div>
              )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-base-300 scrollbar-track-transparent">
              {menuGroups.map((group, idx) => (
                  <div key={idx} className="group-section">
                      {/* Group Title */}
                      {(isOpen || isMobile) && (
                          <div 
                              className="flex items-center justify-between px-2 mb-2 cursor-pointer text-xs font-bold text-base-content/40 uppercase tracking-wider hover:text-primary transition-colors"
                              onClick={() => toggleGroup(group.title)}
                          >
                              <span>{group.title}</span>
                              {expandedGroups[group.title] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </div>
                      )}
                      
                     {/* Divider for collapsed view */}
                     {(!isOpen && !isMobile) && idx > 0 && <div className="h-px bg-base-200 my-2 mx-2"></div>}

                      {/* Group Items */}
                      <AnimatePresence initial={false}>
                          {((isOpen || isMobile) ? expandedGroups[group.title] : true) && (
                               <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="space-y-1 overflow-hidden"
                               >
                                   {group.items.map((item, itemIdx) => (
                                      <Link 
                                          key={itemIdx} 
                                          to={`/dashboard${item.path}`} 
                                          onClick={() => isMobile && toggleSidebar()} // Auto-close on mobile
                                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                                              ${isActive(item.path) 
                                                  ? 'bg-primary/10 text-primary font-medium' 
                                                  : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                                              }
                                              ${(!isOpen && !isMobile) && 'justify-center'}
                                          `}
                                          title={(!isOpen && !isMobile) ? item.label : ''}
                                      >
                                          <span className={`${isActive(item.path) ? 'text-primary' : 'text-base-content/60 group-hover:text-base-content'}`}>
                                              {item.icon}
                                          </span>
                                          
                                          {(isOpen || isMobile) && (
                                              <div className="flex-1 flex justify-between items-center">
                                                  <span className="text-sm">{item.label}</span>
                                                  {item.badge && item.badge > 0 && (
                                                      <span className="flex items-center justify-center min-w-[20px] h-5 rounded-full bg-error text-white text-[10px] font-bold px-1.5">
                                                          {item.badge}
                                                      </span>
                                                  )}
                                              </div>
                                          )}
                                          
                                          {/* Active Indicator Bar */}
                                          {isActive(item.path) && (
                                              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full"></div>
                                          )}
                                      </Link>
                                   ))}
                               </motion.div>
                          )}
                      </AnimatePresence>
                  </div>
              ))}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-base-200 bg-base-100/50 shrink-0">
             <button 
               onClick={onLogout}
               className={`flex items-center gap-3 px-3 py-2 rounded-lg text-error hover:bg-error/10 w-full transition-colors group
                 ${(!isOpen && !isMobile) && 'justify-center'}
               `}
               title="Déconnexion"
             >
               <LogOut size={20} className="group-hover:scale-110 transition-transform" />
               {(isOpen || isMobile) && <span className="font-medium text-sm">Déconnexion</span>}
             </button>
          </div>
        </aside>
    </>
  );
};

export default Sidebar;
