// frontend/src/pages/Contrats.tsx
import React, { useState } from 'react';
import { 
  FileText, 
  Plus, 
  Edit3, 
  Eye, 
  Trash2, 
  Calendar, 
  Home,
  Users,
  Wallet,
  Download,
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  FileCheck
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import { KPICard } from '../components/dashboard';

const Contrats: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'locations' | 'ventes' | 'interventions'>('locations');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'location' | 'vente' | 'intervention'>('location');

  // Données de démonstration
  const [contratsLocations] = useState([
    { id: 1, reference: 'LOC-2025-001', locataire: 'KOFFI Jean', lot: 'A01 - Résidence La Paix', dateDebut: '2025-01-01', dateFin: '2025-12-31', loyer: 150000, statut: 'Actif', fichier: 'contrat_001.pdf', dateSignature: '2024-12-20' },
    { id: 2, reference: 'LOC-2025-002', locataire: 'DOSSOU Marie', lot: 'A02 - Résidence La Paix', dateDebut: '2025-02-01', dateFin: '2026-01-31', loyer: 80000, statut: 'Actif', fichier: 'contrat_002.pdf', dateSignature: '2024-12-22' }
  ]);

  const [contratsVentes] = useState([
    { id: 1, reference: 'VTE-2025-001', acheteur: 'ADJINON Sébastien', lot: 'B01 - Immeuble Le Destin', dateDebut: '2025-01-15', dateFin: '2025-12-15', prixVente: 5000000, statut: 'En cours', fichier: 'contrat_vente_001.pdf', dateSignature: '2024-12-21' }
  ]);

  const [interventions] = useState([
    { id: 1, reference: 'INT-2025-001', proprietaire: 'Jean Koffi', bien: 'Résidence La Paix', description: 'Réparation de la toiture', dateDebut: '2025-01-10', dateFin: '2025-01-15', cout: 500000, statut: 'En cours', fichier: 'intervention_001.pdf', dateSignature: '2024-12-23' }
  ]);

  const [contratForm, setContratForm] = useState({
    reference: '', locataire: '', lot: '', dateDebut: '', dateFin: '', loyer: 0, charges: 0, caution: 0, prixVente: 0, avance: 0, paiementEcheance: false, description: '', cout: 0, fichier: null
  });

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
            Gestion des Contrats <span className="text-primary">.</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Centralisez et gérez tous vos contrats de location, vente et intervention.
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
              setFormType(activeTab === 'locations' ? 'location' : activeTab === 'ventes' ? 'vente' : 'intervention');
              setShowForm(true);
            }}
          >
            <Plus size={18} className="mr-2" />
            Nouveau Contrat
          </Button>
        </div>
      </motion.div>

       {/* Tabs */}
     <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
        <div className="flex p-1 bg-gray-100/50 rounded-xl overflow-x-auto">
             <button
                onClick={() => setActiveTab('locations')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'locations' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <FileText size={18} />
                Locations
            </button>
            <button
                onClick={() => setActiveTab('ventes')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'ventes' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <Wallet size={18} />
                Ventes
            </button>
             <button
                onClick={() => setActiveTab('interventions')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'interventions' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <Clock size={18} />
                Interventions
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
                            {formType === 'location' ? 'Contrat de Location' :
                             formType === 'vente' ? 'Contrat de Vente' :
                             'Contrat d\'Intervention'}
                         </h2>
                         <Button variant="ghost" onClick={() => setShowForm(false)} className="btn-circle btn-sm">
                            <XCircle size={24} className="text-gray-400" />
                        </Button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <>
                            <Input label="Référence" value={contratForm.reference} onChange={(e) => setContratForm({...contratForm, reference: e.target.value})} placeholder="Auto-généré" />
                            <Input label="Partie B (Locataire/Acheteur)" value={contratForm.locataire} onChange={(e) => setContratForm({...contratForm, locataire: e.target.value})} />
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Bien Immobilier</label>
                                <select className="select select-bordered w-full bg-gray-50" value={contratForm.lot} onChange={(e) => setContratForm({...contratForm, lot: e.target.value})}>
                                    <option value="">Sélectionner...</option>
                                    <option value="A01">A01 - Résidence La Paix</option>
                                </select>
                            </div>

                             <div className="grid grid-cols-2 gap-4">
                                <Input label="Date Début" type="date" value={contratForm.dateDebut} onChange={(e) => setContratForm({...contratForm, dateDebut: e.target.value})} />
                                <Input label="Date Fin" type="date" value={contratForm.dateFin} onChange={(e) => setContratForm({...contratForm, dateFin: e.target.value})} />
                             </div>

                             {formType !== 'intervention' && (
                                 <Input label={formType === 'vente' ? "Prix de Vente" : "Loyer Mensuel"} type="number" value={formType === 'vente' ? contratForm.prixVente : contratForm.loyer} onChange={(e) => setContratForm(formType === 'vente' ? {...contratForm, prixVente: parseFloat(e.target.value)} : {...contratForm, loyer: parseFloat(e.target.value)})} />
                             )}

                             <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-2">Document numérisé (PDF)</label>
                                <div className="h-32 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-50 hover:border-primary transition-all">
                                    <div className="text-center">
                                        <Upload className="mx-auto mb-2" size={24}/>
                                        <p className="text-sm">Glisser-déposer le contrat signé</p>
                                    </div>
                                </div>
                             </div>
                         </>
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
                        icon={FileCheck} 
                        label="Contrats Actifs" 
                        value={(contratsLocations.length + contratsVentes.length).toString()} 
                        color="green" 
                    />
                    <KPICard 
                        icon={Clock} 
                        label="Finissant ce mois" 
                        value="1" 
                        color="orange" 
                    />
                     <KPICard 
                        icon={Wallet} 
                        label="Valeur Totale" 
                        value="12M FCFA" 
                        color="blue" 
                    />
                 </div>

                 <Card className="border-none shadow-xl bg-white overflow-hidden p-0">
                     <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="py-4 pl-6 font-semibold text-gray-500">Référence</th>
                                    <th className="font-semibold text-gray-500">Parties & Bien</th>
                                    <th className="font-semibold text-gray-500">Période</th>
                                    <th className="font-semibold text-gray-500">Montant</th>
                                    <th className="font-semibold text-gray-500">Statut</th>
                                    <th className="pr-6 text-right font-semibold text-gray-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {activeTab === 'locations' && contratsLocations.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="pl-6 font-medium text-gray-900">{item.reference}</td>
                                        <td>
                                            <div className="font-bold text-gray-800">{item.locataire}</div>
                                            <div className="text-xs text-gray-400 flex items-center gap-1"><Home size={10}/> {item.lot}</div>
                                        </td>
                                        <td className="text-sm text-gray-600">
                                            {new Date(item.dateDebut).toLocaleDateString()} - {new Date(item.dateFin).toLocaleDateString()}
                                        </td>
                                        <td className="font-bold text-primary">{item.loyer.toLocaleString()} F/mois</td>
                                        <td><span className="badge badge-success badge-sm gap-1">ACTIF</span></td>
                                        <td className="pr-6 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" className="btn-square btn-xs"><Eye size={14}/></Button>
                                                <Button variant="ghost" size="sm" className="btn-square btn-xs"><Download size={14}/></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {activeTab === 'ventes' && contratsVentes.map(item => (
                                     <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="pl-6 font-medium text-gray-900">{item.reference}</td>
                                        <td>
                                            <div className="font-bold text-gray-800">{item.acheteur}</div>
                                            <div className="text-xs text-gray-400 flex items-center gap-1"><Home size={10}/> {item.lot}</div>
                                        </td>
                                        <td className="text-sm text-gray-600">
                                            Signé le {new Date(item.dateSignature).toLocaleDateString()}
                                        </td>
                                        <td className="font-bold text-green-600">{item.prixVente.toLocaleString()} F</td>
                                        <td><span className="badge badge-warning badge-sm gap-1">EN COURS</span></td>
                                        <td className="pr-6 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" className="btn-square btn-xs"><Eye size={14}/></Button>
                                                <Button variant="ghost" size="sm" className="btn-square btn-xs"><Download size={14}/></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {activeTab === 'interventions' && interventions.map(item => (
                                     <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="pl-6 font-medium text-gray-900">{item.reference}</td>
                                        <td>
                                            <div className="font-bold text-gray-800">{item.description}</div>
                                            <div className="text-xs text-gray-400 flex items-center gap-1"><Home size={10}/> {item.bien}</div>
                                        </td>
                                        <td className="text-sm text-gray-600">
                                            {new Date(item.dateDebut).toLocaleDateString()}
                                        </td>
                                        <td className="font-bold text-gray-700">{item.cout.toLocaleString()} F</td>
                                        <td><span className="badge badge-info badge-sm gap-1">EN COURS</span></td>
                                        <td className="pr-6 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" className="btn-square btn-xs"><Eye size={14}/></Button>
                                                <Button variant="ghost" size="sm" className="btn-square btn-xs"><Download size={14}/></Button>
                                            </div>
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

export default Contrats;