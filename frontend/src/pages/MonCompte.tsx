// frontend/src/pages/MonCompte.tsx
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Settings, 
  Building2, 
  Mail, 
  Phone,
  User,
  Edit3,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle,
  MoreVertical,
  Key,
  XCircle,
  Filter,
  Columns,
  Camera,
  Upload,

} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import Select from '../components/ui/Select';
import { getProprietaires, getUtilisateurs, saveProprietaire, saveUtilisateur, saveAutorisation, deleteProprietaire, deleteUtilisateur, reactivateUtilisateur, getProprietaireBiens } from '../api/accountApi';
import { getRole } from '../api/authApi';

import { motion, AnimatePresence } from 'framer-motion';
import { COUNTRIES } from '../data/countries';

const MonCompte: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'proprietaires' | 'utilisateurs' | 'autorisation'>('proprietaires');
  const [showPassword, setShowPassword] = useState(false);
  const [proprietaires, setProprietaires] = useState<any[]>([]);
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  
  // State pour le formulaire propriétaire
  const [editingProp, setEditingProp] = useState<any>({
    type: 'individual', nom: '', prenom: '', telephone: '', telephoneSecondaire: '',
    email: '', adresse: '', ville: '', pays: 'Bénin', numeroPiece: '', modeGestion: 'direct',
    mobileMoney: '', rccmNumber: '', photo: null
  });

  // State pour le formulaire utilisateur
  const [editingUser, setEditingUser] = useState<any>({
    nom: '', prenoms: '', telephone: '', email: '', role: '', statut: 'Actif'
  });

  const [autorisation, setAutorisation] = useState({
    utilisateur: '', proprietaire: '', role: 'viewer',
    modules: { biens: false, finances: false, locataires: false, paiements: false, contrats: false, interventions: false },
    niveauAcces: { lecture: false, ecriture: false, suppression: false, validation: false },
    dateDebut: new Date().toISOString().split('T')[0], dateFin: ''
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPropModal, setShowPropModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  
  // Column visibility for proprietaires table
  const [visibleColumns, setVisibleColumns] = useState({
    type: true,
    contact: true,
    localisation: true,
    gestion: true
  });

  const fetchData = async () => {
    try {
      if (proprietaires.length === 0) setLoading(true);
      const userRole = getRole();
      const promises: Promise<any>[] = [getProprietaires()];
      if (userRole === 'admin') promises.push(getUtilisateurs());

      const results = await Promise.all(promises);
      setProprietaires(results[0]);
      if (userRole === 'admin') setUtilisateurs(results[1] || []);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProprietaire = async () => {
    try {
      setError(null);
      await saveProprietaire(editingProp);
      setSuccess('Propriétaire enregistré avec succès');
      setEditingProp({
        type: 'individual', nom: '', prenom: '', telephone: '', telephoneSecondaire: '',
        email: '', adresse: '', ville: '', pays: 'Bénin', numeroPiece: '', modeGestion: 'direct',
        mobileMoney: '', rccmNumber: '', photo: null
      });
      setShowPropModal(false);
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleSaveUtilisateur = async () => {
    try {
      setError(null);
      await saveUtilisateur(editingUser);
      setSuccess('Utilisateur enregistré avec succès');
      setEditingUser({ nom: '', prenoms: '', telephone: '', email: '', role: '', statut: 'Actif' });
      setShowUserModal(false);
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleSaveAutorisation = async () => {
    try {
      setError(null);
      if (!autorisation.utilisateur || !autorisation.proprietaire) throw new Error('Veuillez sélectionner un utilisateur et un propriétaire');
      await saveAutorisation(autorisation);
      setSuccess('Autorisations mises à jour avec succès');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteProprietaire = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir désactiver ce propriétaire ?')) return;
    try {
      setError(null);
      await deleteProprietaire(id);
      setSuccess('Propriétaire désactivé avec succès');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la désactivation');
    }
  };

  const handleDeleteUtilisateur = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir suspendre cet utilisateur ?')) return;
    try {
      setError(null);
      await deleteUtilisateur(id);
      setSuccess('Utilisateur suspendu avec succès');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la suspension');
    }
  };

  const handleReactivateUtilisateur = async (id: number) => {
    try {
      setError(null);
      await reactivateUtilisateur(id);
      setSuccess('Utilisateur réactivé avec succès');
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la réactivation');
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } };

  if (loading) return <div className="flex justify-center items-center h-full min-h-[400px]"><div className="loading loading-spinner loading-lg text-primary"></div></div>;

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
            Mon Compte & Équipe <span className="text-primary">.</span>
          </h1>
          <p className="text-gray-500 font-medium mt-1">
            Gérez vos informations, vos collaborateurs et les permissions d'accès.
          </p>
        </div>
      </motion.div>

      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

       {/* Tabs */}
     <motion.div variants={itemVariants} className="flex flex-col sm:flex-row justify-between items-center bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
        <div className="flex p-1 bg-gray-100/50 rounded-xl overflow-x-auto">
             <button
                onClick={() => setActiveTab('proprietaires')}
                className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'proprietaires' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
                <Building2 size={18} />
                Propriétaires
            </button>
            {getRole() === 'admin' && (
                <>
                <button
                    onClick={() => setActiveTab('utilisateurs')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'utilisateurs' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Users size={18} />
                    Utilisateurs
                </button>
                <button
                    onClick={() => setActiveTab('autorisation')}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'autorisation' ? 'bg-white text-primary shadow-md' : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Shield size={18} />
                    Autorisations
                </button>
                </>
            )}
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'proprietaires' && (
            <motion.div 
            key="proprietaires"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-6"
            >
                {/* Header with Add Button and Column Filter */}
                <div className="flex justify-between items-center">
                    <Button 
                        variant="primary" 
                        onClick={() => {
                            setEditingProp({ type: 'individual', nom: '', prenom: '', telephone: '', pays: 'Bénin', modeGestion: 'direct', mobileMoney: '', rccmNumber: '', photo: null });
                            setShowPropModal(true);
                        }}
                        className="gap-2"
                    >
                        <UserPlus size={18} />
                        Ajouter un propriétaire
                    </Button>

                    {/* Column Filter Dropdown */}
                    <div className="dropdown dropdown-end">
                        <div tabIndex={0} role="button" className="btn btn-ghost gap-2">
                            <Columns size={18} />
                            Colonnes
                        </div>
                        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-gray-200">
                            <li className="menu-title">
                                <span className="text-xs font-bold uppercase text-gray-500">Afficher les colonnes</span>
                            </li>
                            <li>
                                <label className="cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="checkbox checkbox-sm checkbox-primary" 
                                        checked={visibleColumns.type}
                                        onChange={(e) => setVisibleColumns({...visibleColumns, type: e.target.checked})}
                                    />
                                    <span>Type</span>
                                </label>
                            </li>
                            <li>
                                <label className="cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="checkbox checkbox-sm checkbox-primary" 
                                        checked={visibleColumns.contact}
                                        onChange={(e) => setVisibleColumns({...visibleColumns, contact: e.target.checked})}
                                    />
                                    <span>Contact</span>
                                </label>
                            </li>
                            <li>
                                <label className="cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="checkbox checkbox-sm checkbox-primary" 
                                        checked={visibleColumns.localisation}
                                        onChange={(e) => setVisibleColumns({...visibleColumns, localisation: e.target.checked})}
                                    />
                                    <span>Localisation</span>
                                </label>
                            </li>
                            <li>
                                <label className="cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="checkbox checkbox-sm checkbox-primary" 
                                        checked={visibleColumns.gestion}
                                        onChange={(e) => setVisibleColumns({...visibleColumns, gestion: e.target.checked})}
                                    />
                                    <span>Mode de gestion</span>
                                </label>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Liste Propriétaires - Full Width */}
                <Card className="border-none shadow-xl bg-white p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="py-4 pl-6 text-gray-900 font-bold">#</th>
                                    <th className="text-gray-900 font-bold">Nom & Prénoms</th>
                                    {visibleColumns.type && <th className="text-gray-900 font-bold">Type</th>}
                                    {visibleColumns.contact && <th className="text-gray-900 font-bold">Contact</th>}
                                    {visibleColumns.localisation && <th className="text-gray-900 font-bold">Localisation</th>}
                                    {visibleColumns.gestion && <th className="text-gray-900 font-bold">Gestion</th>}
                                    <th className="pr-6 text-right"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {proprietaires.map((prop, index) => (
                                    <tr key={prop.id} className="hover:bg-gray-50/50 transition-all">
                                        <td className="pl-6 font-bold text-gray-500">#{index + 1}</td>
                                        <td>
                                            <div className="flex items-center gap-3">
                                                <div className="avatar placeholder">
                                                    <div className="bg-gray-100 text-gray-600 rounded-full w-10 h-10 flex items-center justify-center font-bold">
                                                        {prop.nom ? prop.nom.charAt(0) : '?'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-800">{prop.nom} {prop.prenom}</div>
                                                    <div className="text-xs text-gray-500 font-medium">
                                                        {prop.type === 'individual' ? 'Personne physique' : 'Personne morale'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        {visibleColumns.type && (
                                            <td>
                                                <span className={`badge badge-sm badge-outline ${prop.type === 'individual' ? 'badge-info' : 'badge-primary'}`}>
                                                    {prop.type === 'individual' ? 'Physique' : 'Morale'}
                                                </span>
                                            </td>
                                        )}
                                        {visibleColumns.contact && (
                                            <td>
                                                <div className="text-sm font-medium text-gray-700">{prop.telephone}</div>
                                                <div className="text-xs text-gray-500">{prop.email || '-'}</div>
                                            </td>
                                        )}
                                        {visibleColumns.localisation && (
                                            <td>
                                                <span className="text-sm text-gray-700">{prop.ville || '-'}</span>
                                            </td>
                                        )}
                                        {visibleColumns.gestion && (
                                            <td>
                                                <span className={`badge badge-sm badge-outline ${prop.modeGestion === 'direct' ? 'badge-success' : 'badge-warning'}`}>
                                                    {prop.modeGestion === 'direct' ? 'Direct' : 'Délégué'}
                                                </span>
                                            </td>
                                        )}
                                        <td className="pr-6">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingProp(prop);
                                                        setShowPropModal(true);
                                                    }}
                                                    className="btn btn-xs btn-ghost text-primary hover:bg-primary/10 gap-1"
                                                    title="Modifier"
                                                >
                                                    <Edit3 size={14}/>
                                                    Modifier
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProprietaire(prop.id)}
                                                    className="btn btn-xs btn-ghost text-orange-500 hover:bg-orange-50 gap-1"
                                                    title="Désactiver"
                                                >
                                                    <XCircle size={14}/>
                                                    Désactiver
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('⚠️ ATTENTION : Cette action est IRRÉVERSIBLE. Supprimer définitivement ce propriétaire ?')) {
                                                            handleDeleteProprietaire(prop.id);
                                                        }
                                                    }}
                                                    className="btn btn-xs btn-ghost text-error hover:bg-error/10 gap-1"
                                                    title="Supprimer définitivement"
                                                >
                                                    <Trash2 size={14}/>
                                                    Supprimer
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {proprietaires.length === 0 && (
                                    <tr><td colSpan={visibleColumns.type && visibleColumns.contact && visibleColumns.localisation && visibleColumns.gestion ? 7 : 4} className="text-center py-8 text-gray-400">Aucun propriétaire trouvé. Cliquez sur "Ajouter un propriétaire".</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Modal Form */}
                {showPropModal && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPropModal(false)}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                        />
                        
                        {/* Modal */}
                        <div className="fixed inset-0 z-50 overflow-y-auto">
                            <div className="flex min-h-full items-center justify-center p-4">
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden"
                                >
                                    {/* Header */}
                                    <div className="flex items-center justify-between p-6 border-b border-gray-100">
                                        <h2 className="text-2xl font-bold text-gray-900">
                                            {editingProp.id ? "Modifier le propriétaire" : "Ajouter un propriétaire"}
                                        </h2>
                                        <button
                                            onClick={() => setShowPropModal(false)}
                                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                        >
                                            <XCircle size={20} className="text-gray-500" />
                                        </button>
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                                        <div className="space-y-4">
                                            
                                            <Select 
                                                label="Type" 
                                                required
                                                value={editingProp.type} 
                                                onChange={(e) => setEditingProp({...editingProp, type: e.target.value})} 
                                                options={[
                                                    { value: 'individual', label: 'Personne physique' }, 
                                                    { value: 'company', label: 'Personne morale' }
                                                ]} 
                                            />
                                                <Input 
                                                    label={editingProp.type === 'company' ? "Raison Sociale" : "Nom"} 
                                                    required 
                                                    value={editingProp.nom} 
                                                    onChange={(e) => setEditingProp({...editingProp, nom: e.target.value})} 
                                                    placeholder={editingProp.type === 'company' ? "Ex: SARL ESPOIR IMMO" : "Ex: KOUASSI"}
                                                />
                                                {editingProp.type === 'individual' && (
                                                    <Input 
                                                        label="Prénom" 
                                                        value={editingProp.prenom} 
                                                        onChange={(e) => setEditingProp({...editingProp, prenom: e.target.value})} 
                                                        placeholder="Ex: Jean"
                                                    />
                                                )}
                                                <Input 
                                                    label="Téléphone (WhatsApp)" 
                                                    required
                                                    value={editingProp.telephone} 
                                                    onChange={(e) => setEditingProp({...editingProp, telephone: e.target.value})} 
                                                    startIcon={<Phone size={16}/>}
                                                    placeholder="+229 XX XX XX XX"
                                                />
                                                <Input 
                                                    label="Email" 
                                                    value={editingProp.email} 
                                                    onChange={(e) => setEditingProp({...editingProp, email: e.target.value})} 
                                                    startIcon={<Mail size={16}/>}
                                                    placeholder="exemple@email.com"
                                                />
                                                {/* Photo Upload */}
                                                <div className="flex items-center gap-4 p-4 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                                                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400">
                                                        <Camera size={24} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                                            Photo (Optionnel)
                                                        </label>
                                                        <input 
                                                            type="file" 
                                                            className="file-input file-input-bordered file-input-sm w-full max-w-xs" 
                                                            accept="image/*"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <Select
                                                        label="Pays"
                                                        value={editingProp.pays}
                                                        onChange={(e) => {
                                                          const newPays = e.target.value;
                                                          setEditingProp({...editingProp, pays: newPays, ville: ''});
                                                        }}
                                                        options={[
                                                          { value: '', label: 'Sélectionner un pays' },
                                                          ...COUNTRIES.map(c => ({ value: c.name, label: `${c.flag} ${c.name}` }))
                                                        ]}
                                                    />
                                                    
                                                    {/* Ville Flexible (Saisie ou Selection) */}
                                                    <div>
                                                        <Input 
                                                            label="Ville" 
                                                            value={editingProp.ville} 
                                                            onChange={(e) => setEditingProp({...editingProp, ville: e.target.value})} 
                                                            list="cities-list"
                                                            placeholder="Sélectionnez ou saisissez..."
                                                            autoComplete="off"
                                                        />
                                                        <datalist id="cities-list">
                                                            {(COUNTRIES.find(c => c.name === editingProp.pays)?.cities || []).map(city => (
                                                                <option key={city} value={city} />
                                                            ))}
                                                        </datalist>
                                                    </div>
                                                </div>
                                            <Input 
                                                label="Adresse" 
                                                value={editingProp.adresse} 
                                                onChange={(e) => setEditingProp({...editingProp, adresse: e.target.value})} 
                                                placeholder="Quartier, rue, numéro..."
                                            />
                                            {editingProp.type === 'company' && (
                                                <Input 
                                                    label="Numéro RCCM" 
                                                    value={editingProp.rccmNumber} 
                                                    onChange={(e) => setEditingProp({...editingProp, rccmNumber: e.target.value})} 
                                                    placeholder="Ex: BJ-COT-01-2024-B12-00123" 
                                                />
                                            )}
                                            <Input 
                                                label="Mobile Money (optionnel)" 
                                                value={editingProp.mobileMoney} 
                                                onChange={(e) => setEditingProp({...editingProp, mobileMoney: e.target.value})} 
                                                placeholder="Ex: +229 XX XX XX XX (MTN/Moov)" 
                                            />
                                            <Select 
                                                label="Mode de gestion" 
                                                required
                                                value={editingProp.modeGestion} 
                                                onChange={(e) => setEditingProp({...editingProp, modeGestion: e.target.value})} 
                                                options={[
                                                    { value: 'direct', label: 'Direct' }, 
                                                    { value: 'delegated', label: 'Délégué' }
                                                ]} 
                                            />
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
                                        <Button 
                                            variant="ghost" 
                                            onClick={() => setShowPropModal(false)}
                                        >
                                            Annuler
                                        </Button>
                                        <Button 
                                            variant="primary" 
                                            onClick={handleSaveProprietaire}
                                        >
                                            {editingProp.id ? "Mettre à jour" : "Enregistrer"}
                                        </Button>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </>
                )}
            </motion.div>
        )}

        {/* Similar structure for Utilisateurs and Autorisations tabs, adapting the premium layout */}
        {activeTab === 'utilisateurs' && (
             <motion.div 
             key="utilisateurs"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             className="space-y-6"
             >
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     <div className="lg:col-span-1">
                        <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm sticky top-6">
                            <h2 className="text-xl font-bold text-gray-800 mb-6">
                                {editingUser.id ? "Modifier l'utilisateur" : "Nouvel Utilisateur"}
                            </h2>
                            <div className="space-y-4">
                                <Input label="Nom" value={editingUser.nom} onChange={(e) => setEditingUser({...editingUser, nom: e.target.value})} startIcon={<User size={16}/>} />
                                <Input label="Prénoms" value={editingUser.prenoms} onChange={(e) => setEditingUser({...editingUser, prenoms: e.target.value})} />
                                <Input label="Email" value={editingUser.email} onChange={(e) => setEditingUser({...editingUser, email: e.target.value})} startIcon={<Mail size={16}/>} />
                                <Input label="Téléphone" value={editingUser.telephone} onChange={(e) => setEditingUser({...editingUser, telephone: e.target.value})} startIcon={<Phone size={16}/>} />
                                <Select label="Rôle" value={editingUser.role} onChange={(e) => setEditingUser({...editingUser, role: e.target.value})} options={[
                                    { value: 'gestionnaire', label: 'Gestionnaire' },
                                    { value: 'agent_recouvreur', label: 'Agent Recouvreur' },
                                    { value: 'comptable', label: 'Comptable' },
                                    { value: 'gestionnaire_externe', label: 'Gestionnaire Externe' },
                                    { value: 'partenaire', label: 'Partenaire de Services' },
                                    { value: 'proprietaire', label: 'Propriétaire' },
                                    { value: 'locataire', label: 'Locataire' }
                                ]} />
                                {!editingUser.id && (
                                     <Input label="Mot de passe" type={showPassword ? "text" : "password"} value={editingUser.mot_de_passe} onChange={(e) => setEditingUser({...editingUser, mot_de_passe: e.target.value})} endIcon={showPassword ? <EyeOff size={16} onClick={() => setShowPassword(false)}/> : <Eye size={16} onClick={() => setShowPassword(true)}/>} />
                                )}
                                <div className="pt-4 flex justify-end gap-2">
                                     <Button variant="ghost" size="sm" onClick={() => setEditingUser({ nom: '', prenoms: '', telephone: '', email: '', role: '', statut: 'Actif' })}>Effacer</Button>
                                     <Button variant="primary" onClick={handleSaveUtilisateur}>{editingUser.id ? "Mettre à jour" : "Créer"}</Button>
                                </div>
                            </div>
                        </Card>
                     </div>
                     <div className="lg:col-span-2">
                        <Card className="border-none shadow-xl bg-white p-0 overflow-hidden">
                             <div className="overflow-x-auto">
                                <table className="table w-full">
                                    <thead className="bg-gray-50/50">
                                        <tr>
                                            <th className="py-4 pl-6">Utilisateur</th>
                                            <th>Rôle</th>
                                            <th>Statut</th>
                                            <th className="pr-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {utilisateurs.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                                 <td className="pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="avatar placeholder">
                                                            <div className="bg-secondary/10 text-secondary rounded-full w-10 h-10 flex items-center justify-center font-bold">
                                                                {user.nom.charAt(0)}
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-800">{user.nom} {user.prenoms}</div>
                                                            <div className="text-xs text-gray-400">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><span className="badge badge-outline text-xs uppercase">{user.role}</span></td>
                                                <td><span className={`badge ${user.statut === 'Actif' ? 'badge-success' : 'badge-warning'} badge-sm`}>{user.statut}</span></td>
                                                <td className="pr-6 text-right">
                                                     <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" size="sm" className="btn-square btn-xs" onClick={() => setEditingUser(user)} title="Modifier"><Edit3 size={14}/></Button>
                                                        {user.statut === 'Actif' ? (
                                                            <Button variant="ghost" size="sm" className="btn-square btn-xs text-warning" onClick={() => handleDeleteUtilisateur(user.id)} title="Suspendre"><XCircle size={14}/></Button>
                                                        ) : (
                                                            <Button variant="ghost" size="sm" className="btn-square btn-xs text-success" onClick={() => handleReactivateUtilisateur(user.id)} title="Réactiver"><CheckCircle size={14}/></Button>
                                                        )}
                                                     </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                        </Card>
                     </div>
                 </div>
             </motion.div>
        )}

        {activeTab === 'autorisation' && (
             <motion.div 
             key="autorisation"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             >
                <Card className="border-none shadow-xl bg-white max-w-4xl mx-auto">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Key className="text-primary"/> Gestion des Permissions
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         <div className="space-y-4">
                            <Select 
                                label="Utilisateur" 
                                value={autorisation.utilisateur} 
                                onChange={(e) => setAutorisation({...autorisation, utilisateur: e.target.value})} 
                                options={utilisateurs.map(u => ({value: u.id, label: `${u.nom} ${u.prenoms}`}))} 
                            />
                             <Select 
                                label="Propriétaire / Agence" 
                                value={autorisation.proprietaire} 
                                onChange={(e) => setAutorisation({...autorisation, proprietaire: e.target.value})} 
                                options={proprietaires.map(p => ({value: p.id, label: p.nom}))} 
                            />
                            <Select 
                                label="Rôle Assigné" 
                                value={autorisation.role} 
                                onChange={(e) => setAutorisation({...autorisation, role: e.target.value})} 
                                options={[{ value: 'manager', label: 'Gestionnaire' }, { value: 'viewer', label: 'Observateur' }, { value: 'agent', label: 'Agent' }]} 
                            />
                         </div>
                         <div className="space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider">Accès Modules</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(autorisation.modules).map(([key, value]) => (
                                        <label key={key} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-primary/30 cursor-pointer bg-gray-50/50 transition-all">
                                            <input type="checkbox" className="checkbox checkbox-primary checkbox-sm" checked={value} onChange={(e) => setAutorisation({...autorisation, modules: {...autorisation.modules, [key]: e.target.checked}})} />
                                            <span className="capitalize text-sm font-medium text-gray-600">{key}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <Button variant="primary" className="w-full" onClick={handleSaveAutorisation}>Enregistrer les permissions</Button>
                         </div>
                    </div>
                </Card>
             </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MonCompte;
