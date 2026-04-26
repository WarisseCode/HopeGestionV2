// frontend/src/pages/Contrats.tsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Eye,
  Home,
  Wallet,
  Download,
  Clock,
  FileCheck,
  Loader2,
  AlertCircle,
  Wrench,
  Filter,
  User,
  Building2,
  CalendarDays,
  Banknote,
  ExternalLink,
  Phone,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
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

// ── Types ──────────────────────────────────────────────────────────────────────
type TabKey = 'locations' | 'ventes' | 'interventions';

// ── Helpers ────────────────────────────────────────────────────────────────────
const statutBadge = (statut: string) => {
  const map: Record<string, string> = {
    actif:    'badge-success',
    signe:    'badge-info',
    resilie:  'badge-error',
    expire:   'badge-error',
    en_cours: 'badge-warning',
    termine:  'badge-neutral',
    ouvert:   'badge-warning',
    ferme:    'badge-neutral',
  };
  return map[statut?.toLowerCase()] ?? 'badge-ghost';
};

const formatMontant = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString();
};

// ── Types form création ────────────────────────────────────────────────────────
type TypeContrat = 'location' | 'vente';

const EMPTY_FORM: CreateLocationData & { owner_id: number } = {
  type_contrat: 'location',
  tenant_id:    0,
  lot_id:       0,
  owner_id:     0,
  date_debut:   '',
  date_fin:     '',
  duree_contrat:         12,
  loyer_mensuel:         0,
  prix_vente:            0,
  caution:               0,
  avance:                0,
  charges_mensuelles:    0,
  devise:                'XOF',
};

