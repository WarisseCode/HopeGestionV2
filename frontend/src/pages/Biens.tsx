// frontend/src/pages/Biens.tsx
// Orchestrateur mince — délègue state/logique à useBiens, rendu complexe aux sous-composants.
import React, { useRef, useState, forwardRef } from 'react';
import {
  Building2, Home, Plus, ArrowLeft, X, ChevronLeft, ChevronRight, UserPlus,
  SlidersHorizontal, Images,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Alert from '../components/ui/Alert';
import Modal from '../components/ui/Modal';
import SearchInput from '../components/ui/SearchInput';
import FilterPanel from '../components/ui/FilterPanel';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import ImmeubleForm from '../components/biens/ImmeubleForm';
import LotForm from '../components/biens/LotForm';
import ConfirmModal from '../components/ui/ConfirmModal';
import EmptyState from '../components/ui/EmptyState';
import LoadErrorState from '../components/ui/LoadErrorState';
import AssignmentForm from '../components/biens/AssignmentForm';
import ImmeubleDetailModal from '../components/biens/ImmeubleDetailModal';
import LotDetailModal from '../components/biens/LotDetailModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { saveLot } from '../api/bienApi';
import type { Immeuble, Lot } from '../api/bienApi';
import { useBiens, lotInGroup } from '../hooks/useBiens';
import type { StatusGroup, SortKey } from '../hooks/useBiens';
import { useCreateFromUrl } from '../hooks/useCreateFromUrl';
import NoPhotoPlaceholder from '../components/ui/NoPhotoPlaceholder';
import { getLotStatut, ITEMS_PER_PAGE } from '../utils/bienUtils';
import RowMenu, { OUTLINE_BTN } from '../components/ui/RowMenu';
import { useIsDesktop, isDesktop } from '../hooks/useIsDesktop';
import toast from 'react-hot-toast';

// ── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden:  { y: 20, opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

// ── Styles partagés de la refonte (T-060) ──────────────────────────────────────

const SELECT_WRAP = 'flex-[1_1_150px] @3xl:flex-none flex items-center gap-2 h-11 px-3 rounded-xl border border-base-300 bg-base-100 text-sm text-base-content/70 focus-within:outline-2 focus-within:outline-primary';

// Même règle d'occupation que l'ancienne carte immeuble (ImmeubleCard)
const OCCUPIED_STATUSES = ['loue', 'occupe', 'occupé', 'vendu'];

// Pastilles de la maquette : Libre orange, Loué vert, Réservé bleu ; teintes foncées sur fond pâle (≥ 4,5:1),
// et l'inverse en thème sombre
const FREE_PILL = 'bg-orange-100 text-orange-900 dark:bg-orange-400/20 dark:text-orange-100';
const FULL_PILL = 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/20 dark:text-emerald-100';
const statusPillClass = (statut?: string) => {
  switch (statut?.toLowerCase()) {
    case 'disponible': case 'libre': return FREE_PILL;
    case 'occupe': case 'occupé': case 'loue': case 'loué': return FULL_PILL;
    case 'reserve': case 'réservé': return 'bg-sky-100 text-sky-900 dark:bg-sky-400/20 dark:text-sky-100';
    case 'vendu': return 'bg-indigo-100 text-indigo-900 dark:bg-indigo-400/20 dark:text-indigo-100';
    default: return 'bg-base-200 text-base-content/80';
  }
};


// ── Skeleton (presentational only, stays local) ──────────────────────────────

const ListSkeleton = () => (
  <div role="status" aria-label="Chargement" className="bg-base-100 rounded-2xl border border-base-300/70 divide-y divide-base-300/70">
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse motion-reduce:animate-none!">
        <SkeletonLoader variant="rectangular" width={56} height={56} className="rounded-xl" />
        <div className="flex-1 space-y-2">
          <SkeletonLoader variant="text" width="40%" />
          <SkeletonLoader variant="text" width="25%" />
        </div>
        <SkeletonLoader variant="rectangular" width={160} height={8} className="rounded-full hidden sm:block" />
      </div>
    ))}
  </div>
);

// ── Panneau latéral : un immeuble et ses lots ───────────────────────────────

interface BuildingPanelProps {
  immeuble: Immeuble;
  lots: Lot[];
  canWrite: boolean;
  onClose: () => void;
  onGallery: () => void;
  onAddLot: () => void;
  onOpenLot: (lot: Lot) => void;
  onFullSheet: () => void;
  onEdit: () => void;
}

