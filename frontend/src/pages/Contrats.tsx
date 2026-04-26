// frontend/src/pages/Contrats.tsx
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  FileText,
  Plus,
  Eye,
  Home,
  Wallet,
  Download,
  Upload,
  Clock,
  XCircle,
  FileCheck,
  Loader2,
  AlertCircle,
  Wrench,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import SearchInput from '../components/ui/SearchInput';
import { useUser } from '../contexts/UserContext';
import { motion, AnimatePresence } from 'framer-motion';
import { KPICard } from '../components/dashboard';
import toast from 'react-hot-toast';
import { locationApi, type Location } from '../api/locationApi';
import { interventionApi } from '../api/interventionApi';

const Contrats: React.FC = () => {
  const { user } = useUser();
  const canWrite = !['proprietaire', 'locataire'].includes(user?.userType || '');

  const [activeTab, setActiveTab] = useState<'locations' | 'ventes' | 'interventions'>('locations');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'location' | 'vente' | 'intervention'>('location');
  const [searchQuery, setSearchQuery] = useState('');

  const [contratForm, setContratForm] = useState({
    reference: '', locataire: '', lot: '', dateDebut: '', dateFin: '', loyer: 0, charges: 0, caution: 0, prixVente: 0, avance: 0, paiementEcheance: false, description: '', cout: 0, fichier: null
  });

  // === DATA FETCHING ===
  const {
    data: allLeases = [],
    isLoading: leasesLoading,
    error: leasesError,
  } = useQuery<Location[]>({
    queryKey: ['locations'],
    queryFn: () => locationApi.getLocations(),
    staleTime: 30_000,
  });

  const {
    data: ticketsData,
    isLoading: ticketsLoading,
    error: ticketsError,
  } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => interventionApi.getTickets({ limit: 100 }),
    staleTime: 30_000,
  });

  const tickets = ticketsData?.data ?? [];

  // === FILTERED DATA ===
  const contratsLocations = useMemo(() => {
    const base = allLeases.filter(l => !l.type_contrat || l.type_contrat === 'location');
    if (!searchQuery) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(l =>
      l.reference_bail?.toLowerCase().includes(q) ||
      l.locataire_nom?.toLowerCase().includes(q) ||
      l.locataire_prenoms?.toLowerCase().includes(q) ||
      l.immeuble_nom?.toLowerCase().includes(q) ||
      l.ref_lot?.toLowerCase().includes(q)
    );
  }, [allLeases, searchQuery]);

  const contratsVentes = useMemo(() => {
    const base = allLeases.filter(l => l.type_contrat === 'vente');
    if (!searchQuery) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(l =>
      l.reference_bail?.toLowerCase().includes(q) ||
      l.locataire_nom?.toLowerCase().includes(q) ||
      l.locataire_prenoms?.toLowerCase().includes(q) ||
      l.immeuble_nom?.toLowerCase().includes(q) ||
      l.ref_lot?.toLowerCase().includes(q)
    );
  }, [allLeases, searchQuery]);

  const filteredTickets = useMemo(() => {
    if (!searchQuery) return tickets;
    const q = searchQuery.toLowerCase();
    return tickets.filter((t: any) =>
      t.description?.toLowerCase().includes(q) ||
      t.building_name?.toLowerCase().includes(q) ||
      t.ref_lot?.toLowerCase().includes(q) ||
      t.provider_name?.toLowerCase().includes(q)
    );
  }, [tickets, searchQuery]);

  // === KPIs ===
  const activeContracts = allLeases.filter(l => ['actif', 'signe'].includes(l.statut)).length;
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const expiringThisMonth = allLeases.filter(l => {
    if (!l.date_fin) return false;
    const fin = new Date(l.date_fin);
    return fin >= now && fin <= endOfMonth;
  }).length;
  const totalValeur = allLeases
    .filter(l => ['actif', 'signe'].includes(l.statut))
    .reduce((acc, l) => acc + (l.type_contrat === 'vente' ? (l.prix_vente ?? 0) : (l.loyer_mensuel ?? 0)), 0);

  const formatMontant = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
    return n.toLocaleString();
  };

  const statutBadge = (statut: string) => {
    const map: Record<string, string> = {
      actif: 'badge-success',
      signe: 'badge-info',
      resilie: 'badge-error',
      expire: 'badge-error',
      en_cours: 'badge-warning',
      termine: 'badge-neutral',
      ouvert: 'badge-warning',
      ferme: 'badge-neutral',
    };
    return map[statut?.toLowerCase()] ?? 'badge-ghost';
  };

  const isLoading = leasesLoading || ticketsLoading;
  const hasError = leasesError || ticketsError;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <motion.div
      className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
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
          <div className="hidden md:block w-64">
            <SearchInput
              placeholder="Rechercher un contrat..."
              size="sm"
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
            />
          </div>
          {canWrite && (
            <Button
              variant="primary"
              className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
              onClick={() => {
                setFormType(activeTab === 'locations' ? 'location' : activeTab === 'ventes' ? 'vente' : 'intervention');
                setShowForm(true);
              }}
            >
              <Plus size={18} className="mr-2" />
              Nouveau Contrat
            </Button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center bg-base-100 rounded-2xl p-2 shadow-sm border border-base-200">
        <div className="flex p-1 bg-base-300/50 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveTab('locations')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'locations' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content/80'
            }`}
          >
            <FileText size={18} />
            Locations {!leasesLoading && <span className="badge badge-sm">{contratsLocations.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('ventes')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'ventes' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content/80'
            }`}
          >
            <Wallet size={18} />
            Ventes {!leasesLoading && <span className="badge badge-sm">{contratsVentes.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('interventions')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'interventions' ? 'bg-base-100 text-primary shadow-md' : 'text-base-content/60 hover:text-base-content/80'
            }`}
          >
            <Clock size={18} />
            Interventions {!ticketsLoading && <span className="badge badge-sm">{filteredTickets.length}</span>}
          </button>
        </div>
      </motion.div>

      {/* Error state */}
      {hasError && (
        <motion.div variants={itemVariants} className="alert alert-error">
          <AlertCircle size={18} />
          <span>Erreur de chargement des contrats. Vérifiez votre connexion.</span>
        </motion.div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="border-none shadow-xl bg-base-100/80 backdrop-blur-sm">
              <div className="flex justify-between items-center mb-6 pb-6 border-b border-base-200">
                <h2 className="text-xl font-bold text-base-content/90">
                  {formType === 'location' ? 'Contrat de Location' :
                   formType === 'vente' ? 'Contrat de Vente' :
                   "Contrat d'Intervention"}
                </h2>
                <Button variant="ghost" onClick={() => setShowForm(false)} className="btn-circle btn-sm">
                  <XCircle size={24} className="text-base-content/50" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <>
                  <Input label="Référence" value={contratForm.reference} onChange={(e) => setContratForm({...contratForm, reference: e.target.value})} placeholder="Auto-généré" />
                  <Input label="Partie B (Locataire/Acheteur)" value={contratForm.locataire} onChange={(e) => setContratForm({...contratForm, locataire: e.target.value})} />

                  <div>
                    <label className="block text-sm font-bold text-base-content/80 mb-2">Bien Immobilier</label>
                    <select className="select select-bordered w-full bg-base-200" value={contratForm.lot} onChange={(e) => setContratForm({...contratForm, lot: e.target.value})}>
                      <option value="">Sélectionner...</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Date Début" type="date" value={contratForm.dateDebut} onChange={(e) => setContratForm({...contratForm, dateDebut: e.target.value})} />
                    <Input label="Date Fin" type="date" value={contratForm.dateFin} onChange={(e) => setContratForm({...contratForm, dateFin: e.target.value})} />
                  </div>

                  {formType !== 'intervention' && (
                    <Input
                      label={formType === 'vente' ? "Prix de Vente" : "Loyer Mensuel"}
                      type="number"
                      value={formType === 'vente' ? contratForm.prixVente : contratForm.loyer}
                      onChange={(e) => setContratForm(formType === 'vente' ? {...contratForm, prixVente: parseFloat(e.target.value)} : {...contratForm, loyer: parseFloat(e.target.value)})}
                    />
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-base-content/80 mb-2">Document numérisé (PDF)</label>
                    <div className="h-32 border-2 border-dashed border-base-300 rounded-xl flex items-center justify-center text-base-content/50 cursor-pointer hover:bg-base-200 hover:border-primary transition-all">
                      <div className="text-center">
                        <Upload className="mx-auto mb-2" size={24} />
                        <p className="text-sm">Glisser-déposer le contrat signé</p>
                      </div>
                    </div>
                  </div>
                </>
              </div>

              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-base-200">
                <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button variant="primary" onClick={() => setShowForm(false)}>Enregistrer</Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
                label="Valeur Totale"
                value={leasesLoading ? '…' : `${formatMontant(totalValeur)} FCFA`}
                color="blue"
              />
            </div>

            <Card className="border-none shadow-xl bg-base-100 overflow-hidden p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-20 gap-3 text-base-content/50">
                  <Loader2 size={24} className="animate-spin" />
                  <span>Chargement des contrats…</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full">
                    <thead className="bg-base-200/50">
                      <tr>
                        <th className="py-4 pl-6 font-semibold text-base-content/60">Référence</th>
                        <th className="font-semibold text-base-content/60">Parties & Bien</th>
                        <th className="font-semibold text-base-content/60">Période</th>
                        <th className="font-semibold text-base-content/60">Montant</th>
                        <th className="font-semibold text-base-content/60">Statut</th>
                        <th className="pr-6 text-right font-semibold text-base-content/60">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-200">
                      {/* --- LOCATIONS --- */}
                      {activeTab === 'locations' && (
                        contratsLocations.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-16 text-base-content/40">
                              {searchQuery ? 'Aucun contrat ne correspond à la recherche.' : 'Aucun contrat de location enregistré.'}
                            </td>
                          </tr>
                        ) : (
                          contratsLocations.map(item => (
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
                                {item.loyer_mensuel?.toLocaleString()} F/mois
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
                                    className="w-10 h-10 p-0 flex items-center justify-center rounded-lg text-base-content/70 hover:text-primary hover:bg-primary/10 transition-colors"
                                    onClick={() => toast('Visualisation du contrat bientôt disponible.')}
                                    title="Voir le contrat"
                                  >
                                    <Eye size={20} />
                                  </Button>
                                  <Button
                                    variant="ghost" size="sm"
                                    className="w-10 h-10 p-0 flex items-center justify-center rounded-lg text-base-content/70 hover:text-primary hover:bg-primary/10 transition-colors"
                                    onClick={() => toast('Téléchargement bientôt disponible.')}
                                    title="Télécharger"
                                  >
                                    <Download size={20} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )
                      )}

                      {/* --- VENTES --- */}
                      {activeTab === 'ventes' && (
                        contratsVentes.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-16 text-base-content/40">
                              {searchQuery ? 'Aucun contrat ne correspond à la recherche.' : 'Aucun contrat de vente enregistré.'}
                            </td>
                          </tr>
                        ) : (
                          contratsVentes.map(item => (
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
                                Signé le {new Date(item.date_debut).toLocaleDateString('fr-FR')}
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
                                    className="w-10 h-10 p-0 flex items-center justify-center rounded-lg text-base-content/70 hover:text-primary hover:bg-primary/10 transition-colors"
                                    onClick={() => toast('Visualisation du contrat bientôt disponible.')}
                                    title="Voir le contrat"
                                  >
                                    <Eye size={20} />
                                  </Button>
                                  <Button
                                    variant="ghost" size="sm"
                                    className="w-10 h-10 p-0 flex items-center justify-center rounded-lg text-base-content/70 hover:text-primary hover:bg-primary/10 transition-colors"
                                    onClick={() => toast('Téléchargement bientôt disponible.')}
                                    title="Télécharger"
                                  >
                                    <Download size={20} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )
                      )}

                      {/* --- INTERVENTIONS (tickets) --- */}
                      {activeTab === 'interventions' && (
                        filteredTickets.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="text-center py-16 text-base-content/40">
                              {searchQuery ? 'Aucune intervention ne correspond à la recherche.' : 'Aucune intervention enregistrée.'}
                            </td>
                          </tr>
                        ) : (
                          filteredTickets.map((item: any) => (
                            <tr key={item.id} className="hover:bg-base-200/50 transition-colors">
                              <td className="pl-6 font-mono text-sm font-medium text-base-content">
                                INT-{String(item.id).padStart(4, '0')}
                              </td>
                              <td>
                                <div className="font-bold text-base-content/90 flex items-center gap-1.5">
                                  <Wrench size={14} className="text-base-content/40" />
                                  {item.description || '—'}
                                </div>
                                <div className="text-xs text-base-content/50 flex items-center gap-1">
                                  <Home size={10} />
                                  {[item.ref_lot, item.building_name].filter(Boolean).join(' · ') || '—'}
                                </div>
                              </td>
                              <td className="text-sm text-base-content/70">
                                {item.date_creation ? new Date(item.date_creation).toLocaleDateString('fr-FR') : '—'}
                              </td>
                              <td className="text-sm text-base-content/70">
                                {item.provider_name || <span className="italic opacity-50">Non assigné</span>}
                              </td>
                              <td>
                                <span className={`badge badge-sm ${statutBadge(item.statut)}`}>
                                  {item.statut?.toUpperCase() || 'OUVERT'}
                                </span>
                              </td>
                              <td className="pr-6 text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost" size="sm"
                                    className="w-10 h-10 p-0 flex items-center justify-center rounded-lg text-base-content/70 hover:text-primary hover:bg-primary/10 transition-colors"
                                    onClick={() => toast('Visualisation bientôt disponible.')}
                                    title="Voir le ticket"
                                  >
                                    <Eye size={20} />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Contrats;
