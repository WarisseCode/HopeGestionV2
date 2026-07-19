import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Wallet, Clock, FileCheck, AlertCircle, Filter } from 'lucide-react';
import Button from '../components/ui/Button';
import SearchInput from '../components/ui/SearchInput';
import Select from '../components/ui/Select';
import { useUser } from '../contexts/UserContext';
import { motion } from 'framer-motion';
import { KPICard } from '../components/dashboard';
import toast from 'react-hot-toast';
import { locationApi, type Location, type CreateLocationData } from '../api/locationApi';
import { interventionApi } from '../api/interventionApi';
import { getLocataires } from '../api/locataireApi';
import { getLots } from '../api/bienApi';
import { EMPTY_FORM, formatMontant } from '../utils/contratUtils';
import CreateContratForm from '../components/contrats/CreateContratForm';
import ContratDetailModal from '../components/contrats/ContratDetailModal';
import ContratsTable from '../components/contrats/ContratsTable';

type TabKey = 'locations' | 'ventes' | 'interventions';

const LEASE_STATUT_OPTIONS = [
  { value: '',        label: 'Tous les statuts' },
  { value: 'actif',   label: 'Actif'   },
  { value: 'signe',   label: 'Signé'   },
  { value: 'resilie', label: 'Résilié' },
  { value: 'expire',  label: 'Expiré'  },
];
const TICKET_STATUT_OPTIONS = [
  { value: '',        label: 'Tous les statuts' },
  { value: 'ouvert',  label: 'Ouvert'   },
  { value: 'en_cours', label: 'En cours' },
  { value: 'ferme',   label: 'Fermé'    },
];

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const itemVariants      = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

