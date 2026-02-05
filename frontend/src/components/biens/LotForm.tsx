// frontend/src/components/biens/LotForm.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, DollarSign, Image, Settings, Save, 
  Upload, X, Building2, Tag, Plus,
  Check, ArrowRight, ArrowLeft
} from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import ImageUpload from '../ui/ImageUpload';
import type { Lot, Immeuble } from '../../api/bienApi';

interface LotFormProps {
  lot: Partial<Lot>;
  immeubles: Immeuble[];
  onSave: (lot: Partial<Lot>) => Promise<void>;
  onStatusChange?: (lot: Partial<Lot>, newStatus: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const TYPES_LOT = [
  { value: 'Appartement', label: 'Appartement' },
  { value: 'Studio', label: 'Studio' },
  { value: 'Chambre', label: 'Chambre' },
  { value: 'Boutique', label: 'Boutique' },
  { value: 'Bureau', label: 'Bureau' },
  { value: 'Dépôt', label: 'Dépôt' },
  { value: 'Terrain', label: 'Terrain nu' },
];

const STATUTS = [
  { value: 'libre', label: 'Libre' },
  { value: 'reserve', label: 'Réservé' },
  { value: 'loue', label: 'Loué' },
  { value: 'vendu', label: 'Vendu' },
  { value: 'hors_service', label: 'Hors service' },
];

const PERIODICITES = [
  { value: 'mensuel', label: 'Mensuel' },
  { value: 'trimestriel', label: 'Trimestriel' },
  { value: 'semestriel', label: 'Semestriel' },
  { value: 'annuel', label: 'Annuel' },
];

const MODALITES_VENTE = [
  { value: 'comptant', label: 'Paiement comptant' },
  { value: 'echelonne', label: 'Paiement échelonné' },
];

const STEPS = [
    { id: 0, title: 'Identification', icon: <Home size={20} /> },
    { id: 1, title: 'Caractéristiques', icon: <Settings size={20} /> },
    { id: 2, title: 'Finances', icon: <DollarSign size={20} /> },
    { id: 3, title: 'Médias', icon: <Image size={20} /> }
];

const LotForm: React.FC<LotFormProps> = ({
  lot,
  immeubles,
  onSave,
  onStatusChange,
  onCancel,
  loading = false
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Partial<Lot>>({
    type: 'Appartement',
    nbPieces: 1,
    periodicite: 'mensuel',
    statut: 'libre',
    avance: 1,
    ...lot
  });
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(lot.photos || []);
  const [showVenteFields, setShowVenteFields] = useState(!!lot.prix_vente);

  useEffect(() => {
    const updatedData = {
      type: 'Appartement',
      nbPieces: 1,
      periodicite: 'mensuel',
      statut: 'libre',
      avance: 1,
      ...lot
    };

    if (!updatedData.building_id && immeubles.length === 1) {
      updatedData.building_id = immeubles[0].id;
    }

    setFormData(updatedData);
    setPhotoPreviews(lot.photos || []);
    setShowVenteFields(!!lot.prix_vente);
  }, [lot, immeubles]);

  const handleChange = (field: keyof Lot, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoAdd = (url: string) => {
    if (photoPreviews.length < 10) {
      if (photoPreviews.includes(url)) return;

      const newPhotos = [...photoPreviews, url];
      setPhotoPreviews(newPhotos);
      handleChange('photos', newPhotos);
    }
  };

  const handlePhotoRemove = (index: number) => {
    const newPhotos = photoPreviews.filter((_, i) => i !== index);
    setPhotoPreviews(newPhotos);
    handleChange('photos', newPhotos);
  };

  const handleSubmit = async () => {
    await onSave(formData);
  };
  
  const isStepValid = () => {
    switch (currentStep) {
        case 0: // Identification
            return !!formData.reference && !!formData.building_id;
        case 1: // Caracteristiques
            return (formData.nbPieces || 0) > 0;
        case 2: // Finances
            // Either rent or sale price should be set, ideally, but let's be loose
             return true;
        case 3: // Medias
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


  return (
    <div className="flex flex-col flex-1 min-h-0 bg-gray-50/50">
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

      <div className="flex-1 overflow-y-auto overflow-x-hidden p-8">
        <div className="max-w-4xl mx-auto px-2 pb-12">
            <AnimatePresence mode="wait">
                 <motion.div
                    key={currentStep}
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -20, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                 >
                    {/* STEP 1: IDENTIFICATION */}
                    {currentStep === 0 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Home className="text-blue-500" /> Identification du lot
                                </h3>

                                <div className="space-y-4">
                                     {immeubles.length > 1 ? (
                                        <Select
                                            label="Immeuble de rattachement *"
                                            value={formData.building_id?.toString() || ''}
                                            onChange={(e) => handleChange('building_id', parseInt(e.target.value))}
                                            options={[
                                                { value: '', label: 'Sélectionner un immeuble' },
                                                ...immeubles.map(b => ({ 
                                                value: b.id.toString(), 
                                                label: `${b.nom} (${b.proprietaire || 'Sans propriétaire'})`
                                                }))
                                            ]}
                                            className={`bg-gray-50 border-gray-200 focus:bg-white ${!formData.building_id ? 'border-red-200' : ''}`}
                                        />
                                     ) : immeubles.length === 1 ? (
                                        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                                            <div>
                                                <span className="text-xs font-bold text-blue-500 uppercase">Immeuble lié</span>
                                                <div className="font-bold text-blue-900 text-lg">{immeubles[0].nom}</div>
                                            </div>
                                            <Building2 className="text-blue-500" />
                                        </div>
                                     ) : (
                                        <div className="alert alert-warning">
                                            <span>Aucun immeuble disponible. Veuillez en créer un d'abord.</span>
                                        </div>
                                     )}

                                     <div className="grid grid-cols-2 gap-6">
                                        <Input
                                            label="Référence du lot *"
                                            value={formData.reference || ''}
                                            onChange={(e) => handleChange('reference', e.target.value)}
                                            placeholder="Ex: A01, B12..."
                                            required
                                            className={`bg-gray-50 border-gray-200 focus:bg-white ${!formData.reference ? 'border-red-200' : ''}`}
                                        />
                                        <Select
                                            label="Type de lot *"
                                            value={formData.type || 'Appartement'}
                                            onChange={(e) => handleChange('type', e.target.value)}
                                            options={TYPES_LOT}
                                            className="bg-gray-50 border-gray-200 focus:bg-white"
                                        />
                                     </div>
                                </div>
                             </div>

                             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                                 <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Settings className="text-blue-500" /> Emplacement dans l'immeuble
                                 </h3>
                                 <div className="grid grid-cols-2 gap-6">
                                    <Input
                                        label="Étage"
                                        value={formData.etage || ''}
                                        onChange={(e) => handleChange('etage', e.target.value)}
                                        placeholder="Ex: RDC, 1er..."
                                        className="bg-gray-50 border-gray-200 focus:bg-white"
                                    />
                                    <Input
                                        label="Bloc / Escalier"
                                        value={formData.bloc || ''}
                                        onChange={(e) => handleChange('bloc', e.target.value)}
                                        placeholder="Ex: A, B..."
                                        className="bg-gray-50 border-gray-200 focus:bg-white"
                                    />
                                 </div>
                             </div>
                        </div>
                    )}

                    {/* STEP 2: CARACTERISTIQUES */}
                    {currentStep === 1 && (
                         <div className="space-y-6">
                             <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Tag className="text-blue-500" /> Détails techniques
                                </h3>
                                <div className="grid grid-cols-2 gap-6">
                                    <Input
                                        label="Superficie (m²)"
                                        type="number"
                                        min={0}
                                        value={formData.superficie || ''}
                                        onChange={(e) => handleChange('superficie', parseFloat(e.target.value))}
                                        placeholder="Ex: 45"
                                        className="bg-gray-50 border-gray-200 focus:bg-white"
                                    />
                                    <Input
                                        label="Nombre de pièces"
                                        type="number"
                                        min={1}
                                        value={formData.nbPieces || 1}
                                        onChange={(e) => handleChange('nbPieces', parseInt(e.target.value))}
                                        className="bg-gray-50 border-gray-200 focus:bg-white"
                                    />
                                </div>
                                <div className="form-control">
                                    <label className="label font-bold text-sm text-gray-700">Description détaillée</label>
                                    <textarea
                                        className="textarea textarea-bordered h-40 bg-gray-50 border-gray-200 focus:bg-white w-full rounded-xl p-4"
                                        value={formData.description || ''}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        placeholder="Description du lot, équipements, particularités..."
                                    />
                                </div>
                             </div>
                         </div>
                    )}

                    {/* STEP 3: FINANCES */}
                    {currentStep === 2 && (
                        <div className="space-y-6">
                             <div className="bg-white p-6 rounded-2xl shadow-sm border border-blue-100 space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                                        <DollarSign className="text-blue-600" /> Configuration Locative
                                    </h3>
                                    <span className="badge badge-info badge-sm">Standard</span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <Input
                                        label="Loyer mensuel (FCFA)"
                                        type="number"
                                        min={0}
                                        value={formData.loyer || ''}
                                        onChange={(e) => handleChange('loyer', parseFloat(e.target.value))}
                                        placeholder="Ex: 50000"
                                        className="font-mono bg-gray-50 border-gray-200 focus:bg-white text-lg font-bold text-gray-700"
                                    />
                                    <Input
                                        label="Charges mensuelles (FCFA)"
                                        type="number"
                                        min={0}
                                        value={formData.charges || ''}
                                        onChange={(e) => handleChange('charges', parseFloat(e.target.value))}
                                        placeholder="Ex: 5000"
                                        className="font-mono bg-gray-50 border-gray-200 focus:bg-white"
                                    />
                                    <Select
                                        label="Périodicité préférée"
                                        value={formData.periodicite || 'mensuel'}
                                        onChange={(e) => handleChange('periodicite', e.target.value)}
                                        options={PERIODICITES}
                                        className="bg-gray-50 border-gray-200 focus:bg-white"
                                    />
                                </div>

                                <div className="divider opacity-50">Conditions d'entrée</div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <Input
                                            label="Caution (FCFA)"
                                            type="number"
                                            min={0}
                                            value={formData.caution || ''}
                                            onChange={(e) => handleChange('caution', parseFloat(e.target.value))}
                                            placeholder="Ex: 100000"
                                            className="font-mono"
                                        />
                                        <span className="text-xs text-gray-500 mt-2 block">Habituellement 2-3 mois de loyer.</span>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <Input
                                            label="Avance (mois)"
                                            type="number"
                                            min={0}
                                            value={formData.avance || 1}
                                            onChange={(e) => handleChange('avance', parseInt(e.target.value))}
                                        />
                                         <span className="text-xs text-gray-500 mt-2 block">Mois payés d'avance à l'entrée.</span>
                                    </div>
                                </div>
                             </div>

                             {/* VENTE OPTION */}
                             <div className={`card transition-all duration-300 ${showVenteFields ? 'border-green-200 bg-white shadow-md ring-1 ring-green-100' : 'border border-gray-200 bg-gray-50 opacity-80'}`}>
                                <div className="px-6 py-4 flex items-center justify-between cursor-pointer" onClick={() => setShowVenteFields(!showVenteFields)}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${showVenteFields ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-400'}`}>
                                            <Tag size={18} />
                                        </div>
                                        <div>
                                            <h3 className={`font-bold ${showVenteFields ? 'text-green-900' : 'text-gray-600'}`}>Option de Vente</h3>
                                            <p className="text-xs text-gray-500">Activer si ce lot est disponible à l'achat</p>
                                        </div>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        className="toggle toggle-success" 
                                        checked={showVenteFields}
                                        onChange={(e) => setShowVenteFields(e.target.checked)}
                                    />
                                </div>

                                {showVenteFields && (
                                    <div className="p-6 pt-0 animate-in slide-in-from-top-2">
                                        <div className="divider mt-0 mb-6"></div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <Input
                                                label="Prix de vente (FCFA)"
                                                type="number"
                                                min={0}
                                                value={formData.prix_vente || ''}
                                                onChange={(e) => handleChange('prix_vente', parseFloat(e.target.value))}
                                                placeholder="Ex: 15000000"
                                                className="font-mono text-lg font-bold text-green-700 bg-green-50/50 border-green-100 focus:bg-white"
                                            />
                                            <Select
                                                label="Modalité de paiement"
                                                value={formData.modalite_vente || 'comptant'}
                                                onChange={(e) => handleChange('modalite_vente', e.target.value)}
                                                options={MODALITES_VENTE}
                                            />
                                            {formData.modalite_vente === 'echelonne' && (
                                                <Input
                                                    label="Durée échelonnement (mois)"
                                                    type="number"
                                                    min={1}
                                                    value={formData.duree_echelonnement || ''}
                                                    onChange={(e) => handleChange('duree_echelonnement', parseInt(e.target.value))}
                                                    placeholder="Ex: 12"
                                                />
                                            )}
                                        </div>
                                    </div>
                                )}
                             </div>
                        </div>
                    )}

                    {/* STEP 4: MEDIAS */}
                    {currentStep === 3 && (
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                        <Image className="text-blue-500" /> Galerie Photos
                                    </h3>
                                    <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{photoPreviews.length}/10 photos</span>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {photoPreviews.map((url, index) => (
                                    <div key={index} className="relative group aspect-square">
                                        <img 
                                            src={url} 
                                            alt={`Photo ${index + 1}`} 
                                            className="w-full h-full object-cover rounded-xl shadow-sm border border-gray-200 transition-transform duration-200 group-hover:scale-[1.02]"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                            <button
                                                className="btn btn-circle btn-sm btn-error text-white"
                                                onClick={() => handlePhotoRemove(index)}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    ))}
                                    
                                    {photoPreviews.length < 10 && (
                                    <ImageUpload 
                                        onChange={handlePhotoAdd} 
                                        folder="property"
                                        label=""
                                        className="aspect-square bg-gray-50 border-dashed border-2 border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors rounded-xl"
                                        clearOnSuccess={true}
                                    />
                                    )}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <Settings className="text-blue-500" /> Disponibilité & Statut
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Input
                                        label="Date de disponibilité"
                                        type="date"
                                        value={formData.date_disponibilite || ''}
                                        onChange={(e) => handleChange('date_disponibilite', e.target.value)}
                                        className="bg-gray-50 border-gray-200 focus:bg-white"
                                    />
                                    <Select
                                        label="Statut actuel"
                                        value={formData.statut || 'libre'}
                                        onChange={(e) => handleChange('statut', e.target.value)}
                                        options={STATUTS}
                                        className="bg-gray-50 border-gray-200 focus:bg-white"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                 </motion.div>
            </AnimatePresence>
        </div>
      </div>

       {/* Footer Buttons */}
       <div className="p-6 bg-white border-t border-gray-200 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-20">
            <button
                onClick={currentStep === 0 ? onCancel : handleBack}
                className="px-6 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition"
            >
                {currentStep === 0 ? 'Annuler' : 'Retour'}
            </button>

            <div className="flex items-center gap-3">
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
                        <Save size={18} /> {formData.id ? 'Modifier' : 'Terminer'}
                    </button>
                )}
            </div>
        </div>
    </div>
  );
};

export default LotForm;
