import React, { useState, useEffect, useMemo, useCallback, useRef, forwardRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCreateFromUrl, withCreateAction } from '../hooks/useCreateFromUrl';
import { getLocataires, createLocataire, deleteLocataire, getLocataireDetails } from '../api/locataireApi';
import { getProprietaires } from '../api/accountApi';
import { getSubscriptionStatus } from '../api/subscriptionApi';
import type { Locataire } from '../api/locataireApi';
import type { SubscriptionStatus } from '../api/subscriptionApi';
import type { BailSummary } from '@hopegestion/shared-types';
import {
  Users, UserPlus, Wallet, X, Send, ArrowLeft,
  ChevronLeft, ChevronRight, MessageCircle, Phone, SlidersHorizontal,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import SearchInput from '../components/ui/SearchInput';
import FilterPanel from '../components/ui/FilterPanel';
import type { FilterConfig, FilterValues } from '../components/ui/FilterPanel';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import LocataireForm from '../components/locataires/LocataireForm';
import LoyerDetailsModal from '../components/locataires/LoyerDetailsModal';
import RowMenu, { OUTLINE_BTN } from '../components/ui/RowMenu';
import { useIsDesktop, isDesktop } from '../hooks/useIsDesktop';
import { getAvatarColor, getPaymentStatus } from '../utils/locataireUtils';
import Alert from '../components/ui/Alert';
import ConfirmModal from '../components/ui/ConfirmModal';
import EmptyState from '../components/ui/EmptyState';
import InvitationLinkModal from '../components/ui/InvitationLinkModal';
import { useUser } from '../contexts/UserContext';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';

const ITEMS_PER_PAGE = 12;

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants      = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

// ── Refonte T-062 (maquette T-061) : même logique que Parc immobilier (T-060) ─────────────────

const ListSkeleton: React.FC = () => (
  <div role="status" aria-label="Chargement" className="bg-base-100 rounded-2xl border border-base-300/70 divide-y divide-base-300/70">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse motion-reduce:animate-none!">
        <SkeletonLoader variant="circular" width={40} height={40} />
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="text" width="35%" />
          <SkeletonLoader variant="text" width="20%" />
        </div>
        <SkeletonLoader variant="rectangular" width={96} height={24} className="rounded-full hidden sm:block" />
      </div>
    ))}
  </div>
);

// Situation d'une personne pour les filtres rapides et le tri.
// Plusieurs baux : à jour si tous les baux le sont, sinon le statut agrégé du serveur (à défaut « en attente »).
type Situation = 'paid' | 'pending' | 'late' | 'unknown' | 'none';
type Group = 'all' | 'paid' | 'pending' | 'late' | 'none';
type SortKey = 'late' | 'name' | 'recent';

const lodgingOf = (person: Locataire) => {
  const active = Number(person.active_leases ?? 0);
  const loyer = Number(person.loyer_actuel || person.loyer) || 0;
  const multi = active > 1;
  return {
    active, multi,
    has: active > 0 || loyer > 0,
    rent: Number(multi ? person.loyer_total : loyer) || 0,
    paid: Number(person.leases_paid ?? 0),
  };
};

const situationOf = (person: Locataire): Situation => {
  const l = lodgingOf(person);
  if (!l.has) return 'none';
  if (l.multi) {
    if (l.paid >= l.active) return 'paid';
    const s = (person as Locataire & { payment_status?: Situation }).payment_status;
    return s === 'late' ? 'late' : 'pending';
  }
  return getPaymentStatus(person);
};

// Ordre « retards d'abord »
const SITUATION_RANK: Record<Situation, number> = { late: 0, pending: 1, unknown: 2, paid: 3, none: 4 };