const Contrats: React.FC = () => {
  const { user }     = useUser();
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const canWrite     = !['proprietaire', 'locataire'].includes(user?.userType || '');

  const [activeTab,       setActiveTab]       = useState<TabKey>('locations');
  const [searchQuery,     setSearchQuery]     = useState('');
  const [statutFilter,    setStatutFilter]    = useState('');
  const [selectedLease,   setSelectedLease]   = useState<Location | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm,      setCreateForm]      = useState<CreateLocationData & { owner_id: number }>({ ...EMPTY_FORM });

  const { data: allLeases = [], isLoading: leasesLoading, error: leasesError } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn:  () => locationApi.getLocations(),
    staleTime: 30_000,
  });

  const { data: ticketsData, isLoading: ticketsLoading, error: ticketsError } = useQuery({
    queryKey: ['tickets', { limit: 200 }],
    queryFn:  () => interventionApi.getTickets({ limit: 200 }),
    staleTime: 30_000,
  });

  const { data: locataires = [] } = useQuery({
    queryKey: ['locataires-list'],
    queryFn:  () => getLocataires(),
    enabled:  showCreateModal,
    staleTime: 60_000,
  });

  const { data: lots = [] } = useQuery({
    queryKey: ['lots-list'],
    queryFn:  () => getLots(),
    enabled:  showCreateModal,
    staleTime: 60_000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateLocationData) => locationApi.createLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Contrat créé avec succès !');
      setShowCreateModal(false);
      setCreateForm({ ...EMPTY_FORM });
    },
    onError: (err: Error) => toast.error(err.message || 'Erreur lors de la création'),
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...createForm, tenant_id: Number(createForm.tenant_id), lot_id: Number(createForm.lot_id), owner_id: Number(createForm.owner_id) } as CreateLocationData);
  };

  const tickets = ticketsData?.data ?? [];

  const applyLeaseFilters = (base: Location[]) => {
    let r = base;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      r = r.filter(l => l.reference_bail?.toLowerCase().includes(q) || l.locataire_nom?.toLowerCase().includes(q) || l.locataire_prenoms?.toLowerCase().includes(q) || l.immeuble_nom?.toLowerCase().includes(q) || l.ref_lot?.toLowerCase().includes(q));
    }
    if (statutFilter) r = r.filter(l => l.statut === statutFilter);
    return r;
  };

  const contratsLocations = useMemo(() => applyLeaseFilters(allLeases.filter(l => !l.type_contrat || l.type_contrat === 'location')), [allLeases, searchQuery, statutFilter]);
  const contratsVentes    = useMemo(() => applyLeaseFilters(allLeases.filter(l => l.type_contrat === 'vente')), [allLeases, searchQuery, statutFilter]);
  const filteredTickets   = useMemo(() => {
    let r = tickets;
    if (searchQuery) { const q = searchQuery.toLowerCase(); r = r.filter((t: any) => t.description?.toLowerCase().includes(q) || t.building_name?.toLowerCase().includes(q) || t.ref_lot?.toLowerCase().includes(q) || t.provider_name?.toLowerCase().includes(q)); }
    if (statutFilter) r = r.filter((t: any) => t.statut === statutFilter);
    return r;
  }, [tickets, searchQuery, statutFilter]);

  const today      = new Date(); today.setHours(0, 0, 0, 0);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0); endOfMonth.setHours(23, 59, 59, 999);
  const activeContracts   = allLeases.filter(l => ['actif', 'signe'].includes(l.statut)).length;
  const expiringThisMonth = allLeases.filter(l => { if (!l.date_fin) return false; const d = new Date(l.date_fin); return d >= today && d <= endOfMonth; }).length;
  const totalLoyer        = allLeases.filter(l => l.statut === 'actif' && (!l.type_contrat || l.type_contrat === 'location')).reduce((acc, l) => acc + Number(l.loyer_mensuel ?? 0), 0);

  const isLoading    = activeTab === 'interventions' ? ticketsLoading : leasesLoading;
  const hasError     = leasesError || ticketsError;
  const statutOptions = activeTab === 'interventions' ? TICKET_STATUT_OPTIONS : LEASE_STATUT_OPTIONS;

  if (showCreateModal) {
    return (
      <CreateContratForm
        form={createForm}
        setForm={setCreateForm}
        locataires={locataires}
        lots={lots}
        onSubmit={handleCreateSubmit}
        onCancel={() => setShowCreateModal(false)}
        isPending={createMutation.isPending}
      />
    );
  }

  return (
    <>
      <motion.div className="space-y-8 max-w-[1600px] mx-auto" variants={containerVariants} initial="hidden" animate="visible">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-base-content tracking-tight">Gestion des Contrats <span className="text-primary">.</span></h1>
            <p className="text-base-content/60 font-medium mt-1">Centralisez et gérez tous vos contrats de location, vente et intervention.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-full md:w-64">
              <SearchInput placeholder="Rechercher…" size="sm" value={searchQuery} onChange={setSearchQuery} />
            </div>
            {canWrite && (
              <Button variant="primary"
                className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold whitespace-nowrap"
                onClick={() => {
                  if (activeTab === 'interventions') { navigate('/dashboard/interventions'); }
                  else { setCreateForm({ ...EMPTY_FORM, type_contrat: activeTab === 'ventes' ? 'vente' : 'location' }); setShowCreateModal(true); }
                }}>
                <Plus size={18} className="mr-2" /> Nouveau
              </Button>
            )}
          </div>
        </motion.div>

        {/* Tabs + filtre statut */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-base-100 rounded-2xl p-2 shadow-sm border border-base-200">
          <div role="tablist" aria-label="Type de contrat" className="flex p-1 bg-base-300/50 rounded-xl overflow-x-auto w-full sm:w-auto">
            {([
              { key: 'locations',     icon: <FileText size={18} />, label: 'Locations',     count: contratsLocations.length, loading: leasesLoading },
              { key: 'ventes',        icon: <Wallet size={18} />,   label: 'Ventes',        count: contratsVentes.length,    loading: leasesLoading },
              { key: 'interventions', icon: <Clock size={18} />,    label: 'Interventions', count: filteredTickets.length,   loading: ticketsLoading },
            ] as const).map(tab => (
              <button key={tab.key} type="button" role="tab" aria-selected={activeTab === tab.key}
                onClick={() => { setActiveTab(tab.key); setStatutFilter(''); }}
                className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${activeTab === tab.key ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content/80'}`}>
                {tab.icon} {tab.label}
                {!tab.loading && <span className={`badge badge-sm ${activeTab === tab.key ? 'badge-primary' : ''}`}>{tab.count}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-56">
            <Filter size={16} className="text-base-content/40 shrink-0" />
            <Select options={statutOptions} value={statutFilter} onChange={e => setStatutFilter(e.target.value)} placeholder="Tous les statuts" />
          </div>
        </motion.div>

        {/* Erreur */}
        {hasError && (
          <motion.div variants={itemVariants} className="alert alert-error">
            <AlertCircle size={18} />
            <span>Erreur de chargement des contrats. Vérifiez votre connexion.</span>
          </motion.div>
        )}

        {/* KPIs */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <KPICard icon={FileCheck} label="Contrats Actifs"      value={leasesLoading ? '…' : activeContracts.toString()}          color="green" />
          <KPICard icon={Clock}     label="Finissant ce mois"    value={leasesLoading ? '…' : expiringThisMonth.toString()}         color="orange" />
          <KPICard icon={Wallet}    label="Loyers actifs / mois" value={leasesLoading ? '…' : `${formatMontant(totalLoyer)} F`}    color="blue" />
        </motion.div>

        {/* Table */}
        <motion.div variants={itemVariants}>
          <ContratsTable
            activeTab={activeTab}
            isLoading={isLoading}
            locations={contratsLocations}
            ventes={contratsVentes}
            tickets={filteredTickets}
            searchQuery={searchQuery}
            statutFilter={statutFilter}
            onViewLease={setSelectedLease}
          />
        </motion.div>
      </motion.div>

      <ContratDetailModal lease={selectedLease} onClose={() => setSelectedLease(null)} />
    </>
  );
};

export default Contrats;
