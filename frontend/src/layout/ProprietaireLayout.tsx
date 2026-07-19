// frontend/src/layout/ProprietaireLayout.tsx
// Layout dédié au rôle "proprietaire" — mode observateur lecture seule.
// Sidebar simplifiée, bannière contextuelle, pas d'actions d'écriture exposées.

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Building2, Users, Wallet, FileText,
    FolderOpen, BarChart3, Bell, Settings, LogOut,
    Eye, ChevronRight, Menu, X, UserCog, Receipt
} from 'lucide-react';
import { getProfile } from '../api/authApi';
import { getAlerts } from '../api/alertApi';
import { useMobile } from '../hooks/useMobile';
import { useTranslation } from 'react-i18next';
import ConfirmModal from '../components/ui/ConfirmModal';

interface ProprietaireLayoutProps {
    children: React.ReactNode;
    onLogout: () => void;
}

// `label` contient une clé i18n, traduite au rendu via t(item.label).
const NAV_ITEMS = [
    { icon: LayoutDashboard, label: 'nav.vueDensemble', path: '/dashboard/proprietaire' },
    { icon: Building2,       label: 'nav.mesBiens',     path: '/dashboard/biens' },
    { icon: Users,           label: 'nav.locataires',   path: '/dashboard/locataires' },
    { icon: Wallet,          label: 'nav.financesItem', path: '/dashboard/finances' },
    { icon: FileText,        label: 'nav.contrats',     path: '/dashboard/contrats' },
    { icon: FolderOpen,      label: 'nav.documents',    path: '/dashboard/documents' },
    { icon: Receipt,         label: 'nav.quittances',   path: '/dashboard/quittances' },
    { icon: BarChart3,       label: 'nav.rapports',     path: '/dashboard/rapports' },
];

const BOTTOM_ITEMS = [
    { icon: Bell,     label: 'nav.alertes',    path: '/dashboard/alertes' },
    { icon: Settings, label: 'nav.parametres', path: '/dashboard/parametres' },
    { icon: UserCog,  label: 'nav.monProfil',  path: '/dashboard/mon-compte' },
];

const ProprietaireLayout: React.FC<ProprietaireLayoutProps> = ({ children, onLogout }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isMobile = useMobile();
    const { t } = useTranslation();
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [alertsCount, setAlertsCount] = useState(0);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [gestionnaireName, setGestionnaireName] = useState<string>('');

    useEffect(() => { setSidebarOpen(!isMobile); }, [isMobile]);

    useEffect(() => {
        getProfile().then(p => setUserProfile(p.user)).catch(() => navigate('/login'));
        getAlerts().then(({ alerts }) => setAlertsCount(alerts.length)).catch(() => {});
    }, []);

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/');

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
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                        <Eye size={16} className="text-white" />
                    </div>
                    <span className="font-bold text-base-content text-sm">HopeGestion</span>
                </div>
                {isMobile && (
                    <button onClick={() => setSidebarOpen(false)} className="btn btn-ghost btn-xs btn-circle">
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Vue propriétaire badge */}
            <div className="mx-3 mt-3 mb-1 px-3 py-2 bg-teal-50 rounded-xl border border-teal-100">
                <div className="flex items-center gap-2">
                    <Eye size={13} className="text-teal-500 shrink-0" />
                    <div>
                        <p className="text-xs font-semibold text-teal-700">{t('layout.consultationMode')}</p>
                        <p className="text-[10px] text-teal-500 leading-tight">{t('layout.managedBy', { name: gestionnaireName || t('layout.yourManager') })}</p>
                    </div>
                </div>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
                {NAV_ITEMS.map(({ icon: Icon, label, path }) => {
                    const active = isActive(path);
                    return (
                        <Link
                            key={path}
                            to={path}
                            onClick={() => isMobile && setSidebarOpen(false)}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                                transition-all duration-150 group
                                ${active
                                    ? 'bg-teal-600 text-white shadow-md shadow-teal-200'
                                    : 'text-base-content/70 hover:bg-base-200 hover:text-base-content'
                                }
                            `}
                        >
                            <Icon size={18} className={active ? 'text-white' : 'text-base-content/50 group-hover:text-base-content'} />
                            <span className="flex-1">{t(label)}</span>
                            {active && <ChevronRight size={14} className="text-white/70" />}
                        </Link>
                    );
                })}
            </nav>

            {/* Bottom section */}
            <div className="px-3 py-3 border-t border-base-200 space-y-0.5">
                {BOTTOM_ITEMS.map(({ icon: Icon, label, path }) => {
                    const active = isActive(path);
                    return (
                        <Link
                            key={path}
                            to={path}
                            onClick={() => isMobile && setSidebarOpen(false)}
                            className={`
                                flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium
                                transition-all duration-150 group relative
                                ${active ? 'bg-base-200 text-base-content' : 'text-base-content/60 hover:bg-base-200 hover:text-base-content'}
                            `}
                        >
                            <Icon size={17} className="text-base-content/50 group-hover:text-base-content" />
                            <span>{t(label)}</span>
                            {label === 'nav.alertes' && alertsCount > 0 && (
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
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-sm shrink-0">
                            {userProfile?.nom?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-base-content truncate">{userProfile?.nom || 'Propriétaire'}</p>
                            <p className="text-[11px] text-base-content/50 truncate">{userProfile?.email}</p>
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
            {/* Sidebar */}
            {Sidebar}

            {/* Mobile overlay */}
            {isMobile && sidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main content */}
            <div className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${sidebarOpen && !isMobile ? 'ml-64' : 'ml-0'}`}>

                {/* Top header */}
                <header className="h-14 bg-base-100 border-b border-base-200 flex items-center justify-between px-4 shrink-0 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="btn btn-ghost btn-sm btn-circle"
                        >
                            <Menu size={18} />
                        </button>

                        {/* Breadcrumb */}
                        <div className="hidden md:flex items-center gap-1 text-sm text-base-content/50">
                            <span>{t('layout.ownerPortal')}</span>
                            <ChevronRight size={14} />
                            <span className="text-base-content font-medium capitalize">
                                {location.pathname.split('/').pop()?.replace('-', ' ') || t('nav.bureau')}
                            </span>
                        </div>
                    </div>

                    {/* Right side — readonly badge + alerts */}
                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                            <Eye size={12} />
                            <span>{t('layout.readOnly')}</span>
                        </div>

                        {alertsCount > 0 && (
                            <Link to="/dashboard/alertes" className="btn btn-ghost btn-sm btn-circle relative">
                                <Bell size={18} />
                                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                    {alertsCount > 9 ? '9+' : alertsCount}
                                </span>
                            </Link>
                        )}

                        <Link to="/dashboard/mon-compte" className="flex items-center gap-2 hover:bg-base-200 rounded-xl px-2 py-1.5 transition-colors">
                            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xs">
                                {userProfile?.nom?.charAt(0)?.toUpperCase() || 'P'}
                            </div>
                            <span className="hidden md:block text-sm font-medium text-base-content/80">{userProfile?.nom}</span>
                        </Link>
                    </div>
                </header>

                {/* Page content */}
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

export default ProprietaireLayout;
