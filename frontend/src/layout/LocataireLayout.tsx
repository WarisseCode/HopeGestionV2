// frontend/src/layout/LocataireLayout.tsx
// Layout dédié au rôle "locataire" — espace personnel, lecture seule.
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Home, Wallet, FileText,
    FolderOpen, Bell, Settings, LogOut,
    MessageSquare, ChevronRight, Menu, X, UserCog, Receipt
} from 'lucide-react';
import { getProfile } from '../api/authApi';
import { getAlerts } from '../api/alertApi';
import { useMobile } from '../hooks/useMobile';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '../components/ui/ConfirmModal';
import { BRANDING } from '../config/branding';
import NotificationBell from '../components/NotificationBell';
import { pickActiveIndex, resolveBreadcrumb, type Crumb } from '../components/layout/navMatching';

interface LocataireLayoutProps {
    children: React.ReactNode;
    onLogout: () => void;
}

// `label` contient une clé i18n, traduite au rendu via t(item.label).
const NAV_ITEMS = [
    { icon: LayoutDashboard, label: 'nav.tableauDeBord',    path: '/dashboard/locataire' },
    // Ancre vers la carte « logement » du tableau de bord : sans elle, les deux entrées pointaient
    // vers la même URL et s'allumaient ensemble.
    { icon: Home,            label: 'nav.monLogement',      path: '/dashboard/locataire#logement' },
    { icon: Wallet,          label: 'nav.mesPaiements',     path: '/dashboard/finances' },
    { icon: FileText,        label: 'nav.monContrat',       path: '/dashboard/contrats' },
    { icon: FolderOpen,      label: 'nav.documents',        path: '/dashboard/documents' },
    { icon: Receipt,         label: 'nav.quittances',       path: '/dashboard/quittances' },
    { icon: MessageSquare,   label: 'nav.plaintesIncidents', path: '/dashboard/alertes' },
];

const BOTTOM_ITEMS = [
    { icon: Bell,    label: 'nav.notifications', path: '/dashboard/alertes' },
    { icon: Settings, label: 'nav.parametres',   path: '/dashboard/parametres' },
    { icon: UserCog, label: 'nav.monProfil',     path: '/dashboard/mon-compte' },
];

