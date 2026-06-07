// frontend/src/hooks/useBiens.ts
// Encapsule tout le state, les effets, les filtres et les handlers du module Biens.
// Biens.tsx ne fait que rendre le JSX.

import { useState, useEffect, useMemo, useCallback } from 'react';
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

// ── Filter configurations (static, defined outside hook) ─────────────────────

export const IMMEUBLE_FILTERS: FilterConfig[] = [
  {
    id: 'type', type: 'select', label: 'Type',
    options: [
      { value: 'Immeuble', label: 'Immeuble' }, { value: 'Résidence', label: 'Résidence' },
      { value: 'Villa', label: 'Villa' }, { value: 'Maison', label: 'Maison' },
      { value: 'Commerce', label: 'Commerce' },
    ]
  },
  { id: 'ville', type: 'select', label: 'Ville', options: [] },
  {
    id: 'statut', type: 'select', label: 'Statut',
    options: [{ value: 'actif', label: 'Actif' }, { value: 'inactif', label: 'Inactif' }]
  }
];

export const LOT_FILTERS: FilterConfig[] = [
  {
    id: 'type', type: 'select', label: 'Type',
    options: [
      { value: 'Appartement', label: 'Appartement' }, { value: 'Studio', label: 'Studio' },
      { value: 'Chambre', label: 'Chambre' }, { value: 'Boutique', label: 'Boutique' },
      { value: 'Bureau', label: 'Bureau' },
    ]
  },
  {
    id: 'statut', type: 'select', label: 'Statut',
    options: [
      { value: 'libre', label: 'Libre' }, { value: 'loue', label: 'Loué' },
      { value: 'reserve', label: 'Réservé' }, { value: 'vendu', label: 'Vendu' },
      { value: 'hors_service', label: 'Hors service' },
    ]
  },
  { id: 'loyer', type: 'range', label: 'Loyer (FCFA)', min: 0, max: 500000 }
];

// ── Default editing states ────────────────────────────────────────────────────

const DEFAULT_IMMEUBLE: Partial<Immeuble> = {
  nom: '', type: 'Immeuble', adresse: '', ville: '', pays: 'Bénin', description: '', owner_id: 0, photo: ''
};

const DEFAULT_LOT: Partial<Lot> = {
  reference: '', type: 'Appartement', building_id: 0, etage: '', superficie: 0, nbPieces: 1, loyer: 0, charges: 0, description: ''
};

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
  const canWrite = !['proprietaire', 'locataire'].includes(user?.userType || '');

  // ── Data ──────────────────────────────────────────────────────────────────
  const [immeubles, setImmeubles] = useState<Immeuble[]>([]);
  const [lots, setLots]           = useState<Lot[]>([]);
  const [locations, setLocations] = useState<BailLocation[]>([]);
  const [proprietaires, setProprietaires] = useState<Proprietaire[]>([]);
  const [users, setUsers]         = useState<Utilisateur[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [success, setSuccess]     = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  // ── Search / filter / pagination ──────────────────────────────────────────
  const [searchQuery, setSearchQuery]   = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [currentPage, setCurrentPage]   = useState(1);

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
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterValues, activeTab]);

  // ── Filtered data ─────────────────────────────────────────────────────────

  const filteredImmeubles = useMemo(() => {
    return immeubles.filter(immeuble => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = immeuble.nom?.toLowerCase().includes(q) ||
          immeuble.adresse?.toLowerCase().includes(q) ||
          immeuble.ville?.toLowerCase().includes(q) ||
          immeuble.type?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filterValues.type   && immeuble.type   !== filterValues.type)   return false;
      if (filterValues.ville  && immeuble.ville  !== filterValues.ville)  return false;
      if (filterValues.statut && immeuble.statut !== filterValues.statut) return false;
      return true;
    });
  }, [immeubles, searchQuery, filterValues]);

  const filteredLots = useMemo(() => {
    return lots.filter(lot => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const match = lot.reference?.toLowerCase().includes(q) ||
          lot.immeuble?.toLowerCase().includes(q) ||
          lot.type?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filterValues.type   && lot.type   !== filterValues.type)   return false;
      if (filterValues.statut && lot.statut !== filterValues.statut) return false;
      if (filterValues.loyer) {
        const range = filterValues.loyer as { min?: number; max?: number };
        if (range.min !== undefined && lot.loyer < range.min) return false;
        if (range.max !== undefined && lot.loyer > range.max) return false;
      }
      return true;
    });
  }, [lots, searchQuery, filterValues]);

  const currentData  = activeTab === 'immeubles' ? filteredImmeubles : filteredLots;
  const totalPages   = Math.ceil(currentData.length / ITEMS_PER_PAGE);
  const paginatedData = currentData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Dynamically populate city filter options from loaded data
  const dynamicImmeubleFilters = useMemo(() => {
    const cities = [...new Set(immeubles.map(i => i.ville).filter(Boolean))];
    return IMMEUBLE_FILTERS.map(f =>
      f.id === 'ville' ? { ...f, options: cities.map(c => ({ value: c, label: c })) } : f
    );
  }, [immeubles]);

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
      if (!dataToSave.owner_id) throw new Error('Veuillez sélectionner un propriétaire');
      const finalData = {
        ...dataToSave,
        owner_id: Number(dataToSave.owner_id),
        nombre_etages: Number(dataToSave.nombre_etages || 1),
      };
      const saved = await saveImmeuble(finalData);
      setSuccess('Immeuble enregistré avec succès');
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
      title: 'Supprimer cet immeuble',
      message: 'Voulez-vous vraiment supprimer cet immeuble ? Tous les lots associés pourraient être impactés. Cette action est irréversible.',
      type: 'danger',
      action: async () => {
        try { await deleteImmeuble(id); setSuccess('Immeuble supprimé'); fetchData(); }
        catch (err: any) { setError(err.message); }
      },
    });
  };

  const handleDeleteLot = (id: number) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Supprimer ce lot',
      message: 'Voulez-vous vraiment supprimer ce lot ? Cette action est irréversible.',
      type: 'danger',
      action: async () => {
        try { await deleteLot(id); setSuccess('Lot supprimé'); fetchData(); }
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
    loading, error, setError, success, setSuccess, subscriptionStatus, isLimitReached,

    // ── Search / filter / pagination
    searchQuery, setSearchQuery,
    filterValues, setFilterValues,
    currentPage, setCurrentPage,
    totalPages, paginatedData, currentData,

    // ── Filtered
    filteredImmeubles, filteredLots,
    dynamicImmeubleFilters,

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
