// frontend/src/hooks/useBiens.ts
// Encapsule tout le state, les effets, les filtres et les handlers du module Biens.
// Biens.tsx ne fait que rendre le JSX.

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUser } from '../contexts/UserContext';
import { getImmeubles, getLots, saveImmeuble, saveLot, deleteImmeuble, deleteLot } from '../api/bienApi';
import { getSubscriptionStatus } from '../api/subscriptionApi';
import type { Immeuble, Lot } from '../api/bienApi';
import { locationApi } from '../api/locationApi';
import type { Location as BailLocation } from '../api/locationApi';
import type { SubscriptionStatus } from '../api/subscriptionApi';
import { getProprietaires, accountApi } from '../api/accountApi';
import type { Proprietaire, Utilisateur } from '../api/accountApi';
import type { FilterConfig, FilterValues } from '../components/ui/FilterPanel';
import { ITEMS_PER_PAGE } from '../utils/bienUtils';

// Note : les filtres (labels traduisibles) sont construits dans le hook via t().

// ── Default editing states ────────────────────────────────────────────────────

const DEFAULT_IMMEUBLE: Partial<Immeuble> = {
  nom: '', type: 'Immeuble', adresse: '', ville: '', pays: 'Bénin', description: '', owner_id: 0, photo: ''
};

const DEFAULT_LOT: Partial<Lot> = {
  reference: '', type: 'Appartement', building_id: 0, etage: '', superficie: 0, nbPieces: 1, loyer: 0, charges: 0, description: ''
};

// ── Filtre rapide par statut et tri (refonte T-060) ──────────────────────────
// Les statuts existent sous plusieurs graphies selon l'ancienneté des données
// (« libre »/« disponible », « loue »/« occupe »/« occupé ») : on raisonne par groupe.
export type StatusGroup = 'all' | 'free' | 'rented' | 'reserved';
export type SortKey = 'free' | 'name' | 'recent';

export const STATUS_GROUPS: Record<Exclude<StatusGroup, 'all'>, string[]> = {
  free:     ['disponible', 'libre'],
  rented:   ['occupe', 'occupé', 'loue', 'loué'],
  reserved: ['reserve', 'réservé'],
};

export const lotInGroup = (lot: Lot, group: StatusGroup) =>
  group === 'all' || STATUS_GROUPS[group].includes(lot.statut?.toLowerCase() ?? '');

// ── ConfirmConfig type ────────────────────────────────────────────────────────

export interface ConfirmConfig {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'info';
  action: () => Promise<void>;
}

