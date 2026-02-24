// frontend/src/components/locations/LocationForm.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Users, Home, Calendar, DollarSign, CreditCard, 
    Check, ArrowRight, ArrowLeft, AlertCircle, Info, Plus 
} from 'lucide-react';
import type { CreateLocationData } from '../../api/locationApi';
import Alert from '../ui/Alert';

interface LocationFormProps {
    onSubmit: (data: CreateLocationData) => Promise<void>;
    onCancel: () => void;
    initialData?: Partial<CreateLocationData>;
    locataires: any[];
    lots: any[];
    owners: any[];
    loading?: boolean;
}

const STEPS = [
    { id: 'parties', title: 'Parties & Bien', icon: <Users size={20} /> },
    { id: 'financial', title: 'Finances', icon: <DollarSign size={20} /> },
    { id: 'payment', title: 'Paiement', icon: <CreditCard size={20} /> }
];

const LocationForm: React.FC<LocationFormProps> = ({ 
    onSubmit, onCancel, locataires, lots, owners, loading = false 
}) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<CreateLocationData>({
        tenant_id: 0,
        lot_id: 0,
        owner_id: 0,
        date_debut: new Date().toISOString().split('T')[0],
        date_fin: '', // Added
        duree_contrat: 12,
        loyer_mensuel: 0,
        caution: 0,
        avance: 0,
        charges_mensuelles: 0,
        type_charges: 'forfaitaire', // Added
        devise: 'XOF',
        type_paiement: 'classique',
        jour_echeance: 5,
        frequence_paiement: 'mensuel',
        nombre_echeances: 12
    });

    // Auto-selection du propriétaire s'il n'y en a qu'un
    useEffect(() => {
        if (!formData.owner_id && owners.length === 1) {
            setFormData(prev => ({ ...prev, owner_id: owners[0].id }));
        }
    }, [owners]);
    const [previewSchedule, setPreviewSchedule] = useState<any[]>([]);

    // Auto-fill owner/amounts when lot is selected
    useEffect(() => {
        if (formData.lot_id) {
            const selectedLot = lots.find(l => l.id === formData.lot_id);
            if (selectedLot) {
                setFormData(prev => ({
                    ...prev,
                    owner_id: selectedLot.owner_id || 0,
                    loyer_mensuel: selectedLot.loyer_mensuel || selectedLot.loyer || 0,
                    charges_mensuelles: selectedLot.charges_mensuelles || selectedLot.charges || 0
                }));
            }
        }
    }, [formData.lot_id, lots]);

    // Added: Auto-calc End Date or Duration
    useEffect(() => {
        if (formData.date_debut && formData.duree_contrat) {
            const start = new Date(formData.date_debut);
            const end = new Date(start);
            end.setMonth(start.getMonth() + formData.duree_contrat);
            end.setDate(end.getDate() - 1); // Specific convention: end day before start day next year/month
            setFormData(prev => ({ ...prev, date_fin: end.toISOString().split('T')[0] }));
        }
    }, [formData.date_debut, formData.duree_contrat]);

    // Live schedule preview calculation
    useEffect(() => {
        if (formData.type_paiement === 'echelonne' && formData.loyer_mensuel) {
            const items = [];
            const count = formData.nombre_echeances || 1;
            const amount = formData.loyer_mensuel;
            const today = new Date(formData.date_debut);
            
            for (let i = 0; i < Math.min(count, 5); i++) {
                const date = new Date(today);
                if (formData.frequence_paiement === 'hebdomadaire') date.setDate(date.getDate() + (i * 7));
                else if (formData.frequence_paiement === 'bimensuel') date.setDate(date.getDate() + (i * 14));
                else date.setMonth(date.getMonth() + i);
                
                items.push({ 
                    numero: i + 1, 
                    date: date.toLocaleDateString('fr-FR'), 
                    montant: amount 
                });
            }
            setPreviewSchedule(items);
        }
    }, [formData.type_paiement, formData.frequence_paiement, formData.nombre_echeances, formData.date_debut, formData.loyer_mensuel]);

    const isStepValid = () => {
        switch (currentStep) {
            case 0: // Parties & Dates
                return formData.tenant_id > 0 && formData.lot_id > 0 && formData.owner_id > 0 && !!formData.date_debut;
            case 1: // Financial
                return (formData.duree_contrat ?? 0) > 0 && (formData.loyer_mensuel ?? 0) > 0;
            case 2: // Payment
                return true;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (isStepValid()) {
            setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 0));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-gray-50/50">
            {/* Steps Header */}
            <div className="flex items-center justify-between px-12 py-6 bg-white border-b border-gray-200">
                {STEPS.map((step, idx) => {
                    const isActive = idx === currentStep;
                    const isCompleted = idx < currentStep;

                    return (
                        <div key={step.id} className="flex flex-col items-center relative z-10">
                            <motion.div
                                initial={false}
                                animate={{
                                    backgroundColor: isActive || isCompleted ? '#3B82F6' : '#F3F4F6',
                                    color: isActive || isCompleted ? '#FFF' : '#9CA3AF',
                                    scale: isActive ? 1.1 : 1
                                }}
                                className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors duration-300 ${
                                    isActive ? 'ring-4 ring-blue-100' : ''
                                }`}
                            >
                                {isCompleted ? <Check size={20} /> : step.icon}
                            </motion.div>
                            <span className={`mt-3 text-sm font-bold ${
                                isActive ? 'text-blue-600' : isCompleted ? 'text-gray-800' : 'text-gray-400'
                            }`}>
                                {step.title}
                            </span>
                            
                            {/* Connector Line */}
                            {idx < STEPS.length - 1 && (
                                <div className="absolute top-6 left-1/2 w-[calc(100%+4rem)] h-0.5 -z-10 bg-gray-200">
                                    <motion.div 
                                        className="h-full bg-blue-500 origin-left"
                                        initial={{ scaleX: 0 }}
                                        animate={{ scaleX: isCompleted ? 1 : 0 }}
                                        transition={{ duration: 0.4 }}
                                    />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-8">
                <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-2 pb-12">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* STEP 1: PARTIES */}
                            {currentStep === 0 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Locataire</label>
                                                {formData.tenant_id > 0 && <Check size={16} className="text-green-500" />}
                                            </div>
                                            <select
                                                className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition shadow-sm outline-none appearance-none"
                                                value={formData.tenant_id}
                                                onChange={e => setFormData({...formData, tenant_id: parseInt(e.target.value)})}
                                            >
                                                <option value={0}>Sélectionner le locataire</option>
                                                {locataires.map(l => (
                                                    <option key={l.id} value={l.id}>{l.prenoms} {l.nom}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Lot à louer</label>
                                                {formData.lot_id > 0 && <Check size={16} className="text-green-500" />}
                                            </div>
                                            <select
                                                className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition shadow-sm outline-none appearance-none"
                                                value={formData.lot_id}
                                                onChange={e => setFormData({...formData, lot_id: parseInt(e.target.value)})}
                                            >
                                                <option value={0}>Choisir un lot</option>
                                                {lots.map(l => (
                                                    <option key={l.id} value={l.id} disabled={l.statut !== 'libre'}>
                                                        {l.ref_lot} - {l.immeuble} ({l.statut})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="md:col-span-2 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Propriétaire concerné</label>
                                                {formData.owner_id > 0 && <Check size={16} className="text-green-500" />}
                                            </div>
                                            <div className="md:col-span-2 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-4">
                                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                                    <Home className="text-blue-500" size={24} />
                                                </div>
                                                {owners.length > 1 ? (
                                                    <select
                                                        className="w-full p-3 bg-transparent font-bold text-blue-900 outline-none border-b border-blue-200 focus:border-blue-500 transition"
                                                        value={formData.owner_id}
                                                        onChange={e => setFormData({...formData, owner_id: parseInt(e.target.value)})}
                                                    >
                                                        <option value={0}>Sélectionner un propriétaire</option>
                                                        {owners.map(o => (
                                                            <option key={o.id} value={o.id}>{o.nom || o.name}</option>
                                                        ))}
                                                    </select>
                                                ) : owners.length === 1 ? (
                                                    <div className="flex flex-col">
                                                        <span className="text-xs text-blue-400 font-bold uppercase tracking-wider">Propriétaire</span>
                                                        <span className="text-lg font-bold text-blue-900">
                                                            {owners[0].nom || owners[0].name}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-start gap-1">
                                                        <span className="text-sm text-red-500 font-bold">Aucun propriétaire disponible</span>
                                                        <a href="/dashboard/proprietaires" className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                                                            <Plus size={12} /> Configurer mon profil propriétaire
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4 pt-4 border-t border-gray-100">
                                        <div className="space-y-4">
                                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Date de début</label>
                                            <input 
                                                type="date"
                                                className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition"
                                                value={formData.date_debut}
                                                onChange={e => setFormData({...formData, date_debut: e.target.value})}
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wide">Date de fin (Optionnel)</label>
                                            <input 
                                                type="date"
                                                className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition"
                                                value={formData.date_fin || ''}
                                                onChange={e => setFormData({...formData, date_fin: e.target.value})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: FINANCIAL */}
                            {currentStep === 1 && (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-gray-700">Durée du contrat</label>
                                            <input 
                                                type="number"
                                                className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition"
                                                value={formData.duree_contrat}
                                                onChange={e => setFormData({...formData, duree_contrat: parseInt(e.target.value)})}
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-gray-700">Loyer Mensuel</label>
                                            <div className="relative">
                                                <input 
                                                    type="number"
                                                    className="w-full p-4 pl-10 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition"
                                                    value={formData.loyer_mensuel}
                                                    onChange={e => setFormData({...formData, loyer_mensuel: parseFloat(e.target.value)})}
                                                />
                                                <DollarSign size={18} className="absolute left-3 top-4 text-gray-400" />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-3">
                                                <label className="text-sm font-bold text-gray-700">Type de charges</label>
                                                <select
                                                    className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition"
                                                    value={formData.type_charges}
                                                    onChange={e => setFormData({...formData, type_charges: e.target.value})}
                                                >
                                                    <option value="forfaitaire">Forfaitaire</option>
                                                    <option value="provision">Provision sur charges</option>
                                                    <option value="reelle">Remboursement au réel</option>
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-sm font-bold text-gray-700">Montant Mensuel</label>
                                                <input 
                                                    type="number"
                                                    className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition"
                                                    value={formData.charges_mensuelles}
                                                    onChange={e => setFormData({...formData, charges_mensuelles: parseFloat(e.target.value)})}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-gray-700">Caution</label>
                                            <input 
                                                type="number"
                                                className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition"
                                                value={formData.caution}
                                                onChange={e => setFormData({...formData, caution: parseFloat(e.target.value)})}
                                            />
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-sm font-bold text-gray-700">Avance</label>
                                            <input 
                                                type="number"
                                                className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none transition"
                                                value={formData.avance}
                                                onChange={e => setFormData({...formData, avance: parseFloat(e.target.value)})}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* STEP 3: PAYMENT */}
                            {currentStep === 2 && (
                                <div className="space-y-8">
                                    <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100">
                                        <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                                            <CreditCard className="text-purple-500" /> Configuration Paiement
                                        </h3>
                                        
                                        <div className="space-y-6">
                                            <div className="flex gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({...formData, type_paiement: 'classique'})}
                                                    className={`flex-1 p-4 rounded-xl border-2 transition text-center font-bold ${
                                                        formData.type_paiement === 'classique' 
                                                        ? 'border-purple-500 bg-white text-purple-600 shadow-sm' 
                                                        : 'border-transparent bg-purple-100/50 text-gray-500 hover:bg-purple-100'
                                                    }`}
                                                >
                                                    Mensuel Classique
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setFormData({...formData, type_paiement: 'echelonne'})}
                                                    className={`flex-1 p-4 rounded-xl border-2 transition text-center font-bold ${
                                                        formData.type_paiement === 'echelonne' 
                                                        ? 'border-purple-500 bg-white text-purple-600 shadow-sm' 
                                                        : 'border-transparent bg-purple-100/50 text-gray-500 hover:bg-purple-100'
                                                    }`}
                                                >
                                                    Paiement Échelonné
                                                </button>
                                            </div>

                                            {formData.type_paiement === 'echelonne' && (
                                                <div className="animate-in slide-in-from-top-4">
                                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                                        <div>
                                                            <label className="text-xs font-bold uppercase text-gray-500">Fréquence</label>
                                                            <select
                                                                className="w-full mt-1 p-3 bg-white border rounded-lg"
                                                                value={formData.frequence_paiement}
                                                                onChange={e => setFormData({...formData, frequence_paiement: e.target.value})}
                                                            >
                                                                <option value="mensuel">Mensuel</option>
                                                                <option value="bimensuel">Bimensuel (2x mois)</option>
                                                                <option value="hebdomadaire">Hebdomadaire</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-xs font-bold uppercase text-gray-500">Nb échéances</label>
                                                            <input 
                                                                type="number"
                                                                className="w-full mt-1 p-3 bg-white border rounded-lg"
                                                                value={formData.nombre_echeances}
                                                                onChange={e => setFormData({...formData, nombre_echeances: parseInt(e.target.value)})}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                                                        <p className="text-xs font-bold text-gray-400 uppercase mb-2">Aperçu Échéancier (Simulation)</p>
                                                        {previewSchedule.slice(0, 3).map((item) => (
                                                            <div key={item.numero} className="flex justify-between text-sm py-1 border-b last:border-0 border-gray-50">
                                                                <span>Échéance #{item.numero} - {item.date}</span>
                                                                <span className="font-bold">{item.montant?.toLocaleString()} XOF</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-bold text-gray-700">Jour d'échéance</label>
                                                    <input 
                                                        type="number"
                                                        max="31"
                                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl"
                                                        value={formData.jour_echeance}
                                                        onChange={e => setFormData({...formData, jour_echeance: parseInt(e.target.value)})}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-bold text-gray-700">Devise</label>
                                                    <select
                                                        className="w-full p-3 bg-white border border-gray-200 rounded-xl"
                                                        value={formData.devise}
                                                        onChange={e => setFormData({...formData, devise: e.target.value})}
                                                    >
                                                        <option value="XOF">XOF (FCFA)</option>
                                                        <option value="EUR">EUR</option>
                                                        <option value="USD">USD</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </form>
            </div>

            {/* Footer Buttons */}
            <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-20">
                <button
                    onClick={currentStep === 0 ? onCancel : handleBack}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition"
                >
                    {currentStep === 0 ? 'Annuler' : 'Retour'}
                </button>

                {currentStep < STEPS.length - 1 ? (
                    <button
                        onClick={handleNext}
                        disabled={!isStepValid()}
                        className="px-8 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                    >
                        Suivant <ArrowRight size={18} />
                    </button>
                ) : (
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-8 py-3 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 hover:shadow-lg hover:shadow-green-500/30 hover:scale-[1.02] transition disabled:opacity-50 disabled:hover:scale-100 flex items-center gap-2"
                    >
                        {loading ? 'Création...' : <>Confirmer le Bail <Check size={18} /></>}
                    </button>
                )}
            </div>
        </div>
    );
};

export default LocationForm;
