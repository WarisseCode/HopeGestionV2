// frontend/src/pages/Contrats.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import SearchInput from '../components/ui/SearchInput';
import Select from '../components/ui/Select';
import { useUser } from '../contexts/UserContext';
import { motion } from 'framer-motion';
import { KPICard } from '../components/dashboard';
import toast from 'react-hot-toast';
import { locationApi, type Location } from '../api/locationApi';
import { interventionApi } from '../api/interventionApi';

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

// ── Component ──────────────────────────────────────────────────────────────────
const Contrats: React.FC = () => {
  const { user } = useUser();
  const navigate  = useNavigate();
  const canWrite  = !['proprietaire', 'locataire'].includes(user?.userType || '');

  const [activeTab,    setActiveTab]    = useState<TabKey>('locations');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [statutFilter, setStatutFilter] = useState('');

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

  // ── Navigation vers pages de création réelles (B2 / U2) ──────────────────
  const handleNewContrat = () => {
    if (activeTab === 'interventions') {
      navigate('/dashboard/interventions');
    } else {
      navigate('/dashboard/locations');
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
                              onClick={() => navigate(`/dashboard/locations/${item.id}`)}
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
                              onClick={() => navigate(`/dashboard/locations/${item.id}`)}
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
  );
};

export default Contrats;