// Pastilles : teintes foncées sur fond pâle (≥ 4,5:1), l'inverse en thème sombre
const SITUATION_PILL: Record<Situation, string> = {
  paid:    'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100',
  pending: 'bg-orange-100 text-orange-900 dark:bg-orange-400/20 dark:text-orange-100',
  late:    'bg-red-100 text-red-900 dark:bg-red-400/20 dark:text-red-100',
  unknown: 'bg-base-200 text-base-content/80',
  none:    'bg-base-200 text-base-content/80',
};

const fmt = (n: number) => n.toLocaleString('fr-FR');
const fullName = (p: Locataire) => [p.prenoms, p.nom].filter(Boolean).join(' ');

const Avatar: React.FC<{ person: Locataire; size: number }> = ({ person, size }) =>
  person.photo_profil_url ? (
    <img src={person.photo_profil_url} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />
  ) : (
    <span
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size / 3) }}
      className={`shrink-0 rounded-full inline-flex items-center justify-center font-bold text-white ${getAvatarColor(person.nom || '?')}`}
    >
      {person.prenoms?.charAt(0)}{person.nom?.charAt(0)}
    </span>
  );

// ── Panneau « fiche rapide » : contact, logements (chargés à l'ouverture) et actions ──────────

interface PanelProps {
  person: Locataire;
  isBuyer: boolean;
  canWrite: boolean;
  onClose: () => void;
  onWhatsApp: () => void;
  onCall: () => void;
  onRecordPayment: () => void;
  onAssign: () => void;
  onFullProfile: () => void;
}

const LIVE_LEASE = ['actif', 'signe'];

