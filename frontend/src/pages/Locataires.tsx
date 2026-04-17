// frontend/src/pages/Locataires.tsx
// Version améliorée avec recherche fonctionnelle, filtres, statut paiement et actions rapides
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getLocataires, createLocataire, deleteLocataire, approveLocataire, rejectLocataire } from '../api/locataireApi';
import { getProprietaires } from '../api/accountApi';
import { getSubscriptionStatus } from '../api/subscriptionApi';
import type { Locataire } from '../api/locataireApi';
import type { SubscriptionStatus } from '../api/subscriptionApi';
import { 
  Users,
  UserPlus,
  Phone,
  Mail,
  Edit3,
  Eye,
  Trash2,
  Home,
  Wallet,
  User,
  CheckCircle2,
  XCircle,
  MessageCircle,
  AlertCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  X,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import SearchInput from '../components/ui/SearchInput';
import FilterPanel from '../components/ui/FilterPanel';
import type { FilterConfig, FilterValues } from '../components/ui/FilterPanel';
import SkeletonLoader from '../components/ui/SkeletonLoader';
import LocataireForm from '../components/locataires/LocataireForm';
import ConfirmModal from '../components/ui/ConfirmModal';
import EmptyState from '../components/ui/EmptyState';
import InvitationLinkModal from '../components/ui/InvitationLinkModal';
import { motion, AnimatePresence } from 'framer-motion';

// Constants
const ITEMS_PER_PAGE = 12;

// Placeholder avatars
const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 
    'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-red-500'
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

// Payment status helper
type PaymentStatus = 'paid' | 'pending' | 'late' | 'unknown';

const getPaymentStatus = (locataire: Locataire): PaymentStatus => {
  // In real app, this would come from API
  // For demo, simulate based on ID
  if (!locataire.loyer_actuel) return 'unknown';
  // Use status computed by backend if available, otherwise fallback (should not happen with new backend)
  return (locataire as any).payment_status || 'unknown';
};

const PaymentStatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const configs = {
    paid: { icon: CheckCircle2, label: 'Payé', className: 'bg-green-100 text-green-700' },
    pending: { icon: Clock, label: 'En attente', className: 'bg-yellow-100 text-yellow-700' },
    late: { icon: AlertCircle, label: 'En retard', className: 'bg-red-100 text-red-700' },
    unknown: { icon: null, label: '-', className: 'bg-base-300 text-base-content/60' }
  };
  
  const config = configs[status];
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${config.className}`}>
      {Icon && <Icon size={12} />}
      {config.label}
    </span>
  );
};

const Locataires: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'locataires' | 'acheteurs' | 'affectation' | 'requests'>(
    (searchParams.get('tab') as 'locataires' | 'acheteurs' | 'affectation' | 'requests') || 'locataires'
  );
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Data states
  const [locataires, setLocataires] = useState<Locataire[]>([]);
  const [acheteurs, setAcheteurs] = useState<Locataire[]>([]);
  const [requests, setRequests] = useState<Locataire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [proprietaires, setProprietaires] = useState<any[]>([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  
  // Confirm Modal State
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'danger' | 'warning' | 'info';
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    action: async () => {}
  });
  const [formType, setFormType] = useState<'creation' | 'affectation'>('creation');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [locataireForm, setLocataireForm] = useState({
    typeProfil: 'Locataire', nom: '', prenoms: '', telephonePrincipal: '', telephoneSecondaire: '',
    email: '', nationalite: 'Béninoise', typePiece: 'CNI', numeroPiece: '', dateExpiration: '',
    modePaiement: 'Mobile Money', acompte: 0, avance: 0
  });

  // Filter configs
  const locataireFilters: FilterConfig[] = [
    {
      id: 'statut',
      type: 'select',
      label: 'Statut',
      options: [
        { value: 'Actif', label: 'Actif' },
        { value: 'Inactif', label: 'Inactif' },
      ]
    },
    {
      id: 'paymentStatus',
      type: 'multi-select',
      label: 'Paiement',
      options: [
        { value: 'paid', label: 'Payé' },
        { value: 'pending', label: 'En attente' },
        { value: 'late', label: 'En retard' },
      ]
    }
  ];

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [locsAll, achs, subStatus, props] = await Promise.all([
        getLocataires('Locataire'),
        getLocataires('Acheteur'),
        getSubscriptionStatus().catch(err => {
            console.error("Erreur chargement abonnement", err);
            return null;
        }),
        getProprietaires().catch(() => [])
      ]);
      
      // Separate Active from Pending
      const activeLocs = locsAll.filter(l => l.statut !== 'En attente' && l.statut !== 'Rejeté');
      const pendingLocs = locsAll.filter(l => l.statut === 'En attente');

      setLocataires(activeLocs);
      setRequests(pendingLocs);
      setAcheteurs(achs);
      if (subStatus) setSubscriptionStatus(subStatus);
      setProprietaires(props);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterValues, activeTab]);

  // Filtered data
  const currentList = activeTab === 'locataires' ? locataires : activeTab === 'acheteurs' ? acheteurs : activeTab === 'requests' ? requests : [];
  
  const filteredList = useMemo(() => {
    return currentList.filter(person => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          person.nom?.toLowerCase().includes(query) ||
          person.prenoms?.toLowerCase().includes(query) ||
          person.telephone_principal?.includes(query) ||
          person.email?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }
      
      // Filters
      if (filterValues.statut && person.statut !== filterValues.statut) return false;
      
      if (filterValues.paymentStatus) {
        const selectedStatuses = filterValues.paymentStatus as string[];
        if (selectedStatuses.length > 0) {
          const personPaymentStatus = getPaymentStatus(person);
          if (!selectedStatuses.includes(personPaymentStatus)) return false;
        }
      }
      
      return true;
    });
  }, [currentList, searchQuery, filterValues]);

  // Pagination
  const totalPages = Math.ceil(filteredList.length / ITEMS_PER_PAGE);
  const paginatedList = filteredList.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Handlers
  const handleSave = async () => {
    try {
      if (!locataireForm.nom || !locataireForm.telephonePrincipal) {
        throw new Error('Nom et téléphone sont requis');
      }
      // Map camelCase to snake_case for API
      const dataToSave: any = { 
        type: locataireForm.typeProfil,
        nom: locataireForm.nom,
        prenoms: locataireForm.prenoms,
        telephone_principal: locataireForm.telephonePrincipal,
        telephone_secondaire: locataireForm.telephoneSecondaire || null,
        email: locataireForm.email || null,
        nationalite: locataireForm.nationalite,
        type_piece: locataireForm.typePiece,
        numero_piece: locataireForm.numeroPiece || null,
        date_expiration: locataireForm.dateExpiration || null,
        mode_paiement: locataireForm.modePaiement,
        acompte: locataireForm.acompte || 0,
        avance: locataireForm.avance || 0
      };
      await createLocataire(dataToSave);
      toast.success('Profil créé avec succès');
      setShowModal(false);
      setLocataireForm({
        typeProfil: 'Locataire', nom: '', prenoms: '', telephonePrincipal: '', telephoneSecondaire: '',
        email: '', nationalite: 'Béninoise', typePiece: 'CNI', numeroPiece: '', dateExpiration: '',
        modePaiement: 'Mobile Money', acompte: 0, avance: 0
      });
      fetchData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Supprimer ce locataire',
      message: 'Voulez-vous vraiment supprimer ce profil ? Cette action est irréversible.',
      type: 'danger',
      action: async () => {
        try {
          await deleteLocataire(id);
          toast.success('Profil supprimé');
          fetchData();
        } catch (err: any) {
          toast.error(err.message);
        }
      }
    });
  };

  const handleWhatsApp = (phone: string, name: string) => {
    const message = encodeURIComponent(`Bonjour ${name}, `);
    window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${message}`, '_blank');
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email: string) => {
    window.location.href = `mailto:${email}`;
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code d\'invitation copié !');
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  // Skeleton loader
  const GridSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="bg-base-100 rounded-2xl shadow-lg border border-base-200 p-6 animate-pulse">
          <div className="flex justify-between items-start mb-4">
            <SkeletonLoader variant="circular" width={56} height={56} />
            <SkeletonLoader variant="text" width={60} height={24} />
          </div>
          <SkeletonLoader variant="text" width="80%" height={20} className="mb-2" />
          <SkeletonLoader variant="text" width="60%" height={16} className="mb-4" />
          <div className="space-y-3 pt-4 border-t border-base-200">
            <SkeletonLoader variant="text" width="100%" height={20} />
            <SkeletonLoader variant="text" width="100%" height={20} />
          </div>
        </div>
      ))}
    </div>
  );

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
            Locataires & Clients <span className="text-secondary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">
            Gérez vos locataires, acheteurs et leurs affectations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchInput 
            placeholder="Rechercher par nom, tél, email..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-full md:w-72"
          />
          
          {(() => {
            const isLimitReached = Boolean(subscriptionStatus && 
              subscriptionStatus.plan.max_tenants !== -1 && 
              (subscriptionStatus.usage?.current_tenants ?? 0) >= subscriptionStatus.plan.max_tenants);

            return (
              <Button
                variant="ghost"
                className="rounded-full px-5 border border-primary text-primary hover:bg-primary/10 font-semibold whitespace-nowrap"
                onClick={() => setShowInviteModal(true)}
              >
                <Send size={18} className="mr-2" />
                Inviter
              </Button>

              <div
                className="relative group"
                title={isLimitReached ? "Limite d'abonnement atteinte. Passez au plan Pro." : ""}
              >
                <Button
                  variant="primary"
                  disabled={isLimitReached}
                  className={`rounded-full px-6 shadow-lg shadow-primary/20 transition-all font-semibold whitespace-nowrap \${isLimitReached ? 'opacity-50 cursor-not-allowed grayscale' : 'hover:shadow-primary/40'}`}
                  onClick={() => {
                    if (isLimitReached) {
                      toast('Limite de locataires atteinte. Veuillez upgrader votre abonnement.', { icon: '👑' });
                      navigate('/dashboard/abonnement');
                      return;
                    }
                    setFormType('creation');
                    setLocataireForm({ ...locataireForm, typeProfil: activeTab === 'acheteurs' ? 'Acheteur' : 'Locataire' });
                    setShowModal(true);
                  }}
                >
                  <UserPlus size={18} className="mr-2" />
                  Nouveau {activeTab === 'acheteurs' ? 'Acheteur' : 'Locataire'}
                </Button>
              </div>
            );
          })()}
        </div>
      </motion.div>

      {/* Tabs & Filters Bar */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-base-100 rounded-2xl p-3 shadow-sm border border-base-200">
        {/* Tabs */}
        <div className="flex p-1 bg-base-300/50 rounded-xl overflow-x-auto">
          <button
            onClick={() => { setActiveTab('locataires'); setFilterValues({}); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'locataires' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content/80'
            }`}
          >
            <Users size={18} />
            Locataires
            <span className="ml-1 px-2 py-0.5 rounded-full bg-base-300 text-base-content/60 text-xs">{locataires.length}</span>
          </button>
          <button
            onClick={() => { setActiveTab('acheteurs'); setFilterValues({}); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'acheteurs' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content/80'
            }`}
          >
            <Wallet size={18} />
            Acheteurs
            <span className="ml-1 px-2 py-0.5 rounded-full bg-base-300 text-base-content/60 text-xs">{acheteurs.length}</span>
          </button>
          <button
            onClick={() => { setActiveTab('requests'); setFilterValues({}); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'requests' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content/80'
            }`}
          >
            <UserPlus size={18} />
            Demandes
            {requests.length > 0 && <span className="ml-1 px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 text-xs">{requests.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('affectation')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'affectation' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content/80'
            }`}
          >
            <Home size={18} />
            Affectations
          </button>
        </div>
        
        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* View mode toggle */}
          {activeTab !== 'affectation' && (
            <>
              <div className="flex bg-base-300 rounded-lg p-1">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-base-100 shadow-sm text-primary' : 'text-base-content/50 hover:text-base-content/70'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-base-100 shadow-sm text-primary' : 'text-base-content/50 hover:text-base-content/70'}`}
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
            </>
          )}

          <div className="h-6 w-px bg-base-300"></div>
          
          <span className="text-sm font-semibold text-base-content/60">
            {filteredList.length} résultats
          </span>
        </div>
      </motion.div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && activeTab !== 'affectation' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <FilterPanel
              filters={locataireFilters}
              values={filterValues}
              onChange={setFilterValues}
              onClear={() => setFilterValues({})}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <GridSkeleton />
          </motion.div>
        ) : activeTab === 'affectation' ? (
          <motion.div key="affectation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Card className="border-none shadow-xl bg-base-100 text-center py-12">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4"><Home size={32}/></div>
                <h2 className="text-xl font-bold text-base-content/90">Gestion des Affectations</h2>
                <p className="text-base-content/60 max-w-md mt-2 mb-6">Gérez ici l'attribution des logements à vos locataires.</p>
                <Button variant="primary" onClick={() => navigate('/dashboard/locations')}>
                  Voir les Baux
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {paginatedList.length === 0 ? (
                <EmptyState
                    icon={<Users size={40} />}
                    title={`Aucun ${activeTab === 'acheteurs' ? 'acheteur' : 'locataire'} trouvé`}
                    description="Il n'y a aucun profil qui correspond à vos critères de recherche. Modifiez vos filtres ou ajoutez un nouveau profil."
                    actionLabel={`Nouveau ${activeTab === 'acheteurs' ? 'Acheteur' : 'Locataire'}`}
                    onAction={() => {
                      setFormType('creation');
                      setLocataireForm({ ...locataireForm, typeProfil: activeTab === 'acheteurs' ? 'Acheteur' : 'Locataire' });
                      setShowModal(true);
                    }}
                    className="mt-6"
                />
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedList.map((person) => {
                  const paymentStatus = getPaymentStatus(person);
                  return (
                    <motion.div 
                      key={person.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-base-100 rounded-2xl shadow-lg border border-base-200 p-6 hover:shadow-xl transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
                      
                      <div className="flex justify-between items-start mb-4">
                        {person.photo_profil_url ? (
                          <img src={person.photo_profil_url} alt={person.nom} className="w-14 h-14 rounded-full object-cover ring-4 ring-base-100 shadow-sm" />
                        ) : (
                          <div className={`w-14 h-14 ${getAvatarColor(person.nom)} rounded-full flex items-center justify-center text-white text-xl font-bold ring-4 ring-base-100 shadow-sm`}>
                            {person.nom?.charAt(0)}{person.prenoms?.charAt(0)}
                          </div>
                        )}
                        <div className={`flex items-center gap-1.5 text-xs font-bold ${person.statut === 'Actif' ? 'text-green-600' : 'text-orange-600'} py-2 h-auto`}>
                          <div className={`w-2 h-2 rounded-full ${person.statut === 'Actif' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                          {person.statut}
                        </div>
                      </div>


                      <h3 className="text-lg font-bold text-base-content leading-tight mb-1">{person.prenoms} {person.nom}</h3>
                      <p className="text-sm text-base-content/60 mb-1 flex items-center gap-1.5">
                        <Phone size={12} /> {person.telephone_principal}
                      </p>
                      {person.email && (
                        <p className="text-xs text-base-content/60 mb-3 flex items-center gap-1.5 truncate">
                          <Mail size={12} /> {person.email}
                        </p>
                      )}

                      <div className="space-y-2 pt-4 border-t border-base-200">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-base-content/50 flex items-center gap-1.5"><Home size={14}/> Logement</span>
                          <span className="font-semibold text-base-content/90">{person.lot_nom || person.lot || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-base-content/50 flex items-center gap-1.5"><Wallet size={14}/> Loyer</span>
                          <span className="font-semibold text-primary">{(person.loyer_actuel || person.loyer) ? `${(person.loyer_actuel || person.loyer)?.toLocaleString()} F` : '-'}</span>
                        </div>
                        {(person.loyer_actuel || person.loyer) && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-base-content/50">Paiement</span>
                            <PaymentStatusBadge status={paymentStatus} />
                          </div>
                        )}
                      </div>

                      {/* Quick Actions */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-base-200">
                        <button
                          type="button"
                          onClick={() => handleWhatsApp(person.telephone_principal, person.prenoms)}
                          className="btn btn-sm btn-ghost bg-green-100/50 hover:bg-green-100 text-green-600"
                          title="WhatsApp"
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCall(person.telephone_principal)}
                          className="btn btn-sm btn-ghost bg-blue-100/50 hover:bg-blue-100 text-blue-600"
                          title="Appeler"
                        >
                          <Phone size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/locataires/${person.id}`)}
                          className="btn btn-sm btn-ghost bg-purple-100/50 hover:bg-purple-100 text-purple-600"
                          title="Détails"
                        >
                          <Eye size={16} />
                        </button>
                      </div>

                      {/* Approval Actions for Pending Requests */}
                      {activeTab === 'requests' && (
                        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-base-200">
                            <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               setConfirmConfig({
                                 isOpen: true,
                                 title: 'Confirmer ce locataire',
                                 message: 'Voulez-vous vraiment approuver la demande de ce locataire ?',
                                 type: 'info',
                                 action: async () => {
                                   try {
                                     await approveLocataire(person.id);
                                     toast.success("Locataire approuvé !");
                                     fetchData();
                                   } catch(err: any) {
                                     toast.error(err.message);
                                   }
                                 }
                               });
                             }}
                             className="btn btn-sm btn-success text-white"
                           >
                             Approuver
                           </button>
                           <button 
                             onClick={(e) => {
                                e.stopPropagation();
                                setConfirmConfig({
                                 isOpen: true,
                                 title: 'Rejeter cette demande',
                                 message: 'Voulez-vous rejeter cette demande ?',
                                 type: 'danger',
                                 action: async () => {
                                   try {
                                     await rejectLocataire(person.id);
                                     toast.success("Demande rejetée.");
                                     fetchData();
                                   } catch(err: any) {
                                     toast.error(err.message);
                                   }
                                 }
                               });
                             }}
                             className="btn btn-sm btn-error text-white"
                           >
                             Rejeter
                           </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              // List view
              <Card className="border-none shadow-xl bg-base-100 overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead className="bg-base-200/50">
                      <tr>
                        <th className="py-4 pl-6">Nom</th>
                        <th className="py-4 hidden md:table-cell">Téléphone</th>
                        <th className="py-4 hidden lg:table-cell">Email</th>
                        <th className="py-4">Logement</th>
                        <th className="py-4 hidden sm:table-cell">Loyer</th>
                        <th className="py-4 hidden md:table-cell">Paiement</th>
                        <th className="py-4">Statut</th>
                        <th className="py-4 pr-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-200">
                      {paginatedList.map((person) => {
                        const paymentStatus = getPaymentStatus(person);
                        return (
                          <tr key={person.id} className="hover:bg-base-200/50 transition-colors group">
                            <td className="pl-6">
                              <div className="flex items-center gap-3">
                                {person.photo_profil_url ? (
                                  <img src={person.photo_profil_url} alt={person.nom} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <div className={`w-10 h-10 ${getAvatarColor(person.nom)} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                                    {person.nom?.charAt(0)}{person.prenoms?.charAt(0)}
                                  </div>
                                )}
                                <div>
                                  <p className="font-bold text-base-content/90">{person.prenoms} {person.nom}</p>
                                </div>
                              </div>
                            </td>
                            <td className="font-mono text-sm hidden md:table-cell">{person.telephone_principal}</td>
                            <td className="text-base-content/60 text-sm hidden lg:table-cell">{person.email || '-'}</td>
                            <td className="text-base-content/70">{person.lot_nom || person.lot || '-'}</td>
                            <td className="font-semibold hidden sm:table-cell">{(person.loyer_actuel || person.loyer) ? `${(person.loyer_actuel || person.loyer)?.toLocaleString()} F` : '-'}</td>
                            <td className="hidden md:table-cell"><PaymentStatusBadge status={paymentStatus} /></td>
                            <td>
                              <div className={`flex items-center gap-1.5 text-sm font-semibold ${person.statut === 'Actif' ? 'text-green-600' : 'text-orange-600'}`}>
                                <div className={`w-2 h-2 rounded-full ${person.statut === 'Actif' ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                                {person.statut}
                              </div>
                            </td>
                            <td className="pr-6 text-right">
                              <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleWhatsApp(person.telephone_principal, person.prenoms)} className="btn btn-ghost btn-xs btn-square text-green-600"><MessageCircle size={14} /></button>
                                <button onClick={() => handleCall(person.telephone_principal)} className="btn btn-ghost btn-xs btn-square text-blue-600"><Phone size={14} /></button>
                                <button onClick={() => navigate(`/dashboard/locataires/${person.id}`)} className="btn btn-ghost btn-xs btn-square"><Eye size={14} /></button>
                                <button onClick={() => handleDelete(person.id)} className="btn btn-ghost btn-xs btn-square text-error"><Trash2 size={14} /></button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
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
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`btn btn-sm btn-circle ${currentPage === page ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      {page}
                    </button>
                  );
                })}
                
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={locataireForm.typeProfil === 'Acheteur' ? 'Nouvel Acheteur' : 'Nouveau Locataire'}
        size="xl"
      >
        <LocataireForm
          locataire={{
            type: locataireForm.typeProfil as any
          }}
          proprietaires={proprietaires.map(p => ({ id: p.id, nom: p.nom, prenom: p.prenom }))}
          onSave={async (data) => {
            try {
              setError(null);
              if (!data.nom || !data.telephone_principal) {
                throw new Error('Nom et téléphone sont requis');
              }
              await createLocataire(data);
              setSuccess('Profil créé avec succès');
              setShowModal(false);
              setLocataireForm({
                typeProfil: 'Locataire', nom: '', prenoms: '', telephonePrincipal: '', telephoneSecondaire: '',
                email: '', nationalite: 'Béninoise', typePiece: 'CNI', numeroPiece: '', dateExpiration: '',
                modePaiement: 'Mobile Money', acompte: 0, avance: 0
              });
              fetchData();
            } catch (err: any) {
              setError(err.message);
            }
          }}
          onCancel={() => setShowModal(false)}
        />
      </Modal>

      {/* Invitation Link Modal */}
      <InvitationLinkModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        type="tenant"
      />

      {/* Dynamic Confirm Modal */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={() => {
          confirmConfig.action();
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        }}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
      />
    </motion.div>
  );
};

export default Locataires;