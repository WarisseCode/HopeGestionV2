// frontend/src/pages/Biens.tsx
// Version améliorée avec recherche fonctionnelle, filtres, pagination et skeleton loaders
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Building2, 
  Home, 
  Plus, 
  Edit3, 
  Trash2, 
  MapPin,
  ArrowRight,
  LayoutGrid,
  List,
  X,
  ChevronLeft,
  ChevronRight,
  UserPlus
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Alert from '../components/ui/Alert';
import Modal from '../components/ui/Modal';
import SearchInput from '../components/ui/SearchInput';
import FilterPanel from '../components/ui/FilterPanel';
import type { FilterConfig, FilterValues } from '../components/ui/FilterPanel';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import ImmeubleForm from '../components/biens/ImmeubleForm';
import LotForm from '../components/biens/LotForm';
import { motion, AnimatePresence } from 'framer-motion';
import { getImmeubles, getLots, saveImmeuble, saveLot, deleteImmeuble, deleteLot } from '../api/bienApi';
import { getSubscriptionStatus } from '../api/subscriptionApi';
import type { Immeuble, Lot } from '../api/bienApi';
import type { SubscriptionStatus } from '../api/subscriptionApi';
import { getProprietaires, accountApi } from '../api/accountApi';
import type { Proprietaire, Utilisateur } from '../api/accountApi';
import AssignmentForm from '../components/biens/AssignmentForm';
import toast from 'react-hot-toast';


// Constants
const ITEMS_PER_PAGE = 9;

// Placeholder images from Unsplash for properties without photos
const PLACEHOLDER_IMAGES = [
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80', // Apartment building
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=400&q=80', // Modern house
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=400&q=80', // Luxury villa
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&q=80', // Villa pool
  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=400&q=80', // Classic house
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400&q=80', // Modern architecture
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80', // White house
  'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=400&q=80', // Facade
];

const getPlaceholderImage = (id: number): string => {
  // Use building ID to get consistent image per building
  const index = id % PLACEHOLDER_IMAGES.length;
  return PLACEHOLDER_IMAGES[index];
};

