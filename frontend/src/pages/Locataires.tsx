// frontend/src/pages/Locataires.tsx
// Version améliorée avec recherche fonctionnelle, filtres, statut paiement et actions rapides
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getLocataires, createLocataire, deleteLocataire } from '../api/locataireApi';
import type { Locataire } from '../api/locataireApi';
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
  X
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Modal from '../components/ui/Modal';
import SearchInput from '../components/ui/SearchInput';
import FilterPanel from '../components/ui/FilterPanel';
import type { FilterConfig, FilterValues } from '../components/ui/FilterPanel';
import SkeletonLoader from '../components/ui/SkeletonLoader';
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
  if (!locataire.loyer) return 'unknown';
  const statuses: PaymentStatus[] = ['paid', 'paid', 'paid', 'pending', 'late'];
  return statuses[locataire.id % statuses.length];
};

const PaymentStatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const configs = {
    paid: { icon: CheckCircle2, label: 'Payé', className: 'bg-green-100 text-green-700' },
    pending: { icon: Clock, label: 'En attente', className: 'bg-yellow-100 text-yellow-700' },
    late: { icon: AlertCircle, label: 'En retard', className: 'bg-red-100 text-red-700' },
    unknown: { icon: null, label: '-', className: 'bg-gray-100 text-gray-500' }
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
  const [activeTab, setActiveTab] = useState<'locataires' | 'acheteurs' | 'affectation'>('locataires');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Data states
  const [locataires, setLocataires] = useState<Locataire[]>([]);
  const [acheteurs, setAcheteurs] = useState<Locataire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [formType, setFormType] = useState<'creation' | 'affectation'>('creation');
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
      const [locs, achs] = await Promise.all([
        getLocataires('Locataire'),
        getLocataires('Acheteur')
      ]);
      setLocataires(locs);
      setAcheteurs(achs);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erreur lors du chargement');
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
  const currentList = activeTab === 'locataires' ? locataires : acheteurs;
  
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
      setError(null);
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
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce profil ?')) return;
    try {
      await deleteLocataire(id);
      setSuccess('Profil supprimé');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
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
        <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 animate-pulse">
          <div className="flex justify-between items-start mb-4">
            <SkeletonLoader variant="circular" width={56} height={56} />
            <SkeletonLoader variant="text" width={60} height={24} />
          </div>
          <SkeletonLoader variant="text" width="80%" height={20} className="mb-2" />
          <SkeletonLoader variant="text" width="60%" height={16} className="mb-4" />
          <div className="space-y-3 pt-4 border-t border-gray-100">
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
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Locataires & Clients <span className="text-secondary">.</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Gérez vos locataires, acheteurs et leurs affectations.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SearchInput 
            placeholder="Rechercher par nom, tél, email..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="w-72"
          />
          <Button 
            variant="primary" 
            className="rounded-full px-6 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
            onClick={() => {
              setFormType('creation');
              setLocataireForm({ ...locataireForm, typeProfil: activeTab === 'acheteurs' ? 'Acheteur' : 'Locataire' });
              setShowModal(true);
            }}
          >
            <UserPlus size={18} className="mr-2" />
            Nouveau {activeTab === 'acheteurs' ? 'Acheteur' : 'Locataire'}
          </Button>
        </div>
      </motion.div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="btn btn-ghost btn-xs btn-circle"><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="btn btn-ghost btn-xs btn-circle"><X size={14} /></button>
        </div>
      )}

      {/* Tabs & Filters Bar */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
        {/* Tabs */}
        <div className="flex p-1 bg-gray-100/50 rounded-xl overflow-x-auto">
          <button
            onClick={() => { setActiveTab('locataires'); setFilterValues({}); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'locataires' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users size={18} />
            Locataires
            <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-200 text-xs">{locataires.length}</span>
          </button>
          <button
            onClick={() => { setActiveTab('acheteurs'); setFilterValues({}); }}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'acheteurs' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Wallet size={18} />
            Acheteurs
            <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-200 text-xs">{acheteurs.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('affectation')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'affectation' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
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
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-primary' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  <List size={18} />
                </button>
              </div>

              {/* Filter toggle */}
              <Button 
                variant={showFilters ? 'primary' : 'ghost'} 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className={showFilters ? '' : 'text-gray-500'}
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

          <div className="h-6 w-px bg-gray-200"></div>
          
          <span className="text-sm font-semibold text-gray-500">
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
            <Card className="border-none shadow-xl bg-white text-center py-12">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4"><Home size={32}/></div>
                <h3 className="text-xl font-bold text-gray-800">Gestion des Affectations</h3>
                <p className="text-gray-500 max-w-md mt-2 mb-6">Gérez ici l'attribution des logements à vos locataires.</p>
                <Button variant="primary" onClick={() => navigate('/dashboard/locations')}>
                  Voir les Baux
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {paginatedList.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-medium">Aucun {activeTab === 'acheteurs' ? 'acheteur' : 'locataire'} trouvé</p>
                <p className="text-sm mt-1">Modifiez vos critères de recherche</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedList.map((person) => {
                  const paymentStatus = getPaymentStatus(person);
                  return (
                    <motion.div 
                      key={person.id}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all group relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
                      
                      <div className="flex justify-between items-start mb-4">
                        <div className={`w-14 h-14 ${getAvatarColor(person.nom)} rounded-full flex items-center justify-center text-white text-xl font-bold ring-4 ring-white shadow-sm`}>
                          {person.nom?.charAt(0)}{person.prenoms?.charAt(0)}
                        </div>
                        <div className={`badge ${person.statut === 'Actif' ? 'badge-success' : 'badge-warning'} gap-1 font-bold pl-1.5 pr-2.5 py-3 h-auto rounded-full`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${person.statut === 'Actif' ? 'bg-green-800' : 'bg-orange-800'}`}></div>
                          {person.statut}
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{person.prenoms} {person.nom}</h3>
                      <p className="text-sm text-gray-500 mb-1 flex items-center gap-1.5">
                        <Phone size={12} /> {person.telephone_principal}
                      </p>
                      {person.email && (
                        <p className="text-xs text-gray-400 mb-3 flex items-center gap-1.5 truncate">
                          <Mail size={12} /> {person.email}
                        </p>
                      )}

                      <div className="space-y-2 pt-4 border-t border-gray-50">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400 flex items-center gap-1.5"><Home size={14}/> Logement</span>
                          <span className="font-semibold text-gray-800">{person.lot || '-'}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-400 flex items-center gap-1.5"><Wallet size={14}/> Loyer</span>
                          <span className="font-semibold text-primary">{person.loyer ? `${person.loyer.toLocaleString()} F` : '-'}</span>
                        </div>
                        {person.loyer && (
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-400">Paiement</span>
                            <PaymentStatusBadge status={paymentStatus} />
                          </div>
                        )}
                      </div>

                      {/* Quick Actions - Always visible on mobile, hover on desktop */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-50">
                        <button 
                          onClick={() => handleWhatsApp(person.telephone_principal, person.prenoms)}
                          className="btn btn-sm btn-ghost bg-green-50 hover:bg-green-100 text-green-600"
                          title="WhatsApp"
                        >
                          <MessageCircle size={16} />
                        </button>
                        <button 
                          onClick={() => handleCall(person.telephone_principal)}
                          className="btn btn-sm btn-ghost bg-blue-50 hover:bg-blue-100 text-blue-600"
                          title="Appeler"
                        >
                          <Phone size={16} />
                        </button>
                        <button 
                          onClick={() => navigate(`/dashboard/locataires/${person.id}`)}
                          className="btn btn-sm btn-ghost bg-purple-50 hover:bg-purple-100 text-purple-600"
                          title="Détails"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              // List view
              <Card className="border-none shadow-xl bg-white overflow-hidden p-0">
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="py-4 pl-6">Nom</th>
                        <th className="py-4">Téléphone</th>
                        <th className="py-4">Email</th>
                        <th className="py-4">Logement</th>
                        <th className="py-4">Loyer</th>
                        <th className="py-4">Paiement</th>
                        <th className="py-4">Statut</th>
                        <th className="py-4 pr-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedList.map((person) => {
                        const paymentStatus = getPaymentStatus(person);
                        return (
                          <tr key={person.id} className="hover:bg-gray-50/50 transition-colors group">
                            <td className="pl-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 ${getAvatarColor(person.nom)} rounded-full flex items-center justify-center text-white text-sm font-bold`}>
                                  {person.nom?.charAt(0)}{person.prenoms?.charAt(0)}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-800">{person.prenoms} {person.nom}</p>
                                </div>
                              </div>
                            </td>
                            <td className="font-mono text-sm">{person.telephone_principal}</td>
                            <td className="text-gray-500 text-sm">{person.email || '-'}</td>
                            <td className="text-gray-600">{person.lot || '-'}</td>
                            <td className="font-semibold">{person.loyer ? `${person.loyer.toLocaleString()} F` : '-'}</td>
                            <td><PaymentStatusBadge status={paymentStatus} /></td>
                            <td>
                              <span className={`badge ${person.statut === 'Actif' ? 'badge-success' : 'badge-warning'}`}>
                                {person.statut}
                              </span>
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

      {/* Create Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={locataireForm.typeProfil === 'Acheteur' ? 'Nouvel Acheteur' : 'Nouveau Locataire'}
        size="lg"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Annuler</Button>
            <Button variant="primary" onClick={handleSave} className="flex-1">Enregistrer</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Profile Photo Upload Placeholder */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center border-4 border-white shadow-lg relative cursor-pointer group">
              <User size={28} className="text-gray-400 group-hover:text-primary transition-colors"/>
              <div className="absolute bottom-0 right-0 bg-primary text-white p-1 rounded-full shadow-md">
                <Edit3 size={10} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Profil" 
              value={locataireForm.typeProfil} 
              onChange={(e) => setLocataireForm({...locataireForm, typeProfil: e.target.value})} 
              options={[{ value: 'Locataire', label: 'Locataire' }, { value: 'Acheteur', label: 'Acheteur' }]} 
            />
            <Select 
              label="Nationalité" 
              value={locataireForm.nationalite} 
              onChange={(e) => setLocataireForm({...locataireForm, nationalite: e.target.value})} 
              options={[{ value: 'Béninoise', label: 'Béninoise' }, { value: 'Togolaise', label: 'Togolaise' }, { value: 'Autre', label: 'Autre' }]} 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Nom" placeholder="Nom de famille" value={locataireForm.nom} onChange={(e) => setLocataireForm({...locataireForm, nom: e.target.value})} required />
            <Input label="Prénoms" placeholder="Prénoms" value={locataireForm.prenoms} onChange={(e) => setLocataireForm({...locataireForm, prenoms: e.target.value})} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Input label="Téléphone (WhatsApp)" placeholder="+229..." value={locataireForm.telephonePrincipal} onChange={(e) => setLocataireForm({...locataireForm, telephonePrincipal: e.target.value})} required />
            <Input label="Email" placeholder="exemple@email.com" value={locataireForm.email} onChange={(e) => setLocataireForm({...locataireForm, email: e.target.value})} />
          </div>

          {locataireForm.typeProfil === 'Locataire' && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-4">
              <h3 className="font-bold text-gray-700 text-sm uppercase">Conditions Financières</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Caution (FCFA)" type="number" value={locataireForm.acompte} onChange={(e) => setLocataireForm({...locataireForm, acompte: parseFloat(e.target.value) || 0})} />
                <Input label="Avance (FCFA)" type="number" value={locataireForm.avance} onChange={(e) => setLocataireForm({...locataireForm, avance: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
          )}
        </div>
      </Modal>
    </motion.div>
  );
};

export default Locataires;