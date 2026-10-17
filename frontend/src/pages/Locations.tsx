// frontend/src/pages/Locations.tsx
// Page de gestion des baux (locations).
// Refonte T-066 (maquette T-065) : même logique que Parc immobilier, Locataires et Propriétaires —
// en-tête chiffré, barre unique (recherche, tri, filtres rapides), une ligne par bail,
// panneau latéral à la place de la fenêtre modale.

import React, { useState, useEffect, useMemo, useCallback, useRef, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { motion } from 'framer-motion';
import { Plus, FileText, PenLine, CalendarClock, X, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import LocationForm from '../components/locations/LocationForm';
import locationApi from '../api/locationApi';
import { getLocataires } from '../api/locataireApi';
import type { Location, CreateLocationData } from '../api/locationApi';
import { accountApi } from '../api/accountApi';
import { getLots } from '../api/bienApi';
import { documentApi } from '../api/documentApi';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import SearchInput from '../components/ui/SearchInput';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import EmptyState from '../components/ui/EmptyState';
import SignatureModal from '../components/SignatureModal';
import ConfirmModal from '../components/ui/ConfirmModal';
import LoadErrorState from '../components/ui/LoadErrorState';
import RowMenu, { OUTLINE_BTN } from '../components/ui/RowMenu';
import { useIsDesktop, isDesktop } from '../hooks/useIsDesktop';
import { getAvatarColor } from '../utils/locataireUtils';

type FormOptions = React.ComponentProps<typeof LocationForm>;

const ITEMS_PER_PAGE = 12;
const SOON_DAYS = 60;
const DAY_MS = 86_400_000;

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants      = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

// ── États d'un bail ──────────────────────────────────────────────────────────────────────────
// Côté serveur, `actif` = en cours mais pas encore signé ; la signature passe le bail à `signe`
// (POST /locations/:id/sign). La liste sépare donc l'état du contrat (« En cours ») et la signature.
const LIVE = ['actif', 'signe'];
const isLive = (l: Location) => LIVE.includes(l.statut);

type Group = 'all' | 'live' | 'sign' | 'soon' | 'ended' | 'refuse';
type SortKey = 'end' | 'recent' | 'tenant' | 'rent';

// Pastilles : teintes foncées sur fond pâle (≥ 4,5:1), l'inverse en thème sombre
const PILL = {
  live:    'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100',
  expire:  'bg-orange-100 text-orange-900 dark:bg-orange-400/20 dark:text-orange-100',
  refuse:  'bg-red-100 text-red-900 dark:bg-red-400/20 dark:text-red-100',
  neutral: 'bg-base-200 text-base-content/80',
};
const pillOf = (l: Location) =>
  isLive(l) ? PILL.live : l.statut === 'expire' ? PILL.expire : l.statut === 'refuse' ? PILL.refuse : PILL.neutral;

const statusLabel = (l: Location, t: TFunction) => {
  switch (l.statut) {
    case 'actif': case 'signe': return t('leases.statusLive');
    case 'expire': return t('leases.statusExpired');
    case 'resilie': return t('leases.statusTerminated');
    case 'refuse': return t('leases.statusRefused');
    case 'en_attente': return t('leases.statusPending');
    // Statut inconnu : affiché tel quel plutôt que masqué
    default: return l.statut ? l.statut.charAt(0).toUpperCase() + l.statut.slice(1).replace(/_/g, ' ') : '—';
  }
};

const fmt = (n: number) => n.toLocaleString('fr-FR');
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('fr-FR') : '');
// Montants en FCFA comme sur les autres pages refondues ; autre devise : format monétaire standard
const money = (amount: number | string | undefined, devise?: string) => {
  const n = Number(amount) || 0;
  if (!devise || devise === 'XOF') return `${fmt(n)} FCFA`;
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: devise }).format(n);
};
const tenantName = (l: Location) => [l.locataire_prenoms, l.locataire_nom].filter(Boolean).join(' ') || '—';

