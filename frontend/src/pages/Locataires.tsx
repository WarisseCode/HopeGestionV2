// frontend/src/pages/Locataires.tsx
import React, { useState, useEffect } from 'react';
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
  Search,
  CheckCircle2,
  XCircle,
  Filter
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { motion, AnimatePresence } from 'framer-motion';

const Locataires: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'locataires' | 'acheteurs' | 'affectation'>('locataires');
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState<'creation' | 'affectation'>('creation');

  const navigate = useNavigate();
  const [locataires, setLocataires] = useState<Locataire[]>([]);
  const [acheteurs, setAcheteurs] = useState<Locataire[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLocatairesData = async () => {
    try {
      setLoading(true);
      // Simulate smoother loader
      setTimeout(async () => {
        const locs = await getLocataires('Locataire');
        setLocataires(locs);
        const achs = await getLocataires('Acheteur');
        setAcheteurs(achs);
        setLoading(false);
      }, 600);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLocatairesData();
  }, []);

  const [locataireForm, setLocataireForm] = useState({
    typeProfil: 'Locataire', nom: '', prenoms: '', telephonePrincipal: '', telephoneSecondaire: '',
    email: '', nationalite: 'Béninoise', typePiece: 'CNI', numeroPiece: '', dateExpiration: '',
    photoPiece: null, photoProfil: null, modePaiement: 'Mobile Money', acompte: 0,
    avance: 0, paiementEcheance: false
  });

  const [affectationForm, setAffectationForm] = useState({
    locataire: '', lot: '', typeAffectation: 'Location', dateDebut: '', dateFin: '', conditions: ''
  });

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
            Locataires & Clients <span className="text-secondary">.</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Gérez vos locataires, acheteurs et leurs affectations.
          </p>
        </div>
        <div className="flex items-center gap-3">
             <div className="relative group hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={18} />
                <input 
                type="text" 
                placeholder="Rechercher..." 
                className="input input-sm h-10 pl-10 bg-white border-gray-200 focus:border-primary w-64 rounded-full shadow-sm transition-all focus:w-72"
                />
            </div>
          <Button 
            variant="primary" 
            className="rounded-full px-6 h-10 shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all font-semibold"
            onClick={() => {
              setFormType('creation');
              setShowForm(true);
            }}
          >
            <UserPlus size={18} className="mr-2" />
            Nouveau Profil
          </Button>
        </div>
      </motion.div>

       {/* Tabs */}
       <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
        <div className="flex p-1 bg-gray-100/50 rounded-xl overflow-x-auto">
             <button
                onClick={() => setActiveTab('locataires')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'locataires' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <Users size={18} />
                Locataires
            </button>
            <button
                onClick={() => setActiveTab('acheteurs')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'acheteurs' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <Wallet size={18} />
                Acheteurs
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
         <div className="flex items-center gap-2 px-2 mt-4 sm:mt-0">
             <Button variant="ghost" className="btn-sm font-medium text-gray-500 hover:text-gray-700">
                 <Filter size={16} className="mr-2" />
                 Filtres
             </Button>
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
                         {formType === 'creation' 
                            ? (activeTab === 'acheteurs' ? 'Nouvel Acheteur' : 'Nouveau Locataire') 
                            : 'Nouvelle Affectation'}
                    </h2>
                     <Button variant="ghost" onClick={() => setShowForm(false)} className="btn-circle btn-sm">
                        <XCircle size={24} className="text-gray-400" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {formType === 'creation' ? (
                        <>
                             {/* Profile Photo Upload Placeholder */}
                             <div className="md:col-span-2 flex justify-center mb-4">
                                <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-4 border-white shadow-lg relative cursor-pointer group">
                                     <User size={32} className="text-gray-400 group-hover:text-primary transition-colors"/>
                                     <div className="absolute bottom-0 right-0 bg-primary text-white p-1 rounded-full shadow-md">
                                         <Edit3 size={12} />
                                     </div>
                                </div>
                             </div>

                             <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                <Select label="Profil" value={locataireForm.typeProfil} onChange={(e) => setLocataireForm({...locataireForm, typeProfil: e.target.value})} options={[{ value: 'Locataire', label: 'Locataire' }, { value: 'Acheteur', label: 'Acheteur' }]} />
                                <Select label="Nationalité" value={locataireForm.nationalite} onChange={(e) => setLocataireForm({...locataireForm, nationalite: e.target.value})} options={[{ value: 'Béninoise', label: 'Béninoise' }, { value: 'Autre', label: 'Autre' }]} />
                             </div>

                             <Input label="Nom" placeholder="Nom de famille" value={locataireForm.nom} onChange={(e) => setLocataireForm({...locataireForm, nom: e.target.value})} startIcon={<User size={16}/>} />
                             <Input label="Prénoms" placeholder="Prénoms" value={locataireForm.prenoms} onChange={(e) => setLocataireForm({...locataireForm, prenoms: e.target.value})} startIcon={<User size={16}/>} />
                             
                             <Input label="Téléphone (WhatsApp)" placeholder="+229..." value={locataireForm.telephonePrincipal} onChange={(e) => setLocataireForm({...locataireForm, telephonePrincipal: e.target.value})} startIcon={<Phone size={16}/>} />
                             <Input label="Email" placeholder="exemple@email.com" value={locataireForm.email} onChange={(e) => setLocataireForm({...locataireForm, email: e.target.value})} startIcon={<Mail size={16}/>} />

                             {/* Specific Fields */}
                             {locataireForm.typeProfil === 'Locataire' && (
                                 <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                                     <div className="col-span-2">
                                         <h3 className="font-bold text-gray-700 mb-2 text-sm uppercase">Conditions Financières</h3>
                                     </div>
                                      <Input label="Caution (FCFA)" type="number" value={locataireForm.acompte} onChange={(e) => setLocataireForm({...locataireForm, acompte: parseFloat(e.target.value)})} />
                                      <Input label="Avance (FCFA)" type="number" value={locataireForm.avance} onChange={(e) => setLocataireForm({...locataireForm, avance: parseFloat(e.target.value)})} />
                                 </div>
                             )}
                        </>
                     ) : (
                        <>
                            {/* Affectation Form */}
                            <Select label="Locataire / Acheteur" placeholder="Choisir..." options={locataires.map(l => ({value: l.id, label: `${l.nom} ${l.prenoms}`}))} value={affectationForm.locataire} onChange={(e) => setAffectationForm({...affectationForm, locataire: e.target.value})} />
                            <Select label="Bien Immob." placeholder="Choisir un lot..." options={[{value: 'A01', label: 'Apt A01 - Résidence La Paix'}]} value={affectationForm.lot} onChange={(e) => setAffectationForm({...affectationForm, lot: e.target.value})} />
                            
                             <div className="grid grid-cols-2 gap-4 md:col-span-2">
                                 <Input label="Date Début" type="date" value={affectationForm.dateDebut} onChange={(e) => setAffectationForm({...affectationForm, dateDebut: e.target.value})} />
                                 <Input label="Date Fin" type="date" value={affectationForm.dateFin} onChange={(e) => setAffectationForm({...affectationForm, dateFin: e.target.value})} />
                             </div>
                        </>
                     )}
                </div>

                <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
                    <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
                    <Button variant="primary" onClick={async () => {
                         try {
                            const dataToSave: any = { ...locataireForm, type: locataireForm.typeProfil }; 
                            await createLocataire(dataToSave);
                            setShowForm(false);
                            fetchLocatairesData();
                         } catch(e) { alert('Erreur'); }
                    }}>
                        Enregistrer
                    </Button>
                </div>
             </Card>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
             {activeTab === 'affectation' ? (
                 <Card className="border-none shadow-xl bg-white text-center py-12">
                     <div className="flex flex-col items-center">
                         <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4"><Home size={32}/></div>
                         <h3 className="text-xl font-bold text-gray-800">Gestion des Affectations</h3>
                         <p className="text-gray-500 max-w-md mt-2 mb-6">Gérez ici l'attribution des logements à vos locataires ou la vente de lots à des acheteurs.</p>
                         <Button variant="primary" onClick={() => { setFormType('affectation'); setShowForm(true); }}>
                             Nouvelle Affectation
                         </Button>
                     </div>
                 </Card>
             ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {(activeTab === 'locataires' ? locataires : acheteurs).map((person) => (
                        <motion.div 
                            key={person.id}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all group relative overflow-hidden"
                        >
                             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary"></div>
                             
                             <div className="flex justify-between items-start mb-4">
                                <div className="avatar placeholder">
                                    <div className="bg-gray-100 text-gray-600 rounded-full w-14 h-14 flex items-center justify-center text-xl font-bold uppercase ring-4 ring-white shadow-sm">
                                        {person.nom.charAt(0)}{person.prenoms.charAt(0)}
                                    </div>
                                </div>
                                <div className={`badge ${person.statut === 'Actif' ? 'badge-success' : 'badge-warning'} gap-1 font-bold pl-1.5 pr-2.5 py-3 h-auto rounded-full`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${person.statut === 'Actif' ? 'bg-green-800' : 'bg-orange-800'}`}></div>
                                    {person.statut}
                                </div>
                             </div>

                             <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1">{person.prenoms} {person.nom}</h3>
                             <p className="text-sm text-gray-500 mb-4 flex items-center gap-1.5">
                                 <Phone size={12} /> {person.telephone_principal}
                             </p>

                             <div className="space-y-3 pt-4 border-t border-gray-50">
                                 <div className="flex justify-between items-center text-sm">
                                     <span className="text-gray-400 flex items-center gap-1.5"><Home size={14}/> Logement</span>
                                     <span className="font-semibold text-gray-800">{person.lot || '-'}</span>
                                 </div>
                                  <div className="flex justify-between items-center text-sm">
                                     <span className="text-gray-400 flex items-center gap-1.5"><Wallet size={14}/> Loyer</span>
                                     <span className="font-semibold text-primary">{person.loyer ? person.loyer.toLocaleString() : 0} F</span>
                                 </div>
                             </div>

                             <div className="grid grid-cols-2 gap-2 mt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <Button variant="ghost" size="sm" className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600" onClick={() => navigate(`/dashboard/locataires/${person.id}`)}>
                                     <Eye size={14} className="mr-1.5"/> Détails
                                 </Button>
                                 <Button variant="ghost" size="sm" className="w-full bg-red-50 hover:bg-red-100 text-red-600" onClick={() => deleteLocataire(person.id)}>
                                     <Trash2 size={14} className="mr-1.5"/> Suppr.
                                 </Button>
                             </div>
                        </motion.div>
                    ))}
                </div>
             )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Locataires;