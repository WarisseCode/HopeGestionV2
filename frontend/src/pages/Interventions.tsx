import React, { useState, useEffect, useRef } from 'react';
import { 
  Wrench, Plus, Eye, Trash2, Calendar, Phone, FileText, 
  CheckCircle, AlertCircle, Search, Users, XCircle, Download,
  Filter, Clock, PauseCircle, CheckCheck, Archive, Camera, Image,
  Building, Home, RefreshCw
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { KPICard } from '../components/dashboard';
import { interventionApi } from '../api/interventionApi';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { API_URL } from '../config';
import { getToken } from '../api/authApi';

// Types
interface Ticket {
  id: number;
  lot_id: number;
  titre: string;
  category: string;
  description: string;
  priorite: string;
  urgency: string;
  statut: string;
  provider_id: number | null;
  provider_name: string | null;
  scheduled_date: string | null;
  cost_estimated: number;
  cost_real: number;
  photos_before: string[];
  photos_after: string[];
  requester_name: string;
  requester_phone: string;
  date_creation: string;
  ref_lot: string;
  building_name: string;
  tenant_name: string;
  tenant_surname: string;
}

interface Provider {
  id: number;
  name: string;
  specialty: string;
  contact_name: string;
  phone: string;
  email: string;
  address: string;
  status: string;
}

interface Lot {
  id: number;
  ref_lot: string;
  building_name: string;
}

interface ServiceContract {
  id: number;
  title: string;
  provider_name: string;
  cost_monthly: number;
  start_date: string;
  end_date: string;
  status: string;
}

// Status configuration
const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  'Ouvert': { color: 'text-teal-700', bg: 'bg-teal-100', icon: AlertCircle },
  'En cours': { color: 'text-orange-700', bg: 'bg-orange-100', icon: Clock },
  'En attente': { color: 'text-yellow-700', bg: 'bg-yellow-100', icon: PauseCircle },
  'Résolu': { color: 'text-green-700', bg: 'bg-green-100', icon: CheckCheck },
  'Clos': { color: 'text-base-content/70', bg: 'bg-base-300', icon: Archive },
};

const PRIORITY_CONFIG: Record<string, string> = {
  'Basse': 'badge-info',
  'Moyenne': 'badge-warning',
  'Haute': 'badge-error',
  'Urgente': 'badge-error animate-pulse',
};

const CATEGORIES = ['Maintenance corrective', 'Maintenance préventive', 'Services connexes'];
const CATEGORY_EXAMPLES = {
  'Maintenance corrective': ['Fuite d\'eau', 'Coupure électrique', 'Serrure cassée'],
  'Maintenance préventive': ['Révision chaudière', 'Entretien climatisation'],
  'Services connexes': ['Nettoyage cour', 'Gardiennage', 'Vidange fosse septique', 'Jardinage'],
};