// Avancement de la période : % écoulé et jours restants (null sans date de fin)
const timingOf = (l: Location, now: number) => {
  if (!l.date_fin) return { pct: 0, days: null as number | null };
  const a = new Date(l.date_debut).getTime();
  const z = new Date(l.date_fin).getTime();
  const pct = z > a ? Math.max(0, Math.min(100, Math.round(((now - a) / (z - a)) * 100))) : 100;
  return { pct, days: Math.ceil((z - now) / DAY_MS) };
};
const isSoon = (l: Location, now: number) => {
  const { days } = timingOf(l, now);
  return isLive(l) && days !== null && days <= SOON_DAYS;
};

const timingText = (l: Location, now: number, t: TFunction) => {
  const { days } = timingOf(l, now);
  if (days === null) return t('leases.noEnd');
  if (!isLive(l)) return t('leases.endedOn', { date: fmtDate(l.date_fin) });
  if (days < 0) return t('leases.overdue', { count: -days });
  if (days <= SOON_DAYS) return t('leases.dueIn', { count: days });
  return t('leases.left', { count: Math.round(days / 30.4) });
};

// Montant de la ligne : loyer, ou prix pour une vente ; une réservation n'a souvent pas de loyer
const amountOf = (l: Location, t: TFunction) => {
  if (l.type_contrat === 'vente') return { main: l.prix_vente ? money(l.prix_vente, l.devise) : t('leases.sale'), sub: l.prix_vente ? t('leases.salePrice') : '' };
  if (l.type_contrat === 'reservation') return { main: t('leases.reservation'), sub: Number(l.loyer_mensuel) > 0 ? `${money(l.loyer_mensuel, l.devise)} / mois` : '' };
  return { main: money(l.loyer_mensuel, l.devise), sub: t('leases.perMonth') };
};

const addYear = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
};

const ProgressBar: React.FC<{ pct: number; warn: boolean; thick?: boolean }> = ({ pct, warn, thick }) => (
  <span aria-hidden="true" className={`block ${thick ? 'h-2' : 'h-1.5'} rounded-full bg-base-200 dark:bg-base-300 overflow-hidden`}>
    <span className={`block h-full ${warn ? 'bg-orange-500' : 'bg-primary'}`} style={{ width: `${pct}%` }} />
  </span>
);

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

// ── Panneau du bail sélectionné ──────────────────────────────────────────────────────────────

interface PanelProps {
  lease: Location;
  now: number;
  renewOpen: boolean;
  generating: boolean;
  onClose: () => void;
  onToggleRenew: (open: boolean) => void;
  onRenew: (dateFin: string, loyer?: number) => Promise<void>;
  onGenerate: () => void;
  onEdit: () => void;
  onSign: () => void;
  onTerminate: () => void;
  onOpenSchedule: () => void;
}