const PANEL_LOTS_MAX = 6;

const BuildingPanel = forwardRef<HTMLElement, BuildingPanelProps>(
  ({ immeuble, lots, canWrite, onClose, onGallery, onAddLot, onOpenLot, onFullSheet, onEdit }, ref) => {
    const { t } = useTranslation();
    const occupied = lots.filter(l => OCCUPIED_STATUSES.includes(l.statut?.toLowerCase() || '')).length;
    const free = lots.filter(l => lotInGroup(l, 'free')).length;
    const total = immeuble.nbLots || lots.length || 0;
    const photo = immeuble.photo || immeuble.photos?.[0];
    const photoCount = immeuble.photos?.length ?? (photo ? 1 : 0);

    return (
      <aside
        ref={ref}
        aria-label={t('properties.detailLabel')}
        className="flex-[1_1_340px] min-w-0 bg-base-100 rounded-2xl border border-base-300/70 p-5 space-y-4 scroll-mt-4 lg:sticky lg:top-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-base-content break-words">{immeuble.nom}</h2>
            <p className="text-sm text-base-content/70 break-words">
              {[immeuble.ville, t('properties.ownerLabel', { name: immeuble.proprietaire || t('properties.notAssigned') })].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('properties.closeDetail')} className={`${OUTLINE_BTN} w-10 h-10 shrink-0`}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={onGallery}
          aria-label={t('properties.openGallery')}
          className="relative block w-full h-36 rounded-xl overflow-hidden bg-base-200 group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {photo
            ? <img src={photo} alt="" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
            : <NoPhotoPlaceholder className="w-full h-full" />}
          {photoCount > 0 && (
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 text-white text-xs font-semibold">
              <Images size={12} aria-hidden="true" /> {photoCount}
            </span>
          )}
        </button>

        <dl className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-base-200/70 dark:bg-base-200"><dt className="text-xs text-base-content/70">{t('properties.statLots')}</dt><dd className="text-lg font-bold tabular-nums">{total}</dd></div>
          <div className="p-2.5 rounded-xl bg-base-200/70 dark:bg-base-200"><dt className="text-xs text-base-content/70">{t('properties.statOccupied')}</dt><dd className="text-lg font-bold tabular-nums">{occupied}</dd></div>
          <div className={`p-2.5 rounded-xl ${FREE_PILL}`}><dt className="text-xs">{t('properties.statFree')}</dt><dd className="text-lg font-bold tabular-nums">{free}</dd></div>
        </dl>

        <div className="flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-bold text-base-content">{t('properties.buildingLots')}</h3>
          {canWrite && (
            <button type="button" onClick={onAddLot} className={`${OUTLINE_BTN} h-9 px-3 text-[13px]`}>
              <Plus size={14} aria-hidden="true" /> {t('properties.addLotHere')}
            </button>
          )}
        </div>

        {lots.length === 0 ? (
          <p className="text-sm text-base-content/70">{t('properties.noLotInBuilding')}</p>
        ) : (
          <ul className="space-y-2">
            {lots.slice(0, PANEL_LOTS_MAX).map(lot => {
              const s = getLotStatut(lot.statut);
              return (
                <li key={lot.id}>
                  <button
                    type="button"
                    onClick={() => onOpenLot(lot)}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-base-300/70 text-left hover:bg-base-200/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-base-content break-words">{lot.reference}</span>
                      <span className="block text-xs text-base-content/70 tabular-nums">{lot.loyer?.toLocaleString('fr-FR')} {t('properties.perMonthShort')}</span>
                    </span>
                    <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${statusPillClass(lot.statut)}`}>{t(s.labelKey)}</span>
                  </button>
                </li>
              );
            })}
            {lots.length > PANEL_LOTS_MAX && (
              <li className="text-xs text-base-content/70 px-1">{t('properties.moreLots', { count: lots.length - PANEL_LOTS_MAX })}</li>
            )}
          </ul>
        )}

        <div className="flex flex-wrap gap-2 pt-4 border-t border-base-300/70">
          <Button variant="primary" className="flex-1 h-11" onClick={onFullSheet}>{t('properties.viewFullSheet')}</Button>
          {canWrite && <button type="button" onClick={onEdit} className={`${OUTLINE_BTN} h-11 px-4`}>{t('common.edit')}</button>}
        </div>
      </aside>
    );
  }
);
BuildingPanel.displayName = 'BuildingPanel';

// ── Main component ────────────────────────────────────────────────────────────

const Biens: React.FC = () => {
  const b = useBiens();
  const { t } = useTranslation();

  // Immeuble affiché dans le panneau latéral. Sur grand écran, le premier de la page est montré d'office
  // (comme la maquette) tant que l'utilisateur n'a pas fermé le panneau ; sur mobile, rien par défaut.
  // Valeur dérivée au rendu (pas d'effet) : un immeuble supprimé retombe simplement sur ce défaut.
  const [pickedId, setSelectedId] = useState<number | null>(null);
  const [panelDismissed, setPanelDismissed] = useState(false);
  const desktop = useIsDesktop();
  const panelRef = useRef<HTMLElement>(null);
  const firstOnPage = b.activeTab === 'immeubles' ? (b.paginatedData[0] as Immeuble | undefined)?.id : undefined;
  const pickedExists = pickedId != null && b.immeubles.some(i => i.id === pickedId);
  const selectedId = pickedExists ? pickedId : (desktop ? firstOnPage ?? null : null);

  // Action rapide « Nouveau Bien » du tableau de bord (?action=nouveau) : mêmes règles que le bouton
  // « Nouvel immeuble » (droits d'écriture, plafond d'abonnement), décidées une fois les données chargées.
  useCreateFromUrl(!b.loading, () => {
    if (!b.canWrite || b.loadError) return;
    if (b.isLimitReached) { toast(t('properties.limitReachedToast'), { icon: '👑' }); return; }
    b.setActiveTab('immeubles');
    b.openNewImmeuble();
  });

  // ── Form views ──────────────────────────────────────────────────────────

  if (b.formView === 'immeuble') {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => b.setFormView(null)} className="flex items-center gap-2 text-base-content/60 hover:text-base-content transition">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">{t('properties.backToPortfolio')}</span>
          </button>
          <div className="h-5 w-px bg-base-300" />
          <h1 className="text-xl font-bold text-base-content/90">
            {b.editingImmeuble.id ? t('properties.editBuilding') : t('properties.newBuilding')}
          </h1>
        </div>
        {b.error   && <Alert variant="error"   onClose={() => b.setError(null)}>{b.error}</Alert>}
        {b.success && <Alert variant="success" onClose={() => b.setSuccess(null)}>{b.success}</Alert>}
        <ImmeubleForm
          immeuble={b.editingImmeuble}
          proprietaires={b.proprietaires}
          gestionnaires={b.users}
          onSave={async (data) => {
            const saved = await b.handleSaveImmeuble(data);
            if (saved) b.setFormView(null);
          }}
          onSaveAndAddLots={async (data) => {
            const saved = await b.handleSaveImmeuble(data);
            if (saved?.id) {
              b.setActiveTab('lots');
              b.setEditingLot({ reference: '', type: 'Appartement', building_id: saved.id, etage: '', superficie: 0, nbPieces: 1, loyer: 0, charges: 0, description: '' });
              b.setFormView('lot');
            }
          }}
          onCancel={() => b.setFormView(null)}
        />
      </div>
    );
  }

  if (b.formView === 'lot') {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => b.setFormView(null)} className="flex items-center gap-2 text-base-content/60 hover:text-base-content transition">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">{t('properties.backToPortfolio')}</span>
          </button>
          <div className="h-5 w-px bg-base-300" />
          <h1 className="text-xl font-bold text-base-content/90">
            {b.editingLot.id ? t('properties.editLot') : t('properties.newLot')}
          </h1>
        </div>
        {b.error   && <Alert variant="error"   onClose={() => b.setError(null)}>{b.error}</Alert>}
        {b.success && <Alert variant="success" onClose={() => b.setSuccess(null)}>{b.success}</Alert>}
        <LotForm
          lot={b.editingLot}
          immeubles={b.immeubles}
          onSave={async (data) => {
            await saveLot(data);
            await b.fetchData();
            b.setFormView(null);
            b.setSuccess(t('properties.lotSaved'));
          }}
          onStatusChange={async (data, newStatus) => {
            if (['occupe', 'vendu', 'reserve'].includes(newStatus)) {
              b.setEditingLot(data as Lot);
              b.setActiveAssignmentLot(data as Lot);
              b.setFormView('assignment');
            } else {
              await saveLot({ ...data, statut: newStatus });
              await b.fetchData();
              b.setFormView(null);
              b.setSuccess(t('properties.lotStatusChanged', { status: newStatus }));
            }
          }}
          onCancel={() => b.setFormView(null)}
          loading={b.loading}
        />
      </div>
    );
  }

  if (b.formView === 'assignment') {
    return (
      <div className="space-y-6 max-w-[1600px] mx-auto">
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => b.setFormView(null)} className="flex items-center gap-2 text-base-content/60 hover:text-base-content transition">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">{t('properties.backToPortfolio')}</span>
          </button>
          <div className="h-5 w-px bg-base-300" />
          <h1 className="text-xl font-bold text-base-content/90">{t('properties.newAssignment')}</h1>
        </div>
        {b.error && <Alert variant="error" onClose={() => b.setError(null)}>{b.error}</Alert>}
        {b.activeAssignmentLot && (
          <AssignmentForm
            lot={b.activeAssignmentLot}
            onSuccess={async () => {
              await b.fetchData();
              b.setFormView(null);
              b.setSuccess(t('properties.assignmentSuccess'));
            }}
            onCancel={() => b.setFormView(null)}
          />
        )}
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────
  // Refonte T-060 (maquette T-059) : liste compacte, barre d'outils unique, filtres rapides par statut,
  // panneau latéral « immeuble + ses lots », actions secondaires dans un menu « ⋯ ».

  const isImm = b.activeTab === 'immeubles';
  const total = b.currentData.length;
  const from = total === 0 ? 0 : (b.currentPage - 1) * ITEMS_PER_PAGE + 1;
  const to = Math.min(b.currentPage * ITEMS_PER_PAGE, total);
  const selected = selectedId != null ? b.immeubles.find(i => i.id === selectedId) ?? null : null;
  const cityOptions = (b.dynamicImmeubleFilters.find(f => f.id === 'ville')?.options ?? []) as { value: string; label: string }[];
  const extraFilterCount = Object.keys(b.filterValues).filter(k => k !== 'ville').length;

  const guardedCreate = (open: () => void) => {
    if (b.isLimitReached) { toast(t('properties.limitReachedToast'), { icon: '👑' }); return; }
    open();
  };
  const editImmeuble = (immeuble: Immeuble) => { b.setEditingImmeuble(immeuble); b.setFormView('immeuble'); };
  const editLot = (lot: Lot) => { b.setEditingLot(lot); b.setFormView('lot'); };
  const assignLot = (lot: Lot) => { b.setEditingLot(lot); b.setActiveAssignmentLot(lot); b.setFormView('assignment'); };
  const addLotTo = (immeuble: Immeuble) => guardedCreate(() => {
    b.setEditingLot({ reference: '', type: 'Appartement', building_id: immeuble.id, etage: '', superficie: 0, nbPieces: 1, loyer: 0, charges: 0, description: '' });
    b.setFormView('lot');
  });
  const selectBuilding = (immeuble: Immeuble) => {
    setSelectedId(immeuble.id);
    setPanelDismissed(false);
    // Sous 1024 px le panneau passe sous la liste : on l'amène à l'écran
    if (!isDesktop()) requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const pickGroup = (g: StatusGroup) => {
    b.setStatusGroup(g);
    // Comme la maquette : un filtre de statut autre que « Tous » affiche les lots
    if (g !== 'all' && b.activeTab !== 'lots') { b.setActiveTab('lots'); b.setFilterValues({}); }
  };

  const groups: { key: StatusGroup; label: string; dot: string }[] = [
    { key: 'all', label: t('properties.groupAll'), dot: 'bg-base-content/50' },
    { key: 'free', label: t('properties.groupFree'), dot: 'bg-orange-500' },
    { key: 'rented', label: t('properties.groupRented'), dot: 'bg-emerald-600' },
    { key: 'reserved', label: t('properties.groupReserved'), dot: 'bg-sky-600' },
  ];

  return (
    <motion.div
      className="@container space-y-5 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* En-tête : deux boutons d'ajout fixes (le bouton ne change plus de sens selon l'onglet) */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">{t('nav.parcImmobilier')}</h1>
          <p className="text-base-content/70 font-medium mt-1 tabular-nums">
            {b.loading ? t('properties.subtitle') : t('properties.headerCounts', { buildings: b.immeubles.length, lots: b.lots.length })}
          </p>
        </div>
        {b.canWrite && (
          <div className="flex flex-wrap gap-2" title={b.isLimitReached ? t('properties.limitReachedTitle') : undefined}>
            <button
              type="button"
              onClick={() => guardedCreate(b.openNewLot)}
              aria-disabled={b.isLimitReached}
              className={`${OUTLINE_BTN} h-11 px-4 ${b.isLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Plus size={16} aria-hidden="true" /> {t('properties.newLot')}
            </button>
            <Button
              variant="primary"
              onClick={() => guardedCreate(b.openNewImmeuble)}
              aria-disabled={b.isLimitReached}
              className={`h-11 px-5 gap-1.5 ${b.isLimitReached ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
            >
              <Plus size={16} aria-hidden="true" /> {t('properties.newBuilding')}
            </Button>
          </div>
        )}
      </motion.div>

      {/* Alerts */}
      {b.error   && <Alert variant="error"   onClose={() => b.setError(null)}>{b.error}</Alert>}
      {b.success && <Alert variant="success" onClose={() => b.setSuccess(null)}>{b.success}</Alert>}

      {/* Barre d'outils unique : onglets, recherche, ville, tri, autres filtres, puis filtres rapides */}
      <motion.div variants={itemVariants} className="bg-base-100 rounded-2xl p-4 border border-base-300/70 space-y-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" aria-label={t('properties.viewLabel')} className="flex w-full @lg:w-auto gap-1 p-1 rounded-xl bg-base-200 dark:bg-base-300/60">
            {(['immeubles', 'lots'] as const).map(tab => {
              const on = b.activeTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => { b.setActiveTab(tab); b.setFilterValues({}); if (tab === 'immeubles') b.setStatusGroup('all'); }}
                  className={`h-9 px-2.5 @sm:px-3.5 min-w-0 flex-1 @lg:flex-none justify-center rounded-lg text-sm font-semibold inline-flex items-center gap-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                    on ? 'bg-base-100 text-primary shadow-sm' : 'text-base-content/70 hover:text-base-content'}`}
                >
                  {/* Icônes masquées sous 384 px de contenu : les deux onglets tiennent alors côte à côte */}
                  {tab === 'immeubles' ? <Building2 size={16} aria-hidden="true" className="hidden @sm:block" /> : <Home size={16} aria-hidden="true" className="hidden @sm:block" />}
                  {tab === 'immeubles' ? t('properties.buildings') : t('properties.lots')}
                  <span className={`text-xs px-2 py-px rounded-full tabular-nums ${on ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content/80'}`}>
                    {tab === 'immeubles' ? b.immeubles.length : b.lots.length}
                  </span>
                </button>
              );
            })}
          </div>

          <SearchInput
            placeholder={isImm ? t('properties.searchBuildingsPh') : t('properties.searchLotsPh')}
            value={b.searchQuery}
            onChange={b.setSearchQuery}
            className="flex-[1_1_280px] min-w-0"
          />

          {isImm && (
            <label className={SELECT_WRAP}>
              <span>{t('properties.cityLabel')}</span>
              <select
                value={(b.filterValues.ville as string) ?? ''}
                onChange={e => {
                  const v = e.target.value;
                  const next = { ...b.filterValues };
                  if (v) next.ville = v; else delete next.ville;
                  b.setFilterValues(next);
                }}
                className="bg-transparent font-semibold text-base-content outline-none max-w-[10rem]"
              >
                <option value="">{t('properties.cityAll')}</option>
                {cityOptions.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
          )}

          <label className={SELECT_WRAP}>
            <span>{t('properties.sortLabel')}</span>
            <select
              value={b.sortKey}
              onChange={e => b.setSortKey(e.target.value as SortKey)}
              className="bg-transparent font-semibold text-base-content outline-none"
            >
              <option value="free">{t('properties.sortFree')}</option>
              <option value="name">{t('properties.sortName')}</option>
              <option value="recent">{t('properties.sortRecent')}</option>
            </select>
          </label>

        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label={t('properties.quickFilterLabel')} className="flex flex-wrap gap-2">
          {groups.map(g => {
            const on = b.statusGroup === g.key && (g.key === 'all' || !isImm);
            return (
              <button
                key={g.key}
                type="button"
                aria-pressed={on}
                onClick={() => pickGroup(g.key)}
                className={`h-9 px-3.5 rounded-full text-sm font-semibold inline-flex items-center gap-2 border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  on ? 'bg-primary text-primary-content border-primary' : 'bg-base-100 text-base-content border-base-300 hover:bg-base-200'}`}
              >
                <span className={`w-2 h-2 rounded-full ${on ? 'bg-primary-content' : g.dot}`} aria-hidden="true" />
                {g.label}
                <span className="tabular-nums opacity-80">{b.statusCounts[g.key]}</span>
              </button>
            );
          })}
        </div>
          {/* Filtres avancés existants (type, statut, loyer…) conservés derrière ce bouton */}
          <button
            type="button"
            onClick={() => b.setShowFilters(!b.showFilters)}
            aria-expanded={b.showFilters}
            className={`${OUTLINE_BTN} h-9 px-3.5 ${b.showFilters ? 'border-primary text-primary' : ''}`}
          >
            {b.showFilters ? <X size={16} aria-hidden="true" /> : <SlidersHorizontal size={16} aria-hidden="true" />}
            {t('properties.moreFilters')}
            {extraFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-primary-content text-xs inline-flex items-center justify-center">{extraFilterCount}</span>
            )}
          </button>
        </div>
      </motion.div>

      {/* Filter panel (filtres avancés existants) */}
      <AnimatePresence>
        {b.showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <FilterPanel
              filters={isImm ? b.dynamicImmeubleFilters : b.lotFilters}
              values={b.filterValues}
              onChange={b.setFilterValues}
              onClear={() => b.setFilterValues({})}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      {b.loading ? (
        <ListSkeleton />
      ) : b.loadError ? (
        // Échec du chargement : ne pas afficher « Aucun immeuble trouvé » (T-042)
        <LoadErrorState message={b.loadError} onRetry={b.fetchData} className="mt-6" />
      ) : (
        <div className="flex flex-wrap items-start gap-5">
          {/* Liste : une ligne lisible par bien */}
          <section aria-label={t('properties.results')} className="flex-[999_1_560px] min-w-0 bg-base-100 rounded-2xl border border-base-300/70 overflow-hidden">
            {isImm ? (
              (b.paginatedData as Immeuble[]).length === 0 ? (
                <EmptyState
                  icon={<Building2 size={40} />}
                  title={t('properties.noBuildingsFound')}
                  description={t('properties.noBuildingsDesc')}
                  actionLabel={b.canWrite ? t('properties.addBuilding') : undefined}
                  onAction={b.canWrite ? () => guardedCreate(b.openNewImmeuble) : undefined}
                  className="border-none"
                />
              ) : (
                <ul className="divide-y divide-base-300/70">
                  {(b.paginatedData as Immeuble[]).map(immeuble => {
                    const buildingLots = b.lots.filter(l => l.building_id === immeuble.id);
                    const occupied = buildingLots.filter(l => OCCUPIED_STATUSES.includes(l.statut?.toLowerCase() || '')).length;
                    const totalLots = immeuble.nbLots || buildingLots.length || 0;
                    const free = b.freeLotsByBuilding.get(immeuble.id) ?? 0;
                    const pct = totalLots ? Math.round((occupied / totalLots) * 100) : 0;
                    const active = !panelDismissed && selectedId === immeuble.id;
                    const photo = immeuble.photo || immeuble.photos?.[0];
                    return (
                      <li key={immeuble.id} className={`flex flex-wrap items-center gap-x-6 gap-y-3 px-4 @xl:px-5 py-3.5 transition-colors ${active ? 'bg-primary/10' : 'hover:bg-base-200/60'}`}>
                        <button
                          type="button"
                          onClick={() => selectBuilding(immeuble)}
                          aria-label={t('properties.openItem', { name: immeuble.nom })}
                          aria-current={active ? 'true' : undefined}
                          className="flex-[1_1_240px] min-w-0 flex items-center gap-3.5 text-left rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <span className="w-14 h-14 shrink-0 rounded-xl overflow-hidden bg-base-200">
                            {photo
                              ? <img src={photo} alt="" className="w-full h-full object-cover" />
                              : <NoPhotoPlaceholder className="w-full h-full" showLabel={false} iconSize={18} />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[15px] font-bold text-base-content break-words">{immeuble.nom}</span>
                            <span className="block text-sm text-base-content/70 break-words">
                              {[immeuble.ville, immeuble.proprietaire || t('properties.notAssigned')].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                        </button>
                        <div className="flex-[1_1_190px] min-w-0 flex items-center gap-3">
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <div className="h-2 rounded-full bg-base-200 dark:bg-base-300 overflow-hidden" aria-hidden="true">
                              <div className={`h-full rounded-full ${pct >= 80 ? 'bg-emerald-600' : pct >= 50 ? 'bg-orange-500' : 'bg-orange-700'}`} style={{ width: `${Math.max(pct, totalLots ? 2 : 0)}%` }} />
                            </div>
                            <span className="block text-sm text-base-content/80 tabular-nums">{t('properties.lotsOccupiedOf', { occupied, total: totalLots })}</span>
                          </div>
                          <span className={`shrink-0 min-w-[78px] text-center px-2.5 py-1.5 rounded-full text-xs font-bold tabular-nums ${
                            totalLots === 0 ? 'bg-base-200 text-base-content/80' : free > 0 ? FREE_PILL : FULL_PILL}`}>
                            {totalLots === 0 ? t('properties.noLotYet') : free > 0 ? t('properties.freeCount', { count: free }) : t('properties.full')}
                          </span>
                        </div>
                        <div className="flex gap-1.5">
                          <button type="button" onClick={() => selectBuilding(immeuble)} className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px]`}>{t('properties.open')}</button>
                          <RowMenu
                            label={t('properties.moreActions')}
                            items={[
                              { label: t('properties.viewDetail'), onSelect: () => b.setDetailImmeuble(immeuble) },
                              { label: t('properties.openGallery'), onSelect: () => { b.setGallerySelectedBuilding(immeuble); b.setShowGalleryModal(true); } },
                              ...(b.canWrite ? [
                                { label: t('common.edit'), onSelect: () => editImmeuble(immeuble) },
                                { label: t('common.delete'), onSelect: () => b.handleDeleteImmeuble(immeuble.id), danger: true },
                              ] : []),
                            ]}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            ) : (
              (b.paginatedData as Lot[]).length === 0 ? (
                <div className="text-center py-12 text-base-content/70">
                  <Home size={40} className="mx-auto mb-3 opacity-50" aria-hidden="true" />
                  <p className="font-medium">{t('properties.noLotsFound')}</p>
                </div>
              ) : (
                <ul className="divide-y divide-base-300/70">
                  {(b.paginatedData as Lot[]).map(lot => {
                    const s = getLotStatut(lot.statut);
                    const isFree = lotInGroup(lot, 'free');
                    const isSale = lot.type === 'Vente' || !!lot.prix_vente;
                    const tenant = b.tenantByLot.get(lot.id);
                    return (
                      <li key={lot.id} className="flex flex-wrap items-center gap-x-5 gap-y-3 px-4 @xl:px-5 py-3.5 hover:bg-base-200/60 transition-colors">
                        <button
                          type="button"
                          onClick={() => b.setDetailLot(lot)}
                          aria-label={t('properties.openItem', { name: lot.reference })}
                          className="flex-[1_1_240px] min-w-0 text-left rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          <span className="block text-[15px] font-bold text-base-content break-words">{lot.reference}</span>
                          <span className="block text-sm text-base-content/70 break-words">{[lot.type, lot.immeuble].filter(Boolean).join(' · ')}</span>
                        </button>
                        <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-bold ${statusPillClass(lot.statut)}`}>{t(s.labelKey)}</span>
                        <span className="flex-[0_0_150px] text-sm font-semibold text-base-content tabular-nums">
                          {isSale
                            ? <>{lot.prix_vente?.toLocaleString('fr-FR')} FCFA <span className="text-xs font-medium text-base-content/70">({t('properties.sale')})</span></>
                            : <>{lot.loyer?.toLocaleString('fr-FR')} <span className="text-xs font-medium text-base-content/70">{t('properties.perMonthShort')}</span></>}
                        </span>
                        <span className="flex-[1_1_160px] min-w-0 text-sm text-base-content/80 break-words">{tenant || t('properties.noTenant')}</span>
                        <div className="flex gap-1.5">
                          {b.canWrite && isFree && (
                            <Button variant="primary" size="sm" className="h-10 px-3.5" title={t('properties.assign')} onClick={() => assignLot(lot)}>
                              <UserPlus size={14} className="mr-1.5" aria-hidden="true" /> {t('properties.assignShort')}
                            </Button>
                          )}
                          <RowMenu
                            label={t('properties.moreActions')}
                            items={[
                              { label: t('properties.viewDetail'), onSelect: () => b.setDetailLot(lot) },
                              ...(b.canWrite ? [
                                { label: t('common.edit'), onSelect: () => editLot(lot) },
                                { label: t('common.delete'), onSelect: () => b.handleDeleteLot(lot.id), danger: true },
                              ] : []),
                            ]}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )
            )}

            {/* Pagination : position + Précédent / Suivant */}
            {total > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 @xl:px-5 py-3.5 border-t border-base-300/70 text-sm text-base-content/70">
                <span className="tabular-nums">
                  {isImm ? t('properties.rangeInfoBuildings', { from, to, total }) : t('properties.rangeInfoLots', { from, to, total })}
                </span>
                {b.totalPages > 1 && (
                  <div className="flex gap-1.5">
                    <button type="button" onClick={() => b.setCurrentPage(p => Math.max(1, p - 1))} disabled={b.currentPage === 1} className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed`}>
                      <ChevronLeft size={16} aria-hidden="true" /> {t('properties.previous')}
                    </button>
                    <button type="button" onClick={() => b.setCurrentPage(p => Math.min(b.totalPages, p + 1))} disabled={b.currentPage === b.totalPages} className={`${OUTLINE_BTN} h-10 px-3.5 text-[13px] disabled:opacity-40 disabled:cursor-not-allowed`}>
                      {t('properties.next')} <ChevronRight size={16} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Panneau de détail : l'immeuble et SES lots, sans changer de page ni d'onglet */}
          {isImm && selected && !panelDismissed && (
            <BuildingPanel
              ref={panelRef}
              immeuble={selected}
              lots={b.lots.filter(l => l.building_id === selected.id)}
              canWrite={b.canWrite}
              onClose={() => setPanelDismissed(true)}
              onGallery={() => { b.setGallerySelectedBuilding(selected); b.setShowGalleryModal(true); }}
              onAddLot={() => addLotTo(selected)}
              onOpenLot={lot => b.setDetailLot(lot)}
              onFullSheet={() => b.setDetailImmeuble(selected)}
              onEdit={() => editImmeuble(selected)}
            />
          )}
        </div>
      )}

      {/* Modals */}
      <ImmeubleDetailModal
        immeuble={b.detailImmeuble}
        lots={b.lots}
        canWrite={b.canWrite}
        onClose={() => b.setDetailImmeuble(null)}
        onEdit={() => { b.setEditingImmeuble(b.detailImmeuble!); b.setDetailImmeuble(null); b.setFormView('immeuble'); }}
        onGallery={() => { b.setGallerySelectedBuilding(b.detailImmeuble); b.setShowGalleryModal(true); }}
      />

      <LotDetailModal
        lot={b.detailLot}
        locations={b.locations}
        canWrite={b.canWrite}
        onClose={() => b.setDetailLot(null)}
        onEdit={() => { b.setEditingLot(b.detailLot!); b.setDetailLot(null); b.setFormView('lot'); }}
        onAssign={() => { b.setActiveAssignmentLot(b.detailLot!); b.setEditingLot(b.detailLot!); b.setDetailLot(null); b.setFormView('assignment'); }}
      />

      {/* Gallery modal */}
      <Modal
        isOpen={b.showGalleryModal}
        onClose={() => b.setShowGalleryModal(false)}
        title={t('properties.galleryTitle', { name: b.gallerySelectedBuilding?.nom })}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {b.gallerySelectedBuilding?.photos?.length ? (
              b.gallerySelectedBuilding.photos.map((url, idx) => (
                <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-base-200 shadow-sm hover:shadow-md transition-shadow">
                  <img src={url} alt={`${t('properties.photo')} ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-base-content/50">
                <p>{t('properties.noPhotos')}</p>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => b.setShowGalleryModal(false)}>{t('common.close')}</Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={b.confirmConfig.isOpen}
        onClose={b.closeConfirm}
        onConfirm={() => { b.confirmConfig.action(); b.closeConfirm(); }}
        title={b.confirmConfig.title}
        message={b.confirmConfig.message}
        type={b.confirmConfig.type}
      />
    </motion.div>
  );
};

export default Biens;