const Interventions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'demandes' | 'interventions' | 'partenaires' | 'contrats'>('demandes');
  
  // Data
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [contracts, setContracts] = useState<ServiceContract[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterStatut, setFilterStatut] = useState('');
  const [filterPriorite, setFilterPriorite] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Forms
  const [ticketForm, setTicketForm] = useState({
    lot_id: '',
    type: '',
    category: 'Maintenance corrective',
    description: '',
    priorite: 'Moyenne',
    urgency: 'Moyenne',
    requester_name: '',
    requester_phone: '',
    photos_before: [] as string[],
  });

  const [assignForm, setAssignForm] = useState({
    provider_id: '',
    scheduled_date: '',
    cost_estimated: 0,
  });

  const [closeForm, setCloseForm] = useState({
    actions_done: '',
    cost_real: 0,
    comments: '',
    photos_after: [] as string[],
  });

  const [rescheduleForm, setRescheduleForm] = useState({
    new_date: '',
    reason: '',
  });

  const [providerForm, setProviderForm] = useState({
    name: '',
    specialty: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
  });

  const [contractForm, setContractForm] = useState({
    provider_id: '',
    title: '',
    description: '',
    cost_monthly: 0,
    start_date: '',
    end_date: '',
  });

  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoAfterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [ticketsRes, providersRes, lotsRes, contractsRes] = await Promise.all([
        fetch(`${API_URL}/tickets`, { headers }),
        fetch(`${API_URL}/providers`, { headers }),
        fetch(`${API_URL}/lots`, { headers }),
        fetch(`${API_URL}/service-contracts`, { headers }),
      ]);

      if (ticketsRes.ok) setTickets(await ticketsRes.json());
      if (providersRes.ok) setProviders(await providersRes.json());
      if (lotsRes.ok) setLots(await lotsRes.json());
      if (contractsRes.ok) setContracts(await contractsRes.json());
    } catch (e) {
      console.error(e);
      toast.error("Erreur chargement données");
    } finally {
      setLoading(false);
    }
  };

  // Photo handling
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after') => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === 'before') {
          setTicketForm(prev => ({ ...prev, photos_before: [...prev.photos_before, base64] }));
        } else {
          setCloseForm(prev => ({ ...prev, photos_after: [...prev.photos_after, base64] }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // CRUD Operations
  const handleCreateTicket = async () => {
    try {
      await interventionApi.createTicket(ticketForm);
      toast.success("Demande créée");
      setShowCreateModal(false);
      setTicketForm({ lot_id: '', type: '', category: 'Maintenance corrective', description: '', priorite: 'Moyenne', urgency: 'Moyenne', requester_name: '', requester_phone: '', photos_before: [] });
      fetchData();
    } catch (e) {
      toast.error("Erreur création");
    }
  };

  const handleAssign = async () => {
    if (!selectedTicket) return;
    try {
      await interventionApi.updateTicket(selectedTicket.id, {
        provider_id: parseInt(assignForm.provider_id),
        scheduled_date: assignForm.scheduled_date,
        cost_estimated: assignForm.cost_estimated,
        statut: 'En cours'
      });
      toast.success("Intervention assignée");
      setShowAssignModal(false);
      fetchData();
    } catch (e) {
      toast.error("Erreur assignation");
    }
  };

  const handleClose = async () => {
    if (!selectedTicket) return;
    try {
      const token = getToken();
      await fetch(`${API_URL}/tickets/${selectedTicket.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(closeForm)
      });
      toast.success("Intervention clôturée");
      setShowCloseModal(false);
      fetchData();
    } catch (e) {
      toast.error("Erreur clôture");
    }
  };

  const handleReschedule = async () => {
    if (!selectedTicket) return;
    try {
      const token = getToken();
      await fetch(`${API_URL}/tickets/${selectedTicket.id}/reschedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(rescheduleForm)
      });
      toast.success("Reprogrammé");
      setShowRescheduleModal(false);
      fetchData();
    } catch (e) {
      toast.error("Erreur reprogrammation");
    }
  };

  const handleCreateProvider = async () => {
    try {
      await interventionApi.createProvider(providerForm);
      toast.success("Prestataire créé");
      setShowProviderModal(false);
      fetchData();
    } catch (e) {
      toast.error("Erreur création");
    }
  };

  const handleCreateContract = async () => {
    try {
      const token = getToken();
      await fetch(`${API_URL}/service-contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(contractForm)
      });
      toast.success("Contrat créé");
      setShowContractModal(false);
      fetchData();
    } catch (e) {
      toast.error("Erreur création contrat");
    }
  };

  // Export CSV
  const handleExport = () => {
    const data = filteredTickets.map(t => ({
      'N°': t.id,
      'Bien': `${t.building_name} - ${t.ref_lot}`,
      'Type': t.category,
      'Priorité': t.priorite,
      'Statut': t.statut,
      'Intervenant': t.provider_name || '-',
      'Date': format(new Date(t.date_creation), 'dd/MM/yyyy'),
    }));
    
    const headers = Object.keys(data[0] || {}).join(';');
    const rows = data.map(row => Object.values(row).join(';')).join('\n');
    const csv = `${headers}\n${rows}`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `interventions_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
    toast.success("Export CSV téléchargé");
  };

  // Filtered data
  const filteredTickets = tickets.filter(t => {
    if (filterStatut && t.statut !== filterStatut) return false;
    if (filterPriorite && t.priorite !== filterPriorite) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!t.description?.toLowerCase().includes(q) && 
          !t.requester_name?.toLowerCase().includes(q) &&
          !t.building_name?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const demandes = filteredTickets.filter(t => !t.provider_id && t.statut !== 'Clos');
  const interventions = filteredTickets.filter(t => t.provider_id || t.statut === 'Clos');

  // KPIs
  const urgentCount = tickets.filter(t => t.priorite === 'Urgente' && t.statut === 'Ouvert').length;
  const enCoursCount = tickets.filter(t => t.statut === 'En cours').length;
  const resoluCount = tickets.filter(t => t.statut === 'Résolu' || t.statut === 'Clos').length;

  const renderStatusBadge = (statut: string) => {
    const config = STATUS_CONFIG[statut] || STATUS_CONFIG['Ouvert'];
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}>
        <Icon size={12} />
        {statut}
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-base-content">Interventions <span className="text-primary">.</span></h1>
          <p className="text-base-content/60">Gestion des maintenances et services</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={handleExport} className="gap-2">
            <Download size={16} /> Export CSV
          </Button>
          <Button onClick={() => {
            if (activeTab === 'partenaires') setShowProviderModal(true);
            else if (activeTab === 'contrats') setShowContractModal(true);
            else setShowCreateModal(true);
          }} className="gap-2">
            <Plus size={16} />
            {activeTab === 'partenaires' ? 'Nouveau Prestataire' : activeTab === 'contrats' ? 'Nouveau Contrat' : 'Nouvelle Demande'}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={AlertCircle} label="Urgentes" value={urgentCount.toString()} color="orange" />
        <KPICard icon={Clock} label="En cours" value={enCoursCount.toString()} color="orange" />
        <KPICard icon={CheckCircle} label="Résolues" value={resoluCount.toString()} color="green" />
        <KPICard icon={Users} label="Prestataires" value={providers.length.toString()} color="teal" />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-base-100 p-2 rounded-xl border">
        {[
          { key: 'demandes', label: 'Demandes', icon: AlertCircle, count: demandes.length },
          { key: 'interventions', label: 'Interventions', icon: Wrench, count: interventions.length },
          { key: 'partenaires', label: 'Prestataires', icon: Users, count: providers.length },
          { key: 'contrats', label: 'Contrats', icon: FileText, count: contracts.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === tab.key ? 'bg-primary text-white' : 'text-base-content/70 hover:bg-base-300'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
            <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-base-100/20' : 'bg-base-300'}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      {(activeTab === 'demandes' || activeTab === 'interventions') && (
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/50" size={16} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg w-64"
            />
          </div>
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="border rounded-lg px-3 py-2">
            <option value="">Tous les statuts</option>
            {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterPriorite} onChange={e => setFilterPriorite(e.target.value)} className="border rounded-lg px-3 py-2">
            <option value="">Toutes priorités</option>
            <option value="Basse">Basse</option>
            <option value="Moyenne">Moyenne</option>
            <option value="Haute">Haute</option>
            <option value="Urgente">Urgente</option>
          </select>
          {(filterStatut || filterPriorite || searchQuery) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterStatut(''); setFilterPriorite(''); setSearchQuery(''); }}>
              Réinitialiser
            </Button>
          )}
        </div>
      )}

      {/* Main Content */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead className="bg-base-200">
              <tr>
                {activeTab === 'partenaires' ? (
                  <>
                    <th className="p-4">Entreprise</th>
                    <th className="p-4">Spécialité</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-right">Actions</th>
                  </>
                ) : activeTab === 'contrats' ? (
                  <>
                    <th className="p-4">Contrat</th>
                    <th className="p-4">Prestataire</th>
                    <th className="p-4">Mensualité</th>
                    <th className="p-4">Période</th>
                    <th className="p-4">Statut</th>
                  </>
                ) : (
                  <>
                    <th className="p-4">N°</th>
                    <th className="p-4">Bien / Lot</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">Priorité</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4">Intervenant</th>
                    <th className="p-4">Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {activeTab === 'demandes' && demandes.map(t => (
                <tr key={t.id} className="hover:bg-base-200">
                  <td className="p-4 font-mono text-sm">#{t.id}</td>
                  <td className="p-4">
                    <div className="font-medium">{t.building_name}</div>
                    <div className="text-xs text-base-content/60">{t.ref_lot}</div>
                  </td>
                  <td className="p-4"><span className="badge badge-ghost">{t.category}</span></td>
                  <td className="p-4"><span className={`badge ${PRIORITY_CONFIG[t.priorite] || ''}`}>{t.priorite}</span></td>
                  <td className="p-4">{renderStatusBadge(t.statut)}</td>
                  <td className="p-4 text-base-content/50">-</td>
                  <td className="p-4 text-sm">{format(new Date(t.date_creation), 'dd MMM yyyy', { locale: fr })}</td>
                  <td className="p-4 text-right">
                    <Button size="sm" onClick={() => { setSelectedTicket(t); setShowAssignModal(true); }}>Assigner</Button>
                  </td>
                </tr>
              ))}
              {activeTab === 'interventions' && interventions.map(t => (
                <tr key={t.id} className="hover:bg-base-200">
                  <td className="p-4 font-mono text-sm">#{t.id}</td>
                  <td className="p-4">
                    <div className="font-medium">{t.building_name}</div>
                    <div className="text-xs text-base-content/60">{t.ref_lot}</div>
                  </td>
                  <td className="p-4"><span className="badge badge-ghost">{t.category}</span></td>
                  <td className="p-4"><span className={`badge ${PRIORITY_CONFIG[t.priorite] || ''}`}>{t.priorite}</span></td>
                  <td className="p-4">{renderStatusBadge(t.statut)}</td>
                  <td className="p-4 font-medium text-primary">{t.provider_name || '-'}</td>
                  <td className="p-4 text-sm">{t.scheduled_date ? format(new Date(t.scheduled_date), 'dd MMM yyyy', { locale: fr }) : '-'}</td>
                  <td className="p-4 text-right space-x-2">
                    {t.statut !== 'Clos' && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => { setSelectedTicket(t); setShowRescheduleModal(true); }}>
                          <RefreshCw size={14} />
                        </Button>
                        <Button size="sm" onClick={() => { setSelectedTicket(t); setShowCloseModal(true); }}>Clôturer</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {activeTab === 'partenaires' && providers.map(p => (
                <tr key={p.id} className="hover:bg-base-200">
                  <td className="p-4 font-bold">{p.name}</td>
                  <td className="p-4"><span className="badge badge-outline">{p.specialty}</span></td>
                  <td className="p-4">
                    <div>{p.contact_name}</div>
                    <div className="text-xs text-base-content/60">{p.phone}</div>
                  </td>
                  <td className="p-4"><span className="badge badge-success badge-sm">Actif</span></td>
                  <td className="p-4 text-right">
                    <Button size="sm" variant="ghost"><Phone size={14} /></Button>
                  </td>
                </tr>
              ))}
              {activeTab === 'contrats' && contracts.map(c => (
                <tr key={c.id} className="hover:bg-base-200">
                  <td className="p-4 font-bold">{c.title}</td>
                  <td className="p-4">{c.provider_name}</td>
                  <td className="p-4 font-mono">{c.cost_monthly?.toLocaleString()} FCFA</td>
                  <td className="p-4 text-sm">
                    {c.start_date && format(new Date(c.start_date), 'MMM yyyy')} - {c.end_date && format(new Date(c.end_date), 'MMM yyyy')}
                  </td>
                  <td className="p-4">{renderStatusBadge(c.status === 'active' ? 'En cours' : 'Clos')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {((activeTab === 'demandes' && demandes.length === 0) || (activeTab === 'interventions' && interventions.length === 0)) && (
            <div className="p-12 text-center text-base-content/50">Aucune donnée</div>
          )}
        </div>
      </Card>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Nouvelle Demande d'Intervention</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}><XCircle /></Button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Bien / Lot *</label>
                  <select 
                    className="w-full border rounded-lg p-2" 
                    value={ticketForm.lot_id} 
                    onChange={e => setTicketForm({...ticketForm, lot_id: e.target.value})}
                  >
                    <option value="">Sélectionner un lot...</option>
                    {lots.map(l => (
                      <option key={l.id} value={l.id}>{l.building_name} - {l.ref_lot}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-1">Catégorie *</label>
                  <select 
                    className="w-full border rounded-lg p-2" 
                    value={ticketForm.category} 
                    onChange={e => setTicketForm({...ticketForm, category: e.target.value})}
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Type d'intervention *</label>
                <input 
                  type="text" 
                  className="w-full border rounded-lg p-2" 
                  placeholder="Ex: Fuite d'eau, Coupure électrique..."
                  value={ticketForm.type} 
                  onChange={e => setTicketForm({...ticketForm, type: e.target.value})}
                  list="intervention-types"
                />
                <datalist id="intervention-types">
                  {(CATEGORY_EXAMPLES[ticketForm.category as keyof typeof CATEGORY_EXAMPLES] || []).map(ex => (
                    <option key={ex} value={ex} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-sm font-bold mb-1">Description *</label>
                <textarea 
                  className="w-full border rounded-lg p-2" 
                  rows={3}
                  placeholder="Décrivez le problème en détail..."
                  value={ticketForm.description} 
                  onChange={e => setTicketForm({...ticketForm, description: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold mb-1">Urgence</label>
                  <div className="flex gap-2">
                    {['Basse', 'Moyenne', 'Haute', 'Urgente'].map(u => (
                      <label key={u} className={`flex-1 text-center py-2 px-3 rounded-lg border cursor-pointer transition-all ${ticketForm.urgency === u ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-base-200'}`}>
                        <input type="radio" name="urgency" value={u} checked={ticketForm.urgency === u} onChange={e => setTicketForm({...ticketForm, urgency: e.target.value, priorite: e.target.value})} className="sr-only" />
                        {u}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Demandeur" value={ticketForm.requester_name} onChange={e => setTicketForm({...ticketForm, requester_name: e.target.value})} placeholder="Nom du demandeur" />
                <Input label="Téléphone" value={ticketForm.requester_phone} onChange={e => setTicketForm({...ticketForm, requester_phone: e.target.value})} placeholder="+229 00 00 00 00" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">Photos (avant intervention)</label>
                <div className="flex flex-wrap gap-2">
                  {ticketForm.photos_before.map((p, i) => (
                    <div key={i} className="relative w-20 h-20">
                      <img src={p} alt="" className="w-full h-full object-cover rounded-lg" />
                      <button 
                        onClick={() => setTicketForm(prev => ({...prev, photos_before: prev.photos_before.filter((_, idx) => idx !== i)}))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <XCircle size={14} />
                      </button>
                    </div>
                  ))}
                  <button 
                    onClick={() => photoInputRef.current?.click()}
                    className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-base-content/50 hover:border-primary hover:text-primary transition-all"
                  >
                    <Camera size={20} />
                    <span className="text-xs">Photo</span>
                  </button>
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoUpload(e, 'before')} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Annuler</Button>
                <Button onClick={handleCreateTicket}>Créer la demande</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Assigner Intervention #{selectedTicket.id}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Prestataire *</label>
                <select className="w-full border rounded-lg p-2" value={assignForm.provider_id} onChange={e => setAssignForm({...assignForm, provider_id: e.target.value})}>
                  <option value="">Sélectionner...</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.specialty})</option>)}
                </select>
              </div>
              <Input type="date" label="Date Intervention" value={assignForm.scheduled_date} onChange={e => setAssignForm({...assignForm, scheduled_date: e.target.value})} />
              <Input type="number" label="Coût Estimé (FCFA)" value={assignForm.cost_estimated} onChange={e => setAssignForm({...assignForm, cost_estimated: parseFloat(e.target.value)})} />
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="ghost" onClick={() => setShowAssignModal(false)}>Annuler</Button>
                <Button onClick={handleAssign}>Affecter</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Close Modal */}
      {showCloseModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg p-6">
            <h3 className="text-lg font-bold mb-4">Clôturer Intervention #{selectedTicket.id}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold mb-1">Actions réalisées *</label>
                <textarea className="w-full border rounded-lg p-2" rows={3} value={closeForm.actions_done} onChange={e => setCloseForm({...closeForm, actions_done: e.target.value})} placeholder="Décrivez les travaux effectués..." />
              </div>
              <Input type="number" label="Coût Réel (FCFA)" value={closeForm.cost_real} onChange={e => setCloseForm({...closeForm, cost_real: parseFloat(e.target.value)})} />
              <Input label="Commentaires" value={closeForm.comments} onChange={e => setCloseForm({...closeForm, comments: e.target.value})} />
              <div>
                <label className="block text-sm font-bold mb-2">Photos (après intervention)</label>
                <div className="flex flex-wrap gap-2">
                  {closeForm.photos_after.map((p, i) => (
                    <div key={i} className="relative w-20 h-20">
                      <img src={p} alt="" className="w-full h-full object-cover rounded-lg" />
                    </div>
                  ))}
                  <button onClick={() => photoAfterInputRef.current?.click()} className="w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-base-content/50 hover:border-primary">
                    <Camera size={20} /><span className="text-xs">Photo</span>
                  </button>
                  <input ref={photoAfterInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoUpload(e, 'after')} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="ghost" onClick={() => setShowCloseModal(false)}>Annuler</Button>
                <Button onClick={handleClose}>Clôturer</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Reschedule Modal */}
      {showRescheduleModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Reprogrammer #{selectedTicket.id}</h3>
            <div className="space-y-4">
              <Input type="date" label="Nouvelle Date" value={rescheduleForm.new_date} onChange={e => setRescheduleForm({...rescheduleForm, new_date: e.target.value})} />
              <Input label="Motif" value={rescheduleForm.reason} onChange={e => setRescheduleForm({...rescheduleForm, reason: e.target.value})} placeholder="Raison du report..." />
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="ghost" onClick={() => setShowRescheduleModal(false)}>Annuler</Button>
                <Button onClick={handleReschedule}>Reprogrammer</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Provider Modal */}
      {showProviderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Nouveau Prestataire</h3>
            <div className="space-y-4">
              <Input label="Nom Entreprise" value={providerForm.name} onChange={e => setProviderForm({...providerForm, name: e.target.value})} />
              <Input label="Spécialité" value={providerForm.specialty} onChange={e => setProviderForm({...providerForm, specialty: e.target.value})} placeholder="Plomberie, Électricité..." />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Contact" value={providerForm.contact_name} onChange={e => setProviderForm({...providerForm, contact_name: e.target.value})} />
                <Input label="Téléphone" value={providerForm.phone} onChange={e => setProviderForm({...providerForm, phone: e.target.value})} />
              </div>
              <Input label="Email" value={providerForm.email} onChange={e => setProviderForm({...providerForm, email: e.target.value})} />
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="ghost" onClick={() => setShowProviderModal(false)}>Annuler</Button>
                <Button onClick={handleCreateProvider}>Enregistrer</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Contract Modal */}
      {showContractModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Nouveau Contrat de Service</h3>
            <div className="space-y-4">
              <Input label="Titre" value={contractForm.title} onChange={e => setContractForm({...contractForm, title: e.target.value})} placeholder="Ex: Gardiennage mensuel" />
              <div>
                <label className="block text-sm font-bold mb-1">Prestataire</label>
                <select className="w-full border rounded-lg p-2" value={contractForm.provider_id} onChange={e => setContractForm({...contractForm, provider_id: e.target.value})}>
                  <option value="">Sélectionner...</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <Input type="number" label="Coût Mensuel (FCFA)" value={contractForm.cost_monthly} onChange={e => setContractForm({...contractForm, cost_monthly: parseFloat(e.target.value)})} />
              <div className="grid grid-cols-2 gap-4">
                <Input type="date" label="Début" value={contractForm.start_date} onChange={e => setContractForm({...contractForm, start_date: e.target.value})} />
                <Input type="date" label="Fin" value={contractForm.end_date} onChange={e => setContractForm({...contractForm, end_date: e.target.value})} />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="ghost" onClick={() => setShowContractModal(false)}>Annuler</Button>
                <Button onClick={handleCreateContract}>Créer Contrat</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Interventions;