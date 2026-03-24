import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ChevronLeft, ChevronRight, Save, Check, Plus, Camera, Trash2,
    Building, User, Calendar, FileText, ClipboardCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getToken } from '../api/authApi';
import { toast } from 'react-hot-toast';

const ETATS = [
    { value: 'neuf', label: 'Neuf', color: 'bg-green-100 text-green-700' },
    { value: 'bon', label: 'Bon', color: 'bg-blue-100 text-blue-700' },
    { value: 'usager', label: 'Usagé', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'mauvais', label: 'Mauvais', color: 'bg-orange-100 text-orange-700' },
    { value: 'hs', label: 'Hors Service', color: 'bg-red-100 text-red-700' },
];

const PIECES = [
    'Salon', 'Cuisine', 'Chambre 1', 'Chambre 2', 'Chambre 3',
    'Salle de bain', 'Toilettes', 'Couloir', 'Balcon', 'Cave', 'Garage'
];

interface EdlItem {
    piece: string;
    nom: string;
    categorie: string;
    etat: string;
    quantite: number;
    observation: string;
    photos: string[];
}

const EdlCreate: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Step 1: Context
    const [context, setContext] = useState({
        lot_id: 0,
        type_edl: 'entree' as 'entree' | 'sortie' | 'intermediaire',
        date_realisation: new Date().toISOString().split('T')[0],
        locataire_name: '',
        locataire_present: true,
        commentaires: ''
    });

    // Step 2: Items
    const [items, setItems] = useState<EdlItem[]>([]);
    const [currentItem, setCurrentItem] = useState<EdlItem>({
        piece: 'Salon',
        nom: '',
        categorie: 'Menuiserie',
        etat: 'bon',
        quantite: 1,
        observation: '',
        photos: []
    });
    const [showItemModal, setShowItemModal] = useState(false);

    // Available lots
    const [lots, setLots] = useState<any[]>([]);

    useEffect(() => {
        loadLots();
    }, []);

    const loadLots = async () => {
        const token = getToken();
        const res = await fetch('http://localhost:5000/api/biens/lots', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            setLots(data.lots || []);
        }
    };

    const handleAddItem = () => {
        setItems([...items, currentItem]);
        setShowItemModal(false);
        setCurrentItem({
            piece: 'Salon',
            nom: '',
            categorie: 'Menuiserie',
            etat: 'bon',
            quantite: 1,
            observation: '',
            photos: []
        });
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const urls = Array.from(e.target.files).map(file => URL.createObjectURL(file));
        setCurrentItem({ ...currentItem, photos: [...currentItem.photos, ...urls] });
    };

    const handleSubmit = async () => {
        if (context.lot_id === 0) {
            toast.error('Veuillez sélectionner un lot');
            return;
        }

        setLoading(true);
        try {
            const token = getToken();
            
            // 1. Create EDL Header
            const res = await fetch('http://localhost:5000/api/edl', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(context)
            });
            
            if (!res.ok) throw new Error('Erreur création EDL');
            const edl = await res.json();
            const edlId = edl.id;

            // 2. Add Items
            for (const item of items) {
                await fetch(`http://localhost:5000/api/edl/${edlId}/items`, {
                    method: 'POST',
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(item)
                });
            }

            toast.success('État des lieux créé avec succès !');
            navigate('/dashboard/etats-des-lieux');
        } catch (error) {
            console.error(error);
            toast.error('Erreur lors de l\'enregistrement');
        } finally {
            setLoading(false);
        }
    };

    const renderStepIndicator = () => (
        <div className="flex items-center justify-center gap-3 mb-8">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-blue-600' : 'text-base-content/50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-base-300'}`}>
                    {step > 1 ? <Check size={16} /> : '1'}
                </div>
                <span className="hidden sm:block font-medium">Contexte</span>
            </div>
            <div className="h-px w-8 bg-gray-300"></div>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-blue-600' : 'text-base-content/50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-base-300'}`}>
                    {step > 2 ? <Check size={16} /> : '2'}
                </div>
                <span className="hidden sm:block font-medium">Inspection</span>
            </div>
            <div className="h-px w-8 bg-gray-300"></div>
            <div className={`flex items-center gap-2 ${step >= 3 ? 'text-blue-600' : 'text-base-content/50'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-base-300'}`}>
                    3
                </div>
                <span className="hidden sm:block font-medium">Validation</span>
            </div>
        </div>
    );

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button 
                    onClick={() => navigate('/dashboard/etats-des-lieux')}
                    className="flex items-center gap-2 text-base-content/60 hover:text-base-content"
                >
                    <ChevronLeft size={20} /> Retour
                </button>
                <h1 className="text-2xl font-bold text-base-content flex items-center gap-2">
                    <ClipboardCheck className="text-blue-600" />
                    Nouvel État des Lieux
                </h1>
                <div className="w-20"></div> {/* Spacer */}
            </div>

            {renderStepIndicator()}

            <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 min-h-[500px]">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <h2 className="text-xl font-bold text-base-content mb-4">Informations Générales</h2>
                            
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-base-content/80 mb-1">
                                        <Building size={16} className="inline mr-1" /> Lot/Bien
                                    </label>
                                    <select 
                                        className="w-full p-2 border border-base-300 rounded-xl bg-base-200"
                                        value={context.lot_id}
                                        onChange={(e) => setContext({...context, lot_id: Number(e.target.value)})}
                                    >
                                        <option value={0}>Sélectionner...</option>
                                        {lots.map(lot => (
                                            <option key={lot.id} value={lot.id}>
                                                {lot.ref_lot} - {lot.type}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-base-content/80 mb-1">
                                        <FileText size={16} className="inline mr-1" /> Type d'État des Lieux
                                    </label>
                                    <select 
                                        className="w-full p-2 border border-base-300 rounded-xl bg-base-200"
                                        value={context.type_edl}
                                        onChange={(e) => setContext({...context, type_edl: e.target.value as any})}
                                    >
                                        <option value="entree">État des lieux d'Entrée</option>
                                        <option value="sortie">État des lieux de Sortie</option>
                                        <option value="intermediaire">Contrôle Intermédiaire</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-base-content/80 mb-1">
                                        <Calendar size={16} className="inline mr-1" /> Date de Réalisation
                                    </label>
                                    <input 
                                        type="date" 
                                        className="w-full p-2 border border-base-300 rounded-xl bg-base-200"
                                        value={context.date_realisation}
                                        onChange={(e) => setContext({...context, date_realisation: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-base-content/80 mb-1">
                                        <User size={16} className="inline mr-1" /> Nom du Locataire
                                    </label>
                                    <input 
                                        type="text" 
                                        className="w-full p-2 border border-base-300 rounded-xl bg-base-200"
                                        placeholder="Jean Dupont"
                                        value={context.locataire_name}
                                        onChange={(e) => setContext({...context, locataire_name: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-base-content/80 mb-1">Commentaires (Optionnel)</label>
                                <textarea 
                                    rows={3}
                                    className="w-full p-2 border border-base-300 rounded-xl bg-base-200 resize-none"
                                    value={context.commentaires}
                                    onChange={(e) => setContext({...context, commentaires: e.target.value})}
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input 
                                    type="checkbox" 
                                    id="present"
                                    checked={context.locataire_present}
                                    onChange={(e) => setContext({...context, locataire_present: e.target.checked})}
                                    className="w-4 h-4 text-blue-600"
                                />
                                <label htmlFor="present" className="text-sm text-base-content/80">
                                    Locataire présent lors de l'inspection
                                </label>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-bold text-base-content">Inspection des Éléments ({items.length})</h2>
                                <button 
                                    onClick={() => setShowItemModal(true)}
                                    className="btn-secondary text-sm py-2 px-3 flex items-center gap-2"
                                >
                                    <Plus size={16} /> Ajouter
                                </button>
                            </div>

                            {items.length === 0 ? (
                                <div className="border-2 border-dashed border-base-300 rounded-xl p-12 text-center text-base-content/50">
                                    <ClipboardCheck size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>Aucun élément inspecté</p>
                                    <p className="text-sm">Commencez par ajouter les éléments constatés</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {PIECES.map(piece => {
                                        const pieceItems = items.filter(i => i.piece === piece);
                                        if (pieceItems.length === 0) return null;
                                        return (
                                            <div key={piece} className="space-y-2">
                                                <h4 className="text-xs font-bold text-base-content/50 uppercase">{piece}</h4>
                                                {pieceItems.map((item, idx) => (
                                                    <div key={idx} className="bg-base-200 p-3 rounded-xl flex items-start gap-3">
                                                        <div className="flex-1">
                                                            <h5 className="font-semibold text-base-content">{item.nom}</h5>
                                                            <p className="text-sm text-base-content/60">{item.observation || 'Aucune observation'}</p>
                                                            <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-bold ${ETATS.find(e => e.value === item.etat)?.color}`}>
                                                                {ETATS.find(e => e.value === item.etat)?.label}
                                                            </span>
                                                        </div>
                                                        <button 
                                                            onClick={() => setItems(items.filter((_, i) => i !== items.indexOf(item)))}
                                                            className="text-base-content/50 hover:text-red-500 p-1"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <h2 className="text-xl font-bold text-base-content">Validation et Enregistrement</h2>
                            
                            <div className="bg-blue-50 p-4 rounded-xl">
                                <h3 className="font-bold text-blue-900 mb-2">Récapitulatif</h3>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• Type: {context.type_edl === 'entree' ? 'Entrée' : context.type_edl === 'sortie' ? 'Sortie' : 'Intermédiaire'}</li>
                                    <li>• Date: {new Date(context.date_realisation).toLocaleDateString()}</li>
                                    <li>• Locataire: {context.locataire_name || 'N/A'}</li>
                                    <li>• Éléments inspectés: {items.length}</li>
                                </ul>
                            </div>

                            <div className="border-2 border-orange-200 bg-orange-50 p-4 rounded-xl">
                                <p className="text-sm text-orange-800">
                                    <strong>Note:</strong> Cet état des lieux sera enregistré en mode "Brouillon". 
                                    Vous pourrez ajouter les signatures électroniques ultérieurement depuis la page de détails.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
                {step > 1 ? (
                    <button 
                        onClick={() => setStep(step - 1)}
                        className="btn-ghost flex items-center gap-2"
                    >
                        <ChevronLeft size={18} /> Précédent
                    </button>
                ) : <div></div>}

                {step < 3 ? (
                    <button 
                        onClick={() => setStep(step + 1)}
                        className="btn-primary flex items-center gap-2"
                        disabled={step === 1 && context.lot_id === 0}
                    >
                        Suivant <ChevronRight size={18} />
                    </button>
                ) : (
                    <button 
                        onClick={handleSubmit}
                        disabled={loading || items.length === 0}
                        className="btn-primary flex items-center gap-2"
                    >
                        {loading ? 'Enregistrement...' : <><Save size={18} /> Enregistrer</>}
                    </button>
                )}
            </div>

            {/* Add Item Modal */}
            <AnimatePresence>
                {showItemModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-base-100 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 border-b border-base-200 flex justify-between items-center">
                                <h3 className="font-bold text-base-content">Ajouter un Élément</h3>
                                <button onClick={() => setShowItemModal(false)} className="text-base-content/50 hover:text-base-content/70">Fermer</button>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="label">Pièce</label>
                                    <select 
                                        className="input"
                                        value={currentItem.piece}
                                        onChange={(e) => setCurrentItem({...currentItem, piece: e.target.value})}
                                    >
                                        {PIECES.map(p => <option key={p} value={p}>{p}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="label">Nom de l'élément</label>
                                    <input 
                                        type="text" 
                                        className="input" 
                                        placeholder="Ex: Porte d'entrée, Fenêtre..."
                                        value={currentItem.nom}
                                        onChange={(e) => setCurrentItem({...currentItem, nom: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="label">État</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {ETATS.map(etat => (
                                            <button 
                                                key={etat.value}
                                                onClick={() => setCurrentItem({...currentItem, etat: etat.value})}
                                                className={`p-2 rounded-lg text-sm border transition ${
                                                    currentItem.etat === etat.value 
                                                        ? `${etat.color} border-current ring-2 ring-offset-1` 
                                                        : 'border-base-300 hover:bg-base-200'
                                                }`}
                                            >
                                                {etat.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="label">Observations / Défauts</label>
                                    <textarea 
                                        className="input" 
                                        rows={2}
                                        placeholder="Décrire les défauts éventuels..."
                                        value={currentItem.observation}
                                        onChange={(e) => setCurrentItem({...currentItem, observation: e.target.value})}
                                    />
                                </div>

                                <div>
                                    <label className="label flex items-center gap-2">
                                        <Camera size={16} /> Photos
                                    </label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {currentItem.photos.map((src, i) => (
                                            <div key={i} className="aspect-square rounded-lg overflow-hidden bg-base-300">
                                                <img src={src} className="w-full h-full object-cover" alt="" />
                                            </div>
                                        ))}
                                        <label className="aspect-square rounded-lg border-2 border-dashed border-base-300 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                                            <Plus className="text-base-content/50" />
                                            <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-4 border-t border-base-200 flex justify-end gap-3">
                                <button onClick={() => setShowItemModal(false)} className="btn-ghost">Annuler</button>
                                <button 
                                    onClick={handleAddItem}
                                    className="btn-primary"
                                    disabled={!currentItem.nom}
                                >
                                    Ajouter
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EdlCreate;
