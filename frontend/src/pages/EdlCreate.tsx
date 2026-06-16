import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ChevronLeft, ChevronRight, Save, Check, Plus, Camera, Trash2,
    Building, User, Calendar, FileText, ClipboardCheck, Loader2, Image as ImageIcon, X,
    ClipboardList, Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../utils/apiUtils';
import { compressImage } from '../utils/imageCompress';
import { API_URL, API_BASE } from '../config';
import { toast } from 'react-hot-toast';

// 'usager' = « Moyen » du CdC (valeur conservée pour la contrainte CHECK en base).
const ETATS = [
    { value: 'neuf', label: 'Neuf', color: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
    { value: 'bon', label: 'Bon', color: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
    { value: 'usager', label: 'Moyen', color: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
    { value: 'mauvais', label: 'Mauvais', color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
    { value: 'hs', label: 'Hors Service', color: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
];

const PIECES = [
    'Salon', 'Cuisine', 'Chambre 1', 'Chambre 2', 'Chambre 3',
    'Salle de bain', 'Toilettes', 'Couloir', 'Balcon', 'Cave', 'Garage'
];

interface EdlItem {
    _id: string;          // identifiant local (suppression fiable), retiré avant l'envoi
    piece: string;
    nom: string;
    categorie: string;
    etat: string;
    quantite: number;
    observation: string;
    photos: string[];
    inventory_item_id?: number | null;  // lien vers l'élément d'inventaire d'origine (CdC VIII.3)
}

const newItem = (piece: string): EdlItem => ({
    _id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    piece, nom: '', categorie: '', etat: 'bon', quantite: 1, observation: '', photos: [], inventory_item_id: null
});

const etatMeta = (v: string) => ETATS.find(e => e.value === v);

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

    // Step 2: Items + navigation par pièce
    const [items, setItems] = useState<EdlItem[]>([]);
    const [selectedPiece, setSelectedPiece] = useState<string>(PIECES[0]!);
    const [currentItem, setCurrentItem] = useState<EdlItem>(newItem(PIECES[0]!));
    const [showItemModal, setShowItemModal] = useState(false);
    const [uploadingPhotos, setUploadingPhotos] = useState(false);

    const [lots, setLots] = useState<any[]>([]);

    // Inventaire de référence du lot (pour pré-remplir les éléments — CdC VIII.3)
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [loadingInv, setLoadingInv] = useState(false);
    const [invLoaded, setInvLoaded] = useState(false);

    useEffect(() => { loadLots(); }, []);

    // On ne propose que les lots LOUÉS (bail actif/signé) — un EDL ne concerne qu'un lot occupé.
    const loadLots = async () => {
        try {
            const data = await apiCall<{ lots: any[] }>(`${API_URL}/edl/rented-lots`);
            setLots(data.lots || []);
        } catch { /* ignore si l'endpoint est indisponible */ }
    };

    const itemsOfPiece = items.filter(i => i.piece === selectedPiece);
    const galleryOfPiece = itemsOfPiece.flatMap(i => i.photos);

    const openModalForPiece = () => {
        setCurrentItem(newItem(selectedPiece));
        setShowItemModal(true);
    };

    // Charge les éléments du dernier inventaire du lot sélectionné.
    const loadInventory = async () => {
        if (!context.lot_id) return;
        setLoadingInv(true);
        try {
            const data = await apiCall<{ items: any[] }>(`${API_URL}/edl/lot/${context.lot_id}/inventory-items`);
            setInventoryItems(data.items || []);
            setInvLoaded(true);
            if (!data.items?.length) toast('Aucun inventaire trouvé pour ce lot.');
        } catch (e) {
            console.error(e);
            toast.error("Impossible de charger l'inventaire du lot.");
        } finally {
            setLoadingInv(false);
        }
    };

    // Ouvre le modal pré-rempli depuis un élément d'inventaire (le lien inventory_item_id
    // est conservé ; l'agent n'a plus qu'à constater l'état et photographier).
    const openModalForInventoryItem = (inv: any) => {
        setCurrentItem({
            ...newItem(selectedPiece),
            nom: inv.nom || '',
            categorie: inv.categorie || '',
            etat: inv.etat || 'bon',
            observation: inv.description || inv.observation || '',
            inventory_item_id: inv.inventory_item_id,
        });
        setShowItemModal(true);
    };

    // Éléments d'inventaire pas encore repris dans l'EDL (pour ne pas proposer de doublon).
    const usedInventoryIds = new Set(items.map(i => i.inventory_item_id).filter(Boolean));
    const inventorySuggestions = inventoryItems.filter(inv => !usedInventoryIds.has(inv.inventory_item_id));

    const handleAddItem = () => {
        setItems(prev => [...prev, currentItem]);
        setShowItemModal(false);
    };

    const removeItem = (id: string) => setItems(prev => prev.filter(i => i._id !== id));

    // Compression intelligente + horodatage AVANT l'upload réel (CdC VIII.4).
    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const files = Array.from(e.target.files);
        setUploadingPhotos(true);
        try {
            const urls: string[] = [];
            for (const file of files) {
                let blob: Blob = file;
                try { blob = await compressImage(file); } catch { /* repli sur le fichier brut */ }
                if (blob.size > 5 * 1024 * 1024) {
                    toast.error(`${file.name} reste trop lourde, ignorée`);
                    continue;
                }
                const formData = new FormData();
                formData.append('type', 'document'); // 'type' AVANT 'file' (lecture Multer)
                formData.append('file', new File([blob], `edl-${Date.now()}.jpg`, { type: 'image/jpeg' }));
                const resp = await fetch(`${API_URL}/upload`, { method: 'POST', body: formData });
                const data = await resp.json();
                if (!resp.ok) throw new Error(data.message || 'Upload échoué');
                urls.push(`${API_BASE}${data.files[0].path}`);
            }
            if (urls.length) setCurrentItem(prev => ({ ...prev, photos: [...prev.photos, ...urls] }));
        } catch (err) {
            console.error(err);
            toast.error("Échec de l'envoi d'une photo");
        } finally {
            setUploadingPhotos(false);
            e.target.value = '';
        }
    };

    const removeCurrentPhoto = (idx: number) =>
        setCurrentItem(prev => ({ ...prev, photos: prev.photos.filter((_, i) => i !== idx) }));

    const handleSubmit = async () => {
        if (context.lot_id === 0) {
            toast.error('Veuillez sélectionner un lot');
            return;
        }
        setLoading(true);
        try {
            const edl = await apiCall<{ id: number }>(`${API_URL}/edl`, {
                method: 'POST',
                body: JSON.stringify(context)
            });
            const edlId = edl.id;

            for (const item of items) {
                const { _id, ...payload } = item; // _id est purement local
                void _id;
                await apiCall(`${API_URL}/edl/${edlId}/items`, {
                    method: 'POST',
                    body: JSON.stringify(payload)
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
            {[{ n: 1, label: 'Contexte' }, { n: 2, label: 'Inspection' }, { n: 3, label: 'Validation' }].map((s, i) => (
                <React.Fragment key={s.n}>
                    {i > 0 && <div className="h-px w-8 bg-gray-300" />}
                    <div className={`flex items-center gap-2 ${step >= s.n ? 'text-teal-600' : 'text-base-content/50'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= s.n ? 'bg-teal-600 text-white' : 'bg-base-300'}`}>
                            {step > s.n ? <Check size={16} /> : s.n}
                        </div>
                        <span className="hidden sm:block font-medium">{s.label}</span>
                    </div>
                </React.Fragment>
            ))}
        </div>
    );

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button type="button" onClick={() => navigate('/dashboard/etats-des-lieux')}
                    className="flex items-center gap-2 text-base-content/60 hover:text-base-content">
                    <ChevronLeft size={20} /> Retour
                </button>
                <h1 className="text-2xl font-bold text-base-content flex items-center gap-2">
                    <ClipboardCheck className="text-teal-600" /> Nouvel État des Lieux
                </h1>
                <div className="w-20" />
            </div>

            {renderStepIndicator()}

            <div className="bg-base-100 p-6 rounded-2xl shadow-sm border border-base-200 min-h-[500px]">
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <h2 className="text-xl font-bold text-base-content mb-4">Informations Générales</h2>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-base-content/80 mb-1">
                                        <Building size={16} className="inline mr-1" /> Lot/Bien
                                    </label>
                                    <select className="w-full p-2 border border-base-300 rounded-xl bg-base-200"
                                        value={context.lot_id}
                                        onChange={(e) => {
                                            const lotId = Number(e.target.value);
                                            const sel = lots.find(l => l.lot_id === lotId);
                                            // Auto-remplissage live du locataire associé au lot loué.
                                            setContext(prev => ({ ...prev, lot_id: lotId, locataire_name: sel?.locataire_name || '' }));
                                            // L'inventaire dépend du lot → on réinitialise les suggestions.
                                            setInventoryItems([]);
                                            setInvLoaded(false);
                                        }}
                                        aria-label="Lot loué">
                                        <option value={0}>{lots.length ? 'Sélectionner...' : 'Aucun lot loué disponible'}</option>
                                        {lots.map(lot => (
                                            <option key={lot.lot_id} value={lot.lot_id}>
                                                {[lot.reference, lot.immeuble, lot.type].filter(Boolean).join(' · ')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-base-content/80 mb-1">
                                        <FileText size={16} className="inline mr-1" /> Type d'État des Lieux
                                    </label>
                                    <select className="w-full p-2 border border-base-300 rounded-xl bg-base-200"
                                        value={context.type_edl}
                                        onChange={(e) => setContext({ ...context, type_edl: e.target.value as any })}
                                        aria-label="Type d'état des lieux">
                                        <option value="entree">État des lieux d'Entrée</option>
                                        <option value="sortie">État des lieux de Sortie</option>
                                        <option value="intermediaire">Contrôle Intermédiaire</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-base-content/80 mb-1">
                                        <Calendar size={16} className="inline mr-1" /> Date de Réalisation
                                    </label>
                                    <input type="date" className="w-full p-2 border border-base-300 rounded-xl bg-base-200"
                                        value={context.date_realisation}
                                        onChange={(e) => setContext({ ...context, date_realisation: e.target.value })}
                                        aria-label="Date de réalisation" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-base-content/80 mb-1">
                                        <User size={16} className="inline mr-1" /> Nom du Locataire
                                    </label>
                                    <input type="text" className="w-full p-2 border border-base-300 rounded-xl bg-base-200"
                                        placeholder="Auto-rempli à la sélection du lot (modifiable)"
                                        value={context.locataire_name}
                                        onChange={(e) => setContext({ ...context, locataire_name: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-base-content/80 mb-1">Commentaires (Optionnel)</label>
                                <textarea rows={3} className="w-full p-2 border border-base-300 rounded-xl bg-base-200 resize-none"
                                    value={context.commentaires}
                                    onChange={(e) => setContext({ ...context, commentaires: e.target.value })} />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="present" checked={context.locataire_present}
                                    onChange={(e) => setContext({ ...context, locataire_present: e.target.checked })}
                                    className="w-4 h-4 text-teal-600" />
                                <label htmlFor="present" className="text-sm text-base-content/80">Locataire présent lors de l'inspection</label>
                            </div>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                            <h2 className="text-xl font-bold text-base-content mb-4">Inspection par pièce ({items.length} élément{items.length > 1 ? 's' : ''})</h2>
                            <div className="grid grid-cols-1 md:grid-cols-[210px_1fr] gap-4">
                                {/* Liste des pièces à gauche */}
                                <aside className="space-y-1">
                                    {PIECES.map(piece => {
                                        const count = items.filter(i => i.piece === piece).length;
                                        const active = piece === selectedPiece;
                                        return (
                                            <button key={piece} type="button" onClick={() => setSelectedPiece(piece)}
                                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition ${active ? 'bg-teal-600 text-white font-semibold' : 'hover:bg-base-200 text-base-content/80'}`}>
                                                <span>{piece}</span>
                                                {count > 0 && (
                                                    <span className={`text-xs px-1.5 rounded-full ${active ? 'bg-white/25' : 'bg-base-300'}`}>{count}</span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </aside>

                                {/* Détails de la pièce sélectionnée à droite */}
                                <section className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-base-content">{selectedPiece}</h3>
                                        <button type="button" onClick={openModalForPiece}
                                            className="btn-secondary text-sm py-2 px-3 flex items-center gap-2">
                                            <Plus size={16} /> Ajouter un élément
                                        </button>
                                    </div>

                                    {/* Import depuis l'inventaire de référence du lot (CdC VIII.3) */}
                                    <div className="rounded-xl border border-base-200 bg-base-200/40 p-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-sm text-base-content/70 flex items-center gap-1.5">
                                                <ClipboardList size={15} /> Inventaire de référence
                                            </span>
                                            <button type="button" onClick={loadInventory} disabled={loadingInv || !context.lot_id}
                                                className="text-xs px-2.5 py-1.5 rounded-lg border border-teal-500/40 text-teal-700 hover:bg-teal-50 disabled:opacity-50 flex items-center gap-1.5 transition">
                                                {loadingInv ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                                                Importer depuis l'inventaire
                                            </button>
                                        </div>
                                        {invLoaded && (
                                            inventorySuggestions.length === 0 ? (
                                                <p className="text-xs text-base-content/40 mt-2">
                                                    {inventoryItems.length ? "Tous les éléments d'inventaire ont déjà été repris." : "Aucun élément d'inventaire pour ce lot."}
                                                </p>
                                            ) : (
                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                    {inventorySuggestions.map(inv => (
                                                        <button key={inv.inventory_item_id} type="button"
                                                            onClick={() => openModalForInventoryItem(inv)}
                                                            title="Ajouter cet élément (état + photo à renseigner)"
                                                            className="text-xs px-2 py-1 rounded-full bg-base-100 border border-base-300 hover:border-teal-500 hover:text-teal-700 transition">
                                                            + {inv.nom}{inv.categorie ? ` · ${inv.categorie}` : ''}
                                                        </button>
                                                    ))}
                                                </div>
                                            )
                                        )}
                                    </div>

                                    {itemsOfPiece.length === 0 ? (
                                        <div className="border-2 border-dashed border-base-300 rounded-xl p-10 text-center text-base-content/50">
                                            <ClipboardCheck size={40} className="mx-auto mb-2 opacity-20" />
                                            <p className="text-sm">Aucun élément inspecté dans cette pièce</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {itemsOfPiece.map(item => (
                                                <div key={item._id} className="bg-base-200 p-3 rounded-xl flex items-start gap-3">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <h5 className="font-semibold text-base-content">{item.nom}</h5>
                                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${etatMeta(item.etat)?.color}`}>{etatMeta(item.etat)?.label}</span>
                                                            {item.inventory_item_id && (
                                                                <span title="Issu de l'inventaire" className="text-teal-600"><ClipboardList size={13} /></span>
                                                            )}
                                                        </div>
                                                        {item.observation && <p className="text-sm text-base-content/60 mt-0.5">{item.observation}</p>}
                                                        {item.photos.length > 0 && (
                                                            <div className="flex gap-1 mt-2">
                                                                {item.photos.slice(0, 5).map((src, i) => (
                                                                    <img key={i} src={src} className="w-12 h-12 rounded object-cover border border-base-300" alt="" />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <button type="button" onClick={() => removeItem(item._id)}
                                                        title="Supprimer l'élément"
                                                        className="text-base-content/50 hover:text-red-500 p-1">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Galerie de la pièce */}
                                    {galleryOfPiece.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-bold text-base-content/50 uppercase flex items-center gap-1.5 mb-2">
                                                <ImageIcon size={14} /> Galerie — {selectedPiece} ({galleryOfPiece.length})
                                            </h4>
                                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                                                {galleryOfPiece.map((src, i) => (
                                                    <img key={i} src={src} className="aspect-square rounded-lg object-cover border border-base-300" alt="" />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <h2 className="text-xl font-bold text-base-content">Validation et Enregistrement</h2>
                            <div className="bg-teal-50 p-4 rounded-xl">
                                <h3 className="font-bold text-teal-900 mb-2">Récapitulatif</h3>
                                <ul className="text-sm text-teal-800 space-y-1">
                                    <li>• Type: {context.type_edl === 'entree' ? 'Entrée' : context.type_edl === 'sortie' ? 'Sortie' : 'Intermédiaire'}</li>
                                    <li>• Date: {new Date(context.date_realisation).toLocaleDateString()}</li>
                                    <li>• Locataire: {context.locataire_name || '(auto depuis le bail)'}</li>
                                    <li>• Éléments inspectés: {items.length}</li>
                                    <li>• Pièces couvertes: {new Set(items.map(i => i.piece)).size}</li>
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

            {/* Navigation */}
            <div className="flex items-center justify-between">
                {step > 1 ? (
                    <button type="button" onClick={() => setStep(step - 1)} className="btn-ghost flex items-center gap-2">
                        <ChevronLeft size={18} /> Précédent
                    </button>
                ) : <div />}

                {step < 3 ? (
                    <button type="button" onClick={() => setStep(step + 1)}
                        className="btn-primary flex items-center gap-2"
                        disabled={(step === 1 && context.lot_id === 0) || (step === 2 && items.length === 0)}>
                        Suivant <ChevronRight size={18} />
                    </button>
                ) : (
                    <button type="button" onClick={handleSubmit} disabled={loading || items.length === 0}
                        className="btn-primary flex items-center gap-2">
                        {loading ? 'Enregistrement...' : <><Save size={18} /> Enregistrer</>}
                    </button>
                )}
            </div>

            {/* Modal: ajout d'un élément (pièce pré-sélectionnée) */}
            <AnimatePresence>
                {showItemModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setShowItemModal(false)} />

                        <motion.div initial={{ scale: 0.96, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.96, opacity: 0, y: 12 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="relative bg-base-100 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">

                            {/* Header dégradé */}
                            <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-teal-600 to-teal-500 text-white">
                                <div className="flex items-center gap-3">
                                    <div className="bg-white/20 rounded-lg p-2"><ClipboardCheck size={18} /></div>
                                    <div>
                                        <h3 className="font-bold leading-tight">Ajouter un élément</h3>
                                        <p className="text-xs text-white/80 flex items-center gap-1"><Building size={11} /> {currentItem.piece}</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setShowItemModal(false)} aria-label="Fermer"
                                    className="p-2 rounded-full hover:bg-white/20 transition">
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Corps scrollable */}
                            <div className="p-5 space-y-5 overflow-y-auto">
                                <div>
                                    <label className="block text-sm font-medium text-base-content/70 mb-1.5">Nom de l'élément</label>
                                    <input type="text" autoFocus
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-base-300 bg-base-200/40 outline-none transition focus:bg-base-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                                        placeholder="Ex: Porte d'entrée, Fenêtre, Robinet..."
                                        value={currentItem.nom}
                                        onChange={(e) => setCurrentItem({ ...currentItem, nom: e.target.value })} />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-base-content/70 mb-1.5">État</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {ETATS.map(etat => {
                                            const active = currentItem.etat === etat.value;
                                            return (
                                                <button key={etat.value} type="button"
                                                    onClick={() => setCurrentItem({ ...currentItem, etat: etat.value })}
                                                    className={`flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl border text-sm font-medium transition ${active ? 'border-teal-500 bg-teal-50 text-teal-700 ring-2 ring-teal-500/30' : 'border-base-300 text-base-content/70 hover:border-base-content/30 hover:bg-base-200'}`}>
                                                    <span className={`w-2.5 h-2.5 rounded-full ${etat.dot}`} />
                                                    {etat.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-base-content/70 mb-1.5">Observations / Défauts</label>
                                    <textarea rows={2}
                                        className="w-full px-3.5 py-2.5 rounded-xl border border-base-300 bg-base-200/40 outline-none transition resize-none focus:bg-base-100 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30"
                                        placeholder="Décrire les défauts éventuels..."
                                        value={currentItem.observation}
                                        onChange={(e) => setCurrentItem({ ...currentItem, observation: e.target.value })} />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="flex items-center gap-1.5 text-sm font-medium text-base-content/70">
                                            <Camera size={15} /> Photos <span className="text-red-500">*</span>
                                        </label>
                                        <span className="text-xs text-base-content/40">compressées & horodatées</span>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {currentItem.photos.map((src, i) => (
                                            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-base-300 group ring-1 ring-base-300">
                                                <img src={src} className="w-full h-full object-cover" alt="" />
                                                <button type="button" onClick={() => removeCurrentPhoto(i)}
                                                    aria-label="Supprimer la photo"
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow opacity-0 group-hover:opacity-100 transition">
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        <label className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1 text-xs transition ${uploadingPhotos ? 'opacity-60 cursor-wait border-base-300 text-base-content/40' : 'cursor-pointer border-base-300 text-base-content/50 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-600'}`}>
                                            {uploadingPhotos
                                                ? <Loader2 size={20} className="animate-spin text-teal-500" />
                                                : <><Camera size={20} /><span>Ajouter</span></>}
                                            <input type="file" multiple accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhotos} />
                                        </label>
                                    </div>
                                    {currentItem.photos.length === 0 && (
                                        <p className="text-xs text-red-500/90 mt-1.5 flex items-center gap-1">⚠️ La photo est obligatoire (preuve juridique).</p>
                                    )}
                                </div>
                            </div>

                            {/* Footer collant */}
                            <div className="flex justify-end items-center gap-2 px-5 py-4 border-t border-base-200 bg-base-100/80">
                                <button type="button" onClick={() => setShowItemModal(false)}
                                    className="px-4 py-2 rounded-xl text-sm font-medium text-base-content/70 hover:bg-base-200 transition">
                                    Annuler
                                </button>
                                <button type="button" onClick={handleAddItem}
                                    disabled={!currentItem.nom || currentItem.photos.length === 0 || uploadingPhotos}
                                    className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 shadow-sm shadow-teal-500/30 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                                    {uploadingPhotos ? <><Loader2 size={16} className="animate-spin" /> Envoi…</> : <><Check size={16} /> Ajouter</>}
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