const TenantPanel = forwardRef<HTMLElement, PanelProps>(
  ({ person, isBuyer, canWrite, onClose, onWhatsApp, onCall, onRecordPayment, onAssign, onFullProfile }, ref) => {
    const { t } = useTranslation();
    const lodging = lodgingOf(person);
    // Baux chargés à la demande, comme LoyerDetailsModal ; `loadedFor` évite d'afficher ceux d'une autre personne
    const [baux, setBaux] = useState<{ id: number; list: BailSummary[] } | null>(null);
    const [loadError, setLoadError] = useState<{ id: number } | null>(null);

    useEffect(() => {
      if (!lodging.has) return;
      let cancelled = false;
      getLocataireDetails(person.id)
        .then(d => { if (!cancelled) setBaux({ id: person.id, list: (d.baux || []).filter(b => LIVE_LEASE.includes(b.statut)) }); })
        .catch(() => { if (!cancelled) setLoadError({ id: person.id }); });
      return () => { cancelled = true; };
    }, [person.id, lodging.has]);

    const list = baux?.id === person.id ? baux.list : null;
    const failed = loadError?.id === person.id;

    return (
      <aside ref={ref} aria-label={t('tenants.quickProfile')}
        className="flex-[1_1_340px] min-w-0 bg-base-100 rounded-2xl border border-base-300/70 p-5 space-y-4 scroll-mt-4 lg:sticky lg:top-4">
        <div className="flex items-start gap-3">
          <Avatar person={person} size={52} />
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-base-content break-words">{fullName(person)}</h2>
            <p className="text-sm text-base-content/70">{isBuyer ? t('tenants.kindBuyer') : t('tenants.kindTenant')} · {person.statut}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('tenants.closeProfile')} className={`${OUTLINE_BTN} w-10 h-10 shrink-0`}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <dl className="space-y-2 px-3.5 py-3 rounded-xl bg-base-200/70 dark:bg-base-200 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-base-content/70">{t('tenants.phone')}</dt><dd className="font-semibold tabular-nums text-right">{person.telephone_principal || '—'}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-base-content/70">{t('tenants.email')}</dt><dd className="font-semibold text-right break-all">{person.email || '—'}</dd></div>
        </dl>

        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={onWhatsApp} disabled={!person.telephone_principal} className={`${OUTLINE_BTN} h-11 text-[13px] text-emerald-800 dark:text-emerald-200 disabled:opacity-40`}>
            {t('tenants.whatsapp')}
          </button>
          <button type="button" onClick={onCall} disabled={!person.telephone_principal} className={`${OUTLINE_BTN} h-11 text-[13px] text-sky-800 dark:text-sky-200 disabled:opacity-40`}>
            {t('tenants.call')}
          </button>
          {person.email
            ? <a href={`mailto:${person.email}`} className={`${OUTLINE_BTN} h-11 text-[13px]`}>{t('tenants.sendEmail')}</a>
            : <button type="button" disabled className={`${OUTLINE_BTN} h-11 text-[13px] opacity-40`}>{t('tenants.sendEmail')}</button>}
        </div>

        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-bold text-base-content">{t('tenants.housings')}</h3>
          {lodging.has && lodging.rent > 0 && (
            <span className="text-sm text-base-content/70 tabular-nums">{t('tenants.totalRent', { amount: fmt(lodging.rent) })}</span>
          )}
        </div>

        {!lodging.has ? (
          <div className="space-y-2.5 p-3.5 rounded-xl border border-dashed border-base-300 text-sm text-base-content/80">
            <p>{t('tenants.noHousingYet')}</p>
            {canWrite && !isBuyer && <Button variant="primary" size="sm" className="h-10" onClick={onAssign}>{t('tenants.assignHousing')}</Button>}
          </div>
        ) : failed ? (
          <p className="text-sm text-error">{t('tenants.housingLoadError')}</p>
        ) : list === null ? (
          <div className="space-y-2">{[0, 1].map(i => <div key={i} className="h-14 rounded-xl bg-base-200 animate-pulse motion-reduce:animate-none!" />)}</div>
        ) : (
          <ul className="space-y-2">
            {list.map(b => {
              const sit: Situation = b.payment_status ?? 'unknown';
              return (
                <li key={b.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-base-300/70">
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-base-content break-words">{b.ref_lot || b.reference_bail || b.ref_bail || '—'}</span>
                    <span className="block text-xs text-base-content/70 tabular-nums break-words">
                      {[b.building_name, b.loyer_actuel != null ? t('tenants.perMonth', { amount: fmt(Number(b.loyer_actuel) || 0) }) : null].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${SITUATION_PILL[sit]}`}>
                    {sit === 'paid' ? t('tenants.groupPaid') : sit === 'pending' ? t('tenants.groupPending') : sit === 'late' ? t('tenants.groupLate') : t('tenants.payUnknown')}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-wrap gap-2 pt-4 border-t border-base-300/70">
          {canWrite && lodging.has && <Button variant="primary" className="flex-1 h-11" onClick={onRecordPayment}>{t('tenants.recordPayment')}</Button>}
          <button type="button" onClick={onFullProfile} className={`${OUTLINE_BTN} h-11 px-4 ${canWrite && lodging.has ? '' : 'flex-1'}`}>{t('tenants.fullProfile')}</button>
        </div>
      </aside>
    );
  }
);
TenantPanel.displayName = 'TenantPanel';

const EMPTY_FORM = {
  typeProfil: 'Locataire', nom: '', prenoms: '', telephonePrincipal: '', telephoneSecondaire: '',
  email: '', nationalite: 'Béninoise', typePiece: 'CNI', numeroPiece: '', dateExpiration: '',
  modePaiement: 'Mobile Money', acompte: 0,
};

const Locataires: React.FC = () => {
  const { user }    = useUser();
  const { t }       = useTranslation();
  const canWrite    = !['proprietaire', 'locataire'].includes(user?.userType || '');
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();

  // Filtres construits dans le composant pour être traduisibles (dépendent de t).
  const LOCATAIRE_FILTERS: FilterConfig[] = useMemo(() => [
    {
      id: 'statut',
      type: 'select',
      label: t('common.status'),
      options: [{ value: 'Actif', label: t('tenants.filterActif') }, { value: 'Inactif', label: t('tenants.filterInactif') }],
    },
    {
      id: 'paymentStatus',
      type: 'multi-select',
      label: t('tenants.filterPaiement'),
      options: [
        { value: 'paid', label: t('tenants.payPaid') },
        { value: 'pending', label: t('tenants.payPending') },
        { value: 'late', label: t('tenants.payLate') },
      ],
    },
  ], [t]);

  // L'ancien onglet « Affectations » n'était qu'un renvoi vers les baux : ?tab=affectation retombe sur les locataires
  const [activeTab,   setActiveTab]   = useState<'locataires' | 'acheteurs'>(
    searchParams.get('tab') === 'acheteurs' ? 'acheteurs' : 'locataires'
  );
  const [showFilters, setShowFilters] = useState(false);
  const [group,       setGroup]       = useState<Group>('all');
  const [sortKey,     setSortKey]     = useState<SortKey>('late');
  const [rentModalFor, setRentModalFor] = useState<Locataire | null>(null);
  // Personne du panneau : même règle que Parc immobilier (premier de la page d'office sur grand écran)
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [panelDismissed, setPanelDismissed] = useState(false);
  const desktop = useIsDesktop();
  const panelRef = useRef<HTMLElement>(null);

  const [locataires,    setLocataires]    = useState<Locataire[]>([]);
  const [acheteurs,     setAcheteurs]     = useState<Locataire[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [success,       setSuccess]       = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [proprietaires, setProprietaires] = useState<any[]>([]);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [filterValues,  setFilterValues]  = useState<FilterValues>({});
  const [currentPage,   setCurrentPage]   = useState(1);
  const [showModal,     setShowModal]     = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [locataireForm, setLocataireForm] = useState({ ...EMPTY_FORM });
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean; title: string; message: string; type: 'danger' | 'warning' | 'info'; action: () => Promise<void>;
  }>({ isOpen: false, title: '', message: '', type: 'danger', action: async () => {} });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [locsAll, achs, subStatus, props] = await Promise.all([
        getLocataires('Locataire'),
        getLocataires('Acheteur'),
        getSubscriptionStatus().catch(err => { console.error('Erreur abonnement', err); return null; }),
        getProprietaires().catch(() => []),
      ]);
      setLocataires(locsAll);
      setAcheteurs(achs);
      if (subStatus) setSubscriptionStatus(subStatus);
      setProprietaires(props);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || t('common.loadError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterValues, activeTab, group, sortKey]);

  const currentList = activeTab === 'locataires' ? locataires : acheteurs;

  const filteredList = useMemo(() => currentList.filter(person => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!(person.nom?.toLowerCase().includes(q) || person.prenoms?.toLowerCase().includes(q) ||
            person.telephone_principal?.includes(q) || person.email?.toLowerCase().includes(q) ||
            (person.lot_nom || person.lot)?.toLowerCase().includes(q))) return false;
    }
    if (group !== 'all') {
      const sit = situationOf(person);
      if (group === 'none' ? sit !== 'none' : sit !== group) return false;
    }
    if (filterValues.statut && person.statut !== filterValues.statut) return false;
    if (filterValues.paymentStatus) {
      const selected = filterValues.paymentStatus as string[];
      if (selected.length > 0 && !selected.includes((person as any).payment_status || 'unknown')) return false;
    }
    return true;
  }).sort((a, b) => {
    if (sortKey === 'name') return fullName(a).localeCompare(fullName(b), 'fr');
    if (sortKey === 'recent') return b.id - a.id;
    return SITUATION_RANK[situationOf(a)] - SITUATION_RANK[situationOf(b)] || fullName(a).localeCompare(fullName(b), 'fr');
  }), [currentList, searchQuery, filterValues, group, sortKey]);

  // Compteurs des filtres rapides : sur toute la liste de l'onglet, indépendamment de la recherche
  const groupCounts = useMemo(() => {
    const c = { all: currentList.length, paid: 0, pending: 0, late: 0, none: 0 };
    currentList.forEach(p => { const s = situationOf(p); if (s !== 'unknown') c[s]++; });
    return c;
  }, [currentList]);

  const totalPages   = Math.ceil(filteredList.length / ITEMS_PER_PAGE);
  const paginatedList = filteredList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleWhatsApp = (phone: string, name: string) => {
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${name}, `)}`, '_blank');
  };
  const handleCall  = (phone: string) => { window.location.href = `tel:${phone}`; };
  const handleView  = (id: number)    => navigate(`/dashboard/locataires/${id}`);

  const handleDelete = (id: number) => {
    setConfirmConfig({
      isOpen: true,
      title: t('tenants.deleteTitle'),
      message: t('tenants.deleteMessage'),
      type: 'danger',
      action: async () => {
        try { await deleteLocataire(id); toast.success(t('tenants.profileDeleted')); fetchData(); }
        catch (err: any) { toast.error(err.message); }
      },
    });
  };

  const isLimitReached = Boolean(
    subscriptionStatus &&
    subscriptionStatus.plan.max_tenants !== -1 &&
    (subscriptionStatus.usage?.current_tenants ?? 0) >= subscriptionStatus.plan.max_tenants
  );

  // Action rapide « Nouveau Locataire » du tableau de bord (?action=nouveau) : mêmes règles que le bouton
  // « Nouveau locataire » (droits, plafond d'abonnement), décidées une fois l'abonnement chargé.
  useCreateFromUrl(!loading, () => {
    if (!canWrite) return;
    if (isLimitReached) { toast(t('tenants.limitReachedToast'), { icon: '👑' }); navigate('/dashboard/abonnement'); return; }
    setLocataireForm({ ...EMPTY_FORM, typeProfil: activeTab === 'acheteurs' ? 'Acheteur' : 'Locataire' });
    setShowModal(true);
  });

  if (showModal) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setShowModal(false)} className="flex items-center gap-2 text-base-content/60 hover:text-base-content transition">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">{t('tenants.backToTenants')}</span>
          </button>
          <div className="h-5 w-px bg-base-300" />
          <h1 className="text-xl font-bold text-base-content/90">
            {locataireForm.typeProfil === 'Acheteur' ? t('tenants.newBuyer') : t('tenants.newTenant')}
          </h1>
        </div>
        {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
        <LocataireForm
          locataire={{ type: locataireForm.typeProfil as any }}
          proprietaires={proprietaires.map(p => ({ id: p.id, nom: p.nom, prenom: p.prenom }))}
          onSave={async (data) => {
            try {
              setError(null);
              if (!data.nom || !data.telephone_principal) throw new Error(t('tenants.namePhoneRequired'));
              await createLocataire(data);
              setSuccess(t('tenants.profileCreated'));
              setShowModal(false);
              fetchData();
            } catch (err: any) { setError(err.message); }
          }}
          onCancel={() => setShowModal(false)}
        />
      </div>
    );
  }

  const isBuyers = activeTab === 'acheteurs';
  const openNew = () => {
    if (isLimitReached) { toast(t('tenants.limitReachedToast'), { icon: '👑' }); navigate('/dashboard/abonnement'); return; }
    setLocataireForm({ ...EMPTY_FORM, typeProfil: isBuyers ? 'Acheteur' : 'Locataire' });
    setShowModal(true);
  };
  const pickedExists = pickedId != null && currentList.some(p => p.id === pickedId);
  const selectedId = pickedExists ? pickedId : (desktop && !panelDismissed ? paginatedList[0]?.id ?? null : null);
  const selected = !panelDismissed || pickedExists ? currentList.find(p => p.id === selectedId) ?? null : null;
  const selectPerson = (person: Locataire) => {
    setPickedId(person.id);
    setPanelDismissed(false);
    // Sous 1024 px le panneau passe sous la liste : on l'amène à l'écran
    if (!isDesktop()) requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const total = filteredList.length;
  const from = total === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const to = Math.min(currentPage * ITEMS_PER_PAGE, total);
  const extraFilterCount = Object.keys(filterValues).length;

  const groups: { key: Group; label: string; dot: string }[] = [
    { key: 'all', label: t('tenants.groupAll'), dot: 'bg-base-content/50' },
    { key: 'paid', label: t('tenants.groupPaid'), dot: 'bg-emerald-600' },
    { key: 'pending', label: t('tenants.groupPending'), dot: 'bg-orange-500' },
    { key: 'late', label: t('tenants.groupLate'), dot: 'bg-red-600' },
    { key: 'none', label: t('tenants.groupNone'), dot: 'bg-base-content/40' },
  ];

  return (
    <motion.div className="@container space-y-5 max-w-[1600px] mx-auto" variants={containerVariants} initial="hidden" animate="visible">
      {/* En-tête : Inviter + Nouveau, toujours au même endroit */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">{t('tenants.title')}</h1>
          <p className="text-base-content/70 font-medium mt-1 tabular-nums">
            {loading ? t('tenants.subtitle') : t('tenants.headerCounts', { tenants: locataires.length, count: acheteurs.length })}
          </p>
        </div>
        {canWrite && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setShowInviteModal(true)} className={`${OUTLINE_BTN} h-11 px-4`}>
              <Send size={16} aria-hidden="true" /> {t('common.invite')}
            </button>
            <Button variant="primary" onClick={openNew} aria-disabled={isLimitReached}
              title={isLimitReached ? t('tenants.limitReachedTitle') : undefined}
              className={`h-11 px-5 gap-1.5 ${isLimitReached ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}>
              <UserPlus size={16} aria-hidden="true" /> {isBuyers ? t('tenants.newBuyer') : t('tenants.newTenant')}
            </Button>
          </div>
        )}
      </motion.div>

      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Barre d'outils unique : onglets, recherche, tri, lien vers les baux, puis filtres rapides */}
      <motion.div variants={itemVariants} className="bg-base-100 rounded-2xl p-4 border border-base-300/70 space-y-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label={t('tenants.profileTypeLabel')} className="flex w-full @lg:w-auto gap-1 p-1 rounded-xl bg-base-200 dark:bg-base-300/60">
            {([
              { key: 'locataires', icon: <Users size={16} aria-hidden="true" className="hidden @sm:block" />, label: t('nav.locataires'), count: locataires.length },
              { key: 'acheteurs', icon: <Wallet size={16} aria-hidden="true" className="hidden @sm:block" />, label: t('tenants.buyers'), count: acheteurs.length },
            ] as const).map(tab => {
              const on = activeTab === tab.key;
              return (
                <button key={tab.key} type="button" role="tab" aria-selected={on}
                  onClick={() => { setActiveTab(tab.key); setFilterValues({}); setGroup('all'); }}
                  className={`h-9 px-2.5 @sm:px-3.5 min-w-0 flex-1 @lg:flex-none justify-center rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    on ? 'bg-base-100 text-primary shadow-sm' : 'text-base-content/70 hover:text-base-content'}`}>
                  {tab.icon}{tab.label}
                  <span className={`text-xs px-2 py-px rounded-full tabular-nums ${on ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content/80'}`}>{tab.count}</span>
                </button>
              );
            })}
          </div>

          <SearchInput placeholder={t('tenants.searchPh')} value={searchQuery} onChange={setSearchQuery} className="flex-[1_1_280px] min-w-0" />

          <label className="flex-[1_1_150px] @3xl:flex-none flex items-center gap-2 h-11 px-3 rounded-xl border border-base-300 bg-base-100 text-sm text-base-content/70 focus-within:outline-2 focus-within:outline-primary">
            <span>{t('tenants.sortLabel')}</span>
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="bg-transparent font-semibold text-base-content outline-none">
              <option value="late">{t('tenants.sortLate')}</option>
              <option value="name">{t('tenants.sortName')}</option>
              <option value="recent">{t('tenants.sortRecent')}</option>
            </select>
          </label>

          {/* Remplace l'onglet « Affectations », qui ne faisait que renvoyer vers les baux */}
          <button type="button" onClick={() => navigate('/dashboard/locations')} className="text-sm font-semibold text-primary whitespace-nowrap min-h-11 px-1 hover:underline">
            {t('tenants.viewLeasesLink')} →
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="group" aria-label={t('tenants.quickFilterLabel')} className="flex flex-wrap gap-2">
            {groups.map(g => {
              const on = group === g.key;
              return (
                <button key={g.key} type="button" aria-pressed={on} onClick={() => setGroup(g.key)}
                  className={`h-9 px-3.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    on ? 'bg-primary text-primary-content border-primary' : 'bg-base-100 text-base-content border-base-300 hover:bg-base-200'}`}>
                  <span className={`w-2 h-2 rounded-full ${on ? 'bg-primary-content' : g.dot}`} aria-hidden="true" />
                  {g.label}
                  <span className="tabular-nums opacity-80">{groupCounts[g.key]}</span>
                </button>
              );
            })}
          </div>
          {/* Filtres avancés existants (statut, paiement multiple) */}
          <button type="button" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters}
            className={`${OUTLINE_BTN} h-9 px-3.5 ${showFilters ? 'border-primary text-primary' : ''}`}>
            {showFilters ? <X size={16} aria-hidden="true" /> : <SlidersHorizontal size={16} aria-hidden="true" />}
            {t('tenants.moreFilters')}
            {extraFilterCount > 0 && <span className="w-5 h-5 rounded-full bg-primary text-primary-content text-xs inline-flex items-center justify-center">{extraFilterCount}</span>}
          </button>
        </div>
      </motion.div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <FilterPanel filters={LOCATAIRE_FILTERS} values={filterValues} onChange={setFilterValues} onClear={() => setFilterValues({})} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {loading ? (
        <ListSkeleton />
      ) : (
        <div className="flex flex-wrap items-start gap-5">
          <section aria-label={t('tenants.resultsLabel')} className="flex-[999_1_560px] min-w-0 bg-base-100 rounded-2xl border border-base-300/70 overflow-hidden">
            {paginatedList.length === 0 ? (
              <EmptyState
                icon={<Users size={40} />}
                title={isBuyers ? t('tenants.noBuyersFound') : t('tenants.noTenantsFound')}
                description={t('tenants.noResultsDesc')}
                actionLabel={canWrite ? (isBuyers ? t('tenants.newBuyer') : t('tenants.newTenant')) : undefined}
                onAction={canWrite ? openNew : undefined}
                className="border-none"
              />
            ) : (
              <ul className="divide-y divide-base-300/70">
                {paginatedList.map(person => {
                  const name = fullName(person);
                  const l = lodgingOf(person);
                  const sit = situationOf(person);
                  const active = selected?.id === person.id;
                  const payLabel = sit === 'none' ? t('tenants.groupNone')
                    : l.multi ? t('tenants.multiPaid', { paid: l.paid, total: l.active })
                    : sit === 'paid' ? t('tenants.groupPaid') : sit === 'pending' ? t('tenants.groupPending') : sit === 'late' ? t('tenants.groupLate') : t('tenants.payUnknown');
                  return (
                    <li key={person.id} className={`flex flex-wrap items-center gap-x-5 gap-y-3 px-4 @xl:px-5 py-3.5 transition-colors ${active ? 'bg-primary/10' : 'hover:bg-base-200/60'}`}>
                      <button type="button" onClick={() => selectPerson(person)} aria-label={t('tenants.openProfile', { name })} aria-current={active ? 'true' : undefined}
                        className="flex-[1_1_200px] min-w-0 flex items-center gap-3 text-left rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                        <Avatar person={person} size={40} />
                        <span className="min-w-0">
                          <span className="block text-[15px] font-bold text-base-content break-words">{name}</span>
                          <span className="block text-sm text-base-content/70 tabular-nums">{person.telephone_principal || '—'}</span>
                        </span>
                      </button>
                      <span className="flex-[1_1_140px] min-w-0">
                        <span className="block text-sm font-semibold text-base-content break-words">
                          {!l.has ? t('tenants.noHousing') : l.multi ? t('tenants.housingCount', { count: l.active }) : (person.lot_nom || person.lot || '—')}
                        </span>
                        <span className="block text-sm text-base-content/70 tabular-nums">{l.rent > 0 ? t('tenants.perMonth', { amount: fmt(l.rent) }) : '—'}</span>
                      </span>
                      <span className={`shrink-0 min-w-24 text-center px-2.5 py-1.5 rounded-full text-xs font-bold ${SITUATION_PILL[sit]}`}>{payLabel}</span>
                      <div className="flex gap-1.5">
                        <button type="button" aria-label={t('tenants.whatsappOf', { name })} title={t('tenants.whatsapp')} disabled={!person.telephone_principal}
                          onClick={() => handleWhatsApp(person.telephone_principal, person.prenoms)} className={`${OUTLINE_BTN} w-10 h-10 text-emerald-800 dark:text-emerald-200 disabled:opacity-40`}>
                          <MessageCircle size={16} aria-hidden="true" />
                        </button>
                        <button type="button" aria-label={t('tenants.callOf', { name })} title={t('tenants.call')} disabled={!person.telephone_principal}
                          onClick={() => handleCall(person.telephone_principal)} className={`${OUTLINE_BTN} w-10 h-10 text-sky-800 dark:text-sky-200 disabled:opacity-40`}>
                          <Phone size={16} aria-hidden="true" />
                        </button>
                        <RowMenu
                          label={t('tenants.moreActions')}
                          items={[
                            { label: t('tenants.viewProfile'), onSelect: () => handleView(person.id) },
                            ...(l.has ? [{ label: t('tenants.rentDetails'), onSelect: () => setRentModalFor(person) }] : []),
                            ...(canWrite ? [{ label: t('common.delete'), onSelect: () => handleDelete(person.id), danger: true }] : []),
                          ]}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Pagination : position + Précédent / Suivant */}
            {total > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 @xl:px-5 py-3.5 border-t border-base-300/70 text-sm text-base-content/70">
                <span className="tabular-nums">{t('tenants.rangeInfo', { from, to, count: total })}</span>
                {totalPages > 1 && (
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed`}>
                      <ChevronLeft size={16} aria-hidden="true" /> {t('tenants.previous')}
                    </button>
                    <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed`}>
                      {t('tenants.next')} <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {selected && (
            <TenantPanel
              ref={panelRef}
              person={selected}
              isBuyer={isBuyers}
              canWrite={canWrite}
              onClose={() => { setPanelDismissed(true); setPickedId(null); }}
              onWhatsApp={() => handleWhatsApp(selected.telephone_principal, selected.prenoms)}
              onCall={() => handleCall(selected.telephone_principal)}
              onRecordPayment={() => navigate(withCreateAction('/dashboard/finances'))}
              onAssign={() => navigate(withCreateAction('/dashboard/contrats'))}
              onFullProfile={() => handleView(selected.id)}
            />
          )}
        </div>
      )}

      {rentModalFor && (
        <LoyerDetailsModal
          locataireId={rentModalFor.id}
          locataireName={fullName(rentModalFor)}
          isOpen
          onClose={() => setRentModalFor(null)}
        />
      )}

      <InvitationLinkModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} type="tenant" />

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => { confirmConfig.action(); setConfirmConfig(prev => ({ ...prev, isOpen: false })); }}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
    </motion.div>
  );
};

export default Locataires;