const Biens: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'immeubles' | 'lots'>('immeubles');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Data states
  const [immeubles, setImmeubles] = useState<Immeuble[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [proprietaires, setProprietaires] = useState<Proprietaire[]>([]);
  const [users, setUsers] = useState<Utilisateur[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);

  // Search & Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [showImmeubleModal, setShowImmeubleModal] = useState(false);
  const [showLotModal, setShowLotModal] = useState(false);
  const [editingImmeuble, setEditingImmeuble] = useState<Partial<Immeuble>>({
    nom: '', type: 'Immeuble', adresse: '', ville: '', pays: 'Bénin', description: '', owner_id: 0, photo: ''
  });
  const [editingLot, setEditingLot] = useState<Partial<Lot>>({
    reference: '', type: 'Appartement', building_id: 0, etage: '', superficie: 0, nbPieces: 1, loyer: 0, charges: 0, description: ''
  });
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [activeAssignmentLot, setActiveAssignmentLot] = useState<Lot | null>(null);

  // Gallery state
  const [gallerySelectedBuilding, setGallerySelectedBuilding] = useState<Immeuble | null>(null);
  const [showGalleryModal, setShowGalleryModal] = useState(false);

  // Filter configurations
  const immeubleFilters: FilterConfig[] = [
    {
      id: 'type',
      type: 'select',
      label: 'Type',
      options: [
        { value: 'Immeuble', label: 'Immeuble' },
        { value: 'Résidence', label: 'Résidence' },
        { value: 'Villa', label: 'Villa' },
        { value: 'Maison', label: 'Maison' },
        { value: 'Commerce', label: 'Commerce' },
      ]
    },
    {
      id: 'ville',
      type: 'select',
      label: 'Ville',
      options: [] // Will be dynamically populated
    },
    {
      id: 'statut',
      type: 'select',
      label: 'Statut',
      options: [
        { value: 'Actif', label: 'Actif' },
        { value: 'Inactif', label: 'Inactif' },
      ]
    }
  ];

  const lotFilters: FilterConfig[] = [
    {
      id: 'type',
      type: 'select',
      label: 'Type',
      options: [
        { value: 'Appartement', label: 'Appartement' },
        { value: 'Studio', label: 'Studio' },
        { value: 'Chambre', label: 'Chambre' },
        { value: 'Boutique', label: 'Boutique' },
        { value: 'Bureau', label: 'Bureau' },
      ]
    },
    {
      id: 'statut',
      type: 'select',
      label: 'Statut',
      options: [
        { value: 'libre', label: 'Libre' },
        { value: 'occupe', label: 'Occupé' },
        { value: 'reserve', label: 'Réservé' },
      ]
    },
    {
      id: 'loyer',
      type: 'range',
      label: 'Loyer (FCFA)',
      min: 0,
      max: 500000
    }
  ];

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [immeublesData, lotsData, propsData, usersData, subStatus] = await Promise.all([
        getImmeubles(),
        getLots(),
        getProprietaires(),
        accountApi.getUsers(),
        getSubscriptionStatus().catch(err => {
            console.error("Erreur chargement abonnement", err);
            return null;
        })
      ]);
      setImmeubles(immeublesData);
      setLots(lotsData);
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterValues, activeTab]);

  // Filtered data
  const filteredImmeubles = useMemo(() => {
    return immeubles.filter(immeuble => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          immeuble.nom?.toLowerCase().includes(query) ||
          immeuble.adresse?.toLowerCase().includes(query) ||
          immeuble.ville?.toLowerCase().includes(query) ||
          immeuble.type?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Filters
      if (filterValues.type && immeuble.type !== filterValues.type) return false;
      if (filterValues.ville && immeuble.ville !== filterValues.ville) return false;
      if (filterValues.statut && immeuble.statut !== filterValues.statut) return false;
      
      return true;
    });
  }, [immeubles, searchQuery, filterValues]);

  const filteredLots = useMemo(() => {
    return lots.filter(lot => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          lot.reference?.toLowerCase().includes(query) ||
          lot.immeuble?.toLowerCase().includes(query) ||
          lot.type?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Filters
      if (filterValues.type && lot.type !== filterValues.type) return false;
      if (filterValues.statut && lot.statut !== filterValues.statut) return false;
      if (filterValues.loyer) {
        const range = filterValues.loyer as { min?: number; max?: number };
        if (range.min !== undefined && lot.loyer < range.min) return false;
        if (range.max !== undefined && lot.loyer > range.max) return false;
      }
      
      return true;
    });
  }, [lots, searchQuery, filterValues]);

  // Pagination
  const currentData = activeTab === 'immeubles' ? filteredImmeubles : filteredLots;
  const totalPages = Math.ceil(currentData.length / ITEMS_PER_PAGE);
  const paginatedData = currentData.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Handlers
  const handleSaveImmeuble = async (data?: Partial<Immeuble>) => {
    const dataToSave = data || editingImmeuble;
    
    try {
      setError(null);
      if (!dataToSave.owner_id) {
        throw new Error('Veuillez sélectionner un propriétaire');
      }
      
      // Ensure numeric fields are numbers
      const finalData = {
        ...dataToSave,
        owner_id: Number(dataToSave.owner_id),
        nombre_etages: Number(dataToSave.nombre_etages || 1)
      };

      const savedImmeuble = await saveImmeuble(finalData);
      setSuccess('Immeuble enregistré avec succès');
      setShowImmeubleModal(false);
      setEditingImmeuble({ nom: '', type: 'Immeuble', adresse: '', ville: '', pays: 'Bénin', description: '', owner_id: 0, photo: '' });
      fetchData();
      return savedImmeuble;
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      return undefined;
    }
  };



  const handleDeleteImmeuble = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cet immeuble ?')) return;
    try {
      await deleteImmeuble(id);
      setSuccess('Immeuble supprimé');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteLot = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce lot ?')) return;
    try {
      await deleteLot(id);
      setSuccess('Lot supprimé');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // Skeleton loader for grid
  const GridSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="bg-base-100 rounded-2xl shadow-lg border border-base-200 overflow-hidden animate-pulse">
          <SkeletonLoader variant="rectangular" height={192} />
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <SkeletonLoader variant="rectangular" height={60} className="rounded-xl" />
              <SkeletonLoader variant="rectangular" height={60} className="rounded-xl" />
            </div>
            <SkeletonLoader variant="text" width="60%" />
          </div>
        </div>
      ))}
    </div>
  );

  // Skeleton loader for table
  const TableSkeleton = () => (
    <Card className="border-none shadow-xl bg-base-100 overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead className="bg-base-200/50">
            <tr>
              {['Référence', 'Type', 'Immeuble', 'Loyer', 'Statut', 'Actions'].map(h => (
                <th key={h} className="py-4 text-xs uppercase font-bold text-gray-400">
                  <SkeletonLoader variant="text" width={80} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map(i => (
              <tr key={i} className="border-b border-base-200">
                {[1, 2, 3, 4, 5, 6].map(j => (
                  <td key={j} className="py-4">
                    <SkeletonLoader variant="text" width={j === 6 ? 60 : 100} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );

  // Dynamically populate city filter options
  const dynamicImmeubleFilters = useMemo(() => {
    const cities = [...new Set(immeubles.map(i => i.ville).filter(Boolean))];
    return immeubleFilters.map(f => 
      f.id === 'ville' 
        ? { ...f, options: cities.map(c => ({ value: c, label: c })) }
        : f
    );
  }, [immeubles, immeubleFilters]);

  return (
    <motion.div 
      className="p-6 md:p-8 space-y-6 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
            Parc Immobilier <span className="text-primary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">
            Gérez vos immeubles, lots et disponibilités.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput 
            placeholder="Rechercher un bien..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-64"
          />
          {(() => {
            const isLimitReached = Boolean(subscriptionStatus && 
              subscriptionStatus.plan.max_properties !== -1 && 
              (subscriptionStatus.usage?.current_properties ?? 0) >= subscriptionStatus.plan.max_properties);

            return (
              <div 
                className="relative group"
                title={isLimitReached ? "Limite d'abonnement atteinte. Passez au plan Pro." : ""}
              >
                <Button 
                  variant="primary" 
                  disabled={isLimitReached}
                  className={`rounded-full px-6 shadow-lg shadow-primary/20 transition-all font-semibold \${isLimitReached ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:shadow-primary/40'}`}
                  onClick={() => {
                    if (isLimitReached) {
                      toast('Limite de biens atteinte. Veuillez upgrader votre abonnement.', { icon: '👑' });
                      // Optionally navigate to billing page here
                      return;
                    }
                    if (activeTab === 'immeubles') {
                      setEditingImmeuble({ nom: '', type: 'Immeuble', adresse: '', ville: '', pays: 'Bénin', description: '', owner_id: 0, photo: '' });
                      setShowImmeubleModal(true);
                    } else {
                      setEditingLot({ reference: '', type: 'Appartement', building_id: 0, etage: '', superficie: 0, nbPieces: 1, loyer: 0, charges: 0, description: '' });
                      setShowLotModal(true);
                    }
                  }}
                >
                  <Plus size={18} className="mr-2" />
                  Nouveau {activeTab === 'immeubles' ? 'Immeuble' : 'Lot'}
                </Button>
              </div>
            );
          })()}
        </div>
      </motion.div>

      {/* Alerts */}
      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

      {/* Tabs & Filters Bar */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-base-100 rounded-2xl p-3 shadow-sm border border-base-200">
        {/* Tabs */}
        <div className="flex p-1 bg-base-300/50 rounded-xl">
          <button
            onClick={() => { setActiveTab('immeubles'); setFilterValues({}); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'immeubles' 
                ? 'bg-base-100 text-primary shadow-md' 
                : 'text-base-content/60 hover:text-base-content/80'
            }`}
          >
            <Building2 size={18} />
            Immeubles
            <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-200 text-xs">{immeubles.length}</span>
          </button>
          <button
            onClick={() => { setActiveTab('lots'); setFilterValues({}); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'lots' 
                ? 'bg-base-100 text-primary shadow-md' 
                : 'text-base-content/60 hover:text-base-content/80'
            }`}
          >
            <Home size={18} />
            Lots
            <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-200 text-xs">{lots.length}</span>
          </button>
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          <div className="flex bg-base-300 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-base-100 shadow-sm text-primary' : 'text-gray-400 hover:text-base-content/70'}`}
              title="Vue Grille"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-base-100 shadow-sm text-primary' : 'text-gray-400 hover:text-base-content/70'}`}
              title="Vue Liste"
            >
              <List size={18} />
            </button>
          </div>

          {/* Filter toggle */}
          <Button 
            variant={showFilters ? 'primary' : 'ghost'} 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? '' : 'text-base-content/60'}
          >
            {showFilters ? <X size={16} className="mr-1" /> : null}
            Filtres
            {Object.keys(filterValues).length > 0 && (
              <span className="ml-2 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                {Object.keys(filterValues).length}
              </span>
            )}
          </Button>

          <div className="h-6 w-px bg-gray-200"></div>
          
          <span className="text-sm font-semibold text-base-content/60">
            {currentData.length} résultats
          </span>
        </div>
      </motion.div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <FilterPanel
              filters={activeTab === 'immeubles' ? dynamicImmeubleFilters : lotFilters}
              values={filterValues}
              onChange={setFilterValues}
              onClear={() => setFilterValues({})}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {viewMode === 'grid' ? <GridSkeleton /> : <TableSkeleton />}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'immeubles' ? (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {paginatedData.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-400">
                      <Building2 size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="font-medium">Aucun immeuble trouvé</p>
                      <p className="text-sm mt-1">Modifiez vos critères de recherche</p>
                    </div>
                  ) : (
                    (paginatedData as Immeuble[]).map((immeuble) => (
                      <div key={immeuble.id} className="bg-base-100 rounded-2xl shadow-lg border border-base-200 overflow-hidden hover:shadow-xl transition-all group">
                        <div className="h-48 bg-gray-200 relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                          <span className={`absolute top-4 right-4 z-20 badge border-none text-white font-bold ${immeuble.statut === 'Actif' ? 'bg-green-500' : 'bg-orange-500'}`}>
                            {immeuble.statut || 'Actif'}
                          </span>
                          <div 
                            className="absolute inset-0 z-25 cursor-zoom-in" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setGallerySelectedBuilding(immeuble);
                              setShowGalleryModal(true);
                            }}
                            title="Ouvrir la galerie"
                          />
                          {immeuble.photo ? (
                            <img src={immeuble.photo} alt={immeuble.nom} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <img src={getPlaceholderImage(immeuble.id)} alt={immeuble.nom} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          )}
                          <div className="absolute bottom-4 left-4 z-20 text-white">
                            <h3 className="text-xl font-bold">{immeuble.nom}</h3>
                            <p className="text-sm opacity-90 flex items-center gap-1"><MapPin size={14}/> {immeuble.ville}</p>
                          </div>
                        </div>
                        <div className="p-5">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="p-3 bg-base-200 rounded-xl">
                              <p className="text-xs text-gray-400 font-bold uppercase">Lots</p>
                              <p className="font-bold text-base-content/90 text-lg">
                                {immeuble.nbLots || 0}
                              </p>
                            </div>
                            <div className="p-3 bg-base-200 rounded-xl">
                              <p className="text-xs text-gray-400 font-bold uppercase">Propriétaire</p>
                              <p className="font-medium text-base-content/80 text-sm truncate">
                                {immeuble.proprietaire || 'Non assigné'}
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-base-200">
                            <div className="flex gap-1">
                              <button 
                                onClick={() => { setEditingImmeuble(immeuble); setShowImmeubleModal(true); }}
                                className="btn btn-ghost btn-xs btn-square"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteImmeuble(immeuble.id)}
                                className="btn btn-ghost btn-xs btn-square text-error"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5">
                              Détails <ArrowRight size={16} className="ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                // List view for immeubles
                <Card className="border-none shadow-xl bg-base-100 overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead className="bg-base-200/50">
                        <tr>
                          <th className="py-4 pl-6">Photo</th>
                          <th className="py-4">Nom</th>
                          <th className="py-4">Ville</th>
                          <th className="py-4">Nb Lots</th>
                          <th className="py-4">Occupation</th>
                          <th className="py-4 pr-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(paginatedData as Immeuble[]).map((immeuble) => (
                          <tr key={immeuble.id} className="hover:bg-base-200/50 transition-colors">
                            <td className="pl-6">
                                <div 
                                  className="avatar h-12 w-16 rounded cursor-pointer overflow-hidden relative shadow-sm" 
                                  onClick={() => { 
                                    setGallerySelectedBuilding(immeuble); 
                                    setShowGalleryModal(true); 
                                  }}
                                  title="Ouvrir la galerie"
                                >
                                    <img 
                                        src={immeuble.photo || (immeuble.photos && immeuble.photos.length > 0 ? immeuble.photos[0] : getPlaceholderImage(immeuble.id))} 
                                        alt={immeuble.nom}
                                        className="h-full w-full object-cover transition-transform hover:scale-110"
                                    />
                                </div>
                            </td>
                            <td className="font-bold text-base-content/90">{immeuble.nom}</td>
                            <td className="text-base-content/70">{immeuble.ville}</td>
                            <td className="font-mono">{immeuble.nbLots || 0}</td>
                            <td>
                                <div className="flex items-center gap-2">
                                    <progress className="progress progress-primary w-20" value={immeuble.occupation || 0} max="100"></progress>
                                    <span className="text-xs font-bold">{immeuble.occupation || 0}%</span>
                                </div>
                            </td>
                            <td className="pr-6 text-right">
                              <div className="flex justify-end gap-1">
                                <button onClick={() => { setEditingImmeuble(immeuble); setShowImmeubleModal(true); }} className="btn btn-ghost btn-xs btn-square"><Edit3 size={14} /></button>
                                <button onClick={() => handleDeleteImmeuble(immeuble.id)} className="btn btn-ghost btn-xs btn-square text-error"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )
            ) : (
              // Lots view
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                  {(paginatedData as Lot[]).length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-400">
                      <Home size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="font-medium">Aucun lot trouvé</p>
                    </div>
                  ) : (
                    (paginatedData as Lot[]).map((lot) => (
                      <div 
                        key={lot.id} 
                        className="bg-base-100 rounded-2xl shadow-lg border border-base-200 overflow-hidden hover:shadow-xl transition-all group flex flex-col"
                        onClick={() => { setEditingLot(lot); setShowLotModal(true); }}
                      >
                        <div className="h-40 bg-gray-200 relative overflow-hidden shrink-0">
                          <img 
                            src={lot.photos && lot.photos.length > 0 ? lot.photos[0] : getPlaceholderImage(lot.id)} 
                            alt={lot.reference} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <span className={`absolute top-3 right-3 z-20 badge border-none text-white font-bold ${
                            lot.statut === 'libre' ? 'bg-green-500' : 'bg-blue-500'
                          }`}>
                            {lot.statut || 'libre'}
                          </span>
                        </div>
                        <div className="p-4 flex-1 flex flex-col">
                          <h3 className="font-bold text-base-content/90 text-lg truncate mb-1">{lot.reference}</h3>
                          <p className="text-base-content/60 text-sm flex items-center gap-1 mb-3">
                            <Building2 size={14}/> {lot.immeuble}
                          </p>
                          <div className="mt-auto">
                            <div className="flex items-center justify-between pt-3 border-t border-base-200">
                              <span className="font-mono font-bold text-base-content">
                                {lot.loyer?.toLocaleString()} <small>FCFA</small>
                              </span>
                              <div className="flex gap-1">
                                <button onClick={(e) => { e.stopPropagation(); setEditingLot(lot); setShowLotModal(true); }} className="btn btn-ghost btn-xs btn-square"><Edit3 size={14} /></button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                // Lots List view
                <Card className="border-none shadow-xl bg-base-100 overflow-hidden p-0">
                  <div className="overflow-x-auto">
                    <table className="table w-full">
                      <thead className="bg-base-200/50">
                        <tr>
                          <th className="py-4 pl-6">Photo</th>
                          <th className="py-4">Référence</th>
                          <th className="py-4">Immeuble</th>
                          <th className="py-4">Statut</th>
                          <th className="py-4">Loyer / Prix</th>
                          <th className="py-4 pr-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(paginatedData as Lot[]).length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-12 text-gray-400">
                              Aucun lot trouvé
                            </td>
                          </tr>
                        ) : (
                          (paginatedData as Lot[]).map((lot) => (
                            <tr key={lot.id} className="hover:bg-base-200/50 transition-colors group cursor-pointer" onClick={() => { setEditingLot(lot); setShowLotModal(true); }}>
                              <td className="pl-6">
                                  <div className="avatar h-10 w-16 rounded cursor-pointer overflow-hidden relative shadow-sm">
                                      <img 
                                          src={lot.photos && lot.photos.length > 0 ? lot.photos[0] : getPlaceholderImage(lot.id)} 
                                          alt={lot.reference}
                                          className="h-full w-full object-cover transition-transform hover:scale-110"
                                      />
                                  </div>
                              </td>
                              <td className="font-bold text-base-content/90">{lot.reference}</td>
                              <td className="text-base-content/70">{lot.immeuble}</td>
                              <td>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                  lot.statut === 'libre' ? 'bg-green-100 text-green-700' :
                                  lot.statut === 'occupe' || lot.statut === 'occupé' || lot.statut === 'loue' ? 'bg-blue-100 text-blue-700' : 
                                  lot.statut === 'vendu' ? 'bg-purple-100 text-purple-700' :
                                  'bg-orange-100 text-orange-700'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    lot.statut === 'libre' ? 'bg-green-500' :
                                    lot.statut === 'occupe' || lot.statut === 'occupé' || lot.statut === 'loue' ? 'bg-blue-500' : 
                                    lot.statut === 'vendu' ? 'bg-purple-500' :
                                    'bg-orange-500'
                                  }`}></span>
                                  {lot.statut || 'libre'}
                                </span>
                              </td>
                              <td className="font-mono font-medium text-base-content/80">
                                  {lot.type === 'Vente' || lot.prix_vente ? (
                                      <span className="text-purple-700">{lot.prix_vente?.toLocaleString()} FCFA (Vente)</span>
                                  ) : (
                                      <span>{lot.loyer?.toLocaleString()} FCFA/mois</span>
                                  )}
                              </td>
                              <td className="pr-6 text-right">
                                <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                  {(lot.statut === 'libre') && (
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingLot(lot);
                                        setActiveAssignmentLot(lot);
                                        setShowAssignmentModal(true);
                                      }} 
                                      className="btn btn-ghost btn-xs btn-square text-primary tooltip tooltip-left"
                                      data-tip="Affecter (Louer/Vendre)"
                                    >
                                      <UserPlus size={14} />
                                    </button>
                                  )}
                                  <button onClick={(e) => { e.stopPropagation(); setEditingLot(lot); setShowLotModal(true); }} className="btn btn-ghost btn-xs btn-square"><Edit3 size={14} /></button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteLot(lot.id); }} className="btn btn-ghost btn-xs btn-square text-error"><Trash2 size={14} /></button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="btn btn-ghost btn-sm btn-circle disabled:opacity-40"
                >
                  <ChevronLeft size={18} />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`btn btn-sm btn-circle ${
                      currentPage === page 
                        ? 'btn-primary' 
                        : 'btn-ghost'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="btn btn-ghost btn-sm btn-circle disabled:opacity-40"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Immeuble Modal - Nouveau formulaire avec onglets */}
      <Modal
        isOpen={showImmeubleModal}
        onClose={() => setShowImmeubleModal(false)}
        title={editingImmeuble.id ? 'Modifier Immeuble' : 'Nouvel Immeuble'}
        size="xl"
      >
        <div className="min-h-[500px]">
          <ImmeubleForm
            immeuble={editingImmeuble}
            proprietaires={proprietaires}
            gestionnaires={users}
            onSave={async (data) => {
              await handleSaveImmeuble(data);
            }}
            onSaveAndAddLots={async (data) => {
              const savedImmeuble = await handleSaveImmeuble(data);
              
              if (savedImmeuble && savedImmeuble.id) {
                setActiveTab('lots');
                setEditingLot({ 
                  reference: '', type: 'Appartement', 
                  building_id: savedImmeuble.id, 
                  etage: '', superficie: 0, nbPieces: 1, loyer: 0, charges: 0, description: '' 
                });
                // Short timeout just to allow modal transition
                setTimeout(() => setShowLotModal(true), 100);
              }
            }}
            onCancel={() => setShowImmeubleModal(false)}
          />

        </div>
      </Modal>

      {/* Lot Modal - Nouveau formulaire avec onglets */}
      <Modal
        isOpen={showLotModal}
        onClose={() => setShowLotModal(false)}
        title={editingLot.id ? 'Modifier Lot' : 'Nouveau Lot'}
        size="xl"
      >
        <div className="min-h-[500px]">
          <LotForm
            lot={editingLot}
            immeubles={immeubles}
            onSave={async (data) => {
              await saveLot(data);
              await fetchData();
              setShowLotModal(false);
              setSuccess('Lot enregistré avec succès');
            }}
            onStatusChange={async (data, newStatus) => {
              if (newStatus === 'loue' || newStatus === 'vendu' || newStatus === 'reserve') {
                // Open Assignment Form instead of direct save
                setShowLotModal(false); // Close edit modal
                setEditingLot(data as Lot); // Ensure data is current
                setActiveAssignmentLot(data as Lot); // Set for assignment
                setShowAssignmentModal(true);
              } else {
                // Direct update for other statuses (e.g. hors_service)
                await saveLot({ ...data, statut: newStatus });
                await fetchData();
                setShowLotModal(false);
                setSuccess(`Statut du lot modifié: ${newStatus}`);
              }
            }}
            onCancel={() => setShowLotModal(false)}
            loading={loading}
          />
        </div>
      </Modal>

      {/* Assignment Modal */}
      <Modal
        isOpen={showAssignmentModal}
        onClose={() => setShowAssignmentModal(false)}
        title="Nouvelle Affectation"
        size="xl"
      >
        {activeAssignmentLot && (
          <div className="min-h-[500px]">
            <AssignmentForm
              lot={activeAssignmentLot}
              onSuccess={async () => {
                 await fetchData();
                 setShowAssignmentModal(false);
                 setSuccess('Affectation réussie ! Contrat généré.');
              }}
              onCancel={() => setShowAssignmentModal(false)}
            />
          </div>
        )}
      </Modal>

      {/* Gallery Modal */}
      <Modal
        isOpen={showGalleryModal}
        onClose={() => setShowGalleryModal(false)}
        title={`Galerie - ${gallerySelectedBuilding?.nom}`}
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {(gallerySelectedBuilding?.photos && gallerySelectedBuilding.photos.length > 0) ? (
              gallerySelectedBuilding.photos.map((url, idx) => (
                <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-base-200 shadow-sm hover:shadow-md transition-shadow">
                  <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-gray-400">
                <p>Aucune photo disponible pour cet immeuble.</p>
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowGalleryModal(false)}>Fermer</Button>
          </div>
        </div>
      </Modal>
    </motion.div>
  );
};

export default Biens;