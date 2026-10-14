// frontend/src/components/layout/dashboardMenu.tsx
// Menu latéral du layout gestionnaire (DashboardLayout), extrait de Sidebar.tsx pour servir
// aussi de source des libellés du fil d'Ariane (Header) : une seule table route → libellé.
import React from 'react';
import {
  Building2, Users, FileText, Wallet, Settings, Bell,
  LayoutDashboard, CreditCard, FolderOpen, BarChart3, Wrench,
  Calendar, CalendarCheck, ClipboardList, ClipboardCheck, Briefcase, Crown, CheckSquare,
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
    // Note : « Audit & Sécurité » a été déplacé dans l'espace administrateur (/admin/logs).
    const adminItems: MenuItem[] = [];
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
