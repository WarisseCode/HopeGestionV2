// frontend/src/pages/Interventions.tsx
import React, { useState } from 'react';
import { 
  Wrench, 
  Plus, 
  Edit3, 
  Eye, 
  Trash2, 
  Calendar, 
  Home,
  Users,
  Phone,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MapPin,
  Search,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { KPICard } from '../components/dashboard';

const Interventions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'demandes' | 'interventions' | 'partenaires'>('demandes');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'demande' | 'intervention' | 'partenaire'>('demande');

  // Données de démonstration
  const [demandes] = useState([
    { id: 1, reference: 'DEM-2025-001', demandeur: 'KOFFI Jean', lot: 'A01 - Résidence La Paix', date: '2025-01-15', type: 'Plomberie', description: 'Fuite d\'eau dans la salle de bain', priorite: 'Haute', statut: 'En attente', telephone: '+229 97 00 00 00', adresse: 'Résidence La Paix, A01' },
    { id: 2, reference: 'DEM-2025-002', demandeur: 'DOSSOU Marie', lot: 'A02 - Résidence La Paix', date: '2025-01-16', type: 'Électricité', description: 'Court-circuit dans la cuisine', priorite: 'Urgente', statut: 'En cours', telephone: '+229 96 00 00 00', adresse: 'Résidence La Paix, A02' },
    { id: 3, reference: 'DEM-2025-003', demandeur: 'Propriétaire', lot: 'Résidence La Paix', date: '2025-01-17', type: 'Peinture', description: 'Peinture extérieure de l\'immeuble', priorite: 'Moyenne', statut: 'Planifié', telephone: '+229 90 00 00 00', adresse: 'Résidence La Paix' }
  ]);

  const [interventions] = useState([
    { id: 1, reference: 'INT-2025-001', partenaire: 'SARL Plomberie Expert', demandeur: 'KOFFI Jean', lot: 'A01 - Résidence La Paix', dateDebut: '2025-01-18', dateFin: '2025-01-19', type: 'Plomberie', description: 'Fuite d\'eau dans la salle de bain', cout: 25000, statut: 'Terminé', telephone: '+229 97 00 00 00' },
    { id: 2, reference: 'INT-2025-002', partenaire: 'SARL Electricité Pro', demandeur: 'DOSSOU Marie', lot: 'A02 - Résidence La Paix', dateDebut: '2025-01-20', dateFin: '2025-01-20', type: 'Électricité', description: 'Court-circuit dans la cuisine', cout: 45000, statut: 'En cours', telephone: '+229 96 00 00 00' }
  ]);

  const [partenaires] = useState([
    { id: 1, nom: 'SARL Plomberie Expert', contact: 'Jean Dupont', telephone: '+229 97 12 34 56', email: 'contact@plomberie-expert.bj', specialite: 'Plomberie', statut: 'Actif', adresse: 'Quartier Haie Vive, Cotonou' },
    { id: 2, nom: 'SARL Electricité Pro', contact: 'Marie Johnson', telephone: '+229 96 12 34 56', email: 'info@electricite-pro.bj', specialite: 'Électricité', statut: 'Actif', adresse: 'Fidjrossè, Cotonou' },
    { id: 3, nom: 'SARL Peinture Color', contact: 'Pierre Martin', telephone: '+229 95 12 34 56', email: 'contact@peinture-color.bj', specialite: 'Peinture', statut: 'Actif', adresse: 'Akpakpa, Cotonou' }
  ]);

  const [demandeForm, setDemandeForm] = useState({ reference: '', demandeur: '', lot: '', date: '', type: 'Plomberie', description: '', priorite: 'Moyenne', telephone: '', adresse: '' });
  const [interventionForm, setInterventionForm] = useState({ reference: '', partenaire: '', demandeur: '', lot: '', dateDebut: '', dateFin: '', type: 'Plomberie', description: '', cout: 0, statut: 'Planifié', telephone: '' });
  const [partenaireForm, setPartenaireForm] = useState({ nom: '', contact: '', telephone: '', email: '', specialite: 'Plomberie', statut: 'Actif', adresse: '' });

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
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Interventions & Maintenance <span className="text-primary">.</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Gérez les demandes, suivez les chantiers et vos prestataires.
          </p>
        </div>
        <div className="flex items-center gap-3">
             <div className="relative group hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                <input type="text" placeholder="Rechercher..." className="input input-sm h-10 pl-10 bg-white border-gray-200 focus:border-primary w-64 rounded-full shadow-sm transition-all focus:w-72" />
            </div>
          <Button 
            variant="primary" 
            className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
            onClick={() => {
              setFormType(activeTab === 'demandes' ? 'demande' : activeTab === 'interventions' ? 'intervention' : 'partenaire');
              setShowForm(true);
            }}
          >
            <Plus size={18} className="mr-2" />
            {activeTab === 'demandes' ? 'Nouvelle Demande' : activeTab === 'interventions' ? 'Nouvelle Intervention' : 'Nouveau Partenaire'}
          </Button>
        </div>
      </motion.div>

       {/* Tabs */}
     <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
        <div className="flex p-1 bg-gray-100/50 rounded-xl overflow-x-auto">
             <button
                onClick={() => setActiveTab('demandes')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'demandes' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <AlertCircle size={18} />
                Demandes
            </button>
            <button
                onClick={() => setActiveTab('interventions')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'interventions' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <Wrench size={18} />
                Interventions
            </button>
             <button
                onClick={() => setActiveTab('partenaires')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'partenaires' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <Users size={18} />
                Prestataires
            </button>
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {showForm ? (
             <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
             >
                 <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                     <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                         <h2 className="text-xl font-bold text-gray-800">
                            {formType === 'demande' ? 'Nouvelle Demande' :
                             formType === 'intervention' ? 'Planifier une Intervention' :
                             'Ajouter un Partenaire'}
                         </h2>
                         <Button variant="ghost" onClick={() => setShowForm(false)} className="btn-circle btn-sm">
                            <XCircle size={24} className="text-gray-400" />
                        </Button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {formType === 'demande' && (
                            <>
                                <Input label="Référence" value={demandeForm.reference} onChange={(e) => setDemandeForm({...demandeForm, reference: e.target.value})} placeholder="Auto-généré" />
                                <Input label="Demandeur" value={demandeForm.demandeur} onChange={(e) => setDemandeForm({...demandeForm, demandeur: e.target.value})} placeholder="Nom du locataire" />
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
                                    <select className="select select-bordered w-full bg-gray-50" value={demandeForm.type} onChange={(e) => setDemandeForm({...demandeForm, type: e.target.value})}>
                                        <option>Plomberie</option>
                                        <option>Électricité</option>
                                        <option>Autre</option>
                                    </select>
                                </div>
                                <Input label="Date" type="date" value={demandeForm.date} onChange={(e) => setDemandeForm({...demandeForm, date: e.target.value})} />
                                <div className="md:col-span-2">
                                    <Input label="Description" value={demandeForm.description} onChange={(e) => setDemandeForm({...demandeForm, description: e.target.value})} className="h-24" />
                                </div>
                            </>
                        )}
                        {/* Add other forms similarly if needed, keeping it concise for this interaction */}
                     </div>

                     <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
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
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <KPICard 
                        icon={AlertCircle} 
                        label="Demandes En Attente" 
                        value={demandes.filter(d => d.statut === 'En attente').length.toString()} 
                        color="orange" 
                    />
                    <KPICard 
                        icon={Wrench} 
                        label="Interventions En Cours" 
                        value={interventions.filter(i => i.statut === 'En cours').length.toString()} 
                        color="blue" 
                    />
                     <KPICard 
                        icon={CheckCircle} 
                        label="Terminées ce mois" 
                        value="5" 
                        color="green" 
                    />
                     <KPICard 
                        icon={Users} 
                        label="Partenaires Actifs" 
                        value={partenaires.filter(p => p.statut === 'Actif').length.toString()} 
                        color="purple" 
                    />
                 </div>

                 <Card className="border-none shadow-xl bg-white overflow-hidden p-0">
                     <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="py-4 pl-6 text-gray-500 font-semibold">{activeTab === 'partenaires' ? 'Entreprise' : 'Référence'}</th>
                                    <th className="text-gray-500 font-semibold">{activeTab === 'partenaires' ? 'Contact' : 'Sujet / Demandeur'}</th>
                                    <th className="text-gray-500 font-semibold">{activeTab === 'partenaires' ? 'Spécialité' : 'Type'}</th>
                                    <th className="text-gray-500 font-semibold">{activeTab === 'partenaires' ? 'Statut' : 'Priorité / État'}</th>
                                    <th className="pr-6 text-right text-gray-500 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {activeTab === 'demandes' && demandes.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="pl-6 font-medium text-gray-900">{item.reference}</td>
                                        <td>
                                            <div className="font-bold text-gray-800">{item.description}</div>
                                            <div className="text-xs text-gray-400 flex items-center gap-1"><Users size={10}/> {item.demandeur}</div>
                                        </td>
                                        <td><span className="badge badge-ghost badge-sm">{item.type}</span></td>
                                        <td>
                                            <div className="flex flex-col gap-1">
                                                <span className={`badge badge-sm ${item.priorite === 'Urgente' ? 'badge-error' : item.priorite === 'Haute' ? 'badge-warning' : 'badge-info'}`}>{item.priorite}</span>
                                                <span className="text-xs text-gray-400">{item.statut}</span>
                                            </div>
                                        </td>
                                        <td className="pr-6 text-right">
                                            <Button variant="ghost" size="sm" className="btn-square btn-xs"><Eye size={14}/></Button>
                                        </td>
                                    </tr>
                                ))}
                                {activeTab === 'interventions' && interventions.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="pl-6 font-medium text-gray-900">{item.reference}</td>
                                        <td>
                                            <div className="font-bold text-gray-800">{item.partenaire}</div>
                                            <div className="text-xs text-gray-400">Chez {item.demandeur}</div>
                                        </td>
                                        <td><span className="badge badge-ghost badge-sm">{item.type}</span></td>
                                        <td>
                                            <span className={`badge ${item.statut === 'Terminé' ? 'badge-success' : 'badge-warning'} gap-1`}>
                                                {item.statut}
                                            </span>
                                        </td>
                                         <td className="pr-6 text-right">
                                            <Button variant="ghost" size="sm" className="btn-square btn-xs"><Eye size={14}/></Button>
                                        </td>
                                    </tr>
                                ))}
                                {activeTab === 'partenaires' && partenaires.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="pl-6 font-bold text-gray-800">
                                            <div className="flex items-center gap-3">
                                                <div className="avatar placeholder">
                                                    <div className="bg-neutral-focus text-neutral-content rounded-full w-8">
                                                        <span>{item.nom.charAt(0)}</span>
                                                    </div>
                                                </div>
                                                {item.nom}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="font-medium text-gray-700">{item.contact}</div>
                                            <div className="text-xs text-gray-400">{item.telephone}</div>
                                        </td>
                                        <td><span className="badge badge-outline">{item.specialite}</span></td>
                                        <td><span className="badge badge-success badge-xs gap-1">ACTIVE</span></td>
                                         <td className="pr-6 text-right">
                                            <Button variant="ghost" size="sm" className="btn-square btn-xs"><Phone size={14}/></Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                     </div>
                 </Card>
             </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Interventions;