// ── Component ──────────────────────────────────────────────────────────────────
const Contrats: React.FC = () => {
  const { user } = useUser();
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const canWrite      = !['proprietaire', 'locataire'].includes(user?.userType || '');

  const [activeTab,       setActiveTab]       = useState<TabKey>('locations');
  const [searchQuery,     setSearchQuery]     = useState('');
  const [statutFilter,    setStatutFilter]    = useState('');
  const [selectedLease,   setSelectedLease]   = useState<Location | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm,      setCreateForm]      = useState({ ...EMPTY_FORM });

  // ── Data fetching ─────────────────────────────────────────────────────────
  const {
    data: allLeases = [],
    isLoading: leasesLoading,
    error: leasesError,
  } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn:  () => locationApi.getLocations(),
    staleTime: 30_000,
  });

  const {
    data: ticketsData,
    isLoading: ticketsLoading,
    error: ticketsError,
  } = useQuery({
    queryKey: ['tickets', { limit: 200 }],
    queryFn:  () => interventionApi.getTickets({ limit: 200 }),
    staleTime: 30_000,
  });

  // Chargés uniquement quand le modal de création est ouvert
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

  // Mutation de création
  const createMutation = useMutation({
    mutationFn: (data: CreateLocationData) => locationApi.createLocation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      toast.success('Contrat créé avec succès !');
      setShowCreateModal(false);
      setCreateForm({ ...EMPTY_FORM });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Erreur lors de la création');
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...createForm,
      tenant_id: Number(createForm.tenant_id),
      lot_id:    Number(createForm.lot_id),
      owner_id:  Number(createForm.owner_id),
    } as CreateLocationData);
  };

  const tickets = ticketsData?.data ?? [];

  // ── Per-tab loading (B5) ──────────────────────────────────────────────────
  const isLoading = activeTab === 'interventions' ? ticketsLoading : leasesLoading;
  const hasError  = leasesError || ticketsError;

  // ── Filtered data ─────────────────────────────────────────────────────────
  const applyLeaseFilters = (base: Location[]) => {
    let result = base;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.reference_bail?.toLowerCase().includes(q)       ||
        l.locataire_nom?.toLowerCase().includes(q)        ||
        l.locataire_prenoms?.toLowerCase().includes(q)    ||
        l.immeuble_nom?.toLowerCase().includes(q)         ||
        l.ref_lot?.toLowerCase().includes(q)
      );
    }
    if (statutFilter) result = result.filter(l => l.statut === statutFilter);
    return result;
  };

  const contratsLocations = useMemo(() =>
    applyLeaseFilters(allLeases.filter(l => !l.type_contrat || l.type_contrat === 'location')),
    [allLeases, searchQuery, statutFilter]
  );

  const contratsVentes = useMemo(() =>
    applyLeaseFilters(allLeases.filter(l => l.type_contrat === 'vente')),
    [allLeases, searchQuery, statutFilter]
  );

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t: any) =>
        t.description?.toLowerCase().includes(q)    ||
        t.building_name?.toLowerCase().includes(q)  ||
        t.ref_lot?.toLowerCase().includes(q)        ||
        t.provider_name?.toLowerCase().includes(q)
      );
    }
    if (statutFilter) result = result.filter((t: any) => t.statut === statutFilter);
    return result;
  }, [tickets, searchQuery, statutFilter]);

  // ── KPIs (B6 — normalize now to midnight) ────────────────────────────────
  const today      = new Date(); today.setHours(0, 0, 0, 0);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  const activeContracts  = allLeases.filter(l => ['actif', 'signe'].includes(l.statut)).length;
  const expiringThisMonth = allLeases.filter(l => {
    if (!l.date_fin) return false;
    const fin = new Date(l.date_fin);
    return fin >= today && fin <= endOfMonth;
  }).length;
  const totalLoyer = allLeases
    .filter(l => l.statut === 'actif' && (!l.type_contrat || l.type_contrat === 'location'))
    .reduce((acc, l) => acc + Number(l.loyer_mensuel ?? 0), 0);

  const handleNewContrat = () => {
    if (activeTab === 'interventions') {
      navigate('/dashboard/interventions');
    } else {
      setCreateForm({ ...EMPTY_FORM, type_contrat: activeTab === 'ventes' ? 'vente' : 'location' });
      setShowCreateModal(true);
    }
  };

  // ── Statut options (U3) ───────────────────────────────────────────────────
  const leaseStatutOptions = [
    { value: '',        label: 'Tous les statuts' },
    { value: 'actif',   label: 'Actif' },
    { value: 'signe',   label: 'Signé' },
    { value: 'resilie', label: 'Résilié' },
    { value: 'expire',  label: 'Expiré' },
  ];
  const ticketStatutOptions = [
    { value: '',        label: 'Tous les statuts' },
    { value: 'ouvert',  label: 'Ouvert' },
    { value: 'en_cours','label': 'En cours' },
    { value: 'ferme',   label: 'Fermé' },
  ];
  const statutOptions = activeTab === 'interventions' ? ticketStatutOptions : leaseStatutOptions;

  // ── Column headers per tab (B1) ───────────────────────────────────────────
  const columnHeaders: Record<TabKey, string[]> = {
    locations:     ['Référence', 'Locataire & Bien',  'Période',    'Loyer/mois',  'Statut', 'Actions'],
    ventes:        ['Référence', 'Acheteur & Bien',   'Signé le',   'Prix',        'Statut', 'Actions'],
    interventions: ['Référence', 'Description & Bien','Date',       'Prestataire', 'Statut', 'Actions'],
  };

  const containerVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  return (
    <>
    <motion.div
      className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-base-content tracking-tight">
            Gestion des Contrats <span className="text-primary">.</span>
          </h1>
          <p className="text-base-content/60 font-medium mt-1">
            Centralisez et gérez tous vos contrats de location, vente et intervention.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* SearchInput visible sur tous les écrans (U1) */}
          <div className="w-full md:w-64">
            <SearchInput
              placeholder="Rechercher…"
              size="sm"
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
            />
          </div>
          {canWrite && (
            <Button
              variant="primary"
              className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold whitespace-nowrap"
              onClick={handleNewContrat}
            >
              <Plus size={18} className="mr-2" />
              Nouveau
            </Button>
          )}
        </div>
      </motion.div>

      {/* ── Tabs + filtre statut ── */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-base-100 rounded-2xl p-2 shadow-sm border border-base-200">
        {/* Tabs (A1) */}
        <div
          role="tablist"
          aria-label="Type de contrat"
          className="flex p-1 bg-base-300/50 rounded-xl overflow-x-auto w-full sm:w-auto"
        >
          {([
            { key: 'locations',     icon: <FileText size={18} />, label: 'Locations',     count: contratsLocations.length, loading: leasesLoading },
            { key: 'ventes',        icon: <Wallet size={18} />,   label: 'Ventes',        count: contratsVentes.length,    loading: leasesLoading },
            { key: 'interventions', icon: <Clock size={18} />,    label: 'Interventions', count: filteredTickets.length,   loading: ticketsLoading },
          ] as const).map(tab => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key ? 'true' : 'false'}
              onClick={() => { setActiveTab(tab.key); setStatutFilter(''); }}
              className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-base-100 text-primary shadow-md'
                  : 'text-base-content/60 hover:text-base-content/80'
              }`}
            >
              {tab.icon}
              {tab.label}
              {!tab.loading && (
                <span className={`badge badge-sm ${activeTab === tab.key ? 'badge-primary' : ''}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filtre statut (U3) */}
        <div className="flex items-center gap-2 w-full sm:w-56">
          <Filter size={16} className="text-base-content/40 shrink-0" />
          <Select
            options={statutOptions}
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            placeholder="Tous les statuts"
          />
        </div>
      </motion.div>

      {/* ── Erreur ── */}
      {hasError && (
        <motion.div variants={itemVariants} className="alert alert-error">
          <AlertCircle size={18} />
          <span>Erreur de chargement des contrats. Vérifiez votre connexion.</span>
        </motion.div>
      )}

      {/* ── KPIs (U5 — loyers uniquement, sémantiquement cohérent) ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard
          icon={FileCheck}
          label="Contrats Actifs"
          value={leasesLoading ? '…' : activeContracts.toString()}
          color="green"
        />
        <KPICard
          icon={Clock}
          label="Finissant ce mois"
          value={leasesLoading ? '…' : expiringThisMonth.toString()}
          color="orange"
        />
        <KPICard
          icon={Wallet}
          label="Loyers actifs / mois"
          value={leasesLoading ? '…' : `${formatMontant(totalLoyer)} F`}
          color="blue"
        />
      </motion.div>

      {/* ── Tableau ── */}
      <motion.div variants={itemVariants}>
        <Card className="border-none shadow-xl bg-base-100 overflow-hidden p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-base-content/50">
              <Loader2 size={24} className="animate-spin" />
              <span>Chargement…</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full" role="grid">
                {/* En-têtes dynamiques par onglet (B1) */}
                <thead className="bg-base-200/50">
                  <tr>
                    {columnHeaders[activeTab].map((col, i, arr) => (
                      <th
                        key={col}
                        className={`py-4 font-semibold text-base-content/60 ${
                          i === 0 ? 'pl-6' : ''
                        } ${i === arr.length - 1 ? 'pr-6 text-right' : ''}`}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-200">

                  {/* ── LOCATIONS ── */}
                  {activeTab === 'locations' && (
                    contratsLocations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-16 text-base-content/40">
                          {searchQuery || statutFilter
                            ? 'Aucun contrat ne correspond aux filtres.'
                            : 'Aucun contrat de location enregistré.'}
                        </td>
                      </tr>
                    ) : contratsLocations.map(item => (
                      <tr key={item.id} className="hover:bg-base-200/50 transition-colors">
                        <td className="pl-6 font-mono text-sm font-medium text-base-content">{item.reference_bail}</td>
                        <td>
                          <div className="font-bold text-base-content/90">
                            {[item.locataire_nom, item.locataire_prenoms].filter(Boolean).join(' ') || '—'}
                          </div>
                          <div className="text-xs text-base-content/50 flex items-center gap-1">
                            <Home size={10} />
                            {[item.ref_lot, item.immeuble_nom].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </td>
                        <td className="text-sm text-base-content/70">
                          {new Date(item.date_debut).toLocaleDateString('fr-FR')}
                          {item.date_fin && ` → ${new Date(item.date_fin).toLocaleDateString('fr-FR')}`}
                        </td>
                        <td className="font-bold text-primary">
                          {item.loyer_mensuel?.toLocaleString()} F
                        </td>
                        <td>
                          <span className={`badge badge-sm ${statutBadge(item.statut)}`}>
                            {item.statut?.toUpperCase()}
                          </span>
                        </td>
                        <td className="pr-6 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost" size="sm"
                              aria-label={`Voir détails du contrat ${item.reference_bail}`}
                              className="w-10 h-10 p-0 flex items-center justify-center rounded-lg text-base-content/70 hover:text-primary hover:bg-primary/10 transition-colors"
                              onClick={() => setSelectedLease(item)}
                            >
                              <Eye size={20} />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              aria-label={`Télécharger contrat ${item.reference_bail}`}
                              className="w-10 h-10 p-0 flex items-center justify-center rounded-lg text-base-content/70 hover:text-primary hover:bg-primary/10 transition-colors"
                              onClick={() => {
                                if (item.signature_url) {
                                  window.open(item.signature_url, '_blank');
                                } else {
                                  toast('Aucun document signé disponible pour ce contrat.');
                                }
                              }}
                            >
                              <Download size={20} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* ── VENTES ── */}
                  {activeTab === 'ventes' && (
                    contratsVentes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-16 text-base-content/40">
                          {searchQuery || statutFilter
                            ? 'Aucun contrat ne correspond aux filtres.'
                            : 'Aucun contrat de vente enregistré.'}
                        </td>
                      </tr>
                    ) : contratsVentes.map(item => (
                      <tr key={item.id} className="hover:bg-base-200/50 transition-colors">
                        <td className="pl-6 font-mono text-sm font-medium text-base-content">{item.reference_bail}</td>
                        <td>
                          <div className="font-bold text-base-content/90">
                            {[item.locataire_nom, item.locataire_prenoms].filter(Boolean).join(' ') || '—'}
                          </div>
                          <div className="text-xs text-base-content/50 flex items-center gap-1">
                            <Home size={10} />
                            {[item.ref_lot, item.immeuble_nom].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </td>
                        <td className="text-sm text-base-content/70">
                          {new Date(item.date_debut).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="font-bold text-success">
                          {item.prix_vente?.toLocaleString()} F
                        </td>
                        <td>
                          <span className={`badge badge-sm ${statutBadge(item.statut)}`}>
                            {item.statut?.toUpperCase()}
                          </span>
                        </td>
                        <td className="pr-6 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost" size="sm"
                              aria-label={`Voir détails du contrat de vente ${item.reference_bail}`}
                              className="w-10 h-10 p-0 flex items-center justify-center rounded-lg text-base-content/70 hover:text-primary hover:bg-primary/10 transition-colors"
                              onClick={() => setSelectedLease(item)}
                            >
                              <Eye size={20} />
                            </Button>
                            <Button
                              variant="ghost" size="sm"
                              aria-label={`Télécharger contrat de vente ${item.reference_bail}`}
                              className="w-10 h-10 p-0 flex items-center justify-center rounded-lg text-base-content/70 hover:text-primary hover:bg-primary/10 transition-colors"
                              onClick={() => {
                                if (item.signature_url) {
                                  window.open(item.signature_url, '_blank');
                                } else {
                                  toast('Aucun document signé disponible pour ce contrat.');
                                }
                              }}
                            >
                              <Download size={20} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}

                  {/* ── INTERVENTIONS ── */}
                  {activeTab === 'interventions' && (
                    filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-16 text-base-content/40">
                          {searchQuery || statutFilter
                            ? 'Aucune intervention ne correspond aux filtres.'
                            : 'Aucune intervention enregistrée.'}
                        </td>
                      </tr>
                    ) : filteredTickets.map((item: any) => (
                      <tr key={item.id} className="hover:bg-base-200/50 transition-colors">
                        <td className="pl-6 font-mono text-sm font-medium text-base-content">
                          INT-{String(item.id).padStart(4, '0')}
                        </td>
                        <td>
                          <div className="font-bold text-base-content/90 flex items-center gap-1.5">
                            <Wrench size={14} className="text-base-content/40 shrink-0" />
                            {item.description || '—'}
                          </div>
                          <div className="text-xs text-base-content/50 flex items-center gap-1">
                            <Home size={10} />
                            {[item.ref_lot, item.building_name].filter(Boolean).join(' · ') || '—'}
                          </div>
                        </td>
                        <td className="text-sm text-base-content/70">
                          {item.date_creation
                            ? new Date(item.date_creation).toLocaleDateString('fr-FR')
                            : '—'}
                        </td>
                        <td className="text-sm text-base-content/70">
                          {item.provider_name || (
                            <span className="italic opacity-50">Non assigné</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge badge-sm ${statutBadge(item.statut)}`}>
                            {item.statut?.toUpperCase() || 'OUVERT'}
                          </span>
                        </td>
                        <td className="pr-6 text-right">
                          <Button
                            variant="ghost" size="sm"
                            aria-label={`Voir ticket INT-${String(item.id).padStart(4, '0')}`}
                            className="w-10 h-10 p-0 flex items-center justify-center rounded-lg text-base-content/70 hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => navigate(`/dashboard/interventions`)}
                          >
                            <Eye size={20} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}

                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>

    {/* ── Modal création contrat ── */}
    <Modal
      isOpen={showCreateModal}
      onClose={() => setShowCreateModal(false)}
      title="Nouveau contrat"
      size="lg"
      footer={
        <>
          <Button variant="ghost" type="button" onClick={() => setShowCreateModal(false)}>
            Annuler
          </Button>
          <Button
            variant="primary"
            type="submit"
            form="create-contrat-form"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? <Loader2 size={16} className="animate-spin mr-2" /> : <Plus size={16} className="mr-2" />}
            Créer le contrat
          </Button>
        </>
      }
    >
      <form id="create-contrat-form" onSubmit={handleCreateSubmit} className="space-y-5">
        {/* Type de contrat */}
        <div className="flex gap-3">
          {(['location', 'vente'] as TypeContrat[]).map(type => (
            <button
              key={type}
              type="button"
              onClick={() => setCreateForm(f => ({ ...f, type_contrat: type }))}
              className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-all capitalize ${
                createForm.type_contrat === type
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-base-300 text-base-content/50 hover:border-base-400'
              }`}
            >
              {type === 'location' ? 'Bail de location' : 'Contrat de vente'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Locataire / Acheteur */}
          <div className="flex flex-col gap-1">
            <label htmlFor="form-tenant" className="text-sm font-semibold text-base-content/70">
              {createForm.type_contrat === 'vente' ? 'Acheteur' : 'Locataire'} <span className="text-error">*</span>
            </label>
            <select
              id="form-tenant"
              required
              className="select select-bordered w-full"
              value={createForm.tenant_id || ''}
              onChange={e => setCreateForm(f => ({ ...f, tenant_id: Number(e.target.value) }))}
            >
              <option value="">Sélectionner…</option>
              {locataires.map(l => (
                <option key={l.id} value={l.id}>
                  {l.nom} {l.prenoms}
                </option>
              ))}
            </select>
          </div>

          {/* Bien / Lot */}
          <div className="flex flex-col gap-1">
            <label htmlFor="form-lot" className="text-sm font-semibold text-base-content/70">
              Bien (lot) <span className="text-error">*</span>
            </label>
            <select
              id="form-lot"
              required
              className="select select-bordered w-full"
              value={createForm.lot_id || ''}
              onChange={e => {
                const lotId = Number(e.target.value);
                const lot = lots.find(l => l.id === lotId);
                setCreateForm(f => ({ ...f, lot_id: lotId, owner_id: lot?.owner_id ?? f.owner_id }));
              }}
            >
              <option value="">Sélectionner…</option>
              {lots.length === 0 && (
                <option disabled>Aucun lot trouvé</option>
              )}
              {lots.map(l => {
                const dispo = ['libre', 'disponible'].includes(l.statut?.toLowerCase());
                return (
                  <option key={l.id} value={l.id} disabled={!dispo}>
                    {l.reference} — {l.immeuble}{!dispo ? ` (${l.statut})` : ''}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Date début */}
          <Input
            label="Date de début"
            required
            type="date"
            value={createForm.date_debut}
            onChange={e => setCreateForm(f => ({ ...f, date_debut: e.target.value }))}
          />

          {/* Date fin */}
          <Input
            label="Date de fin"
            type="date"
            value={createForm.date_fin as string}
            onChange={e => setCreateForm(f => ({ ...f, date_fin: e.target.value }))}
          />

          {/* Durée */}
          <Input
            label="Durée (mois)"
            type="number"
            min={1}
            value={createForm.duree_contrat ?? ''}
            onChange={e => setCreateForm(f => ({ ...f, duree_contrat: Number(e.target.value) }))}
          />

          {/* Devise */}
          <div className="flex flex-col gap-1">
            <label htmlFor="form-devise" className="text-sm font-semibold text-base-content/70">Devise</label>
            <select
              id="form-devise"
              className="select select-bordered w-full"
              value={createForm.devise}
              onChange={e => setCreateForm(f => ({ ...f, devise: e.target.value }))}
            >
              <option value="XOF">XOF (FCFA)</option>
              <option value="EUR">EUR (€)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>

          {/* Loyer — location uniquement */}
          {createForm.type_contrat === 'location' && (
            <Input
              label="Loyer mensuel"
              required
              type="number"
              min={0}
              value={createForm.loyer_mensuel || ''}
              onChange={e => setCreateForm(f => ({ ...f, loyer_mensuel: Number(e.target.value) }))}
              endIcon={<span className="text-xs text-base-content/40">{createForm.devise}</span>}
            />
          )}

          {/* Prix de vente — vente uniquement */}
          {createForm.type_contrat === 'vente' && (
            <Input
              label="Prix de vente"
              required
              type="number"
              min={0}
              value={createForm.prix_vente || ''}
              onChange={e => setCreateForm(f => ({ ...f, prix_vente: Number(e.target.value) }))}
              endIcon={<span className="text-xs text-base-content/40">{createForm.devise}</span>}
            />
          )}

          {/* Caution */}
          <Input
            label="Caution"
            type="number"
            min={0}
            value={createForm.caution || ''}
            onChange={e => setCreateForm(f => ({ ...f, caution: Number(e.target.value) }))}
            endIcon={<span className="text-xs text-base-content/40">{createForm.devise}</span>}
          />

          {/* Avance */}
          <Input
            label="Avance"
            type="number"
            min={0}
            value={createForm.avance || ''}
            onChange={e => setCreateForm(f => ({ ...f, avance: Number(e.target.value) }))}
            endIcon={<span className="text-xs text-base-content/40">{createForm.devise}</span>}
          />

          {/* Charges — location uniquement */}
          {createForm.type_contrat === 'location' && (
            <Input
              label="Charges mensuelles"
              type="number"
              min={0}
              value={createForm.charges_mensuelles || ''}
              onChange={e => setCreateForm(f => ({ ...f, charges_mensuelles: Number(e.target.value) }))}
              endIcon={<span className="text-xs text-base-content/40">{createForm.devise}</span>}
            />
          )}
        </div>
      </form>
    </Modal>

    {/* ── Modal détail contrat ── */}

    <Modal
      isOpen={!!selectedLease}
      onClose={() => setSelectedLease(null)}
      title={selectedLease?.reference_bail ?? ''}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={() => setSelectedLease(null)}>Fermer</Button>
          <Button
            variant="primary"
            onClick={() => {
              window.open(`/dashboard/locations/${selectedLease?.id}`, '_blank');
            }}
          >
            <ExternalLink size={16} className="mr-2" />
            Fiche complète
          </Button>
        </>
      }
    >
      {selectedLease && (
        <div className="space-y-6">
          {/* Badge type + statut */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge badge-outline badge-lg capitalize">
              {selectedLease.type_contrat === 'vente' ? 'Vente' : 'Location'}
            </span>
            <span className={`badge badge-lg ${statutBadge(selectedLease.statut)}`}>
              {selectedLease.statut?.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ── Locataire / Acheteur ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-wider flex items-center gap-2">
                <User size={14} /> {selectedLease.type_contrat === 'vente' ? 'Acheteur' : 'Locataire'}
              </h3>
              <div className="bg-base-200/50 rounded-xl p-4 space-y-2">
                <p className="font-bold text-base-content text-lg">
                  {[selectedLease.locataire_nom, selectedLease.locataire_prenoms].filter(Boolean).join(' ') || '—'}
                </p>
                {selectedLease.locataire_telephone && (
                  <p className="text-sm text-base-content/60 flex items-center gap-2">
                    <Phone size={14} /> {selectedLease.locataire_telephone}
                  </p>
                )}
              </div>
            </div>

            {/* ── Bien ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-wider flex items-center gap-2">
                <Building2 size={14} /> Bien immobilier
              </h3>
              <div className="bg-base-200/50 rounded-xl p-4 space-y-2">
                <p className="font-bold text-base-content">
                  {selectedLease.immeuble_nom || '—'}
                </p>
                <p className="text-sm text-base-content/60 flex items-center gap-2">
                  <Home size={14} />
                  {[selectedLease.ref_lot, selectedLease.lot_type].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
            </div>

            {/* ── Période ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-wider flex items-center gap-2">
                <CalendarDays size={14} /> Période
              </h3>
              <div className="bg-base-200/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">Début</span>
                  <span className="font-semibold">{new Date(selectedLease.date_debut).toLocaleDateString('fr-FR')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">Fin</span>
                  <span className="font-semibold">
                    {selectedLease.date_fin
                      ? new Date(selectedLease.date_fin).toLocaleDateString('fr-FR')
                      : 'Indéterminée'}
                  </span>
                </div>
                {selectedLease.duree_contrat && (
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/60">Durée</span>
                    <span className="font-semibold">{selectedLease.duree_contrat} mois</span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Financier ── */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-base-content/50 uppercase tracking-wider flex items-center gap-2">
                <Banknote size={14} /> Financier
              </h3>
              <div className="bg-base-200/50 rounded-xl p-4 space-y-2">
                {selectedLease.type_contrat === 'vente' ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/60">Prix de vente</span>
                    <span className="font-bold text-success text-base">
                      {Number(selectedLease.prix_vente ?? 0).toLocaleString()} F
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-base-content/60">Loyer mensuel</span>
                      <span className="font-bold text-primary text-base">
                        {Number(selectedLease.loyer_mensuel ?? 0).toLocaleString()} F
                      </span>
                    </div>
                    {Number(selectedLease.charges_mensuelles) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-base-content/60">Charges</span>
                        <span className="font-semibold">{Number(selectedLease.charges_mensuelles).toLocaleString()} F</span>
                      </div>
                    )}
                  </>
                )}
                {Number(selectedLease.caution) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/60">Caution</span>
                    <span className="font-semibold">{Number(selectedLease.caution).toLocaleString()} F</span>
                  </div>
                )}
                {Number(selectedLease.avance) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-base-content/60">Avance</span>
                    <span className="font-semibold">{Number(selectedLease.avance).toLocaleString()} F</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-base-content/60">Devise</span>
                  <span className="font-semibold">{selectedLease.devise || 'XOF'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Propriétaire ── */}
          {selectedLease.proprietaire_nom && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-base-content/60">Propriétaire</span>
              <span className="font-semibold text-primary">{selectedLease.proprietaire_nom}</span>
            </div>
          )}

          {/* ── Document signé ── */}
          {selectedLease.signature_url && (
            <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-success font-medium">✍️ Contrat signé électroniquement</span>
              <Button
                variant="ghost" size="sm"
                onClick={() => window.open(selectedLease.signature_url, '_blank')}
              >
                <Download size={16} className="mr-1" /> Télécharger
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
    </>
  );
};

export default Contrats;