const LocataireLayout: React.FC<LocataireLayoutProps> = ({ children, onLogout }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isMobile = useMobile();
    const { t } = useTranslation();
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [alertsCount, setAlertsCount] = useState(0);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    useEffect(() => { setSidebarOpen(!isMobile); }, [isMobile]);

    useEffect(() => {
        getProfile().then(p => setUserProfile(p.user)).catch(() => navigate('/login'));
        getAlerts().then(({ alerts }) => setAlertsCount(alerts.length)).catch(() => {});
    }, []);

    // Un seul élément actif parmi menu principal + bas de menu (meilleure correspondance ; le premier en
    // cas d'égalité : « Plaintes / Incidents » et « Notifications » mènent tous deux à /alertes).
    const allItems = [...NAV_ITEMS, ...BOTTOM_ITEMS];
    const activeIndex = pickActiveIndex(allItems.map(i => i.path), location.pathname, location.hash);
    const crumbs = resolveBreadcrumb(
        allItems.map(i => ({ path: i.path, label: t(i.label) })), location.pathname, location.hash, t, true,
    );

    const handleLogout = () => {
        onLogout();
        navigate('/login');
    };

    const Sidebar = (
        <div className={`
            fixed inset-y-0 left-0 z-40 flex flex-col
            bg-base-100 border-r border-base-200 shadow-xl
            transition-all duration-300 ease-in-out
            ${sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'}
        `}>
            {/* Logo & Close */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
                <img src={BRANDING.logos.icon} alt={BRANDING.name} className="h-14 w-14 object-contain" />
                {isMobile && (
                    <button onClick={() => setSidebarOpen(false)} className="btn btn-ghost btn-xs btn-circle">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Badge espace locataire */}
            <div className="mx-3 mt-3 mb-1 px-3 py-2 bg-accent-soft rounded-xl border border-base-300">
                <div className="flex items-center gap-2">
                    <Home size={13} className="text-secondary shrink-0" />
                    <div>
                        <p className="text-xs font-semibold text-primary">{t('layout.tenantArea')}</p>
                        <p className="text-[10px] text-base-content/70 leading-tight">{t('layout.myPersonalSpace')}</p>
                    </div>
                </div>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
                {NAV_ITEMS.map(({ icon: Icon, label, path }, i) => {
                    const active = i === activeIndex;
                    return (
                        <Link
                            key={label}
                            to={path}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => isMobile && setSidebarOpen(false)}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                                transition-all duration-150 group
                                ${active
                                    ? 'bg-primary text-primary-content shadow-md shadow-primary/20'
                                    : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                                }
                            `}
                        >
                            <Icon size={18} className={active ? 'text-primary-content' : 'text-base-content/50 group-hover:text-base-content'} />
                            <span className="flex-1">{t(label)}</span>
                            {active && <ChevronRight size={14} className="text-primary-content/70" />}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom section */}
            <div className="px-3 py-3 border-t border-base-200 space-y-0.5">
                {BOTTOM_ITEMS.map(({ icon: Icon, label, path }, i) => {
                    const active = NAV_ITEMS.length + i === activeIndex;
                    return (
                        <Link
                            key={path}
                            to={path}
                            aria-current={active ? 'page' : undefined}
                            onClick={() => isMobile && setSidebarOpen(false)}
                            className={`
                                flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium
                                transition-all duration-150 group relative
                                ${active ? 'bg-base-200 text-base-content' : 'text-base-content/60 hover:bg-base-200 hover:text-base-content'}
                            `}
                        >
                            <Icon size={17} className="text-base-content/50 group-hover:text-base-content" />
                            <span>{t(label)}</span>
                            {label === 'nav.notifications' && alertsCount > 0 && (
                                <span className="ml-auto bg-error text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                    {alertsCount}
                                </span>
                            )}
                        </Link>
                    );
                })}

                {/* User card */}
                <div className="mt-2 pt-2 border-t border-base-200">
                    <div className="flex items-center gap-3 px-3 py-2">
                        <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center text-primary font-bold text-sm shrink-0">
                            {userProfile?.nom?.charAt(0)?.toUpperCase() || 'L'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-base-content truncate">{userProfile?.nom || 'Locataire'}</p>
                            <p className="text-[11px] text-base-content/50 truncate">{userProfile?.email || userProfile?.telephone}</p>
                        </div>
                        <button
                            onClick={() => setShowLogoutConfirm(true)}
                            className="btn btn-ghost btn-xs btn-circle text-base-content/40 hover:text-error"
                            title="Se déconnecter"
                        >
                            <LogOut size={15} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-base-200/40 font-sans overflow-hidden">
            {Sidebar}

            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${sidebarOpen && !isMobile ? 'ml-64' : 'ml-0'}`}>

                <header className="h-14 bg-base-100 border-b border-base-200 flex items-center justify-between px-4 shrink-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="btn btn-ghost btn-sm btn-circle"
                        >
                            <Menu size={18} />
                        </button>

                        <div className="hidden md:flex items-center gap-1 text-sm text-base-content/50">
                            <span>{t('layout.tenantPortal')}</span>
                            <ChevronRight size={14} />
                            {(crumbs.length ? crumbs : [{ label: t('nav.tableauDeBord') }]).map((crumb: Crumb, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <ChevronRight size={14} />}
                                    {crumb.to ? (
                                        <Link to={crumb.to} className="hover:text-primary">{crumb.label}</Link>
                                    ) : (
                                        <span aria-current="page" className="text-base-content font-medium">{crumb.label}</span>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Cloche unique de l'espace locataire : panneau de notifications, comme le Header
                            gestionnaire (elle était dupliquée dans le contenu du tableau de bord). Les alertes
                            restent accessibles, avec leur compteur, via « Notifications » du menu. */}
                        <NotificationBell />

                        <Link to="/dashboard/mon-compte" className="flex items-center gap-2 hover:bg-base-200 rounded-xl px-2 py-1.5 transition-colors">
                            <div className="w-7 h-7 rounded-full bg-accent-soft flex items-center justify-center text-primary font-bold text-xs">
                                {userProfile?.nom?.charAt(0)?.toUpperCase() || 'L'}
                            </div>
                            <span className="hidden md:block text-sm font-medium text-base-content/80">{userProfile?.nom}</span>
                        </Link>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 scrollbar-thin scrollbar-thumb-base-300">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={location.pathname}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.15, ease: 'easeOut' }}
                            className="max-w-[1600px] mx-auto"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>

            <ConfirmModal
                isOpen={showLogoutConfirm}
                onConfirm={handleLogout}
                onClose={() => setShowLogoutConfirm(false)}
                title={t('common.logoutTitle')}
                message={t('common.logoutMessage')}
                confirmLabel={t('common.logoutConfirm')}
                icon={LogOut}
            />
        </div>
    );
};

export default LocataireLayout;