const DEFAULT_CONFIRM: ConfirmConfig = {
  isOpen: false, title: '', message: '', type: 'danger', action: async () => {}
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useBiens() {
  const { user } = useUser();
  const { t } = useTranslation();
  const canWrite = !['proprietaire', 'locataire'].includes(user?.userType || '');

  // ── Filtres (labels traduits) ─────────────────────────────────────────────
  const immeubleFilters: FilterConfig[] = useMemo(() => [
    {
      id: 'type', type: 'select', label: t('properties.filters.type'),
      options: [
        { value: 'Immeuble', label: t('properties.filters.bt_immeuble') }, { value: 'Résidence', label: t('properties.filters.bt_residence') },
        { value: 'Villa', label: t('properties.filters.bt_villa') }, { value: 'Maison', label: t('properties.filters.bt_maison') },
        { value: 'Commerce', label: t('properties.filters.bt_commerce') },
      ]
    },
    { id: 'ville', type: 'select', label: t('properties.filters.city'), options: [] },
    {
      id: 'statut', type: 'select', label: t('common.status'),
      options: [{ value: 'actif', label: t('properties.filters.actif') }, { value: 'inactif', label: t('properties.filters.inactif') }]
    }
  ], [t]);

  const lotFilters: FilterConfig[] = useMemo(() => [
    {
      id: 'type', type: 'select', label: t('properties.filters.type'),
      options: [
        { value: 'Appartement', label: t('properties.filters.lt_appartement') }, { value: 'Studio', label: t('properties.filters.lt_studio') },
        { value: 'Chambre', label: t('properties.filters.lt_chambre') }, { value: 'Boutique', label: t('properties.filters.lt_boutique') },
        { value: 'Bureau', label: t('properties.filters.lt_bureau') },
      ]
    },
    {
      id: 'statut', type: 'select', label: t('common.status'),
      options: [
        { value: 'disponible', label: t('properties.status.libre') }, { value: 'occupe', label: t('properties.status.loue') },
        { value: 'reserve', label: t('properties.status.reserve') }, { value: 'vendu', label: t('properties.status.vendu') },
        { value: 'hors_service', label: t('properties.status.hors_service') },
      ]
    },
    { id: 'loyer', type: 'range', label: t('properties.filters.rent'), min: 0, max: 500000 }
  ], [t]);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [immeubles, setImmeubles] = useState<Immeuble[]>([]);
  const [lots, setLots]           = useState<Lot[]>([]);
  const [locations, setLocations] = useState<BailLocation[]>([]);
  const [proprietaires, setProprietaires] = useState<Proprietaire[]>([]);
  const [users, setUsers]         = useState<Utilisateur[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  // Échec du chargement initial, distinct de `error` (erreurs d'actions) : la page
  // affiche alors un état d'erreur à la place de « Aucun immeuble trouvé » (T-042).
  const [loadError, setLoadError] = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  // ── Search / filter / pagination ──────────────────────────────────────────
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [currentPage, setCurrentPage]   = useState(1);
  const [statusGroup, setStatusGroup]   = useState<StatusGroup>('all');
  const [sortKey, setSortKey]           = useState<SortKey>('free');

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState<'immeubles' | 'lots'>('immeubles');
  const [viewMode, setViewMode]         = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters]   = useState(false);
  const [formView, setFormView]         = useState<null | 'immeuble' | 'lot' | 'assignment'>(null);

  // ── Editing state ─────────────────────────────────────────────────────────
  const [editingImmeuble, setEditingImmeuble] = useState<Partial<Immeuble>>(DEFAULT_IMMEUBLE);
  const [editingLot, setEditingLot]           = useState<Partial<Lot>>(DEFAULT_LOT);
  const [activeAssignmentLot, setActiveAssignmentLot] = useState<Lot | null>(null);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [gallerySelectedBuilding, setGallerySelectedBuilding] = useState<Immeuble | null>(null);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [detailImmeuble, setDetailImmeuble]     = useState<Immeuble | null>(null);
  const [detailLot, setDetailLot]               = useState<Lot | null>(null);
  const [confirmConfig, setConfirmConfig]       = useState<ConfirmConfig>(DEFAULT_CONFIRM);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [immeublesData, lotsData, locationsData, propsData, usersData, subStatus] = await Promise.all([
        getImmeubles(),
        getLots(),
        locationApi.getLocations().catch(() => [] as BailLocation[]),
        getProprietaires(),
        accountApi.getUsers(),
        getSubscriptionStatus().catch(err => { console.error('Erreur chargement abonnement', err); return null; }),
      ]);
      setImmeubles(immeublesData);
      setLots(lotsData);
      setLocations(locationsData);
      setProprietaires(propsData);
      setUsers(usersData);
      if (subStatus) setSubscriptionStatus(subStatus);
    } catch (err: any) {
      console.error(err);
      setLoadError(err.message || t('properties.loadDataError'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterValues, activeTab, statusGroup, sortKey]);

  // ── Filtered data ─────────────────────────────────────────────────────────

  const filteredImmeubles = useMemo(() => {
    return immeubles.filter(immeuble => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = immeuble.nom?.toLowerCase().includes(q) ||
          immeuble.adresse?.toLowerCase().includes(q) ||
          immeuble.ville?.toLowerCase().includes(q) ||
          immeuble.type?.toLowerCase().includes(q) ||
          immeuble.proprietaire?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filterValues.type   && immeuble.type   !== filterValues.type)   return false;
      if (filterValues.ville  && immeuble.ville  !== filterValues.ville)  return false;
      if (filterValues.statut && immeuble.statut !== filterValues.statut) return false;
      return true;
    });
  }, [immeubles, searchQuery, filterValues]);

  // Locataire en place par lot (bail actif ou signé) : affiché dans la liste et cherchable
  const tenantByLot = useMemo(() => {
    const m = new Map<number, string>();
    locations.forEach(l => {
      if (['actif', 'signe'].includes(l.statut) && (l.locataire_nom || l.locataire_prenoms)) {
        m.set(l.lot_id, [l.locataire_prenoms, l.locataire_nom].filter(Boolean).join(' '));
      }
    });
    return m;
  }, [locations]);

  const filteredLots = useMemo(() => {
    return lots.filter(lot => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = lot.reference?.toLowerCase().includes(q) ||
          lot.immeuble?.toLowerCase().includes(q) ||
          lot.type?.toLowerCase().includes(q) ||
          tenantByLot.get(lot.id)?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filterValues.type   && lot.type   !== filterValues.type)   return false;
      if (filterValues.statut && lot.statut !== filterValues.statut) return false;
      if (!lotInGroup(lot, statusGroup)) return false;
      if (filterValues.loyer) {
        const range = filterValues.loyer as { min?: number; max?: number };
        if (range.min !== undefined && lot.loyer < range.min) return false;
        if (range.max !== undefined && lot.loyer > range.max) return false;
      }
      return true;
    });
  }, [lots, searchQuery, filterValues, statusGroup, tenantByLot]);

  // Lots libres par immeuble : sert au tri « libres d'abord » et à l'affichage des lignes
  const freeLotsByBuilding = useMemo(() => {
    const m = new Map<number, number>();
    lots.forEach(l => {
      if (l.building_id != null && lotInGroup(l, 'free')) m.set(l.building_id, (m.get(l.building_id) ?? 0) + 1);
    });
    return m;
  }, [lots]);

  // Tri appliqué après filtrage, avant pagination. « Plus récents » = id décroissant (ids séquentiels).
  const sortedImmeubles = useMemo(() => {
    const arr = [...filteredImmeubles];
    if (sortKey === 'name') arr.sort((a, b) => (a.nom ?? '').localeCompare(b.nom ?? '', 'fr'));
    else if (sortKey === 'recent') arr.sort((a, b) => b.id - a.id);
    else arr.sort((a, b) => (freeLotsByBuilding.get(b.id) ?? 0) - (freeLotsByBuilding.get(a.id) ?? 0) || (a.nom ?? '').localeCompare(b.nom ?? '', 'fr'));
    return arr;
  }, [filteredImmeubles, sortKey, freeLotsByBuilding]);

  const sortedLots = useMemo(() => {
    const arr = [...filteredLots];
    if (sortKey === 'name') arr.sort((a, b) => (a.reference ?? '').localeCompare(b.reference ?? '', 'fr', { numeric: true }));
    else if (sortKey === 'recent') arr.sort((a, b) => b.id - a.id);
    else arr.sort((a, b) => Number(lotInGroup(b, 'free')) - Number(lotInGroup(a, 'free')) || (a.reference ?? '').localeCompare(b.reference ?? '', 'fr', { numeric: true }));
    return arr;
  }, [filteredLots, sortKey]);

  // Compteurs des filtres rapides (sur tous les lots, indépendamment de la recherche)
  const statusCounts = useMemo(() => ({
    all: lots.length,
    free: lots.filter(l => lotInGroup(l, 'free')).length,
    rented: lots.filter(l => lotInGroup(l, 'rented')).length,
    reserved: lots.filter(l => lotInGroup(l, 'reserved')).length,
  }), [lots]);

  const currentData  = activeTab === 'immeubles' ? sortedImmeubles : sortedLots;
  const totalPages   = Math.ceil(currentData.length / ITEMS_PER_PAGE);
  const paginatedData = currentData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Dynamically populate city filter options from loaded data
  const dynamicImmeubleFilters = useMemo(() => {
    const cities = [...new Set(immeubles.map(i => i.ville).filter(Boolean))];
    return immeubleFilters.map(f =>
      f.id === 'ville' ? { ...f, options: cities.map(c => ({ value: c, label: c })) } : f
    );
  }, [immeubles, immeubleFilters]);

  // ── Subscription limit check ──────────────────────────────────────────────

  const isLimitReached = Boolean(
    subscriptionStatus &&
    subscriptionStatus.plan.max_properties !== -1 &&
    (subscriptionStatus.usage?.current_properties ?? 0) >= subscriptionStatus.plan.max_properties
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveImmeuble = async (data?: Partial<Immeuble>): Promise<Immeuble | undefined> => {
    const dataToSave = data || editingImmeuble;
    try {
      setError(null);
      if (!dataToSave.owner_id) throw new Error(t('properties.selectOwner'));
      const finalData = {
        ...dataToSave,
        owner_id: Number(dataToSave.owner_id),
        nombre_etages: Number(dataToSave.nombre_etages || 1),
      };
      const saved = await saveImmeuble(finalData);
      setSuccess(t('properties.buildingSaved'));
      setEditingImmeuble(DEFAULT_IMMEUBLE);
      fetchData();
      return saved;
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      return undefined;
    }
  };

  const handleDeleteImmeuble = (id: number) => {
    setConfirmConfig({
      isOpen: true,
      title: t('properties.deleteBuildingTitle'),
      message: t('properties.deleteBuildingMsg'),
      type: 'danger',
      action: async () => {
        try { await deleteImmeuble(id); setSuccess(t('properties.buildingDeleted')); fetchData(); }
        catch (err: any) { setError(err.message); }
      },
    });
  };

  const handleDeleteLot = (id: number) => {
    setConfirmConfig({
      isOpen: true,
      title: t('properties.deleteLotTitle'),
      message: t('properties.deleteLotMsg'),
      type: 'danger',
      action: async () => {
        try { await deleteLot(id); setSuccess(t('properties.lotDeleted')); fetchData(); }
        catch (err: any) { setError(err.message); }
      },
    });
  };

  // ── Editing helpers ───────────────────────────────────────────────────────

  const openNewImmeuble = () => {
    setEditingImmeuble(DEFAULT_IMMEUBLE);
    setFormView('immeuble');
  };

  const openNewLot = () => {
    setEditingLot(DEFAULT_LOT);
    setFormView('lot');
  };

  const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

  return {
    // ── Data
    canWrite, immeubles, lots, locations, proprietaires, users,
    loading, loadError, error, setError, success, setSuccess, subscriptionStatus, isLimitReached,

    // ── Search / filter / pagination
    searchQuery, setSearchQuery,
    filterValues, setFilterValues,
    currentPage, setCurrentPage,
    totalPages, paginatedData, currentData,

    // ── Filtered
    filteredImmeubles, filteredLots,
    statusGroup, setStatusGroup, statusCounts,
    sortKey, setSortKey,
    freeLotsByBuilding, tenantByLot,
    dynamicImmeubleFilters, lotFilters,

    // ── UI
    activeTab, setActiveTab,
    viewMode, setViewMode,
    showFilters, setShowFilters,
    formView, setFormView,

    // ── Editing
    editingImmeuble, setEditingImmeuble,
    editingLot, setEditingLot,
    activeAssignmentLot, setActiveAssignmentLot,
    openNewImmeuble, openNewLot,

    // ── Modals
    gallerySelectedBuilding, setGallerySelectedBuilding,
    showGalleryModal, setShowGalleryModal,
    detailImmeuble, setDetailImmeuble,
    detailLot, setDetailLot,
    confirmConfig, closeConfirm,

    // ── Handlers
    fetchData,
    handleSaveImmeuble,
    handleDeleteImmeuble,
    handleDeleteLot,
  };
}
