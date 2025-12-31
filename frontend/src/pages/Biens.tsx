// frontend/src/pages/Biens.tsx
import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Home, 
  Plus, 
  Edit3, 
  Eye, 
  Trash2, 
  MapPin,
  Search,
  Filter,
  ArrowRight,
  Image,
  CheckCircle2
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import { motion, AnimatePresence } from 'framer-motion';
import { getImmeubles, getLots } from '../api/bienApi';
import type { Immeuble, Lot } from '../api/bienApi';

const Biens: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'immeubles' | 'lots'>('immeubles');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'immeuble' | 'lot'>('immeuble');

  const [immeubles, setImmeubles] = useState<Immeuble[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form States (Simplified for UI Demo)
  const [immeubleForm, setImmeubleForm] = useState({
    id: 0, nom: '', type: 'Immeuble', proprietaire: '', gestionnaire: '',
    adresse: '', ville: '', pays: 'Bénin', description: '', nbLots: 1
  });

  const [lotForm, setLotForm] = useState({
    id: 0, immeuble: '', reference: '', type: 'Appartement', etage: '',
    superficie: 0, nbPieces: 1, loyer: 0, charges: 0, prixVente: 0,
    modePaiement: 'comptant', description: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Simulate loading for smoother transition
        setTimeout(async () => {
          const [immeublesData, lotsData] = await Promise.all([getImmeubles(), getLots()]);
          setImmeubles(immeublesData);
          setLots(lotsData);
          setLoading(false);
        }, 600);
      } catch (err: any) {
        setError(err.message || 'Erreur lors du chargement des données');
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[400px]">
        <div className="loading loading-spinner loading-lg text-primary"></div>
      </div>
    );
  }

  return (
    <motion.div 
      className="p-6 md:p-8 space-y-8 max-w-[1600px] mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header Section */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Parc Immobilier <span className="text-primary">.</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Gérez vos immeubles, lots et disponibilités.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher un bien..." 
              className="input input-sm h-10 pl-10 bg-white border-gray-200 focus:border-primary w-64 rounded-full shadow-sm transition-all focus:w-72"
            />
          </div>
          <Button 
            variant="primary" 
            className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
            onClick={() => {
              setFormType(activeTab === 'immeubles' ? 'immeuble' : 'lot');
              setShowForm(true);
            }}
          >
            <Plus size={18} className="mr-2" />
            Nouveau {activeTab === 'immeubles' ? 'Immeuble' : 'Lot'}
          </Button>
        </div>
      </motion.div>

      {/* Tabs & Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
        <div className="flex p-1 bg-gray-100/50 rounded-xl">
          <button
            onClick={() => setActiveTab('immeubles')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'immeubles' 
                ? 'bg-white text-primary shadow-md' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 size={18} />
            Immeubles
          </button>
          <button
            onClick={() => setActiveTab('lots')}
            className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'lots' 
                ? 'bg-white text-primary shadow-md' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Home size={18} />
            Lots
          </button>
        </div>
        
        <div className="flex items-center gap-2 px-2 mt-4 sm:mt-0">
          <Button variant="ghost" className="btn-sm font-medium text-gray-500 hover:text-gray-700">
            <Filter size={16} className="mr-2" />
            Filtres
          </Button>
          <div className="h-6 w-px bg-gray-200 mx-2"></div>
          <span className="text-sm font-semibold text-gray-500">
            {activeTab === 'immeubles' ? `${immeubles.length} Immeubles` : `${lots.length} Lots`}
          </span>
        </div>
      </motion.div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
                <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-800">
                        {formType === 'immeuble' ? 'Nouvel Immeuble' : 'Nouveau Lot'}
                    </h2>
                    <Button variant="ghost" onClick={() => setShowForm(false)} className="btn-circle btn-sm">
                        <Trash2 size={18} className="text-gray-400" />
                    </Button>
                </div>
                
                {/* Simplified Form Content matching previously existing fields but styled */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {formType === 'immeuble' ? (
                        <>
                             <div className="col-span-1 md:col-span-2 flex justify-center mb-6">
                                <div className="w-full h-48 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors group">
                                    <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-sm mb-3 group-hover:scale-110 transition-transform">
                                        <Image className="text-gray-400 group-hover:text-primary" size={24} />
                                    </div>
                                    <p className="text-sm font-medium text-gray-500">Ajouter une photo de couverture</p>
                                    <p className="text-xs text-gray-400 mt-1">PNG, JPG jusqu'à 5MB</p>
                                </div>
                            </div>

                            <Input label="Nom de l'immeuble" placeholder="Ex: Résidence La Paix" value={immeubleForm.nom} onChange={(e) => setImmeubleForm({...immeubleForm, nom: e.target.value})} />
                            
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Type</label>
                                <select className="select select-bordered w-full focus:border-primary focus:ring-2 ring-primary/20 transition-all bg-gray-50" value={immeubleForm.type} onChange={(e) => setImmeubleForm({...immeubleForm, type: e.target.value})}>
                                    <option>Immeuble</option>
                                    <option>Résidence</option>
                                    <option>Villa</option>
                                    <option>Commerce</option>
                                </select>
                            </div>

                            <Input label="Adresse" placeholder="Quartier, Rue" value={immeubleForm.adresse} onChange={(e) => setImmeubleForm({...immeubleForm, adresse: e.target.value})} />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Ville" placeholder="Cotonou" value={immeubleForm.ville} onChange={(e) => setImmeubleForm({...immeubleForm, ville: e.target.value})} />
                                <Input label="Pays" placeholder="Bénin" value={immeubleForm.pays} onChange={(e) => setImmeubleForm({...immeubleForm, pays: e.target.value})} />
                            </div>

                            <div className="md:col-span-2">
                                <Input label="Description" placeholder="Description courte..." value={immeubleForm.description} onChange={(e) => setImmeubleForm({...immeubleForm, description: e.target.value})} className="h-24" />
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Lot Form Fields */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Immeuble de rattachement</label>
                                <select className="select select-bordered w-full bg-gray-50" value={lotForm.immeuble} onChange={(e) => setLotForm({...lotForm, immeuble: e.target.value})}>
                                    <option value="">Choisir un immeuble...</option>
                                    {immeubles.map(i => <option key={i.id} value={i.id}>{i.nom}</option>)}
                                </select>
                            </div>
                            <Input label="Référence Lot" placeholder="Ex: A01" value={lotForm.reference} onChange={(e) => setLotForm({...lotForm, reference: e.target.value})} />
                            
                             <div className="grid grid-cols-2 gap-4">
                                <Input label="Loyer (FCFA)" type="number" value={lotForm.loyer} onChange={(e) => setLotForm({...lotForm, loyer: parseFloat(e.target.value)})} />
                                <Input label="Charges (FCFA)" type="number" value={lotForm.charges} onChange={(e) => setLotForm({...lotForm, charges: parseFloat(e.target.value)})} />
                             </div>
                        </>
                    )}
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
             {activeTab === 'immeubles' ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {immeubles.map((immeuble) => (
                        <div key={immeuble.id} className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-all group">
                            <div className="h-48 bg-gray-200 relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
                                <span className={`absolute top-4 right-4 z-20 badge border-none text-white font-bold ${immeuble.statut === 'Actif' ? 'bg-green-500' : 'bg-orange-500'}`}>
                                    {immeuble.statut}
                                </span>
                                {/* Mock Image Placeholder */}
                                <div className="w-full h-full bg-gray-300 flex items-center justify-center text-gray-500">
                                    <Building2 size={48} className="opacity-50" />
                                </div>
                                <div className="absolute bottom-4 left-4 z-20 text-white">
                                    <h3 className="text-xl font-bold">{immeuble.nom}</h3>
                                    <p className="text-sm opacity-90 flex items-center gap-1"><MapPin size={14}/> {immeuble.ville}</p>
                                </div>
                            </div>
                            <div className="p-5">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="p-3 bg-gray-50 rounded-xl">
                                        <p className="text-xs text-gray-400 font-bold uppercase">Lots</p>
                                        <p className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                            {immeuble.nbLots} 
                                            <span className="text-xs font-normal text-gray-400">unités</span>
                                        </p>
                                    </div>
                                     <div className="p-3 bg-gray-50 rounded-xl">
                                        <p className="text-xs text-gray-400 font-bold uppercase">Occupation</p>
                                        <div className="flex items-center gap-2">
                                             <div className="radial-progress text-primary text-[10px] font-bold" style={{"--value": immeuble.occupation, "--size": "2rem"} as any}>
                                                {immeuble.occupation}%
                                             </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                                    <span className="text-xs text-gray-400 font-mono">ID: #{immeuble.id.toString().padStart(4, '0')}</span>
                                    <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5">
                                        Gérer <ArrowRight size={16} className="ml-1" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
             ) : (
                <Card className="border-none shadow-xl bg-white overflow-hidden p-0">
                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="py-4 pl-6 text-xs uppercase font-bold text-gray-400 tracking-wider">Référence</th>
                                    <th className="py-4 text-xs uppercase font-bold text-gray-400 tracking-wider">Type</th>
                                    <th className="py-4 text-xs uppercase font-bold text-gray-400 tracking-wider">Immeuble</th>
                                    <th className="py-4 text-xs uppercase font-bold text-gray-400 tracking-wider">Loyer</th>
                                    <th className="py-4 text-xs uppercase font-bold text-gray-400 tracking-wider">Statut</th>
                                    <th className="py-4 pr-6 text-right text-xs uppercase font-bold text-gray-400 tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {lots.map((lot) => (
                                    <tr key={lot.id} className="hover:bg-gray-50/50 transition-colors group cursor-pointer">
                                        <td className="pl-6 font-bold text-gray-800">{lot.reference}</td>
                                        <td><span className="badge bg-blue-50 text-blue-600 border-none font-medium">{lot.type}</span></td>
                                        <td className="text-gray-600">{lot.immeuble}</td>
                                        <td className="font-mono font-medium text-gray-700">{lot.loyer.toLocaleString()} F</td>
                                        <td>
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                lot.statut === 'Libre' ? 'bg-green-100 text-green-700' :
                                                lot.statut === 'Loué' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${
                                                     lot.statut === 'Libre' ? 'bg-green-500' :
                                                     lot.statut === 'Loué' ? 'bg-blue-500' : 'bg-orange-500'
                                                }`}></span>
                                                {lot.statut}
                                            </span>
                                        </td>
                                        <td className="pr-6 text-right">
                                            <div className="flex justify-end gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="sm" className="btn-square btn-xs"><Edit3 size={14} /></Button>
                                                <Button variant="ghost" size="sm" className="btn-square btn-xs text-error"><Trash2 size={14} /></Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Biens;