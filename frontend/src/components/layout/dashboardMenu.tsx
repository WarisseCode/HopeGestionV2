// frontend/src/components/layout/dashboardMenu.tsx
// Menu latéral du layout gestionnaire (DashboardLayout), extrait de Sidebar.tsx pour servir
// aussi de source des libellés du fil d'Ariane (Header) : une seule table route → libellé.
import React from 'react';
import {
  Building2, Users, Wallet, Settings, Bell,
  LayoutDashboard, CreditCard, FolderOpen, BarChart3, Wrench,
  Calendar, CalendarCheck, ClipboardList, ClipboardCheck, Crown, CheckSquare,
  Home, UserCog, Receipt, UserCheck, Boxes, Trash2
} from 'lucide-react';

// Définition des groupes de menu
export type MenuGroup = {
  id: string;       // clé stable (indépendante de la langue) pour l'état d'expansion
  title: string;    // libellé affiché (traduit)
  items: MenuItem[];
};

export type MenuItem = {
  icon: React.ReactNode;
  label: string;
  path: string;     // relatif à /dashboard (« / » = accueil du rôle)
  badge?: number;
};

// Logique de construction du menu groupé
export interface MenuProfile {
  role?: string;
  userType?: string;
  permissions?: Record<string, boolean | undefined>;
}

export const buildDashboardMenu = (
  userProfile: MenuProfile | null | undefined,
  t: (key: string) => string,
  alertsCount = 0,
): MenuGroup[] => {
    const role = userProfile?.role || 'user';
    const type = userProfile?.userType; // 'locataire', 'proprietaire', etc.
    const perms = userProfile?.permissions || {};

    // Pas de branche locataire ni propriétaire : UserSpecificLayout leur attribue leur propre
    // mise en page (LocataireLayout, ProprietaireLayout) avec leur propre menu ; ce menu-ci
    // (DashboardLayout) ne leur est jamais affiché. Les anciennes branches, inaccessibles, ont
    // été retirées en T-115 (dont un lien « Mon équipe » vers /equipe, adresse sans page).

    // --- 3. GESTIONNAIRE / ADMIN / GUEST ---
    // Refonte T-070 (maquette T-069) : cinq sections courtes, toujours ouvertes ; les réglages du
    // compte (profil, paramètres, abonnement, corbeille) passent dans le menu « Mon compte »
    // (buildAccountMenu). Conditions de visibilité inchangées, élément par élément.
    // Une section au titre vide s'affiche sans titre (simple séparateur).
    const isStaff = role === 'admin' || role === 'gestionnaire';

    // En tête, sans titre : le quotidien
    const principalItems: MenuItem[] = [
        { icon: <LayoutDashboard size={18} />, label: t('nav.bureau'), path: '/' },
        { icon: <Bell size={18} />, label: t('nav.alertes'), path: '/alertes', badge: alertsCount },
    ];
    if (isStaff) {
        principalItems.push({ icon: <CheckSquare size={18} />, label: t('nav.taches'), path: '/tasks' });
        principalItems.push({ icon: <Calendar size={18} />, label: t('nav.planning'), path: '/calendrier' });
    }

    // Gestion locative
    const gestionItems: MenuItem[] = [];
    if (perms.biens_read || isStaff) gestionItems.push({ icon: <Building2 size={18} />, label: t('nav.parcImmobilier'), path: '/biens' });
    if (perms.locataires_read || isStaff) {
        gestionItems.push({ icon: <Users size={18} />, label: t('nav.locataires'), path: '/locataires' });
    }
    if ((perms.owners_read || isStaff) && type !== 'proprietaire') {
        gestionItems.push({ icon: <UserCheck size={18} />, label: t('nav.proprietaires'), path: '/proprietaires' });
    }
    if (perms.locataires_read || isStaff) {
        gestionItems.push({ icon: <Home size={18} />, label: t('nav.bauxLocations'), path: '/locations' });
        gestionItems.push({ icon: <ClipboardList size={18} />, label: t('nav.contrats'), path: '/contrats' });
    }
    if (isStaff) {
        gestionItems.push({ icon: <CalendarCheck size={18} />, label: t('nav.reservations'), path: '/reservations' });
    }

    // Suivi des logements
    const suiviItems: MenuItem[] = [];
    if (isStaff) {
        suiviItems.push({ icon: <ClipboardCheck size={18} />, label: t('nav.etatsDesLieux'), path: '/etats-des-lieux' });
        suiviItems.push({ icon: <Boxes size={18} />, label: t('nav.inventaires'), path: '/inventories' });
        suiviItems.push({ icon: <Wrench size={18} />, label: t('nav.interventions'), path: '/interventions' });
    }

    // Argent
    const argentItems: MenuItem[] = [];
    if (perms.finance_read || isStaff) {
        argentItems.push({ icon: <Wallet size={18} />, label: t('nav.transactions'), path: '/finances' });
        argentItems.push({ icon: <Receipt size={18} />, label: t('nav.quittances'), path: '/quittances' });
    }
    if (perms.finance_validate || isStaff) {
        argentItems.push({ icon: <CreditCard size={18} />, label: t('nav.mobileMoney'), path: '/mobile-money' });
    }
    if (isStaff) {
        argentItems.push({ icon: <BarChart3 size={18} />, label: t('nav.rapports'), path: '/rapports' });
    }

    // Documents, seul en fin de liste
    // Note : « Audit & Sécurité » a été déplacé dans l'espace administrateur (/admin/logs).
    const documentItems: MenuItem[] = [];
    if (perms.documents_read || isStaff) documentItems.push({ icon: <FolderOpen size={18} />, label: t('nav.documents'), path: '/documents' });

    return [
        { id: "principal", title: '', items: principalItems },
        { id: "gestionLocative", title: t('nav.groups.gestionLocative'), items: gestionItems },
        { id: "suiviLogements", title: t('nav.groups.suiviLogements'), items: suiviItems },
        { id: "argent", title: t('nav.groups.argent'), items: argentItems },
        { id: "documents", title: '', items: documentItems },
    ].filter(group => group.items.length > 0);
};

/**
 * Menu « Mon compte » de la barre latérale (gestionnaire / admin / invité) : les réglages,
 * sortis de la navigation principale (T-070). Mêmes conditions de visibilité qu'avant.
 */
export const buildAccountMenu = (
  userProfile: MenuProfile | null | undefined,
  t: (key: string) => string,
): MenuItem[] => {
  const role = userProfile?.role || 'user';
  const type = userProfile?.userType;
  const isStaff = role === 'admin' || role === 'gestionnaire';
  const items: MenuItem[] = [
    { icon: <UserCog size={16} />, label: t('nav.monProfil'), path: '/mon-compte' },
    { icon: <Settings size={16} />, label: t('nav.parametres'), path: '/parametres' },
  ];
  if (type !== 'guest') items.push({ icon: <Crown size={16} />, label: t('nav.abonnement'), path: '/abonnement' });
  if (isStaff) items.push({ icon: <Trash2 size={16} />, label: t('nav.corbeille'), path: '/corbeille' });
  return items;
};