const LeasePanel = forwardRef<HTMLElement, PanelProps>(
  ({ lease, now, renewOpen, generating, onClose, onToggleRenew, onRenew, onGenerate, onEdit, onSign, onTerminate, onOpenSchedule }, ref) => {
    const { t } = useTranslation();
    const live = isLive(lease);
    const { pct, days } = timingOf(lease, now);
    const warn = isSoon(lease, now);
    // Le panneau est remonté à chaque bail (key côté parent) : ces champs repartent de zéro
    const [renewEnd, setRenewEnd] = useState(() => addYear(lease.date_fin));
    const [renewRent, setRenewRent] = useState('');
    const [renewing, setRenewing] = useState(false);

    const submitRenew = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!renewEnd) return;
      setRenewing(true);
      try {
        const rent = renewRent.trim() === '' ? undefined : Number(renewRent.replace(/\s/g, ''));
        await onRenew(renewEnd, Number.isFinite(rent) ? rent : undefined);
      } finally {
        setRenewing(false);
      }
    };

    const rows: [string, string][] = [
      [t('leases.housing'), [lease.ref_lot, lease.immeuble_nom].filter(Boolean).join(' · ') || '—'],
      [t('leases.monthlyRent'), Number(lease.loyer_mensuel) > 0 ? `${money(lease.loyer_mensuel, lease.devise)} / mois` : '—'],
      ...(Number(lease.charges_mensuelles) > 0 ? [[t('leases.charges'), money(lease.charges_mensuelles, lease.devise)] as [string, string]] : []),
      [t('leases.deposit'), money(lease.caution, lease.devise)],
      ...(Number(lease.avance) > 0 ? [[t('leases.advance'), money(lease.avance, lease.devise)] as [string, string]] : []),
      ...(live && lease.jour_echeance ? [[t('leases.dueDay'), t('leases.dueDayValue', { day: lease.jour_echeance })] as [string, string]] : []),
    ];

    return (
      <aside ref={ref} aria-label={t('leases.panelLabel')}
        className="flex-[1_1_340px] min-w-0 bg-base-100 rounded-2xl border border-base-300/70 p-5 space-y-4 scroll-mt-4 lg:sticky lg:top-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 space-y-1.5">
            <p className="text-xs font-bold font-mono text-base-content/70 break-all">{lease.reference_bail || t('leases.noRef')}</p>
            <h2 className="text-xl font-bold text-base-content break-words">{tenantName(lease)}</h2>
            <div className="flex flex-wrap gap-1.5">
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${pillOf(lease)}`}>{statusLabel(lease, t)}</span>
              {live && (
                <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${lease.statut === 'signe' ? PILL.live : PILL.expire}`}>
                  {lease.statut === 'signe' ? t('leases.signed') : t('leases.notSigned')}
                </span>
              )}
              {lease.type_contrat === 'reservation' && <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${PILL.neutral}`}>{t('leases.reservation')}</span>}
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label={t('leases.closePanel')} className={`${OUTLINE_BTN} w-10 h-10 shrink-0`}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <dl className="space-y-2 px-3.5 py-3 rounded-xl bg-base-200/70 dark:bg-base-200 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-base-content/70">{k}</dt>
              <dd className="font-semibold tabular-nums text-right [overflow-wrap:anywhere]">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="space-y-1.5">
          <div className="flex justify-between gap-2 text-sm text-base-content/80 tabular-nums">
            <span>{t('leases.start', { date: fmtDate(lease.date_debut) })}</span>
            <span>{lease.date_fin ? t('leases.end', { date: fmtDate(lease.date_fin) }) : t('leases.endUnknown')}</span>
          </div>
          {days !== null && <ProgressBar pct={pct} warn={warn} thick />}
          <p className={`text-sm font-semibold tabular-nums ${warn ? 'text-orange-800 dark:text-orange-200' : 'text-base-content/80'}`}>{timingText(lease, now, t)}</p>
        </div>

        {lease.statut === 'actif' && (
          <div className="flex flex-wrap items-center gap-2.5 p-3.5 rounded-xl border border-orange-200 bg-orange-50 text-sm text-orange-950 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-100">
            <span className="flex-[1_1_160px]">{t('leases.notSignedYet')}</span>
            <button type="button" onClick={onSign}
              className="h-10 px-3.5 rounded-lg bg-orange-800 text-white text-[13px] font-semibold hover:bg-orange-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-800">
              {t('leases.sign')}
            </button>
          </div>
        )}

        {/* Renouveler : le bouton de l'ancienne fenêtre n'était relié à rien */}
        {live && renewOpen && (
          <form onSubmit={submitRenew} className="space-y-2.5 p-3.5 rounded-xl border border-sky-200 bg-sky-50 dark:border-sky-400/30 dark:bg-sky-400/10">
            <p className="text-sm font-bold text-base-content">{t('leases.renewTitle')}</p>
            <label className="block text-[13px] text-base-content/80 space-y-1">
              <span>{t('leases.renewEnd')}</span>
              <input type="date" required value={renewEnd} min={lease.date_debut?.split('T')[0]} onChange={e => setRenewEnd(e.target.value)}
                className="block w-full h-10 px-2.5 rounded-lg border border-base-300 bg-base-100 text-sm text-base-content" />
            </label>
            <label className="block text-[13px] text-base-content/80 space-y-1">
              <span>{t('leases.renewRent')}</span>
              <input type="text" inputMode="numeric" value={renewRent} onChange={e => setRenewRent(e.target.value)}
                placeholder={Number(lease.loyer_mensuel) > 0 ? fmt(Number(lease.loyer_mensuel)) : ''}
                className="block w-full h-10 px-2.5 rounded-lg border border-base-300 bg-base-100 text-sm text-base-content tabular-nums" />
            </label>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" size="sm" className="flex-1 h-10" loading={renewing}>{t('leases.renewConfirm')}</Button>
              <button type="button" onClick={() => onToggleRenew(false)} className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px]`}>{t('common.cancel')}</button>
            </div>
          </form>
        )}

        {live && !renewOpen && (
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" className="h-11 text-sm" onClick={onGenerate} loading={generating} loadingText={t('leases.generating')}>{t('leases.generate')}</Button>
            <button type="button" onClick={() => onToggleRenew(true)} className={`${OUTLINE_BTN} h-11`}>{t('leases.renew')}</button>
            <button type="button" onClick={onEdit} className={`${OUTLINE_BTN} h-11`}>{t('common.edit')}</button>
            <button type="button" onClick={onTerminate} className={`${OUTLINE_BTN} h-11 border-red-200 text-red-800 hover:bg-red-50 dark:border-red-400/30 dark:text-red-200 dark:hover:bg-red-400/10`}>{t('leases.terminate')}</button>
          </div>
        )}
        {!live && (
          <div className="space-y-2.5 p-3.5 rounded-xl border border-dashed border-base-300 text-sm text-base-content/80">
            <p>{lease.statut === 'refuse' ? t('leases.refusedText') : t('leases.endedText')}</p>
            <button type="button" onClick={onEdit} className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px]`}>{t('common.edit')}</button>
          </div>
        )}

        <button type="button" onClick={onOpenSchedule}
          className="w-full h-11 rounded-xl bg-base-200 dark:bg-base-300/60 text-sm font-semibold text-primary hover:bg-base-300 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          {t('leases.scheduleLink')} →
        </button>
      </aside>
    );
  }
);
LeasePanel.displayName = 'LeasePanel';

// ── Page ─────────────────────────────────────────────────────────────────────────────────────

const Locations: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Échec du chargement de la liste, distinct de `error` (erreurs d'actions) (T-042)
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [group, setGroup] = useState<Group>('all');
  const [sortKey, setSortKey] = useState<SortKey>('end');
  const [currentPage, setCurrentPage] = useState(1);
  const [signLeaseId, setSignLeaseId] = useState<number | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [renewFor, setRenewFor] = useState<number | null>(null);
  // Bail du panneau : premier de la page d'office sur grand écran, comme les autres pages refondues
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [panelDismissed, setPanelDismissed] = useState(false);
  const desktop = useIsDesktop();
  const panelRef = useRef<HTMLElement>(null);
  // Horodatage figé au montage : les « jours restants » ne bougent pas pendant la consultation
  const [now] = useState(() => Date.now());

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean; title: string; message: string; type: 'danger' | 'warning' | 'info'; action: () => Promise<void>;
  }>({ isOpen: false, title: '', message: '', type: 'danger', action: async () => {} });

  // Listes des formulaires
  const [locataires, setLocataires] = useState<FormOptions['locataires']>([]);
  const [lots, setLots] = useState<FormOptions['lots']>([]);
  const [owners, setOwners] = useState<FormOptions['owners']>([]);

  // `silent` : rechargement après une action sans remplacer la page par le squelette
  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setLoadError(null);
      const [locationsData, locatairesData, lotsData, ownersData] = await Promise.all([
        locationApi.getLocations(),
        getLocataires(),
        getLots(),
        accountApi.getProprietaires(),
      ]);
      setLocations(locationsData);
      setLocataires(Array.isArray(locatairesData) ? locatairesData : []);
      setLots(Array.isArray(lotsData) ? lotsData : []);
      setOwners(Array.isArray(ownersData) ? ownersData : []);
    } catch (err) {
      console.error(err);
      setLoadError((err as Error)?.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, group, sortKey]);

  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSubmit = async (data: CreateLocationData) => {
    try {
      if (editing) {
        await locationApi.updateLocation(editing.id, data);
        toast.success('Bail mis à jour avec succès');
      } else {
        await locationApi.createLocation(data);
        toast.success('Nouveau bail créé avec succès');
      }
      closeForm();
      loadData(true);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleSaveSignature = async (signatureImage: string) => {
    if (!signLeaseId) return;
    try {
      await locationApi.signLease(signLeaseId, signatureImage);
      toast.success('Contrat signé avec succès !');
      await loadData(true);
    } catch (err) {
      setError((err as Error).message || 'Erreur lors de la signature');
    } finally {
      setSignLeaseId(null);
    }
  };

  const handleResilier = (id: number) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Résilier ce bail',
      message: 'Êtes-vous sûr de vouloir résilier ce bail ? Cette action est irréversible.',
      type: 'warning',
      action: async () => {
        try {
          await locationApi.resilierLocation(id);
          toast.success('Bail résilié');
          loadData(true);
        } catch {
          setError('Erreur lors de la résiliation');
        }
      },
    });
  };

  const handleGenerateLease = async (id: number) => {
    try {
      setGeneratingId(id);
      await documentApi.generateLease(id);
      toast.success('Contrat de bail généré avec succès dans Documents !');
      loadData(true);
    } catch (err) {
      console.error('Erreur génération bail:', err);
      const data = (err as { response?: { data?: { message?: string; error?: string } } }).response?.data;
      toast.error(data?.message || data?.error || 'Erreur lors de la génération du bail');
    } finally {
      setGeneratingId(null);
    }
  };

  const handleRenew = async (id: number, dateFin: string, loyer?: number) => {
    try {
      await locationApi.renouvelerLocation(id, dateFin, loyer);
      toast.success(t('leases.renewed'));
      setRenewFor(null);
      await loadData(true);
    } catch (err) {
      toast.error((err as Error).message || t('leases.renewError'));
    }
  };

  // ── Filtrage, compteurs, tri ──
  const inGroup = useCallback((l: Location, g: Group) => {
    switch (g) {
      case 'all': return true;
      case 'live': return isLive(l);
      case 'sign': return l.statut === 'actif';
      case 'soon': return isSoon(l, now);
      case 'ended': return l.statut === 'expire' || l.statut === 'resilie';
      case 'refuse': return l.statut === 'refuse';
    }
  }, [now]);

  const counts = useMemo(() => {
    const keys: Group[] = ['all', 'live', 'sign', 'soon', 'ended', 'refuse'];
    return Object.fromEntries(keys.map(k => [k, locations.filter(l => inGroup(l, k)).length])) as Record<Group, number>;
  }, [locations, inGroup]);

  // Loyers mensuels des baux en cours (signés ou non), hors ventes et réservations
  const monthlyTotal = useMemo(() => locations
    .filter(l => isLive(l) && (!l.type_contrat || l.type_contrat === 'location'))
    .reduce((s, l) => s + (Number(l.loyer_mensuel) || 0), 0), [locations]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const endOf = (l: Location) => (isLive(l) && l.date_fin ? new Date(l.date_fin).getTime() : Infinity);
    const createdOf = (l: Location) => {
      const c = (l as Location & { created_at?: string }).created_at;
      return c ? new Date(c).getTime() : l.id;
    };
    return locations.filter(l => {
      if (!inGroup(l, group)) return false;
      if (!q) return true;
      return [l.locataire_nom, l.locataire_prenoms, l.reference_bail, l.immeuble_nom, l.ref_lot]
        .some(v => v?.toLowerCase().includes(q));
    }).sort((a, b) => {
      if (sortKey === 'tenant') return tenantName(a).localeCompare(tenantName(b), 'fr');
      if (sortKey === 'rent') return (Number(b.loyer_mensuel) || 0) - (Number(a.loyer_mensuel) || 0);
      if (sortKey === 'recent') return createdOf(b) - createdOf(a);
      // Échéance la plus proche : baux en cours datés d'abord, puis les autres du plus récent au plus ancien
      return endOf(a) - endOf(b) || createdOf(b) - createdOf(a);
    });
  }, [locations, searchTerm, group, sortKey, inGroup]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Formulaire pleine page (remplace la liste quand actif), inchangé
  if (showForm) {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <div className="flex flex-wrap items-center gap-4">
          <button type="button" onClick={closeForm} className="flex items-center gap-2 text-base-content/60 hover:text-base-content transition">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">{t('leases.backToLeases')}</span>
          </button>
          <div className="h-5 w-px bg-base-300" />
          <h1 className="text-xl font-bold text-base-content/90">{editing ? t('leases.editLease') : t('leases.newLease')}</h1>
        </div>
        {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
        <LocationForm
          onSubmit={handleSubmit}
          onCancel={closeForm}
          locataires={locataires}
          lots={lots}
          owners={owners}
          initialData={editing || undefined}
        />
      </div>
    );
  }

  const openNew = () => { setError(null); setEditing(null); setShowForm(true); };
  const openEdit = (l: Location) => { setError(null); setEditing(l); setShowForm(true); };
  const openSchedule = (l: Location) => navigate(`/dashboard/locations/${l.id}`);

  const pickedExists = pickedId != null && locations.some(l => l.id === pickedId);
  const selectedId = pickedExists ? pickedId : (desktop && !panelDismissed ? paginated[0]?.id ?? null : null);
  const selected = !panelDismissed || pickedExists ? locations.find(l => l.id === selectedId) ?? null : null;
  const selectLease = (l: Location, renew = false) => {
    setPickedId(l.id);
    setPanelDismissed(false);
    setRenewFor(renew ? l.id : null);
    // Sous 1024 px le panneau passe sous la liste : on l'amène à l'écran
    if (!isDesktop()) requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const total = filtered.length;
  const from = total === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const to = Math.min(currentPage * ITEMS_PER_PAGE, total);

  const groups: { key: Group; label: string; dot: string }[] = [
    { key: 'all', label: t('leases.groupAll'), dot: 'bg-base-content/50' },
    { key: 'live', label: t('leases.groupLive'), dot: 'bg-emerald-600' },
    { key: 'sign', label: t('leases.groupSign'), dot: 'bg-orange-500' },
    { key: 'soon', label: t('leases.groupSoon'), dot: 'bg-sky-600' },
    { key: 'ended', label: t('leases.groupEnded'), dot: 'bg-base-content/40' },
    { key: 'refuse', label: t('leases.groupRefused'), dot: 'bg-red-600' },
  ];

  return (
    <motion.div className="@container space-y-5 max-w-[1600px] mx-auto" variants={containerVariants} initial="hidden" animate="visible">
      {/* En-tête : chiffres clés dans le sous-titre, une seule action */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">{t('leases.title')}</h1>
          <p className="text-base-content/70 font-medium mt-1 tabular-nums">
            {loading || loadError ? t('leases.subtitle') : t('leases.headerCounts', { count: locations.length, live: counts.live, amount: money(monthlyTotal) })}
          </p>
        </div>
        <Button variant="primary" onClick={openNew} className="h-11 px-5 gap-1.5">
          <Plus size={16} aria-hidden="true" /> {t('leases.newLease')}
        </Button>
      </motion.div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

      {/* Ce qui demande une action : un clic filtre la liste */}
      {!loading && (counts.sign > 0 || counts.soon > 0) && (
        // Monté après le chargement : animation propre, la cascade du parent est déjà terminée
        <motion.div variants={itemVariants} initial="hidden" animate="visible" className="flex flex-wrap gap-2.5">
          {counts.sign > 0 && (
            <button type="button" onClick={() => setGroup('sign')} aria-pressed={group === 'sign'}
              className="flex-[1_1_260px] flex items-center gap-3 p-3.5 rounded-2xl border border-orange-200 bg-orange-50 text-left hover:bg-orange-100 dark:border-orange-400/30 dark:bg-orange-400/10 dark:hover:bg-orange-400/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <span aria-hidden="true" className="w-9 h-9 shrink-0 rounded-xl bg-orange-100 text-orange-900 dark:bg-orange-400/20 dark:text-orange-100 inline-flex items-center justify-center"><PenLine size={18} /></span>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold text-base-content tabular-nums">{t('leases.toSignTitle', { count: counts.sign })}</span>
                <span className="block text-sm text-base-content/70">{t('leases.toSignDesc')}</span>
              </span>
            </button>
          )}
          {counts.soon > 0 && (
            <button type="button" onClick={() => setGroup('soon')} aria-pressed={group === 'soon'}
              className="flex-[1_1_260px] flex items-center gap-3 p-3.5 rounded-2xl border border-base-300/70 bg-base-100 text-left hover:bg-base-200/60 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <span aria-hidden="true" className="w-9 h-9 shrink-0 rounded-xl bg-sky-100 text-sky-900 dark:bg-sky-400/20 dark:text-sky-100 inline-flex items-center justify-center"><CalendarClock size={18} /></span>
              <span className="min-w-0">
                <span className="block text-[15px] font-bold text-base-content tabular-nums">{t('leases.soonTitle', { count: counts.soon })}</span>
                <span className="block text-sm text-base-content/70">{t('leases.soonDesc')}</span>
              </span>
            </button>
          )}
        </motion.div>
      )}

      {/* Barre d'outils unique : recherche, tri, puis filtres rapides */}
      <motion.div variants={itemVariants} className="bg-base-100 rounded-2xl p-4 border border-base-300/70 space-y-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput placeholder={t('leases.searchPh')} value={searchTerm} onChange={setSearchTerm} className="flex-[1_1_280px] min-w-0" />
          <label className="flex-[1_1_200px] @3xl:flex-none flex items-center gap-2 h-11 px-3 rounded-xl border border-base-300 bg-base-100 text-sm text-base-content/70 focus-within:outline-2 focus-within:outline-primary">
            <span>{t('leases.sortLabel')}</span>
            <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)} className="min-w-0 flex-1 bg-transparent font-semibold text-base-content outline-none">
              <option value="end">{t('leases.sortEnd')}</option>
              <option value="recent">{t('leases.sortRecent')}</option>
              <option value="tenant">{t('leases.sortTenant')}</option>
              <option value="rent">{t('leases.sortRent')}</option>
            </select>
          </label>
        </div>
        <div role="group" aria-label={t('leases.quickFilterLabel')} className="flex flex-wrap gap-2">
          {groups.map(g => {
            const on = group === g.key;
            return (
              <button key={g.key} type="button" aria-pressed={on} onClick={() => setGroup(g.key)}
                className={`h-9 px-3.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  on ? 'bg-primary text-primary-content border-primary' : 'bg-base-100 text-base-content border-base-300 hover:bg-base-200'}`}>
                <span className={`w-2 h-2 rounded-full ${on ? 'bg-primary-content' : g.dot}`} aria-hidden="true" />
                {g.label}
                <span className="tabular-nums opacity-80">{counts[g.key]}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {loading ? (
        <ListSkeleton />
      ) : (
        <div className="flex flex-wrap items-start gap-5">
          <section aria-label={t('leases.resultsLabel')} className="flex-[999_1_560px] min-w-0 bg-base-100 rounded-2xl border border-base-300/70 overflow-hidden">
            {loadError ? (
              // Échec du chargement : pas de « Aucun bail trouvé » (T-042)
              <div className="p-6"><LoadErrorState message={loadError} onRetry={() => loadData()} /></div>
            ) : paginated.length === 0 ? (
              <EmptyState
                icon={<FileText size={40} />}
                title={t('leases.noLeases')}
                description={t('leases.noLeasesDesc')}
                actionLabel={t('leases.newLease')}
                onAction={openNew}
                className="border-none"
              />
            ) : (
              <ul className="divide-y divide-base-300/70">
                {paginated.map(l => {
                  const name = tenantName(l);
                  const live = isLive(l);
                  const { pct, days } = timingOf(l, now);
                  const warn = isSoon(l, now);
                  const amount = amountOf(l, t);
                  const active = selected?.id === l.id;
                  return (
                    <li key={l.id} className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 @xl:px-5 py-3.5 transition-colors ${active ? 'bg-primary/10' : 'hover:bg-base-200/60'}`}>
                      <button type="button" onClick={() => selectLease(l)} aria-label={t('leases.openLease', { name })} aria-current={active ? 'true' : undefined}
                        className="flex-[1_1_160px] min-w-0 flex items-center gap-3 text-left rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                        {l.locataire_photo ? (
                          <img src={l.locataire_photo} alt="" className="w-10 h-10 shrink-0 rounded-full object-cover" />
                        ) : (
                          <span aria-hidden="true" className={`w-10 h-10 shrink-0 rounded-full inline-flex items-center justify-center text-[13px] font-bold text-white ${getAvatarColor(l.locataire_nom || '?')}`}>
                            {l.locataire_prenoms?.charAt(0)}{l.locataire_nom?.charAt(0)}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block text-[15px] font-bold text-base-content break-words">{name}</span>
                          <span className="block text-xs font-semibold font-mono text-base-content/70 break-all">{l.reference_bail || t('leases.noRef')}</span>
                        </span>
                      </button>
                      <span className="flex-[1_1_100px] min-w-0">
                        <span className="block text-sm font-semibold text-base-content break-words">{l.ref_lot || '—'}</span>
                        <span className="block text-sm text-base-content/70 break-words">{l.immeuble_nom || ''}</span>
                      </span>
                      <span className="flex-none tabular-nums">
                        <span className="block text-sm font-bold text-base-content">{amount.main}</span>
                        {amount.sub && <span className="block text-xs text-base-content/70">{amount.sub}</span>}
                      </span>
                      <span className="flex-[1_1_120px] min-w-0 space-y-1.5">
                        <span className="block text-[13px] text-base-content/80 tabular-nums">
                          {l.date_fin ? `${fmtDate(l.date_debut)} → ${fmtDate(l.date_fin)}` : t('leases.since', { date: fmtDate(l.date_debut) })}
                        </span>
                        {days !== null && <ProgressBar pct={pct} warn={warn} />}
                        <span className={`block text-xs font-semibold tabular-nums ${warn ? 'text-orange-800 dark:text-orange-200' : 'text-base-content/70'}`}>{timingText(l, now, t)}</span>
                      </span>
                      <span className="shrink-0 flex flex-col items-start gap-1">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${pillOf(l)}`}>{statusLabel(l, t)}</span>
                        {live && (
                          <span className={`text-xs font-semibold ${l.statut === 'signe' ? 'text-emerald-800 dark:text-emerald-200' : 'text-orange-800 dark:text-orange-200'}`}>
                            {l.statut === 'signe' ? t('leases.signed') : t('leases.unsigned')}
                          </span>
                        )}
                      </span>
                      <RowMenu
                        label={t('leases.moreActions')}
                        items={[
                          { label: t('leases.viewLease'), onSelect: () => selectLease(l) },
                          { label: t('leases.scheduleLink'), onSelect: () => openSchedule(l) },
                          { label: t('common.edit'), onSelect: () => openEdit(l) },
                          ...(l.statut === 'actif' ? [{ label: t('leases.sign'), onSelect: () => setSignLeaseId(l.id) }] : []),
                          ...(live ? [
                            { label: t('leases.generate'), onSelect: () => handleGenerateLease(l.id) },
                            { label: t('leases.renew'), onSelect: () => selectLease(l, true) },
                            { label: t('leases.terminate'), onSelect: () => handleResilier(l.id), danger: true },
                          ] : []),
                        ]}
                      />
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Pagination : position + Précédent / Suivant */}
            {!loadError && total > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 @xl:px-5 py-3.5 border-t border-base-300/70 text-sm text-base-content/70">
                <span className="tabular-nums">{t('leases.rangeInfo', { from, to, count: total })}</span>
                {totalPages > 1 && (
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed`}>
                      <ChevronLeft size={16} aria-hidden="true" /> {t('leases.previous')}
                    </button>
                    <button type="button" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed`}>
                      {t('leases.next')} <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {selected && (
            <LeasePanel
              key={selected.id}
              ref={panelRef}
              lease={selected}
              now={now}
              renewOpen={renewFor === selected.id}
              generating={generatingId === selected.id}
              onClose={() => { setPanelDismissed(true); setPickedId(null); setRenewFor(null); }}
              onToggleRenew={open => setRenewFor(open ? selected.id : null)}
              onRenew={(dateFin, loyer) => handleRenew(selected.id, dateFin, loyer)}
              onGenerate={() => handleGenerateLease(selected.id)}
              onEdit={() => openEdit(selected)}
              onSign={() => setSignLeaseId(selected.id)}
              onTerminate={() => handleResilier(selected.id)}
              onOpenSchedule={() => openSchedule(selected)}
            />
          )}
        </div>
      )}

      <SignatureModal open={signLeaseId !== null} onClose={() => setSignLeaseId(null)} onSave={handleSaveSignature} />

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

export default Locations;
